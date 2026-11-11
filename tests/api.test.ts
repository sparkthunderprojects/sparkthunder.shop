import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/lib/db/clients";
import { createFakeClient } from "@/lib/db/fake";

const hoisted = vi.hoisted(() => ({ db: null as unknown, sent: [] as unknown[], busted: [] as string[] }));
vi.mock("@/lib/db/clients", () => ({ serviceClient: () => hoisted.db }));
vi.mock("@/lib/db/stores", () => ({ currentStoreId: async () => "sparkthunder" }));
vi.mock("@/lib/ratelimit", () => ({ rateLimit: async () => ({ ok: true }) }));
vi.mock("@/lib/email/send", () => ({ sendEmail: async (m: unknown) => { hoisted.sent.push(m); return { ok: true }; } }));
vi.mock("@/lib/tags", () => ({ bustTag: async (t: string) => { hoisted.busted.push(t); } }));
vi.mock("@/lib/catalog", () => ({ CATALOG_TAG: "catalog" }));
vi.mock("@/lib/commerce", () => ({ getCommerce: async () => ({ codePrefix: "SPK" }) }));
vi.mock("@/lib/shop/refund-stripe", () => ({ refundStripe: async () => ({ refunds: { create: async (_p: unknown, o?: { idempotencyKey?: string }) => ({ id: `re_${o?.idempotencyKey}` }) } }) }));
vi.mock("@/lib/log", () => ({ log: { warn: async () => {}, info: async () => {}, error: async () => {} } }));

import { applyProductPatch } from "@/lib/api/products";
import { authenticate, createApiKey } from "@/lib/api/keys";
import { checkWebhookUrl, emitEvent, MAX_ATTEMPTS, publicOrder, runDeliveries, sign } from "@/lib/webhooks/outbound";
import { GET as listOrders } from "@/app/api/v1/orders/route";
import { GET as getOrder } from "@/app/api/v1/orders/[id]/route";
import { POST as shipOrder } from "@/app/api/v1/orders/[id]/ship/route";
import { PATCH as patchProduct, GET as getProduct } from "@/app/api/v1/products/[slug]/route";

const fresh = () => { (globalThis as { __sparkFake?: unknown }).__sparkFake = undefined; const db = createFakeClient() as unknown as Db; hoisted.db = db; hoisted.sent = []; hoisted.busted = []; return db; };
const order = (n: number, over: object = {}) => ({ id: `o-${n}`, number: `SP-${n}`, status: "paid", email: "a@b.co", name: "Ann", phone: "", shipping_address: { line1: "1 Road" }, items: [], subtotal_pence: 1000, shipping_pence: 300, total_pence: 1300, stripe_payment_intent: "pi_secret", notes: "private", tracking_carrier: "", tracking_number: "", shipped_at: null, created_at: `2026-11-0${n}T10:00:00Z`, ...over });
const call = (h: (r: Request, c: { params: Promise<never> }) => Promise<Response>, url: string, init: RequestInit & { key?: string } = {}, params: object = {}) =>
  h(new Request(`https://shop.test${url}`, { ...init, headers: { ...(init.key ? { Authorization: `Bearer ${init.key}` } : {}), "Content-Type": "application/json" } }), { params: Promise.resolve(params as never) });

describe("webhook basics", () => {
  it("signs the body so the receiver can check it", () => {
    expect(sign("s", "{}")).toBe("sha256=" + createHmac("sha256", "s").update("{}").digest("hex"));
  });
  it("only accepts public https addresses", () => {
    for (const bad of ["http://example.com/h", "https://localhost/h", "https://127.0.0.1/h", "https://192.168.1.5/h", "https://10.0.0.1/h", "https://169.254.169.254/latest", "https://[::1]/h", "https://intranet/h", "https://user:pw@example.com/h", "nonsense"]) expect(checkWebhookUrl(bad).ok, bad).toBe(false);
    expect(checkWebhookUrl("https://example.com/hooks/spark").ok).toBe(true);
  });
  it("never leaks payment or internal fields", () => {
    const p = JSON.stringify(publicOrder(order(1) as never));
    expect(p).not.toContain("pi_secret"); expect(p).not.toContain("private"); expect(p).toContain("SP-1");
  });
});

