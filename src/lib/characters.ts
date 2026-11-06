import { getAllProducts } from "@/lib/catalog";
import type { Product } from "@/lib/types";

/** A product is linked to a character by a tag: `character:<slug>`, where <slug> is the character's slug on the universe site. */
export const CHARACTER_PREFIX = "character:";
export const characterSlugOf = (tag: string) => (tag.toLowerCase().startsWith(CHARACTER_PREFIX) ? tag.slice(CHARACTER_PREFIX.length).trim().toLowerCase().replace(/[^a-z0-9-]/g, "") : "");
export const characterSlugs = (p: Pick<Product, "tags">) => [...new Set((p.tags ?? []).map(characterSlugOf).filter(Boolean))];
export const characterName = (slug: string) => slug.split("-").filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

export type CharacterEntry = { slug: string; name: string; count: number; franchiseSlug: string };

export async function getCharacters(): Promise<CharacterEntry[]> {
  const all = await getAllProducts();
  const m = new Map<string, CharacterEntry>();
  for (const p of all) for (const s of characterSlugs(p)) {
    const e = m.get(s) ?? { slug: s, name: characterName(s), count: 0, franchiseSlug: p.franchiseSlug };
    e.count++; m.set(s, e);
  }
  return [...m.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function getCharacterProducts(slug: string): Promise<Product[]> {
  return (await getAllProducts()).filter((p) => characterSlugs(p).includes(slug));
}
