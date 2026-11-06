import { headers } from "next/headers";
import { currentStoreId, listStores, storeForHost } from "@/lib/db/stores";
import { getStore } from "@/lib/store";
import { SITE, fillSite } from "@/lib/site";
import { readableOn } from "@/lib/store-config";

const isLocal = (d: string) => /^(localhost|127\.0\.0\.1)$|\.localhost$|\.test$/.test(d.replace(/:\d+$/, ""));

export type SiteInfo = { storeId: string; origin: string; brand: string; legalName: string; domain: string; accent: string; dark: string; onAccent: string };

/**
 * Who we are for this request: the store, its canonical origin and its brand names.
 * The canonical origin is the store's first real domain (so www/preview/alias hosts never become canonicals);
 * on localhost and previews it is the host actually being served.
 */
export async function getSiteInfo(): Promise<SiteInfo> {
  const storeId = await currentStoreId();
  const [stores, store] = await Promise.all([listStores(), getStore()]);
  const row = stores.find((s) => s.id === storeId);
  let origin = SITE.url;
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
    const real = row?.domains.find((d) => !isLocal(d));
    if (real) origin = `https://${real.replace(/^www\./, "")}`;
    else if (host) origin = `${h.get("x-forwarded-proto") ?? (isLocal(host) ? "http" : "https")}://${host}`;
    void storeForHost;
  } catch { /* no request (build time): fall back to the configured URL */ }
  return { storeId, origin, brand: store.name, legalName: store.legalName || store.name, domain: new URL(origin).host, accent: store.accent, dark: store.dark, onAccent: readableOn(store.accent) };
}

export const siteOrigin = async () => (await getSiteInfo()).origin;

/** Fill the store stand-ins in any JSON-able value or string for the current request. */
export async function fillForRequest<T>(value: T): Promise<T> {
  const info = await getSiteInfo();
  return typeof value === "string" ? (fillSite(value, info) as T) : (JSON.parse(fillSite(JSON.stringify(value), { ...info, brand: JSON.stringify(info.brand).slice(1, -1) })) as T);
}
