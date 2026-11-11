import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/lib/db/clients";
import { createFakeClient } from "@/lib/db/fake";
import { isUnsubscribed, runLifecycle, unsubscribe, unsubscribeToken, verifyUnsubscribe } from "@/lib/lifecycle";

const g = globalThis as unknown as { __sparkFake?: unknown };
let db: Db;
let sent: { to: string; subject: string; html: string }[];
const send = async (m: { to: string; subject: string; html: string; text: string }) => { sent.push(m); return { ok: true as const }; };
const now = Date.parse("2026-11-10T12:00:00Z");
const ago = (ms: number) => new Date(now - ms).toISOString();
const H = 3600_000, D = 24 * H;

const basket = (o: Record<string, unknown>) => db.from("basket_saves").insert({ email: "a@x.com", cart: [{ slug: "tee", name: "Tee", qty: 2, pricePence: 2000 }], subtotal_pence: 4000, created_at: ago(2 * H), reminded_at: null, ...o });
const order = (o: Record<string, unknown>) => db.from("orders").insert({ id: crypto.randomUUID(), number: "SPK-1", status: "shipped", email: "b@x.com", name: "B", shipped_at: ago(10 * D), created_at: ago(14 * D), review_requested_at: null, items: [{ type: "product", slug: "tee", name: "Tee", sku: "T", unitPence: 2000, qty: 1, image: "" }], ...o });

beforeEach(() => { g.__sparkFake = undefined; sent = []; db = createFakeClient() as unknown as Db; });

describe("basket reminders", () => {
  it("sends one reminder after an hour, and never again", async () => {
    await basket({});
    const r = await runLifecycle(db, { storeId: "sparkthunder", send, now });
    expect(r.reminders).toBe(1);
    expect(sent[0].to).toBe("a@x.com"); expect(sent[0].html).toContain("Unsubscribe");
    expect((await runLifecycle(db, { storeId: "sparkthunder", send, now: now + H })).reminders).toBe(0);
    expect(sent).toHaveLength(1);
  });
  it("waits an hour, skips people who already ordered, and skips unsubscribed addresses", async () => {
    await basket({ email: "new@x.com", created_at: ago(10 * 60_000) });
    await basket({ email: "bought@x.com" }); await order({ email: "bought@x.com", status: "paid", shipped_at: null, created_at: ago(H) });
    await basket({ email: "stop@x.com" }); await unsubscribe(db, "stop@x.com");
    const r = await runLifecycle(db, { storeId: "sparkthunder", send, now });
    expect(sent.map((m) => m.to)).toEqual([]);
    expect(r.reminders).toBe(0);
  });
  it("deletes saved baskets after 30 days", async () => {
    await basket({ email: "old@x.com", created_at: ago(40 * D), reminded_at: ago(39 * D) });
    expect((await runLifecycle(db, { storeId: "sparkthunder", send, now })).cleaned).toBe(1);
  });
});

describe("review requests", () => {
  it("asks once, 7 to 30 days after dispatch", async () => {
    await order({});
    await order({ id: crypto.randomUUID(), email: "recent@x.com", shipped_at: ago(2 * D) });
    await order({ id: crypto.randomUUID(), email: "ancient@x.com", shipped_at: ago(60 * D) });
    const r = await runLifecycle(db, { storeId: "sparkthunder", send, now });
    expect(r.reviewRequests).toBe(1); expect(sent[0].to).toBe("b@x.com"); expect(sent[0].html).toContain("/products/tee#reviews");
    expect((await runLifecycle(db, { storeId: "sparkthunder", send, now })).reviewRequests).toBe(0);
  });
  it("does not ask people who unsubscribed", async () => {
    await order({}); await unsubscribe(db, "B@x.com");
    expect((await runLifecycle(db, { storeId: "sparkthunder", send, now })).reviewRequests).toBe(0);
    expect(await isUnsubscribed(db, "b@x.com")).toBe(true);
  });
});

describe("unsubscribe links", () => {
  it("only work for the right address and store", () => {
    const t = unsubscribeToken("sparkthunder", "A@x.com");
    expect(verifyUnsubscribe("sparkthunder", "a@x.com", t)).toBe(true);
    expect(verifyUnsubscribe("sparkthunder", "other@x.com", t)).toBe(false);
    expect(verifyUnsubscribe("misspetty", "a@x.com", t)).toBe(false);
    expect(verifyUnsubscribe("sparkthunder", "a@x.com", "")).toBe(false);
  });
});
