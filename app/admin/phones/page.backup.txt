"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Phone = {
  id: number;
  brand: string;
  model: string;
  storage: string | null;
  ram: string | null;
  color: string | null;
  imei: string | null;
  battery_health: number | null;
  condition: string;
  problems: string | null;
  accessories: string | null;
  consignor_name: string;
  consignor_phone: string | null;
  owner_price: number | string;
  display_price: number | string;
  status: string;
  notes: string | null;
  image_url: string | null;
  received_at: string;
  sold_at: string | null;
  sold_price: number | string | null;
  owner_paid_at: string | null;
};

type Form = {
  brand: string;
  model: string;
  storage: string;
  ram: string;
  color: string;
  imei: string;
  battery: string;
  condition: string;
  problems: string;
  accessories: string;
  consignorName: string;
  consignorPhone: string;
  ownerPrice: string;
  displayPrice: string;
  notes: string;
};

const emptyForm: Form = {
  brand: "",
  model: "",
  storage: "",
  ram: "",
  color: "",
  imei: "",
  battery: "",
  condition: "good",
  problems: "",
  accessories: "",
  consignorName: "",
  consignorPhone: "",
  ownerPrice: "",
  displayPrice: "",
  notes: "",
};

const BUCKET = "product-images";
const denied = "Not allowed. Log in with the admin account.";

const CONDITIONS: [string, string][] = [
  ["like_new", "Like new"],
  ["good", "Good"],
  ["fair", "Fair"],
  ["parts", "For parts or repair"],
];

const FILTERS: [string, string][] = [
  ["available", "Available"],
  ["reserved", "Reserved"],
  ["sold", "Sold"],
  ["returned", "Returned"],
  ["all", "All"],
];

const inputClass =
  "w-full rounded-lg border border-[#E0D2BC] bg-white px-3 py-2 text-sm text-[#14213D] outline-none focus:border-[#F28C28] focus:ring-2 focus:ring-[#F28C28]/20";

function euro(n: number): string {
  return "€" + n.toFixed(2);
}

function conditionLabel(c: string): string {
  return CONDITIONS.find((x) => x[0] === c)?.[1] ?? c;
}

function statusBadge(s: string): string {
  switch (s) {
    case "sold":
      return "bg-emerald-100 text-emerald-800 border-emerald-300";
    case "reserved":
      return "bg-[#FDE7CC] text-[#C2570C] border-[#F6C48C]";
    case "returned":
      return "bg-[#EADFCB] text-[#14213D]/70 border-[#D9C9AD]";
    default:
      return "bg-[#DCE3F2] text-[#14213D] border-[#B6C3E0]";
  }
}

