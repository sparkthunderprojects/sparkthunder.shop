import { revalidatePath } from "next/cache";
import { revalidateStoreTag } from "@/lib/tags";
import { currentStoreId } from "@/lib/db/stores";
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
  // ?store=<id> for one store, ?store=* for all; by default the store that owns the host called.
  const q = new URL(req.url).searchParams.get("store");
  await revalidateStoreTag(CATALOG_TAG, q ?? (await currentStoreId()));
  revalidatePath("/", "layout");
  return Response.json({ ok: true, revalidated: Date.now() });
}
