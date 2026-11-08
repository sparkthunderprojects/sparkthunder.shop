import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/lib/db/clients";

const sent: { to: string; subject: string }[] = [];
vi.mock("@/lib/commerce", () => ({ getCommerce: async () => ({ codePrefix: "SPK" }) }));
vi.mock("@/lib/email/send", () => ({ sendEmail: async (m: { to: string; subject: string }) => { sent.push({ to: m.to, subject: m.subject }); return { ok: true }; } }));

import { createFakeClient } from "@/lib/db/fake";
import { createRefund, processRefund, type RefundInput, type RefundStripe } from "@/lib/shop/refund";

const g = globalThis as unknown as { __sparkFake?: unknown };
let db: Db;
let calls: { amount: number; key?: string }[];
let stripeFails: "none" | "network" | "refused";
const stripe: RefundStripe = {
  refunds: {
    create: async (p, o) => {
      calls.push({ amount: p.amount, key: o?.idempotencyKey });
      if (stripeFails === "network") throw new Error("socket hang up");
      if (stripeFails === "refused") throw Object.assign(new Error("Charge already refunded"), { type: "StripeInvalidRequestError" });
      return { id: `re_${o?.idempotencyKey}` };
    },
  },
};
const rows = async (t: string) => ((await db.from(t).select("*")).data ?? []) as Record<string, unknown>[];
const order = async () => (await rows("orders"))[0];
const product = async (slug: string) => (await db.from("products").select("*").eq("slug", slug).maybeSingle()).data as Record<string, unknown>;
let n = 0;
const input = (o: Partial<RefundInput> = {}): RefundInput => ({ orderId: "o1", key: `k${++n}`, cardPence: 0, giftPence: 0, restock: [], takePoints: false, reason: "", by: "admin@x", ...o });

beforeEach(async () => {
  g.__sparkFake = undefined; sent.length = 0; calls = []; stripeFails = "none"; n = 0;
  db = createFakeClient() as unknown as Db;
  const base = { franchise_slug: "knightverge", category_slug: "apparel", price_pence: 1000, track_stock: true, in_stock: true, published: true, variants: [], bundle_items: [] };
  await db.from("products").insert([{ ...base, slug: "tee", sku: "TEE", name: "Tee", stock_qty: 3 }, { ...base, slug: "mug", sku: "MUG", name: "Mug", stock_qty: 5 }]);
  await db.from("gift_cards").insert({ id: "gc1", code: "ABCD1234", balance_pence: 500, initial_pence: 2000, status: "active", currency: "GBP" });
  await db.from("orders").insert({
    id: "o1", number: "SPK-1001", stripe_session_id: "cs1", stripe_payment_intent: "pi_1", status: "paid", email: "buyer@example.com", name: "Buyer",
    items: [{ type: "product", slug: "tee", name: "Tee", sku: "TEE", unitPence: 2000, qty: 2, image: "" }, { type: "product", slug: "mug", name: "Mug", sku: "MUG", unitPence: 1000, qty: 1, image: "" }],
    subtotal_pence: 5000, shipping_pence: 0, gift_card_pence: 1500, total_pence: 3500, gift_card_code: "ABCD1234", discount_pence: 0, fulfilled_at: new Date().toISOString(),
  });
  await db.from("reward_points").insert({ email: "buyer@example.com", points: 50, reason: "order", ref: "SPK-1001" });
});

