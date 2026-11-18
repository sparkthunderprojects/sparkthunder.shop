import { ELIXIR_FALLBACK, type ElixirRate } from "@/lib/elixir-points";

// Elixir Points currently lives in the My Sparkthunder Supabase project. These two values are PUBLIC
// (the anon key is shipped to browsers by design), and can be overridden on the host if Elixir moves.
const URL = process.env.ELIXIR_SUPABASE_URL || "https://cxfrktbatcclkkixvqjq.supabase.co";
const KEY = process.env.ELIXIR_SUPABASE_ANON_KEY
  || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4ZnJrdGJhdGNjbGtraXh2cWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzMDUzNjksImV4cCI6MjEwODg4MTM2OX0.YwDNdj8hSt-9NYHXUK4WJ9Cod3hqaRh9TMM5pxl8XgU";

/** The live earn rate from the Elixir programme, cached for five minutes. Never throws. */
export async function getElixirRate(): Promise<ElixirRate> {
  try {
    const res = await fetch(`${URL}/rest/v1/rpc/elixir_programme`, {
      method: "POST",
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: "{}",
      next: { revalidate: 300 },
    });
    if (!res.ok) return ELIXIR_FALLBACK;
    const p = (await res.json()) as { earn_points_per_gbp?: number; redeem_points_per_gbp?: number } | null;
    const earn = Number(p?.earn_points_per_gbp), redeem = Number(p?.redeem_points_per_gbp);
    return earn > 0 && redeem > 0 ? { earnPerGbp: earn, redeemPerGbp: redeem } : ELIXIR_FALLBACK;
  } catch {
    return ELIXIR_FALLBACK;
  }
}
