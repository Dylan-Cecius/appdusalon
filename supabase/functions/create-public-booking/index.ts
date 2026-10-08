import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

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

const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const DAY_INDEX: Record<string, number> = {
  Monday: 0,
  Tuesday: 1,
  Wednesday: 2,
  Thursday: 3,
  Friday: 4,
  Saturday: 5,
  Sunday: 6,
};

const getBrusselsParts = (date: Date) => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Brussels",
    weekday: "long",
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
    dayName: parts.weekday,
    time: `${parts.hour}:${parts.minute}`,
  };
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const body = await req.json();
    const {
      salon_id,
      staff_id,
      service_id,
      start_time,
      client_name,
      client_phone,
    } = body;

    const cleanClientName = String(client_name || "").trim();
    const cleanClientPhone = String(client_phone || "").trim();
    const normalizedClientPhone = cleanClientPhone.replace(/[\s().-]/g, "");

    if (
      !salon_id ||
      !staff_id ||
      !service_id ||
      !start_time ||
      !cleanClientName ||
      !cleanClientPhone
    ) {
      return jsonResponse({ error: "missing_required_fields" }, 400);
    }

    if (cleanClientName.length > 100 || cleanClientPhone.length > 20) {
      return jsonResponse({ error: "invalid_input_length" }, 400);
    }

    if (!/^\+?\d{8,15}$/.test(normalizedClientPhone)) {
      return jsonResponse({ error: "invalid_phone" }, 400);
    }

    const appointmentStart = new Date(start_time);
    const now = new Date();
    const maxAppointmentStart = new Date(now);
    maxAppointmentStart.setUTCDate(maxAppointmentStart.getUTCDate() + 366);

    if (
      Number.isNaN(appointmentStart.getTime()) ||
      appointmentStart <= now ||
      appointmentStart > maxAppointmentStart
    ) {
      return jsonResponse({ error: "invalid_start_time" }, 400);
    }

    const { data: salon, error: salonError } = await supabase
      .from("salons")
      .select("owner_user_id")
      .eq("id", salon_id)
      .maybeSingle();

    if (salonError) throw salonError;
    if (!salon?.owner_user_id) return jsonResponse({ error: "salon_not_found" }, 404);

    const { data: ownerResult } = await supabase.auth.admin.getUserById(salon.owner_user_id);
    const ownerEmail = ownerResult?.user?.email?.toLowerCase() || "";

    const [
      { data: platformAdmin },
      { data: subscriberByUser },
      { data: subscriberByEmail },
      { data: service, error: serviceError },
      { data: staffMember, error: staffError },
    ] = await Promise.all([
      ownerEmail
        ? supabase.from("platform_admin_emails").select("email").eq("email", ownerEmail).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("subscribers")
        .select("subscribed, subscription_tier, subscription_end")
        .eq("user_id", salon.owner_user_id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      ownerEmail
        ? supabase
            .from("subscribers")
            .select("subscribed, subscription_tier, subscription_end")
            .eq("email", ownerEmail)
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("services")
        .select("id, name, price, duration, appointment_buffer, category")
        .eq("id", service_id)
        .eq("salon_id", salon_id)
        .eq("is_active", true)
        .neq("category", "produit")
        .maybeSingle(),
      supabase
        .from("staff")
        .select("id, daily_schedules, working_days, start_time, end_time")
        .eq("id", staff_id)
        .eq("salon_id", salon_id)
        .eq("is_active", true)
        .maybeSingle(),
    ]);

    if (serviceError) throw serviceError;
    if (staffError) throw staffError;
    if (!service) return jsonResponse({ error: "service_not_found" }, 404);
    if (!staffMember) return jsonResponse({ error: "staff_not_found" }, 404);

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

    const blockedDurationMinutes = Math.max(
      5,
      Number(service.duration || 30) + Number(service.appointment_buffer || 0)
    );
    const appointmentEnd = new Date(
      appointmentStart.getTime() + blockedDurationMinutes * 60_000
    );

    const { dayName, time: localStartTime } = getBrusselsParts(appointmentStart);
    const { time: localEndTime } = getBrusselsParts(appointmentEnd);

    const schedules = (staffMember.daily_schedules || {}) as Record<
      string,
      { start: string; end: string }
    >;
    const explicitSchedule = schedules[dayName];
    const workingDays = Array.isArray(staffMember.working_days)
      ? staffMember.working_days
      : [];

    if (!explicitSchedule && !workingDays.includes(dayName)) {
      return jsonResponse({ error: "staff_not_working" }, 409);
    }

    const staffStart = explicitSchedule?.start || staffMember.start_time || "09:00";
    const staffEnd = explicitSchedule?.end || staffMember.end_time || "19:00";

    const localStartMinutes = toMinutes(localStartTime);
    const localEndMinutes = toMinutes(localEndTime);

    if (
      localEndMinutes <= localStartMinutes ||
      localStartMinutes < toMinutes(staffStart) ||
      localEndMinutes > toMinutes(staffEnd)
    ) {
      return jsonResponse({ error: "outside_staff_schedule" }, 409);
    }

    const openingDayIndex = DAY_INDEX[dayName];

    const { data: openingHours, error: openingError } = await supabase
      .from("opening_hours")
      .select("is_open, open_time, close_time, break_start, break_end")
      .eq("salon_id", salon_id)
      .eq("day_of_week", openingDayIndex)
      .maybeSingle();

    if (openingError) throw openingError;

    if (openingHours) {
      if (!openingHours.is_open) {
        return jsonResponse({ error: "salon_closed" }, 409);
      }

      const openMinutes = toMinutes(openingHours.open_time || "09:00");
      const closeMinutes = toMinutes(openingHours.close_time || "19:00");

      if (localStartMinutes < openMinutes || localEndMinutes > closeMinutes) {
        return jsonResponse({ error: "outside_opening_hours" }, 409);
      }

      if (openingHours.break_start && openingHours.break_end) {
        const breakStart = toMinutes(openingHours.break_start);
        const breakEnd = toMinutes(openingHours.break_end);
        const overlapsBreak =
          localStartMinutes < breakEnd && localEndMinutes > breakStart;

        if (overlapsBreak) {
          return jsonResponse({ error: "salon_break" }, 409);
        }
      }
    }

    const rateLimitSince = new Date(Date.now() - 10 * 60_000).toISOString();

    const [
      { count: recentBookingCount, error: rateLimitError },
      { count: recentSalonBookingCount, error: salonRateLimitError },
    ] = await Promise.all([
      supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("salon_id", salon_id)
        .eq("client_phone", normalizedClientPhone)
        .gte("created_at", rateLimitSince),
      supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("salon_id", salon_id)
        .gte("created_at", rateLimitSince),
    ]);

    if (rateLimitError) throw rateLimitError;
    if (salonRateLimitError) throw salonRateLimitError;

    if ((recentBookingCount || 0) >= 3) {
      return jsonResponse({ error: "too_many_booking_attempts" }, 429);
    }

    if ((recentSalonBookingCount || 0) >= 30) {
      return jsonResponse({ error: "booking_temporarily_limited" }, 429);
    }

    const { data: conflicts, error: conflictError } = await supabase
      .from("appointments")
      .select("id")
      .eq("salon_id", salon_id)
      .eq("staff_id", staff_id)
      .neq("status", "cancelled")
      .lt("start_time", appointmentEnd.toISOString())
      .gt("end_time", appointmentStart.toISOString());

    if (conflictError) throw conflictError;

    if ((conflicts || []).length > 0) {
      return jsonResponse({ error: "slot_no_longer_available" }, 409);
    }

    const { data: appointment, error: insertError } = await supabase
      .from("appointments")
      .insert({
        user_id: salon.owner_user_id,
        salon_id,
        staff_id,
        client_name: cleanClientName,
        client_phone: normalizedClientPhone,
        services: [
          {
            id: service.id,
            name: service.name,
            price: Number(service.price),
            duration: Number(service.duration),
            category: service.category,
          },
        ],
        start_time: appointmentStart.toISOString(),
        end_time: appointmentEnd.toISOString(),
        total_price: Number(service.price),
        status: "scheduled",
        is_paid: false,
      })
      .select("id")
      .single();

    if (insertError) throw insertError;

    return jsonResponse({
      success: true,
      appointment_id: appointment.id,
      message: "Réservation créée avec succès",
    });
  } catch (error) {
    console.error("[PUBLIC-BOOKING]", error);

    const message = error instanceof Error ? error.message : String(error || "");
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: unknown }).code || "")
        : "";

    if (message.includes("appointment_conflict") || code === "23P01") {
      return jsonResponse({ error: "slot_no_longer_available" }, 409);
    }

    return jsonResponse({ error: "internal_server_error" }, 500);
  }
});
