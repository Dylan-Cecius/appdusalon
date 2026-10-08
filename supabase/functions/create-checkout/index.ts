import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { resolveAppOrigin, isTrustedAppOrigin } from "../_shared/app-origin.ts";
import { resolveBillingOwner } from "../_shared/billing-owner.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (!isTrustedAppOrigin(req)) {
    return new Response(JSON.stringify({ error: "origin_not_allowed" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("billing_not_configured");
    }

    const supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    const billingOwner = await resolveBillingOwner(supabaseClient, user);
    if (!billingOwner.isOwner) {
      return new Response(JSON.stringify({ error: "billing_owner_required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!billingOwner.salonId) {
      return new Response(JSON.stringify({ error: "salon_not_found" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const billingEmail = billingOwner.ownerEmail;
    const billingUserId = billingOwner.ownerUserId;
    logStep("Billing owner authenticated", { userId: billingUserId });

    const { plan } = await req.json();
    if (!plan || !['solo', 'equipe'].includes(plan)) {
      throw new Error("Invalid subscription plan. Must be 'solo' or 'equipe'");
    }
    logStep("Plan validated", { plan });

    const plans = {
      solo: { name: "Solo", price: 1900 },   // 19€
      equipe: { name: "Équipe", price: 5900 }, // 59€
    };

    const selectedPlan = plans[plan as keyof typeof plans];
    logStep("Selected plan", selectedPlan);

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    const customers = await stripe.customers.list({ email: billingEmail, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });

      const existingSubscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "all",
        limit: 20,
      });

      const hasLiveSubscription = existingSubscriptions.data.some((subscription: Stripe.Subscription) =>
        ["active", "trialing", "past_due", "unpaid", "paused"].includes(subscription.status)
      );

      if (hasLiveSubscription) {
        return new Response(JSON.stringify({ already_subscribed: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    const origin = resolveAppOrigin(req);
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : billingEmail,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: { 
              name: `L'app du salon - Plan ${selectedPlan.name}`,
              description: `Abonnement mensuel au plan ${selectedPlan.name}`
            },
            unit_amount: selectedPlan.price,
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      subscription_data: {
        metadata: {
          user_id: billingUserId,
          plan,
        },
      },
      success_url: `${origin}/abonnements?subscription=success&plan=${plan}`,
      cancel_url: `${origin}/abonnements?subscription=cancelled`,
      metadata: {
        user_id: billingUserId,
        plan: plan
      }
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
