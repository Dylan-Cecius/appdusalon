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

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { 
      client_name, 
      client_phone, 
      client_email,
      barber_id, 
      start_time, 
      end_time, 
      services, 
      notes 
    } = body;

    // Validate required fields
    if (!client_name || !client_phone || !barber_id || !start_time || !end_time || !services) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: client_name, client_phone, barber_id, start_time, end_time, services' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate services format
    if (!Array.isArray(services) || services.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Services must be a non-empty array' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Calculate total price
    const totalPrice = services.reduce((sum, service) => sum + (service.price || 0), 0);

    // Verify the barber exists and is active
    const { data: barber, error: barberError } = await supabase
      .from('barbers')
      .select('id, name, is_active')
      .eq('id', barber_id)
      .eq('is_active', true)
      .single();

    if (barberError || !barber) {
      return new Response(
        JSON.stringify({ error: 'Barber not found or inactive' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check for time slot conflicts
    const appointmentStart = new Date(start_time);
    const appointmentEnd = new Date(end_time);

    // Check existing appointments
    const { data: conflictingAppointments } = await supabase
      .from('appointments')
      .select('id')
      .eq('barber_id', barber_id)
      .neq('status', 'cancelled')
      .or(`and(start_time.lt.${appointmentEnd.toISOString()},end_time.gt.${appointmentStart.toISOString()})`);

    if (conflictingAppointments && conflictingAppointments.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Time slot is no longer available' }),
        { 
          status: 409, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create the appointment
    // For external bookings, we need to find the salon owner's user_id
    // since RLS requires appointments to be linked to a user
    const { data: salonOwner, error: ownerError } = await supabase
      .from('barbers')
      .select('user_id')
      .eq('id', barber_id)
      .single();

    if (ownerError || !salonOwner?.user_id) {
      return new Response(
        JSON.stringify({ error: 'Unable to process booking - salon owner not found' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .insert({
        client_name,
        client_phone,
        barber_id,
        start_time: appointmentStart.toISOString(),
        end_time: appointmentEnd.toISOString(),
        services,
        total_price: totalPrice,
        status: 'scheduled',
        is_paid: false,
        notes: notes || null,
        user_id: salonOwner.user_id // Link to salon owner for RLS compliance
      })
      .select()
      .single();

    if (appointmentError) {
      console.error('Error creating appointment:', appointmentError);
      return new Response(
        JSON.stringify({ error: 'Failed to create appointment' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Log the successful booking
    console.log(`New booking created: ${appointment.id} for ${client_name} with ${barber.name}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        appointment: {
          id: appointment.id,
          client_name: appointment.client_name,
          barber_name: barber.name,
          start_time: appointment.start_time,
          end_time: appointment.end_time,
          services: appointment.services,
          total_price: appointment.total_price,
          status: appointment.status
        },
        message: 'Réservation créée avec succès'
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