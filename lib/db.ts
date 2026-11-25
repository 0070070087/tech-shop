// Small helper so the new pages can talk to Supabase without caring
// what the export in lib/supabase.ts is called (supabase, default, ...).
import * as supa from "./supabase";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db: any = Object.values(supa).find(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (v: any) => v && typeof v.from === "function" && v.auth
);

if (!db) {
  throw new Error("lib/db.ts: could not find the Supabase client exported by lib/supabase.ts");
}
