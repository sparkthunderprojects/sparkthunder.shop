import type { OrderRow } from "@/lib/shop/fulfil";

export type InvoiceLine = { name: string; sku: string; qty: number; unitPence: number; totalPence: number };
export type Invoice = {
  number: string; date: string; lines: InvoiceLine[];
  subtotalPence: number; shippingPence: number; giftWrapPence: number; discountPence: number; discountCode: string;
  totalPence: number;                        // what the order came to, all payments together
  paidByCardPence: number; paidByGiftCardPence: number; refundedPence: number;
  vat: { ratePercent: number; pence: number; netPence: number; number: string } | null;
  billTo: { name: string; email: string; address: string[] };
};

const ADDRESS_ORDER = ["name", "line1", "line2", "city", "state", "postal_code", "country"];
/** The delivery address as lines, in reading order, skipping anything empty. */
export function addressLines(a: Record<string, string> | null | undefined): string[] {
  if (!a) return [];
  const known = ADDRESS_ORDER.map((k) => a[k]).filter(Boolean);
  const extra = Object.entries(a).filter(([k, v]) => v && !ADDRESS_ORDER.includes(k)).map(([, v]) => v);
  return [...known, ...extra];
}

/** Everything an invoice shows, worked out from the order as it was taken. Shop prices include VAT, so VAT is shown as the part already contained. */
export function buildInvoice(o: OrderRow): Invoice {
  const lines = o.items.map((l) => ({ name: l.type === "product" && l.variant && !l.name.includes(`(${l.variant})`) ? `${l.name} (${l.variant})` : l.name, sku: l.type === "product" ? l.sku : "Gift card", qty: l.qty, unitPence: l.unitPence, totalPence: l.unitPence * l.qty }));
  const wrap = o.gift_wrap_pence ?? 0, discount = o.discount_pence ?? 0;
  const total = o.total_pence + (o.gift_card_pence ?? 0);
  const vatPence = o.vat_pence ?? 0;
  return {
    number: o.number, date: o.created_at, lines,
    subtotalPence: o.subtotal_pence, shippingPence: o.shipping_pence, giftWrapPence: wrap, discountPence: discount, discountCode: o.discount_code ?? "",
    totalPence: total, paidByCardPence: o.total_pence, paidByGiftCardPence: o.gift_card_pence ?? 0,
    refundedPence: (o.refunded_card_pence ?? 0) + (o.refunded_gift_pence ?? 0),
    vat: vatPence > 0 ? { ratePercent: o.vat_rate ?? 0, pence: vatPence, netPence: Math.max(0, total - vatPence), number: o.vat_number ?? "" } : null,
    billTo: { name: o.name, email: o.email, address: addressLines(o.shipping_address) },
  };
}
