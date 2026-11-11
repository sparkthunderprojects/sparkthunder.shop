import { endpoint, fail } from "@/lib/api/handler";
import { publicReturn } from "@/lib/api/returns";

export const runtime = "nodejs";

/** GET /api/v1/returns/<id> */
export const GET = endpoint<{ id: string }>("read", async ({ db }, { id }) => {
  const { data } = await db.from("return_requests").select("*").eq("id", id).maybeSingle();
  if (!data) return fail(404, "Return not found.");
  return Response.json({ data: publicReturn(data as Parameters<typeof publicReturn>[0]) }, { headers: { "Cache-Control": "no-store" } });
});
