"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type OrderItem = {
  id: number;
  name: string;
  unit_price: number;
  quantity: number;
};

type Order = {
  id: number;
  total: number;
  status: string;
  created_at: string;
  order_items: OrderItem[];
};

export default function OrdersPage() {
  const [user, setUser] = useState<User | null>(null);
  const [checked, setChecked] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [placed, setPlaced] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setPlaced(new URLSearchParams(window.location.search).get("placed"));
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user);
      setChecked(true);
      if (!data.user) return;
      const { data: rows, error: err } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("user_id", data.user.id)
        .order("created_at", { ascending: false });
      if (err) setError(err.message);
      else setOrders((rows as Order[]) ?? []);
    });
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-gray-900 text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold">
            Tech Shop
          </Link>
          <Link href="/" className="text-sm hover:underline">
            ← Back to shop
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-10">
        <h2 className="mb-6 text-2xl font-semibold">My orders</h2>

        {placed && (
          <p className="mb-6 rounded bg-green-100 p-3 text-green-800">
            Order #{placed} placed. Thank you!
          </p>
        )}

        {error && <p className="mb-6 rounded bg-red-100 p-3 text-red-700">{error}</p>}

        {checked && !user && (
          <p className="rounded bg-yellow-100 p-3 text-yellow-800">
            Please <Link href="/login" className="underline">log in</Link> to see your orders.
          </p>
        )}

        {user && orders.length === 0 && !error && (
          <p className="rounded-xl bg-white p-6 text-center text-gray-600 shadow">
            You have no orders yet.
          </p>
        )}

        <div className="space-y-4">
          {orders.map((o) => (
            <div key={o.id} className="rounded-xl bg-white p-4 shadow">
              <div className="flex items-center justify-between">
                <p className="font-semibold">Order #{o.id}</p>
                <span className="rounded-full bg-gray-200 px-3 py-1 text-xs capitalize">
                  {o.status}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {new Date(o.created_at).toLocaleString()}
              </p>
              <ul className="mt-3 divide-y divide-gray-100 text-sm">
                {o.order_items.map((it) => (
                  <li key={it.id} className="flex justify-between py-2">
                    <span>
                      {it.quantity} × {it.name}
                    </span>
                    <span>€{(Number(it.unit_price) * it.quantity).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex justify-between border-t border-gray-200 pt-3 font-semibold">
                <span>Total</span>
                <span>€{Number(o.total).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
