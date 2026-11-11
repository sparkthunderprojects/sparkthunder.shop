import { endpoint, fail } from "@/lib/api/handler";
import { currentStoreId } from "@/lib/db/stores";
import { log } from "@/lib/log";
import { createRefund } from "@/lib/shop/refund";
import { refundStripe } from "@/lib/shop/refund-stripe";

export const runtime = "nodejs";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const whole = (v: unknown) => (v === undefined ? 0 : typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 10_000_000 ? v : NaN);

/**
 * POST /api/v1/orders/<id or number>/refund   (needs a key with the "refund" permission)
 * Header `Idempotency-Key: <8 to 80 characters you make up, one per refund>` is required: sending the same key again never refunds twice.
 * Body: {"card_pence":500,"gift_pence":0,"reason":"Damaged","restock":[{"line":0,"qty":1}],"take_points":false}
 */
export const POST = endpoint<{ id: string }>("refund", async ({ db, key, req }, { id }) => {
  const idem = (req.headers.get("idempotency-key") ?? "").trim();
  if (idem.length < 8 || idem.length > 80) return fail(400, "Send an Idempotency-Key header of 8 to 80 characters (any unique text you make up for this refund). Repeating the same key never refunds twice.");
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") return fail(400, "Send a JSON body.");
  const card = whole(body.card_pence), gift = whole(body.gift_pence);
  if (Number.isNaN(card) || Number.isNaN(gift)) return fail(400, "card_pence and gift_pence must be whole numbers of pence, 0 or more.");
  if (card + gift <= 0) return fail(400, "Refund at least 1 penny to the card or the gift card.");
  const restock = Array.isArray(body.restock) ? body.restock : [];
  if (restock.length > 50 || restock.some((r) => !r || !Number.isInteger((r as { line?: unknown }).line) || !Number.isInteger((r as { qty?: unknown }).qty))) return fail(400, "restock must be a list like [{\"line\":0,\"qty\":1}].");
  const { data } = await db.from("orders").select("id,number").eq(UUID.test(id) ? "id" : "number", id).maybeSingle();
  const o = data as { id: string; number: string } | null;
  if (!o) return fail(404, "Order not found.");
  const storeId = await currentStoreId();
  const r = await createRefund(db, await refundStripe(), storeId, {
    orderId: o.id, key: `api:${idem}`, cardPence: card, giftPence: gift, restock: restock as { line: number; qty: number }[], takePoints: body.take_points === true,
    reason: typeof body.reason === "string" ? body.reason : "", by: `api:${key.name}`,
  });
  if (!r.ok) {
    await log.warn("api.refund_failed", r.error, { order: o.number, key: key.name }, { storeId });
    return r.retry ? Response.json({ error: r.error, retry: true, refund_id: r.refundId }, { status: 502 }) : fail(422, r.error);
  }
  await log.info("api.refund", `Refund on order ${o.number} through the API (${key.name})`, { order: o.number, cardPence: card, giftPence: gift }, { storeId });
  return Response.json({ data: { id: r.refund.id, order: o.number, card_pence: r.refund.card_pence, gift_pence: r.refund.gift_pence, status: r.refund.status, problems: r.problems } });
});
