import { unstable_cache } from "next/cache";
import { publicClient } from "@/lib/db/clients";
import { currentStoreId, DEFAULT_STORE_ID, listStores } from "@/lib/db/stores";
import { DEFAULT_STORE, normaliseStore, type StoreSettings } from "@/lib/store-config";

export * from "@/lib/store-config";

/** The current store's settings (cached; busted by the "settings" tag when the admin saves). */
export const getStore = async (): Promise<StoreSettings> => {
  const storeId = await currentStoreId();
  return unstable_cache(
  async (): Promise<StoreSettings> => {
    const db = publicClient(storeId);
    if (!db) return DEFAULT_STORE;
    const { data } = await db.from("settings").select("value").eq("key", "store").maybeSingle();
    const saved = (data as { value?: Partial<StoreSettings> } | null)?.value;
    if (saved || storeId === DEFAULT_STORE_ID) return normaliseStore(saved);
    // A store that has not been designed yet starts neutral (its own name, no Sparkthunder branding) until its settings are saved.
    const name = (await listStores()).find((x) => x.id === storeId)?.name ?? storeId;
    return normaliseStore({ name, legalName: name, tagline: "Welcome", heroHeading: name, description: `Shop ${name}.`, logoUrl: "", logoLabel: "", announcements: [] });
  },
  ["store-settings-v2", storeId],
  { tags: ["settings"], revalidate: 600 },
)();
};
