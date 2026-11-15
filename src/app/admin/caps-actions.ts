"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/admin/auth";
import { logActivity as audit } from "@/lib/admin/activity";
import { bustTag } from "@/lib/tags";
import { CATALOG_TAG } from "@/lib/catalog";
import * as repo from "@/lib/admin/repo";
import { CAPS, CAP_SLUGS, capProduct } from "@/lib/starters-caps";

/**
 * Adds the twelve sample caps and hats (placeholder art) to the store being edited, so a collection page can be seen with real-looking content.
 * Safe to press twice: caps that already exist are left alone. Creates the "Core" line and "Hats" category if they are missing, and puts the
 * caps into the "streetwear-hats" collection (publishing it) when that collection exists.
 */
export async function addSampleCapsAction(): Promise<{ ok: true; added: number } | { ok: false; error: string }> {
  try {
    const { db } = await requireAdminAction("catalogue");
    const [products, franchises, categories] = await Promise.all([repo.listProducts(db), repo.listFranchises(db), repo.listCategories(db)]);
    if (!franchises.some((f) => f.slug === "core")) await repo.writeFranchise(db, { slug: "core", name: "Core", tagline: "The everyday line", description: "", accent: "#e4002b", sortOrder: franchises.length + 1 } as never, null);
    if (!categories.some((c) => c.slug === "hats")) await repo.writeCategory(db, { slug: "hats", name: "Hats", description: "Caps, beanies and bucket hats.", sortOrder: categories.length + 1 } as never, null);
    const have = new Set(products.map((p) => p.slug));
    const skus = new Set(products.map((p) => p.sku));
    const now = new Date().toISOString();
    let added = 0;
    for (const c of CAPS) {
      const p = capProduct(c, now);
      if (have.has(p.slug) || skus.has(p.sku)) continue;
      await repo.writeProduct(db, p, null);
      added++;
    }
    const { data } = await db.from("collections").select("slug").eq("slug", "streetwear-hats").maybeSingle();
    if (data) await db.from("collections").update({ product_slugs: CAP_SLUGS, published: true }).eq("slug", "streetwear-hats");
    await bustTag(CATALOG_TAG);
    revalidatePath("/", "layout");
    revalidatePath("/admin", "layout");
    await audit("product.samples", `Added ${added} sample caps`, { type: "product" });
    return { ok: true, added };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." }; }
}