describe("sending events", () => {
  const ok = () => vi.fn(async () => new Response("", { status: 200 })) as unknown as typeof fetch;
  async function endpoint(db: Db, o: object = {}) { const { data } = await db.from("webhook_endpoints").insert({ url: "https://example.com/h", secret: "whsec_x", events: [], active: true, ...o }).select("*").single(); return data as { id: string }; }

  it("sends to every interested endpoint, signed, and records it", async () => {
    const db = fresh(); await endpoint(db); await endpoint(db, { events: ["order.refunded"] }); await endpoint(db, { active: false });
    const f = ok();
    await emitEvent(db, "order.created", { n: 1 }, f);
    expect((f as unknown as { mock: { calls: unknown[][] } }).mock.calls).toHaveLength(1); // the refunds-only and the switched-off endpoint are skipped
    const [, init] = (f as unknown as { mock: { calls: [unknown, RequestInit][] } }).mock.calls[0];
    expect((init.headers as Record<string, string>)["X-Spark-Signature"]).toBe(sign("whsec_x", init.body as string));
    expect(JSON.parse(init.body as string)).toMatchObject({ event: "order.created", data: { n: 1 } });
    const { data } = await db.from("webhook_deliveries").select("*");
    expect(data).toHaveLength(1); expect((data as { status: string }[])[0].status).toBe("ok");
  });
  it("keeps a failed delivery and retries it later with a growing delay, then gives up", async () => {
    const db = fresh(); await endpoint(db);
    const down = vi.fn(async () => new Response("no", { status: 500 })) as unknown as typeof fetch;
    const t0 = Date.now();
    await emitEvent(db, "order.shipped", {}, down);
    let row = ((await db.from("webhook_deliveries").select("*")).data as { id: string; status: string; attempts: number; next_attempt_at: string }[])[0];
    expect(row).toMatchObject({ status: "pending", attempts: 1 });
    expect(Date.parse(row.next_attempt_at)).toBeGreaterThan(t0);
    expect((await runDeliveries(db, { now: t0, fetchImpl: down })).retried).toBe(0); // not due yet
    let now = t0;
    for (let i = 1; i < MAX_ATTEMPTS; i++) { now += 13 * 3600_000; await runDeliveries(db, { now, fetchImpl: down }); }
    row = ((await db.from("webhook_deliveries").select("*")).data as typeof row[])[0];
    expect(row).toMatchObject({ status: "failed", attempts: MAX_ATTEMPTS });
  });
  it("a retry that works marks it delivered; a deleted endpoint ends it", async () => {
    const db = fresh(); const ep = await endpoint(db);
    await emitEvent(db, "order.created", {}, vi.fn(async () => { throw new Error("connect refused"); }) as unknown as typeof fetch);
    const r = await runDeliveries(db, { now: Date.now() + 3600_000, fetchImpl: ok() });
    expect(r).toEqual({ retried: 1, ok: 1 });
    await emitEvent(db, "order.created", {}, vi.fn(async () => { throw new Error("x"); }) as unknown as typeof fetch);
    await db.from("webhook_endpoints").update({ active: false }).eq("id", ep.id);
    await runDeliveries(db, { now: Date.now() + 3600_000, fetchImpl: ok() });
    const rows = (await db.from("webhook_deliveries").select("*")).data as { status: string }[];
    expect(rows.map((x) => x.status).sort()).toEqual(["failed", "ok"]);
  });
  it("never throws, even if the database is broken", async () => {
    const broken = { from: () => { throw new Error("db down"); } } as unknown as Db;
    await expect(emitEvent(broken, "order.created", {})).resolves.toBeUndefined();
  });
  it("does not follow redirects or call private hosts", async () => {
    const db = fresh(); await endpoint(db, { url: "https://example.com/h" });
    const f = vi.fn(async () => new Response("", { status: 302, headers: { Location: "http://169.254.169.254/" } })) as unknown as typeof fetch;
    await emitEvent(db, "order.created", {}, f);
    expect(((f as unknown as { mock: { calls: [unknown, RequestInit][] } }).mock.calls[0][1]).redirect).toBe("manual");
    const row = ((await db.from("webhook_deliveries").select("*")).data as { status: string }[])[0];
    expect(row.status).toBe("pending"); // 302 is not success
  });
});

