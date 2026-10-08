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

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
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

    // Online booking is a paid product feature. Validate it server-side.
    const { data: ownerResult } = await supabase.auth.admin.getUserById(salon.owner_user_id);
    const ownerEmail = ownerResult?.user?.email?.toLowerCase() || '';

    const [
      { data: platformAdmin },
      { data: subscriberByUser },
      { data: subscriberByEmail },
    ] = await Promise.all([
      ownerEmail
        ? supabase
            .from('platform_admin_emails')
            .select('email')
            .eq('email', ownerEmail)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from('subscribers')
        .select('subscribed, subscription_tier, subscription_end')
        .eq('user_id', salon.owner_user_id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      ownerEmail
        ? supabase
            .from('subscribers')
            .select('subscribed, subscription_tier, subscription_end')
            .eq('email', ownerEmail)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const subscriber = subscriberByUser || subscriberByEmail;

    const tier =
      subscriber?.subscription_tier === 'Pro'
        ? 'Equipe'
        : subscriber?.subscription_tier === 'Enterprise'
          ? 'Lifetime'
          : subscriber?.subscription_tier;

    const subscriptionStillValid =
      subscriber?.subscribed === true &&
      (!subscriber.subscription_end || new Date(subscriber.subscription_end).getTime() > Date.now());

    const canUseOnlineBooking =
      Boolean(platformAdmin) ||
      (subscriptionStillValid && ['Solo', 'Equipe', 'Lifetime'].includes(tier || ''));

    if (!canUseOnlineBooking) {
      return new Response(
        JSON.stringify({ error: 'online_booking_unavailable' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch services and staff in parallel
    const [servicesRes, staffRes] = await Promise.all([
      supabase
        .from('services')
        .select('id, name, price, duration, category, color')
        .eq('salon_id', salon.id)
        .eq('is_active', true)
        .neq('category', 'produit')
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
        salon: { id: salon.id, name: salon.name }
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
