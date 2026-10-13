import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import { isTrustedAppOrigin } from "../_shared/app-origin.ts";
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

Deno.serve(async (req) => {
  if (!isTrustedAppOrigin(req)) {
    return jsonResponse({ error: "origin_not_allowed" }, 403);
  }

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "backend_not_configured" }, 503);
    }

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return jsonResponse({ error: "unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: userData, error: userError } = await admin.auth.getUser(token);
    const user = userData.user;
    if (userError || !user) return jsonResponse({ error: "unauthorized" }, 401);

    await requireMfaAssurance(req);

    const body = await req.json().catch(() => ({}));
    const appointmentId = String(body.appointment_id || "").trim();
    const action = body.action === "no_show" ? "no_show" : "cancel";
    const reason = String(body.reason || "").trim().slice(0, 500);

    if (!appointmentId) {
      return jsonResponse({ error: "appointment_id_required" }, 400);
    }

    const { data: appointment, error: appointmentError } = await admin
      .from("appointments")
      .select(
        "id, salon_id, status, payment_status, amount_paid, payment_provider, payment_reference, refund_status"
      )
      .eq("id", appointmentId)
      .maybeSingle();

    if (appointmentError) throw appointmentError;
    if (!appointment) return jsonResponse({ error: "appointment_not_found" }, 404);

    const { data: allowed, error: accessError } = await admin.rpc("can_access_salon", {
      _user_id: user.id,
      _salon_id: appointment.salon_id,
    });

    if (accessError) throw accessError;
    if (allowed !== true) return jsonResponse({ error: "forbidden" }, 403);

    if (appointment.status === "completed") {
      return jsonResponse({ error: "appointment_completed" }, 409);
    }

    if (appointment.status === "cancelled" || appointment.status === "no_show") {
      return jsonResponse({
        success: true,
        already_closed: true,
        status: appointment.status,
        refund_status: appointment.refund_status,
      });
    }

    const paidAmount = Math.max(0, Number(appointment.amount_paid || 0));
    const nowIso = new Date().toISOString();

    if (action === "no_show") {
      const { error: updateError } = await admin
        .from("appointments")
        .update({
          status: "no_show",
          cancellation_reason: reason || "No-show",
          cancellation_source: "salon",
          cancelled_at: nowIso,
          cancelled_by_user_id: user.id,
          refund_status: paidAmount > 0 ? "kept" : "not_applicable",
          refund_amount: 0,
          payment_expires_at: null,
        })
        .eq("id", appointment.id);

      if (updateError) throw updateError;

      return jsonResponse({
        success: true,
        status: "no_show",
        deposit_kept: paidAmount,
      });
    }

    let refundStatus = "not_applicable";
    let refundAmount = 0;
    let refundError: string | null = null;

    if (paidAmount > 0) {
      if (
        appointment.payment_provider === "stripe" &&
        appointment.payment_reference &&
        stripeKey
      ) {
        refundStatus = "pending";

        try {
          const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
          const session = await stripe.checkout.sessions.retrieve(
            appointment.payment_reference,
            { expand: ["payment_intent"] }
          );

          const paymentIntentId =
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent?.id;

          if (!paymentIntentId) {
            throw new Error("payment_intent_not_found");
          }

          const refund = await stripe.refunds.create({
            payment_intent: paymentIntentId,
            amount: Math.round(paidAmount * 100),
            metadata: {
              purpose: "booking_cancellation",
              appointment_id: appointment.id,
              salon_id: appointment.salon_id,
            },
          });

          refundStatus = refund.status === "succeeded" ? "refunded" : "pending";
          refundAmount = paidAmount;
        } catch (error) {
          console.error("[CANCEL-APPOINTMENT] refund failed", error);
          refundStatus = "failed";
          refundError = error instanceof Error ? error.message : "refund_failed";
        }
      } else {
        refundStatus = "failed";
        refundError = stripeKey ? "stripe_payment_reference_missing" : "stripe_not_configured";
      }
    }

    const { error: updateError } = await admin
      .from("appointments")
      .update({
        status: "cancelled",
        cancellation_reason: reason || "Annulé par le salon",
        cancellation_source: "salon",
        cancelled_at: nowIso,
        cancelled_by_user_id: user.id,
        refund_status: refundStatus,
        refund_amount: refundAmount,
        payment_status:
          refundStatus === "refunded"
            ? "refunded"
            : appointment.payment_status === "pending"
              ? "expired"
              : appointment.payment_status,
        payment_expires_at: null,
      })
      .eq("id", appointment.id);

    if (updateError) throw updateError;

    return jsonResponse(
      {
        success: true,
        status: "cancelled",
        refund_status: refundStatus,
        refund_amount: refundAmount,
        refund_error: refundError,
      },
      refundStatus === "failed" ? 207 : 200
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal_server_error";
    const status =
      message === "mfa_required" ? 403 :
      message === "auth_not_configured" || message === "mfa_check_failed" ? 503 : 500;

    console.error("[CANCEL-APPOINTMENT]", error);
    return jsonResponse(
      { error: status === 500 ? "internal_server_error" : message },
      status
    );
  }
});
