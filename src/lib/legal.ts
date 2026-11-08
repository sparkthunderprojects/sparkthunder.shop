import { getCommerce } from "@/lib/commerce";
import { getSiteInfo } from "@/lib/site-info";
import { getStore } from "@/lib/store";
import { currentStoreId, DEFAULT_STORE_ID } from "@/lib/db/stores";
import { CONTACT_EMAIL } from "@/lib/site";

/** Who the legal pages speak for on this request: the store, the company behind it, its web address and contact address. */
export async function getLegal() {
  const [store, site, commerce, storeId] = await Promise.all([getStore(), getSiteInfo(), getCommerce(), currentStoreId()]);
  return {
    name: store.name,
    legalName: store.legalName || store.name,
    domain: site.domain,
    email: commerce.supportEmail || CONTACT_EMAIL || null,
    original: storeId === DEFAULT_STORE_ID,
    commerce,
  };
}
