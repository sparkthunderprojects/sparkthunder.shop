import { describe, expect, it } from "vitest";
import type { OrderRow } from "@/lib/shop/fulfil";
import { addressLines, buildInvoice } from "@/lib/invoice";

const order = (x: Partial<OrderRow> = {}): OrderRow => ({
  id: "1", number: "SPK-9", stripe_session_id: null, stripe_payment_intent: "", status: "shipped", email: "a@x.com", name: "Ada", phone: "",
  shipping_address: { name: "Ada Lovelace", line1: "1 Test St", city: "London", postal_code: "N1 1AA", country: "GB" },
  items: [{ type: "product", slug: "tee", variant: "M", name: "Crest Tee", sku: "T1", unitPence: 2400, qty: 2, image: "" }],
  subtotal_pence: 4800, shipping_pence: 395, gift_card_pence: 1000, total_pence: 3405, gift_card_code: "", discount_pence: 790, discount_code: "SAVE10",
  vat_pence: 0, tracking_carrier: "", tracking_number: "", notes: "", attention_reason: "", shipped_at: null, created_at: "2026-11-10T12:00:00Z", ...x,
}) as OrderRow;

describe("invoices", () => {
  it("lists lines with variant, and totals card plus gift card as the order total", () => {
    const i = buildInvoice(order());
    expect(i.lines).toEqual([{ name: "Crest Tee (M)", sku: "T1", qty: 2, unitPence: 2400, totalPence: 4800 }]);
    expect(i.totalPence).toBe(4405); expect(i.paidByCardPence).toBe(3405); expect(i.paidByGiftCardPence).toBe(1000);
    expect(i.discountPence).toBe(790); expect(i.discountCode).toBe("SAVE10"); expect(i.vat).toBeNull();
  });
  it("shows VAT as the part already included, with the amount before VAT", () => {
    const i = buildInvoice(order({ vat_pence: 734, vat_rate: 20, vat_number: "GB123" }));
    expect(i.vat).toEqual({ ratePercent: 20, pence: 734, netPence: 4405 - 734, number: "GB123" });
  });
  it("adds up refunds across card and gift card", () => { expect(buildInvoice(order({ refunded_card_pence: 500, refunded_gift_pence: 250 })).refundedPence).toBe(750); });
  it("orders address lines sensibly and skips empty ones", () => {
    expect(addressLines({ postal_code: "N1", line1: "1 St", country: "GB", city: "London", name: "Ada", line2: "" })).toEqual(["Ada", "1 St", "London", "N1", "GB"]);
    expect(addressLines(null)).toEqual([]);
  });
});
