import { unstable_cache } from "next/cache";
import { publicClient } from "@/lib/db/clients";
import { DEFAULT_STORE, normaliseStore, type StoreSettings } from "@/lib/store-config";

export * from "@/lib/store-config";

/** The current store's settings (cached; busted by the "settings" tag when the admin saves). */
export const getStore = unstable_cache(
  async (): Promise<StoreSettings> => {
    const db = publicClient();
    if (!db) return DEFAULT_STORE;
    const { data } = await db.from("settings").select("value").eq("key", "store").maybeSingle();
    return normaliseStore((data as { value?: Partial<StoreSettings> } | null)?.value);
  },
  ["store-settings-v1"],
  { tags: ["settings"], revalidate: 600 },
);
