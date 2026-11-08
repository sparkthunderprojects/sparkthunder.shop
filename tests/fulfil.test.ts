import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/lib/db/clients";

const sent: { to: string; subject: string }[] = [];
let emailFailsOnce = false;
vi.mock("@/lib/commerce", () => ({ getCommerce: async () => ({ codePrefix: "SPK", supportEmail: "owner@shop.test" }) }));
vi.mock("@/lib/email/send", () => ({
  sendEmail: async (m: { to: string; subject: string }) => {
    if (emailFailsOnce) { emailFailsOnce = false; throw new Error("network down"); }
    sent.push({ to: m.to, subject: m.subject }); return { ok: true };
  },
}));

import { createFakeClient } from "@/lib/db/fake";
import { fulfilOrder } from "@/lib/shop/fulfil";
import { holdStock, releaseStock, stockItems } from "@/lib/shop/stock";
import type { Snapshot } from "@/lib/shop/types";

const g = globalThis as unknown as { __sparkFake?: unknown };
let db: Db;
const rows = async (t: string) => ((await db.from(t).select("*")).data ?? []) as Record<string, unknown>[];
const product = async (slug: string) => (await db.from("products").select("*").eq("slug", slug).maybeSingle()).data as Record<string, unknown>;

async function checkout(id: string, lines: Snapshot["lines"], extra: Partial<Snapshot> = {}) {
  const subtotal = lines.reduce((n, l) => n + l.unitPence * l.qty, 0);
  await db.from("checkout_snapshots").insert({ id, payload: { lines, subtotalPence: subtotal, shippingPence: 399, needsShipping: true, discount: null, giftCard: null, totalPence: subtotal + 399, ...extra } });
  return { sessionId: id, paymentIntent: `pi_${id}`, email: "buyer@example.com", name: "Buyer", phone: "", address: null, storeId: "sparkthunder" };
}
const line = (slug: string, qty: number, variant?: string): Snapshot["lines"][number] => ({ type: "product", slug, variant, name: slug, sku: slug.toUpperCase(), unitPence: 1000, qty, image: "" });

/** Wrap the client so chosen database function calls fail, to simulate the server dying mid-order. */
const flaky = (fail: (name: string, args: Record<string, unknown>) => boolean): Db => ({ ...(db as object), rpc: async (n: string, a: Record<string, unknown>) => (fail(n, a) ? { data: null, error: { message: "connection reset" } } : (db as unknown as { rpc: Db["rpc"] }).rpc(n, a)) }) as unknown as Db;

beforeEach(async () => {
  g.__sparkFake = undefined; sent.length = 0; emailFailsOnce = false;
  db = createFakeClient() as unknown as Db;
  const base = { franchise_slug: "knightverge", category_slug: "apparel", price_pence: 1000, track_stock: true, in_stock: true, published: true, variants: [], bundle_items: [] };
  await db.from("products").insert([
    { ...base, slug: "tee", sku: "TEE", name: "Tee", stock_qty: 5 },
    { ...base, slug: "mug", sku: "MUG", name: "Mug", stock_qty: 5 },
    { ...base, slug: "cap", sku: "CAP", name: "Cap", stock_qty: 1 },
    { ...base, slug: "hoodie", sku: "HOOD", name: "Hoodie", stock_qty: 6, variants: [{ name: "Black / M", sku: "H1", stockQty: 3 }, { name: "Black / L", sku: "H2", stockQty: 3 }] },
  ]);
});

