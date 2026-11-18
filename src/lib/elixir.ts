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

// ---------------------------------------------------------------------------------------------
// Earning and taking back points. Switched on by adding the Sparkthunder Shop brand key (a secret
// that starts elx_) to the host as ELIXIR_BRAND_KEY. Without it the shop behaves exactly as before.
// ---------------------------------------------------------------------------------------------

export const elixirEnabled = () => Boolean(process.env.ELIXIR_BRAND_KEY);

export type ElixirResult = { ok: true; points: number; duplicate?: boolean } | { ok: false; error: string };

/** Whole pounds of products paid for, after any discount: what earns points. Gift cards and delivery earn nothing. */
export function eligibleGbp(lines: { type?: string; unitPence: number; qty: number }[], discountPence: number): number {
  const spent = lines.reduce((n, l) => n + (l.type === "product" ? l.unitPence * l.qty : 0), 0) - discountPence;
  return Math.max(0, Math.floor(spent / 100));
}

async function call(route: "earn" | "refund", body: Record<string, unknown>): Promise<{ status: number; data: Record<string, unknown> }> {
  const res = await fetch(`${URL}/functions/v1/elixir-api/${route}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-elixir-key": process.env.ELIXIR_BRAND_KEY ?? "" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  let data: Record<string, unknown> = {};
  try { data = (await res.json()) as Record<string, unknown>; } catch { /* no body */ }
  return { status: res.status, data };
}

/** Tries a few times for network blips and server errors, but gives up straight away on a clear "no". */
async function withRetry(route: "earn" | "refund", body: Record<string, unknown>): Promise<ElixirResult> {
  let last = "Elixir could not be reached";
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { status, data } = await call(route, body);
      if (status === 200) return { ok: true, points: Number(data.points ?? 0), duplicate: data.duplicate === true || data.status === "duplicate" };
      last = `${typeof data.error === "string" ? data.error : "error"} (${status})`;
      if (status >= 400 && status < 500 && status !== 429) return { ok: false, error: last };
    } catch (e) { last = e instanceof Error ? e.message : "Elixir could not be reached"; }
    if (attempt < 2) await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
  }
  return { ok: false, error: last };
}

/** Adds points for a paid order. Safe to repeat: Elixir counts each order number once. */
export const elixirEarn = (a: { orderRef: string; email: string; spendGbp: number }) =>
  withRetry("earn", { source_ref: a.orderRef, spend_gbp: a.spendGbp, email: a.email, description: `Order ${a.orderRef}` });

/** Takes points back for a refund, in proportion to the amount refunded. Safe to repeat per refund. */
export const elixirRefund = (a: { orderRef: string; refundRef: string; refundGbp: number }) =>
  withRetry("refund", { order_ref: a.orderRef, refund_ref: a.refundRef, refund_gbp: a.refundGbp });
