import type { OrderRow } from "@/lib/shop/fulfil";

export const STATUS_FILTERS = ["all", "toship", "paid", "shipped", "cancelled", "attention"] as const;
export const PAYMENT_FILTERS = ["any", "card", "gift", "mixed", "free"] as const;
export const SORTS = ["newest", "oldest", "highest"] as const;
export type StatusFilter = (typeof STATUS_FILTERS)[number];
export type PaymentFilter = (typeof PAYMENT_FILTERS)[number];
export type OrderSort = (typeof SORTS)[number];
export const STATUS_LABEL: Record<StatusFilter, string> = { all: "Any status", toship: "Waiting to ship", paid: "Paid", shipped: "Shipped", cancelled: "Cancelled", attention: "Needs attention" };
export const PAYMENT_LABEL: Record<PaymentFilter, string> = { any: "Any payment", card: "Card only", gift: "Gift card only", mixed: "Card and gift card", free: "Nothing to pay" };
export const SORT_LABEL: Record<OrderSort, string> = { newest: "Newest first", oldest: "Oldest first", highest: "Highest value" };

export type OrderQuery = { q?: string; status?: string; payment?: string; from?: string; to?: string; discount?: string; country?: string; sort?: string };
const pick = <T extends string>(list: readonly T[], v: unknown, fallback: T): T => (typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : fallback);

/** What the customer paid with. total_pence is the card part; gift_card_pence the gift card part. */
export function paymentKind(o: Pick<OrderRow, "total_pence" | "gift_card_pence">): Exclude<PaymentFilter, "any"> {
  const card = o.total_pence > 0, gift = (o.gift_card_pence ?? 0) > 0;
  return card && gift ? "mixed" : card ? "card" : gift ? "gift" : "free";
}
/** The whole value of an order: card plus gift card. */
export const orderValue = (o: Pick<OrderRow, "total_pence" | "gift_card_pence">) => o.total_pence + (o.gift_card_pence ?? 0);
export const needsShipping = (o: Pick<OrderRow, "status" | "items">) => o.status === "paid" && o.items.some((l) => l.type === "product");

/** A date typed as YYYY-MM-DD, as the start of that day (UTC). Anything else is ignored. */
const dayStart = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? Date.parse(`${v}T00:00:00Z`) : null);

export function filterOrders(orders: OrderRow[], query: OrderQuery): OrderRow[] {
  const status = pick(STATUS_FILTERS, query.status, "all"), payment = pick(PAYMENT_FILTERS, query.payment, "any"), sort = pick(SORTS, query.sort, "newest");
  const q = (query.q ?? "").trim().toLowerCase().slice(0, 100);
  const from = dayStart(query.from), toDay = dayStart(query.to), to = toDay === null ? null : toDay + 86_400_000;
  const country = (query.country ?? "").trim().toUpperCase();
  const out = orders.filter((o) => {
    if (status === "toship" ? !needsShipping(o) : status !== "all" && o.status !== status) return false;
    if (payment !== "any" && paymentKind(o) !== payment) return false;
    const at = Date.parse(o.created_at);
    if (from !== null && at < from) return false;
    if (to !== null && at >= to) return false;
    if (query.discount === "1" && !o.discount_code) return false;
    if (country && (o.shipping_address?.country ?? "").toUpperCase() !== country) return false;
    if (q) {
      const a = o.shipping_address ?? {};
      const hay = [o.number, o.name, o.email, o.phone, o.discount_code ?? "", o.tracking_number, o.stripe_payment_intent, a.postal_code ?? "", a.city ?? "", ...o.items.map((l) => l.name)].join("\n").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  const by = { newest: (a: OrderRow, b: OrderRow) => Date.parse(b.created_at) - Date.parse(a.created_at), oldest: (a: OrderRow, b: OrderRow) => Date.parse(a.created_at) - Date.parse(b.created_at), highest: (a: OrderRow, b: OrderRow) => orderValue(b) - orderValue(a) }[sort];
  return out.sort(by);
}
