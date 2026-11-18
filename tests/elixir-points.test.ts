import { describe, expect, it } from "vitest";
import { ELIXIR_FALLBACK, elixirPointsFor, elixirPointsValuePence } from "@/lib/elixir-points";

describe("Elixir Points preview", () => {
  it("earns the rate on whole pounds only", () => {
    expect(elixirPointsFor(2599, ELIXIR_FALLBACK)).toBe(25);
    expect(elixirPointsFor(99, ELIXIR_FALLBACK)).toBe(0);
    expect(elixirPointsFor(10000, { earnPerGbp: 2, redeemPerGbp: 200 })).toBe(200);
  });
  it("never goes negative when a discount is bigger than the spend", () => {
    expect(elixirPointsFor(-500, ELIXIR_FALLBACK)).toBe(0);
  });
  it("values points at the redeem rate", () => {
    expect(elixirPointsValuePence(1000, ELIXIR_FALLBACK)).toBe(500);
    expect(elixirPointsValuePence(100, { earnPerGbp: 1, redeemPerGbp: 0 })).toBe(0);
  });
});
