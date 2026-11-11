import { describe, expect, it } from "vitest";
import { checkRedirects } from "@/lib/seo/redirects-check";

const R = (id: number, from_path: string, to_path: string) => ({ id, from_path, to_path, status: 301 });
const live = new Set(["/products/tee", "/products/mug", "/franchises/knightverge"]);

describe("redirect checker", () => {
  it("passes a healthy set", () => {
    expect(checkRedirects([R(1, "/old", "/products/tee"), R(2, "/a/", "/franchises/knightverge")], live)).toEqual([]);
  });
  it("finds chains and says where to send them", () => {
    const i = checkRedirects([R(1, "/a", "/b"), R(2, "/b", "/c"), R(3, "/c", "/products/tee")], live);
    expect(i.find((x) => x.id === 1)).toMatchObject({ kind: "chain", fixTo: "/products/tee" });
    expect(i.find((x) => x.id === 2)).toMatchObject({ kind: "chain", fixTo: "/products/tee" });
    expect(i.find((x) => x.id === 3)).toBeUndefined();
  });
  it("finds loops", () => {
    const i = checkRedirects([R(1, "/a", "/b"), R(2, "/b", "/a"), R(3, "/x", "/x")], live);
    expect(i.filter((x) => x.kind === "loop").map((x) => x.id).sort()).toEqual([1, 2, 3]);
  });
  it("finds redirects that hide a live page, lead to a missing page, or repeat", () => {
    const i = checkRedirects([R(1, "/products/tee", "/products/mug"), R(2, "/old", "/products/gone"), R(3, "/dup", "/franchises/knightverge"), R(4, "/dup", "/products/mug")], live);
    expect(i.map((x) => `${x.id}:${x.kind}`).sort()).toEqual(["1:shadows", "2:dead", "4:duplicate"]);
  });
  it("ignores external destinations and static pages", () => {
    expect(checkRedirects([R(1, "/out", "https://example.com/x"), R(2, "/gifts", "/gift-cards")], live)).toEqual([]);
  });
});

import { autoLink } from "@/lib/seo/autolink";
describe("automatic internal links", () => {
  const T = [{ name: "Knightverge Crest T-Shirt", href: "/products/tee" }, { name: "Knightverge", href: "/franchises/knightverge" }, { name: "Mug", href: "/products/mug" }, { name: "Velvet Tint", href: "/products/tint" }];
  const join = (p: { text: string }[]) => p.map((x) => x.text).join("");
  it("links the first mention once, keeps the text exactly, and prefers the longer name", () => {
    const text = "Pairs with the knightverge crest t-shirt. Knightverge fans love the Velvet Tint, and the velvet tint again.";
    const p = autoLink(text, T);
    expect(join(p)).toBe(text);
    expect(p.filter((x) => x.href).map((x) => x.href)).toEqual(["/products/tee", "/franchises/knightverge", "/products/tint"]);
    expect(p.filter((x) => x.href === "/products/tint")).toHaveLength(1);
  });
  it("only whole words, never itself, ignores short names, and caps the count", () => {
    expect(autoLink("Velvet Tinted glass", T).some((x) => x.href)).toBe(false);
    expect(autoLink("Our Mug is great", T).some((x) => x.href)).toBe(false); // "Mug" is under 5 characters
    expect(autoLink("Velvet Tint rules", T, { selfHref: "/products/tint" }).some((x) => x.href)).toBe(false);
    const many = autoLink("Knightverge Crest T-Shirt, Knightverge, Velvet Tint, Zeta Cap", [...T, { name: "Zeta Cap", href: "/products/zeta" }], { max: 2 });
    expect(many.filter((x) => x.href)).toHaveLength(2);
  });
  it("leaves text without matches alone", () => { expect(autoLink("Nothing to see.", T)).toEqual([{ text: "Nothing to see." }]); });
});

import { CACHEABLE_SOURCES, PUBLIC_PAGE_CACHE } from "@/lib/cache-policy";
describe("what a shared cache may keep", () => {
  it("never includes private or personal pages", () => {
    for (const s of CACHEABLE_SOURCES) expect(s, s).not.toMatch(/^\/(admin|account|cart|checkout|search|api|auth|unsubscribe|gift-cards)/);
  });
  it("is short, so edits show up quickly", () => {
    expect(PUBLIC_PAGE_CACHE).toMatch(/s-maxage=30\b/);
    expect(PUBLIC_PAGE_CACHE).toContain("public");
  });
});
