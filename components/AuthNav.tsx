"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

const ADMIN_EMAIL = "aqeelsyed781@gmail.com";

export default function AuthNav() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (user) {
    const isAdmin = user.email?.toLowerCase() === ADMIN_EMAIL;
    return (
      <div className="flex items-center gap-4">
        <Link href="/orders" className="hover:underline">My orders</Link>
        {isAdmin && (
          <>
            <Link href="/admin" className="hover:underline">Admin</Link>
            <Link href="/admin/orders" className="hover:underline">All orders</Link>
          </>
        )}
        <span className="text-xs text-gray-300">{user.email}</span>
        <button onClick={() => supabase.auth.signOut()} className="hover:underline">
          Logout
        </button>
      </div>
    );
  }

  return <Link href="/login">Login</Link>;
}
