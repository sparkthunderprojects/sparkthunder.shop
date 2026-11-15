import { describe, expect, it } from "vitest";
import { OSAKA76, STARTERS, starterById, starterSettings } from "@/lib/starters";

describe("store templates", () => {
  it("finds a template by id and rejects unknown ones", () => {
    expect(starterById("osaka76")).toBe(OSAKA76); expect(starterById("nope")).toBeNull(); expect(STARTERS.length).toBeGreaterThan(0);
  });
  it("renames the brand for the new store but keeps the look", () => {
    const { store, theme } = starterSettings(OSAKA76, "Osaka77");
    expect(store.name).toBe("Osaka77"); expect(store.legalName).toBe("Osaka77");
    expect(store.logoUrl).toBe("/osaka76/logo-white.png"); expect(store.accent).toBe("#e4002b");
    expect(theme.header).toBe("slim"); expect(theme.card).toBe("catalogue");
    expect(theme.slides).toHaveLength(2); expect(theme.lookbook).toHaveLength(5); expect(theme.loyalty.bullets).toHaveLength(3);
  });
  it("turns the streetwear sections on in order", () => {
    expect(starterSettings(OSAKA76, "X").theme.home.filter((s) => s.on).map((s) => s.id)).toEqual(["slides", "new", "categories", "loyalty", "featured", "story"]);
  });
  it("only links to pages and images the store really has", () => {
    const cats = new Set(OSAKA76.categories.map((c) => c.slug)), fr = new Set(OSAKA76.franchises.map((f) => f.slug)), cols = new Set(OSAKA76.collections.map((c) => c.slug));
    const links = [...(OSAKA76.theme.slides ?? []).flatMap((s) => [s.href1, s.href2]), ...(OSAKA76.theme.lookbook ?? []).map((l) => l.href)].filter(Boolean);
    for (const h of links) {
      const m = h.match(/^\/(categories|franchises|collections)\/(.+)$/);
      if (m) expect((m[1] === "categories" ? cats : m[1] === "franchises" ? fr : cols).has(m[2]), h).toBe(true);
    }
  });
  it("has unique slugs", () => {
    for (const list of [OSAKA76.franchises, OSAKA76.categories, OSAKA76.collections]) expect(new Set(list.map((x) => x.slug)).size).toBe(list.length);
  });
});
