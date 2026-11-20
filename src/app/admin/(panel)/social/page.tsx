import { requireAdmin } from "@/lib/admin/auth";
import { buildHeatmap } from "@/lib/analytics";
import { currentStoreId, listStores } from "@/lib/db/stores";
import { SITE } from "@/lib/site";
import { normaliseSocial, bestTimes } from "@/lib/social";
import type { OrderRow } from "@/lib/shop/fulfil";
import { nowMs } from "@/lib/time";
import { SocialManager, type ProductOpt } from "./SocialManager";

export const metadata = { title: "Social media" };

export default async function SocialPage() {
  const { db } = await requireAdmin("marketing");
  const [{ data: s }, { data: p }, { data: o }, stores, sid] = await Promise.all([
    db.from("settings").select("value").eq("key", "social").maybeSingle(),
    db.from("products").select("slug, name, short_description, price_pence, images, franchise_slug, published").order("name"),
    db.from("orders").select("*"),
    listStores(), currentStoreId(),
  ]);
  const store = stores.find((x) => x.id === sid);
  const domain = store?.domains?.[0];
  const origin = domain ? `https://${domain}` : SITE.url;
  const now = nowMs();
  const times = bestTimes(buildHeatmap((o ?? []) as OrderRow[], now - 90 * 86400000, now + 1), 3);
  const products: ProductOpt[] = ((p ?? []) as { slug: string; name: string; short_description?: string; price_pence: number; images?: string[]; franchise_slug?: string; published?: boolean }[])
    .filter((x) => x.published !== false).map((x) => ({ slug: x.slug, name: x.name, blurb: x.short_description ?? "", pricePence: x.price_pence, image: x.images?.[0] ?? "", franchise: x.franchise_slug ?? "" }));
  return (
    <>
      <div className="adm-h"><div><h1>Social media: {store?.name ?? sid}</h1><p>Plan, write and schedule posts for this store. Every product link is tagged so you can see where visitors came from.</p></div></div>
      <SocialManager initial={normaliseSocial((s as { value?: unknown } | null)?.value)} products={products} origin={origin} brand={store?.name ?? "Shop"} best={times} nowIso={new Date(now).toISOString()} />
    </>
  );
}
