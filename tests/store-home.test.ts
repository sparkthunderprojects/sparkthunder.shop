import { describe, expect, it, vi } from "vitest";

// The page reads the visitor's language from the request; in a test there is no request, so use English.
vi.mock("@/lib/i18n/server", () => ({ getT: async () => ({ locale: "en", t: (k: string, v?: Record<string, string | number>) => (v ? k.replace(/\{(\w+)\}/g, (m, n) => String(v[n] ?? m)) : k) }) }));
import { renderToStaticMarkup } from "react-dom/server";
import { StoreHome } from "@/components/StoreHome";
import { DEFAULT_STORE } from "@/lib/store-config";
import { normaliseTheme } from "@/lib/theme-config";

const html = async (theme: Parameters<typeof normaliseTheme>[0]) => renderToStaticMarkup(await StoreHome({ store: DEFAULT_STORE, products: [], categories: [], theme: normaliseTheme(theme) }));

describe("store home sections", () => {
  it("renders the chosen sections in the chosen order", async () => {
    const out = await html({ home: [{ id: "gift-cards", on: true }, { id: "hero", on: true }, { id: "story", on: true }], storyText: "Made by hand." });
    const order = [...out.matchAll(/data-home-section="([^"]+)"/g)].map((m) => m[1]);
    expect(order).toEqual(["gift-cards", "hero", "story"]);
    expect(out).toContain("Made by hand.");
  });
  it("hides sections that are off or empty", async () => {
    const out = await html({ home: [{ id: "hero", on: false }, { id: "story", on: true }] });
    expect(out).not.toContain('data-home-section="hero"'); expect(out).not.toContain('data-home-section="story"');
  });
});
