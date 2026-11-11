import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { serviceClient } from "@/lib/db/clients";
import { currentStoreId } from "@/lib/db/stores";

/** Shared limits, so each rule reads in one place. `windowSec` is the length of the counting window. */
export const LIMITS = {
  login: { limit: 10, windowSec: 900 },                 // sign-in attempts per address per 15 minutes
  loginEmail: { limit: 6, windowSec: 900 },             // ... and per email, so a spread-out guess is caught too
  checkout: { limit: 20, windowSec: 600 },
  giftLookup: { limit: 10, windowSec: 600 },            // guessing gift card codes
  discount: { limit: 20, windowSec: 600 },              // guessing discount codes
  review: { limit: 5, windowSec: 3600 },
  question: { limit: 4, windowSec: 3600 },
  stockAlert: { limit: 10, windowSec: 600 },
  newsletter: { limit: 8, windowSec: 3600 },
  points: { limit: 10, windowSec: 3600 },
  returns: { limit: 5, windowSec: 3600 },
} as const;

type Rule = { limit: number; windowSec: number };
export type RateResult = { ok: true } | { ok: false; retryAfter: number };

// Used only if the database function is not there yet or cannot be reached: still limits within one server.
const local = new Map<string, { n: number; until: number }>();
function localHit(key: string, rule: Rule): RateResult {
  const now = Date.now();
  if (local.size > 5000) local.clear();
  let e = local.get(key);
  if (!e || e.until <= now) { e = { n: 0, until: now + rule.windowSec * 1000 }; local.set(key, e); }
  e.n++;
  return e.n <= rule.limit ? { ok: true } : { ok: false, retryAfter: Math.ceil((e.until - now) / 1000) };
}

/** The visitor's address, from the proxy headers (first hop). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
}

/** Count this visitor against a rule. The counts live in the database, so every server shares them, and are kept per store. */
export async function rateLimit(name: string, rule: Rule, who?: string): Promise<RateResult> {
  let store = "";
  try { store = await currentStoreId(); } catch { /* no host (tests) */ }
  const key = createHash("sha256").update(`${name}|${store}|${who ?? await clientIp()}`).digest("hex").slice(0, 32);
  try {
    const db = serviceClient();
    if (!db) return localHit(key, rule);
    const { data, error } = await db.rpc("rate_hit", { p_key: key, p_limit: rule.limit, p_window: rule.windowSec });
    if (error || !data) return localHit(key, rule);
    const r = data as { ok: boolean; retry_after: number };
    return r.ok ? { ok: true } : { ok: false, retryAfter: r.retry_after };
  } catch { return localHit(key, rule); }
}

export const wait = (r: Extract<RateResult, { ok: false }>) => (r.retryAfter >= 90 ? `${Math.ceil(r.retryAfter / 60)} minutes` : "a minute");
