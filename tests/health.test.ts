import { describe, expect, it, vi } from "vitest";
import { healthChecks, overall, type HealthInput } from "@/lib/admin/health";
import { scrub } from "@/lib/log";

const NOW = Date.parse("2026-11-08T12:00:00Z");
const ago = (min: number) => new Date(NOW - min * 60_000).toISOString();
const base: HealthInput = { orders: [], refunds: [], events: [], products: [], setup: { stripe: true, webhook: true, email: true, supportEmail: true }, now: NOW };
const byId = (c: ReturnType<typeof healthChecks>, id: string) => c.find((x) => x.id === id)!;

describe("healthChecks", () => {
  it("is all green for a healthy store", () => {
    const c = healthChecks(base);
    expect(overall(c)).toBe("green");
  });
  it("flags paid orders that never finished, but not ones still being processed", () => {
    const c = healthChecks({ ...base, orders: [{ id: "1", number: "SPK-1", status: "paid", fulfilled_at: null, created_at: ago(1), attention_reason: "" }, { id: "2", number: "SPK-2", status: "paid", fulfilled_at: null, created_at: ago(30), attention_reason: "" }] });
    expect(byId(c, "unfinished").severity).toBe("red");
    expect(byId(c, "unfinished").detail).toContain("SPK-2");
    expect(byId(c, "unfinished").detail).not.toContain("SPK-1");
  });
  it("flags attention orders and unfinished refunds, and sorts the worst first", () => {
    const c = healthChecks({ ...base, orders: [{ id: "1", number: "SPK-9", status: "attention", fulfilled_at: ago(60), created_at: ago(90), attention_reason: "x" }], refunds: [{ id: "r", order_id: "1", status: "pending", created_at: ago(10) }] });
    expect(byId(c, "attention").severity).toBe("red");
    expect(byId(c, "refunds").severity).toBe("red");
    expect(c[0].severity).toBe("red");
    expect(c[c.length - 1].severity).toBe("green");
  });
  it("treats old errors as history but recent ones as red, and warnings as amber", () => {
    const ev = (level: "error" | "warn", min: number) => ({ id: String(min), level, event: "x", message: `m${min}`, created_at: ago(min) });
    expect(byId(healthChecks({ ...base, events: [ev("error", 60 * 30)] }), "errors").severity).toBe("green");
    expect(byId(healthChecks({ ...base, events: [ev("error", 5)] }), "errors").severity).toBe("red");
    expect(byId(healthChecks({ ...base, events: [ev("warn", 5)] }), "errors").severity).toBe("amber");
  });
  it("tells the owner what setup is missing, and warns when nobody would be emailed", () => {
    const c = healthChecks({ ...base, setup: { stripe: true, webhook: false, email: false, supportEmail: false } });
    expect(byId(c, "setup").severity).toBe("red");
    expect(byId(c, "setup").detail).toContain("webhook");
    expect(byId(c, "alerts").severity).toBe("amber");
  });
  it("lists low stock only for published, tracked products", () => {
    const p = (o: Partial<HealthInput["products"][number]>) => ({ slug: "a", name: "A", track_stock: true, stock_qty: 1, low_stock_threshold: 5, published: true, in_stock: true, ...o });
    expect(byId(healthChecks({ ...base, products: [p({}), p({ name: "Draft", published: false }), p({ name: "Untracked", track_stock: false })] }), "stock").detail).toBe("1 product(s): A (1).");
    expect(byId(healthChecks({ ...base, products: [p({ stock_qty: 50 })] }), "stock").severity).toBe("green");
  });
});

describe("log scrub", () => {
  it("hides anything that looks like a secret and shortens long text", () => {
    const out = scrub({ stripeSecretKey: "sk_live_123", nested: { password: "x", ok: "fine" }, big: "a".repeat(1000), err: new Error("boom") }) as Record<string, unknown>;
    expect(out.stripeSecretKey).toBe("[hidden]");
    expect((out.nested as Record<string, unknown>).password).toBe("[hidden]");
    expect((out.nested as Record<string, unknown>).ok).toBe("fine");
    expect((out.big as string).length).toBeLessThan(310);
    expect(out.err).toEqual({ name: "Error", message: "boom" });
  });
});

describe("notifyOwner", () => {
  it("emails once per problem per hour, never throws", async () => {
    vi.resetModules();
    const sent: string[] = [];
    vi.doMock("next/headers", () => ({ headers: async () => new Headers() }));
    vi.doMock("@/lib/db/stores", () => ({ currentStoreId: async () => "sparkthunder" }));
    vi.doMock("@/lib/db/clients", () => ({ serviceClient: () => null }));
    vi.doMock("@/lib/commerce", () => ({ getCommerce: async () => ({ supportEmail: "owner@example.com" }) }));
    vi.doMock("@/lib/email/send", () => ({ sendEmail: async (m: { to: string; subject: string }) => { sent.push(`${m.to}|${m.subject}`); return { ok: true }; } }));
    const { notifyOwner } = await import("@/lib/alerts");
    await notifyOwner("Order needs attention", "details", "order:1");
    await notifyOwner("Order needs attention", "details", "order:1");
    await notifyOwner("Another", "details", "order:2");
    expect(sent).toEqual(["owner@example.com|[sparkthunder] Order needs attention", "owner@example.com|[sparkthunder] Another"]);
  });
});
