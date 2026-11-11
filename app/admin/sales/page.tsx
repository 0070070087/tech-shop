"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { statusClass } from "@/lib/status";

type Item = { name: string; unit_price: number | string; quantity: number };

type Sale = {
  id: number;
  total: number | string;
  status: string;
  payment_method: string | null;
  created_at: string;
  refunded_at: string | null;
  refund_reason: string | null;
  order_items: Item[];
};

function euro(n: number): string {
  return "€" + n.toFixed(2);
}

export default function TillSalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState("");
  const [info, setInfo] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("orders")
      .select(
        "id, total, status, payment_method, created_at, refunded_at, refund_reason, order_items(name, unit_price, quantity)"
      )
      .eq("source", "pos")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) setMessage(error.message);
    else setSales((data as unknown as Sale[]) ?? []);
    setLoaded(true);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function refund(s: Sale) {
    setBusy(true);
    setMessage("");
    setInfo("");
    const { error } = await supabase.rpc("pos_refund", {
      p_order_id: s.id,
      p_reason: reason,
    });
    setBusy(false);
    if (error) {
      setMessage(error.message);
      load();
      return;
    }
    setOpenId(null);
    setReason("");
    setInfo(
      "Sale #" +
        s.id +
        " refunded and the stock was put back. Hand " +
        euro(Number(s.total)) +
        " back to the customer."
    );
    load();
  }

  return (
    <main className="min-h-screen bg-[#F4EDE2] text-[#14213D]">
      <section className="mx-auto max-w-3xl px-6 py-10">
        <h2 className="mb-2 text-2xl font-semibold">Till sales</h2>
        <p className="mb-6 text-sm text-[#14213D]/70">
          Your last 50 till sales. A refund returns the items to stock and marks the sale as
          refunded. It does not hand back any money, so give the cash or card refund yourself.
        </p>

        {message && (
          <p className="mb-6 rounded bg-red-100 p-3 text-sm text-red-700">{message}</p>
        )}
        {info && (
          <p className="mb-6 rounded bg-emerald-100 p-3 text-sm text-emerald-800">{info}</p>
        )}

        {loaded && sales.length === 0 && !message && (
          <p className="rounded-xl bg-white p-6 text-center text-[#14213D]/70 shadow">
            No till sales yet. Make a sale on the POS tab first.
          </p>
        )}

        <div className="space-y-4">
          {sales.map((s) => {
            const canRefund = s.status === "paid" || s.status === "shipped";
            return (
              <div key={s.id} className="rounded-xl bg-white p-4 shadow">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">Sale #{s.id}</p>
                    <p className="text-xs text-[#14213D]/60">
                      {new Date(s.created_at).toLocaleString()} ·{" "}
                      <span className="capitalize">{s.payment_method ?? "n/a"}</span>
                    </p>
                  </div>
                  <span
                    className={
                      "rounded-full border px-3 py-1 text-xs capitalize " + statusClass(s.status)
                    }
                  >
                    {s.status}
                  </span>
                </div>

                <ul className="mt-3 divide-y divide-[#EFE4D2] text-sm">
                  {s.order_items.map((it, i) => (
                    <li key={i} className="flex justify-between py-2">
                      <span>
                        {it.quantity} × {it.name}
                      </span>
                      <span>{euro(Number(it.unit_price) * it.quantity)}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-3 flex justify-between border-t border-[#E6D9C5] pt-3 font-semibold">
                  <span>Total</span>
                  <span>{euro(Number(s.total))}</span>
                </div>

                {s.status === "refunded" && (
                  <p className="mt-3 text-xs text-[#14213D]/60">
                    Refunded
                    {s.refunded_at ? " on " + new Date(s.refunded_at).toLocaleString() : ""}
                    {s.refund_reason ? ". Reason: " + s.refund_reason : "."}
                  </p>
                )}

                {canRefund && openId !== s.id && (
                  <button
                    onClick={() => {
                      setOpenId(s.id);
                      setReason("");
                      setMessage("");
                      setInfo("");
                    }}
                    className="mt-3 rounded-lg border border-[#E0D2BC] px-4 py-1 text-sm hover:bg-[#F0E6D5]"
                  >
                    Refund
                  </button>
                )}

                {canRefund && openId === s.id && (
                  <div className="mt-3 rounded-xl border border-[#F6C48C] bg-[#FDE7CC]/50 p-3">
                    <p className="mb-2 text-sm">
                      Refund all of sale #{s.id} ({euro(Number(s.total))})? The items go back to
                      stock.
                    </p>
                    <input
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Reason (optional), for example: wrong size"
                      className="mb-2 w-full rounded-lg border border-[#E0D2BC] bg-white px-3 py-2 text-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => refund(s)}
                        disabled={busy}
                        className="rounded-lg bg-[#F28C28] px-4 py-1 text-sm font-semibold text-[#14213D] hover:bg-[#FFA033] disabled:opacity-50"
                      >
                        {busy ? "Saving..." : "Confirm refund"}
                      </button>
                      <button
                        onClick={() => setOpenId(null)}
                        className="rounded-lg border border-[#E0D2BC] px-4 py-1 text-sm hover:bg-[#F0E6D5]"
                      >
                        Cancel
                      </button>
                    </div>
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