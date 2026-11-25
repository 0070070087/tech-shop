"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { db } from "../../lib/db";

// ─────────────────────────────────────────────────────────────
// SHOP SETTINGS - change these two lines for your shop
// WhatsApp number: country code + number, digits only, e.g. "35799123456"
// Leave it as "" and the button will say "Ask in the shop" instead.
const SHOP_WHATSAPP = "";
const SHOP_NAME = "NOVA&YOU";
// ─────────────────────────────────────────────────────────────

// Only these fields come from the database. The database function
// public_phones() never sends owner details, IMEI, owner price or private notes.
type PublicPhone = {
  id: string | number;
  brand: string | null;
  model: string | null;
  storage: string | null;
  ram: string | null;
  color: string | null;
  battery_health: string | number | null;
  condition: string | null;
  problems: string | null;
  accessories: string | null;
  display_price: number | null;
  status: "available" | "reserved" | string;
  image_url: string | null;
  received_at: string | null;
};

const money = (n: number | null) =>
  n === null || n === undefined ? "Ask for price" : "€" + Number(n).toLocaleString("en-GB", { maximumFractionDigits: 2 });

const batteryText = (b: string | number | null) => {
  if (b === null || b === undefined || String(b).trim() === "") return "";
  return String(b).includes("%") ? String(b) : String(b) + "%";
};

type Sort = "new" | "low" | "high";

