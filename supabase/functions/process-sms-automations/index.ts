import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import { sendSms } from "../_shared/sms.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const normalizeTier = (tier?: string | null) => {
  if (tier === "Pro") return "Equipe";
  if (tier === "Enterprise") return "Lifetime";
  return tier ?? null;
};

const normalizePhone = (value?: string | null) =>
  String(value || "").replace(/[^0-9+]/g, "");

const brusselsDateParts = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Brussels",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const get = (type: string) => parts.find(part => part.type === type)?.value || "";
  return { year: get("year"), month: get("month"), day: get("day") };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST" && req.method !== "GET") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  const expectedCronSecret = Deno.env.get("SMS_CRON_SECRET");
  const providedCronSecret = req.headers.get("x-cron-secret");

  if (!expectedCronSecret || providedCronSecret !== expectedCronSecret) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: settingsRows, error: settingsError } = await admin
      .from("sms_settings")
      .select(
        "salon_id, birthday_enabled, birthday_message, reactivation_enabled, reactivation_months, reactivation_message"
      )
      .or("birthday_enabled.eq.true,reactivation_enabled.eq.true");

    if (settingsError) throw settingsError;
    if (!settingsRows?.length) {
      return jsonResponse({ birthday_sent: 0, reactivation_sent: 0, message: "no_automations_configured" });
    }

    let birthdaySent = 0;
    let reactivationSent = 0;
    let failed = 0;
    let skippedNoEntitlement = 0;

    const today = brusselsDateParts();

    for (const settings of settingsRows) {
      const { data: salon } = await admin
        .from("salons")
        .select("owner_user_id")
        .eq("id", settings.salon_id)
        .maybeSingle();

      if (!salon?.owner_user_id) continue;

      const { data: ownerResult } = await admin.auth.admin.getUserById(salon.owner_user_id);
      const ownerEmail = ownerResult?.user?.email?.toLowerCase() || "";

      const [{ data: platformAdmin }, { data: subscriber }] = await Promise.all([
        ownerEmail
          ? admin
              .from("platform_admin_emails")
              .select("email")
              .eq("email", ownerEmail)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        admin
          .from("subscribers")
          .select("subscribed, subscription_tier, subscription_end")
          .eq("user_id", salon.owner_user_id)
          .maybeSingle(),
      ]);

      const tier = normalizeTier(subscriber?.subscription_tier);
      const subscriptionValid =
        subscriber?.subscribed === true &&
        (!subscriber.subscription_end ||
          new Date(subscriber.subscription_end).getTime() > Date.now());

      const entitled =
        Boolean(platformAdmin) ||
        (subscriptionValid && ["Solo", "Equipe", "Lifetime"].includes(tier || ""));

      if (!entitled) {
        skippedNoEntitlement += 1;
        continue;
      }

      const { data: clients, error: clientsError } = await admin
        .from("clients")
        .select("id, name, phone, birth_date, sms_opt_out")
        .eq("salon_id", settings.salon_id)
        .neq("sms_opt_out", true);

      if (clientsError) throw clientsError;
      if (!clients?.length) continue;

      if (settings.birthday_enabled) {
        const { data: birthdayLogs, error: birthdayLogsError } = await admin
          .from("sms_logs")
          .select("client_id, sent_at")
          .eq("salon_id", settings.salon_id)
          .eq("type", "birthday")
          .gte("sent_at", `${today.year}-01-01T00:00:00Z`);

        if (birthdayLogsError) throw birthdayLogsError;

        const alreadySent = new Set(
          (birthdayLogs || []).map(log => log.client_id).filter(Boolean)
        );

        for (const client of clients) {
          if (!client.birth_date || !client.phone || alreadySent.has(client.id)) continue;

          const birth = String(client.birth_date).slice(5, 10);
          if (birth !== `${today.month}-${today.day}`) continue;

          const firstName = String(client.name || "").trim().split(/\s+/)[0] || "";
          const message = String(settings.birthday_message || "")
            .replace(/{prenom}/g, firstName)
            .trim();

          if (!message) continue;

          try {
            const result = await sendSms(client.phone, message);
            await admin.from("sms_logs").insert({
              salon_id: settings.salon_id,
              client_id: client.id,
              phone_number: client.phone,
              message,
              type: "birthday",
              status: result.ok ? "sent" : "failed",
              twilio_sid: result.sid,
            });

            if (result.ok) {
              birthdaySent += 1;
              alreadySent.add(client.id);
            } else {
              failed += 1;
            }
          } catch (error) {
            console.error("[SMS-BIRTHDAY] send failed", error);
            failed += 1;
          }
        }
      }

      if (settings.reactivation_enabled) {
        const months = Math.min(
          Math.max(Number(settings.reactivation_months) || 3, 1),
          24
        );
        const cutoff = new Date();
        cutoff.setUTCMonth(cutoff.getUTCMonth() - months);

        const [{ data: recentTransactions, error: txError }, { data: recentAppointments, error: apptError }, { data: reactivationLogs, error: reactivationLogsError }] =
          await Promise.all([
            admin
              .from("transactions")
              .select("client_id, transaction_date")
              .eq("salon_id", settings.salon_id)
              .gte("transaction_date", cutoff.toISOString()),
            admin
              .from("appointments")
              .select("client_phone, start_time")
              .eq("salon_id", settings.salon_id)
              .neq("status", "cancelled")
              .gte("start_time", cutoff.toISOString()),
            admin
              .from("sms_logs")
              .select("client_id, sent_at")
              .eq("salon_id", settings.salon_id)
              .eq("type", "reactivation")
              .order("sent_at", { ascending: false }),
          ]);

        if (txError) throw txError;
        if (apptError) throw apptError;
        if (reactivationLogsError) throw reactivationLogsError;

        const activeClientIds = new Set(
          (recentTransactions || []).map(tx => tx.client_id).filter(Boolean)
        );
        const activePhones = new Set(
          (recentAppointments || [])
            .map(appt => normalizePhone(appt.client_phone))
            .filter(Boolean)
        );

        const lastReactivationByClient = new Map<string, Date>();
        for (const log of reactivationLogs || []) {
          if (!log.client_id || !log.sent_at || lastReactivationByClient.has(log.client_id)) continue;
          lastReactivationByClient.set(log.client_id, new Date(log.sent_at));
        }

        const clientIds = clients.map(client => client.id);
        const { data: historicalTransactions, error: historicalTxError } = await admin
          .from("transactions")
          .select("client_id, transaction_date")
          .eq("salon_id", settings.salon_id)
          .in("client_id", clientIds)
          .order("transaction_date", { ascending: false });

        if (historicalTxError) throw historicalTxError;

        const lastTransactionByClient = new Map<string, Date>();
        for (const tx of historicalTransactions || []) {
          if (!tx.client_id || !tx.transaction_date || lastTransactionByClient.has(tx.client_id)) continue;
          lastTransactionByClient.set(tx.client_id, new Date(tx.transaction_date));
        }

        for (const client of clients) {
          if (!client.phone) continue;
          if (activeClientIds.has(client.id) || activePhones.has(normalizePhone(client.phone))) continue;

          const lastActivity = lastTransactionByClient.get(client.id) || null;
          const lastReactivation = lastReactivationByClient.get(client.id) || null;

          if (lastActivity && lastActivity.getTime() > cutoff.getTime()) continue;
          if (lastReactivation && (!lastActivity || lastReactivation.getTime() >= lastActivity.getTime())) continue;

          const firstName = String(client.name || "").trim().split(/\s+/)[0] || "";
          const message = String(settings.reactivation_message || "")
            .replace(/{prenom}/g, firstName)
            .trim();

          if (!message) continue;

          try {
            const result = await sendSms(client.phone, message);
            await admin.from("sms_logs").insert({
              salon_id: settings.salon_id,
              client_id: client.id,
              phone_number: client.phone,
              message,
              type: "reactivation",
              status: result.ok ? "sent" : "failed",
              twilio_sid: result.sid,
            });

            if (result.ok) {
              reactivationSent += 1;
              lastReactivationByClient.set(client.id, new Date());
            } else {
              failed += 1;
            }
          } catch (error) {
            console.error("[SMS-REACTIVATION] send failed", error);
            failed += 1;
          }
        }
      }
    }

    return jsonResponse({
      birthday_sent: birthdaySent,
      reactivation_sent: reactivationSent,
      failed,
      skipped_no_entitlement: skippedNoEntitlement,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal_error";
    console.error("[SMS-AUTOMATIONS]", error);
    return jsonResponse(
      { error: message },
      message === "sms_provider_not_configured" ? 503 : 500
    );
  }
});
