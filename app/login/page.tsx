"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Mode = "signin" | "signup";
type Msg = { kind: "error" | "success"; text: string } | null;

const inputClass =
  "w-full rounded-xl border border-[#E0D2BC] bg-[#FBF7F0] px-4 py-3 text-[#14213D] " +
  "placeholder:text-[#14213D]/40 outline-none transition " +
  "focus:border-[#F28C28] focus:ring-4 focus:ring-[#F28C28]/20";

const perks = [
  "Track every order in one place",
  "Secure card payments through Stripe",
  "Simple checkout in a few taps",
];

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const [loading, setLoading] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setMsg(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setMsg({ kind: "error", text: error.message });
      } else if (data.session) {
        router.push("/");
      } else {
        setMsg({
          kind: "success",
          text: "Account created. Check your email and tap the confirmation link, then sign in.",
        });
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMsg({ kind: "error", text: error.message });
      } else {
        router.push("/");
      }
    }
    setLoading(false);
  }

  return (
    <main className="grid min-h-screen bg-[#F4EDE2] text-[#14213D] lg:grid-cols-2">
      <section className="relative flex flex-col justify-between overflow-hidden bg-[#14213D] px-8 py-6 text-[#F4EDE2] lg:px-14 lg:py-14">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#F28C28]/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-[#FFB347]/15 blur-3xl" />

        <Link href="/" className="relative text-2xl font-bold tracking-tight">
          NOVA<span className="text-[#F28C28]">&amp;</span>YOU
        </Link>

        <div className="relative hidden lg:block">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#FFB347]">
            Welcome
          </p>
          <h1 className="font-serif text-5xl leading-tight">
            Everyday tech, made simple.
          </h1>
          <ul className="mt-10 space-y-4">
            {perks.map((perk) => (
              <li key={perk} className="flex items-center gap-3 text-[#F4EDE2]/90">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F28C28] text-xs font-bold text-[#14213D]">
                  ✓
                </span>
                {perk}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative hidden text-xs text-[#F4EDE2]/60 lg:block">
          Practice shop. Payments run in test mode.
        </p>
      </section>

      <section className="flex items-center justify-center px-6 py-10 lg:px-14">
        <div className="w-full max-w-md">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-1 text-sm text-[#14213D]/70 hover:text-[#C2570C]"
          >
            ← Back to shop
          </Link>

          <div className="rounded-3xl border border-[#E6D9C5] bg-white/80 p-8 shadow-xl shadow-[#14213D]/5">
            <div className="mb-8 grid grid-cols-2 rounded-full bg-[#F4EDE2] p-1 text-sm font-semibold">
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className={
                  "rounded-full py-2 transition " +
                  (mode === "signin"
                    ? "bg-[#14213D] text-white shadow"
                    : "text-[#14213D]/60 hover:text-[#14213D]")
                }
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => switchMode("signup")}
                className={
                  "rounded-full py-2 transition " +
                  (mode === "signup"
                    ? "bg-[#14213D] text-white shadow"
                    : "text-[#14213D]/60 hover:text-[#14213D]")
                }
              >
                Create account
              </button>
            </div>

            <h2 className="font-serif text-3xl">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="mb-6 mt-1 text-sm text-[#14213D]/70">
              {mode === "signin"
                ? "Sign in to see your orders and check out faster."
                : "It takes less than a minute."}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm font-medium">Email</span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium">Password</span>
                <div className="relative">
                  <input
                    type={show ? "text" : "password"}
                    required
                    minLength={6}
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass + " pr-16"}
                  />
                  <button
                    type="button"
                    onClick={() => setShow(!show)}
                    className="absolute inset-y-0 right-4 text-xs font-semibold text-[#C2570C] hover:underline"
                  >
                    {show ? "Hide" : "Show"}
                  </button>
                </div>
              </label>

              {msg && (
                <p
                  role="status"
                  className={
                    "rounded-xl border px-4 py-3 text-sm " +
                    (msg.kind === "error"
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-emerald-200 bg-emerald-50 text-emerald-800")
                  }
                >
                  {msg.text}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#F28C28] py-3 font-semibold text-[#14213D] shadow-lg shadow-[#F28C28]/30 transition hover:bg-[#FFA033] disabled:opacity-60"
              >
                {loading
                  ? "Please wait..."
                  : mode === "signin"
                  ? "Sign in"
                  : "Create account"}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-[#14213D]/60">
            Practice project. Use a password you do not use anywhere else.
          </p>
        </div>
      </section>
    </main>
  );
}