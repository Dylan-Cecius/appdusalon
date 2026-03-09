import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get all salons with reminder enabled
    const { data: salonsSettings } = await supabase
      .from('sms_settings')
      .select('salon_id, reminder_hours_before, reminder_message, twilio_account_sid, twilio_auth_token, twilio_phone_number')
      .eq('reminder_enabled', true)

    if (!salonsSettings || salonsSettings.length === 0) {
      return new Response(JSON.stringify({ message: 'No reminders configured' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    let totalSent = 0

    for (const s of salonsSettings) {
      if (!s.twilio_account_sid || !s.twilio_auth_token || !s.twilio_phone_number) continue

      const now = new Date()
      const reminderWindow = new Date(now.getTime() + s.reminder_hours_before * 60 * 60 * 1000)

      // Find appointments in the reminder window
      const { data: appointments } = await supabase
        .from('appointments')
        .select('id, client_name, client_phone, start_time, services')
        .eq('salon_id', s.salon_id)
        .eq('status', 'scheduled')
        .gte('start_time', now.toISOString())
        .lte('start_time', reminderWindow.toISOString())

      if (!appointments || appointments.length === 0) continue

      for (const appt of appointments) {
        // Check if reminder already sent
        const { count } = await supabase
          .from('sms_logs')
          .select('*', { count: 'exact', head: true })
          .eq('salon_id', s.salon_id)
          .eq('phone_number', appt.client_phone)
          .eq('type', 'reminder')
          .gte('sent_at', new Date(new Date(appt.start_time).getTime() - 48 * 60 * 60 * 1000).toISOString())

        if (count && count > 0) continue

        const startDate = new Date(appt.start_time)
        const nameParts = (appt.client_name || '').split(' ')
        const services = Array.isArray(appt.services) ? appt.services : []
        const prestationName = services.length > 0 ? (services[0] as any).name || '' : ''

        const msg = (s.reminder_message || '')
          .replace(/{prenom}/g, nameParts[0] || '')
          .replace(/{date}/g, startDate.toLocaleDateString('fr-FR'))
          .replace(/{heure}/g, startDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))
          .replace(/{prestation}/g, prestationName)

        // Send via automation function
        const auth = btoa(`${s.twilio_account_sid}:${s.twilio_auth_token}`)
        try {
          const res = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${s.twilio_account_sid}/Messages.json`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams({
                To: appt.client_phone,
                From: s.twilio_phone_number,
                Body: msg,
              }),
            }
          )
          const result = await res.json()

          await supabase.from('sms_logs').insert({
            salon_id: s.salon_id,
            phone_number: appt.client_phone,
            message: msg,
            type: 'reminder',
            status: res.ok ? 'sent' : 'failed',
            twilio_sid: result.sid || null,
          })

          if (res.ok) totalSent++
        } catch {
          // Continue with next appointment
        }
      }
    }

    return new Response(JSON.stringify({ sent: totalSent }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
