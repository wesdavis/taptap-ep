import { serve } from "std/http/server.ts"
import Stripe from "stripe"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. Initialize Stripe
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      console.error("❌ Missing STRIPE_SECRET_KEY");
      throw new Error("Server configuration error: Missing Stripe Key");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    // 3. Parse Request Body
    const { price_id, location_id, user_id, return_url } = await req.json()

    console.log("💰 Creating Checkout for:", { location_id, price_id });

    // 4. Create Stripe Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: price_id,
          quantity: 1,
        },
      ],
      mode: 'payment',
      // Redirect back to the app (Business Dashboard)
      success_url: `${return_url}?session_id={CHECKOUT_SESSION_ID}&location_id=${location_id}`,
      cancel_url: `${return_url}`,
      metadata: {
        location_id: location_id, // Store this so we know WHO paid
        user_id: user_id,
        type: 'venue_boost'
      },
    })

    // 5. Return the URL
    return new Response(
      JSON.stringify({ url: session.url }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      },
    )

  } catch (error) {
    console.error("❌ Payment Error:", error.message);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})