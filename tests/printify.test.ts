import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import type { Db } from "@/lib/db/clients";

const sent: { to: string; subject: string }[] = [];
vi.mock("@/lib/commerce", () => ({ getCommerce: async () => ({ codePrefix: "SPK", supportEmail: "o@shop.test" }) }));
vi.mock("@/lib/email/send", () => ({ sendEmail: async (m: { to: string; subject: string }) => { sent.push({ to: m.to, subject: m.subject }); return { ok: true }; } }));
vi.mock("@/lib/secrets", () => ({ getStoreSecrets: async () => ({ printifyToken: "tok", printifyShopId: "99", printifyWebhookSecret: "s3", stripeSecret: "", stripeWebhookSecret: "", resendKey: "", emailFrom: "" }) }));

import { createFakeClient } from "@/lib/db/fake";
import { Printify, PrintifyError, type PfyProduct } from "@/lib/printify/api";
import { mapProduct, stripHtml } from "@/lib/printify/map";
import { syncPrintify } from "@/lib/printify/sync";
import { handlePrintifyEvent, verifySignature } from "@/lib/printify/webhook";
import { fulfilOrder } from "@/lib/shop/fulfil";

const g = globalThis as unknown as { __sparkFake?: unknown };
let db: Db;

const pfy = (over: Partial<PfyProduct> = {}): PfyProduct => ({
  id: "64abc123def456", title: "Night Knight Tee", description: "<p>Soft &amp; warm</p><p>Unisex</p>", tags: ["tee"], visible: true,
  options: [{ name: "Colors", type: "color", values: [{ id: 1, title: "Black", colors: ["#000000"] }, { id: 2, title: "White", colors: ["#ffffff"] }] }, { name: "Sizes", type: "size", values: [{ id: 10, title: "S" }, { id: 11, title: "M" }] }],
  variants: [
    { id: 101, sku: "TEE-BS", price: 2400, title: "Black / S", is_enabled: true, is_available: true, options: [1, 10] },
    { id: 102, sku: "TEE-BM", price: 2400, title: "Black / M", is_enabled: true, is_available: true, options: [1, 11] },
    { id: 103, sku: "TEE-WS", price: 2600, title: "White / S", is_enabled: false, is_available: true, options: [2, 10] },
    { id: 104, sku: "TEE-WM", price: 2600, title: "White / M", is_enabled: true, is_available: false, options: [2, 11] },
  ],
  images: [{ src: "https://images-api.printify.com/a.png", variant_ids: [101, 102], is_default: true }, { src: "https://images-api.printify.com/b.png", variant_ids: [103] }],
  ...over,
});

const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

beforeEach(() => { g.__sparkFake = undefined; sent.length = 0; db = createFakeClient() as unknown as Db; });

describe("Printify client", () => {
  it("sends the token and a User-Agent, and pages through every product", async () => {
    const calls: { url: string; h: Record<string, string> }[] = [];
    const f = (async (url: string, init: RequestInit) => { calls.push({ url, h: init.headers as Record<string, string> }); return calls.length === 1 ? reply({ data: [pfy()], last_page: 2 }) : reply({ data: [pfy({ id: "x2" })], last_page: 2 }); }) as unknown as typeof fetch;
    const all = await new Printify("tok", f).listProducts("99");
    expect(all.map((p) => p.id)).toEqual(["64abc123def456", "x2"]);
    expect(calls[0].h.Authorization).toBe("Bearer tok");
    expect(calls[0].h["User-Agent"]).toBeTruthy();
    expect(calls[1].url).toContain("page=2");
  });
  it("retries a rate limit then succeeds, and gives a clear message for a bad token", async () => {
    let n = 0;
    const ok = await new Printify("t", (async () => (++n < 2 ? reply({}, 429) : reply([{ id: 1, title: "S", sales_channel: "x" }]))) as unknown as typeof fetch).shops();
    expect(ok).toHaveLength(1); expect(n).toBe(2);
    await expect(new Printify("bad", (async () => reply({ message: "no" }, 401)) as unknown as typeof fetch).shops()).rejects.toThrow(/rejected the token/);
  });
  it("marks 4xx as not retryable and 5xx/network as retryable", async () => {
    const e4 = await new Printify("t", (async () => reply({ errors: { reason: "bad variant" } }, 400)) as unknown as typeof fetch).shops().catch((e) => e);
    expect(e4).toBeInstanceOf(PrintifyError); expect(e4.retryable).toBe(false); expect(e4.message).toContain("bad variant");
    const e5 = await new Printify("t", (async () => { throw new Error("offline"); }) as unknown as typeof fetch).shops().catch((e) => e);
    expect(e5.retryable).toBe(true);
  }, 15000);
});

