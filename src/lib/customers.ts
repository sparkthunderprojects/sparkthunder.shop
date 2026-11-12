import { createHash } from "node:crypto";

export type OrderForCustomer = {
  id: string; number: string; email: string; name: string; phone: string; shipping_address: Record<string, string> | null;
  status: "paid" | "shipped" | "cancelled" | "attention"; total_pence: number; refunded_card_pence?: number; refunded_gift_pence?: number; created_at: string;
};
export type CustomerNote = { email: string; tags: string[]; notes: string };

export type Customer = {
  id: string; email: string; name: string; phone: string; address: Record<string, string> | null;
  orders: number; spendPence: number; aovPence: number; firstOrderAt: string | null; lastOrderAt: string | null;
  subscribed: boolean; points: number; returns: number; reviews: number; tags: string[]; notes: string;
  orderList: { id: string; number: string; status: OrderForCustomer["status"]; totalPence: number; at: string }[];
};

export const SEGMENTS = ["all", "subscribed", "repeat", "big", "lapsed", "new", "never"] as const;
export type Segment = (typeof SEGMENTS)[number];
export const BIG_SPENDER_PENCE = 10_000;
export const LAPSED_DAYS = 90;
export const NEW_DAYS = 30;
export const SEGMENT_LABEL: Record<Segment, string> = {
  all: "Everyone", subscribed: "Newsletter subscribers", repeat: "Repeat buyers (2+ orders)", big: "Big spenders (£100+)",
  lapsed: `Lapsed (no order for ${LAPSED_DAYS}+ days)`, new: `New (first order in the last ${NEW_DAYS} days)`, never: "Never ordered",
};

const lower = (s: string) => s.trim().toLowerCase();
/** A stable id for a customer that is not their email, so addresses stay out of web addresses and logs. */
export const customerId = (email: string) => createHash("sha256").update(lower(email)).digest("hex").slice(0, 16);

/** Cleans a tag list: lower case, no empties, no repeats, a sensible length. */
export function cleanTags(raw: string | string[]): string[] {
  const list = Array.isArray(raw) ? raw : raw.split(",");
  return [...new Set(list.map((t) => t.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 30)).filter(Boolean))].slice(0, 20);
}

/**
 * Builds the customer list from what the store already holds: orders, newsletter sign-ups, points, returns, reviews and the owner's own notes.
 * A customer is an email address. Cancelled orders are listed but not counted toward spend or order count; refunds come off spend.
 */
export function buildCustomers(input: {
  orders: OrderForCustomer[]; subscribers: string[]; points: { email: string; points: number }[];
  returns: string[]; reviews: string[]; notes: CustomerNote[];
}): Customer[] {
  const by = new Map<string, Customer>();
  const get = (raw: string): Customer => {
    const email = lower(raw);
    let c = by.get(email);
    if (!c) { c = { id: customerId(email), email, name: "", phone: "", address: null, orders: 0, spendPence: 0, aovPence: 0, firstOrderAt: null, lastOrderAt: null, subscribed: false, points: 0, returns: 0, reviews: 0, tags: [], notes: "", orderList: [] }; by.set(email, c); }
    return c;
  };
  const ordered = [...input.orders].filter((o) => o.email).sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  for (const o of ordered) {
    const c = get(o.email);
    c.orderList.unshift({ id: o.id, number: o.number, status: o.status, totalPence: o.total_pence, at: o.created_at });
    if (o.name) c.name = o.name;           // the latest order's details win
    if (o.phone) c.phone = o.phone;
    if (o.shipping_address) c.address = o.shipping_address;
    if (o.status === "cancelled") continue;
    c.orders++;
    c.spendPence += Math.max(0, o.total_pence - (o.refunded_card_pence ?? 0) - (o.refunded_gift_pence ?? 0));
    c.firstOrderAt ??= o.created_at;
    c.lastOrderAt = o.created_at;
  }
  for (const e of input.subscribers) get(e).subscribed = true;
  for (const p of input.points) get(p.email).points += p.points;
  for (const e of input.returns) get(e).returns++;
  for (const e of input.reviews) get(e).reviews++;
  for (const n of input.notes) { const c = by.get(lower(n.email)); if (c) { c.tags = n.tags; c.notes = n.notes; } }
  for (const c of by.values()) c.aovPence = c.orders ? Math.round(c.spendPence / c.orders) : 0;
  return [...by.values()];
}

const DAY = 86_400_000;
export function inSegment(c: Customer, seg: Segment, now = Date.now()): boolean {
  switch (seg) {
    case "all": return true;
    case "subscribed": return c.subscribed;
    case "repeat": return c.orders >= 2;
    case "big": return c.spendPence >= BIG_SPENDER_PENCE;
    case "lapsed": return c.orders > 0 && c.lastOrderAt !== null && now - Date.parse(c.lastOrderAt) >= LAPSED_DAYS * DAY;
    case "new": return c.orders > 0 && c.firstOrderAt !== null && now - Date.parse(c.firstOrderAt) <= NEW_DAYS * DAY;
    case "never": return c.orders === 0;
  }
}
export const isSegment = (v: unknown): v is Segment => typeof v === "string" && (SEGMENTS as readonly string[]).includes(v);

/** Matches a search on name, email, phone, tag or order number. */
export function matchesSearch(c: Customer, q: string): boolean {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  return [c.email, c.name, c.phone, ...c.tags, ...c.orderList.map((o) => o.number)].some((x) => x.toLowerCase().includes(s));
}
export const matchesTag = (c: Customer, tag: string) => !tag || c.tags.includes(tag.toLowerCase());
