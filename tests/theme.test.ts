import { describe, expect, it } from "vitest";
import { applyPreset, DEFAULT_THEME, normaliseTheme, PRESETS } from "@/lib/theme-config";
import { DEFAULT_STORE } from "@/lib/store-config";

describe("theme layout settings", () => {
  it("defaults reproduce the current look", () => {
    const t = normaliseTheme(undefined);
    expect(t).toEqual(DEFAULT_THEME);
    expect(t.header).toBe("classic"); expect(t.home.filter((s) => s.on).map((s) => s.id)).toEqual(["hero", "categories", "new"]);
  });
  it("rejects unknown values", () => {
    const t = normaliseTheme({ header: "weird", card: "x", productPage: 3, footer: null } as never);
    expect([t.header, t.card, t.productPage, t.footer]).toEqual(["classic", "bordered", "split", "full"]);
  });
  it("keeps the saved section order, drops unknown and repeated sections, and always lists every section once", () => {
    const t = normaliseTheme({ home: [{ id: "new", on: true }, { id: "nope", on: true }, { id: "hero", on: true }, { id: "new", on: false }] } as never);
    expect(t.home.map((s) => s.id).slice(0, 2)).toEqual(["new", "hero"]);
    expect(new Set(t.home.map((s) => s.id)).size).toBe(9); expect(t.home).toHaveLength(9);
    expect(t.home.find((s) => s.id === "categories")!.on).toBe(false);
    expect(t.home.find((s) => s.id === "new")!.on).toBe(true);
  });
  it("limits story text", () => { expect(normaliseTheme({ storyText: "x".repeat(5000) }).storyText).toHaveLength(1500); });
  it("presets apply look and layout and keep the store's name and logo", () => {
    const store = { ...DEFAULT_STORE, name: "Miss Petty", logoUrl: "/mp.png" };
    for (const p of PRESETS) {
      const r = applyPreset(p.id, store, DEFAULT_THEME)!;
      expect(r.store.name).toBe("Miss Petty"); expect(r.store.logoUrl).toBe("/mp.png");
      expect(r.store.accent).toBe(p.look.accent); expect(r.theme.header).toBe(p.layout.header);
    }
    expect(applyPreset("nope", DEFAULT_STORE, DEFAULT_THEME)).toBeNull();
  });
  it("every preset colour is valid", () => { for (const p of PRESETS) for (const k of ["accent", "dark", "light", "text"] as const) expect(p.look[k]).toMatch(/^#[0-9a-f]{6}$/); });
});

describe("banner slides and members club", () => {
  it("cleans slides: caps at 5, drops empty ones, rejects unsafe links and images", () => {
    const t = normaliseTheme({ slides: [
      { image: "javascript:alert(1)", headline: "A", text: "", label1: "Go", href1: "javascript:x", label2: "", href2: "/new" },
      { image: "", headline: "", text: "", label1: "", href1: "", label2: "", href2: "" },
      ...Array.from({ length: 8 }, (_, i) => ({ image: "/a.jpg", headline: `H${i}`, text: "", label1: "", href1: "", label2: "", href2: "" })),
    ] });
    expect(t.slides).toHaveLength(5);
    expect(t.slides[0].image).toBe(""); expect(t.slides[0].href1).toBe(""); expect(t.slides[0].href2).toBe("/new");
  });
  it("keeps up to three members-club benefits and a safe join link", () => {
    const t = normaliseTheme({ loyalty: { title: "Club", text: "", bullets: ["a", "", "b", "c", "d"], joinLabel: "", joinHref: "javascript:x", image: "" } });
    expect(t.loyalty.bullets).toEqual(["a", "b", "c"]); expect(t.loyalty.joinHref).toBe("/account"); expect(t.loyalty.joinLabel).toBe("Join");
  });
  it("has a Streetwear preset that turns the banners on", () => {
    expect(PRESETS.some((p) => p.id === "streetwear")).toBe(true);
  });
});
