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

    if (!salonId) {
      return new Response(
        JSON.stringify({ error: 'salon_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch services and staff in parallel
    const [servicesRes, staffRes, salonRes] = await Promise.all([
      supabase
        .from('services')
        .select('id, name, price, duration, category, color')
        .eq('salon_id', salonId)
        .eq('is_active', true)
        .order('display_order'),
      supabase
        .from('staff')
        .select('id, name, role, color')
        .eq('salon_id', salonId)
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('salons')
        .select('id, name, owner_user_id')
        .eq('id', salonId)
        .single()
    ]);

    if (servicesRes.error) {
      console.error('Error fetching services:', servicesRes.error);
    }
    if (staffRes.error) {
      console.error('Error fetching staff:', staffRes.error);
    }

    return new Response(
      JSON.stringify({
        services: servicesRes.data || [],
        staff: staffRes.data || [],
        salon: salonRes.data ? { id: salonRes.data.id, name: salonRes.data.name } : null,
        owner_user_id: salonRes.data?.owner_user_id || null
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
