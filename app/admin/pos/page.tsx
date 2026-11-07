"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Product = {
  id: number;
  name: string;
  price: number;
  stock: number;
  image_url: string | null;
};

type Line = { id: number; name: string; price: number; qty: number };

type Receipt = {
  id: number;
  date: string;
  lines: Line[];
  total: number;
  method: "cash" | "card";
  given: number | null;
  change: number | null;
};

function euro(n: number): string {
  return "€" + n.toFixed(2);
}

export default function PosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [method, setMethod] = useState<"cash" | "card">("cash");
  const [given, setGiven] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("products")
      .select("id, name, price, stock, image_url")
      .order("name");
    const rows = (data ?? []) as {
      id: number;
      name: string;
      price: number | string;
      stock: number;
      image_url: string | null;
    }[];
    setProducts(rows.map((r) => ({ ...r, price: Number(r.price) })));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const total =
    Math.round(lines.reduce((sum, l) => sum + l.price * l.qty, 0) * 100) / 100;
  const givenNum = given.trim() === "" ? null : Number(given);
  const cashOk =
    method === "card" ||
    givenNum === null ||
    (!isNaN(givenNum) && givenNum + 0.001 >= total);

  function add(p: Product) {
    setMessage("");
    setLines((cur) => {
      const found = cur.find((l) => l.id === p.id);
      if (found) {
        if (found.qty >= p.stock) return cur;
        return cur.map((l) => (l.id === p.id ? { ...l, qty: l.qty + 1 } : l));
      }
      if (p.stock < 1) return cur;
      return [...cur, { id: p.id, name: p.name, price: p.price, qty: 1 }];
    });
  }

  function changeQty(id: number, delta: number) {
    const stock = products.find((p) => p.id === id)?.stock ?? 0;
    setLines((cur) =>
      cur
        .map((l) => (l.id === id ? { ...l, qty: Math.min(l.qty + delta, stock) } : l))
        .filter((l) => l.qty > 0)
    );
  }

  function removeLine(id: number) {
    setLines((cur) => cur.filter((l) => l.id !== id));
  }

  async function charge() {
    if (lines.length === 0) return;
    setBusy(true);
    setMessage("");
    const { data, error } = await supabase.rpc("pos_sale", {
      items: lines.map((l) => ({ id: l.id, quantity: l.qty })),
      pay_method: method,
    });
    if (error) {
      setBusy(false);
      setMessage(error.message);
      load();
      return;
    }
    const saleId = Number(data);

    // Read the final total back from the database, so the receipt matches it exactly.
    const { data: row } = await supabase
      .from("orders")
      .select("total")
      .eq("id", saleId)
      .single();
    const finalTotal = row ? Number(row.total) : total;
    const g = method === "cash" && givenNum !== null && !isNaN(givenNum) ? givenNum : null;

    setReceipt({
      id: saleId,
      date: new Date().toLocaleString(),
      lines,
      total: finalTotal,
      method,
      given: g,
      change: g !== null ? Math.round((g - finalTotal) * 100) / 100 : null,
    });
    setLines([]);
    setGiven("");
    setMethod("cash");
    setBusy(false);
    load();
  }

  if (receipt) {
    return (
      <main className="min-h-screen bg-gray-50 text-gray-900 print:bg-white">
        <section className="mx-auto max-w-sm px-6 py-10 print:py-0">
          <div className="rounded-xl bg-white p-6 shadow print:shadow-none">
            <h2 className="text-center text-xl font-bold">NOVA&amp;YOU</h2>
            <p className="text-center text-xs text-gray-500">
              Practice receipt, not a tax receipt
            </p>
            <p className="mt-4 text-sm font-semibold">Sale #{receipt.id}</p>
            <p className="text-xs text-gray-500">{receipt.date}</p>

            <ul className="mt-4 divide-y divide-gray-100 text-sm">
              {receipt.lines.map((l) => (
                <li key={l.id} className="flex justify-between py-2">
                  <span>
                    {l.qty} × {l.name}
                  </span>
                  <span>{euro(l.price * l.qty)}</span>
                </li>
              ))}
            </ul>

            <div className="mt-3 flex justify-between border-t border-gray-300 pt-3 font-bold">
              <span>Total</span>
              <span>{euro(receipt.total)}</span>
            </div>
            <p className="mt-2 text-sm capitalize">Paid by {receipt.method}</p>
            {receipt.given !== null && receipt.change !== null && (
              <div className="mt-1 text-sm">
                <p>Cash received: {euro(receipt.given)}</p>
                <p>Change: {euro(receipt.change)}</p>
              </div>
            )}
            <p className="mt-6 text-center text-xs text-gray-500">Thank you!</p>
          </div>

          <div className="mt-4 flex gap-3 print:hidden">
            <button
              onClick={() => window.print()}
              className="flex-1 rounded-lg border border-gray-300 bg-white py-2 text-sm hover:bg-gray-100"
            >
              Print receipt
            </button>
            <button
              onClick={() => setReceipt(null)}
              className="flex-1 rounded-lg bg-gray-900 py-2 text-sm text-white hover:bg-gray-700"
            >
              New sale
            </button>
          </div>
        </section>
      </main>
    );
  }

  const term = search.toLowerCase();
  const shown = products.filter((p) => p.name.toLowerCase().includes(term));

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <section className="mx-auto max-w-6xl px-6 py-8">
        <h2 className="mb-4 text-2xl font-semibold">POS</h2>

        {message && (
          <p className="mb-4 rounded bg-red-100 p-3 text-sm text-red-700">{message}</p>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products"
              className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {shown.map((p) => (
                <button
                  key={p.id}
                  onClick={() => add(p)}
                  disabled={p.stock < 1}
                  className="rounded-xl bg-white p-3 text-left shadow hover:bg-gray-50 disabled:opacity-40"
                >
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={p.name}
                      className="mb-2 h-20 w-full rounded-lg object-cover"
                    />
                  ) : (
                    <div className="mb-2 flex h-20 items-center justify-center rounded-lg bg-gray-200 text-xs text-gray-500">
                      No photo
                    </div>
                  )}
                  <p className="text-sm font-semibold">{p.name}</p>
                  <p className="text-sm">{euro(p.price)}</p>
                  <p className="text-xs text-gray-500">
                    {p.stock > 0 ? p.stock + " in stock" : "Out of stock"}
                  </p>
                </button>
              ))}
            </div>
            {shown.length === 0 && (
              <p className="mt-4 text-sm text-gray-500">No products found.</p>
            )}
          </div>

          <div className="h-fit rounded-xl bg-white p-4 shadow">
            <h3 className="mb-3 font-semibold">Current sale</h3>

            {lines.length === 0 ? (
              <p className="text-sm text-gray-500">Tap a product to add it.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {lines.map((l) => (
                  <li key={l.id} className="py-2 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium">{l.name}</span>
                      <button
                        onClick={() => removeLine(l.id)}
                        className="text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => changeQty(l.id, -1)}
                          className="h-7 w-7 rounded-lg border border-gray-300 hover:bg-gray-100"
                        >
                          −
                        </button>
                        <span className="w-6 text-center">{l.qty}</span>
                        <button
                          onClick={() => changeQty(l.id, 1)}
                          className="h-7 w-7 rounded-lg border border-gray-300 hover:bg-gray-100"
                        >
                          +
                        </button>
                      </div>
                      <span>{euro(l.price * l.qty)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-3 flex justify-between border-t border-gray-200 pt-3 text-lg font-bold">
              <span>Total</span>
              <span>{euro(total)}</span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {(["cash", "card"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={
                    "rounded-lg border py-2 text-sm capitalize " +
                    (method === m
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-300 hover:bg-gray-100")
                  }
                >
                  {m}
                </button>
              ))}
            </div>

            {method === "cash" && (
              <div className="mt-3">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={given}
                  onChange={(e) => setGiven(e.target.value)}
                  placeholder="Cash received (optional)"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                {givenNum !== null && !isNaN(givenNum) && cashOk && total > 0 && (
                  <p className="mt-2 text-sm">
                    Change: <b>{euro(givenNum - total)}</b>
                  </p>
                )}
                {givenNum !== null && !cashOk && (
                  <p className="mt-2 text-sm text-red-700">Not enough cash.</p>
                )}
              </div>
            )}

            {method === "card" && (
              <p className="mt-3 text-xs text-gray-500">
                Take the payment on your card machine, then press Charge to record it.
              </p>
            )}

            <button
              onClick={charge}
              disabled={busy || lines.length === 0 || !cashOk}
              className="mt-4 w-full rounded-lg bg-green-700 py-3 text-white hover:bg-green-800 disabled:opacity-40"
            >
              {busy ? "Saving..." : "Charge " + euro(total)}
            </button>
            {lines.length > 0 && (
              <button
                onClick={() => {
                  setLines([]);
                  setGiven("");
                }}
                className="mt-2 w-full text-sm text-gray-600 hover:underline"
              >
                Clear sale
              </button>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}