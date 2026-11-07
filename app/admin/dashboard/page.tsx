"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { statusClass } from "@/lib/status";

type Item = { name: string; unit_price: number | string; quantity: number };
type Order = {
  id: number;
  total: number | string;
  status: string;
  created_at: string;
  order_items: Item[];
};

// Only paid and shipped orders count as sales.
const COUNTED = ["paid", "shipped"];
const STATUSES = ["pending", "paid", "shipped", "cancelled"];

function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + day;
}

function euro(n: number): string {
  return "€" + n.toFixed(2);
}

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    supabase
      .from("orders")
      .select("id, total, status, created_at, order_items(name, unit_price, quantity)")
      .order("created_at", { ascending: false })
      .limit(1000)
      .then(({ data, error }) => {
        if (error) setLoadError(error.message);
        else setOrders((data as unknown as Order[]) ?? []);
        setLoaded(true);
      });
  }, []);

  const counted = orders.filter((o) => COUNTED.includes(o.status));
  const revenue = counted.reduce((sum, o) => sum + Number(o.total), 0);
  const average = counted.length > 0 ? revenue / counted.length : 0;
  const pending = orders.filter((o) => o.status === "pending");
  const pendingValue = pending.reduce((sum, o) => sum + Number(o.total), 0);

  // Sales for each of the last 7 days (in this computer's time zone).
  const days: { key: string; label: string; total: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      key: dayKey(d),
      label: d.toLocaleDateString(undefined, { weekday: "short", day: "numeric" }),
      total: 0,
    });
  }
  for (const o of counted) {
    const slot = days.find((x) => x.key === dayKey(new Date(o.created_at)));
    if (slot) slot.total += Number(o.total);
  }
  const maxDay = Math.max(...days.map((d) => d.total), 1);

  // Best sellers by number of items sold.
  const sellers = new Map<string, { qty: number; money: number }>();
  for (const o of counted) {
    for (const it of o.order_items ?? []) {
      const cur = sellers.get(it.name) ?? { qty: 0, money: 0 };
      cur.qty += it.quantity;
      cur.money += Number(it.unit_price) * it.quantity;
      sellers.set(it.name, cur);
    }
  }
  const best = Array.from(sellers.entries())
    .map(([name, v]) => ({ name, qty: v.qty, money: v.money }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  const card = (label: string, value: string, note?: string) => (
    <div className="rounded-xl bg-white p-4 shadow">
      <p className="text-xs uppercase text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {note && <p className="mt-1 text-xs text-gray-500">{note}</p>}
    </div>
  );

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <section className="mx-auto max-w-5xl px-6 py-10">
        <h2 className="mb-2 text-2xl font-semibold">Dashboard</h2>
        <p className="mb-6 text-sm text-gray-600">
          Paid and shipped orders count as sales. Pending and cancelled orders are not counted.
        </p>

        {loadError && (
          <p className="mb-6 rounded bg-red-100 p-3 text-sm text-red-700">{loadError}</p>
        )}

        {loaded && orders.length === 0 && !loadError && (
          <p className="mb-6 rounded-xl bg-white p-6 text-center text-gray-600 shadow">
            No orders yet. Place a test order to see numbers here.
          </p>
        )}

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {card("Sales", euro(revenue), "Paid and shipped")}
          {card("Orders", String(counted.length), "Paid and shipped")}
          {card("Average order", euro(average))}
          {card(
            "Waiting for payment",
            String(pending.length),
            euro(pendingValue) + " not paid yet"
          )}
        </div>

        <div className="mb-8 rounded-xl bg-white p-4 shadow">
          <h3 className="mb-4 font-semibold">Last 7 days</h3>
          <div className="space-y-2">
            {days.map((d) => (
              <div key={d.key} className="flex items-center gap-3 text-sm">
                <span className="w-16 shrink-0 text-gray-500">{d.label}</span>
                <div className="h-3 flex-1 rounded bg-gray-100">
                  <div
                    className="h-3 rounded bg-indigo-500"
                    style={{ width: Math.round((d.total / maxDay) * 100) + "%" }}
                  />
                </div>
                <span className="w-20 shrink-0 text-right">{euro(d.total)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-xl bg-white p-4 shadow">
            <h3 className="mb-4 font-semibold">Best sellers</h3>
            {best.length === 0 ? (
              <p className="text-sm text-gray-500">No sales yet.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="py-2">Product</th>
                    <th className="py-2 text-right">Sold</th>
                    <th className="py-2 text-right">Sales</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {best.map((b) => (
                    <tr key={b.name}>
                      <td className="py-2 font-medium">{b.name}</td>
                      <td className="py-2 text-right">{b.qty}</td>
                      <td className="py-2 text-right">{euro(b.money)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="rounded-xl bg-white p-4 shadow">
            <h3 className="mb-4 font-semibold">Orders by status</h3>
            <ul className="space-y-2 text-sm">
              {STATUSES.map((s) => (
                <li key={s} className="flex items-center justify-between">
                  <span
                    className={
                      "rounded-full border px-3 py-1 text-xs capitalize " + statusClass(s)
                    }
                  >
                    {s}
                  </span>
                  <span className="font-semibold">
                    {orders.filter((o) => o.status === s).length}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}