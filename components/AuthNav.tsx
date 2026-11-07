"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

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
    return (
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-300">{user.email}</span>
        <button onClick={() => supabase.auth.signOut()} className="hover:underline">
          Logout
        </button>
      </div>
    );
  }

  return <Link href="/login">Login</Link>;
}
