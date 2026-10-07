import { isTrustedAppOrigin } from "../_shared/app-origin.ts";
import { getAuthenticatedUser, sendSms } from "../_shared/sms.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
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

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  try {
    const { admin, user } = await getAuthenticatedUser(req);
    const email = (user.email || "").toLowerCase();

    const { data: platformAdmin } = await admin
      .from("platform_admin_emails")
      .select("email")
      .eq("email", email)
      .maybeSingle();

    if (!platformAdmin) {
      return jsonResponse({ error: "forbidden" }, 403);
    }

    const { phone } = await req.json();
    const cleanPhone = String(phone || "").trim();
    if (!cleanPhone) return jsonResponse({ error: "phone_required" }, 400);

    const result = await sendSms(cleanPhone, "Test SMS depuis L'App du Salon V2");

    return jsonResponse({
      success: result.ok,
      error: result.error || undefined,
    }, result.ok ? 200 : 502);
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal_error";
    console.error("[SMS-TEST]", error);
    return jsonResponse({ error: message }, message === "not_authenticated" ? 401 : 500);
  }
});
