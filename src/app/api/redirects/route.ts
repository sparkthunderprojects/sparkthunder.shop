import { unstable_cache } from "next/cache";
import { publicClient } from "@/lib/db/clients";

const load = unstable_cache(
  async () => {
    const db = publicClient();
    if (!db) return [];
    const { data } = await db.from("redirects").select("from_path,to_path,status");
    return (data ?? []) as { from_path: string; to_path: string; status: number }[];
  },
  ["redirects-v1"],
  { tags: ["redirects"], revalidate: 60 },
);

/** Redirect table for the edge proxy. Public by design (these are public URLs). */
export async function GET() {
  return Response.json(await load(), { headers: { "Cache-Control": "public, s-maxage=30" } });
}
