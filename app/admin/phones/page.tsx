"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { db } from "../../../lib/db";

type Phone = {
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
  consignor_name: string | null;
  consignor_phone: string | null;
  portal_code: string | null;
  owner_price: number | null;
  owner_payout: number | null;
  display_price: number | null;
  status: string;
  notes: string | null;
  shop_message: string | null;
  show_online: boolean | null;
  image_url: string | null;
  received_at: string | null;
  sold_at: string | null;
  sold_price: number | null;
  owner_paid_at: string | null;
};

type Form = {
  brand: string;
  model: string;
  storage: string;
  ram: string;
  color: string;
  imei: string;
  battery_health: string;
  condition: string;
  problems: string;
  accessories: string;
  consignor_name: string;
  consignor_phone: string;
  portal_code: string;
  owner_price: string;
  owner_payout: string;
  display_price: string;
  status: string;
  notes: string;
  shop_message: string;
  show_online: boolean;
  received_at: string;
};

const today = () => new Date().toISOString().slice(0, 10);

const EMPTY: Form = {
  brand: "",
  model: "",
  storage: "",
  ram: "",
  color: "",
  imei: "",
  battery_health: "",
  condition: "Good",
  problems: "",
  accessories: "",
  consignor_name: "",
  consignor_phone: "",
  portal_code: "",
  owner_price: "",
  owner_payout: "",
  display_price: "",
  status: "available",
  notes: "",
  shop_message: "",
  show_online: false,
  received_at: today(),
};

const STATUSES = ["available", "reserved", "sold", "returned"] as const;

const PILL: Record<string, string> = {
  available: "bg-[#F28C28]/15 text-[#C2570C] ring-[#F28C28]/40",
  reserved: "bg-[#FFB347]/25 text-[#8a4a0a] ring-[#FFB347]/60",
  sold: "bg-emerald-100 text-emerald-800 ring-emerald-300",
  returned: "bg-slate-200 text-slate-700 ring-slate-300",
};

const money = (n: number | null | undefined) =>
  n === null || n === undefined ? "-" : "€" + Number(n).toLocaleString("en-GB", { maximumFractionDigits: 2 });

function fmtDate(d: string | null) {
  if (!d) return "";
  const x = new Date(d);
  return isNaN(x.getTime()) ? "" : x.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// What the owner really gets: the final payout if one was set, otherwise the agreed price.
const payoutOf = (p: { owner_payout: number | null; owner_price: number | null }) =>
  p.owner_payout !== null && p.owner_payout !== undefined ? p.owner_payout : p.owner_price;

const toNum = (s: string) => (s.trim() === "" ? null : Number(s));
const toText = (s: string) => (s.trim() === "" ? null : s.trim());

// Last 8 digits of a phone number, so "+357 99 123456" and "99123456" match.
const phoneKey = (s: string) => {
  const digits = s.replace(/\D/g, "");
  return digits.length >= 8 ? digits.slice(-8) : "";
};

// 6-character code without confusing letters (no 0/O, 1/I).
function makeCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % 32]).join("");
}