describe("refunds", () => {
  it("refunds part of the card payment, once, and emails the customer", async () => {
    const r = await createRefund(db, stripe, "sparkthunder", input({ cardPence: 1000 }));
    expect(r.ok).toBe(true);
    expect(calls).toEqual([{ amount: 1000, key: expect.stringMatching(/^spark_refund_/) }]);
    expect((await order()).refunded_card_pence).toBe(1000);
    expect((await order()).status).toBe("paid");
    expect(sent).toHaveLength(1);
  });

  it("repeating the same click (same key) never refunds twice", async () => {
    const i = input({ cardPence: 1000 });
    await createRefund(db, stripe, "sparkthunder", i);
    await createRefund(db, stripe, "sparkthunder", i);
    expect(calls).toHaveLength(1);
    expect((await order()).refunded_card_pence).toBe(1000);
    expect(sent).toHaveLength(1);
    expect(await rows("order_refunds")).toHaveLength(1);
  });

  it("never refunds more than was paid, across several refunds", async () => {
    expect((await createRefund(db, stripe, "sparkthunder", input({ cardPence: 3000 }))).ok).toBe(true);
    const over = await createRefund(db, stripe, "sparkthunder", input({ cardPence: 600 }));
    expect(over.ok).toBe(false);
    expect((await createRefund(db, stripe, "sparkthunder", input({ cardPence: 500 }))).ok).toBe(true);
    expect((await order()).refunded_card_pence).toBe(3500);
    expect(calls.map((c) => c.amount)).toEqual([3000, 500]);
  });

  it("returns the gift card part to the gift card, once", async () => {
    const i = input({ giftPence: 1500 });
    await createRefund(db, stripe, "sparkthunder", i);
    await createRefund(db, stripe, "sparkthunder", i);
    expect(((await rows("gift_cards"))[0]).balance_pence).toBe(2000);
    expect((await rows("gift_card_ledger")).filter((l) => l.kind === "refund")).toHaveLength(1);
    expect(calls).toHaveLength(0);
  });

  it("puts returned items back on the shelf, and never more than were ordered", async () => {
    await createRefund(db, stripe, "sparkthunder", input({ cardPence: 2000, restock: [{ line: 0, qty: 1 }] }));
    expect((await product("tee")).stock_qty).toBe(4);
    await createRefund(db, stripe, "sparkthunder", input({ cardPence: 1000, restock: [{ line: 0, qty: 5 }] }));   // asks for 5, only 1 more was ordered
    expect((await product("tee")).stock_qty).toBe(5);
    await createRefund(db, stripe, "sparkthunder", input({ cardPence: 500, restock: [{ line: 0, qty: 2 }] }));
    expect((await product("tee")).stock_qty).toBe(5);
  });

  it("takes back points in proportion, never more than earned", async () => {
    await createRefund(db, stripe, "sparkthunder", input({ cardPence: 3500, giftPence: 1500, takePoints: true }));
    const pts = (await rows("reward_points")).reduce((n, r) => n + (r.points as number), 0);
    expect(pts).toBe(0);
    await createRefund(db, stripe, "sparkthunder", input({ takePoints: true, cardPence: 0, giftPence: 0 }));
    expect((await rows("reward_points")).reduce((n, r) => n + (r.points as number), 0)).toBe(0);
  });

  it("cancels an unshipped order that is fully refunded", async () => {
    await createRefund(db, stripe, "sparkthunder", input({ cardPence: 3500, giftPence: 1500 }));
    expect((await order()).status).toBe("cancelled");
  });

  it("a Stripe network failure keeps the refund pending and a retry finishes it with the same Stripe key", async () => {
    stripeFails = "network";
    const i = input({ cardPence: 1000 });
    const first = await createRefund(db, stripe, "sparkthunder", i);
    expect(first.ok).toBe(false);
    expect((first as { retry?: boolean }).retry).toBe(true);
    expect((await order()).refunded_card_pence).toBe(1000);       // still reserved, so it cannot be double-refunded meanwhile
    stripeFails = "none";
    const again = await createRefund(db, stripe, "sparkthunder", i);
    expect(again.ok).toBe(true);
    expect(new Set(calls.map((c) => c.key)).size).toBe(1);        // both attempts used the same idempotency key
  });

  it("a refusal from Stripe frees the amount so it can be tried again", async () => {
    stripeFails = "refused";
    const r = await createRefund(db, stripe, "sparkthunder", input({ cardPence: 1000 }));
    expect(r.ok).toBe(false);
    expect((await order()).refunded_card_pence).toBe(0);
    stripeFails = "none";
    expect((await createRefund(db, stripe, "sparkthunder", input({ cardPence: 1000 }))).ok).toBe(true);
  });

  it("resumes after a crash part way: Stripe is not asked twice, the rest completes", async () => {
    const real = db;
    let boom = true;
    const crashy = { ...(real as object), rpc: async (name: string, a: Record<string, unknown>) => (name === "restock_item" && boom ? { data: null, error: { message: "connection reset" } } : (real as Db).rpc(name, a)) } as unknown as Db;
    const i = input({ cardPence: 2000, restock: [{ line: 0, qty: 1 }] });
    const first = await createRefund(crashy, stripe, "sparkthunder", i);
    expect(first.ok).toBe(false);
    boom = false;
    const second = await createRefund(real, stripe, "sparkthunder", i);
    expect(second.ok).toBe(true);
    expect(calls).toHaveLength(1);
    expect((await product("tee")).stock_qty).toBe(4);
    expect(sent).toHaveLength(1);
  });

  it("rejects a gift card refund on an order that used no gift card, and amounts of nothing", async () => {
    await db.from("orders").update({ gift_card_code: "", gift_card_pence: 0 }).eq("id", "o1");
    expect((await createRefund(db, stripe, "sparkthunder", input({ giftPence: 100 }))).ok).toBe(false);
    expect((await createRefund(db, stripe, "sparkthunder", input())).ok).toBe(false);
    expect(await rows("order_refunds")).toHaveLength(0);
  });

  it("processRefund on a finished refund does nothing more", async () => {
    const r = await createRefund(db, stripe, "sparkthunder", input({ cardPence: 500 }));
    const id = (r as { refund: { id: string } }).refund.id;
    await processRefund(db, stripe, "sparkthunder", id);
    expect(calls).toHaveLength(1);
    expect(sent).toHaveLength(1);
  });
});

describe("refunds made in the Stripe dashboard", () => {
  it("records each one once and leaves refunds made by this admin alone", async () => {
    const { recordExternalRefunds } = await import("@/lib/shop/refund");
    const list = [{ id: "re_x", amount: 700, status: "succeeded" }, { id: "re_ours", amount: 100, status: "succeeded", metadata: { spark_refund: "abc" } }, { id: "re_pending", amount: 50, status: "pending" }];
    expect(await recordExternalRefunds(db, "sparkthunder", "pi_1", list)).toBe(1);
    expect(await recordExternalRefunds(db, "sparkthunder", "pi_1", list)).toBe(0);
    expect((await order()).refunded_card_pence).toBe(700);
    expect((await rows("order_refunds"))[0].source).toBe("stripe");
    expect(await recordExternalRefunds(db, "sparkthunder", "pi_unknown", list)).toBe(0);
  });
});
