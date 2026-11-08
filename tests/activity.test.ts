import { beforeEach, describe, expect, it, vi } from "vitest";

let broken = false;
vi.mock("@/lib/admin/auth", () => ({ getAdmin: async () => ({ email: "owner@example.com" }) }));
vi.mock("@/lib/db/clients", async () => {
  const { createFakeClient } = await import("@/lib/db/fake");
  return { serviceClient: () => (broken ? { from: () => ({ insert: async () => { throw new Error("db down"); } }) } : createFakeClient()) };
});
import { logActivity } from "@/lib/admin/activity";

const g = globalThis as unknown as { __sparkFake: { audit_log: Record<string, unknown>[] } | undefined };
beforeEach(() => { g.__sparkFake = undefined; broken = false; });

describe("logActivity", () => {
  it("records who did what", async () => {
    await logActivity("product.save", "Saved product tee", { type: "product", id: "tee" });
    const [row] = g.__sparkFake!.audit_log;
    expect(row).toMatchObject({ actor: "owner@example.com", action: "product.save", summary: "Saved product tee", target_type: "product", target_id: "tee" });
  });
  it("uses an explicit actor (sign-in attempts)", async () => {
    await logActivity("login.failed", "x", { actor: "anonymous" });
    expect(g.__sparkFake!.audit_log[0].actor).toBe("anonymous");
  });
  it("never throws or blocks the action when the log cannot be written", async () => {
    broken = true;
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(logActivity("x", "y")).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
  it("trims very long summaries", async () => {
    await logActivity("x", "a".repeat(1000));
    expect((g.__sparkFake!.audit_log[0].summary as string).length).toBe(400);
  });
});
