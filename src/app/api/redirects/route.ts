import { unstable_cache } from "next/cache";
import { publicClient } from "@/lib/db/clients";
import { currentStoreId } from "@/lib/db/stores";

const load = (storeId: string) =>
  unstable_cache(
    async () => {
      const db = publicClient(storeId);
      if (!db) return [];
      const { data } = await db.from("redirects").select("from_path,to_path,status");
      return (data ?? []) as { from_path: string; to_path: string; status: number }[];
    },
    ["redirects-v2", storeId],
    { tags: ["redirects"], revalidate: 60 },
  )();

/** Redirect table for the edge proxy, for the store that owns the requested host. Public by design (these are public URLs). */
export async function GET() {
  return Response.json(await load(await currentStoreId()), { headers: { "Cache-Control": "public, s-maxage=30", Vary: "Host" } });
}