export default function AdminPhonesPage() {
  const [phones, setPhones] = useState<Phone[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState<"all" | (typeof STATUSES)[number]>("all");
  const [q, setQ] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | number | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [photo, setPhoto] = useState<File | null>(null);
  const [existingImage, setExistingImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // per-phone quick message boxes
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    const { data, error } = await db.from("phones").select("*").order("received_at", { ascending: false });
    if (error) setErr("Could not load phones: " + error.message);
    else {
      setErr("");
      setPhones((data as Phone[]) ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function flash(text: string) {
    setMsg(text);
    setTimeout(() => setMsg(""), 3500);
  }

  function set<K extends keyof Form>(k: K, v: Form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function openNew() {
    setEditId(null);
    setForm({ ...EMPTY, received_at: today() });
    setPhoto(null);
    setExistingImage(null);
    setShowForm(true);
    setErr("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openEdit(p: Phone) {
    setEditId(p.id);
    setForm({
      brand: p.brand ?? "",
      model: p.model ?? "",
      storage: p.storage ?? "",
      ram: p.ram ?? "",
      color: p.color ?? "",
      imei: p.imei ?? "",
      battery_health: p.battery_health === null || p.battery_health === undefined ? "" : String(p.battery_health),
      condition: p.condition ?? "",
      problems: p.problems ?? "",
      accessories: p.accessories ?? "",
      consignor_name: p.consignor_name ?? "",
      consignor_phone: p.consignor_phone ?? "",
      portal_code: p.portal_code ?? "",
      owner_price: p.owner_price === null ? "" : String(p.owner_price),
      owner_payout: p.owner_payout === null || p.owner_payout === undefined ? "" : String(p.owner_payout),
      display_price: p.display_price === null ? "" : String(p.display_price),
      status: p.status,
      notes: p.notes ?? "",
      shop_message: p.shop_message ?? "",
      show_online: !!p.show_online,
      received_at: p.received_at ? p.received_at.slice(0, 10) : today(),
    });
    setPhoto(null);
    setExistingImage(p.image_url);
    setShowForm(true);
    setErr("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeForm() {
    setShowForm(false);
    setEditId(null);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setErr("");
    if (!form.brand.trim() || !form.model.trim()) {
      setErr("Please fill in at least the brand and the model.");
      return;
    }
    const key = phoneKey(form.consignor_phone);
    if (form.consignor_phone.trim() && !key) {
      setErr("The owner's phone number needs at least 8 digits, so they can use the portal.");
      return;
    }
    // One code per owner phone number: reuse it if this owner already has one.
    let code: string | null = form.portal_code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "") || null;
    if (!key) code = null;
    else if (!code) code = phones.find((x) => x.portal_code && phoneKey(x.consignor_phone ?? "") === key)?.portal_code ?? makeCode();
    if (code && code.length < 4) {
      setErr("The portal code needs at least 4 letters or numbers.");
      return;
    }
    setSaving(true);

    let image_url = existingImage;
    if (photo) {
      const ext = (photo.name.split(".").pop() || "jpg").toLowerCase();
      const path = `phones/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const up = await db.storage.from("product-images").upload(path, photo);
      if (up.error) {
        setErr("Photo upload failed: " + up.error.message);
        setSaving(false);
        return;
      }
      image_url = db.storage.from("product-images").getPublicUrl(path).data.publicUrl;
    }

    const row = {
      brand: toText(form.brand),
      model: toText(form.model),
      storage: toText(form.storage),
      ram: toText(form.ram),
      color: toText(form.color),
      imei: toText(form.imei),
      battery_health: toText(form.battery_health),
      condition: toText(form.condition),
      problems: toText(form.problems),
      accessories: toText(form.accessories),
      consignor_name: toText(form.consignor_name),
      consignor_phone: toText(form.consignor_phone),
      portal_code: code,
      owner_price: toNum(form.owner_price),
      owner_payout: toNum(form.owner_payout),
      display_price: toNum(form.display_price),
      status: form.status,
      notes: toText(form.notes),
      shop_message: toText(form.shop_message),
      show_online: form.show_online,
      received_at: form.received_at || today(),
      image_url,
    };

    const res =
      editId === null ? await db.from("phones").insert(row) : await db.from("phones").update(row).eq("id", editId);

    setSaving(false);
    if (res.error) {
      setErr(
        res.error.code === "23505"
          ? "A phone with this IMEI is already in the list."
          : res.error.message.includes("portal_code") || res.error.message.includes("owner_payout") || res.error.message.includes("shop_message") || res.error.message.includes("show_online")
          ? "The database is missing the new columns - run the SQL step first."
          : "Could not save: " + res.error.message
      );
      return;
    }
    if (code && key) {
      const others = phones
        .filter((x) => x.id !== editId && phoneKey(x.consignor_phone ?? "") === key && x.portal_code !== code)
        .map((x) => x.id);
      if (others.length) await db.from("phones").update({ portal_code: code }).in("id", others);
    }
    flash(editId === null ? "Phone added." : "Phone saved.");
    closeForm();
    load();
  }

  async function patch(p: Phone, changes: Partial<Phone>, done: string) {
    const { error } = await db.from("phones").update(changes).eq("id", p.id);
    if (error) setErr("Could not update: " + error.message);
    else {
      setErr("");
      flash(done);
      load();
    }
  }

  function markSold(p: Phone) {
    const answer = window.prompt("Sold for how much (€)?", p.display_price === null ? "" : String(p.display_price));
    if (answer === null) return;
    const price = Number(answer.replace(",", "."));
    if (answer.trim() === "" || isNaN(price)) {
      setErr("Please type the selling price as a number.");
      return;
    }

    const agreed = p.owner_price; // what the owner wants
    const listed = p.display_price; // the price on the shelf
    let payout: number | null = p.owner_payout ?? null; // null = the owner gets the agreed price
    let ownerNote: string | null = null;

    if (agreed !== null && listed !== null && price < listed) {
      // Sold below the shelf price: the shop keeps its agreed commission, the owner takes the discount.
      const commission = Math.max(0, listed - agreed);
      const suggested = Math.max(0, price - commission);
      const reply = window.prompt(
        `Sold for ${money(price)}, which is ${money(listed - price)} below the listed ${money(listed)}.\n\n` +
          `The shop keeps its agreed commission of ${money(commission)}, so the owner gets ${money(suggested)}.\n\n` +
          `How much does the owner get (€)?\nChange it only if you agreed something different with the owner.`,
        String(suggested)
      );
      if (reply === null) return;
      const n = Number(reply.replace(",", "."));
      if (reply.trim() === "" || isNaN(n) || n < 0) {
        setErr("Please type the owner's payout as a number.");
        return;
      }
      payout = n === agreed ? null : n;
      if (payout !== null) {
        ownerNote = `Sold for ${money(price)} (listed at ${money(listed)}, then a customer discount). Your final amount is ${money(payout)} instead of the agreed ${money(agreed)}.`;
      }
    } else if (agreed !== null && listed === null && price < agreed) {
      // No shelf price recorded: just ask what the owner gets.
      const reply = window.prompt(
        `Sold for ${money(price)}, which is ${money(agreed - price)} below the agreed ${money(agreed)}.\n\n` +
          `How much does the owner get (€)?\nKeep ${agreed} if the shop takes the loss. Type a lower amount only if the owner agreed.`,
        String(agreed)
      );
      if (reply === null) return;
      const n = Number(reply.replace(",", "."));
      if (reply.trim() === "" || isNaN(n) || n < 0) {
        setErr("Please type the owner's payout as a number.");
        return;
      }
      payout = n === agreed ? null : n;
      if (payout !== null) {
        ownerNote = `Sold for ${money(price)}. Your final amount is ${money(payout)} instead of the agreed ${money(agreed)}.`;
      }
    }

    const finalPayout = payout !== null ? payout : agreed;
    if (finalPayout !== null && price - finalPayout < 0) {
      const ok = window.confirm(
        `The shop will lose ${money(finalPayout - price)} on this phone ` +
          `(sold ${money(price)}, owner gets ${money(finalPayout)}).\n\nContinue?`
      );
      if (!ok) return;
    }

    const changes: Partial<Phone> = {
      status: "sold",
      sold_price: price,
      owner_payout: payout,
      sold_at: new Date().toISOString(),
    };
    // Tell the owner why the amount is different, unless you already wrote a message.
    const addNote = !!ownerNote && !(p.shop_message ?? "").trim();
    if (addNote) changes.shop_message = ownerNote;
    patch(p, changes, addNote ? "Marked as sold. A message was added to the owner's portal." : "Marked as sold.");
  }

  function markPaid(p: Phone) {
    if (!window.confirm(`Mark ${p.consignor_name || "the owner"} as paid ${money(payoutOf(p))} for this phone?`)) return;
    patch(p, { owner_paid_at: new Date().toISOString() }, "Owner marked as paid.");
  }

  async function remove(p: Phone) {
    if (!window.confirm(`Delete ${p.brand ?? ""} ${p.model ?? ""} for good?`)) return;
    const { error } = await db.from("phones").delete().eq("id", p.id);
    if (error) setErr("Could not delete: " + error.message);
    else {
      flash("Deleted.");
      load();
    }
  }

  async function copyInvite(p: Phone) {
    const link = window.location.origin + "/portal";
    const text =
      `Hi${p.consignor_name ? " " + p.consignor_name : ""}! You can check the status of your phone any time at ${link}\n` +
      `Type your phone number and this code: ${p.portal_code}`;
    try {
      await navigator.clipboard.writeText(text);
      flash("Message copied - paste it into WhatsApp or SMS.");
    } catch {
      window.prompt("Copy this message:", text);
    }
  }

  async function saveMessage(p: Phone) {
    const text = (drafts[String(p.id)] ?? p.shop_message ?? "").trim();
    await patch(p, { shop_message: text === "" ? null : text }, "Message saved - the owner can see it now.");
    setDrafts((d) => {
      const n = { ...d };
      delete n[String(p.id)];
      return n;
    });
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: phones.length };
    for (const s of STATUSES) c[s] = phones.filter((p) => p.status === s).length;
    return c;
  }, [phones]);

  const owed = useMemo(
    () => phones.filter((p) => p.status === "sold" && !p.owner_paid_at).reduce((s, p) => s + Number(payoutOf(p) ?? 0), 0),
    [phones]
  );
  const margin = useMemo(
    () =>
      phones
        .filter((p) => p.status === "sold" && p.sold_price !== null && payoutOf(p) !== null)
        .reduce((s, p) => s + (Number(p.sold_price) - Number(payoutOf(p))), 0),
    [phones]
  );

  const shown = phones.filter((p) => {
    if (filter !== "all" && p.status !== filter) return false;
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return [p.brand, p.model, p.imei, p.consignor_name, p.consignor_phone, p.color]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(needle);
  });

  const input =
    "w-full rounded-lg border border-[#14213D]/20 bg-white px-3 py-2 text-sm outline-none focus:border-[#F28C28] focus:ring-2 focus:ring-[#F28C28]/30";
  const label = "mb-1 block text-xs font-semibold text-[#14213D]/70";

  return (
    <div className="text-[#14213D]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Phones on consignment</h1>
          <p className="text-sm text-[#14213D]/60">Phones that owners bring in for the shop to sell.</p>
        </div>
        <button onClick={openNew} className="rounded-full bg-[#F28C28] px-5 py-2 font-bold text-white hover:bg-[#C2570C]">
          + Add phone
        </button>
      </div>

      {msg && <p className="mb-3 rounded-lg bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200">{msg}</p>}
      {err && <p className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 ring-1 ring-red-200">{err}</p>}

      {/* Numbers */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-2xl bg-white p-3 ring-1 ring-[#14213D]/10">
          <div className="text-xs text-[#14213D]/60">In the shop</div>
          <div className="text-2xl font-extrabold text-[#C2570C]">{(counts.available ?? 0) + (counts.reserved ?? 0)}</div>
        </div>
        <div className="rounded-2xl bg-white p-3 ring-1 ring-[#14213D]/10">
          <div className="text-xs text-[#14213D]/60">Sold</div>
          <div className="text-2xl font-extrabold text-emerald-700">{counts.sold ?? 0}</div>
        </div>
        <div className="rounded-2xl bg-white p-3 ring-1 ring-[#14213D]/10">
          <div className="text-xs text-[#14213D]/60">Owed to owners</div>
          <div className="text-2xl font-extrabold">{money(owed)}</div>
        </div>
        <div className="rounded-2xl bg-white p-3 ring-1 ring-[#14213D]/10">
          <div className="text-xs text-[#14213D]/60">Shop made (sold − owner payout)</div>
          <div className="text-2xl font-extrabold">{money(margin)}</div>
        </div>
      </div>

      {/* Add / edit form */}
      {showForm && (
        <form onSubmit={save} className="mb-6 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#14213D]/10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-extrabold">{editId === null ? "Add a phone" : "Edit phone"}</h2>
            <button type="button" onClick={closeForm} className="text-sm font-semibold text-[#14213D]/60 hover:text-[#14213D]">
              Close ✕
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div>
              <label className={label}>Brand *</label>
              <input className={input} value={form.brand} onChange={(e) => set("brand", e.target.value)} placeholder="Samsung" />
            </div>
            <div>
              <label className={label}>Model *</label>
              <input className={input} value={form.model} onChange={(e) => set("model", e.target.value)} placeholder="Galaxy S23" />
            </div>
            <div>
              <label className={label}>Storage</label>
              <input className={input} value={form.storage} onChange={(e) => set("storage", e.target.value)} placeholder="256GB" />
            </div>
            <div>
              <label className={label}>RAM</label>
              <input className={input} value={form.ram} onChange={(e) => set("ram", e.target.value)} placeholder="8GB" />
            </div>
            <div>
              <label className={label}>Colour</label>
              <input className={input} value={form.color} onChange={(e) => set("color", e.target.value)} placeholder="Black" />
            </div>
            <div className="col-span-2">
              <label className={label}>IMEI</label>
              <input className={input} value={form.imei} onChange={(e) => set("imei", e.target.value)} placeholder="15 digits (dial *#06#)" />
            </div>
            <div>
              <label className={label}>Battery health</label>
              <input className={input} value={form.battery_health} onChange={(e) => set("battery_health", e.target.value)} placeholder="87%" />
            </div>
            <div>
              <label className={label}>Condition</label>
              <input
                className={input}
                list="conditions"
                value={form.condition}
                onChange={(e) => set("condition", e.target.value)}
                placeholder="Good"
              />
              <datalist id="conditions">
                <option value="Like new" />
                <option value="Good" />
                <option value="Fair" />
                <option value="Poor" />
              </datalist>
            </div>
            <div className="col-span-2">
              <label className={label}>Problems</label>
              <textarea className={input} rows={2} value={form.problems} onChange={(e) => set("problems", e.target.value)} placeholder="Small scratch on the screen, camera focus is slow..." />
            </div>
            <div className="col-span-2">
              <label className={label}>Accessories</label>
              <textarea className={input} rows={2} value={form.accessories} onChange={(e) => set("accessories", e.target.value)} placeholder="Box, charger, case" />
            </div>
          </div>

          <h3 className="mb-2 mt-5 text-sm font-extrabold uppercase tracking-wide text-[#C2570C]">Owner</h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div>
              <label className={label}>Owner name</label>
              <input className={input} value={form.consignor_name} onChange={(e) => set("consignor_name", e.target.value)} />
            </div>
            <div>
              <label className={label}>Owner phone</label>
              <input className={input} value={form.consignor_phone} onChange={(e) => set("consignor_phone", e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className={label}>Portal code (for the owner)</label>
              <div className="flex gap-2">
                <input
                  className={input + " font-mono uppercase tracking-widest"}
                  value={form.portal_code}
                  onChange={(e) => set("portal_code", e.target.value.toUpperCase())}
                  maxLength={12}
                  placeholder="made automatically when you save"
                />
                <button
                  type="button"
                  onClick={() => set("portal_code", makeCode())}
                  className="whitespace-nowrap rounded-lg border border-[#14213D]/20 px-3 py-2 text-sm font-semibold hover:bg-[#F4EDE2]"
                >
                  New code
                </button>
              </div>
              <p className="mt-1 text-xs text-[#14213D]/60">
                The owner types their phone number + this code on the portal page. All phones of the same owner share one code.
              </p>
            </div>
            <div>
              <label className={label}>Owner wants (€)</label>
              <input className={input} inputMode="decimal" value={form.owner_price} onChange={(e) => set("owner_price", e.target.value)} />
            </div>
            <div>
              <label className={label}>Display price (€)</label>
              <input className={input} inputMode="decimal" value={form.display_price} onChange={(e) => set("display_price", e.target.value)} />
            </div>
            <div>
              <label className={label}>Final payout (€)</label>
              <input
                className={input}
                inputMode="decimal"
                value={form.owner_payout}
                onChange={(e) => set("owner_payout", e.target.value)}
                placeholder="empty = same as Owner wants"
              />
            </div>
            <div>
              <label className={label}>Status</label>
              <select className={input} value={form.status} onChange={(e) => set("status", e.target.value)}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Brought in on</label>
              <input className={input} type="date" value={form.received_at} onChange={(e) => set("received_at", e.target.value)} />
            </div>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <label className={label}>Message from the shop (the owner sees this)</label>
              <textarea
                className={input}
                rows={3}
                value={form.shop_message}
                onChange={(e) => set("shop_message", e.target.value)}
                placeholder="e.g. Customer is coming back tomorrow to look at it."
              />
            </div>
            <div>
              <label className={label}>Private notes (only you see these)</label>
              <textarea className={input} rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
            </div>
          </div>

          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl bg-[#F4EDE2] p-3">
            <input
              type="checkbox"
              checked={form.show_online}
              onChange={(e) => set("show_online", e.target.checked)}
              className="mt-0.5 h-5 w-5 accent-[#F28C28]"
            />
            <span className="text-sm">
              <b>Show on the website</b> (Phones for sale page)
              <span className="block text-xs text-[#14213D]/60">
                Customers see the specs, problems, condition, photo and display price. Never the owner, IMEI, owner price or private notes.
              </span>
            </span>
          </label>

          <div className="mt-3">
            <label className={label}>Photo</label>
            <div className="flex items-center gap-3">
              {existingImage && !photo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={existingImage} alt="" className="h-14 w-14 rounded-lg object-cover" />
              )}
              <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} className="text-sm" />
            </div>
          </div>

          <div className="mt-5 flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-[#14213D] px-6 py-2 font-bold text-white hover:bg-[#14213D]/85 disabled:opacity-50"
            >
              {saving ? "Saving…" : editId === null ? "Add phone" : "Save changes"}
            </button>
            <button type="button" onClick={closeForm} className="rounded-full border border-[#14213D]/20 px-5 py-2 font-semibold hover:bg-[#F4EDE2]">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(["all", ...STATUSES] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={
              "rounded-full px-4 py-1.5 text-sm font-semibold capitalize ring-1 " +
              (filter === s ? "bg-[#14213D] text-white ring-[#14213D]" : "bg-white text-[#14213D] ring-[#14213D]/15 hover:bg-[#F4EDE2]")
            }
          >
            {s} <span className="opacity-60">{counts[s] ?? 0}</span>
          </button>
        ))}
        <input
          className={input + " md:ml-auto md:max-w-xs"}
          placeholder="Search brand, model, IMEI, owner…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {loading && <p className="py-10 text-center text-[#14213D]/60">Loading…</p>}
      {!loading && shown.length === 0 && (
        <p className="rounded-2xl bg-white p-8 text-center text-[#14213D]/60 ring-1 ring-[#14213D]/10">
          {phones.length === 0 ? "No phones yet. Click “+ Add phone” to add the first one." : "No phones match this filter."}
        </p>
      )}

      {/* The phones */}
      <div className="space-y-3">
        {shown.map((p) => {
          const draft = drafts[String(p.id)];
          const messageChanged = draft !== undefined && draft.trim() !== (p.shop_message ?? "").trim();
          return (
            <div key={p.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#14213D]/10">
              <div className="flex gap-4">
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image_url} alt="" className="h-20 w-20 flex-none rounded-xl object-cover" />
                ) : (
                  <div className="flex h-20 w-20 flex-none items-center justify-center rounded-xl bg-[#F4EDE2] text-2xl">📱</div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="text-lg font-extrabold leading-tight">
                        {p.brand} {p.model}
                      </div>
                      <div className="text-sm text-[#14213D]/70">
                        {[p.storage, p.ram && p.ram + " RAM", p.color, p.condition].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    <span className={"rounded-full px-3 py-1 text-xs font-bold capitalize ring-1 " + (PILL[p.status] ?? PILL.available)}>
                      {p.status}
                    </span>
                  </div>
                  {p.show_online && (p.status === "available" || p.status === "reserved") && (
                    <div className="mt-1 text-xs font-bold text-emerald-700">🌐 Visible on the website</div>
                  )}

                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5 text-sm md:grid-cols-4">
                    <div>
                      <span className="text-[#14213D]/50">Owner wants </span>
                      <b>{money(p.owner_price)}</b>
                    </div>
                    <div>
                      <span className="text-[#14213D]/50">Display </span>
                      <b>{money(p.display_price)}</b>
                    </div>
                    {p.status === "sold" && (
                      <div>
                        <span className="text-[#14213D]/50">Sold for </span>
                        <b>{money(p.sold_price)}</b>
                      </div>
                    )}
                    {p.status === "sold" && (
                      <div>
                        <span className="text-[#14213D]/50">Owner </span>
                        <b className={p.owner_paid_at ? "text-emerald-700" : "text-[#C2570C]"}>
                          {p.owner_paid_at ? "paid " + fmtDate(p.owner_paid_at) : "not paid yet"}
                        </b>
                      </div>
                    )}
                  </div>
                  {p.status === "sold" && p.sold_price !== null && payoutOf(p) !== null && (
                    <div className="mt-1 text-sm">
                      <span className="text-[#14213D]/50">Owner gets </span>
                      <b>{money(payoutOf(p))}</b>
                      {p.owner_payout !== null && p.owner_payout !== undefined && p.owner_payout !== p.owner_price && (
                        <span className="text-[#14213D]/50"> (agreed {money(p.owner_price)})</span>
                      )}
                      <span className="text-[#14213D]/50"> · Shop made </span>
                      <b className={Number(p.sold_price) - Number(payoutOf(p)) < 0 ? "text-red-600" : "text-emerald-700"}>
                        {money(Number(p.sold_price) - Number(payoutOf(p)))}
                      </b>
                    </div>
                  )}

                  <div className="mt-1 text-sm text-[#14213D]/70">
                    {[p.consignor_name, p.consignor_phone].filter(Boolean).join(" · ") || "No owner details"}
                    {p.imei && <span> · IMEI {p.imei}</span>}
                    {p.received_at && <span> · in since {fmtDate(p.received_at)}</span>}
                  </div>
                  {p.portal_code && (
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                      <span className="text-[#14213D]/50">Portal code</span>
                      <b className="rounded bg-[#F4EDE2] px-2 py-0.5 font-mono tracking-widest">{p.portal_code}</b>
                      <button
                        onClick={() => copyInvite(p)}
                        className="rounded-full border border-[#F28C28] px-3 py-0.5 text-xs font-semibold text-[#C2570C] hover:bg-[#F28C28]/10"
                      >
                        Copy message for owner
                      </button>
                    </div>
                  )}
                  {p.problems && <div className="mt-1 text-sm text-[#8a4a0a]">⚠ {p.problems}</div>}
                  {p.notes && <div className="mt-1 text-sm italic text-[#14213D]/60">Private: {p.notes}</div>}
                </div>
              </div>

              {/* Message to the owner */}
              <div className="mt-3 flex flex-col gap-2 md:flex-row">
                <input
                  className={input}
                  placeholder={p.portal_code ? "Message the owner will see in the portal…" : "Add the owner’s phone number (Edit) so they can use the portal…"}
                  value={draft ?? p.shop_message ?? ""}
                  onChange={(e) => setDrafts((d) => ({ ...d, [String(p.id)]: e.target.value }))}
                />
                <button
                  onClick={() => saveMessage(p)}
                  disabled={!messageChanged}
                  className="rounded-lg bg-[#14213D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#14213D]/85 disabled:opacity-30"
                >
                  Save message
                </button>
              </div>

              {/* Actions */}
              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                <button onClick={() => openEdit(p)} className="rounded-full border border-[#14213D]/20 px-3 py-1 font-semibold hover:bg-[#F4EDE2]">
                  Edit
                </button>
                {p.status === "available" && (
                  <button onClick={() => patch(p, { status: "reserved" }, "Marked as reserved.")} className="rounded-full border border-[#F28C28] px-3 py-1 font-semibold text-[#C2570C] hover:bg-[#F28C28]/10">
                    Reserve
                  </button>
                )}
                {(p.status === "available" || p.status === "reserved") && (
                  <button onClick={() => markSold(p)} className="rounded-full bg-emerald-600 px-3 py-1 font-semibold text-white hover:bg-emerald-700">
                    Mark sold
                  </button>
                )}
                {p.status === "sold" && !p.owner_paid_at && (
                  <button onClick={() => markPaid(p)} className="rounded-full bg-[#F28C28] px-3 py-1 font-semibold text-white hover:bg-[#C2570C]">
                    Mark owner paid
                  </button>
                )}
                {(p.status === "available" || p.status === "reserved") && (
                  <button onClick={() => patch(p, { status: "returned" }, "Marked as returned to owner.")} className="rounded-full border border-[#14213D]/20 px-3 py-1 font-semibold hover:bg-[#F4EDE2]">
                    Return to owner
                  </button>
                )}
                {(p.status === "reserved" || p.status === "returned") && (
                  <button onClick={() => patch(p, { status: "available" }, "Back on display.")} className="rounded-full border border-[#14213D]/20 px-3 py-1 font-semibold hover:bg-[#F4EDE2]">
                    Back on display
                  </button>
                )}
                {(p.status === "available" || p.status === "reserved") && (
                  <button
                    onClick={() =>
                      patch(p, { show_online: !p.show_online }, p.show_online ? "Hidden from the website." : "Now visible on the website.")
                    }
                    className="rounded-full border border-[#14213D]/20 px-3 py-1 font-semibold hover:bg-[#F4EDE2]"
                  >
                    {p.show_online ? "Hide from website" : "Show on website"}
                  </button>
                )}
                <button onClick={() => remove(p)} className="ml-auto rounded-full px-3 py-1 font-semibold text-red-600 hover:bg-red-50">
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
