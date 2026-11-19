import type { OrderRow } from "@/lib/shop/fulfil";
import { orderValue, paymentKind, type PaymentFilter } from "@/lib/orders-filter";

/** Sales value of one order: card plus gift card, after refunds. */
export const netValue = (o: OrderRow) => Math.max(0, orderValue(o) - (o.refunded_card_pence ?? 0) - (o.refunded_gift_pence ?? 0));
const key = (e: string) => e.trim().toLowerCase();

export type Slice = { label: string; orders: number; value: number };
export type Analytics = {
  orders: number; value: number; aov: number;
  byCountry: Slice[]; byWeekday: Slice[]; byHour: Slice[]; byFranchise: (Slice & { units: number })[];
  payment: { kind: Exclude<PaymentFilter, "any">; orders: number }[];
  newVsReturning: { new: Slice; returning: Slice };
  topCustomers: { email: string; name: string; orders: number; value: number }[];
  codes: { code: string; orders: number; discountPence: number; value: number }[];
  cohorts: { month: string; size: number; active: number[] }[];
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const monthOf = (iso: string) => iso.slice(0, 7);
const addMonths = (m: string, n: number) => { const [y, mo] = m.split("-").map(Number); const t = y * 12 + (mo - 1) + n; return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`; };
const monthIndex = (m: string) => { const [y, mo] = m.split("-").map(Number); return y * 12 + (mo - 1); };

/**
 * Sales analysis built from orders alone. `all` is every order ever (needed to tell new customers from returning ones and for cohorts);
 * `since`/`until` (ms) pick the period. Cancelled orders are ignored. All times are UTC.
 */
export function buildAnalytics(all: OrderRow[], opts: { since?: number; until?: number; franchiseOf?: Map<string, string>; nowMs: number }): Analytics {
  const live = all.filter((o) => o.status !== "cancelled");
  const firstAt = new Map<string, number>();
  for (const o of live) { const k = key(o.email), t = Date.parse(o.created_at); if (!firstAt.has(k) || t < firstAt.get(k)!) firstAt.set(k, t); }
  const since = opts.since ?? 0, until = opts.until ?? Infinity;
  const inRange = live.filter((o) => { const t = Date.parse(o.created_at); return t >= since && t < until; });

  const slice = (label: string): Slice => ({ label, orders: 0, value: 0 });
  const add = (s: Slice, v: number) => { s.orders++; s.value += v; };
  const country = new Map<string, Slice>(), franchise = new Map<string, Slice & { units: number }>(), cust = new Map<string, { email: string; name: string; orders: number; value: number }>(), codes = new Map<string, { code: string; orders: number; discountPence: number; value: number }>();
  const weekday = WEEKDAYS.map(slice), hour = Array.from({ length: 24 }, (_, i) => slice(`${String(i).padStart(2, "0")}:00`));
  const pay = new Map<Exclude<PaymentFilter, "any">, number>();
  const nv = { new: slice("New customers"), returning: slice("Returning customers") };
  let value = 0;

  for (const o of inRange) {
    const v = netValue(o), d = new Date(o.created_at);
    value += v;
    const c = (o.shipping_address?.country ?? "").toUpperCase() || "Unknown";
    add(country.get(c) ?? country.set(c, slice(c)).get(c)!, v);
    add(weekday[d.getUTCDay()], v); add(hour[d.getUTCHours()], v);
    const pk = paymentKind(o); pay.set(pk, (pay.get(pk) ?? 0) + 1);
    add(Date.parse(o.created_at) === firstAt.get(key(o.email)) ? nv.new : nv.returning, v);
    const ck = key(o.email), cr = cust.get(ck) ?? { email: ck, name: o.name, orders: 0, value: 0 };
    cr.orders++; cr.value += v; if (o.name) cr.name = o.name; cust.set(ck, cr);
    if (o.discount_code) { const k = o.discount_code.toUpperCase(), r = codes.get(k) ?? { code: k, orders: 0, discountPence: 0, value: 0 }; r.orders++; r.discountPence += o.discount_pence ?? 0; r.value += v; codes.set(k, r); }
    for (const l of o.items) {
      if (l.type !== "product") continue;
      const f = opts.franchiseOf?.get(l.slug) ?? "Other";
      const r = franchise.get(f) ?? { ...slice(f), units: 0 };
      r.units += l.qty; r.value += l.qty * l.unitPence; franchise.set(f, r);
    }
  }
  // orders in `franchise` counts lines' orders loosely: count each order once per franchise
  for (const r of franchise.values()) r.orders = 0;
  for (const o of inRange) { const seen = new Set<string>(); for (const l of o.items) if (l.type === "product") seen.add(opts.franchiseOf?.get(l.slug) ?? "Other"); for (const f of seen) franchise.get(f)!.orders++; }

  // cohorts: customers grouped by the month of their first order; how many ordered again in each of the next months (last 6 cohorts, 6 months)
  const nowMonth = new Date(opts.nowMs).toISOString().slice(0, 7);
  const byCohort = new Map<string, Set<string>>();
  for (const [k, t] of firstAt) { const m = monthOf(new Date(t).toISOString()); (byCohort.get(m) ?? byCohort.set(m, new Set()).get(m)!).add(k); }
  const activeMonths = new Map<string, Set<string>>();
  for (const o of live) { const k = key(o.email), m = monthOf(o.created_at); (activeMonths.get(k) ?? activeMonths.set(k, new Set()).get(k)!).add(m); }
  const cohorts = [...byCohort.keys()].sort().slice(-6).map((m) => {
    const members = byCohort.get(m)!, span = Math.min(5, monthIndex(nowMonth) - monthIndex(m));
    const active = Array.from({ length: span + 1 }, (_, i) => { const mm = addMonths(m, i); let n = 0; for (const e of members) if (activeMonths.get(e)?.has(mm)) n++; return n; });
    return { month: m, size: members.size, active };
  });

  const by = <T,>(m: Map<string, T>, f: (x: T) => number) => [...m.values()].sort((a, b) => f(b) - f(a));
  return {
    orders: inRange.length, value, aov: inRange.length ? Math.round(value / inRange.length) : 0,
    byCountry: by(country, (s) => s.value), byWeekday: weekday, byHour: hour, byFranchise: by(franchise, (s) => s.value),
    payment: (["card", "gift", "mixed", "free"] as const).map((kind) => ({ kind, orders: pay.get(kind) ?? 0 })),
    newVsReturning: nv, topCustomers: by(cust, (c) => c.value).slice(0, 10), codes: by(codes, (c) => c.orders), cohorts,
  };
}

export type DayPoint = { day: string; value: number; orders: number };
export type Overview = {
  now: { value: number; orders: number; aov: number; customers: number; newCustomers: number; units: number; discountPence: number; refundedPence: number };
  before: { value: number; orders: number; aov: number; customers: number; newCustomers: number; units: number; discountPence: number; refundedPence: number } | null;
  days: DayPoint[];
  products: { slug: string; name: string; units: number; value: number; beforeValue: number }[];
};

/** Headline numbers, a daily series and top products for [since, until), compared with the period of equal length just before it. Cancelled orders are ignored; UTC days. */
export function buildOverview(all: OrderRow[], opts: { since: number; until: number; compare: boolean }): Overview {
  const live = all.filter((o) => o.status !== "cancelled");
  const firstAt = new Map<string, number>();
  for (const o of live) { const k = key(o.email), t = Date.parse(o.created_at); if (!firstAt.has(k) || t < firstAt.get(k)!) firstAt.set(k, t); }
  const span = opts.until - opts.since, bSince = opts.since - span;
  const inR = (o: OrderRow, a: number, b: number) => { const t = Date.parse(o.created_at); return t >= a && t < b; };
  const totals = (a: number, b: number) => {
    const list = live.filter((o) => inR(o, a, b)), who = new Set<string>(); let value = 0, units = 0, discountPence = 0, refundedPence = 0, fresh = 0;
    for (const o of list) {
      value += netValue(o); discountPence += o.discount_pence ?? 0; refundedPence += (o.refunded_card_pence ?? 0) + (o.refunded_gift_pence ?? 0);
      for (const l of o.items) if (l.type === "product") units += l.qty;
      const k = key(o.email); if (!who.has(k)) { who.add(k); if (firstAt.get(k)! >= a) fresh++; }
    }
    return { value, orders: list.length, aov: list.length ? Math.round(value / list.length) : 0, customers: who.size, newCustomers: fresh, units, discountPence, refundedPence };
  };
  const day = (t: number) => new Date(t).toISOString().slice(0, 10);
  const map = new Map<string, DayPoint>();
  for (let t = Math.floor(opts.since / 86400000) * 86400000; t < opts.until; t += 86400000) map.set(day(t), { day: day(t), value: 0, orders: 0 });
  for (const o of live) if (inR(o, opts.since, opts.until)) { const p = map.get(day(Date.parse(o.created_at))); if (p) { p.value += netValue(o); p.orders++; } }
  const prod = new Map<string, { slug: string; name: string; units: number; value: number; beforeValue: number }>();
  for (const o of live) {
    const now = inR(o, opts.since, opts.until), prev = opts.compare && inR(o, bSince, opts.since);
    if (!now && !prev) continue;
    for (const l of o.items) {
      if (l.type !== "product") continue;
      const r = prod.get(l.slug) ?? { slug: l.slug, name: l.name, units: 0, value: 0, beforeValue: 0 };
      if (now) { r.units += l.qty; r.value += l.qty * l.unitPence; } else r.beforeValue += l.qty * l.unitPence;
      prod.set(l.slug, r);
    }
  }
  return { now: totals(opts.since, opts.until), before: opts.compare ? totals(bSince, opts.since) : null, days: [...map.values()], products: [...prod.values()].filter((p) => p.units > 0).sort((a, b) => b.value - a.value).slice(0, 10) };
}
