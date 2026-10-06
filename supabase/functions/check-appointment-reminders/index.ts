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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const expectedCronSecret = Deno.env.get("SMS_CRON_SECRET");
  const providedCronSecret = req.headers.get("x-cron-secret");

  if (!expectedCronSecret || providedCronSecret !== expectedCronSecret) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: salonSettings, error: settingsError } = await supabase
      .from("sms_settings")
      .select("salon_id, reminder_hours_before, reminder_message")
      .eq("reminder_enabled", true);

    if (settingsError) throw settingsError;

    if (!salonSettings || salonSettings.length === 0) {
      return jsonResponse({ sent: 0, message: "no_reminders_configured" });
    }

    let totalSent = 0;
    let skippedNoEntitlement = 0;
    let failed = 0;

    for (const settings of salonSettings) {
      const { data: salon } = await supabase
        .from("salons")
        .select("owner_user_id")
        .eq("id", settings.salon_id)
        .maybeSingle();

      if (!salon?.owner_user_id) continue;

      const { data: ownerResult } = await supabase.auth.admin.getUserById(salon.owner_user_id);
      const ownerEmail = ownerResult?.user?.email?.toLowerCase() || "";

      const [{ data: platformAdmin }, { data: subscriber }] = await Promise.all([
        ownerEmail
          ? supabase
              .from("platform_admin_emails")
              .select("email")
              .eq("email", ownerEmail)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        supabase
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

      const now = new Date();
      const hoursBefore = Math.min(
        Math.max(Number(settings.reminder_hours_before) || 24, 1),
        168
      );
      const reminderWindow = new Date(now.getTime() + hoursBefore * 60 * 60 * 1000);

      const { data: appointments, error: appointmentsError } = await supabase
        .from("appointments")
        .select("id, client_name, client_phone, start_time, services")
        .eq("salon_id", settings.salon_id)
        .eq("status", "scheduled")
        .gte("start_time", now.toISOString())
        .lte("start_time", reminderWindow.toISOString());

      if (appointmentsError) throw appointmentsError;
      if (!appointments || appointments.length === 0) continue;

      for (const appointment of appointments) {
        const { count } = await supabase
          .from("sms_logs")
          .select("*", { count: "exact", head: true })
          .eq("appointment_id", appointment.id)
          .eq("type", "reminder");

        if ((count || 0) > 0) continue;
        if (!appointment.client_phone) continue;

        const startDate = new Date(appointment.start_time);
        const nameParts = String(appointment.client_name || "").split(" ");
        const services = Array.isArray(appointment.services) ? appointment.services : [];
        const firstService = services[0] as { name?: string } | undefined;

        const dateFormatter = new Intl.DateTimeFormat("fr-BE", {
          timeZone: "Europe/Brussels",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
        const timeFormatter = new Intl.DateTimeFormat("fr-BE", {
          timeZone: "Europe/Brussels",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });

        const message = String(settings.reminder_message || "")
          .replace(/{prenom}/g, nameParts[0] || "")
          .replace(/{date}/g, dateFormatter.format(startDate))
          .replace(/{heure}/g, timeFormatter.format(startDate))
          .replace(/{prestation}/g, firstService?.name || "");

        try {
          const result = await sendSms(appointment.client_phone, message);

          await supabase.from("sms_logs").insert({
            salon_id: settings.salon_id,
            appointment_id: appointment.id,
            phone_number: appointment.client_phone,
            message,
            type: "reminder",
            status: result.ok ? "sent" : "failed",
            twilio_sid: result.sid,
          });

          if (result.ok) totalSent += 1;
          else failed += 1;
        } catch (error) {
          console.error("[SMS-REMINDER] send failed", error);
          failed += 1;
        }
      }
    }

    return jsonResponse({
      sent: totalSent,
      failed,
      skipped_no_entitlement: skippedNoEntitlement,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal_error";
    console.error("[SMS-REMINDER]", error);
    return jsonResponse({ error: message }, message === "sms_provider_not_configured" ? 503 : 500);
  }
});
