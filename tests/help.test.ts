import { describe, expect, it } from "vitest";
import { HELP_CATEGORIES, HELP_TOPICS, articleText, helpArticles, helpPieces, relatedArticles, searchHelp, topicFromParam, type HelpCtx } from "../src/lib/help";

const ctx: HelpCtx = { name: "Test Shop", email: "help@test.shop", deliveryLines: ["UK: £3.99 for the first item."], freeOverPence: 5000, giftWrapPence: 300, countries: ["United Kingdom", "Ireland"], payPages: [{ id: "klarna", name: "Klarna" }] };
const all = helpArticles(ctx);

describe("help centre content", () => {
  it("has unique slugs, real categories, and every category has articles", () => {
    expect(new Set(all.map((a) => a.slug)).size).toBe(all.length);
    const cats = new Set(HELP_CATEGORIES.map((c) => c.slug));
    expect(["search", "contact"].some((s) => cats.has(s))).toBe(false);
    for (const a of all) expect(cats.has(a.category)).toBe(true);
    for (const c of HELP_CATEGORIES) expect(all.some((a) => a.category === c.slug)).toBe(true);
  });
  it("related links and in-text links point at real things", () => {
    const paths = new Set(all.map((a) => `/help/${a.category}/${a.slug}`));
    for (const a of all) {
      expect(relatedArticles(all, a).length).toBe(a.related.length);
      for (const b of a.blocks) for (const t of "p" in b ? [b.p] : "ul" in b ? b.ul : "ol" in b ? b.ol : [])
        for (const piece of helpPieces(t)) if (piece.href?.startsWith("/help/") && !piece.href.split("?")[0].endsWith("/contact")) expect(paths.has(piece.href), `${a.slug} links to ${piece.href}`).toBe(true);
    }
  });
  it("quotes the store's own facts", () => {
    const text = all.map(articleText).join(" ");
    expect(text).toContain("Test Shop");
    expect(text).toContain("help@test.shop");
    expect(text).toContain("£50");
    expect(text).toContain("£3");
    expect(text).toContain("Ireland");
    expect(text).toContain("Klarna");
  });
  it("does not promise things the shop does not have", () => {
    const text = all.map(articleText).join(" ").toLowerCase();
    for (const bad of ["phone", "call us", "live chat", "elixir", "pay in 4", "no hidden fees", "free returns"]) expect(text).not.toContain(bad);
  });
  it("omits optional facts when a store has not set them", () => {
    const bare = helpArticles({ ...ctx, email: null, freeOverPence: 0, giftWrapPence: 0, payPages: [] });
    const t = bare.map(articleText).join(" ");
    expect(t).not.toContain("undefined");
    expect(t).not.toContain("null");
    expect(t).toContain("our contact page");
  });
});

describe("help search", () => {
  it("finds the right article first", () => {
    expect(searchHelp(all, "cancel my order")[0].slug).toBe("cancel-my-order");
    expect(searchHelp(all, "refund")[0].category).toBe("returns");
    expect(searchHelp(all, "klarna").length).toBeGreaterThan(0);
    expect(searchHelp(all, "gift card balance")[0].slug).toBe("check-gift-card-balance");
  });
  it("copes with plurals, case and punctuation, and returns nothing for nonsense or blanks", () => {
    expect(searchHelp(all, "RETURNS!!").length).toBeGreaterThan(0);
    expect(searchHelp(all, "zzzqqqxxx")).toEqual([]);
    expect(searchHelp(all, "   ")).toEqual([]);
    expect(searchHelp(all, "the and how")).toEqual([]);
  });
});

describe("links in text", () => {
  it("only keeps same-site and mailto links", () => {
    expect(helpPieces("a [b](/x) c [d](https://evil.example) e [f](mailto:a@b.co)")).toEqual([
      { text: "a " }, { text: "b", href: "/x" }, { text: " c " }, { text: "d" }, { text: " e " }, { text: "f", href: "mailto:a@b.co" },
    ]);
    expect(helpPieces("[x](javascript:alert(1))").every((p) => !p.href)).toBe(true);
  });
  it("maps contact topics", () => {
    expect(topicFromParam("replacement")).toBe(HELP_TOPICS[2]);
    expect(topicFromParam("nonsense")).toBe(HELP_TOPICS[0]);
    expect(topicFromParam(undefined)).toBe(HELP_TOPICS[0]);
  });
});
