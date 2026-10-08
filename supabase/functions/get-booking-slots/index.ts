import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TIME_ZONE = "Europe/Brussels";
const SLOT_INTERVAL = 30;
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const toTimeString = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

const zonedDateTimeToUtc = (date: string, time: string, timeZone = TIME_ZONE) => {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);

  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(guess)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );

  return new Date(guess.getTime() - (asUtc - guess.getTime()));
};

const normalizeTier = (tier?: string | null) => {
  if (tier === "Pro") return "Equipe";
  if (tier === "Enterprise") return "Lifetime";
  return tier ?? null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "GET") return jsonResponse({ error: "method_not_allowed" }, 405);

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const url = new URL(req.url);
    const salonId = url.searchParams.get("salon_id");
    const serviceId = url.searchParams.get("service_id");
    const requestedStaffId = url.searchParams.get("staff_id");
    const date = url.searchParams.get("date");

    if (!salonId || !serviceId || !date) {
      return jsonResponse({ error: "salon_id, service_id and date are required" }, 400);
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return jsonResponse({ error: "invalid_date" }, 400);
    }

    const requestedDate = new Date(`${date}T12:00:00Z`);
    const maxBookingDate = new Date();
    maxBookingDate.setUTCDate(maxBookingDate.getUTCDate() + 366);

    if (
      Number.isNaN(requestedDate.getTime()) ||
      requestedDate.getTime() > maxBookingDate.getTime()
    ) {
      return jsonResponse({ error: "date_out_of_range" }, 400);
    }

    const { data: salon, error: salonError } = await supabase
      .from("salons")
      .select("owner_user_id")
      .eq("id", salonId)
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
          .select("id, duration, appointment_buffer, category")
          .eq("id", serviceId)
          .eq("salon_id", salonId)
          .eq("is_active", true)
          .neq("category", "produit")
          .maybeSingle(),
      ]);

    if (serviceError) throw serviceError;
    if (!service) return jsonResponse({ error: "service_not_found" }, 404);

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

    const duration = Math.max(
      5,
      Number(service.duration || 30) + Number(service.appointment_buffer || 0)
    );

    const dayProbe = requestedDate;
    const jsDay = dayProbe.getUTCDay();
    const staffDayName = DAY_NAMES[jsDay];
    const openingDayIndex = jsDay === 0 ? 6 : jsDay - 1;

    const [{ data: openingHours }, { data: staffRows, error: staffError }] = await Promise.all([
      supabase
        .from("opening_hours")
        .select("is_open, open_time, close_time, break_start, break_end")
        .eq("salon_id", salonId)
        .eq("day_of_week", openingDayIndex)
        .maybeSingle(),
      supabase
        .from("staff")
        .select("id, name, daily_schedules, working_days, start_time, end_time")
        .eq("salon_id", salonId)
        .eq("is_active", true)
        .order("name"),
    ]);

    if (staffError) throw staffError;

    if (openingHours && !openingHours.is_open) {
      return jsonResponse({ date, slots: [] });
    }

    const salonOpen = toMinutes(openingHours?.open_time || "09:00");
    const salonClose = toMinutes(openingHours?.close_time || "19:00");
    const salonBreakStart = openingHours?.break_start
      ? toMinutes(openingHours.break_start)
      : null;
    const salonBreakEnd = openingHours?.break_end
      ? toMinutes(openingHours.break_end)
      : null;

    const candidates = (staffRows || [])
      .filter((member) => !requestedStaffId || member.id === requestedStaffId)
      .map((member) => {
        const schedules = (member.daily_schedules || {}) as Record<
          string,
          { start: string; end: string }
        >;
        const explicitSchedule = schedules[staffDayName];
        const workingDays = Array.isArray(member.working_days) ? member.working_days : [];

        if (!explicitSchedule && !workingDays.includes(staffDayName)) return null;

        const start = toMinutes(explicitSchedule?.start || member.start_time || "09:00");
        const end = toMinutes(explicitSchedule?.end || member.end_time || "19:00");

        return {
          id: member.id,
          start: Math.max(start, salonOpen),
          end: Math.min(end, salonClose),
        };
      })
      .filter(
        (member): member is { id: string; start: number; end: number } =>
          Boolean(member && member.end > member.start)
      );

    if (candidates.length === 0) return jsonResponse({ date, slots: [] });

    const localDayStart = zonedDateTimeToUtc(date, "00:00");
    const nextDate = new Date(`${date}T12:00:00Z`);
    nextDate.setUTCDate(nextDate.getUTCDate() + 1);
    const localDayEnd = zonedDateTimeToUtc(nextDate.toISOString().slice(0, 10), "00:00");

    const { data: appointments, error: appointmentsError } = await supabase
      .from("appointments")
      .select("staff_id, start_time, end_time")
      .eq("salon_id", salonId)
      .neq("status", "cancelled")
      .gte("start_time", localDayStart.toISOString())
      .lt("start_time", localDayEnd.toISOString());

    if (appointmentsError) throw appointmentsError;

    const firstMinute = Math.min(...candidates.map((member) => member.start));
    const lastMinute = Math.max(...candidates.map((member) => member.end));
    const now = new Date();

    const slots: Array<{
      time: string;
      start_time: string;
      end_time: string;
      available: boolean;
      staff_id: string | null;
    }> = [];

    for (let minute = firstMinute; minute + duration <= lastMinute; minute += SLOT_INTERVAL) {
      const endMinute = minute + duration;

      if (
        salonBreakStart !== null &&
        salonBreakEnd !== null &&
        minute < salonBreakEnd &&
        endMinute > salonBreakStart
      ) {
        continue;
      }

      const slotStart = zonedDateTimeToUtc(date, toTimeString(minute));
      const slotEnd = zonedDateTimeToUtc(date, toTimeString(endMinute));

      if (slotStart <= now) continue;

      let assignedStaffId: string | null = null;

      for (const member of candidates) {
        if (minute < member.start || endMinute > member.end) continue;

        const conflict = (appointments || []).some((appointment) => {
          if (appointment.staff_id !== member.id) return false;
          const appointmentStart = new Date(appointment.start_time);
          const appointmentEnd = new Date(appointment.end_time);
          return slotStart < appointmentEnd && slotEnd > appointmentStart;
        });

        if (!conflict) {
          assignedStaffId = member.id;
          break;
        }
      }

      slots.push({
        time: toTimeString(minute),
        start_time: slotStart.toISOString(),
        end_time: slotEnd.toISOString(),
        available: assignedStaffId !== null,
        staff_id: assignedStaffId,
      });
    }

    return jsonResponse({ date, slots });
  } catch (error) {
    console.error("[BOOKING-SLOTS]", error);
    return jsonResponse({ error: "internal_server_error" }, 500);
  }
});
