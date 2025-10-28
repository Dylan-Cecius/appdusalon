// Deno Edge Function: create-promo-code
// Allows only a specific admin email to create promo codes. Uses the service role to bypass RLS safely.
// CORS enabled.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const ALLOWED_ADMIN_EMAILS = new Set<string>(["dylan.cecius@gmail.com"]);

function corsHeaders(origin?: string) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  } as Record<string, string>;
}

serve(async (req) => {
  const origin = req.headers.get("origin") ?? "*";

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: userResult, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userResult?.user) {
      return new Response(JSON.stringify({ error: "not_authenticated" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      });
    }

    const requesterEmail = userResult.user.email ?? "";
    if (!ALLOWED_ADMIN_EMAILS.has(requesterEmail)) {
      return new Response(JSON.stringify({ error: "forbidden", message: "Not allowed" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      });
    }

    const body = await req.json().catch(() => ({}));

    const payload = {
      code: String(body.code || "").toUpperCase(),
      type: body.type as string,
      description: body.description ?? null,
      max_uses: typeof body.max_uses === "number" ? body.max_uses : null,
      expires_at: body.expires_at ? new Date(body.expires_at).toISOString() : null,
      created_by: userResult.user.id,
    } as {
      code: string;
      type: string;
      description: string | null;
      max_uses: number | null;
      expires_at: string | null;
      created_by: string;
    };

    if (!payload.code || !payload.type) {
      return new Response(JSON.stringify({ error: "validation_error", message: "code and type are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      });
    }

    const { error: insertErr } = await supabaseAdmin.from("promo_codes").insert(payload);
    if (insertErr) {
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "internal_error", message: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders() },
    });
  }
});
