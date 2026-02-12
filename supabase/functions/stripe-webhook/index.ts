import { serve } from "std/http/server.ts"
import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const cryptoProvider = Stripe.createSubtleCryptoProvider()

serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature')

  // 1. Verify the "Secret Handshake"
  try {
    const body = await req.text()
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    
    if (!signature || !webhookSecret) {
        throw new Error("Missing signature or webhook secret")
    }

    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider
    )

    // 2. Handle the "Checkout Completed" Event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const locationId = session.metadata?.location_id // We packed this in earlier!
      
      console.log(`💰 Payment received for Location: ${locationId}`)

      if (locationId) {
        // 3. Update Supabase (Using the ADMIN Key to bypass RLS)
        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { error } = await supabaseAdmin
          .from('locations')
          .update({ 
              is_promoted: true,
              promoted_at: new Date().toISOString() // Optional: Track when they paid
          })
          .eq('id', locationId)

        if (error) {
            console.error('❌ Database update failed:', error)
            return new Response('Database Update Failed', { status: 500 })
        }
        
        console.log('✅ Venue Promoted Successfully!')
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error(`❌ Webhook Error: ${err.message}`)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }
})