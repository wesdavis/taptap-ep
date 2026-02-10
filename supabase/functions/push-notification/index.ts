// supabase/functions/push-notification/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID')!
const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

Deno.serve(async (req) => {
  try {
    const { record } = await req.json()

    // 1. Get Sender Name
    const { data: sender } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', record.from_user_id)
      .single()

    // 2. Get Receiver Device ID
    const { data: receiver } = await supabase
      .from('profiles')
      .select('onesignal_id')
      .eq('id', record.to_user_id)
      .single()

    if (!receiver?.onesignal_id) {
      return new Response("User has no device registered", { status: 200 })
    }

    // 3. Send Clean Notification
    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": `Basic ${ONESIGNAL_REST_API_KEY}`
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_player_ids: [receiver.onesignal_id],
        headings: { en: "Someone Tapped You!" },
        // 🟢 CLEAN: No random numbers here anymore
        contents: { en: `${sender?.display_name || 'Someone'} is waiting for you...` },
        // 🟢 HIDDEN MAGIC: This timestamp forces OneSignal to treat it as new
        data: { 
            ping_id: record.id,
            timestamp: Date.now() 
        }, 
      })
    })

    const result = await response.json()
    return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})