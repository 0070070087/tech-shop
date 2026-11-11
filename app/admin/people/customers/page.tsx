"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { statusClass } from "@/lib/status";

const ADMIN_EMAIL = "aqeelsyed781@gmail.com";

type Item = { name: string; unit_price: number | string; quantity: number };

type Order = {
  id: number;
  user_id: string | null;
  email: string | null;
  total: number | string;
  status: string;
  created_at: string;
  order_items: Item[];
};

type Customer = {
  key: string;
  email: string;
  orders: Order[];
  spent: number;
  paidCount: number;
  last: string;
};

function euro(n: number): string {
  return "€" + n.toFixed(2);
}

export default function CustomersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [openKey, setOpenKey] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("orders")
      .select("id, user_id, email, total, status, created_at, order_items(name, unit_price, quantity)")
      .order("created_at", { ascending: false })
      .limit(1000)
      .then(({ data, error }) => {
        if (error) setLoadError(error.message);
        else setOrders((data as unknown as Order[]) ?? []);
        setLoaded(true);
      });
  }, []);

  // Group website orders by customer. Till sales are skipped.
  const map = new Map<string, Customer>();
  for (const o of orders) {
    if ((o.email ?? "").startsWith("POS sale")) continue;
    const key = o.user_id ?? o.email ?? "unknown";
    let c = map.get(key);
    if (!c) {
      c = {
        key,
        email: o.email ?? "Unknown",
        orders: [],
        spent: 0,
        paidCount: 0,
        last: o.created_at,
      };
      map.set(key, c);
    }
    c.orders.push(o);
    if (o.status === "paid" || o.status === "shipped") {
      c.spent += Number(o.total);
      c.paidCount += 1;
    }
    if (o.created_at > c.last) c.last = o.created_at;
  }

  const customers = Array.from(map.values()).sort(
    (a, b) => b.spent - a.spent || (a.last < b.last ? 1 : -1)
  );

  const totalSpent = customers.reduce((sum, c) => sum + c.spent, 0);
  const repeat = customers.filter((c) => c.paidCount >= 2).length;
  const average = customers.length > 0 ? totalSpent / customers.length : 0;

  const term = search.toLowerCase();
  const shown = customers.filter((c) => c.email.toLowerCase().includes(term));

  const card = (label: string, value: string, note?: string) => (
    <div className="rounded-xl bg-white p-4 shadow">
      <p className="text-xs uppercase text-[#14213D]/60">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {note && <p className="mt-1 text-xs text-[#14213D]/60">{note}</p>}
    </div>
  );

  return (
    <main className="min-h-screen bg-[#F4EDE2] text-[#14213D]">
      <section className="mx-auto max-w-5xl px-6 py-10">
        <h2 className="mb-2 text-2xl font-semibold">Customers</h2>
        <p className="mb-6 text-sm text-[#14213D]/70">
          People who placed orders on the website. Only paid and shipped orders count towards
          the amount spent. Customers who signed up but never ordered are not listed.
        </p>

        {loadError && (
          <p className="mb-6 rounded bg-red-100 p-3 text-sm text-red-700">{loadError}</p>
        )}

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          {card("Customers", String(customers.length))}
          {card("Repeat customers", String(repeat), "2 or more paid orders")}
          {card("Average spent", euro(average), "Per customer")}
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email"
          className="mb-4 w-full rounded-lg border border-[#E0D2BC] bg-white px-3 py-2"
        />

        {loaded && customers.length === 0 && !loadError && (
          <p className="rounded-xl bg-white p-6 text-center text-[#14213D]/70 shadow">
            No website orders yet. Place an order on the shop to see customers here.
          </p>
        )}

        {customers.length > 0 && shown.length === 0 && (
          <p className="text-sm text-[#14213D]/60">No customer matches that search.</p>
        )}

        <div className="space-y-3">
          {shown.map((c) => {
            const open = openKey === c.key;
            const isOwner = c.email.toLowerCase() === ADMIN_EMAIL;
            return (
              <div key={c.key} className="rounded-xl bg-white shadow">
                <button
                  onClick={() => setOpenKey(open ? null : c.key)}
                  className="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left"
                >
                  <div>
                    <p className="font-semibold">
                      {c.email}
                      {isOwner && (
                        <span className="ml-2 rounded-full bg-[#FDE7CC] px-2 py-0.5 text-xs text-[#C2570C]">
                          You
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-[#14213D]/60">
                      Last order {new Date(c.last).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-6 text-sm">
                    <div className="text-right">
                      <p className="text-xs text-[#14213D]/60">Orders</p>
                      <p className="font-semibold">{c.orders.length}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[#14213D]/60">Spent</p>
                      <p className="font-semibold text-[#C2570C]">{euro(c.spent)}</p>
                    </div>
                  </div>
                </button>

                {open && (
                  <div className="border-t border-[#E6D9C5] p-4">
                    <ul className="space-y-3">
                      {c.orders.map((o) => (
                        <li key={o.id} className="text-sm">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-medium">
                              Order #{o.id}{" "}
                              <span className="font-normal text-[#14213D]/60">
                                {new Date(o.created_at).toLocaleString()}
                              </span>
                            </span>
                            <span className="flex items-center gap-3">
                              <span
                                className={
                                  "rounded-full border px-3 py-0.5 text-xs capitalize " +
                                  statusClass(o.status)
                                }
                              >
                                {o.status}
                              </span>
                              <span className="font-semibold">{euro(Number(o.total))}</span>
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-[#14213D]/60">
                            {(o.order_items ?? [])
                              .map((it) => it.quantity + " × " + it.name)
                              .join(", ")}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}