describe("mapping", () => {
  const choices = { franchiseSlug: "knightverge", categorySlug: "apparel" };
  it("only offers options that are switched on and available, with prices in pence and colour swatches", () => {
    const m = mapProduct(pfy(), choices)!;
    expect(m.variants!.map((v) => v.name)).toEqual(["Black / S", "Black / M"]);
    expect(m.variants!.map((v) => v.externalId)).toEqual(["101", "102"]);
    expect(m.pricePence).toBe(2400); expect(m.trackStock).toBe(false); expect(m.printifyId).toBe("64abc123def456");
    expect(m.swatches).toEqual({ Black: "#000000" });
    expect(m.description).toBe("Soft & warm\nUnisex"); expect(m.variants![0].image).toBe("https://images-api.printify.com/a.png");
    expect(m.slug).toMatch(/^night-knight-tee-[a-z0-9]{6}$/);
  });
  it("returns null when nothing can be sold", () => { expect(mapProduct(pfy({ variants: [] }), choices)).toBeNull(); });
  it("strips html", () => { expect(stripHtml("<ul><li>a</li><li>b</li></ul>")).toBe("a\nb"); });
});

describe("import", () => {
  const choices = { franchiseSlug: "knightverge", categorySlug: "apparel" };
  const api = (list: PfyProduct[]) => ({ listProducts: async () => list }) as unknown as Printify;
  it("adds hidden, refreshes prices without touching edited text, hides what disappeared", async () => {
    let r = await syncPrintify(db, api([pfy()]), "99", choices);
    expect(r).toMatchObject({ added: 1, updated: 0 });
    const row = () => db.from("products").select("*").neq("printify_id", "").then((x) => (x.data as Record<string, unknown>[])[0]);
    expect((await row()).published).toBe(false); expect((await row()).printify_id).toBe("64abc123def456");
    await db.from("products").update({ name: "My own name", published: true }).eq("printify_id", "64abc123def456");
    const cheaper = pfy(); cheaper.variants[0].price = 2000;
    r = await syncPrintify(db, api([cheaper]), "99", choices);
    expect(r).toMatchObject({ added: 0, updated: 1 });
    expect((await row()).name).toBe("My own name"); expect((await row()).price_pence).toBe(2000); expect((await row()).printify_id).toBe("64abc123def456");
    r = await syncPrintify(db, api([]), "99", choices);
    expect(r.hidden).toBe(1); expect((await row()).published).toBe(false);
  });
});

describe("webhook", () => {
  it("verifies the signature", () => {
    const raw = '{"a":1}', sig = "sha256=" + createHmac("sha256", "s3").update(raw).digest("hex");
    expect(verifySignature(raw, sig, "s3")).toBe(true);
    expect(verifySignature(raw + " ", sig, "s3")).toBe(false);
    expect(verifySignature(raw, null, "s3")).toBe(false);
    expect(verifySignature(raw, sig, "")).toBe(false);
  });
  it("marks the order shipped and emails once, even if Printify repeats the event", async () => {
    await db.from("orders").insert({ id: "o1", number: "SPK-1", status: "paid", email: "b@x.com", name: "B", printify_order_id: "P1", items: [], tracking_number: "", tracking_carrier: "" });
    const ev = { type: "order:shipment:created", resource: { id: "P1", data: { carrier: { code: "royal-mail", tracking_number: "RM123" } } } };
    expect(await handlePrintifyEvent(db, ev)).toBe("shipped");
    expect(await handlePrintifyEvent(db, ev)).toBe("duplicate");
    expect(sent).toHaveLength(1);
    const o = (await db.from("orders").select("*").eq("id", "o1").maybeSingle()).data as Record<string, string>;
    expect(o.status).toBe("shipped"); expect(o.tracking_number).toBe("RM123");
    expect(await handlePrintifyEvent(db, { type: "order:shipment:created", resource: { id: "nope" } })).toBe("unknown-order");
  });
});

