import { endpoint, fail } from "@/lib/api/handler";
import { sendEmail } from "@/lib/email/send";
import { shippedEmail } from "@/lib/email/templates";
import { emitEvent, publicOrder } from "@/lib/webhooks/outbound";

export const runtime = "nodejs";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** POST /api/v1/orders/<id or number>/ship  {"carrier":"Royal Mail","tracking":"AB123"} : marks it shipped and emails the customer. Safe to send twice. */
export const POST = endpoint<{ id: string }>("write", async ({ db, req }, { id }) => {
  const body = (await req.json().catch(() => null)) as { carrier?: unknown; tracking?: unknown } | null;
  const carrier = typeof body?.carrier === "string" ? body.carrier.trim().slice(0, 60) : "", tracking = typeof body?.tracking === "string" ? body.tracking.trim().slice(0, 100) : "";
  const { data } = await db.from("orders").select("*").eq(UUID.test(id) ? "id" : "number", id).maybeSingle();
  const o = data as (Parameters<typeof publicOrder>[0] & { email: string; name: string }) | null;
  if (!o) return fail(404, "Order not found.");
  if (o.status === "cancelled") return fail(409, "A cancelled order cannot be shipped.");
  if (o.status === "shipped" && (o.tracking_number ?? "") === tracking) return Response.json({ data: publicOrder(o), already_shipped: true });
  const shipped_at = new Date().toISOString();
  const { error } = await db.from("orders").update({ status: "shipped", tracking_carrier: carrier, tracking_number: tracking, shipped_at, attention_reason: "" }).eq("id", o.id);
  if (error) return fail(500, "Could not update the order.");
  const now = { ...o, status: "shipped", tracking_carrier: carrier, tracking_number: tracking, shipped_at };
  if (o.email) await sendEmail({ to: o.email, ...shippedEmail({ number: o.number, name: o.name, carrier, tracking }) });
  await emitEvent(db, "order.shipped", publicOrder(now));
  return Response.json({ data: publicOrder(now) });
});
