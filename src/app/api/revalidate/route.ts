import { revalidatePath, revalidateTag } from "next/cache";
import { CATALOG_TAG } from "@/lib/catalog";

/**
 * Call after editing products in Supabase (e.g. from a database webhook):
 *   POST /api/revalidate   header: x-revalidate-secret: <REVALIDATE_SECRET>
 */
export async function POST(req: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || req.headers.get("x-revalidate-secret") !== secret) {
    return Response.json({ ok: false }, { status: 401 });
  }
  revalidateTag(CATALOG_TAG, "max");
  revalidatePath("/", "layout");
  return Response.json({ ok: true, revalidated: Date.now() });
}