describe("fulfilOrder", () => {
  it("creates the order, takes stock, sends one email and marks it finished", async () => {
    const r = await fulfilOrder(db, await checkout("cs_1", [line("tee", 2)]));
    expect(r.order.number).toBe("SPK-1001");
    expect(r.order.fulfilled_at).toBeTruthy();
    expect((await product("tee")).stock_qty).toBe(3);
    expect(sent).toHaveLength(1);
  });

  it("does nothing the second time for the same payment", async () => {
    const s = await checkout("cs_2", [line("tee", 2)]);
    await fulfilOrder(db, s); const again = await fulfilOrder(db, s);
    expect(again.created).toBe(false);
    expect(await rows("orders")).toHaveLength(1);
    expect((await product("tee")).stock_qty).toBe(3);
    expect(sent).toHaveLength(1);
  });

  it("numbers orders one after another", async () => {
    const a = await fulfilOrder(db, await checkout("cs_a", [line("tee", 1)]));
    const b = await fulfilOrder(db, await checkout("cs_b", [line("tee", 1)]));
    expect([a.order.number, b.order.number]).toEqual(["SPK-1001", "SPK-1002"]);
  });

  it("picks up where it stopped after a failure, without repeating finished steps", async () => {
    const s = await checkout("cs_3", [line("tee", 1), line("mug", 2)]);
    // The database drops out when taking stock for the mug (the second product).
    await expect(fulfilOrder(flaky((n, a) => n === "take_stock" && a.p_slug === "mug"), s)).rejects.toThrow();
    expect((await product("tee")).stock_qty).toBe(4);   // finished before the failure
    expect((await product("mug")).stock_qty).toBe(5);   // not yet taken
    const done = await fulfilOrder(db, s);               // Stripe retries
    expect(done.order.fulfilled_at).toBeTruthy();
    expect((await product("tee")).stock_qty).toBe(4);   // not taken twice
    expect((await product("mug")).stock_qty).toBe(3);
    expect(sent).toHaveLength(1);
    expect(await rows("orders")).toHaveLength(1);
  });

  it("lets only one worker finish an order at a time", async () => {
    const s = await checkout("cs_4", [line("tee", 2)]);
    const results = await Promise.all([fulfilOrder(db, s), fulfilOrder(db, s), fulfilOrder(db, s)]);
    expect(results.every((r) => r.busy || r.order.fulfilled_at)).toBe(true);
    expect(await rows("orders")).toHaveLength(1);
    expect((await product("tee")).stock_qty).toBe(3);
    expect(sent).toHaveLength(1);
  });

  it("turns away a second worker while the first holds the order, and takes over if the first died", async () => {
    const s = await checkout("cs_lock", [line("tee", 1)]);
    await expect(fulfilOrder(flaky((n) => n === "take_stock"), s)).rejects.toThrow();
    const order = (await rows("orders"))[0];
    await db.from("orders").update({ fulfilment_lock_until: new Date(Date.now() + 60_000).toISOString() }).eq("id", order.id);
    expect((await fulfilOrder(db, s)).busy).toBe(true);
    expect((await product("tee")).stock_qty).toBe(5);       // nothing happened while locked
    await db.from("orders").update({ fulfilment_lock_until: new Date(Date.now() - 1000).toISOString() }).eq("id", order.id); // the worker died; its lock ran out
    expect((await fulfilOrder(db, s)).order.fulfilled_at).toBeTruthy();
    expect((await product("tee")).stock_qty).toBe(4);
  });

  it("takes stock off a variant and keeps the product total in step", async () => {
    await fulfilOrder(db, await checkout("cs_5", [line("hoodie", 2, "Black / M")]));
    const p = await product("hoodie");
    expect((p.variants as { stockQty: number }[]).map((v) => v.stockQty)).toEqual([1, 3]);
    expect(p.stock_qty).toBe(4);
  });

  it("never lets stock go below zero and flags the order when it was oversold", async () => {
    const r = await fulfilOrder(db, await checkout("cs_6", [line("cap", 3)]));
    expect((await product("cap")).stock_qty).toBe(0);
    expect((await product("cap")).in_stock).toBe(false);
    expect(r.order.status).toBe("attention");
    expect(r.order.attention_reason).toMatch(/oversold/);
    // The owner is emailed about it (once).
    expect(sent.filter((m) => m.to === "owner@shop.test" && /needs your attention/.test(m.subject))).toHaveLength(1);
  });

  it("charges a gift card once even if the order has to be retried", async () => {
    const card = (await db.from("gift_cards").insert({ code: "ABCDEFGHJKLM", initial_pence: 5000, balance_pence: 5000, status: "active", currency: "GBP" }).select("*").single()).data as { id: string };
    const s = await checkout("cs_7", [line("tee", 1)], { giftCard: { cardId: card.id, code: "ABCDEFGHJKLM", appliedPence: 1000 }, totalPence: 399 });
    await expect(fulfilOrder(flaky((n) => n === "take_stock"), s)).rejects.toThrow(); // fails after the card was charged
    await fulfilOrder(db, s);
    const after = (await db.from("gift_cards").select("*").eq("id", card.id).maybeSingle()).data as { balance_pence: number };
    expect(after.balance_pence).toBe(4000);
    expect((await rows("gift_card_ledger")).filter((l) => l.kind === "redeem")).toHaveLength(1);
  });

  it("issues each purchased gift card once, even when a retry happens part way through", async () => {
    const gift = { type: "gift" as const, name: "Gift card", unitPence: 2500, qty: 2, gift: { recipientName: "Ava", recipientEmail: "ava@example.com", senderName: "Sam", message: "", theme: "brand" } };
    const s = await checkout("cs_8", [gift]);
    emailFailsOnce = true; // the email provider drops out while sending the first card
    await expect(fulfilOrder(db, s)).rejects.toThrow();
    await fulfilOrder(db, s);
    expect(await rows("gift_cards")).toHaveLength(2);
    expect((await rows("gift_cards")).every((c) => c.emailed_at)).toBe(true);
  });

  it("reports a step that keeps failing instead of retrying forever", async () => {
    const s = await checkout("cs_9", [line("tee", 1)]);
    const broken = flaky((n) => n === "take_stock");
    let last = null;
    for (let i = 0; i < 6; i++) { try { last = await fulfilOrder(broken, s); } catch { /* retried */ } }
    expect(last?.order.fulfilled_at).toBeTruthy();
    expect(last?.order.status).toBe("attention");
    expect(last?.order.attention_reason).toMatch(/Taking stock off tee could not be completed/);
  });

  it("records a basket that went missing so the owner can fix it by hand", async () => {
    const r = await fulfilOrder(db, { sessionId: "cs_none", paymentIntent: "pi", email: "x@example.com", name: "X", phone: "", address: null, storeId: "sparkthunder" });
    expect(r.order.status).toBe("attention");
    expect(r.order.attention_reason).toMatch(/snapshot was missing/);
  });
});

