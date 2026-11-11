"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

const ADMIN_EMAIL = "aqeelsyed781@gmail.com";

type State = "loading" | "admin" | "denied" | "loggedout";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) setState("loggedout");
      else if (data.user.email?.toLowerCase() === ADMIN_EMAIL) setState("admin");
      else setState("denied");
    });
  }, []);

  if (state === "loading") {
    return <main className="min-h-screen bg-gray-50" />;
  }

  if (state !== "admin") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6 text-gray-900">
        <div className="w-full max-w-sm rounded-xl bg-white p-6 text-center shadow">
          <h1 className="mb-2 text-xl font-semibold">Owner area</h1>
          <p className="mb-4 text-sm text-gray-600">
            {state === "loggedout"
              ? "Please log in with the shop owner account."
              : "This area is only for the shop owner."}
          </p>
          {state === "loggedout" && (
            <Link
              href="/login"
              className="mb-2 block rounded-lg bg-gray-900 py-2 text-sm text-white hover:bg-gray-700"
            >
              Log in
            </Link>
          )}
          <Link href="/" className="text-sm text-gray-600 hover:underline">
            ← Back to shop
          </Link>
        </div>
      </main>
    );
  }

  const tab = (href: string, label: string) => {
    const active = href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(href + "/");
    return (
      <Link
        href={href}
        className={
          "rounded-lg px-3 py-1 text-sm " +
          (active ? "bg-white text-indigo-900" : "text-indigo-100 hover:bg-indigo-800")
        }
      >
        {label}
      </Link>
    );
  };

  return (
    <>
      <div className="bg-indigo-900 text-white print:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <span className="text-lg font-bold">NOVA&amp;YOU</span>
            <nav className="flex flex-wrap gap-2">
              {tab("/admin/dashboard", "Dashboard")}
              {tab("/admin/pos", "POS")}
              {tab("/admin/sales", "Till sales")}
              {tab("/admin", "Products")}
              {tab("/admin/orders", "Orders")}
              {tab("/admin/phones", "Phones")}
              {tab("/admin/people", "People")}
              {tab("/admin/stock", "Stock history")}
            </nav>
          </div>
          <Link href="/" className="text-sm text-indigo-100 hover:underline">
            View shop →
          </Link>
        </div>
      </div>
      {children}
    </>
  );
}
