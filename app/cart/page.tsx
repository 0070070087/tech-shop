"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { getCart, saveCart, type CartItem } from "@/lib/cart";
import { startPayment } from "@/lib/pay";

export default function CartPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setItems(getCart());
    setLoaded(true);
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  function update(next: CartItem[]) {
    setItems(next);
    saveCart(next);
  }

  function changeQty(id: number, delta: number) {
    update(
      items
        .map((i) => (i.id === id ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  }

  function remove(id: number) {
    update(items.filter((i) => i.id !== id));
  }

  async function checkout() {
    setMessage("");
    if (!user) {
      setMessage("Please log in to place your order.");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.rpc("place_order", {
      items: items.map((i) => ({ id: i.id, quantity: i.quantity })),
    });
    setBusy(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    saveCart([]);
    const payError = await startPayment(Number(data));
    if (payError) router.push("/orders?placed=" + data);
  }

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-gray-900 text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold">
            NOVA&amp;YOU
          </Link>
          <Link href="/" className="text-sm hover:underline">
            ← Continue shopping
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-10">
        <h2 className="mb-6 text-2xl font-semibold">Your Cart</h2>

        {message && (
          <p className="mb-4 rounded bg-red-100 p-3 text-sm text-red-700">{message}</p>
        )}

        {loaded && items.length === 0 && (
          <div className="rounded-xl bg-white p-6 text-center shadow">
            <p className="text-gray-600">Your cart is empty.</p>
            <Link
              href="/"
              className="mt-4 inline-block rounded-lg bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700"
            >
              Browse products
            </Link>
          </div>
        )}

        {items.length > 0 && (
          <div className="rounded-xl bg-white p-4 shadow">
            <ul className="divide-y divide-gray-200">
              {items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-4 py-4">
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-sm text-gray-500">€{item.price.toFixed(2)} each</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => changeQty(item.id, -1)}
                      className="h-8 w-8 rounded-lg border border-gray-300 hover:bg-gray-100"
                    >
                      −
                    </button>
                    <span className="w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() => changeQty(item.id, 1)}
                      className="h-8 w-8 rounded-lg border border-gray-300 hover:bg-gray-100"
                    >
                      +
                    </button>
                  </div>

                  <div className="w-20 text-right font-semibold">
                    €{(item.price * item.quantity).toFixed(2)}
                  </div>

                  <button
                    onClick={() => remove(item.id)}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
              <span className="text-lg font-semibold">Total</span>
              <span className="text-lg font-bold">€{total.toFixed(2)}</span>
            </div>

            {!user && (
              <p className="mt-4 rounded bg-yellow-100 p-3 text-sm text-yellow-800">
                Please <Link href="/login" className="underline">log in</Link> to place your order.
              </p>
            )}

            <button
              onClick={checkout}
              disabled={busy || !user}
              className="mt-4 w-full rounded-lg bg-gray-900 py-2 text-white hover:bg-gray-700 disabled:opacity-40"
            >
              {busy ? "Redirecting to payment..." : "Pay with card"}
            </button>
            <p className="mt-2 text-center text-xs text-gray-500">
              Test mode: no real money is charged.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
