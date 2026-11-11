import { endpoint, fail } from "@/lib/api/handler";
import { applyProductPatch, publicProduct, type ProductRowLike } from "@/lib/api/products";
import { CATALOG_TAG } from "@/lib/catalog";
import { bustTag } from "@/lib/tags";

export const runtime = "nodejs";

/** GET /api/v1/products/<slug> */
export const GET = endpoint<{ slug: string }>("read", async ({ db }, { slug }) => {
  const { data } = await db.from("products").select("*").eq("slug", slug).maybeSingle();
  if (!data) return fail(404, "Product not found.");
  return Response.json({ data: publicProduct(data as ProductRowLike) }, { headers: { "Cache-Control": "no-store" } });
});

/** PATCH /api/v1/products/<slug>  {"price_pence":1999,"stock_qty":12,"in_stock":true,"published":true} : only these four can be changed. */
export const PATCH = endpoint<{ slug: string }>("write", async ({ db, req }, { slug }) => {
  const body = await req.json().catch(() => null);
  const r = applyProductPatch(body);
  if (!r.ok) return fail(400, r.error);
  const { data, error } = await db.from("products").update(r.update).eq("slug", slug).select("*").maybeSingle();
  if (error) return fail(500, "Could not update the product.");
  if (!data) return fail(404, "Product not found.");
  await bustTag(CATALOG_TAG);
  return Response.json({ data: publicProduct(data as ProductRowLike) });
});
