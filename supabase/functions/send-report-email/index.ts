import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReportEmailRequest {
  to: string;
  subject: string;
  content: string;
  reportType: 'daily' | 'weekly' | 'monthly';
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const { to, subject, content, reportType }: ReportEmailRequest = await req.json();

    if (!to || !subject || !content || !reportType) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject, content, reportType" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Convert plain text content to HTML with proper formatting
    const htmlContent = content
      .replace(/\n/g, '<br>')
      .replace(/📊 RAPPORT ([A-Z\s\-À-ÿ]+)/g, '<h2 style="color: #2563eb; margin: 20px 0 15px 0;">📊 $1</h2>')
      .replace(/💰 CHIFFRE D'AFFAIRES/g, '<h3 style="color: #059669; margin: 15px 0 10px 0;">💰 CHIFFRE D\'AFFAIRES</h3>')
      .replace(/👥 CLIENTS/g, '<h3 style="color: #7c3aed; margin: 15px 0 10px 0;">👥 CLIENTS</h3>')
      .replace(/💳 MÉTHODES DE PAIEMENT/g, '<h3 style="color: #dc2626; margin: 15px 0 10px 0;">💳 MÉTHODES DE PAIEMENT</h3>')
      .replace(/📝 NOTES :/g, '<h3 style="color: #ea580c; margin: 15px 0 10px 0;">📝 NOTES :</h3>')
      .replace(/• /g, '&bull; ')
      .replace(/---/g, '<hr style="margin: 20px 0; border: none; border-top: 2px solid #e5e7eb;">');

    const fullHtmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${subject}</title>
    </head>
    <body style="
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
      line-height: 1.6;
      color: #374151;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f9fafb;
    ">
      <div style="
        background-color: white;
        border-radius: 8px;
        padding: 30px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      ">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1f2937; margin: 0;">SalonPOS</h1>
          <p style="color: #6b7280; margin: 5px 0 0 0;">Système de gestion pour salon de coiffure</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          ${htmlContent}
        </div>
        
        <div style="
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
        ">
          <p style="
            color: #9ca3af;
            font-size: 14px;
            margin: 0;
          ">
            Ce rapport a été généré automatiquement par SalonPOS
          </p>
        </div>
      </div>
    </body>
    </html>
    `;

    console.log(`Sending ${reportType} report email to: ${to}`);

    const emailResponse = await resend.emails.send({
      from: "SalonPOS <onboarding@resend.dev>",
      to: [to],
      subject: subject,
      html: fullHtmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      messageId: emailResponse.data?.id,
      message: "Rapport envoyé avec succès"
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in send-report-email function:", error);
    
    // Handle specific Resend errors
    let errorMessage = "Erreur lors de l'envoi de l'email";
    if (error.message?.includes("API key")) {
      errorMessage = "Clé API Resend invalide";
    } else if (error.message?.includes("domain")) {
      errorMessage = "Domaine email non validé sur Resend";
    } else if (error.message?.includes("rate limit")) {
      errorMessage = "Limite d'envoi atteinte, veuillez réessayer plus tard";
    }

    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: error.message 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);