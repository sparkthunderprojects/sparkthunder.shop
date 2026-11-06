import { requireAdmin } from "@/lib/admin/auth";
import { productFromRow, collectionFromRow, type CollectionRow, type ProductRow } from "@/lib/db/mappers";
import { CollectionManager } from "./CollectionManager";

export const metadata = { title: "Collections" };

export default async function CollectionsAdmin() {
  const { db } = await requireAdmin();
  const [{ data: c }, { data: p }] = await Promise.all([db.from("collections").select("*").order("sort_order"), db.from("products").select("*")]);
  const products = ((p ?? []) as ProductRow[]).map(productFromRow).map((x) => ({ slug: x.slug, name: x.name }));
  return (
    <>
      <div className="adm-h"><div><h1>Collections and drops</h1><p>Group products into a themed collection. Give it a launch date and its products show a live countdown and cannot be bought until the moment arrives.</p></div></div>
      <CollectionManager collections={((c ?? []) as CollectionRow[]).map(collectionFromRow)} products={products} />
    </>
  );
}
