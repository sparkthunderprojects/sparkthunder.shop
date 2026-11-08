import type { Db } from "@/lib/db/clients";
import type { OrderRow } from "@/lib/shop/fulfil";
import type { RefundRow } from "@/lib/shop/refund";

export type EventRow = { id: string; level: "info" | "warn" | "error"; event: string; message: string; created_at: string };
export type Severity = "red" | "amber" | "green";
export type Check = { id: string; label: string; severity: Severity; detail: string; href?: string };

export type HealthInput = {
  orders: Pick<OrderRow, "id" | "number" | "status" | "fulfilled_at" | "created_at" | "attention_reason">[];
  refunds: Pick<RefundRow, "id" | "order_id" | "status" | "created_at">[];
  events: EventRow[];
  products: { slug: string; name: string; track_stock: boolean; stock_qty: number; low_stock_threshold: number; published: boolean; in_stock: boolean }[];
  setup: { stripe: boolean; webhook: boolean; email: boolean; supportEmail: boolean };
  now?: number;
};

const MIN = 60_000;

/** Turn the raw facts about a store into a short list of checks, worst first. Pure, so it is easy to test. */
export function healthChecks(i: HealthInput): Check[] {
  const now = i.now ?? Date.now();
  const out: Check[] = [];
  const stuck = i.orders.filter((o) => !o.fulfilled_at && now - Date.parse(o.created_at) > 3 * MIN);
  out.push(stuck.length
    ? { id: "unfinished", label: "Orders that have not finished processing", severity: "red", detail: `${stuck.length} paid order(s) are waiting: ${stuck.slice(0, 5).map((o) => o.number).join(", ")}. Open one and press Finish processing.`, href: `/admin/orders/${stuck[0].id}` }
    : { id: "unfinished", label: "Orders that have not finished processing", severity: "green", detail: "None." });
  const attention = i.orders.filter((o) => o.status === "attention");
  out.push(attention.length
    ? { id: "attention", label: "Orders that need your attention", severity: "red", detail: `${attention.length}: ${attention.slice(0, 5).map((o) => o.number).join(", ")}.`, href: `/admin/orders/${attention[0].id}` }
    : { id: "attention", label: "Orders that need your attention", severity: "green", detail: "None." });
  const pendingRefunds = i.refunds.filter((r) => r.status === "pending" && now - Date.parse(r.created_at) > 2 * MIN);
  out.push(pendingRefunds.length
    ? { id: "refunds", label: "Refunds that have not finished", severity: "red", detail: `${pendingRefunds.length} refund(s) are unfinished. Open the order and press Retry.`, href: `/admin/orders/${pendingRefunds[0].order_id}` }
    : { id: "refunds", label: "Refunds that have not finished", severity: "green", detail: "None." });
  const day = i.events.filter((e) => now - Date.parse(e.created_at) < 24 * 60 * MIN);
  const errors = day.filter((e) => e.level === "error"), warns = day.filter((e) => e.level === "warn");
  out.push(errors.length
    ? { id: "errors", label: "Errors in the last 24 hours", severity: "red", detail: `${errors.length} error(s), latest: ${errors[0].message}`, href: "#events" }
    : warns.length
      ? { id: "errors", label: "Warnings in the last 24 hours", severity: "amber", detail: `${warns.length} warning(s), latest: ${warns[0].message}`, href: "#events" }
      : { id: "errors", label: "Errors in the last 24 hours", severity: "green", detail: "None." });
  const missing = [!i.setup.stripe && "a Stripe key", !i.setup.webhook && "the Stripe webhook secret", !i.setup.email && "email (Resend key and from-address)"].filter(Boolean) as string[];
  out.push(missing.length
    ? { id: "setup", label: "Payments and email setup", severity: "red", detail: `Missing: ${missing.join(", ")}.`, href: "/admin/commerce" }
    : { id: "setup", label: "Payments and email setup", severity: "green", detail: "Stripe, webhook and email are set." });
  out.push(i.setup.supportEmail
    ? { id: "alerts", label: "Owner alerts", severity: "green", detail: "Problems will be emailed to your support address." }
    : { id: "alerts", label: "Owner alerts", severity: "amber", detail: "No support email is set, so nobody is emailed when an order needs attention. Add one under Shipping and payments.", href: "/admin/commerce" });
  const low = i.products.filter((p) => p.published && p.track_stock && p.stock_qty <= p.low_stock_threshold);
  out.push(low.length
    ? { id: "stock", label: "Low or sold-out stock", severity: "amber", detail: `${low.length} product(s): ${low.slice(0, 6).map((p) => `${p.name} (${p.stock_qty})`).join(", ")}.`, href: "/admin/products" }
    : { id: "stock", label: "Low or sold-out stock", severity: "green", detail: "Nothing running low." });
  const rank = { red: 0, amber: 1, green: 2 } as const;
  return out.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

export const overall = (c: Check[]): Severity => (c.some((x) => x.severity === "red") ? "red" : c.some((x) => x.severity === "amber") ? "amber" : "green");

/** Gather what the checks need for the current store. Each query is allowed to fail (for example before the latest SQL is run). */
export async function loadHealth(db: Db, setup: HealthInput["setup"]): Promise<{ checks: Check[]; events: EventRow[]; setupSql: boolean }> {
  const since = new Date(Date.now() - 7 * 24 * 3600_000).toISOString();
  const [o, r, e, p] = await Promise.all([
    db.from("orders").select("id, number, status, fulfilled_at, created_at, attention_reason").order("created_at", { ascending: false }).limit(200),
    db.from("order_refunds").select("id, order_id, status, created_at").eq("status", "pending"),
    db.from("system_events").select("*").gte("created_at", since).order("created_at", { ascending: false }).limit(100),
    db.from("products").select("slug, name, track_stock, stock_qty, low_stock_threshold, published, in_stock"),
  ]);
  const events = (e.error ? [] : e.data ?? []) as EventRow[];
  const checks = healthChecks({
    orders: (o.data ?? []) as HealthInput["orders"], refunds: (r.error ? [] : r.data ?? []) as HealthInput["refunds"],
    events, products: (p.data ?? []) as HealthInput["products"], setup,
  });
  return { checks, events, setupSql: !e.error };
}
