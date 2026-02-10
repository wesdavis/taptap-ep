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
    console.log("1. Received Ping Record:", record.id) // 🟢 LOG 1

    // Get Sender
    const { data: sender, error: senderError } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', record.from_user_id)
      .single()
    
    if (senderError) console.error("Sender Error:", senderError)
    console.log("2. Sender Found:", sender?.display_name) // 🟢 LOG 2

    // Get Receiver
    const { data: receiver, error: receiverError } = await supabase
      .from('profiles')
      .select('onesignal_id')
      .eq('id', record.to_user_id)
      .single()

    if (receiverError) console.error("Receiver Error:", receiverError)
    console.log("3. Receiver ID Found:", receiver?.onesignal_id) // 🟢 LOG 3

    if (!receiver?.onesignal_id) {
      console.log("❌ ABORT: Receiver has no OneSignal ID")
      return new Response("User has no device registered", { status: 200 })
    }

    // Send to OneSignal
    console.log("4. Sending to OneSignal...") 
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
        // Random number forces it to be a "Unique" message every time
        contents: { en: `${sender?.display_name || 'Someone'} is waiting... (${Math.floor(Math.random() * 1000)})` },
        data: { 
            ping_id: record.id,
            timestamp: Date.now() 
        }, 
      })
    })

    const result = await response.json()
    console.log("5. OneSignal Result:", JSON.stringify(result)) // 🟢 LOG 5 (The most important one)

    return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } })

  } catch (error: any) {
    console.error("❌ CRITICAL ERROR:", error.message)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})