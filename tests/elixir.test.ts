import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eligibleGbp, elixirEarn, elixirEnabled, elixirRefund } from "@/lib/elixir";

const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("eligibleGbp", () => {
  it("counts whole pounds of products after discount, ignoring gift cards and delivery", () => {
    const lines = [{ type: "product", unitPence: 2499, qty: 2 }, { type: "gift", unitPence: 5000, qty: 1 }];
    expect(eligibleGbp(lines, 0)).toBe(49);
    expect(eligibleGbp(lines, 500)).toBe(44);
    expect(eligibleGbp(lines, 99999)).toBe(0);
  });
});

describe("Elixir API calls", () => {
  const fetchMock = vi.fn();
  beforeEach(() => { vi.stubGlobal("fetch", fetchMock); vi.stubEnv("ELIXIR_BRAND_KEY", "elx_test"); vi.useFakeTimers({ shouldAdvanceTime: true }); fetchMock.mockReset(); });
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });

  it("is off until the brand key is set", () => {
    vi.stubEnv("ELIXIR_BRAND_KEY", "");
    expect(elixirEnabled()).toBe(false);
  });

  it("sends the order to earn with the key, and reports the points", async () => {
    fetchMock.mockResolvedValueOnce(reply(200, { duplicate: false, points: 49, balance: 49 }));
    const r = await elixirEarn({ orderRef: "SP-1001", email: "a@b.com", spendGbp: 49 });
    expect(r).toEqual({ ok: true, points: 49, duplicate: false });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/functions\/v1\/elixir-api\/earn$/);
    expect(init.headers["x-elixir-key"]).toBe("elx_test");
    expect(JSON.parse(init.body)).toMatchObject({ source_ref: "SP-1001", spend_gbp: 49, email: "a@b.com" });
  });

  it("does not retry a clear refusal such as a wrong key", async () => {
    fetchMock.mockResolvedValue(reply(401, { error: "invalid_api_key" }));
    const r = await elixirEarn({ orderRef: "SP-1", email: "a@b.com", spendGbp: 5 });
    expect(r).toEqual({ ok: false, error: "invalid_api_key (401)" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries a server error and then succeeds", async () => {
    fetchMock.mockResolvedValueOnce(reply(500, { error: "internal_error" })).mockResolvedValueOnce(reply(200, { points: 5, duplicate: true }));
    const p = elixirEarn({ orderRef: "SP-2", email: "a@b.com", spendGbp: 5 });
    await vi.advanceTimersByTimeAsync(2000);
    expect(await p).toEqual({ ok: true, points: 5, duplicate: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("gives up after three tries when Elixir is unreachable", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    const p = elixirRefund({ orderRef: "SP-3", refundRef: "refund-1", refundGbp: 10 });
    await vi.advanceTimersByTimeAsync(5000);
    expect(await p).toEqual({ ok: false, error: "network down" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("sends refunds to the refund route", async () => {
    fetchMock.mockResolvedValueOnce(reply(200, { status: "reversed", points: -12 }));
    const r = await elixirRefund({ orderRef: "SP-4", refundRef: "refund-9", refundGbp: 12.5 });
    expect(r).toEqual({ ok: true, points: -12, duplicate: false });
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/elixir-api\/refund$/);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ order_ref: "SP-4", refund_ref: "refund-9", refund_gbp: 12.5 });
  });
});
