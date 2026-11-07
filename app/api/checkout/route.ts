import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

type Item = { name: string; unit_price: number | string; quantity: number };

export async function POST(req: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return NextResponse.json({ error: "Payments are not set up yet." }, { status: 500 });
  }

  const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const orderId = Number(body.orderId);
  if (!orderId) {
    return NextResponse.json({ error: "Missing order." }, { status: 400 });
  }

  // Talk to Supabase as the logged-in customer, so they can only see their own orders.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: "Bearer " + token } },
      auth: { persistSession: false },
    }
  );

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  }
  const user = userData.user;

  const { data: order } = await supabase
    .from("orders")
    .select("id, user_id, status, order_items(name, unit_price, quantity)")
    .eq("id", orderId)
    .single();

  if (!order || order.user_id !== user.id) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }
  if (order.status !== "pending") {
    return NextResponse.json(
      { error: "This order is not waiting for payment." },
      { status: 400 }
    );
  }

  const items = (order.order_items ?? []) as Item[];
  if (items.length === 0) {
    return NextResponse.json({ error: "This order has no items." }, { status: 400 });
  }

  const stripe = new Stripe(secret);
  const origin = req.headers.get("origin") ?? new URL(req.url).origin;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      // Prices come from the database, never from the browser.
      line_items: items.map((it) => ({
        quantity: it.quantity,
        price_data: {
          currency: "eur",
          unit_amount: Math.round(Number(it.unit_price) * 100),
          product_data: { name: it.name },
        },
      })),
      customer_email: user.email ?? undefined,
      client_reference_id: String(order.id),
      metadata: { order_id: String(order.id) },
      success_url: origin + "/orders?placed=" + order.id + "&paid=1",
      cancel_url: origin + "/orders?placed=" + order.id,
    });
    return NextResponse.json({ url: session.url });
  } catch {
    return NextResponse.json({ error: "Could not start payment." }, { status: 500 });
  }
}
