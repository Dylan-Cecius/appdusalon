import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import { isTrustedAppOrigin, resolveAppOrigin } from "../_shared/app-origin.ts";

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
    return jsonResponse({ error: "origin_not_allowed" }, 403);
  }

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!stripeKey || !supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "payment_not_configured" }, 503);
    }

    const { appointment_id } = await req.json();
    const appointmentId = String(appointment_id || "").trim();

    if (!appointmentId) {
      return jsonResponse({ error: "appointment_id_required" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { error: expiryError } = await admin.rpc("expire_pending_booking_payments");
    if (expiryError) throw expiryError;

    const { data: appointment, error: appointmentError } = await admin
      .from("appointments")
      .select(
        "id, salon_id, status, payment_status, deposit_required, total_price, payment_expires_at, payment_reference"
      )
      .eq("id", appointmentId)
      .maybeSingle();

    if (appointmentError) throw appointmentError;
    if (!appointment) return jsonResponse({ error: "appointment_not_found" }, 404);

    if (
      appointment.status !== "pending_payment" ||
      appointment.payment_status !== "pending"
    ) {
      return jsonResponse({ error: "appointment_not_payable" }, 409);
    }

    const paymentExpiresAt = appointment.payment_expires_at
      ? new Date(appointment.payment_expires_at)
      : null;

    if (!paymentExpiresAt || paymentExpiresAt.getTime() <= Date.now()) {
      await admin
        .from("appointments")
        .update({ status: "cancelled", payment_status: "expired" })
        .eq("id", appointment.id)
        .eq("status", "pending_payment");

      return jsonResponse({ error: "payment_hold_expired" }, 410);
    }

    const amount = Number(appointment.deposit_required || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return jsonResponse({ error: "payment_not_required" }, 409);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    if (appointment.payment_reference) {
      try {
        const existingSession = await stripe.checkout.sessions.retrieve(
          appointment.payment_reference
        );

        if (existingSession.status === "open" && existingSession.url) {
          return jsonResponse({
            url: existingSession.url,
            session_id: existingSession.id,
            expires_at: existingSession.expires_at,
          });
        }
      } catch (error) {
        console.warn("[BOOKING-PAYMENT] previous Stripe session unavailable", error);
      }
    }

    const { data: salon, error: salonError } = await admin
      .from("salons")
      .select("slug, name")
      .eq("id", appointment.salon_id)
      .maybeSingle();

    if (salonError) throw salonError;
    if (!salon?.slug) return jsonResponse({ error: "salon_not_found" }, 404);

    const origin = resolveAppOrigin(req);
    const bookingPath = `/booking/${encodeURIComponent(salon.slug)}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: Math.round(amount * 100),
            product_data: {
              name: `Réservation - ${salon.name || "Salon"}`,
              description:
                amount >= Number(appointment.total_price || 0)
                  ? "Paiement de la réservation"
                  : "Acompte de réservation",
            },
          },
        },
      ],
      metadata: {
        purpose: "booking_payment",
        appointment_id: appointment.id,
        salon_id: appointment.salon_id,
      },
      payment_intent_data: {
        metadata: {
          purpose: "booking_payment",
          appointment_id: appointment.id,
          salon_id: appointment.salon_id,
        },
      },
      expires_at: Math.floor(paymentExpiresAt.getTime() / 1000),
      success_url:
        `${origin}${bookingPath}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${bookingPath}?payment=cancelled`,
    });

    if (!session.url) {
      throw new Error("stripe_checkout_url_missing");
    }

    const { error: updateError } = await admin
      .from("appointments")
      .update({
        payment_provider: "stripe",
        payment_reference: session.id,
      })
      .eq("id", appointment.id)
      .eq("status", "pending_payment");

    if (updateError) throw updateError;

    return jsonResponse({
      url: session.url,
      session_id: session.id,
      expires_at: session.expires_at,
      amount,
    });
  } catch (error) {
    console.error("[BOOKING-PAYMENT]", error);
    return jsonResponse({ error: "internal_server_error" }, 500);
  }
});
