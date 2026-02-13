import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// Initialize Stripe
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

// Initialize Crypto Provider for Webhook Verification
const cryptoProvider = Stripe.createSubtleCryptoProvider();

console.log("🚀 Stripe Webhook Function Started");

Deno.serve(async (req) => {
  // 1. Verify the "Secret Handshake"
  const signature = req.headers.get("Stripe-Signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!signature || !webhookSecret) {
    console.error("❌ Missing signature or webhook secret");
    return new Response("Missing signature or webhook secret", { status: 400 });
  }

  try {
    // 2. Read the body text efficiently
    const body = await req.text();

    // 3. Verify the event came from Stripe
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider
    );

    // 4. Handle "Checkout Completed"
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const locationId = session.metadata?.location_id;
      
      console.log(`💰 Payment received for Location ID: ${locationId}`);

      if (locationId) {
        // Initialize Supabase Admin Client
        const supabaseAdmin = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // Update the Database
        const { error } = await supabaseAdmin
          .from("locations")
          .update({
            is_promoted: true,
            promoted_at: new Date().toISOString(),
          })
          .eq("id", locationId);

        if (error) {
          console.error("❌ Database update failed:", error);
          return new Response("Database Update Failed", { status: 500 });
        }

        console.log("✅ Venue Promoted Successfully!");
      }
    }

    // 5. Respond to Stripe (200 OK)
    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err) {
    console.error(`❌ Webhook Error: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }
});