describe("API keys", () => {
  it("stores only a hash, and checks permission and revocation", async () => {
    const db = fresh();
    const r = await createApiKey(db, { name: "Test", scopes: ["read"], by: "me" });
    if (!r.ok) throw new Error(r.error);
    const stored = JSON.stringify((await db.from("api_keys").select("*")).data);
    expect(stored).not.toContain(r.key);
    expect((await authenticate(db, `Bearer ${r.key}`, "read")).ok).toBe(true);
    expect(await authenticate(db, `Bearer ${r.key}`, "write")).toMatchObject({ ok: false, status: 403 });
    expect(await authenticate(db, "Bearer spk_nope", "read")).toMatchObject({ ok: false, status: 401 });
    expect(await authenticate(db, null, "read")).toMatchObject({ ok: false, status: 401 });
    await db.from("api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", r.row.id);
    expect(await authenticate(db, `Bearer ${r.key}`, "read")).toMatchObject({ ok: false, status: 401 });
  });
});

describe("product changes", () => {
  it("allows only price, stock and visibility, and checks the values", () => {
    expect(applyProductPatch({ price_pence: 1999, stock_qty: 5, in_stock: true, published: false })).toMatchObject({ ok: true });
    for (const bad of [{ name: "x" }, { price_pence: -1 }, { price_pence: 9.5 }, { stock_qty: "5" }, { in_stock: "yes" }, {}, [], null]) expect(applyProductPatch(bad).ok, JSON.stringify(bad)).toBe(false);
  });
});

