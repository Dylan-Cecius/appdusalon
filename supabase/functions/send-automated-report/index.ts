import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

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
const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const resend = new Resend(resendApiKey);

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reportId, isTest = false }: ReportRequest = await req.json();

    console.log(`Processing ${isTest ? 'test ' : ''}report:`, reportId);

    // Récupérer la configuration du rapport
    const { data: reportConfig, error: reportError } = await supabase
      .from('automated_reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (reportError || !reportConfig) {
      throw new Error('Configuration de rapport introuvable');
    }

    console.log('Report config:', reportConfig);

    // Récupérer les données du salon
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('salon_name')
      .eq('id', reportConfig.user_id)
      .single();

    const salonName = profile?.salon_name || 'Salon';

    // Générer le contenu du rapport selon les types sélectionnés
    let reportContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
          ${reportConfig.report_name} - ${salonName}
        </h1>
        ${isTest ? '<div style="background-color: #fff3cd; color: #856404; padding: 10px; border-radius: 5px; margin-bottom: 20px;"><strong>⚠️ Ceci est un rapport de test</strong></div>' : ''}
    `;

    // Données de revenus
    if (reportConfig.report_types.includes('revenue')) {
      const endDate = new Date();
      const startDate = new Date();
      
      if (reportConfig.frequency === 'daily') {
        startDate.setDate(endDate.getDate() - 1);
      } else if (reportConfig.frequency === 'weekly') {
        startDate.setDate(endDate.getDate() - 7);
      } else {
        startDate.setMonth(endDate.getMonth() - 1);
      }

      const { data: transactions } = await supabase
        .from('transactions')
        .select('total_amount, transaction_date')
        .eq('user_id', reportConfig.user_id)
        .gte('transaction_date', startDate.toISOString())
        .lte('transaction_date', endDate.toISOString());

      const totalRevenue = transactions?.reduce((sum, t) => sum + Number(t.total_amount), 0) || 0;
      const transactionCount = transactions?.length || 0;

      reportContent += `
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <h2 style="color: #495057; margin-top: 0;">💰 Revenus</h2>
          <p><strong>Chiffre d'affaires total:</strong> ${totalRevenue.toFixed(2)} €</p>
          <p><strong>Nombre de transactions:</strong> ${transactionCount}</p>
          <p><strong>Ticket moyen:</strong> ${transactionCount > 0 ? (totalRevenue / transactionCount).toFixed(2) : '0.00'} €</p>
        </div>
      `;
    }

    // Données de rendez-vous
    if (reportConfig.report_types.includes('appointments')) {
      const endDate = new Date();
      const startDate = new Date();
      
      if (reportConfig.frequency === 'daily') {
        startDate.setDate(endDate.getDate() - 1);
      } else if (reportConfig.frequency === 'weekly') {
        startDate.setDate(endDate.getDate() - 7);
      } else {
        startDate.setMonth(endDate.getMonth() - 1);
      }

      const { data: appointments } = await supabase
        .from('appointments')
        .select('id, status, total_price, start_time')
        .eq('user_id', reportConfig.user_id)
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString());

      const totalAppointments = appointments?.length || 0;
      const completedAppointments = appointments?.filter(a => a.status === 'completed').length || 0;
      const cancelledAppointments = appointments?.filter(a => a.status === 'cancelled').length || 0;

      reportContent += `
        <div style="background-color: #e7f3ff; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <h2 style="color: #0066cc; margin-top: 0;">📅 Rendez-vous</h2>
          <p><strong>Total des rendez-vous:</strong> ${totalAppointments}</p>
          <p><strong>Terminés:</strong> ${completedAppointments}</p>
          <p><strong>Annulés:</strong> ${cancelledAppointments}</p>
          <p><strong>Taux de réalisation:</strong> ${totalAppointments > 0 ? ((completedAppointments / totalAppointments) * 100).toFixed(1) : '0'}%</p>
        </div>
      `;
    }

    // Données clients
    if (reportConfig.report_types.includes('clients')) {
      const endDate = new Date();
      const startDate = new Date();
      
      if (reportConfig.frequency === 'daily') {
        startDate.setDate(endDate.getDate() - 1);
      } else if (reportConfig.frequency === 'weekly') {
        startDate.setDate(endDate.getDate() - 7);
      } else {
        startDate.setMonth(endDate.getMonth() - 1);
      }

      const { data: appointments } = await supabase
        .from('appointments')
        .select('client_name, client_phone')
        .eq('user_id', reportConfig.user_id)
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString());

      const uniqueClients = new Set(appointments?.map(a => `${a.client_name}-${a.client_phone}`)).size;

      reportContent += `
        <div style="background-color: #f0fff0; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <h2 style="color: #006600; margin-top: 0;">👥 Clients</h2>
          <p><strong>Clients uniques servis:</strong> ${uniqueClients}</p>
          <p><strong>Rendez-vous par client (moyenne):</strong> ${uniqueClients > 0 ? ((appointments?.length || 0) / uniqueClients).toFixed(1) : '0'}</p>
        </div>
      `;
    }

    reportContent += `
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; text-align: center; color: #6c757d; font-size: 12px;">
          <p>Ce rapport a été généré automatiquement le ${new Date().toLocaleString('fr-FR')}</p>
          <p>SalonPOS - Gestion de salon de coiffure</p>
        </div>
      </div>
    `;

    // Envoyer l'email à tous les destinataires
    const emailPromises = reportConfig.recipient_emails.map(async (email: string) => {
      return resend.emails.send({
        from: `${salonName} <onboarding@resend.dev>`,
        to: [email],
        subject: `${isTest ? '[TEST] ' : ''}${reportConfig.report_name} - ${salonName}`,
        html: reportContent,
      });
    });

    const results = await Promise.allSettled(emailPromises);
    console.log('Email results:', results);

    // Mettre à jour la date d'envoi si ce n'est pas un test
    if (!isTest) {
      const { error: updateError } = await supabase
        .from('automated_reports')
        .update({ 
          last_sent_at: new Date().toISOString()
        })
        .eq('id', reportId);

      if (updateError) {
        console.error('Error updating last_sent_at:', updateError);
      }
    }

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const errorCount = results.filter(r => r.status === 'rejected').length;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Rapport envoyé avec succès à ${successCount} destinataire(s)${errorCount > 0 ? ` (${errorCount} erreur(s))` : ''}`,
        emailsSent: successCount,
        emailsError: errorCount,
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
    console.error("Error sending automated report:", error);
    
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