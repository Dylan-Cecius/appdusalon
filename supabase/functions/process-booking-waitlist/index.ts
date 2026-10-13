import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import { resolveAppOrigin } from "../_shared/app-origin.ts";
import { sendSms } from "../_shared/sms.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
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

const getBrusselsDateTime = (value: string) => {
  const date = new Date(value);
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Brussels",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    displayDate: `${parts.day}/${parts.month}`,
    time: `${parts.hour}:${parts.minute}`,
  };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const expectedSecret = Deno.env.get("SMS_CRON_SECRET");
  const providedSecret = req.headers.get("x-cron-secret");

  if (!expectedSecret || providedSecret !== expectedSecret) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "backend_not_configured" }, 503);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const nowIso = new Date().toISOString();

    const { error: reactivateError } = await admin
      .from("booking_waitlist")
      .update({ status: "active", offer_expires_at: null })
      .eq("status", "notified")
      .lte("offer_expires_at", nowIso);

    if (reactivateError) throw reactivateError;

    const { data: openings, error: openingsError } = await admin
      .from("booking_waitlist_openings")
      .select("id, salon_id, service_id, staff_id, start_time, end_time")
      .is("processed_at", null)
      .gt("start_time", nowIso)
      .order("created_at", { ascending: true })
      .limit(50);

    if (openingsError) throw openingsError;

    let openingsProcessed = 0;
    let notificationsSent = 0;
    let notificationFailures = 0;

    for (const opening of openings || []) {
      const slot = getBrusselsDateTime(opening.start_time);

      const { data: salon, error: salonError } = await admin
        .from("salons")
        .select("slug, name, owner_user_id")
        .eq("id", opening.salon_id)
        .maybeSingle();

      if (salonError) throw salonError;

      if (!salon?.slug || !salon.owner_user_id) {
        await admin
          .from("booking_waitlist_openings")
          .update({ processed_at: nowIso })
          .eq("id", opening.id);
        openingsProcessed += 1;
        continue;
      }

      const { data: ownerResult } = await admin.auth.admin.getUserById(
        salon.owner_user_id
      );
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
          .or(`user_id.eq.${salon.owner_user_id},email.eq.${ownerEmail}`)
          .order("updated_at", { ascending: false })
          .limit(1)
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
        await admin
          .from("booking_waitlist_openings")
          .update({ processed_at: nowIso })
          .eq("id", opening.id);
        openingsProcessed += 1;
        continue;
      }

      // A freed appointment may since have been replaced by a staff absence.
      if (opening.staff_id) {
        const { data: timeOff, error: timeOffError } = await admin.from("staff_time_off")
          .select("id").eq("salon_id", opening.salon_id).eq("staff_id", opening.staff_id)
          .lt("starts_at", opening.end_time).gt("ends_at", opening.start_time).limit(1);
        if (timeOffError) throw timeOffError;
        if (timeOff?.length) {
          await admin.from("booking_waitlist_openings").update({ processed_at: nowIso }).eq("id", opening.id);
          openingsProcessed += 1;
          continue;
        }
      }

      const { data: candidates, error: candidatesError } = await admin
        .from("booking_waitlist")
        .select(
          "id, client_name, client_phone, preferred_time_start, preferred_time_end, notification_count"
        )
        .eq("salon_id", opening.salon_id)
        .eq("service_id", opening.service_id)
        .eq("status", "active")
        .lte("preferred_date_from", slot.date)
        .gte("preferred_date_to", slot.date)
        .or(
          opening.staff_id
            ? `preferred_staff_id.is.null,preferred_staff_id.eq.${opening.staff_id}`
            : "preferred_staff_id.is.null"
        )
        .order("created_at", { ascending: true })
        .limit(20);

      if (candidatesError) throw candidatesError;

      const matchingCandidates = (candidates || [])
        .filter((candidate) => {
          if (
            candidate.preferred_time_start &&
            slot.time < candidate.preferred_time_start.slice(0, 5)
          ) {
            return false;
          }

          if (
            candidate.preferred_time_end &&
            slot.time >= candidate.preferred_time_end.slice(0, 5)
          ) {
            return false;
          }

          return true;
        })
        .slice(0, 3);

      if (matchingCandidates.length === 0) {
        await admin
          .from("booking_waitlist_openings")
          .update({ processed_at: nowIso })
          .eq("id", opening.id);
        openingsProcessed += 1;
        continue;
      }

      const baseUrl = resolveAppOrigin(req);
      const params = new URLSearchParams({
        service_id: opening.service_id,
        date: slot.date,
      });

      if (opening.staff_id) params.set("staff_id", opening.staff_id);

      const bookingUrl =
        `${baseUrl}/booking/${encodeURIComponent(salon.slug)}?${params.toString()}`;

      let successfulForOpening = 0;

      for (const candidate of matchingCandidates) {
        const firstName = String(candidate.client_name || "").split(" ")[0] || "Bonjour";
        const message =
          `${firstName}, un créneau vient de se libérer chez ${salon.name} le ${slot.displayDate} à ${slot.time}. Réservez ici : ${bookingUrl}`;

        try {
          const sms = await sendSms(candidate.client_phone, message);

          if (!sms.ok) {
            notificationFailures += 1;
            continue;
          }

          const offerExpiresAt = new Date(Date.now() + 15 * 60_000).toISOString();

          const { error: updateCandidateError } = await admin
            .from("booking_waitlist")
            .update({
              status: "notified",
              notification_count: Number(candidate.notification_count || 0) + 1,
              last_notified_at: nowIso,
              offer_expires_at: offerExpiresAt,
            })
            .eq("id", candidate.id)
            .eq("status", "active");

          if (updateCandidateError) throw updateCandidateError;

          successfulForOpening += 1;
          notificationsSent += 1;
        } catch (error) {
          console.error("[WAITLIST] notification failed", error);
          notificationFailures += 1;
        }
      }

      if (successfulForOpening > 0) {
        await admin
          .from("booking_waitlist_openings")
          .update({ processed_at: nowIso })
          .eq("id", opening.id);
        openingsProcessed += 1;
      }
    }

    return jsonResponse({
      openings_processed: openingsProcessed,
      notifications_sent: notificationsSent,
      notification_failures: notificationFailures,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal_error";
    console.error("[BOOKING-WAITLIST-PROCESSOR]", error);

    return jsonResponse(
      { error: message },
      message === "sms_provider_not_configured" ? 503 : 500
    );
  }
});
