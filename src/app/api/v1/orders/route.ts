import { clampLimit, endpoint, fail } from "@/lib/api/handler";
import { publicOrder } from "@/lib/webhooks/outbound";

export const runtime = "nodejs";
const STATUSES = ["paid", "shipped", "cancelled", "attention"];

/** GET /api/v1/orders?status=paid&limit=25&before=<created_at of the last order you saw> : newest first. */
export const GET = endpoint("read", async ({ db, req }) => {
  const u = new URL(req.url);
  const limit = clampLimit(u.searchParams.get("limit"));
  const status = u.searchParams.get("status"), before = u.searchParams.get("before");
  if (status && !STATUSES.includes(status)) return fail(400, `status must be one of: ${STATUSES.join(", ")}`);
  if (before && Number.isNaN(Date.parse(before))) return fail(400, "before must be a date, e.g. the created_at of the last order you received.");
  let q = db.from("orders").select("*").order("created_at", { ascending: false }).limit(limit + 1);
  if (status) q = q.eq("status", status);
  if (before) q = q.lt("created_at", before);
  const { data, error } = await q;
  if (error) return fail(500, "Could not read orders.");
  const rows = (data ?? []) as Parameters<typeof publicOrder>[0][];
  const page = rows.slice(0, limit).map(publicOrder);
  return Response.json({ data: page, has_more: rows.length > limit, next_before: rows.length > limit ? page[page.length - 1].created_at : null }, { headers: { "Cache-Control": "no-store" } });
});
