import { unstable_cache } from "next/cache";
import { publicClient } from "@/lib/db/clients";
import { currentStoreId, DEFAULT_STORE_ID } from "@/lib/db/stores";
import { storeTag } from "@/lib/tags";
import { DEFAULT_COMMERCE, derivePrefix, normaliseCommerce, type CommerceSettings } from "@/lib/commerce-config";

export * from "@/lib/commerce-config";

/**
 * This store's shipping and gift-wrap rules (cached, busted with the "settings" tag).
 * The original store falls back to the environment variables; new stores start with sensible defaults and no free-shipping offer.
 */
export const getCommerce = async (): Promise<CommerceSettings> => {
  const storeId = await currentStoreId();
  return unstable_cache(
    async () => {
      const db = publicClient(storeId);
      const { data } = db ? await db.from("settings").select("value").eq("key", "commerce").maybeSingle() : { data: null };
      const saved = (data as { value?: Partial<CommerceSettings> } | null)?.value;
      const own = storeId === DEFAULT_STORE_ID ? DEFAULT_COMMERCE.codePrefix : derivePrefix(storeId);
      if (saved) return { ...normaliseCommerce(saved), codePrefix: normaliseCommerce({ ...saved, codePrefix: saved.codePrefix || own }).codePrefix };
      return storeId === DEFAULT_STORE_ID ? DEFAULT_COMMERCE : { ...DEFAULT_COMMERCE, freeShippingPence: null, codePrefix: own };
    },
    ["commerce-v1", storeId],
    { tags: [storeTag("settings", storeId)], revalidate: 600 },
  )();
};
