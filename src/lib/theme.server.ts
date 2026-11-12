import { unstable_cache } from "next/cache";
import { publicClient } from "@/lib/db/clients";
import { currentStoreId } from "@/lib/db/stores";
import { storeTag } from "@/lib/tags";
import { DEFAULT_THEME, normaliseTheme, type ThemeLayout } from "@/lib/theme-config";

/** The current store's layout settings (cached; busted by the "settings" tag when the admin saves). */
export const getTheme = async (): Promise<ThemeLayout> => {
  const storeId = await currentStoreId();
  return unstable_cache(
    async (): Promise<ThemeLayout> => {
      const db = publicClient(storeId);
      if (!db) return DEFAULT_THEME;
      const { data } = await db.from("settings").select("value").eq("key", "theme").maybeSingle();
      return normaliseTheme((data as { value?: Partial<ThemeLayout> } | null)?.value);
    },
    ["store-theme-v1", storeId],
    { tags: [storeTag("settings", storeId)], revalidate: 600 },
  )();
};
