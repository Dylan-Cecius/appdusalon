import { isTrustedAppOrigin } from "../_shared/app-origin.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { hasReportAccess } from "../_shared/report-access.ts";
import { requireMfaAssurance } from "../_shared/mfa.ts";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReportRequest {
  reportId: string;
  isTest?: boolean;
}

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resendApiKey = Deno.env.get("RESEND_API_KEY");
const reportFromEmail =
  Deno.env.get("REPORT_FROM_EMAIL") || "L'App du Salon <onboarding@resend.dev>";

const handler = async (req: Request): Promise<Response> => {
  if (!isTrustedAppOrigin(req)) {
    return new Response(JSON.stringify({ error: "origin_not_allowed" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth: either a valid user JWT or a CRON secret
    const cronSecret = Deno.env.get("CRON_SECRET");
    const cronHeader = req.headers.get("x-cron-secret");
    let callerUserId: string | null = null;

    if (cronHeader && cronSecret && cronHeader === cronSecret) {
      // Called by scheduler — trusted
    } else {
      // Must be an authenticated user
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const anonClient = createClient(
        supabaseUrl,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
      if (claimsError || !claimsData?.claims) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await requireMfaAssurance(req);
      callerUserId = claimsData.claims.sub as string;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    const { reportId, isTest = false }: ReportRequest = await req.json();

    // Fetch report config
    const { data: reportConfig, error: reportError } = await supabase
      .from("automated_reports")
      .select("*")
      .eq("id", reportId)
      .single();

    if (reportError || !reportConfig) {
      return new Response(
        JSON.stringify({ error: "Report not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If called by a user, verify they own the report
    if (callerUserId && reportConfig.user_id !== callerUserId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!(await hasReportAccess(supabase, reportConfig.user_id))) {
      return new Response(JSON.stringify({ error: "Subscription required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: salonId, error: salonIdError } = await supabase.rpc(
      "get_user_salon_id",
      { _user_id: reportConfig.user_id },
    );

    if (salonIdError || !salonId) {
      return new Response(JSON.stringify({ error: "Salon not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: salon } = await supabase
      .from("salons")
      .select("name")
      .eq("id", salonId)
      .maybeSingle();

    const salonName = salon?.name || "Salon";
    const safeSalonName = escapeHtml(salonName);
    const safeReportName = escapeHtml(String(reportConfig.report_name || "Rapport"));

    // Build report content
    let reportContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
          ${safeReportName} - ${safeSalonName}
        </h1>
        ${isTest ? '<div style="background-color: #fff3cd; color: #856404; padding: 10px; border-radius: 5px; margin-bottom: 20px;"><strong>⚠️ Ceci est un rapport de test</strong></div>' : ""}
    `;

    const getDateRange = (frequency: string) => {
      const endDate = new Date();
      const startDate = new Date();
      if (frequency === "daily") startDate.setDate(endDate.getDate() - 1);
      else if (frequency === "weekly") startDate.setDate(endDate.getDate() - 7);
      else startDate.setMonth(endDate.getMonth() - 1);
      return { startDate, endDate };
    };

    if (reportConfig.report_types.includes("revenue")) {
      const { startDate, endDate } = getDateRange(reportConfig.frequency);
      const { data: transactions } = await supabase
        .from("transactions")
        .select("total_amount, transaction_date")
        .eq("salon_id", salonId)
        .gte("transaction_date", startDate.toISOString())
        .lte("transaction_date", endDate.toISOString());

      const totalRevenue = transactions?.reduce((sum, t) => sum + Number(t.total_amount), 0) || 0;
      const transactionCount = transactions?.length || 0;

      reportContent += `
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <h2 style="color: #495057; margin-top: 0;">💰 Revenus</h2>
          <p><strong>Chiffre d'affaires total:</strong> ${totalRevenue.toFixed(2)} €</p>
          <p><strong>Nombre de transactions:</strong> ${transactionCount}</p>
          <p><strong>Ticket moyen:</strong> ${transactionCount > 0 ? (totalRevenue / transactionCount).toFixed(2) : "0.00"} €</p>
        </div>
      `;
    }

    if (reportConfig.report_types.includes("appointments")) {
      const { startDate, endDate } = getDateRange(reportConfig.frequency);
      const { data: appointments } = await supabase
        .from("appointments")
        .select("id, status, total_price, start_time")
        .eq("salon_id", salonId)
        .gte("start_time", startDate.toISOString())
        .lte("start_time", endDate.toISOString());

      const totalAppointments = appointments?.length || 0;
      const completedAppointments = appointments?.filter((a) => a.status === "completed").length || 0;
      const cancelledAppointments = appointments?.filter((a) => a.status === "cancelled").length || 0;

      reportContent += `
        <div style="background-color: #e7f3ff; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <h2 style="color: #0066cc; margin-top: 0;">📅 Rendez-vous</h2>
          <p><strong>Total des rendez-vous:</strong> ${totalAppointments}</p>
          <p><strong>Terminés:</strong> ${completedAppointments}</p>
          <p><strong>Annulés:</strong> ${cancelledAppointments}</p>
          <p><strong>Taux de réalisation:</strong> ${totalAppointments > 0 ? ((completedAppointments / totalAppointments) * 100).toFixed(1) : "0"}%</p>
        </div>
      `;
    }

    if (reportConfig.report_types.includes("clients")) {
      const { startDate, endDate } = getDateRange(reportConfig.frequency);
      const { data: appointments } = await supabase
        .from("appointments")
        .select("client_name, client_phone")
        .eq("salon_id", salonId)
        .gte("start_time", startDate.toISOString())
        .lte("start_time", endDate.toISOString());

      const uniqueClients = new Set(appointments?.map((a) => `${a.client_name}-${a.client_phone}`)).size;

      reportContent += `
        <div style="background-color: #f0fff0; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <h2 style="color: #006600; margin-top: 0;">👥 Clients</h2>
          <p><strong>Clients uniques servis:</strong> ${uniqueClients}</p>
          <p><strong>Rendez-vous par client (moyenne):</strong> ${uniqueClients > 0 ? ((appointments?.length || 0) / uniqueClients).toFixed(1) : "0"}</p>
        </div>
      `;
    }

    reportContent += `
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; text-align: center; color: #6c757d; font-size: 12px;">
          <p>Ce rapport a été généré automatiquement le ${new Intl.DateTimeFormat("fr-BE", {
            timeZone: "Europe/Brussels",
            dateStyle: "short",
            timeStyle: "short",
          }).format(new Date())}</p>
          <p>L'App du Salon - Gestion de salon de coiffure</p>
        </div>
      </div>
    `;

    const emailPromises = reportConfig.recipient_emails.map(async (email: string) => {
      return resend.emails.send({
        from: reportFromEmail,
        to: [email],
        subject: `${isTest ? "[TEST] " : ""}${reportConfig.report_name} - ${salonName}`,
        html: reportContent,
      });
    });

    const results = await Promise.allSettled(emailPromises);

    if (!isTest) {
      await supabase
        .from("automated_reports")
        .update({ last_sent_at: new Date().toISOString() })
        .eq("id", reportId);
    }

    const successCount = results.filter((r) => r.status === "fulfilled").length;
    const errorCount = results.filter((r) => r.status === "rejected").length;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Rapport envoyé avec succès à ${successCount} destinataire(s)${errorCount > 0 ? ` (${errorCount} erreur(s))` : ""}`,
        emailsSent: successCount,
        emailsError: errorCount,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    const message = error?.message || "internal_error";
    const status =
      message === "mfa_required" ? 403 :
      message === "auth_not_configured" || message === "mfa_check_failed" ? 503 : 500;

    console.error("Error sending automated report:", error);
    return new Response(
      JSON.stringify({
        error: status === 500 ? "An internal error occurred" : message,
        success: false,
      }),
      { status, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
