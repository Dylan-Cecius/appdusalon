import { isTrustedAppOrigin } from "../_shared/app-origin.ts";
import { getAuthenticatedUser, resolveSalonAndCheckEntitlement, sendSms } from "../_shared/sms.ts";

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
    const { salonId } = await resolveSalonAndCheckEntitlement(admin, user, "automation");

    const { type, client_id, message } = await req.json();
    const allowedTypes = new Set(["reminder", "birthday", "reactivation"]);

    if (!allowedTypes.has(String(type)) || !client_id || !String(message || "").trim()) {
      return jsonResponse({ error: "validation_error" }, 400);
    }

    const { data: client, error: clientError } = await admin
      .from("clients")
      .select("id, phone, sms_opt_out")
      .eq("id", client_id)
      .eq("salon_id", salonId)
      .maybeSingle();

    if (clientError) throw clientError;
    if (!client?.phone || client.sms_opt_out) {
      return jsonResponse({ error: "client_not_eligible" }, 400);
    }

    const cleanMessage = String(message).trim();
    if (cleanMessage.length > 1000) {
      return jsonResponse({ error: "input_too_long" }, 400);
    }

    const result = await sendSms(client.phone, cleanMessage);

    await admin.from("sms_logs").insert({
      salon_id: salonId,
      client_id: client.id,
      phone_number: client.phone,
      message: cleanMessage,
      type: String(type),
      status: result.ok ? "sent" : "failed",
      twilio_sid: result.sid,
    });

    return jsonResponse({
      success: result.ok,
      error: result.error || undefined,
    }, result.ok ? 200 : 502);
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal_error";
    const status =
      message === "not_authenticated" ? 401 :
      message === "subscription_required" || message === "upgrade_required" ? 403 :
      message === "salon_not_found" ? 404 :
      message === "sms_provider_not_configured" ? 503 : 500;

    console.error("[SMS-AUTOMATION]", error);
    return jsonResponse({ error: message }, status);
  }
});
