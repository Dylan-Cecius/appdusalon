import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import { isTrustedAppOrigin } from "../_shared/app-origin.ts";

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
    return jsonResponse({ error: "origin_not_allowed" }, 403);
  }

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "GET") return jsonResponse({ error: "method_not_allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "backend_not_configured" }, 503);
    }

    const sessionId = new URL(req.url).searchParams.get("session_id")?.trim() || "";
    if (!sessionId.startsWith("cs_") || sessionId.length > 255) {
      return jsonResponse({ error: "invalid_session_id" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { error: expiryError } = await admin.rpc("expire_pending_booking_payments");
    if (expiryError) throw expiryError;

    const { data: appointment, error } = await admin
      .from("appointments")
      .select("status, payment_status, deposit_required, amount_paid")
      .eq("payment_reference", sessionId)
      .maybeSingle();

    if (error) throw error;
    if (!appointment) return jsonResponse({ error: "payment_not_found" }, 404);

    return jsonResponse({
      confirmed: appointment.status === "scheduled",
      expired:
        appointment.status === "cancelled" &&
        appointment.payment_status === "expired",
      status: appointment.status,
      payment_status: appointment.payment_status,
      amount_required: Number(appointment.deposit_required || 0),
      amount_paid: Number(appointment.amount_paid || 0),
    });
  } catch (error) {
    console.error("[BOOKING-PAYMENT-STATUS]", error);
    return jsonResponse({ error: "internal_server_error" }, 500);
  }
});
