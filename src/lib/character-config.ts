import type { Product } from "@/lib/types";

/** A product is linked to a character by a tag: `character:<slug>`. */
export const CHARACTER_PREFIX = "character:";
export const cleanSlug = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
export const characterSlugOf = (tag: string) => (tag.toLowerCase().startsWith(CHARACTER_PREFIX) ? cleanSlug(tag.slice(CHARACTER_PREFIX.length)) : "");
export const characterSlugs = (p: Pick<Product, "tags">) => [...new Set((p.tags ?? []).map(characterSlugOf).filter(Boolean))];
export const characterName = (slug: string) => slug.split("-").filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

/** What the owner sets up in Admin > Characters (stored per store in the settings table under "characters"). */
export type CharacterProfile = { slug: string; name: string; franchiseSlug: string; image: string; featured: boolean; blurb: string };

export type CharacterEntry = CharacterProfile & { count: number; configured: boolean };

const okImage = (v: unknown) => (typeof v === "string" && (v.startsWith("/") || /^https?:\/\//.test(v)) ? v.slice(0, 500) : "");

/** Clean list: bad rows dropped, slugs unique, text trimmed. Order is the order saved. */
export function normaliseCharacters(raw: unknown): CharacterProfile[] {
  const out: CharacterProfile[] = [];
  const seen = new Set<string>();
  for (const r of Array.isArray(raw) ? raw : []) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const name = typeof o.name === "string" ? o.name.trim().slice(0, 60) : "";
    const slug = cleanSlug(typeof o.slug === "string" && o.slug ? o.slug : name);
    if (!name || !slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push({
      slug, name, franchiseSlug: typeof o.franchiseSlug === "string" ? cleanSlug(o.franchiseSlug) : "",
      image: okImage(o.image), featured: o.featured === true, blurb: typeof o.blurb === "string" ? o.blurb.trim().slice(0, 300) : "",
    });
  }
  return out;
}

/** Curated characters first (in the owner's order), then any character that only exists as a product tag (A to Z). Counts come from the products. */
export function mergeCharacters(profiles: CharacterProfile[], products: Pick<Product, "tags" | "franchiseSlug">[]): CharacterEntry[] {
  const counts = new Map<string, number>();
  const firstFranchise = new Map<string, string>();
  for (const p of products) for (const s of characterSlugs(p)) { counts.set(s, (counts.get(s) ?? 0) + 1); if (!firstFranchise.has(s)) firstFranchise.set(s, p.franchiseSlug); }
  const list: CharacterEntry[] = profiles.map((c) => ({ ...c, franchiseSlug: c.franchiseSlug || firstFranchise.get(c.slug) || "", count: counts.get(c.slug) ?? 0, configured: true }));
  const known = new Set(profiles.map((c) => c.slug));
  const extra = [...counts.keys()].filter((s) => !known.has(s)).sort().map((s): CharacterEntry => ({
    slug: s, name: characterName(s), franchiseSlug: firstFranchise.get(s) ?? "", image: "", featured: false, blurb: "", count: counts.get(s) ?? 0, configured: false,
  }));
  return [...list, ...extra];
}

/** Characters shown to shoppers: only those with products. The home page carousel prefers the featured ones when any are set. */
export const shopperList = (all: CharacterEntry[]) => all.filter((c) => c.count > 0);
export function homeList(all: CharacterEntry[]): CharacterEntry[] {
  const live = shopperList(all);
  const featured = live.filter((c) => c.featured);
  return featured.length ? featured : live;
}
export const forFranchise = (all: CharacterEntry[], franchiseSlug: string) => shopperList(all).filter((c) => c.franchiseSlug === franchiseSlug);
