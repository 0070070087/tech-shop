"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { db } from "../../lib/db";

// What an owner is allowed to see. The database function portal_lookup()
// sends only these fields: no listed (display) price, no sold price,
// no private notes.
type MyPhone = {
  id: string | number;
  brand: string | null;
  model: string | null;
  storage: string | null;
  ram: string | null;
  color: string | null;
  imei: string | null;
  battery_health: string | number | null;
  condition: string | null;
  problems: string | null;
  accessories: string | null;
  owner_price: number | null;
  owner_payout: number | null;
  status: "available" | "reserved" | "sold" | "returned" | string;
  image_url: string | null;
  received_at: string | null;
  sold_at: string | null;
  owner_paid_at: string | null;
  shop_message: string | null;
};

const STATUS: Record<string, { label: string; text: string; pill: string }> = {
  available: {
    label: "On display",
    text: "Your phone is on display in the shop and available for sale.",
    pill: "bg-[#F28C28]/15 text-[#C2570C] ring-[#F28C28]/40",
  },
  reserved: {
    label: "Reserved",
    text: "A customer has reserved your phone. We will confirm soon.",
    pill: "bg-[#FFB347]/25 text-[#8a4a0a] ring-[#FFB347]/60",
  },
  sold: {
    label: "Sold",
    text: "Your phone has been sold.",
    pill: "bg-emerald-100 text-emerald-800 ring-emerald-300",
  },
  returned: {
    label: "Returned to you",
    text: "Your phone was handed back to you.",
    pill: "bg-slate-200 text-slate-700 ring-slate-300",
  },
};

