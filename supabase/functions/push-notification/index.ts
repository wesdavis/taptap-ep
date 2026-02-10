// supabase/functions/push-notification/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// 1. Get our secrets
const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID')!
const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// 2. Initialize Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

serve(async (req) => {
  try {
    // 3. Get the "Ping" record that triggered this
    const { record } = await req.json()
    
    // 4. Get the Sender's Name (Who tapped?)
    const { data: sender } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', record.from_user_id)
      .single()

    // 5. Get the Receiver's OneSignal ID (Who gets the buzz?)
    const { data: receiver } = await supabase
      .from('profiles')
      .select('onesignal_id')
      .eq('id', record.to_user_id)
      .single()

    // Safety Check: If user has no phone registered, stop here.
    if (!receiver?.onesignal_id) {
      console.log("User has no device registered.")
      return new Response("User has no device registered", { status: 200 })
    }

    // 6. Send to OneSignal API
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
        contents: { en: `${sender?.display_name || 'Someone'} is waiting for you...` },
        data: { ping_id: record.id }, // Send data so the app knows what ping this is
      })
    })

    const result = await response.json()
    return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } })

  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})