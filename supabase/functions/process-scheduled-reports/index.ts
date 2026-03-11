import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth: require CRON secret — this endpoint is only for the scheduler
    const cronSecret = Deno.env.get("CRON_SECRET");
    const cronHeader = req.headers.get("x-cron-secret");

    if (!cronSecret || !cronHeader || cronHeader !== cronSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const { data: reportsToSend, error: reportsError } = await supabase
      .from("automated_reports")
      .select("*")
      .eq("is_active", true)
      .lte("next_send_at", now.toISOString());

    if (reportsError) throw reportsError;

    if (!reportsToSend || reportsToSend.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No reports to send at this time", processedReports: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const results = await Promise.allSettled(
      reportsToSend.map(async (report) => {
        try {
          const { data, error } = await supabase.functions.invoke("send-automated-report", {
            body: { reportId: report.id, isTest: false },
            headers: { "x-cron-secret": cronSecret },
          });
          if (error) throw error;
          return { reportId: report.id, success: true, data };
        } catch (error) {
          console.error(`Error processing report ${report.id}:`, error);
          return { reportId: report.id, success: false };
        }
      })
    );

    // Update next send dates
    await Promise.allSettled(
      reportsToSend.map(async (report) => {
        try {
          const { data: nextDate, error: calcError } = await supabase.rpc("calculate_next_send_date", {
            frequency_type: report.frequency,
            time_of_day: report.time_of_day,
            day_of_week: report.day_of_week,
            day_of_month: report.day_of_month,
          });
          if (calcError) throw calcError;
          await supabase
            .from("automated_reports")
            .update({ next_send_at: nextDate, updated_at: new Date().toISOString() })
            .eq("id", report.id);
        } catch (error) {
          console.error(`Error updating next send date for report ${report.id}:`, error);
        }
      })
    );

    const successCount = results.filter((r) => r.status === "fulfilled" && r.value.success).length;
    const errorCount = results.length - successCount;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${reportsToSend.length} scheduled reports`,
        processedReports: reportsToSend.length,
        successCount,
        errorCount,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error processing scheduled reports:", error);
    return new Response(
      JSON.stringify({ error: "An internal error occurred", success: false }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