describe("the REST API", () => {
  let readKey = "", writeKey = "";
  beforeEach(async () => {
    const db = fresh();
    for (let i = 1; i <= 3; i++) await db.from("orders").insert(order(i));
    await db.from("products").insert({ slug: "tee", sku: "T1", name: "Tee", franchise_slug: "k", category_slug: "a", price_pence: 2000, short_description: "", description: "", images: [], in_stock: true, created_at: "2026-11-01T00:00:00Z" });
    const a = await createApiKey(db, { name: "r", scopes: ["read"], by: "" }), b = await createApiKey(db, { name: "w", scopes: ["read", "write"], by: "" });
    if (!a.ok || !b.ok) throw new Error("keys");
    readKey = a.key; writeKey = b.key;
  });

  it("refuses requests without a valid key", async () => {
    expect((await call(listOrders, "/api/v1/orders")).status).toBe(401);
    expect((await call(listOrders, "/api/v1/orders", { key: "spk_wrong" })).status).toBe(401);
    expect((await call(shipOrder, "/api/v1/orders/SP-1/ship", { method: "POST", key: readKey, body: "{}" }, { id: "SP-1" })).status).toBe(403);
  });
  it("lists orders newest first with paging, and hides internal fields", async () => {
    const res = await call(listOrders, "/api/v1/orders?limit=2", { key: readKey });
    const body = await res.json();
    expect(body.data.map((o: { number: string }) => o.number)).toEqual(["SP-3", "SP-2"]);
    expect(body.has_more).toBe(true);
    const page2 = await (await call(listOrders, `/api/v1/orders?limit=2&before=${encodeURIComponent(body.next_before)}`, { key: readKey })).json();
    expect(page2.data.map((o: { number: string }) => o.number)).toEqual(["SP-1"]);
    expect(JSON.stringify(body)).not.toContain("pi_secret");
    expect((await call(listOrders, "/api/v1/orders?status=bogus", { key: readKey })).status).toBe(400);
  });
  it("finds an order by number or id", async () => {
    expect((await (await call(getOrder, "/api/v1/orders/SP-2", { key: readKey }, { id: "SP-2" })).json()).data.number).toBe("SP-2");
    expect((await call(getOrder, "/api/v1/orders/nope", { key: readKey }, { id: "nope" })).status).toBe(404);
  });
  it("marks an order shipped, emails the customer and is safe to repeat", async () => {
    const db = hoisted.db as Db;
    await db.from("webhook_endpoints").insert({ url: "https://example.com/h", secret: "s", events: [], active: true });
    const go = () => call(shipOrder, "/api/v1/orders/SP-1/ship", { method: "POST", key: writeKey, body: JSON.stringify({ carrier: "Royal Mail", tracking: "AB1" }) }, { id: "SP-1" });
    const first = await go();
    expect(first.status).toBe(200);
    expect((await (await call(getOrder, "/api/v1/orders/SP-1", { key: readKey }, { id: "SP-1" })).json()).data).toMatchObject({ status: "shipped", tracking: { carrier: "Royal Mail", number: "AB1" } });
    expect(hoisted.sent).toHaveLength(1);
    expect((await (await go()).json()).already_shipped).toBe(true);
    expect(hoisted.sent).toHaveLength(1); // not emailed twice
    await db.from("orders").update({ status: "cancelled" }).eq("number", "SP-2");
    expect((await call(shipOrder, "/api/v1/orders/SP-2/ship", { method: "POST", key: writeKey, body: "{}" }, { id: "SP-2" })).status).toBe(409);
  });
  it("reads and changes products, only the allowed fields", async () => {
    expect((await (await call(getProduct, "/api/v1/products/tee", { key: readKey }, { slug: "tee" })).json()).data.price_pence).toBe(2000);
    const patch = (b: object, key = writeKey) => call(patchProduct, "/api/v1/products/tee", { method: "PATCH", key, body: JSON.stringify(b) }, { slug: "tee" });
    expect((await patch({ price_pence: 2500, stock_qty: 7 })).status).toBe(200);
    expect(hoisted.busted).toContain("catalog");
    expect((await (await call(getProduct, "/api/v1/products/tee", { key: readKey }, { slug: "tee" })).json()).data).toMatchObject({ price_pence: 2500, stock_qty: 7 });
    expect((await patch({ name: "Hacked" })).status).toBe(400);
    expect((await patch({ price_pence: 1 }, readKey)).status).toBe(403);
  });
});

