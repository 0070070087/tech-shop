import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!stripeKey || !webhookSecret || !supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Webhook is not set up." }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  // Stripe signs every message. Anything without a valid signature is rejected.
  const rawBody = await req.text();
  const stripe = new Stripe(stripeKey);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = Number(session.metadata?.order_id);

    if (orderId && session.payment_status === "paid") {
      const { data: order } = await supabase
        .from("orders")
        .select("total")
        .eq("id", orderId)
        .single();

      // Only mark paid when the amount Stripe charged matches the order total.
      if (order && session.amount_total === Math.round(Number(order.total) * 100)) {
        const { error } = await supabase
          .from("orders")
          .update({ status: "paid" })
          .eq("id", orderId)
          .eq("status", "pending");
        if (error) {
          return NextResponse.json({ error: "Could not update order." }, { status: 500 });
        }
      } else {
        console.error("Amount mismatch or order missing for order", orderId);
      }
    }
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = Number(session.metadata?.order_id);

    if (orderId) {
      // The customer may have opened a newer payment page for the same order.
      // Only cancel when no other payment page for it is still open.
      const open = await stripe.checkout.sessions.list({ status: "open", limit: 100 });
      const stillOpen = open.data.some(
        (s) => s.metadata?.order_id === String(orderId)
      );
      if (!stillOpen) {
        const { error } = await supabase.rpc("cancel_unpaid_order", {
          p_order_id: orderId,
        });
        if (error) {
          return NextResponse.json({ error: "Could not cancel order." }, { status: 500 });
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
