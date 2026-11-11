"use server";

import { revalidatePath } from "next/cache";
import { logActivity as audit } from "@/lib/admin/activity";
import { requireAdminAction } from "@/lib/admin/auth";
import { bustTag } from "@/lib/tags";
import { CATALOG_TAG } from "@/lib/catalog";
import { parseCsv, planImport, type ExistingProduct, type ImportPlan } from "@/lib/csv-import";
import { listCategories, listFranchises } from "@/lib/admin/repo";
import type { Db } from "@/lib/db/clients";

type R<T = object> = ({ ok: true } & T) | { ok: false; error: string };
const MAX_BYTES = 1_500_000;

async function plan(db: Db, csv: string): Promise<ImportPlan> {
  const [{ data }, franchises, categories] = await Promise.all([db.from("products").select("slug, sku, name, franchise_slug, category_slug, price_pence, compare_price_pence, track_stock, stock_qty, in_stock, published, tags, variants, printify_id"), listFranchises(db), listCategories(db)]);
  const existing = ((data ?? []) as ExistingProduct[]).map((p) => ({ ...p, tags: p.tags ?? [], variants: p.variants ?? [] }));
  return planImport(parseCsv(csv), existing, franchises, categories);
}

/** Show what a CSV would change, without changing anything. */
export async function previewImportAction(csv: string): Promise<R<{ plan: ImportPlan }>> {
  try {
    const { db } = await requireAdminAction("catalogue");
    if (csv.length > MAX_BYTES) return { ok: false, error: "That file is too large. Split it into smaller files." };
    return { ok: true, plan: await plan(db, csv) };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." }; }
}

/** Apply a CSV. The plan is recalculated from the file here (never trusted from the browser). Rows with problems are skipped, the rest are applied. */
export async function applyImportAction(csv: string): Promise<R<{ updated: number; created: number; skipped: number }>> {
  try {
    const { db } = await requireAdminAction("catalogue");
    if (csv.length > MAX_BYTES) return { ok: false, error: "That file is too large. Split it into smaller files." };
    const p = await plan(db, csv);
    let updated = 0, created = 0;
    for (const u of p.updates) {
      const { error } = await db.from("products").update(patchWithStock(u.patch)).eq("slug", u.slug);
      if (error) return { ok: false, error: `Stopped at line ${u.line}: ${error.message}. ${updated} updated so far.` };
      updated++;
    }
    for (const c of p.creates) {
      const { error } = await db.from("products").insert({ ...c.row, created_at: new Date().toISOString().slice(0, 10) });
      if (error) return { ok: false, error: `Stopped at line ${c.line}: ${error.message}. ${updated} updated and ${created} created so far.` };
      created++;
    }
    await bustTag(CATALOG_TAG);
    revalidatePath("/", "layout"); revalidatePath("/admin/products");
    await audit("product.import", `CSV import: ${updated} updated, ${created} created, ${p.errors.length} rows skipped`, { type: "product", meta: { updated, created, skipped: p.errors.length } });
    return { ok: true, updated, created, skipped: p.errors.length };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." }; }
}

/** Setting a stock number also keeps the "in stock" flag honest for tracked products. */
function patchWithStock(patch: Record<string, unknown>) {
  return typeof patch.stock_qty === "number" && patch.in_stock === undefined ? { ...patch, in_stock: patch.stock_qty > 0 } : patch;
}
