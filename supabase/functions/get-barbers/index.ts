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

    // Get active barbers
    const { data: barbers, error } = await supabase
      .from('barbers')
      .select('id, name, working_days, start_time, end_time, color')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching barbers:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch barbers' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Format barbers data for external use
    const formattedBarbers = barbers?.map(barber => ({
      id: barber.id,
      name: barber.name,
      working_days: barber.working_days || [],
      work_hours: {
        start: barber.start_time,
        end: barber.end_time
      },
      color: barber.color
    })) || [];

    return new Response(
      JSON.stringify({ 
        barbers: formattedBarbers
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