import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const date = url.searchParams.get('date');
    const barberId = url.searchParams.get('barberId');
    const serviceDuration = parseInt(url.searchParams.get('serviceDuration') || '30');

    if (!date) {
      return new Response(
        JSON.stringify({ error: 'Date parameter is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const targetDate = new Date(date);
    const dayName = targetDate.toLocaleDateString('en-US', { weekday: 'long' });

    // Get barbers (filter by barberId if provided)
    let barbersQuery = supabase.from('barbers').select('*').eq('is_active', true);
    if (barberId) {
      barbersQuery = barbersQuery.eq('id', barberId);
    }
    const { data: barbers, error: barbersError } = await barbersQuery;

    if (barbersError) {
      console.error('Error fetching barbers:', barbersError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch barbers' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const availableSlots = [];

    for (const barber of barbers || []) {
      // Check if barber works on this day
      if (!barber.working_days?.includes(dayName)) {
        continue;
      }

      // Get existing appointments for this barber on this date
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const { data: appointments } = await supabase
        .from('appointments')
        .select('start_time, end_time')
        .eq('barber_id', barber.id)
        .gte('start_time', startOfDay.toISOString())
        .lte('start_time', endOfDay.toISOString())
        .neq('status', 'cancelled');

      // Get lunch breaks
      const { data: lunchBreaks } = await supabase
        .from('lunch_breaks')
        .select('start_time, end_time')
        .eq('barber_id', barber.id)
        .eq('is_active', true);

      // Get custom blocks for this date
      const { data: customBlocks } = await supabase
        .from('custom_blocks')
        .select('start_time, end_time')
        .eq('barber_id', barber.id)
        .eq('block_date', targetDate.toISOString().split('T')[0]);

      // Generate time slots
      const workStart = parseInt(barber.start_time.split(':')[0]);
      const workEnd = parseInt(barber.end_time.split(':')[0]);
      const slots = [];

      for (let hour = workStart; hour < workEnd; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const slotStart = new Date(targetDate);
          slotStart.setHours(hour, minute, 0, 0);
          const slotEnd = new Date(slotStart);
          slotEnd.setMinutes(slotEnd.getMinutes() + serviceDuration);

          // Skip slots that go beyond work hours
          const slotEndHour = slotEnd.getHours() + (slotEnd.getMinutes() > 0 ? slotEnd.getMinutes() / 60 : 0);
          if (slotEndHour > workEnd) continue;

          // Skip past slots
          if (slotStart < new Date()) continue;

          // Check conflicts with appointments
          const hasAppointmentConflict = appointments?.some(apt => {
            const aptStart = new Date(apt.start_time);
            const aptEnd = new Date(apt.end_time);
            return (slotStart < aptEnd && slotEnd > aptStart);
          });

          // Check conflicts with lunch breaks
          const hasLunchConflict = lunchBreaks?.some(lunch => {
            const lunchStart = new Date(targetDate);
            const [lunchStartHour, lunchStartMinute] = lunch.start_time.split(':');
            lunchStart.setHours(parseInt(lunchStartHour), parseInt(lunchStartMinute), 0, 0);
            
            const lunchEnd = new Date(targetDate);
            const [lunchEndHour, lunchEndMinute] = lunch.end_time.split(':');
            lunchEnd.setHours(parseInt(lunchEndHour), parseInt(lunchEndMinute), 0, 0);
            
            return (slotStart < lunchEnd && slotEnd > lunchStart);
          });

          // Check conflicts with custom blocks
          const hasBlockConflict = customBlocks?.some(block => {
            const blockStart = new Date(targetDate);
            const [blockStartHour, blockStartMinute] = block.start_time.split(':');
            blockStart.setHours(parseInt(blockStartHour), parseInt(blockStartMinute), 0, 0);
            
            const blockEnd = new Date(targetDate);
            const [blockEndHour, blockEndMinute] = block.end_time.split(':');
            blockEnd.setHours(parseInt(blockEndHour), parseInt(blockEndMinute), 0, 0);
            
            return (slotStart < blockEnd && slotEnd > blockStart);
          });

          if (!hasAppointmentConflict && !hasLunchConflict && !hasBlockConflict) {
            slots.push({
              start_time: slotStart.toISOString(),
              end_time: slotEnd.toISOString(),
              time_display: slotStart.toLocaleTimeString('fr-FR', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })
            });
          }
        }
      }

      if (slots.length > 0) {
        availableSlots.push({
          barber_id: barber.id,
          barber_name: barber.name,
          slots: slots
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        date: date,
        available_slots: availableSlots 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});