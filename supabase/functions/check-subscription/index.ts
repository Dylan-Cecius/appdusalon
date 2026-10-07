import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { resolveBillingOwner } from "../_shared/billing-owner.ts";
import { isTrustedAppOrigin } from "../_shared/app-origin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type SubscriptionState = {
  subscribed: boolean;
  subscription_tier: string | null;
  subscription_end: string | null;
};

const normalizeTier = (tier: string | null | undefined) => {
  if (tier === "Pro") return "Equipe";
  if (tier === "Enterprise") return "Lifetime";
  return tier ?? null;
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

serve(async (req) => {
  if (!isTrustedAppOrigin(req)) {
    return new Response(JSON.stringify({ error: "origin_not_allowed" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
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
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "not_authenticated" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user?.email) {
      return jsonResponse({ error: "not_authenticated" }, 401);
    }

    const user = userData.user;
    const requesterEmail = String(user.email).toLowerCase();
    const billingOwner = await resolveBillingOwner(supabaseClient, user);
    const billingEmail = billingOwner.ownerEmail;
    const billingUserId = billingOwner.ownerUserId;

    // Platform administrators and salons owned by a platform administrator
    // receive lifetime product access through the server-side registry.
    const { data: platformAdmin } = await supabaseClient
      .from("platform_admin_emails")
      .select("email")
      .in("email", Array.from(new Set([requesterEmail, billingEmail])))
      .limit(1)
      .maybeSingle();

    if (platformAdmin) {
      await supabaseClient.from("subscribers").upsert({
        email: billingEmail,
        user_id: billingUserId,
        subscribed: true,
        subscription_tier: "Lifetime",
        subscription_end: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "email" });

      return jsonResponse({
        subscribed: true,
        subscription_tier: "Lifetime",
        subscription_end: null,
      } satisfies SubscriptionState);
    }

    const { data: existingSubscriber } = await supabaseClient
      .from("subscribers")
      .select("subscribed, subscription_tier, subscription_end, stripe_customer_id")
      .or(`user_id.eq.${billingUserId},email.eq.${billingEmail}`)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const existingTier = normalizeTier(existingSubscriber?.subscription_tier);
    const existingEnd = existingSubscriber?.subscription_end
      ? new Date(existingSubscriber.subscription_end)
      : null;

    // Preserve non-Stripe entitlements such as promo trials and lifetime codes.
    const lifetimeAccess =
      existingSubscriber?.subscribed === true &&
      existingTier === "Lifetime";

    const validPromoTrial =
      existingSubscriber?.subscribed === true &&
      !existingSubscriber?.stripe_customer_id &&
      existingTier === "Equipe" &&
      existingEnd !== null &&
      existingEnd.getTime() > Date.now();

    if (lifetimeAccess || validPromoTrial) {
      if (existingTier !== existingSubscriber?.subscription_tier) {
        await supabaseClient
          .from("subscribers")
          .update({ subscription_tier: existingTier, updated_at: new Date().toISOString() })
          .eq("email", billingEmail);
      }

      return jsonResponse({
        subscribed: true,
        subscription_tier: existingTier,
        subscription_end: existingEnd?.toISOString() ?? null,
      } satisfies SubscriptionState);
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!stripeKey) {
      if (existingSubscriber?.stripe_customer_id) {
        return jsonResponse({ error: "billing_not_configured" }, 503);
      }

      await supabaseClient.from("subscribers").upsert({
        email: billingEmail,
        user_id: billingUserId,
        stripe_customer_id: null,
        subscribed: false,
        subscription_tier: null,
        subscription_end: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "email" });

      return jsonResponse({
        subscribed: false,
        subscription_tier: null,
        subscription_end: null,
      } satisfies SubscriptionState);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    let customerId = existingSubscriber?.stripe_customer_id || null;

    if (!customerId) {
      const customers = await stripe.customers.list({ email: billingEmail, limit: 1 });
      customerId = customers.data[0]?.id ?? null;
    }

    if (!customerId) {
      await supabaseClient.from("subscribers").upsert({
        email: billingEmail,
        user_id: billingUserId,
        stripe_customer_id: null,
        subscribed: false,
        subscription_tier: null,
        subscription_end: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "email" });

      return jsonResponse({
        subscribed: false,
        subscription_tier: null,
        subscription_end: null,
      } satisfies SubscriptionState);
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 10,
    });

    const activeSubscription = subscriptions.data
      .sort((a: Stripe.Subscription, b: Stripe.Subscription) => b.created - a.created)[0];

    if (!activeSubscription) {
      await supabaseClient.from("subscribers").upsert({
        email: billingEmail,
        user_id: billingUserId,
        stripe_customer_id: customerId,
        subscribed: false,
        subscription_tier: null,
        subscription_end: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "email" });

      return jsonResponse({
        subscribed: false,
        subscription_tier: null,
        subscription_end: null,
      } satisfies SubscriptionState);
    }

    const metadataPlan = activeSubscription.metadata?.plan;
    let subscriptionTier: "Solo" | "Equipe";

    if (metadataPlan === "solo") {
      subscriptionTier = "Solo";
    } else if (metadataPlan === "equipe") {
      subscriptionTier = "Equipe";
    } else {
      const price = activeSubscription.items.data[0]?.price;
      const amount = price?.unit_amount ?? 0;
      subscriptionTier = amount <= 3000 ? "Solo" : "Equipe";
    }

    const subscriptionEnd = new Date(
      activeSubscription.current_period_end * 1000
    ).toISOString();

    await supabaseClient.from("subscribers").upsert({
      email: billingEmail,
      user_id: billingUserId,
      stripe_customer_id: customerId,
      subscribed: true,
      subscription_tier: subscriptionTier,
      subscription_end: subscriptionEnd,
      updated_at: new Date().toISOString(),
    }, { onConflict: "email" });

    return jsonResponse({
      subscribed: true,
      subscription_tier: subscriptionTier,
      subscription_end: subscriptionEnd,
    } satisfies SubscriptionState);
  } catch (error) {
    console.error("[CHECK-SUBSCRIPTION]", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "internal_error" },
      500
    );
  }
});
