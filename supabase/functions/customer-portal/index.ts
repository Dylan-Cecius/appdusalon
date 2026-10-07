import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

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

    const email = user.email.toLowerCase();

    const { data: subscriber } = await supabase
      .from("subscribers")
      .select("stripe_customer_id")
      .or(`user_id.eq.${user.id},email.eq.${email}`)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    let customerId = subscriber?.stripe_customer_id || null;

    if (!customerId) {
      const customers = await stripe.customers.list({ email, limit: 1 });
      customerId = customers.data[0]?.id ?? null;
    }

    if (!customerId) {
      return jsonResponse({ error: "stripe_customer_not_found" }, 404);
    }

    const configuredAppUrl = Deno.env.get("APP_URL");
    const requestOrigin = req.headers.get("origin");
    const returnBase = configuredAppUrl || requestOrigin;

    if (!returnBase) {
      return jsonResponse({ error: "return_url_not_configured" }, 503);
    }

    let returnUrl: string;
    try {
      const parsed = new URL(returnBase);
      if (!["https:", "http:"].includes(parsed.protocol)) {
        throw new Error("invalid_protocol");
      }
      returnUrl = new URL("/abonnements", parsed.origin).toString();
    } catch {
      return jsonResponse({ error: "invalid_return_url" }, 400);
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return jsonResponse({ url: portalSession.url });
  } catch (error) {
    console.error("[CUSTOMER-PORTAL]", error);
    return jsonResponse({ error: "internal_server_error" }, 500);
  }
});