async function uploadImage(file: File): Promise<string | null> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = "phone-" + Date.now() + "-" + Math.random().toString(36).slice(2) + "." + ext;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file);
  if (error) return null;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export default function PhonesPage() {
  const [phones, setPhones] = useState<Phone[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState("available");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [info, setInfo] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("phones")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) setMessage(error.message);
    else setPhones((data as Phone[]) ?? []);
    setLoaded(true);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function setField(key: keyof Form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setFile(null);
    setFileKey((k) => k + 1);
    setMessage("");
    setInfo("");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openEdit(p: Phone) {
    setEditingId(p.id);
    setForm({
      brand: p.brand,
      model: p.model,
      storage: p.storage ?? "",
      ram: p.ram ?? "",
      color: p.color ?? "",
      imei: p.imei ?? "",
      battery: p.battery_health === null ? "" : String(p.battery_health),
      condition: p.condition,
      problems: p.problems ?? "",
      accessories: p.accessories ?? "",
      consignorName: p.consignor_name,
      consignorPhone: p.consignor_phone ?? "",
      ownerPrice: String(Number(p.owner_price)),
      displayPrice: String(Number(p.display_price)),
      notes: p.notes ?? "",
    });
    setFile(null);
    setFileKey((k) => k + 1);
    setMessage("");
    setInfo("");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setInfo("");

    const ownerPrice = Number(form.ownerPrice);
    const displayPrice = Number(form.displayPrice);
    if (
      form.ownerPrice.trim() === "" ||
      form.displayPrice.trim() === "" ||
      isNaN(ownerPrice) ||
      isNaN(displayPrice) ||
      ownerPrice < 0 ||
      displayPrice < 0
    ) {
      setMessage("Enter both prices as numbers, for example 250.");
      return;
    }

    let battery: number | null = null;
    if (form.battery.trim() !== "") {
      battery = Math.round(Number(form.battery));
      if (isNaN(battery) || battery < 0 || battery > 100) {
        setMessage("Battery health must be a number from 0 to 100.");
        return;
      }
    }

    setBusy(true);

    let image_url: string | undefined;
    if (file) {
      const url = await uploadImage(file);
      if (!url) {
        setBusy(false);
        setMessage("Photo upload failed. Check you are logged in as admin.");
        return;
      }
      image_url = url;
    }

    const payload = {
      brand: form.brand.trim(),
      model: form.model.trim(),
      storage: form.storage.trim() || null,
      ram: form.ram.trim() || null,
      color: form.color.trim() || null,
      imei: form.imei.trim() || null,
      battery_health: battery,
      condition: form.condition,
      problems: form.problems.trim() || null,
      accessories: form.accessories.trim() || null,
      consignor_name: form.consignorName.trim(),
      consignor_phone: form.consignorPhone.trim() || null,
      owner_price: ownerPrice,
      display_price: displayPrice,
      notes: form.notes.trim() || null,
      ...(image_url ? { image_url } : {}),
    };

    const result =
      editingId === null
        ? await supabase.from("phones").insert(payload).select()
        : await supabase.from("phones").update(payload).eq("id", editingId).select();

    setBusy(false);

    if (result.error) {
      setMessage(
        result.error.code === "23505"
          ? "A phone with this IMEI is already in the list."
          : denied
      );
      return;
    }
    if (!result.data || result.data.length === 0) {
      setMessage(denied);
      return;
    }

    setInfo(editingId === null ? "Phone added." : "Phone updated.");
    closeForm();
    load();
  }

  async function patch(p: Phone, values: Record<string, unknown>, okText: string) {
    setMessage("");
    setInfo("");
    const { data, error } = await supabase
      .from("phones")
      .update(values)
      .eq("id", p.id)
      .select();
    if (error || !data || data.length === 0) {
      setMessage(denied);
      return;
    }
    setInfo(okText);
    load();
  }

  function toggleReserve(p: Phone) {
    if (p.status === "reserved") {
      patch(p, { status: "available" }, "Reservation removed.");
    } else {
      patch(p, { status: "reserved" }, "Phone reserved.");
    }
  }

  function markSold(p: Phone) {
    const answer = window.prompt(
      "Sold price in euros for " + p.brand + " " + p.model,
      String(Number(p.display_price))
    );
    if (answer === null) return;
    const price = Number(answer);
    if (answer.trim() === "" || isNaN(price) || price < 0) {
      setMessage("Enter a valid sold price.");
      return;
    }
    const ownerPrice = Number(p.owner_price);
    if (
      price < ownerPrice &&
      !window.confirm(
        "This is less than the owner wants (" + euro(ownerPrice) + "). Continue?"
      )
    ) {
      return;
    }
    patch(
      p,
      { status: "sold", sold_at: new Date().toISOString(), sold_price: price },
      "Marked as sold. Remember to pay the owner " + euro(ownerPrice) + "."
    );
  }

  function undoSale(p: Phone) {
    if (!window.confirm("Undo this sale and put the phone back as available?")) return;
    patch(
      p,
      { status: "available", sold_at: null, sold_price: null },
      "Sale undone."
    );
  }

  function markPaid(p: Phone) {
    patch(p, { owner_paid_at: new Date().toISOString() }, "Marked as paid to the owner.");
  }

  function returnToOwner(p: Phone) {
    if (!window.confirm("Return this phone to " + p.consignor_name + "?")) return;
    patch(p, { status: "returned" }, "Phone returned to the owner.");
  }

  async function removePhone(p: Phone) {
    if (!window.confirm("Delete " + p.brand + " " + p.model + " from the list?")) return;
    setMessage("");
    setInfo("");
    const { data, error } = await supabase
      .from("phones")
      .delete()
      .eq("id", p.id)
      .select();
    if (error || !data || data.length === 0) {
      setMessage(denied);
      return;
    }
    setInfo("Phone deleted.");
    load();
  }

  const inShop = phones.filter((p) => p.status === "available" || p.status === "reserved");
  const displayValue = inShop.reduce((sum, p) => sum + Number(p.display_price), 0);
  const sold = phones.filter((p) => p.status === "sold");
  const owed = sold
    .filter((p) => !p.owner_paid_at)
    .reduce((sum, p) => sum + Number(p.owner_price), 0);
  const earned = sold.reduce(
    (sum, p) => sum + (Number(p.sold_price ?? 0) - Number(p.owner_price)),
    0
  );

  const term = search.toLowerCase();
  const shown = phones.filter((p) => {
    if (filter !== "all" && p.status !== filter) return false;
    if (!term) return true;
    return [p.brand, p.model, p.color ?? "", p.imei ?? "", p.consignor_name]
      .join(" ")
      .toLowerCase()
      .includes(term);
  });

  const card = (label: string, value: string, note?: string) => (
    <div className="rounded-xl bg-white p-4 shadow">
      <p className="text-xs uppercase text-[#14213D]/60">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {note && <p className="mt-1 text-xs text-[#14213D]/60">{note}</p>}
    </div>
  );

  const field = (label: string, node: React.ReactNode) => (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-[#14213D]/70">{label}</span>
      {node}
    </label>
  );

  return (
    <main className="min-h-screen bg-[#F4EDE2] text-[#14213D]">
      <section className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold">Phones on display</h2>
          {!showForm && (
            <button
              onClick={openAdd}
              className="rounded-lg bg-[#F28C28] px-4 py-2 text-sm font-semibold text-[#14213D] hover:bg-[#FFA033]"
            >
              Add phone
            </button>
          )}
        </div>
        <p className="mb-6 text-sm text-[#14213D]/70">
          Phones brought in by other people to sell. Only you can see this page, including the
          owner prices.
        </p>

        {message && (
          <p className="mb-6 rounded bg-red-100 p-3 text-sm text-red-700">{message}</p>
        )}
        {info && (
          <p className="mb-6 rounded bg-emerald-100 p-3 text-sm text-emerald-800">{info}</p>
        )}

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {card("In the shop", String(inShop.length), "Available and reserved")}
          {card("Display value", euro(displayValue), "At display prices")}
          {card("Owed to owners", euro(owed), "Sold, not yet paid")}
          {card("You earned", euro(earned), "From sold phones")}
        </div>

        {showForm && (
          <form onSubmit={save} className="mb-8 rounded-xl bg-white p-5 shadow">
            <h3 className="mb-4 text-lg font-semibold">
              {editingId === null ? "Add a phone" : "Edit phone"}
            </h3>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {field(
                "Brand *",
                <input
                  required
                  value={form.brand}
                  onChange={(e) => setField("brand", e.target.value)}
                  placeholder="Samsung"
                  className={inputClass}
                />
              )}
              {field(
                "Model *",
                <input
                  required
                  value={form.model}
                  onChange={(e) => setField("model", e.target.value)}
                  placeholder="Galaxy S21"
                  className={inputClass}
                />
              )}
              {field(
                "Colour",
                <input
                  value={form.color}
                  onChange={(e) => setField("color", e.target.value)}
                  placeholder="Phantom Gray"
                  className={inputClass}
                />
              )}
              {field(
                "Storage",
                <input
                  value={form.storage}
                  onChange={(e) => setField("storage", e.target.value)}
                  placeholder="128 GB"
                  className={inputClass}
                />
              )}
              {field(
                "RAM",
                <input
                  value={form.ram}
                  onChange={(e) => setField("ram", e.target.value)}
                  placeholder="8 GB"
                  className={inputClass}
                />
              )}
              {field(
                "Battery health (%)",
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={form.battery}
                  onChange={(e) => setField("battery", e.target.value)}
                  placeholder="87"
                  className={inputClass}
                />
              )}
              {field(
                "IMEI or serial number",
                <input
                  value={form.imei}
                  onChange={(e) => setField("imei", e.target.value)}
                  placeholder="15 digits"
                  className={inputClass}
                />
              )}
              {field(
                "Condition",
                <select
                  value={form.condition}
                  onChange={(e) => setField("condition", e.target.value)}
                  className={inputClass}
                >
                  {CONDITIONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              )}
              {field(
                "Included",
                <input
                  value={form.accessories}
                  onChange={(e) => setField("accessories", e.target.value)}
                  placeholder="Box, charger, case"
                  className={inputClass}
                />
              )}
            </div>

            <div className="mt-4">
              {field(
                "Problems (scratches, cracks, battery, anything wrong)",
                <textarea
                  rows={3}
                  value={form.problems}
                  onChange={(e) => setField("problems", e.target.value)}
                  placeholder="Small scratch on the back. Face ID not working."
                  className={inputClass}
                />
              )}
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {field(
                "Owner name *",
                <input
                  required
                  value={form.consignorName}
                  onChange={(e) => setField("consignorName", e.target.value)}
                  placeholder="Colleague's name"
                  className={inputClass}
                />
              )}
              {field(
                "Owner phone number",
                <input
                  value={form.consignorPhone}
                  onChange={(e) => setField("consignorPhone", e.target.value)}
                  placeholder="+357 ..."
                  className={inputClass}
                />
              )}
              {field(
                "Owner wants (€) *",
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.ownerPrice}
                  onChange={(e) => setField("ownerPrice", e.target.value)}
                  placeholder="250"
                  className={inputClass}
                />
              )}
              {field(
                "Display price (€) *",
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.displayPrice}
                  onChange={(e) => setField("displayPrice", e.target.value)}
                  placeholder="290"
                  className={inputClass}
                />
              )}
            </div>

            {form.ownerPrice.trim() !== "" &&
              form.displayPrice.trim() !== "" &&
              !isNaN(Number(form.ownerPrice)) &&
              !isNaN(Number(form.displayPrice)) && (
                <p className="mt-3 text-sm">
                  You would earn{" "}
                  <b className="text-[#C2570C]">
                    {euro(Number(form.displayPrice) - Number(form.ownerPrice))}
                  </b>{" "}
                  if it sells at the display price.
                </p>
              )}

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {field(
                "Notes",
                <input
                  value={form.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                  placeholder="Anything else to remember"
                  className={inputClass}
                />
              )}
              {field(
                editingId === null ? "Photo (optional)" : "New photo (optional)",
                <input
                  key={fileKey}
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="w-full text-sm"
                />
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                disabled={busy}
                className="rounded-lg bg-[#F28C28] px-6 py-2 text-sm font-semibold text-[#14213D] hover:bg-[#FFA033] disabled:opacity-50"
              >
                {busy ? "Saving..." : editingId === null ? "Add phone" : "Save changes"}
              </button>
              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg border border-[#E0D2BC] px-6 py-2 text-sm hover:bg-[#F0E6D5]"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="mb-4 flex flex-wrap gap-2">
          {FILTERS.map(([value, label]) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={
                "rounded-full border px-4 py-1 text-sm " +
                (filter === value
                  ? "border-[#14213D] bg-[#14213D] text-white"
                  : "border-[#E0D2BC] bg-white hover:bg-[#F0E6D5]")
              }
            >
              {label}
            </button>
          ))}
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by model, colour, IMEI or owner"
          className="mb-6 w-full rounded-lg border border-[#E0D2BC] bg-white px-3 py-2"
        />

        {loaded && phones.length === 0 && !message && (
          <p className="rounded-xl bg-white p-6 text-center text-[#14213D]/70 shadow">
            No phones yet. Click Add phone to register the first one.
          </p>
        )}

        {phones.length > 0 && shown.length === 0 && (
          <p className="text-sm text-[#14213D]/60">No phones match this filter or search.</p>
        )}

        <div className="space-y-4">
          {shown.map((p) => {
            const owner = Number(p.owner_price);
            const display = Number(p.display_price);
            const soldFor = p.sold_price === null ? null : Number(p.sold_price);
            const specs = [p.storage, p.ram, p.color].filter(Boolean).join(" · ");
            const earn = (soldFor ?? display) - owner;

            return (
              <div key={p.id} className="rounded-xl bg-white p-4 shadow">
                <div className="flex flex-wrap gap-4">
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={p.brand + " " + p.model}
                      className="h-28 w-28 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-28 w-28 items-center justify-center rounded-lg bg-[#EADFCB] text-xs text-[#14213D]/60">
                      No photo
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold">
                        {p.brand} {p.model}
                      </h3>
                      <span
                        className={
                          "rounded-full border px-3 py-0.5 text-xs capitalize " +
                          statusBadge(p.status)
                        }
                      >
                        {p.status}
                      </span>
                    </div>

                    {specs && <p className="text-sm text-[#14213D]/80">{specs}</p>}

                    <p className="mt-1 text-xs text-[#14213D]/60">
                      {conditionLabel(p.condition)}
                      {p.battery_health !== null ? " · Battery " + p.battery_health + "%" : ""}
                      {p.imei ? " · IMEI " + p.imei : ""}
                    </p>

                    {p.accessories && (
                      <p className="mt-1 text-xs text-[#14213D]/60">Included: {p.accessories}</p>
                    )}

                    {p.problems ? (
                      <p className="mt-2 rounded-lg bg-[#FDE7CC] px-3 py-2 text-sm text-[#C2570C]">
                        Problems: {p.problems}
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-[#14213D]/50">No known problems</p>
                    )}

                    {p.notes && (
                      <p className="mt-2 text-xs text-[#14213D]/60">Notes: {p.notes}</p>
                    )}
                  </div>

                  <div className="min-w-[11rem] space-y-1 text-sm">
                    <p>
                      Owner wants: <b>{euro(owner)}</b>
                    </p>
                    <p>
                      Display price: <b className="text-[#C2570C]">{euro(display)}</b>
                    </p>
                    {soldFor !== null && (
                      <p>
                        Sold for: <b>{euro(soldFor)}</b>
                      </p>
                    )}
                    <p className={earn < 0 ? "text-red-700" : ""}>
                      {p.status === "sold" ? "You earned" : "You would earn"}:{" "}
                      <b>{euro(earn)}</b>
                    </p>
                    <p className="pt-1 text-xs text-[#14213D]/60">
                      Owner: {p.consignor_name}
                      {p.consignor_phone ? " (" + p.consignor_phone + ")" : ""}
                    </p>
                    <p className="text-xs text-[#14213D]/60">
                      Received {new Date(p.received_at).toLocaleDateString()}
                    </p>
                    {p.status === "sold" && (
                      <p
                        className={
                          "text-xs font-medium " +
                          (p.owner_paid_at ? "text-emerald-700" : "text-[#C2570C]")
                        }
                      >
                        {p.owner_paid_at
                          ? "Owner paid on " + new Date(p.owner_paid_at).toLocaleDateString()
                          : "Owner not paid yet"}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 border-t border-[#E6D9C5] pt-3 text-sm">
                  <button
                    onClick={() => openEdit(p)}
                    className="rounded-lg border border-[#E0D2BC] px-3 py-1 hover:bg-[#F0E6D5]"
                  >
                    Edit
                  </button>

                  {(p.status === "available" || p.status === "reserved") && (
                    <>
                      <button
                        onClick={() => markSold(p)}
                        className="rounded-lg bg-[#F28C28] px-3 py-1 font-semibold text-[#14213D] hover:bg-[#FFA033]"
                      >
                        Mark sold
                      </button>
                      <button
                        onClick={() => toggleReserve(p)}
                        className="rounded-lg border border-[#E0D2BC] px-3 py-1 hover:bg-[#F0E6D5]"
                      >
                        {p.status === "reserved" ? "Remove reservation" : "Reserve"}
                      </button>
                      <button
                        onClick={() => returnToOwner(p)}
                        className="rounded-lg border border-[#E0D2BC] px-3 py-1 hover:bg-[#F0E6D5]"
                      >
                        Return to owner
                      </button>
                    </>
                  )}

                  {p.status === "sold" && !p.owner_paid_at && (
                    <>
                      <button
                        onClick={() => markPaid(p)}
                        className="rounded-lg bg-[#14213D] px-3 py-1 text-white hover:bg-[#22345C]"
                      >
                        Mark owner paid
                      </button>
                      <button
                        onClick={() => undoSale(p)}
                        className="rounded-lg border border-[#E0D2BC] px-3 py-1 hover:bg-[#F0E6D5]"
                      >
                        Undo sale
                      </button>
                    </>
                  )}

                  {p.status === "returned" && (
                    <button
                      onClick={() => patch(p, { status: "available" }, "Phone is back in the shop.")}
                      className="rounded-lg border border-[#E0D2BC] px-3 py-1 hover:bg-[#F0E6D5]"
                    >
                      Put back in shop
                    </button>
                  )}

                  {p.status !== "sold" && (
                    <button
                      onClick={() => removePhone(p)}
                      className="ml-auto text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}