import type { Db } from "@/lib/db/clients";
import { productFromRow, productToRow, type ProductRow } from "@/lib/db/mappers";
import type { Printify } from "./api";
import { mapProduct, type ImportChoices } from "./map";

export type SyncResult = { added: number; updated: number; skipped: { title: string; why: string }[]; hidden: number };

/**
 * Bring this store's Printify products in. New ones are added (hidden from the shop until you publish them unless Printify already shows them);
 * ones we already have get fresh prices, options and photos but keep any wording you edited.
 * Products that vanished from Printify are hidden, never deleted, so old orders and links keep working.
 */
export async function syncPrintify(db: Db, api: Printify, shopId: string, choices: ImportChoices, opts: { publishNew?: boolean } = {}): Promise<SyncResult> {
  const remote = await api.listProducts(shopId);
  const { data } = await db.from("products").select("*").neq("printify_id", "");
  const have = new Map(((data ?? []) as ProductRow[]).map((r) => [r.printify_id ?? "", r]));
  const res: SyncResult = { added: 0, updated: 0, skipped: [], hidden: 0 };
  const seen = new Set<string>();

  for (const p of remote) {
    seen.add(p.id);
    const row = have.get(p.id);
    const existing = row ? productFromRow(row) : null;
    const mapped = mapProduct(p, choices, existing);
    if (!mapped) { res.skipped.push({ title: p.title, why: "No sellable options (all switched off or unavailable at Printify)" }); if (row && row.published) { await db.from("products").update({ published: false }).eq("slug", row.slug); res.hidden++; } continue; }
    if (existing) {
      // Printify owns price, options and photos; the store owns the wording and where the product sits.
      const keepPhotos = existing.images.length ? existing.images : mapped.images;
      const merged = { ...mapped, images: [...new Set([...mapped.images, ...keepPhotos])].slice(0, 12) };
      const { created_at: _c, slug: _s, ...patch } = productToRow(merged);
      void _c; void _s;
      const { error } = await db.from("products").update(patch).eq("slug", existing.slug);
      if (error) throw new Error(`Could not update ${p.title}: ${error.message}`);
      res.updated++;
    } else {
      const toInsert = { ...mapped, published: opts.publishNew ? p.visible : false };
      const { error } = await db.from("products").insert({ ...productToRow(toInsert), printify_id: p.id });
      if (error) { if (/duplicate|unique/i.test(error.message)) { res.skipped.push({ title: p.title, why: "A product with this web address already exists" }); continue; } throw new Error(`Could not add ${p.title}: ${error.message}`); }
      res.added++;
    }
  }
  for (const [id, row] of have) if (!seen.has(id) && row.published) { await db.from("products").update({ published: false }).eq("slug", row.slug); res.hidden++; }
  return res;
}
