"use client";

import { useCallback, useEffect, useState } from "react";
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
  email: string | null;
  total: number;
  status: string;
  created_at: string;
  order_items: OrderItem[];
};

const STATUSES = ["pending", "paid", "shipped", "cancelled"];

export default function AdminOrdersPage() {
  const [user, setUser] = useState<User | null>(null);
  const [checked, setChecked] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false });
    if (error) setMessage(error.message);
    else setOrders((data as Order[]) ?? []);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setChecked(true);
    });
    load();
  }, [load]);

  async function setStatus(id: number, status: string) {
    setMessage("");
    const { data, error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", id)
      .select();
    if (error || !data || data.length === 0) {
      setMessage("Not allowed. Log in with the admin account.");
      return;
    }
    load();
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-gray-900 text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold">
            Tech Shop
          </Link>
          <Link href="/admin" className="text-sm hover:underline">
            ← Admin products
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-10">
        <h2 className="mb-6 text-2xl font-semibold">All orders</h2>

        {checked && !user && (
          <p className="mb-6 rounded bg-yellow-100 p-3 text-yellow-800">
            Please <Link href="/login" className="underline">log in</Link> first.
          </p>
        )}

        {message && <p className="mb-6 rounded bg-gray-200 p-3 text-sm">{message}</p>}

        {orders.length === 0 && user && (
          <p className="rounded-xl bg-white p-6 text-center text-gray-600 shadow">
            No orders yet.
          </p>
        )}

        <div className="space-y-4">
          {orders.map((o) => (
            <div key={o.id} className="rounded-xl bg-white p-4 shadow">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">Order #{o.id}</p>
                  <p className="text-xs text-gray-500">
                    {o.email} · {new Date(o.created_at).toLocaleString()}
                  </p>
                </div>
                <select
                  value={o.status}
                  onChange={(e) => setStatus(o.id, e.target.value)}
                  className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
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