describe("stock holds at checkout", () => {
  const items = (lines: Snapshot["lines"]) => stockItems(db, lines);

  it("lets only one of two shoppers take the last unit, and says why to the other", async () => {
    expect((await holdStock(db, "sparkthunder", "rsv_a", await items([line("cap", 1)]))).ok).toBe(true);
    const b = await holdStock(db, "sparkthunder", "rsv_b", await items([line("cap", 1)]));
    expect(b.ok).toBe(false);
    expect(!b.ok && b.message).toMatch(/cap: none left right now/);
  });

  it("gives the stock back when the hold is released, so the next shopper can buy it", async () => {
    await holdStock(db, "sparkthunder", "rsv_a", await items([line("cap", 1)]));
    await releaseStock(db, "sparkthunder", "rsv_a");
    expect((await holdStock(db, "sparkthunder", "rsv_b", await items([line("cap", 1)]))).ok).toBe(true);
  });

  it("a paid order uses up its hold, and the stock is counted off exactly once", async () => {
    const lines = [line("tee", 2)];
    expect((await holdStock(db, "sparkthunder", "rsv_p", await items(lines))).ok).toBe(true);
    const s = await checkout("cs_hold", lines, { reservation: "rsv_p" });
    await fulfilOrder(db, s);
    expect((await product("tee")).stock_qty).toBe(3);
    // The hold is gone: the 3 left can all be held by someone else.
    expect((await holdStock(db, "sparkthunder", "rsv_q", await items([line("tee", 3)]))).ok).toBe(true);
  });

  it("holds do not count against the shopper who made them when they start again", async () => {
    await holdStock(db, "sparkthunder", "rsv_a", await items([line("tee", 5)]));
    expect((await holdStock(db, "sparkthunder", "rsv_a", await items([line("tee", 5)]))).ok).toBe(true);
  });

  it("ignores products that do not track stock", async () => {
    await db.from("products").update({ track_stock: false }).eq("slug", "tee");
    expect((await holdStock(db, "sparkthunder", "rsv_a", await items([line("tee", 99)]))).ok).toBe(true);
  });

  it("counts a discount code once, even if the order is finished again after a crash", async () => {
    await db.from("discount_codes").insert({ id: "d1", code: "SAVE", kind: "fixed", value: 100, max_uses: 1, uses: 0, active: true });
    const s = await checkout("cs_disc", [line("tee", 1)], { discount: { id: "d1", code: "SAVE", appliedPence: 100 } as never });
    const flakyDb = flaky((n) => n === "take_stock");
    await expect(fulfilOrder(flakyDb, s)).rejects.toThrow();
    await fulfilOrder(db, s);
    await fulfilOrder(db, s);
    expect(((await rows("discount_codes"))[0]).uses).toBe(1);
  });

  it("honours a paid order but flags a code that went over its limit", async () => {
    await db.from("discount_codes").insert({ id: "d2", code: "ONCE", kind: "fixed", value: 100, max_uses: 1, uses: 1, active: true });
    const r = await fulfilOrder(db, await checkout("cs_over", [line("tee", 1)], { discount: { id: "d2", code: "ONCE", appliedPence: 100 } as never }));
    expect(r.order.fulfilled_at).toBeTruthy();
    expect(JSON.stringify(r.order.fulfilment?.problems)).toContain("over its use limit");
  });
});
