import { createHmac, timingSafeEqual } from "node:crypto";
import type { Db } from "@/lib/db/clients";
import { SUPABASE_SERVICE_KEY } from "@/lib/db/env";
import { basketReminderEmail, reviewRequestEmail } from "@/lib/email/templates";
import { ORIGIN_TOKEN } from "@/lib/site";
import type { OrderRow } from "@/lib/shop/fulfil";

export { BASKET_CONSENT } from "@/lib/consent-text";
const secret = () => process.env.UNSUBSCRIBE_SECRET || process.env.CRON_SECRET || SUPABASE_SERVICE_KEY || "dev-only-secret";

/** A link only the owner of the address can have been given: no login needed to unsubscribe, and nobody can unsubscribe someone else. */
export const unsubscribeToken = (storeId: string, email: string) => createHmac("sha256", secret()).update(`${storeId}:${email.trim().toLowerCase()}`).digest("hex").slice(0, 32);
export function verifyUnsubscribe(storeId: string, email: string, token: string): boolean {
  const want = Buffer.from(unsubscribeToken(storeId, email)), got = Buffer.from(String(token));
  return want.length === got.length && timingSafeEqual(want, got);
}
export const unsubscribeUrl = (storeId: string, email: string) => `${ORIGIN_TOKEN}/unsubscribe?e=${encodeURIComponent(email.trim().toLowerCase())}&t=${unsubscribeToken(storeId, email)}`;

export async function isUnsubscribed(db: Db, email: string): Promise<boolean> {
  const { data } = await db.from("email_unsubscribes").select("email").eq("email", email.trim().toLowerCase()).maybeSingle();
  return Boolean(data);
}
export async function unsubscribe(db: Db, email: string) {
  const e = email.trim().toLowerCase();
  await db.from("email_unsubscribes").upsert({ email: e }, { onConflict: "store_id,email" });
  await db.from("basket_saves").delete().eq("email", e).is("reminded_at", null); // nothing left to remind them about
}

export type SavedLine = { slug: string; name: string; qty: number; pricePence: number };
const HOUR = 3600_000, DAY = 24 * HOUR;
export const REMIND_AFTER_HOURS = 1, REVIEW_AFTER_DAYS = 7, REVIEW_UNTIL_DAYS = 30, KEEP_BASKET_DAYS = 30;

type Send = (m: { to: string; subject: string; html: string; text: string }) => Promise<{ ok: true } | { ok: false; error: string }>;
export type LifecycleResult = { reminders: number; reviewRequests: number; skipped: number; cleaned: number };

/**
 * One pass of the scheduled emails for one store (safe to run as often as you like: each email is sent at most once).
 * - Basket reminder: only for people who ticked the consent box, an hour or more after they saved it, and only if they have not ordered since.
 * - Review request: once per shipped order, between 7 and 30 days after dispatch.
 * Anyone on the unsubscribe list gets neither. Old saved baskets are deleted after 30 days.
 */
export async function runLifecycle(db: Db, o: { storeId: string; send: Send; now?: number; limit?: number }): Promise<LifecycleResult> {
  const now = o.now ?? Date.now(), limit = o.limit ?? 50;
  const out: LifecycleResult = { reminders: 0, reviewRequests: 0, skipped: 0, cleaned: 0 };

  const { data: baskets } = await db.from("basket_saves").select("*").is("reminded_at", null).lte("created_at", new Date(now - REMIND_AFTER_HOURS * HOUR).toISOString()).limit(limit);
  for (const b of (baskets ?? []) as { id: string; email: string; cart: SavedLine[]; subtotal_pence: number; created_at: string }[]) {
    const { data: later } = await db.from("orders").select("id").eq("email", b.email).gte("created_at", b.created_at).limit(1);
    if ((later ?? []).length || (await isUnsubscribed(db, b.email)) || !b.cart.length) { await db.from("basket_saves").update({ reminded_at: new Date(now).toISOString() }).eq("id", b.id); out.skipped++; continue; }
    // Mark first: if sending fails we do not retry forever, and a crash can never send twice.
    const claimed = await db.from("basket_saves").update({ reminded_at: new Date(now).toISOString() }).eq("id", b.id).is("reminded_at", null).select("id");
    if (!((claimed.data ?? []) as unknown[]).length) continue;
    const r = await o.send({ to: b.email, ...basketReminderEmail({ lines: b.cart, subtotalPence: b.subtotal_pence, basketUrl: `${ORIGIN_TOKEN}/cart`, unsubscribeUrl: unsubscribeUrl(o.storeId, b.email) }) });
    if (r.ok) out.reminders++; else out.skipped++;
  }

  const { data: orders } = await db.from("orders").select("*").eq("status", "shipped").is("review_requested_at", null)
    .gte("shipped_at", new Date(now - REVIEW_UNTIL_DAYS * DAY).toISOString()).lte("shipped_at", new Date(now - REVIEW_AFTER_DAYS * DAY).toISOString()).limit(limit);
  for (const ord of (orders ?? []) as (OrderRow & { review_requested_at?: string | null })[]) {
    const claimed = await db.from("orders").update({ review_requested_at: new Date(now).toISOString() }).eq("id", ord.id).is("review_requested_at", null).select("id");
    if (!((claimed.data ?? []) as unknown[]).length) continue;
    const products = ord.items.flatMap((l) => (l.type === "product" ? [{ name: l.name, url: `${ORIGIN_TOKEN}/products/${l.slug}#reviews` }] : []));
    if (!ord.email || !products.length || (await isUnsubscribed(db, ord.email))) { out.skipped++; continue; }
    const r = await o.send({ to: ord.email, ...reviewRequestEmail({ number: ord.number, name: ord.name, products: products.slice(0, 5), unsubscribeUrl: unsubscribeUrl(o.storeId, ord.email) }) });
    if (r.ok) out.reviewRequests++; else out.skipped++;
  }

  const del = await db.from("basket_saves").delete().lte("created_at", new Date(now - KEEP_BASKET_DAYS * DAY).toISOString()).select("id");
  out.cleaned = ((del.data ?? []) as unknown[]).length;
  return out;
}