export default function PhonesForSalePage() {
  const [phones, setPhones] = useState<PublicPhone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [brand, setBrand] = useState("All");
  const [sort, setSort] = useState<Sort>("new");

  useEffect(() => {
    (async () => {
      const { data, error: err } = await db.rpc("public_phones");
      if (err) setError("The phones list is not available right now. Please try again later.");
      else setPhones((data as PublicPhone[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const brands = useMemo(() => {
    const set = new Set<string>();
    phones.forEach((p) => p.brand && set.add(p.brand));
    return ["All", ...Array.from(set).sort()];
  }, [phones]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = phones.filter((p) => {
      if (brand !== "All" && p.brand !== brand) return false;
      if (!needle) return true;
      return [p.brand, p.model, p.storage, p.color].filter(Boolean).join(" ").toLowerCase().includes(needle);
    });
    if (sort === "low") list.sort((a, b) => Number(a.display_price ?? Infinity) - Number(b.display_price ?? Infinity));
    if (sort === "high") list.sort((a, b) => Number(b.display_price ?? -1) - Number(a.display_price ?? -1));
    return list;
  }, [phones, q, brand, sort]);

  function whatsappLink(p: PublicPhone) {
    const title = [p.brand, p.model, p.storage].filter(Boolean).join(" ");
    const text = `Hi! I'm interested in the ${title} (${money(p.display_price)}) on your website. Is it still available?`;
    return `https://wa.me/${SHOP_WHATSAPP}?text=${encodeURIComponent(text)}`;
  }

  return (
    <main className="min-h-screen bg-[#F4EDE2] text-[#14213D]">
      <header className="bg-[#14213D] text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-extrabold tracking-wide">
            NOVA<span className="text-[#F28C28]">&amp;</span>YOU
          </Link>
          <Link href="/" className="text-sm text-white/70 hover:text-white">
            ← Back to shop
          </Link>
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-10 pt-4">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#FFB347]">In the shop right now</p>
          <h1 className="mt-1 text-3xl font-extrabold md:text-5xl">Phones for sale</h1>
          <p className="mt-2 max-w-xl text-white/70">
            Every phone shows its condition and any known problems, so there are no surprises. Tap a phone to ask about it on WhatsApp.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Search, brand chips, sort */}
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search: iPhone, Samsung, 256GB, black…"
            className="w-full rounded-full border border-[#14213D]/15 bg-white px-5 py-2.5 text-sm outline-none focus:border-[#F28C28] focus:ring-2 focus:ring-[#F28C28]/30 md:max-w-sm"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="rounded-full border border-[#14213D]/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#F28C28] md:ml-auto"
          >
            <option value="new">Newest first</option>
            <option value="low">Price: low to high</option>
            <option value="high">Price: high to low</option>
          </select>
        </div>

        {brands.length > 2 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {brands.map((b) => (
              <button
                key={b}
                onClick={() => setBrand(b)}
                className={
                  "rounded-full px-4 py-1.5 text-sm font-semibold ring-1 transition " +
                  (brand === b ? "bg-[#14213D] text-white ring-[#14213D]" : "bg-white text-[#14213D] ring-[#14213D]/15 hover:bg-white/60")
                }
              >
                {b}
              </button>
            ))}
          </div>
        )}

        {loading && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-80 animate-pulse rounded-3xl bg-white/70" />
            ))}
          </div>
        )}

        {error && <p className="rounded-2xl bg-white p-8 text-center text-[#14213D]/70">{error}</p>}

        {!loading && !error && phones.length === 0 && (
          <div className="rounded-3xl bg-white p-10 text-center ring-1 ring-[#14213D]/10">
            <div className="text-4xl">📱</div>
            <p className="mt-2 text-lg font-extrabold">No phones listed right now</p>
            <p className="text-sm text-[#14213D]/60">New phones arrive often - check back soon or visit us in the shop.</p>
          </div>
        )}

        {!loading && !error && phones.length > 0 && shown.length === 0 && (
          <p className="rounded-2xl bg-white p-8 text-center text-[#14213D]/70">No phones match your search.</p>
        )}

        {!loading && shown.length > 0 && (
          <>
            <p className="mb-3 text-sm text-[#14213D]/60">
              {shown.length} phone{shown.length === 1 ? "" : "s"}
            </p>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((p) => {
                const title = [p.brand, p.model].filter(Boolean).join(" ") || "Phone";
                const reserved = p.status === "reserved";
                const chips = [p.storage, p.ram && p.ram + " RAM", p.color].filter(Boolean) as string[];
                const battery = batteryText(p.battery_health);
                return (
                  <article
                    key={p.id}
                    id={"phone-" + p.id}
                    className="group flex flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-[#14213D]/10 transition hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <div className="relative aspect-[4/3] bg-gradient-to-br from-[#14213D] to-[#2b3d6b]">
                      {p.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.image_url} alt={title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-6xl opacity-60">📱</div>
                      )}
                      {reserved && (
                        <span className="absolute left-3 top-3 rounded-full bg-[#FFB347] px-3 py-1 text-xs font-extrabold text-[#14213D]">
                          Reserved
                        </span>
                      )}
                      {p.condition && (
                        <span className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-[#14213D]">
                          {p.condition}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col p-5">
                      <h2 className="text-lg font-extrabold leading-tight">{title}</h2>

                      {chips.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {chips.map((c) => (
                            <span key={c} className="rounded-full bg-[#F4EDE2] px-2.5 py-0.5 text-xs font-semibold">
                              {c}
                            </span>
                          ))}
                          {battery && (
                            <span className="rounded-full bg-[#F4EDE2] px-2.5 py-0.5 text-xs font-semibold">🔋 {battery}</span>
                          )}
                        </div>
                      )}

                      {(p.problems || p.accessories) && (
                        <div className="mt-3 space-y-1 text-sm">
                          {p.problems && (
                            <p className="text-[#8a4a0a]">
                              <b>Good to know:</b> {p.problems}
                            </p>
                          )}
                          {p.accessories && (
                            <p className="text-[#14213D]/70">
                              <b>Includes:</b> {p.accessories}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                        <div className="text-2xl font-extrabold text-[#C2570C]">{money(p.display_price)}</div>
                        {reserved ? (
                          <span className="rounded-full bg-[#14213D]/10 px-4 py-2 text-sm font-bold text-[#14213D]/60">Reserved</span>
                        ) : SHOP_WHATSAPP ? (
                          <a
                            href={whatsappLink(p)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-full bg-[#F28C28] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#C2570C]"
                          >
                            Ask on WhatsApp
                          </a>
                        ) : (
                          <span className="rounded-full bg-[#14213D]/10 px-4 py-2 text-sm font-bold text-[#14213D]/70">Ask in the shop</span>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}

        <p className="mt-12 text-center text-sm text-[#14213D]/70">
          Left a phone with us to sell?{" "}
          <Link href="/portal" className="font-bold text-[#C2570C] hover:underline">
            Check its status →
          </Link>
        </p>
        <p className="mt-3 text-center text-xs text-[#14213D]/40">
          {SHOP_NAME} · Prices in euro. Availability can change during the day.
        </p>
      </div>
    </main>
  );
}
