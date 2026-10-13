import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import { isTrustedAppOrigin } from "../_shared/app-origin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
  if (!isTrustedAppOrigin(req)) {
    return jsonResponse({ error: "origin_not_allowed" }, 403);
  }

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "backend_not_configured" }, 503);
    }

    const body = await req.json();
    const salonId = String(body.salon_id || "").trim();
    const serviceId = String(body.service_id || "").trim();
    const preferredStaffId = body.preferred_staff_id
      ? String(body.preferred_staff_id).trim()
      : null;
    const clientName = String(body.client_name || "").trim();
    const rawPhone = String(body.client_phone || "").trim();
    const clientPhone = rawPhone.replace(/[\s().-]/g, "");
    const dateFrom = String(body.preferred_date_from || "").trim();
    const dateTo = String(body.preferred_date_to || "").trim();
    const timeStart = body.preferred_time_start
      ? String(body.preferred_time_start).trim()
      : null;
    const timeEnd = body.preferred_time_end
      ? String(body.preferred_time_end).trim()
      : null;

    if (!salonId || !serviceId || !clientName || !clientPhone || !dateFrom || !dateTo) {
      return jsonResponse({ error: "missing_required_fields" }, 400);
    }

    if (clientName.length > 100 || rawPhone.length > 20) {
      return jsonResponse({ error: "invalid_input_length" }, 400);
    }

    if (!/^\+?\d{8,15}$/.test(clientPhone)) {
      return jsonResponse({ error: "invalid_phone" }, 400);
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(dateFrom) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(dateTo)
    ) {
      return jsonResponse({ error: "invalid_date" }, 400);
    }

    if (
      (timeStart && !/^([01]\d|2[0-3]):[0-5]\d$/.test(timeStart)) ||
      (timeEnd && !/^([01]\d|2[0-3]):[0-5]\d$/.test(timeEnd))
    ) {
      return jsonResponse({ error: "invalid_time" }, 400);
    }

    if (timeStart && timeEnd && timeEnd <= timeStart) {
      return jsonResponse({ error: "invalid_time_range" }, 400);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fromDate = new Date(`${dateFrom}T12:00:00Z`);
    const toDate = new Date(`${dateTo}T12:00:00Z`);
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 90);

    if (
      Number.isNaN(fromDate.getTime()) ||
      Number.isNaN(toDate.getTime()) ||
      fromDate < today ||
      toDate < fromDate ||
      toDate > maxDate
    ) {
      return jsonResponse({ error: "date_out_of_range" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: salon, error: salonError } = await admin
      .from("salons")
      .select("owner_user_id")
      .eq("id", salonId)
      .maybeSingle();

    if (salonError) throw salonError;
    if (!salon?.owner_user_id) return jsonResponse({ error: "salon_not_found" }, 404);

    const { data: ownerResult } = await admin.auth.admin.getUserById(salon.owner_user_id);
    const ownerEmail = ownerResult?.user?.email?.toLowerCase() || "";

    const [
      { data: platformAdmin },
      { data: subscriberByUser },
      { data: subscriberByEmail },
      { data: service, error: serviceError },
      staffResult,
    ] = await Promise.all([
      ownerEmail
        ? admin.from("platform_admin_emails").select("email").eq("email", ownerEmail).maybeSingle()
        : Promise.resolve({ data: null }),
      admin
        .from("subscribers")
        .select("subscribed, subscription_tier, subscription_end")
        .eq("user_id", salon.owner_user_id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      ownerEmail
        ? admin
            .from("subscribers")
            .select("subscribed, subscription_tier, subscription_end")
            .eq("email", ownerEmail)
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      admin
        .from("services")
        .select("id")
        .eq("id", serviceId)
        .eq("salon_id", salonId)
        .eq("is_active", true)
        .neq("category", "produit")
        .maybeSingle(),
      preferredStaffId
        ? admin
            .from("staff")
            .select("id")
            .eq("id", preferredStaffId)
            .eq("salon_id", salonId)
            .eq("is_active", true)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (serviceError) throw serviceError;
    if (!service) return jsonResponse({ error: "service_not_found" }, 404);

    if (preferredStaffId && (staffResult.error || !staffResult.data)) {
      return jsonResponse({ error: "staff_not_found" }, 404);
    }

    const subscriber = subscriberByUser || subscriberByEmail;
    const tier = normalizeTier(subscriber?.subscription_tier);
    const subscriptionValid =
      subscriber?.subscribed === true &&
      (!subscriber.subscription_end ||
        new Date(subscriber.subscription_end).getTime() > Date.now());

    const canUseOnlineBooking =
      Boolean(platformAdmin) ||
      (subscriptionValid && ["Solo", "Equipe", "Lifetime"].includes(tier || ""));

    if (!canUseOnlineBooking) {
      return jsonResponse({ error: "online_booking_unavailable" }, 403);
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60_000).toISOString();
    const { count: recentCount, error: rateLimitError } = await admin
      .from("booking_waitlist")
      .select("id", { count: "exact", head: true })
      .eq("salon_id", salonId)
      .eq("client_phone", clientPhone)
      .gte("created_at", oneHourAgo);

    if (rateLimitError) throw rateLimitError;
    if ((recentCount || 0) >= 3) {
      return jsonResponse({ error: "too_many_waitlist_attempts" }, 429);
    }

    const { data: existing, error: existingError } = await admin
      .from("booking_waitlist")
      .select("id")
      .eq("salon_id", salonId)
      .eq("service_id", serviceId)
      .eq("client_phone", clientPhone)
      .in("status", ["active", "notified"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) throw existingError;

    const row = {
      salon_id: salonId,
      service_id: serviceId,
      preferred_staff_id: preferredStaffId,
      client_name: clientName,
      client_phone: clientPhone,
      preferred_date_from: dateFrom,
      preferred_date_to: dateTo,
      preferred_time_start: timeStart,
      preferred_time_end: timeEnd,
      status: "active",
      offer_expires_at: null,
    };

    if (existing?.id) {
      const { error: updateError } = await admin
        .from("booking_waitlist")
        .update(row)
        .eq("id", existing.id);

      if (updateError) throw updateError;

      return jsonResponse({
        success: true,
        waitlist_id: existing.id,
        updated: true,
      });
    }

    const { data: created, error: insertError } = await admin
      .from("booking_waitlist")
      .insert(row)
      .select("id")
      .single();

    if (insertError) throw insertError;

    return jsonResponse({
      success: true,
      waitlist_id: created.id,
      updated: false,
    });
  } catch (error) {
    console.error("[BOOKING-WAITLIST]", error);
    return jsonResponse({ error: "internal_server_error" }, 500);
  }
});
