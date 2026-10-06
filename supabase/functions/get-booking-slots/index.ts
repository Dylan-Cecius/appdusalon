import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TIME_ZONE = 'Europe/Brussels';
const SLOT_INTERVAL = 30;

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const toTimeString = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

const zonedDateTimeToUtc = (date: string, time: string, timeZone = TIME_ZONE) => {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);

  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(guess)
      .filter(part => part.type !== 'literal')
      .map(part => [part.type, part.value])
  );

  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );

  const offset = asUtc - guess.getTime();
  return new Date(guess.getTime() - offset);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const salonId = url.searchParams.get('salon_id');
    const requestedStaffId = url.searchParams.get('staff_id');
    const date = url.searchParams.get('date');
    const duration = Math.max(5, parseInt(url.searchParams.get('duration') || '30', 10));

    if (!salonId || !date) {
      return new Response(
        JSON.stringify({ error: 'salon_id and date are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const dayProbe = new Date(`${date}T12:00:00Z`);
    const jsDay = dayProbe.getUTCDay();
    const staffDayName = DAY_NAMES[jsDay];
    const openingDayIndex = jsDay === 0 ? 6 : jsDay - 1;

    const [{ data: openingHours }, { data: staffRows, error: staffError }] = await Promise.all([
      supabase
        .from('opening_hours')
        .select('is_open, open_time, close_time, break_start, break_end')
        .eq('salon_id', salonId)
        .eq('day_of_week', openingDayIndex)
        .maybeSingle(),
      supabase
        .from('staff')
        .select('id, name, daily_schedules, working_days, start_time, end_time')
        .eq('salon_id', salonId)
        .eq('is_active', true)
        .order('name'),
    ]);

    if (staffError) throw staffError;

    if (openingHours && !openingHours.is_open) {
      return new Response(
        JSON.stringify({ date, slots: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const salonOpen = toMinutes(openingHours?.open_time || '09:00');
    const salonClose = toMinutes(openingHours?.close_time || '19:00');
    const salonBreakStart = openingHours?.break_start ? toMinutes(openingHours.break_start) : null;
    const salonBreakEnd = openingHours?.break_end ? toMinutes(openingHours.break_end) : null;

    const candidates = (staffRows || [])
      .filter(member => !requestedStaffId || member.id === requestedStaffId)
      .map(member => {
        const schedules = (member.daily_schedules || {}) as Record<string, { start: string; end: string }>;
        const explicitSchedule = schedules[staffDayName];
        const workingDays = Array.isArray(member.working_days) ? member.working_days : [];

        if (!explicitSchedule && !workingDays.includes(staffDayName)) {
          return null;
        }

        const start = toMinutes(explicitSchedule?.start || member.start_time || '09:00');
        const end = toMinutes(explicitSchedule?.end || member.end_time || '19:00');

        return {
          id: member.id,
          name: member.name,
          start: Math.max(start, salonOpen),
          end: Math.min(end, salonClose),
        };
      })
      .filter((member): member is { id: string; name: string; start: number; end: number } =>
        Boolean(member && member.end > member.start)
      );

    if (candidates.length === 0) {
      return new Response(
        JSON.stringify({ date, slots: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const localDayStart = zonedDateTimeToUtc(date, '00:00');
    const nextDate = new Date(`${date}T12:00:00Z`);
    nextDate.setUTCDate(nextDate.getUTCDate() + 1);
    const nextDateString = nextDate.toISOString().slice(0, 10);
    const localDayEnd = zonedDateTimeToUtc(nextDateString, '00:00');

    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('staff_id, start_time, end_time')
      .eq('salon_id', salonId)
      .neq('status', 'cancelled')
      .gte('start_time', localDayStart.toISOString())
      .lt('start_time', localDayEnd.toISOString());

    if (appointmentsError) throw appointmentsError;

    const firstMinute = Math.min(...candidates.map(member => member.start));
    const lastMinute = Math.max(...candidates.map(member => member.end));
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

      let assignedStaffId: string | null = null;

      for (const member of candidates) {
        if (minute < member.start || endMinute > member.end) continue;

        const slotStart = zonedDateTimeToUtc(date, toTimeString(minute));
        const slotEnd = zonedDateTimeToUtc(date, toTimeString(endMinute));

        if (slotStart <= now) continue;

        const conflict = (appointments || []).some(appointment => {
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

      const slotStart = zonedDateTimeToUtc(date, toTimeString(minute));
      const slotEnd = zonedDateTimeToUtc(date, toTimeString(endMinute));

      slots.push({
        time: toTimeString(minute),
        start_time: slotStart.toISOString(),
        end_time: slotEnd.toISOString(),
        available: assignedStaffId !== null,
        staff_id: assignedStaffId,
      });
    }

    return new Response(
      JSON.stringify({ date, slots }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
