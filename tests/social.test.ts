import { describe, expect, it } from "vitest";
import { bestTimes, draftCaption, engagementRate, normaliseSocial, overLimit, shareUrl, trackedLink } from "@/lib/social";

describe("social", () => {
  it("tags links with source, medium and campaign", () => {
    const l = new URL(trackedLink("https://osaka76.com/", "/products/tee", "instagram", "Spring Drop!"));
    expect(l.origin + l.pathname).toBe("https://osaka76.com/products/tee");
    expect(l.searchParams.get("utm_source")).toBe("instagram"); expect(l.searchParams.get("utm_medium")).toBe("social"); expect(l.searchParams.get("utm_campaign")).toBe("spring-drop");
  });
  it("drafts captions that fit every platform", () => {
    const p = { name: "Osaka Street Tee", blurb: "x".repeat(900), pricePence: 3500, franchise: "Osaka 76" };
    for (const pl of ["x", "instagram", "facebook", "tiktok", "pinterest", "youtube"] as const) expect(overLimit(draftCaption(p, pl, "https://s.co/p", "Osaka76", "£35.00"), [pl])).toEqual([]);
    expect(draftCaption({ ...p, blurb: "Washed tee." }, "x", "https://s.co/p", "Osaka76", "£35.00")).toContain("https://s.co/p");
  });
  it("flags text that is too long for a platform", () => { expect(overLimit("a".repeat(300), ["x", "instagram"])).toEqual(["x"]); });
  it("cleans saved data", () => {
    const d = normaliseSocial({ accounts: [{ id: "a", platform: "x", handle: "@osaka76" }, { platform: "nope", handle: "z" }], posts: [{ id: "p", platforms: ["x", "bad"], text: "hi", status: "scheduled", at: "not a date" }, { id: "q", platforms: [] }] });
    expect(d.accounts).toEqual([{ id: "a", platform: "x", handle: "osaka76" }]);
    expect(d.posts).toHaveLength(1); expect(d.posts[0]).toMatchObject({ platforms: ["x"], status: "draft", at: "" });
  });
  it("finds the best times from the orders heat map", () => {
    const g = Array.from({ length: 7 }, () => Array<number>(24).fill(0)); g[4][19] = 5; g[1][10] = 2; g[6][21] = 9;
    expect(bestTimes(g, 2)).toEqual([{ day: 6, hour: 21, orders: 9 }, { day: 4, hour: 19, orders: 5 }]);
  });
  it("builds share links and engagement", () => {
    expect(shareUrl("x", "hi there", "", "")).toContain("text=hi%20there"); expect(shareUrl("instagram", "", "", "")).toBeNull();
    expect(engagementRate({ reach: 1000, likes: 50, comments: 10, shares: 5, clicks: 0 })).toBeCloseTo(6.5);
  });
});
