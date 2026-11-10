import type { Snapshot } from "@/lib/shop/types";

/** The VAT contained in a VAT-inclusive amount (shop prices already include VAT). Rounded to the nearest penny. */
export const vatIncluded = (grossPence: number, ratePercent: number) => (grossPence > 0 && ratePercent > 0 ? Math.round((grossPence * ratePercent) / (100 + ratePercent)) : 0);

export type VatInfo = { ratePercent: number; pence: number; number: string };

/**
 * VAT on an order: goods, shipping and gift wrap, after discount codes. Gift card purchases are vouchers, not goods, so they carry
 * no VAT. Paying with a gift card does not change the goods' value, so it is not deducted. Null when the store is not charging VAT.
 */
export function orderVat(s: Pick<Snapshot, "lines" | "shippingPence" | "giftOptions" | "discount">, c: { vatEnabled: boolean; vatRatePercent: number; vatNumber: string }): VatInfo | null {
  if (!c.vatEnabled || c.vatRatePercent <= 0) return null;
  const goods = s.lines.reduce((n, l) => n + (l.type === "product" ? l.unitPence * l.qty : 0), 0);
  const base = Math.max(0, goods + s.shippingPence + (s.giftOptions?.wrapPence ?? 0) - (s.discount?.appliedPence ?? 0));
  return { ratePercent: c.vatRatePercent, pence: vatIncluded(base, c.vatRatePercent), number: c.vatNumber };
}
