import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Processing scheduled reports...');

    // Récupérer tous les rapports actifs dont l'heure d'envoi est arrivée
    const now = new Date();
    const { data: reportsToSend, error: reportsError } = await supabase
      .from('automated_reports')
      .select('*')
      .eq('is_active', true)
      .lte('next_send_at', now.toISOString());

    if (reportsError) {
      throw reportsError;
    }

    console.log(`Found ${reportsToSend?.length || 0} reports to send`);

    if (!reportsToSend || reportsToSend.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No reports to send at this time',
          processedReports: 0 
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    // Traiter chaque rapport
    const results = await Promise.allSettled(
      reportsToSend.map(async (report) => {
        console.log(`Processing report: ${report.id} - ${report.report_name}`);
        
        try {
          // Appeler la fonction d'envoi de rapport
          const { data, error } = await supabase.functions.invoke('send-automated-report', {
            body: { reportId: report.id, isTest: false }
          });

          if (error) {
            throw error;
          }

          console.log(`Successfully processed report ${report.id}`);
          return { reportId: report.id, success: true, data };
        } catch (error) {
          console.error(`Error processing report ${report.id}:`, error);
          return { 
            reportId: report.id, 
            success: false, 
            error: error instanceof Error ? error.message : String(error)
          };
        }
      })
    );

    // Calculer et mettre à jour les prochaines dates d'envoi pour les rapports traités
    const updatePromises = reportsToSend.map(async (report) => {
      try {
        // Recalculer la prochaine date d'envoi
        const { data: nextDate, error: calcError } = await supabase
          .rpc('calculate_next_send_date', {
            frequency_type: report.frequency,
            time_of_day: report.time_of_day,
            day_of_week: report.day_of_week,
            day_of_month: report.day_of_month
          });

        if (calcError) {
          throw calcError;
        }

        // Mettre à jour la date de prochain envoi
        const { error: updateError } = await supabase
          .from('automated_reports')
          .update({ 
            next_send_at: nextDate,
            updated_at: new Date().toISOString()
          })
          .eq('id', report.id);

        if (updateError) {
          throw updateError;
        }

        console.log(`Updated next send date for report ${report.id}: ${nextDate}`);
      } catch (error) {
        console.error(`Error updating next send date for report ${report.id}:`, error);
      }
    });

    await Promise.allSettled(updatePromises);

    const successCount = results.filter(r => 
      r.status === 'fulfilled' && r.value.success
    ).length;
    
    const errorCount = results.filter(r => 
      r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)
    ).length;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${reportsToSend.length} scheduled reports`,
        processedReports: reportsToSend.length,
        successCount,
        errorCount,
        results: results.map(r => r.status === 'fulfilled' ? r.value : { error: 'Promise rejected' })
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error("Error processing scheduled reports:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);