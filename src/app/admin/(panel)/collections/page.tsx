import { requireAdmin } from "@/lib/admin/auth";
import { productFromRow, collectionFromRow, type CollectionRow, type ProductRow } from "@/lib/db/mappers";
import { normaliseSmartMap } from "@/lib/smart-collections";
import { CollectionManager } from "./CollectionManager";

export const metadata = { title: "Collections" };

export default async function CollectionsAdmin() {
  const { db } = await requireAdmin("catalogue");
  const [{ data: c }, { data: p }, { data: sm }, { data: fr }, { data: ca }] = await Promise.all([db.from("collections").select("*").order("sort_order"), db.from("products").select("*"), db.from("settings").select("value").eq("key", "smart_collections").maybeSingle(), db.from("franchises").select("slug, name"), db.from("categories").select("slug, name")]);
  const products = ((p ?? []) as ProductRow[]).map(productFromRow).filter((x) => x.published !== false).map((x) => ({ slug: x.slug, name: x.name, franchiseSlug: x.franchiseSlug, categorySlug: x.categorySlug, pricePence: x.pricePence, comparePricePence: x.comparePricePence ?? null, inStock: x.inStock, isNew: x.isNew, isFeatured: x.isFeatured, tags: x.tags ?? [] }));
  return (
    <>
      <div className="adm-h"><div><h1>Collections and drops</h1><p>Group products into a themed collection. Give it a launch date and its products show a live countdown and cannot be bought until the moment arrives.</p></div></div>
      <CollectionManager collections={((c ?? []) as CollectionRow[]).map(collectionFromRow)} products={products} rules={normaliseSmartMap((sm as { value?: unknown } | null)?.value)} franchises={(fr ?? []) as { slug: string; name: string }[]} categories={(ca ?? []) as { slug: string; name: string }[]} />
    </>
  );
}
