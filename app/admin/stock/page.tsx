"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Row = {
  id: number;
  product_name: string;
  old_stock: number;
  new_stock: number;
  change: number;
  reason: string;
  created_at: string;
};

export default function StockHistoryPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    supabase
      .from("stock_history")
      .select("*")
      .order("id", { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        if (error) setLoadError(error.message);
        else setRows((data as Row[]) ?? []);
        setLoaded(true);
      });
  }, []);

  const term = search.toLowerCase();
  const shown = rows.filter(
    (r) =>
      r.product_name.toLowerCase().includes(term) ||
      r.reason.toLowerCase().includes(term)
  );

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <section className="mx-auto max-w-5xl px-6 py-10">
        <h2 className="mb-2 text-2xl font-semibold">Stock history</h2>
        <p className="mb-6 text-sm text-gray-600">
          Every stock change, newest first. History starts from when this feature was added.
        </p>

        {loadError && (
          <p className="mb-6 rounded bg-red-100 p-3 text-sm text-red-700">{loadError}</p>
        )}

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by product or reason (for example: Order #5)"
          className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2"
        />

        {loaded && rows.length === 0 && !loadError && (
          <p className="rounded-xl bg-white p-6 text-center text-gray-600 shadow">
            No stock changes recorded yet. Change a product's stock to see it here.
          </p>
        )}

        {rows.length > 0 && (
          <div className="overflow-x-auto rounded-xl bg-white shadow">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3 text-right">Before</th>
                  <th className="px-4 py-3 text-right">Change</th>
                  <th className="px-4 py-3 text-right">After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {shown.map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-medium">{r.product_name}</td>
                    <td className="px-4 py-3">{r.reason}</td>
                    <td className="px-4 py-3 text-right">{r.old_stock}</td>
                    <td
                      className={
                        "px-4 py-3 text-right font-semibold " +
                        (r.change > 0 ? "text-green-700" : "text-red-700")
                      }
                    >
                      {r.change > 0 ? "+" : ""}
                      {r.change}
                    </td>
                    <td className="px-4 py-3 text-right">{r.new_stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}