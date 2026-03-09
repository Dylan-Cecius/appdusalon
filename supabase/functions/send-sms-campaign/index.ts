import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const { salon_id, message, recipient_type, inactive_months, campaign_name } = await req.json()
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get Twilio credentials
    const { data: settings } = await supabase
      .from('sms_settings')
      .select('twilio_account_sid, twilio_auth_token, twilio_phone_number')
      .eq('salon_id', salon_id)
      .single()

    if (!settings?.twilio_account_sid || !settings?.twilio_auth_token || !settings?.twilio_phone_number) {
      return new Response(JSON.stringify({ error: 'Twilio non configuré' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Get clients
    let query = supabase
      .from('clients')
      .select('id, name, phone')
      .eq('salon_id', salon_id)
      .neq('sms_opt_out', true)
      .not('phone', 'is', null)

    if (recipient_type === 'inactive' && inactive_months) {
      const cutoffDate = new Date()
      cutoffDate.setMonth(cutoffDate.getMonth() - inactive_months)
      // Get clients whose last transaction is before cutoff
      const { data: activeClientIds } = await supabase
        .from('transactions')
        .select('client_id')
        .eq('salon_id', salon_id)
        .gte('transaction_date', cutoffDate.toISOString())
      
      const activeIds = [...new Set((activeClientIds || []).map(t => t.client_id).filter(Boolean))]
      if (activeIds.length > 0) {
        query = query.not('id', 'in', `(${activeIds.join(',')})`)
      }
    }

    const { data: clients } = await query
    if (!clients || clients.length === 0) {
      return new Response(JSON.stringify({ sent: 0, failed: 0, error: 'Aucun client trouvé' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Create campaign record
    const { data: campaign } = await supabase.from('sms_campaigns').insert({
      salon_id,
      name: campaign_name,
      message,
      recipient_type,
      inactive_months: recipient_type === 'inactive' ? inactive_months : null,
      recipients_count: clients.length,
    }).select('id').single()

    let sent = 0, failed = 0
    const auth = btoa(`${settings.twilio_account_sid}:${settings.twilio_auth_token}`)

    for (const client of clients) {
      const nameParts = (client.name || '').split(' ')
      const personalizedMsg = message
        .replace(/{prenom}/g, nameParts[0] || '')
        .replace(/{nom}/g, nameParts.slice(1).join(' ') || '')

      try {
        const res = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${settings.twilio_account_sid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              To: client.phone,
              From: settings.twilio_phone_number,
              Body: personalizedMsg,
            }),
          }
        )
        const result = await res.json()

        await supabase.from('sms_logs').insert({
          salon_id,
          client_id: client.id,
          phone_number: client.phone,
          message: personalizedMsg,
          type: 'campaign',
          campaign_id: campaign?.id,
          status: res.ok ? 'sent' : 'failed',
          twilio_sid: result.sid || null,
        })

        if (res.ok) sent++; else failed++
      } catch {
        failed++
      }
    }

    return new Response(JSON.stringify({ sent, failed }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