describe("refunds, returns and customer lookup through the API", () => {
  let refundKey = "", writeKey = "";
  beforeEach(async () => {
    const db = fresh();
    await db.from("products").insert({ slug: "tee", sku: "T1", name: "Tee", franchise_slug: "k", category_slug: "a", price_pence: 2000, short_description: "", description: "", images: [], in_stock: true, track_stock: true, stock_qty: 1, variants: [], bundle_items: [] });
    await db.from("orders").insert({ ...order(1), id: "o-1", stripe_payment_intent: "pi_1", total_pence: 3000, subtotal_pence: 2700, shipping_pence: 300, items: [{ type: "product", slug: "tee", name: "Tee", sku: "T1", unitPence: 2700, qty: 1, image: "" }], fulfilled_at: new Date().toISOString() });
    await db.from("orders").insert(order(2, { email: "Other_Person@x.co" }));
    await db.from("return_requests").insert({ id: "r-1", order_id: "o-1", order_number: "SP-1", email: "a@b.co", name: "Ann", items: [{ line: 0, name: "Tee", qty: 1 }], reason: "Damaged", details: "", status: "requested", admin_note: "secret note", created_at: "2026-11-02T10:00:00Z", resolved_at: null });
    const a = await createApiKey(db, { name: "refunder", scopes: ["read", "write", "refund"], by: "" }), b = await createApiKey(db, { name: "w", scopes: ["read", "write"], by: "" });
    if (!a.ok || !b.ok) throw new Error("keys");
    refundKey = a.key; writeKey = b.key;
  });
  const refund = async (body: object, key: string, idem: string | null = "refund-key-0001") => {
    const { POST } = await import("@/app/api/v1/orders/[id]/refund/route");
    const headers: Record<string, string> = { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(idem ? { "Idempotency-Key": idem } : {}) };
    return POST(new Request("https://shop.test/api/v1/orders/SP-1/refund", { method: "POST", headers, body: JSON.stringify(body) }), { params: Promise.resolve({ id: "SP-1" }) });
  };
  it("needs the refund permission and an idempotency key, and checks the amounts", async () => {
    expect((await refund({ card_pence: 100 }, writeKey)).status).toBe(403);
    expect((await refund({ card_pence: 100 }, refundKey, null)).status).toBe(400);
    expect((await refund({ card_pence: 0 }, refundKey)).status).toBe(400);
    expect((await refund({ card_pence: -5 }, refundKey)).status).toBe(400);
    expect((await refund({ card_pence: 1.5 }, refundKey)).status).toBe(400);
  });
  it("refunds once however many times the same request is sent, and restocks", async () => {
    const r1 = await refund({ card_pence: 1000, reason: "Damaged", restock: [{ line: 0, qty: 1 }] }, refundKey);
    expect(r1.status).toBe(200);
    const d1 = (await r1.json()).data;
    expect(d1).toMatchObject({ order: "SP-1", card_pence: 1000, status: "done" });
    const r2 = await refund({ card_pence: 1000, reason: "Damaged", restock: [{ line: 0, qty: 1 }] }, refundKey);
    expect((await r2.json()).data.id).toBe(d1.id);
    const refunds = ((await (hoisted.db as Db).from("order_refunds").select("*")).data ?? []) as { card_pence: number }[];
    expect(refunds).toHaveLength(1);
    const tee = ((await (hoisted.db as Db).from("products").select("*").eq("slug", "tee")).data as { stock_qty: number }[])[0];
    expect(tee.stock_qty).toBe(2);
    expect((await (await call(getOrder, "/api/v1/orders/SP-1", { key: refundKey }, { id: "SP-1" })).json()).data.refunded_pence).toBe(1000);
  });
  it("refuses to refund more than was paid", async () => {
    const r = await refund({ card_pence: 999999 }, refundKey, "refund-key-0002");
    expect(r.status).toBe(422);
  });
  it("lists returns without internal notes, filters by status, and finds one", async () => {
    const { GET: listReturns } = await import("@/app/api/v1/returns/route");
    const { GET: oneReturn } = await import("@/app/api/v1/returns/[id]/route");
    const list = await (await call(listReturns, "/api/v1/returns?status=requested", { key: refundKey })).json();
    expect(list.data).toHaveLength(1); expect(JSON.stringify(list)).not.toContain("secret note");
    expect((await (await call(listReturns, "/api/v1/returns?status=refunded", { key: refundKey })).json()).data).toHaveLength(0);
    expect((await call(listReturns, "/api/v1/returns?status=bogus", { key: refundKey })).status).toBe(400);
    expect((await (await call(oneReturn, "/api/v1/returns/r-1", { key: refundKey }, { id: "r-1" })).json()).data).toMatchObject({ order: "SP-1", status: "requested" });
    expect((await call(oneReturn, "/api/v1/returns/zzz", { key: refundKey }, { id: "zzz" })).status).toBe(404);
  });
  it("finds a customer's orders by email, ignoring case", async () => {
    const mine = await (await call(listOrders, "/api/v1/orders?email=A@B.CO", { key: refundKey })).json();
    expect(mine.data.map((o: { number: string }) => o.number)).toEqual(["SP-1"]);
  });
});
