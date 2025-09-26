import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

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
    // SECURITY: Use service role key but validate salon ownership
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
      notes,
      salon_owner_id // SECURITY: Required for validation
    } = body;

    // Validate required fields including security field
    if (!client_name || !client_phone || !barber_id || !start_time || !end_time || !services || !salon_owner_id) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: client_name, client_phone, barber_id, start_time, end_time, services, salon_owner_id' 
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

    // SECURITY: Verify the barber exists, is active, AND belongs to the requesting salon
    const { data: barber, error: barberError } = await supabase
      .from('barbers')
      .select('id, name, is_active, user_id')
      .eq('id', barber_id)
      .eq('is_active', true)
      .eq('user_id', salon_owner_id) // CRITICAL: Verify ownership
      .single();

    if (barberError || !barber) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Barber not found or access denied' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check for time slot conflicts - only for this salon's appointments
    const appointmentStart = new Date(start_time);
    const appointmentEnd = new Date(end_time);

    // SECURITY: Check existing appointments only for this salon
    const { data: conflictingAppointments } = await supabase
      .from('appointments')
      .select('id')
      .eq('barber_id', barber_id)
      .eq('user_id', salon_owner_id) // CRITICAL: Only check this salon's appointments
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
    // SECURITY: Already validated above that barber belongs to salon_owner_id

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
        user_id: salon_owner_id // Use validated salon owner ID
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

    // SECURITY: Log only essential info, no sensitive client data
    console.log(`New booking created: ${appointment.id} for salon ${salon_owner_id} with barber ${barber.name}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        appointment: {
          id: appointment.id,
          // SECURITY: Don't expose client_name in response for external calls
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