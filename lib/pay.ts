import { supabase } from "@/lib/supabase";

// Returns an error message, or null when the browser is being sent to Stripe.
export async function startPayment(orderId: number): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return "Please log in again.";

  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify({ orderId }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.url) {
    return json.error || "Could not start payment.";
  }
  window.location.href = json.url;
  return null;
}
