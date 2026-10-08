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

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  try {
    const { admin, user } = await getAuthenticatedUser(req);
    const { salonId } = await resolveSalonAndCheckEntitlement(admin, user, "marketing");

    const {
      message,
      recipient_type,
      inactive_months,
      campaign_name,
    } = await req.json();

    const cleanMessage = String(message || "").trim();
    const cleanName = String(campaign_name || "").trim();
    const recipientType = recipient_type === "inactive" ? "inactive" : "all";

    if (!cleanMessage || !cleanName) {
      return jsonResponse({ error: "validation_error" }, 400);
    }

    if (cleanMessage.length > 1000 || cleanName.length > 120) {
      return jsonResponse({ error: "input_too_long" }, 400);
    }

    let query = admin
      .from("clients")
      .select("id, name, phone")
      .eq("salon_id", salonId)
      .neq("sms_opt_out", true)
      .not("phone", "is", null);

    if (recipientType === "inactive") {
      const months = Math.min(Math.max(Number(inactive_months) || 3, 1), 24);
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - months);

      const { data: activeClientIds } = await admin
        .from("transactions")
        .select("client_id")
        .eq("salon_id", salonId)
        .gte("transaction_date", cutoffDate.toISOString());

      const activeIds = [
        ...new Set((activeClientIds || []).map((row) => row.client_id).filter(Boolean)),
      ];

      if (activeIds.length > 0) {
        query = query.not("id", "in", `(${activeIds.join(",")})`);
      }
    }

    const { data: clients, error: clientsError } = await query;
    if (clientsError) throw clientsError;

    if (!clients || clients.length === 0) {
      return jsonResponse({ sent: 0, failed: 0, error: "no_recipients" });
    }

    const { data: campaignRecord, error: campaignError } = await admin
      .from("sms_campaigns")
      .insert({
        salon_id: salonId,
        name: cleanName,
        message: cleanMessage,
        recipient_type: recipientType,
        inactive_months: recipientType === "inactive" ? Number(inactive_months) || 3 : null,
        recipients_count: clients.length,
      })
      .select("id")
      .single();

    if (campaignError) throw campaignError;

    let sent = 0;
    let failed = 0;

    for (const client of clients) {
      const nameParts = String(client.name || "").split(" ");
      const personalizedMessage = cleanMessage
        .replace(/{prenom}/g, nameParts[0] || "")
        .replace(/{nom}/g, nameParts.slice(1).join(" ") || "");

      try {
        const result = await sendSms(client.phone, personalizedMessage);

        await admin.from("sms_logs").insert({
          salon_id: salonId,
          client_id: client.id,
          phone_number: client.phone,
          message: personalizedMessage,
          type: "campaign",
          campaign_id: campaignRecord.id,
          status: result.ok ? "sent" : "failed",
          twilio_sid: result.sid,
        });

        if (result.ok) sent += 1;
        else failed += 1;
      } catch (error) {
        console.error("[SMS-CAMPAIGN] send failed", error);
        failed += 1;
      }
    }

    return jsonResponse({ sent, failed });
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal_error";
    const status =
      message === "not_authenticated" ? 401 :
      message === "subscription_required" || message === "upgrade_required" ? 403 :
      message === "salon_not_found" ? 404 :
      message === "sms_provider_not_configured" ? 503 : 500;

    console.error("[SMS-CAMPAIGN]", error);
    return jsonResponse({ error: message }, status);
  }
});
