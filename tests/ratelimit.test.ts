import { beforeEach, describe, expect, it, vi } from "vitest";

let ip = "1.1.1.1";
let store = "sparkthunder";
let brokenDb = false;
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": `${ip}, 10.0.0.1` }) }));
vi.mock("@/lib/db/stores", () => ({ currentStoreId: async () => store }));
vi.mock("@/lib/db/clients", async () => {
  const { createFakeClient } = await import("@/lib/db/fake");
  return { serviceClient: () => (brokenDb ? { rpc: async () => ({ data: null, error: { message: "function rate_hit does not exist" } }) } : createFakeClient()) };
});

import { rateLimit } from "@/lib/ratelimit";

const g = globalThis as unknown as { __sparkFake?: unknown };
const rule = { limit: 3, windowSec: 60 };
beforeEach(() => { g.__sparkFake = undefined; ip = "1.1.1.1"; store = "sparkthunder"; brokenDb = false; });

describe("rateLimit", () => {
  it("allows up to the limit, then blocks with a wait time", async () => {
    for (let i = 0; i < 3; i++) expect((await rateLimit("t", rule)).ok).toBe(true);
    const r = await rateLimit("t", rule);
    expect(r.ok).toBe(false);
    expect((r as { retryAfter: number }).retryAfter).toBeGreaterThan(0);
  });
  it("counts each visitor, each rule and each store separately", async () => {
    for (let i = 0; i < 4; i++) await rateLimit("t", rule);
    ip = "2.2.2.2"; expect((await rateLimit("t", rule)).ok).toBe(true);
    ip = "1.1.1.1"; expect((await rateLimit("other", rule)).ok).toBe(true);
    store = "misspetty"; expect((await rateLimit("t", rule)).ok).toBe(true);
  });
  it("uses an explicit key when given (for example an email address)", async () => {
    for (let i = 0; i < 4; i++) await rateLimit("login", rule, "email:a@b.c");
    ip = "9.9.9.9";
    expect((await rateLimit("login", rule, "email:a@b.c")).ok).toBe(false);
    expect((await rateLimit("login", rule, "email:other@b.c")).ok).toBe(true);
  });
  it("still limits within a server if the database function is missing", async () => {
    brokenDb = true; ip = "7.7.7.7";
    for (let i = 0; i < 3; i++) expect((await rateLimit("fallback", rule)).ok).toBe(true);
    expect((await rateLimit("fallback", rule)).ok).toBe(false);
  });
  it("never stores the raw address", async () => {
    await rateLimit("t", rule);
    const rows = ((globalThis as unknown as { __sparkFake: { rate_limits: { key: string }[] } }).__sparkFake.rate_limits);
    expect(rows[0].key).toMatch(/^[0-9a-f]{32}$/);
  });
});
