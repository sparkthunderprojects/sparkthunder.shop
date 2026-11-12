import { describe, expect, it } from "vitest";
import { cleanSlug, forFranchise, homeList, mergeCharacters, normaliseCharacters, characterSlugs } from "../src/lib/character-config";

const P = (franchiseSlug: string, ...tags: string[]) => ({ franchiseSlug, tags });

describe("normaliseCharacters", () => {
  it("drops rows without a name, makes slugs from names and keeps them unique", () => {
    const out = normaliseCharacters([{ name: "Black Ronin" }, { name: "" }, { name: "Black Ronin" }, { name: "Jenna Hex", slug: "Jenna Hex!" }, null, "x"]);
    expect(out.map((c) => c.slug)).toEqual(["black-ronin", "jenna-hex"]);
  });
  it("only accepts sensible image values and trims long text", () => {
    const [a, b] = normaliseCharacters([{ name: "A", image: "javascript:alert(1)", blurb: "x".repeat(500) }, { name: "B", image: "/uploads/b.webp" }]);
    expect(a.image).toBe(""); expect(a.blurb).toHaveLength(300); expect(b.image).toBe("/uploads/b.webp");
  });
  it("copes with junk", () => { expect(normaliseCharacters(undefined)).toEqual([]); expect(normaliseCharacters({})).toEqual([]); });
});

describe("tags", () => {
  it("reads character: tags case-insensitively and cleans them", () => {
    expect(characterSlugs({ tags: ["Character:Black Ronin", "sale", "character:black-ronin"] })).toEqual(["black-ronin"]);
    expect(cleanSlug("  Kael  Ironwood ")).toBe("kael-ironwood");
  });
});

describe("mergeCharacters", () => {
  const profiles = normaliseCharacters([{ name: "Zed", franchiseSlug: "occult", featured: true }, { name: "Amy", image: "/a.webp" }]);
  const products = [P("knightverge", "character:amy"), P("knightverge", "character:amy"), P("occult", "character:bob"), P("occult", "character:zed")];
  const all = mergeCharacters(profiles, products);
  it("puts the owner's order first, then tag-only characters A to Z", () => { expect(all.map((c) => c.slug)).toEqual(["zed", "amy", "bob"]); });
  it("counts products and fills a missing franchise from the products", () => {
    expect(all.find((c) => c.slug === "amy")).toMatchObject({ count: 2, franchiseSlug: "knightverge", configured: true });
    expect(all.find((c) => c.slug === "bob")).toMatchObject({ count: 1, franchiseSlug: "occult", configured: false, name: "Bob" });
  });
  it("home carousel prefers featured ones, otherwise everyone with products", () => {
    expect(homeList(all).map((c) => c.slug)).toEqual(["zed"]);
    expect(homeList(all.map((c) => ({ ...c, featured: false }))).map((c) => c.slug)).toEqual(["zed", "amy", "bob"]);
  });
  it("shows characters the owner set up even before a product is tagged, and filters by franchise", () => {
    const withEmpty = mergeCharacters(normaliseCharacters([{ name: "Ghost", franchiseSlug: "occult" }]), products);
    expect(homeList(withEmpty).map((c) => c.slug)).toContain("ghost");
    expect(forFranchise(all, "occult").map((c) => c.slug)).toEqual(["zed", "bob"]);
  });
});
