import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const { salon_id } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: settings } = await supabase
      .from('sms_settings')
      .select('twilio_account_sid, twilio_auth_token, twilio_phone_number')
      .eq('salon_id', salon_id)
      .single()

    if (!settings?.twilio_account_sid || !settings?.twilio_phone_number) {
      return new Response(JSON.stringify({ success: false, error: 'Twilio non configuré' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const auth = btoa(`${settings.twilio_account_sid}:${settings.twilio_auth_token}`)
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${settings.twilio_account_sid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: settings.twilio_phone_number,
          From: settings.twilio_phone_number,
          Body: "Test SMS depuis L'app du salon ✅",
        }),
      }
    )
    const result = await res.json()

    return new Response(JSON.stringify({ success: res.ok, error: res.ok ? undefined : result.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
