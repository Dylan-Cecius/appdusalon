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

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { salon_id, staff_id, service, start_time, end_time, client_name, client_phone } = body;

    // Validate required fields
    if (!salon_id || !service || !start_time || !end_time || !client_name || !client_phone) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate input lengths
    if (client_name.length > 100 || client_phone.length > 20) {
      return new Response(
        JSON.stringify({ error: 'Invalid input length' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get salon owner
    const { data: salon, error: salonError } = await supabase
      .from('salons')
      .select('owner_user_id')
      .eq('id', salon_id)
      .single();

    if (salonError || !salon) {
      return new Response(
        JSON.stringify({ error: 'Salon not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify staff belongs to this salon (if provided)
    if (staff_id) {
      const { data: staffMember } = await supabase
        .from('staff')
        .select('id')
        .eq('id', staff_id)
        .eq('salon_id', salon_id)
        .eq('is_active', true)
        .single();

      if (!staffMember) {
        return new Response(
          JSON.stringify({ error: 'Staff member not found' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check for conflicts
    const appointmentStart = new Date(start_time);
    const appointmentEnd = new Date(end_time);

    let conflictQuery = supabase
      .from('appointments')
      .select('id')
      .eq('salon_id', salon_id)
      .neq('status', 'cancelled')
      .lt('start_time', appointmentEnd.toISOString())
      .gt('end_time', appointmentStart.toISOString());

    if (staff_id) {
      conflictQuery = conflictQuery.eq('staff_id', staff_id);
    }

    const { data: conflicts } = await conflictQuery;

    if (conflicts && conflicts.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Ce créneau n\'est plus disponible' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create appointment
    const { data: appointment, error: insertError } = await supabase
      .from('appointments')
      .insert({
        user_id: salon.owner_user_id,
        salon_id,
        staff_id: staff_id || null,
        client_name,
        client_phone,
        services: [{ name: service.name, price: service.price }],
        start_time: appointmentStart.toISOString(),
        end_time: appointmentEnd.toISOString(),
        total_price: service.price,
        status: 'scheduled',
        is_paid: false,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Error creating appointment:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create appointment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Public booking created: ${appointment.id} for salon ${salon_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        appointment_id: appointment.id,
        message: 'Réservation créée avec succès'
      }),
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
