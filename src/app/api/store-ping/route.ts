import { currentStoreId } from "@/lib/db/stores";

export const dynamic = "force-dynamic";

/** Says which store a hostname belongs to. Used by Admin > Domains to confirm a domain is connected; reveals nothing but the store's id. */
export async function GET() {
  return Response.json({ store: await currentStoreId() }, { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
}
