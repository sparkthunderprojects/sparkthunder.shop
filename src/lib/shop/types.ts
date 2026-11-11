export type GiftDetails = { recipientName: string; recipientEmail: string; senderName: string; message: string; theme: string };

export type SnapshotLine =
  | { type: "product"; slug: string; variant?: string; name: string; sku: string; unitPence: number; qty: number; image: string }
  | { type: "gift"; name: string; unitPence: number; qty: number; gift: GiftDetails };

export type GiftOptionsInput = { message: string; wrap: boolean };

export type Snapshot = {
  lines: SnapshotLine[];
  subtotalPence: number;
  shippingPence: number;
  needsShipping: boolean;
  /** Where this order is being delivered (two-letter code) and the zone that priced it. */
  country?: string; shippingZone?: string;
  discount?: { id: string; code: string; appliedPence: number } | null;
  /** An automatic offer that applied by itself (no code), and whether it made delivery free. */
  promotion?: { id: string; name: string; appliedPence: number } | null;
  freeShippingBy?: string;
  /** "This is a gift" options for a posted order: a printed note and/or gift wrap. */
  giftOptions?: { message: string; wrap: boolean; wrapPence: number } | null;
  giftCard: { cardId: string; code: string; appliedPence: number } | null;
  totalPence: number;
  /** The stock hold taken for this checkout (see lib/shop/stock.ts). */
  reservation?: string;
  /** VAT contained in the prices, worked out when checkout started (null if the store does not charge VAT). */
  vat?: { ratePercent: number; pence: number; number: string } | null;
};

export type CartInput = { slug: string; qty: number; pricePence?: number; gift?: GiftDetails }[];
