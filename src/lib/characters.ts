import { unstable_cache } from "next/cache";
import { getAllProducts } from "@/lib/catalog";
import { publicClient } from "@/lib/db/clients";
import { currentStoreId } from "@/lib/db/stores";
import { storeTag } from "@/lib/tags";
import { mergeCharacters, normaliseCharacters, characterSlugs, type CharacterEntry, type CharacterProfile } from "@/lib/character-config";
import type { Product } from "@/lib/types";

export { CHARACTER_PREFIX, characterSlugOf, characterSlugs, characterName, type CharacterEntry } from "@/lib/character-config";

/** The characters the owner set up for this store (cached; busted by the "settings" tag on save). */
export const getCharacterProfiles = async (): Promise<CharacterProfile[]> => {
  const storeId = await currentStoreId();
  return unstable_cache(
    async () => {
      const db = publicClient(storeId);
      if (!db) return [];
      const { data } = await db.from("settings").select("value").eq("key", "characters").maybeSingle();
      return normaliseCharacters((data as { value?: unknown } | null)?.value);
    },
    ["store-characters-v1", storeId],
    { tags: [storeTag("settings", storeId)], revalidate: 600 },
  )();
};

/** Every character: the owner's curated ones plus any that only exist as a product tag. Includes ones with no products yet. */
export async function getCharacters(): Promise<CharacterEntry[]> {
  const [profiles, all] = await Promise.all([getCharacterProfiles(), getAllProducts()]);
  return mergeCharacters(profiles, all);
}

export async function getCharacter(slug: string): Promise<CharacterEntry | undefined> {
  return (await getCharacters()).find((c) => c.slug === slug);
}

export async function getCharacterProducts(slug: string): Promise<Product[]> {
  return (await getAllProducts()).filter((p) => characterSlugs(p).includes(slug));
}
