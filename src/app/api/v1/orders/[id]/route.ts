import { endpoint, fail } from "@/lib/api/handler";
import { publicOrder } from "@/lib/webhooks/outbound";

export const runtime = "nodejs";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** GET /api/v1/orders/<id or order number> */
export const GET = endpoint<{ id: string }>("read", async ({ db }, { id }) => {
  const { data } = await db.from("orders").select("*").eq(UUID.test(id) ? "id" : "number", id).maybeSingle();
  if (!data) return fail(404, "Order not found.");
  return Response.json({ data: publicOrder(data as Parameters<typeof publicOrder>[0]) }, { headers: { "Cache-Control": "no-store" } });
});
