import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const staffId = url.searchParams.get('staff_id'); // optional, null = any
    const date = url.searchParams.get('date'); // YYYY-MM-DD
    const duration = parseInt(url.searchParams.get('duration') || '30');

    if (!salonId || !date) {
      return new Response(
        JSON.stringify({ error: 'salon_id and date are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get salon owner for appointment queries
    const { data: salon } = await supabase
      .from('salons')
      .select('owner_user_id')
      .eq('id', salonId)
      .single();

    if (!salon) {
      return new Response(
        JSON.stringify({ error: 'Salon not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const targetDate = new Date(date + 'T00:00:00');
    const startOfDay = new Date(date + 'T00:00:00.000Z');
    const endOfDay = new Date(date + 'T23:59:59.999Z');

    // Fetch existing appointments for this salon on this date
    let apptQuery = supabase
      .from('appointments')
      .select('staff_id, start_time, end_time')
      .eq('salon_id', salonId)
      .neq('status', 'cancelled')
      .gte('start_time', startOfDay.toISOString())
      .lte('start_time', endOfDay.toISOString());

    if (staffId) {
      apptQuery = apptQuery.eq('staff_id', staffId);
    }

    const { data: appointments } = await apptQuery;

    // Generate slots from 9h to 18h, 30-min intervals
    const WORK_START = 9;
    const WORK_END = 18;
    const SLOT_INTERVAL = 30;

    const slots: Array<{ time: string; start_time: string; end_time: string; available: boolean }> = [];
    const now = new Date();

    for (let hour = WORK_START; hour < WORK_END; hour++) {
      for (let minute = 0; minute < 60; minute += SLOT_INTERVAL) {
        const slotStart = new Date(targetDate);
        slotStart.setHours(hour, minute, 0, 0);
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + duration);

        // Skip if slot end goes past work hours
        if (slotEnd.getHours() > WORK_END || (slotEnd.getHours() === WORK_END && slotEnd.getMinutes() > 0)) {
          continue;
        }

        // Skip past slots
        if (slotStart <= now) {
          continue;
        }

        // Check conflicts
        const hasConflict = appointments?.some(apt => {
          if (staffId && apt.staff_id !== staffId) return false;
          const aptStart = new Date(apt.start_time);
          const aptEnd = new Date(apt.end_time);
          return slotStart < aptEnd && slotEnd > aptStart;
        }) || false;

        const timeDisplay = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

        slots.push({
          time: timeDisplay,
          start_time: slotStart.toISOString(),
          end_time: slotEnd.toISOString(),
          available: !hasConflict
        });
      }
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
