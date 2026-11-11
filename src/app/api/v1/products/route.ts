import { clampLimit, endpoint, fail } from "@/lib/api/handler";
import { publicProduct, type ProductRowLike } from "@/lib/api/products";

export const runtime = "nodejs";

/** GET /api/v1/products?limit=25&before=<created_at of the last product you saw> : newest first, including unpublished ones. */
export const GET = endpoint("read", async ({ db, req }) => {
  const u = new URL(req.url);
  const limit = clampLimit(u.searchParams.get("limit")), before = u.searchParams.get("before");
  if (before && Number.isNaN(Date.parse(before))) return fail(400, "before must be a date, e.g. the created_at of the last product you received.");
  let q = db.from("products").select("*").order("created_at", { ascending: false }).limit(limit + 1);
  if (before) q = q.lt("created_at", before);
  const { data, error } = await q;
  if (error) return fail(500, "Could not read products.");
  const rows = (data ?? []) as ProductRowLike[];
  const page = rows.slice(0, limit).map(publicProduct);
  return Response.json({ data: page, has_more: rows.length > limit, next_before: rows.length > limit ? page[page.length - 1].created_at : null }, { headers: { "Cache-Control": "no-store" } });
});
