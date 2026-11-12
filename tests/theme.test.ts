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
    expect(new Set(t.home.map((s) => s.id)).size).toBe(6); expect(t.home).toHaveLength(6);
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
