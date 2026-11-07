"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type Product = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  image_url: string | null;
};

const BUCKET = "product-images";

async function uploadImage(file: File): Promise<string | null> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = Date.now() + "-" + Math.random().toString(36).slice(2) + "." + ext;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file);
  if (error) return null;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [checked, setChecked] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);

  const load = useCallback(async () => {
    const { data } = await supabase.from("products").select("*").order("id");
    setProducts((data as Product[]) ?? []);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setChecked(true);
    });
    load();
  }, [load]);

  const denied = "Not allowed. Log in with the admin account.";

  async function addProduct(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setBusy(true);

    let image_url: string | null = null;
    if (file) {
      image_url = await uploadImage(file);
      if (!image_url) {
        setMessage("Photo upload failed. Check you are logged in as admin.");
        setBusy(false);
        return;
      }
    }

    const { error } = await supabase.from("products").insert({
      name,
      description,
      price: Number(price) || 0,
      stock: Number(stock) || 0,
      image_url,
    });
    setBusy(false);
    if (error) {
      setMessage(denied);
      return;
    }
    setName("");
    setDescription("");
    setPrice("");
    setStock("");
    setFile(null);
    setFileKey((k) => k + 1);
    setMessage("Product added.");
    load();
  }

  async function changePhoto(p: Product, newFile: File | undefined) {
    if (!newFile) return;
    setMessage("");
    setBusy(true);
    const url = await uploadImage(newFile);
    if (!url) {
      setBusy(false);
      setMessage("Photo upload failed. Check you are logged in as admin.");
      return;
    }
    const { data, error } = await supabase
      .from("products")
      .update({ image_url: url })
      .eq("id", p.id)
      .select();
    setBusy(false);
    if (error || !data || data.length === 0) {
      setMessage(denied);
      return;
    }
    setMessage("Photo updated.");
    load();
  }

  async function changeStock(p: Product, delta: number) {
    setMessage("");
    const next = Math.max(0, p.stock + delta);
    const { data, error } = await supabase
      .from("products")
      .update({ stock: next })
      .eq("id", p.id)
      .select();
    if (error || !data || data.length === 0) {
      setMessage(denied);
      return;
    }
    load();
  }

  async function remove(p: Product) {
    if (!confirm("Delete " + p.name + "?")) return;
    setMessage("");
    const { data, error } = await supabase
      .from("products")
      .delete()
      .eq("id", p.id)
      .select();
    if (error || !data || data.length === 0) {
      setMessage(denied);
      return;
    }
    load();
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-gray-900 text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold">
            Tech Shop
          </Link>
          <span className="text-sm">Admin</span>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-10">
        {checked && !user && (
          <p className="mb-6 rounded bg-yellow-100 p-3 text-yellow-800">
            Please <Link href="/login" className="underline">log in</Link> first.
          </p>
        )}

        {message && (
          <p className="mb-6 rounded bg-gray-200 p-3 text-sm">{message}</p>
        )}

        <h2 className="mb-4 text-2xl font-semibold">Add product</h2>
        <form onSubmit={addProduct} className="mb-10 space-y-3 rounded-xl bg-white p-4 shadow">
          <input
            required
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
          <input
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
          <div className="flex gap-3">
            <input
              required
              type="number"
              step="0.01"
              min="0"
              placeholder="Price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
            <input
              required
              type="number"
              min="0"
              placeholder="Stock"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-600">Photo (optional)</label>
            <input
              key={fileKey}
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm"
            />
          </div>
          <button
            disabled={busy}
            className="w-full rounded-lg bg-gray-900 py-2 text-white hover:bg-gray-700 disabled:opacity-50"
          >
            {busy ? "Please wait..." : "Add product"}
          </button>
        </form>

        <h2 className="mb-4 text-2xl font-semibold">Products</h2>
        <div className="rounded-xl bg-white p-4 shadow">
          <ul className="divide-y divide-gray-200">
            {products.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-4 py-3">
                <div className="flex items-center gap-3">
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={p.name}
                      className="h-14 w-14 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-gray-200 text-xs text-gray-500">
                      No photo
                    </div>
                  )}
                  <div>
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-sm text-gray-500">€{Number(p.price).toFixed(2)}</p>
                    <label className="cursor-pointer text-xs text-blue-600 hover:underline">
                      {p.image_url ? "Change photo" : "Add photo"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => changePhoto(p, e.target.files?.[0])}
                      />
                    </label>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => changeStock(p, -1)}
                    className="h-8 w-8 rounded-lg border border-gray-300 hover:bg-gray-100"
                  >
                    −
                  </button>
                  <span className="w-16 text-center text-sm">{p.stock} in stock</span>
                  <button
                    onClick={() => changeStock(p, 1)}
                    className="h-8 w-8 rounded-lg border border-gray-300 hover:bg-gray-100"
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={() => remove(p)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
