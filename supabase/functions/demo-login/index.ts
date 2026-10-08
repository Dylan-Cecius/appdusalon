import { isTrustedAppOrigin } from "../_shared/app-origin.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (!isTrustedAppOrigin(req)) {
    return new Response(JSON.stringify({ error: "origin_not_allowed" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const demoEmail = Deno.env.get("DEMO_ACCOUNT_EMAIL") || "demo@appdusalon.com";
    const demoPassword = Deno.env.get("DEMO_ACCOUNT_PASSWORD");

    if (!supabaseUrl || !anonKey || !demoPassword) {
      return new Response(JSON.stringify({ error: "demo_not_configured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const client = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
    });

    const { data, error } = await client.auth.signInWithPassword({
      email: demoEmail,
      password: demoPassword,
    });

    if (error || !data.session || !data.user) {
      console.error("[DEMO-LOGIN] authentication failed", error?.message);
      return new Response(JSON.stringify({ error: "demo_unavailable" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: demoSalon, error: demoSalonError } = await client
      .from("salons")
      .select("id")
      .eq("owner_user_id", data.user.id)
      .eq("is_demo", true)
      .limit(1)
      .maybeSingle();

    if (demoSalonError || !demoSalon) {
      console.error("[DEMO-LOGIN] configured account is not a demo salon owner");
      await client.auth.signOut();
      return new Response(JSON.stringify({ error: "demo_unavailable" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[DEMO-LOGIN]", error);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
