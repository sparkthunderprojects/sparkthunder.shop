export type GiftDetails = { recipientName: string; recipientEmail: string; senderName: string; message: string; theme: string };

export type SnapshotLine =
  | { type: "product"; slug: string; variant?: string; name: string; sku: string; unitPence: number; qty: number; image: string }
  | { type: "gift"; name: string; unitPence: number; qty: number; gift: GiftDetails };

export type Snapshot = {
  lines: SnapshotLine[];
  subtotalPence: number;
  shippingPence: number;
  needsShipping: boolean;
  giftCard: { cardId: string; code: string; appliedPence: number } | null;
  totalPence: number;
};

export type CartInput = { slug: string; qty: number; pricePence?: number; gift?: GiftDetails }[];
