import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_BOOKING_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!stripeKey || !webhookSecret || !supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "webhook_not_configured" }, 503);
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return jsonResponse({ error: "missing_signature" }, 400);
  }

  try {
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const cryptoProvider = Stripe.createSubtleCryptoProvider();

    const event = await stripe.webhooks.constructEventAsync(
      await req.text(),
      signature,
      webhookSecret,
      undefined,
      cryptoProvider
    );

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const session = event.data.object as Stripe.Checkout.Session;

      if (
        session.metadata?.purpose !== "booking_payment" ||
        !session.metadata?.appointment_id
      ) {
        return jsonResponse({ received: true, ignored: true });
      }

      if (session.payment_status !== "paid") {
        return jsonResponse({ received: true, ignored: true });
      }

      const appointmentId = session.metadata.appointment_id;
      const { data: appointment, error: appointmentError } = await admin
        .from("appointments")
        .select("id, status, payment_status, total_price, deposit_required")
        .eq("id", appointmentId)
        .maybeSingle();

      if (appointmentError) throw appointmentError;
      if (!appointment) return jsonResponse({ received: true, ignored: true });

      if (
        appointment.status === "scheduled" &&
        ["deposit_paid", "paid"].includes(appointment.payment_status)
      ) {
        return jsonResponse({ received: true, duplicate: true });
      }

      if (appointment.status !== "pending_payment") {
        return jsonResponse({ received: true, ignored: true });
      }

      const amountPaid = Number(session.amount_total || 0) / 100;
      const totalPrice = Number(appointment.total_price || 0);
      const isFullyPaid = amountPaid + 0.001 >= totalPrice;

      const { error: updateError } = await admin
        .from("appointments")
        .update({
          status: "scheduled",
          payment_status: isFullyPaid ? "paid" : "deposit_paid",
          amount_paid: amountPaid,
          is_paid: isFullyPaid,
          payment_provider: "stripe",
          payment_reference: session.id,
          payment_completed_at: new Date().toISOString(),
          payment_expires_at: null,
        })
        .eq("id", appointment.id)
        .eq("status", "pending_payment");

      if (updateError) throw updateError;
    }

    if (
      event.type === "checkout.session.expired" ||
      event.type === "checkout.session.async_payment_failed"
    ) {
      const session = event.data.object as Stripe.Checkout.Session;

      if (
        session.metadata?.purpose === "booking_payment" &&
        session.metadata?.appointment_id
      ) {
        const { error: updateError } = await admin
          .from("appointments")
          .update({
            status: "cancelled",
            payment_status: "expired",
            payment_reference: session.id,
          })
          .eq("id", session.metadata.appointment_id)
          .eq("status", "pending_payment");

        if (updateError) throw updateError;
      }
    }

    return jsonResponse({ received: true });
  } catch (error) {
    console.error("[BOOKING-PAYMENT-WEBHOOK]", error);
    return jsonResponse({ error: "invalid_webhook" }, 400);
  }
});