function fmtDate(d: string | null) {
  if (!d) return "";
  const x = new Date(d);
  return isNaN(x.getTime()) ? "" : x.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function money(n: number | null) {
  if (n === null || n === undefined) return "-";
  return "€" + Number(n).toLocaleString("en-GB", { maximumFractionDigits: 2 });
}

// The little progress line: Received -> On display -> Sold -> Paid
function Steps({ p }: { p: MyPhone }) {
  const sold = p.status === "sold";
  if (p.status === "returned") {
    return (
      <p className="mt-4 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-600">
        This phone is no longer in the shop - it was returned to you.
      </p>
    );
  }
  const steps = [
    { name: "Received", done: true, date: fmtDate(p.received_at) },
    { name: "On display", done: true, date: "" },
    { name: "Sold", done: sold, date: sold ? fmtDate(p.sold_at) : "" },
    { name: "You are paid", done: sold && !!p.owner_paid_at, date: sold ? fmtDate(p.owner_paid_at) : "" },
  ];
  return (
    <ol className="mt-4 grid grid-cols-4 gap-2">
      {steps.map((s) => (
        <li key={s.name} className="text-center">
          <div
            className={
              "mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold " +
              (s.done ? "bg-[#F28C28] text-white" : "bg-[#14213D]/10 text-[#14213D]/40")
            }
          >
            {s.done ? "✓" : "·"}
          </div>
          <div className={"mt-1 text-[11px] leading-tight " + (s.done ? "font-semibold text-[#14213D]" : "text-[#14213D]/45")}>
            {s.name}
          </div>
          {s.date && <div className="text-[10px] text-[#14213D]/50">{s.date}</div>}
        </li>
      ))}
    </ol>
  );
}

export default function CustomerPortalPage() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Filled in once the number + code are accepted
  const [unlocked, setUnlocked] = useState(false);
  const [name, setName] = useState("");
  const [phones, setPhones] = useState<MyPhone[]>([]);

  async function lookup(e?: FormEvent) {
    e?.preventDefault();
    setError("");
    if (phone.replace(/\D/g, "").length < 8 || code.replace(/[^A-Za-z0-9]/g, "").length < 4) {
      setError("Please type your phone number and the code the shop gave you.");
      return;
    }
    setBusy(true);
    const { data, error: err } = await db.rpc("portal_lookup", { p_phone: phone, p_code: code });
    setBusy(false);

    if (err) {
      setError(
        err.message?.includes("portal_lookup")
          ? "The portal is not switched on yet. Please ask the shop."
          : "Something went wrong. Please try again in a minute."
      );
      return;
    }
    if (!data?.ok) {
      setError(
        data?.reason === "locked"
          ? "Too many tries. Please wait 15 minutes and try again, or ask the shop."
          : data?.reason === "invalid"
          ? "Please type your phone number and the code the shop gave you."
          : "That phone number and code do not match. Please check them and try again."
      );
      return;
    }
    setName(data.name ?? "");
    setPhones((data.phones as MyPhone[]) ?? []);
    setUnlocked(true);
  }

  function close() {
    setUnlocked(false);
    setPhones([]);
    setName("");
    setCode("");
    setError("");
  }

  const inShop = phones.filter((p) => p.status === "available" || p.status === "reserved").length;
  const sold = phones.filter((p) => p.status === "sold").length;
  const waiting = phones.filter((p) => p.status === "sold" && !p.owner_paid_at);
  const waitingTotal = waiting.reduce((sum, p) => sum + Number((p.owner_payout ?? p.owner_price) ?? 0), 0);

  return (
    <main className="min-h-screen bg-[#F4EDE2] text-[#14213D]">
      <header className="bg-[#14213D] text-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <div>
            <div className="text-lg font-extrabold tracking-wide">
              NOVA<span className="text-[#F28C28]">&amp;</span>YOU
            </div>
            <div className="text-xs text-white/60">Customer portal</div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/" className="text-white/70 hover:text-white">
              Shop
            </Link>
            {unlocked && (
              <button onClick={close} className="rounded-full border border-white/30 px-3 py-1 text-white/80 hover:bg-white/10">
                Close
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6">
        {/* Step 1: phone number + code */}
        {!unlocked && (
          <form onSubmit={lookup} className="mx-auto mt-6 max-w-md rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[#14213D]/10">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#F28C28]/15 text-2xl">📱</div>
            <h1 className="text-center text-xl font-extrabold">Check your phone</h1>
            <p className="mt-2 text-center text-sm text-[#14213D]/70">
              Left a phone with us to sell? See where it is, without calling or texting.
            </p>

            <label className="mt-5 block text-xs font-semibold text-[#14213D]/70">Your phone number</label>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 99 123456"
              className="mt-1 w-full rounded-xl border border-[#14213D]/20 px-4 py-3 text-base outline-none focus:border-[#F28C28] focus:ring-2 focus:ring-[#F28C28]/30"
            />

            <label className="mt-4 block text-xs font-semibold text-[#14213D]/70">Code from the shop</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              autoCapitalize="characters"
              autoComplete="off"
              maxLength={12}
              placeholder="e.g. K7M2QX"
              className="mt-1 w-full rounded-xl border border-[#14213D]/20 px-4 py-3 font-mono text-base uppercase tracking-widest outline-none focus:border-[#F28C28] focus:ring-2 focus:ring-[#F28C28]/30"
            />

            {error && <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{error}</p>}

            <button
              type="submit"
              disabled={busy}
              className="mt-5 w-full rounded-full bg-[#F28C28] py-3 font-bold text-white transition hover:bg-[#C2570C] disabled:opacity-50"
            >
              {busy ? "Checking…" : "Check my phones"}
            </button>
            <p className="mt-3 text-center text-xs text-[#14213D]/50">
              We only use your number to show you your own phones. Lost your code? Ask the shop.
            </p>
          </form>
        )}

        {/* Step 2: their phones */}
        {unlocked && (
          <>
            <div className="mb-5">
              <h1 className="text-2xl font-extrabold">{name ? `Hello ${name}` : "Your phones"}</h1>
              <p className="text-sm text-[#14213D]/60">Here is where your phones are right now.</p>
            </div>

            <div className="mb-5 grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-white p-3 text-center ring-1 ring-[#14213D]/10">
                <div className="text-2xl font-extrabold text-[#C2570C]">{inShop}</div>
                <div className="text-xs text-[#14213D]/60">In the shop</div>
              </div>
              <div className="rounded-2xl bg-white p-3 text-center ring-1 ring-[#14213D]/10">
                <div className="text-2xl font-extrabold text-emerald-700">{sold}</div>
                <div className="text-xs text-[#14213D]/60">Sold</div>
              </div>
              <div className="rounded-2xl bg-white p-3 text-center ring-1 ring-[#14213D]/10">
                <div className="text-2xl font-extrabold text-[#14213D]">{money(waitingTotal)}</div>
                <div className="text-xs text-[#14213D]/60">Waiting to be paid</div>
              </div>
            </div>

            <div className="space-y-4">
              {phones.map((p) => {
                const st = STATUS[p.status] ?? STATUS.available;
                const title = [p.brand, p.model].filter(Boolean).join(" ") || "Phone";
                const specs = [p.storage, p.ram && p.ram + " RAM", p.color].filter(Boolean).join(" · ");
                const paid = p.status === "sold" && !!p.owner_paid_at;
                const payout = p.owner_payout ?? p.owner_price;
                const changed = p.owner_payout !== null && p.owner_payout !== undefined && p.owner_payout !== p.owner_price;
                return (
                  <article key={p.id} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#14213D]/10">
                    <div className="flex gap-4 p-4">
                      {p.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.image_url} alt={title} className="h-24 w-24 flex-none rounded-xl object-cover" />
                      ) : (
                        <div className="flex h-24 w-24 flex-none items-center justify-center rounded-xl bg-[#F4EDE2] text-3xl">📱</div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <h2 className="text-lg font-extrabold leading-tight">{title}</h2>
                          <span className={"rounded-full px-3 py-1 text-xs font-bold ring-1 " + st.pill}>{st.label}</span>
                        </div>
                        {specs && <p className="mt-0.5 text-sm text-[#14213D]/70">{specs}</p>}
                        <p className="mt-1 text-sm text-[#14213D]/80">{st.text}</p>
                        <p className="mt-1 text-sm">
                          {changed && p.status === "sold" ? "Agreed price" : "Your price"}: <b>{money(p.owner_price)}</b>
                          {changed && p.status === "sold" && (
                            <>
                              {" "}
                              · Final amount for you: <b>{money(payout)}</b>
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="px-4 pb-4">
                      <Steps p={p} />

                      {p.status === "sold" && (
                        <p
                          className={
                            "mt-4 rounded-xl px-3 py-2 text-sm font-semibold " +
                            (paid ? "bg-emerald-50 text-emerald-800" : "bg-[#FFB347]/25 text-[#8a4a0a]")
                          }
                        >
                          {paid
                            ? `You were paid ${money(payout)} on ${fmtDate(p.owner_paid_at)}.`
                            : `Sold on ${fmtDate(p.sold_at) || "-"}. Your payment of ${money(payout)} is being prepared.`}
                        </p>
                      )}

                      {p.shop_message && (
                        <div className="mt-4 rounded-xl border-l-4 border-[#F28C28] bg-[#F4EDE2] px-3 py-2">
                          <div className="text-[11px] font-bold uppercase tracking-wide text-[#C2570C]">Message from the shop</div>
                          <p className="mt-0.5 whitespace-pre-line text-sm">{p.shop_message}</p>
                        </div>
                      )}

                      <details className="mt-4 text-sm">
                        <summary className="cursor-pointer font-semibold text-[#C2570C]">Phone details</summary>
                        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[#14213D]/80">
                          {p.imei && (
                            <>
                              <dt className="text-[#14213D]/50">IMEI</dt>
                              <dd>{p.imei}</dd>
                            </>
                          )}
                          {p.condition && (
                            <>
                              <dt className="text-[#14213D]/50">Condition</dt>
                              <dd>{p.condition}</dd>
                            </>
                          )}
                          {p.battery_health && (
                            <>
                              <dt className="text-[#14213D]/50">Battery</dt>
                              <dd>{String(p.battery_health).includes("%") ? p.battery_health : p.battery_health + "%"}</dd>
                            </>
                          )}
                          {p.problems && (
                            <>
                              <dt className="text-[#14213D]/50">Problems noted</dt>
                              <dd>{p.problems}</dd>
                            </>
                          )}
                          {p.accessories && (
                            <>
                              <dt className="text-[#14213D]/50">Accessories</dt>
                              <dd>{p.accessories}</dd>
                            </>
                          )}
                          {p.received_at && (
                            <>
                              <dt className="text-[#14213D]/50">Brought in</dt>
                              <dd>{fmtDate(p.received_at)}</dd>
                            </>
                          )}
                        </dl>
                      </details>
                    </div>
                  </article>
                );
              })}
            </div>

            <button
              onClick={() => lookup()}
              disabled={busy}
              className="mx-auto mt-6 block rounded-full border border-[#14213D]/20 px-5 py-2 text-sm font-semibold hover:bg-white disabled:opacity-50"
            >
              {busy ? "Refreshing…" : "Refresh"}
            </button>
          </>
        )}

        <p className="mt-10 text-center text-xs text-[#14213D]/40">NOVA&amp;YOU is a practice project.</p>
      </div>
    </main>
  );
}