describe("ordering through fulfilment", () => {
  const session = (id: string) => ({ sessionId: id, paymentIntent: `pi_${id}`, email: "buyer@example.com", name: "Ada Lovelace", phone: "", storeId: "sparkthunder", address: { name: "Ada Lovelace", line1: "1 High St", line2: "", city: "London", postcode: "N1 1AA", country: "GB" } });
  async function setup(id: string) {
    await db.from("products").insert({ slug: "tee", sku: "TEE", name: "Tee", franchise_slug: "k", category_slug: "a", price_pence: 2400, in_stock: true, published: true, track_stock: false, variants: [{ name: "Black / M", externalId: "102", pricePence: 2400, stockQty: 0, sku: "" }], bundle_items: [], printify_id: "64abc123def456" });
    const lines = [{ type: "product", slug: "tee", variant: "Black / M", name: "Tee", sku: "TEE", unitPence: 2400, qty: 2, image: "" }];
    await db.from("checkout_snapshots").insert({ id, payload: { lines, subtotalPence: 4800, shippingPence: 399, needsShipping: true, discount: null, giftCard: null, totalPence: 5199 } });
    return session(id);
  }
  const fetchMock = (log: { url: string; body?: unknown }[], script: (url: string, n: number) => Response) => {
    let n = 0;
    vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => { log.push({ url, body: init?.body ? JSON.parse(init.body as string) : undefined }); return script(url, ++n); });
  };

  it("creates the Printify order with the right items and address, then sends it to production", async () => {
    const log: { url: string; body?: unknown }[] = [];
    fetchMock(log, (url) => (url.endsWith("orders.json") ? reply({ id: "PO1" }) : reply({}, 200)));
    const r = await fulfilOrder(db, await setup("cs_1"));
    const create = log.find((c) => c.url.endsWith("/shops/99/orders.json"))!.body as Record<string, unknown>;
    expect(create.line_items).toEqual([{ product_id: "64abc123def456", variant_id: 102, quantity: 2 }]);
    expect((create.address_to as Record<string, string>)).toMatchObject({ first_name: "Ada", last_name: "Lovelace", country: "GB", zip: "N1 1AA" });
    expect(create.external_id).toBe(r.order.number);
    expect(log.some((c) => c.url.includes("/orders/PO1/send_to_production.json"))).toBe(true);
    const o = (await db.from("orders").select("*").eq("id", r.order.id).maybeSingle()).data as Record<string, unknown>;
    expect(o.printify_order_id).toBe("PO1"); expect(o.status).toBe("paid");
    vi.unstubAllGlobals();
  });

  it("never creates the Printify order twice when production fails the first time", async () => {
    const log: { url: string; body?: unknown }[] = [];
    let prodFails = true;
    fetchMock(log, (url) => (url.endsWith("orders.json") ? reply({ id: "PO2" }) : prodFails ? reply({}, 500) : reply({})));
    const s = await setup("cs_2");
    await expect(fulfilOrder(db, s)).rejects.toThrow();
    prodFails = false;
    await db.from("orders").update({ fulfilment_lock_until: null }).eq("stripe_session_id", "cs_2");
    const r = await fulfilOrder(db, s);
    expect(log.filter((c) => c.url.endsWith("/shops/99/orders.json"))).toHaveLength(1);
    expect(r.order.status).toBe("paid");
    vi.unstubAllGlobals();
  }, 20000);

  it("reports a Printify refusal to the owner instead of retrying forever", async () => {
    fetchMock([], () => reply({ errors: { reason: "Address invalid" } }, 400));
    const r = await fulfilOrder(db, await setup("cs_3"));
    expect(r.order.status).toBe("attention");
    expect(r.order.attention_reason).toContain("Printify refused the order");
    vi.unstubAllGlobals();
  });

  it("leaves orders with no Printify items alone", async () => {
    const log: { url: string }[] = [];
    fetchMock(log, () => reply({}));
    await db.from("products").insert({ slug: "mug", sku: "M", name: "Mug", franchise_slug: "k", category_slug: "a", price_pence: 1000, in_stock: true, published: true, track_stock: false, variants: [], bundle_items: [] });
    await db.from("checkout_snapshots").insert({ id: "cs_4", payload: { lines: [{ type: "product", slug: "mug", name: "Mug", sku: "M", unitPence: 1000, qty: 1, image: "" }], subtotalPence: 1000, shippingPence: 0, needsShipping: true, discount: null, giftCard: null, totalPence: 1000 } });
    await fulfilOrder(db, session("cs_4"));
    expect(log).toHaveLength(0);
    vi.unstubAllGlobals();
  });
});

describe("cancel at Printify on refund", () => {
  const orderRow = { id: "o9", number: "SPK-9", status: "paid", printify_order_id: "PO9", attention_reason: "", email: "", items: [] };
  it("cancels when Printify allows it", async () => {
    await db.from("orders").insert(orderRow);
    const { cancelAtPrintify } = await import("@/lib/shop/refund");
    expect(await cancelAtPrintify(db, "sparkthunder", orderRow, { cancelOrder: async () => ({ id: "PO9", status: "canceled" }) })).toBe("cancelled");
    expect(((await db.from("orders").select("*").eq("id", "o9").maybeSingle()).data as Record<string, string>).printify_status).toBe("canceled");
  });
  it("flags the order for the owner when Printify refuses (already in production)", async () => {
    await db.from("orders").insert(orderRow);
    const { cancelAtPrintify } = await import("@/lib/shop/refund");
    const r = await cancelAtPrintify(db, "sparkthunder", orderRow, { cancelOrder: async () => { throw new PrintifyError("not allowed", 400, false); } });
    expect(r).toBe("refused");
    const o = (await db.from("orders").select("*").eq("id", "o9").maybeSingle()).data as Record<string, string>;
    expect(o.status).toBe("attention"); expect(o.attention_reason).toContain("Cancel it in the Printify dashboard");
  });
  it("does nothing for orders that never went to Printify", async () => {
    const { cancelAtPrintify } = await import("@/lib/shop/refund");
    expect(await cancelAtPrintify(db, "sparkthunder", { ...orderRow, printify_order_id: "" }, { cancelOrder: async () => { throw new Error("should not be called"); } })).toBe("skipped");
  });
});
