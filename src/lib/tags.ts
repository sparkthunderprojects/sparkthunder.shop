import { revalidateTag, updateTag } from "next/cache";
import { currentStoreId, listStores } from "@/lib/db/stores";

/** Cache tags are per store, so one store's edit never flushes the other stores' caches. */
export const storeTag = (name: string, storeId: string) => `${name}:${storeId}`;

/** Refresh a cache for the store this request belongs to (inside /admin that is the store being edited). */
export async function bustTag(name: string): Promise<void> {
  updateTag(storeTag(name, await currentStoreId()));
}

/** Refresh a cache for one store (webhooks, scripts) or every store with "*". */
export async function revalidateStoreTag(name: string, storeId: string | "*"): Promise<void> {
  const ids = storeId === "*" ? (await listStores()).map((s) => s.id) : [storeId];
  for (const id of ids) revalidateTag(storeTag(name, id), "max");
}
