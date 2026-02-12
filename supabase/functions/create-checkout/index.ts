import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno' // 🟢 UPDATED: Newer, stable version

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Handle CORS Preflight (The "OPTIONS" request)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. Initialize Stripe
    // If the key is missing, this will throw a clear error instead of crashing silently
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new Error("Missing STRIPE_SECRET_KEY environment variable");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16', // Updated API version
      httpClient: Stripe.createFetchHttpClient(),
    })

    const { price_id, location_id, user_id, return_url } = await req.json()

    // 3. Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: price_id,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${return_url}?session_id={CHECKOUT_SESSION_ID}&location_id=${location_id}`,
      cancel_url: `${return_url}`,
      metadata: {
        location_id: location_id,
        user_id: user_id,
        type: 'venue_boost'
      },
    })

    // 4. Success Response
    return new Response(
      JSON.stringify({ url: session.url }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      },
    )

  } catch (error) {
    console.error("Payment Error:", error.message); // This will show in Supabase logs
    
    // 5. Error Response (WITH CORS HEADERS)
    // Even if it crashes, we return the headers so the browser doesn't block it.
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})