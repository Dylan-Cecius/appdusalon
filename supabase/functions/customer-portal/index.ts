import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import { resolveAppOrigin, isTrustedAppOrigin } from "../_shared/app-origin.ts";
import { resolveBillingOwner } from "../_shared/billing-owner.ts";
import { requireMfaAssurance } from "../_shared/mfa.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

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
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeKey || !supabaseUrl || !serviceRoleKey) {
      throw new Error("billing_not_configured");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "unauthorized" }, 401);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    const user = userData.user;

    if (userError || !user?.email) {
      return jsonResponse({ error: "unauthorized" }, 401);
    }

    await requireMfaAssurance(req);

    const billingOwner = await resolveBillingOwner(supabase, user);
    if (!billingOwner.isOwner) {
      return jsonResponse({ error: "billing_owner_required" }, 403);
    }

    if (!billingOwner.salonId) {
      return jsonResponse({ error: "salon_not_found" }, 409);
    }

    const billingEmail = billingOwner.ownerEmail;
    const billingUserId = billingOwner.ownerUserId;

    const { data: subscriber } = await supabase
      .from("subscribers")
      .select("stripe_customer_id")
      .or(`user_id.eq.${billingUserId},email.eq.${billingEmail}`)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    let customerId = subscriber?.stripe_customer_id || null;

    if (!customerId) {
      const customers = await stripe.customers.list({ email: billingEmail, limit: 1 });
      customerId = customers.data[0]?.id ?? null;
    }

    if (!customerId) {
      return jsonResponse({ error: "stripe_customer_not_found" }, 404);
    }

    const returnBase = resolveAppOrigin(req);
    const returnUrl = new URL("/abonnements", returnBase).toString();

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return jsonResponse({ url: portalSession.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal_server_error";
    const status =
      message === "mfa_required" ? 403 :
      message === "auth_not_configured" || message === "mfa_check_failed" ? 503 : 500;

    console.error("[CUSTOMER-PORTAL]", error);
    return jsonResponse(
      { error: status === 500 ? "internal_server_error" : message },
      status
    );
  }
});
