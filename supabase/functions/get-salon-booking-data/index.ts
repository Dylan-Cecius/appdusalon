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
    const slug = url.searchParams.get('slug');

    if (!salonId && !slug) {
      return new Response(
        JSON.stringify({ error: 'salon_id or slug is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Resolve salon
    let salonQuery = supabase
      .from('salons')
      .select('id, name, owner_user_id')
    
    if (slug) {
      salonQuery = salonQuery.eq('slug', slug);
    } else {
      salonQuery = salonQuery.eq('id', salonId);
    }

    const { data: salon, error: salonError } = await salonQuery.single();

    if (salonError || !salon) {
      return new Response(
        JSON.stringify({ error: 'Salon not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch services and staff in parallel
    const [servicesRes, staffRes] = await Promise.all([
      supabase
        .from('services')
        .select('id, name, price, duration, category, color')
        .eq('salon_id', salon.id)
        .eq('is_active', true)
        .order('display_order'),
      supabase
        .from('staff')
        .select('id, name, role, color')
        .eq('salon_id', salon.id)
        .eq('is_active', true)
        .order('name'),
    ]);

    return new Response(
      JSON.stringify({
        salon_id: salon.id,
        services: servicesRes.data || [],
        staff: staffRes.data || [],
        salon: { id: salon.id, name: salon.name },
        owner_user_id: salon.owner_user_id
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
