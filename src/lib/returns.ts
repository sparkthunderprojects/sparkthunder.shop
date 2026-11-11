import type { Db } from "@/lib/db/clients";
import type { OrderRow } from "@/lib/shop/fulfil";

export const RETURN_WINDOW_DAYS = 30;
export const RETURN_REASONS = ["Arrived damaged or faulty", "Wrong item sent", "Not as described", "Wrong size or fit", "Changed my mind", "Other"] as const;
export type ReturnStatus = "requested" | "approved" | "rejected" | "received" | "refunded";
export type ReturnRow = {
  id: string; order_id: string; order_number: string; email: string; name: string; items: { line: number; name: string; qty: number }[];
  reason: string; details: string; status: ReturnStatus; admin_note: string; created_at: string; resolved_at: string | null;
};
export const RETURN_LABEL: Record<ReturnStatus, string> = { requested: "Waiting for us", approved: "Approved: send it back", rejected: "Not approved", received: "Received", refunded: "Refunded" };

/** Can the customer ask to return something from this order right now? */
export function returnEligibility(o: Pick<OrderRow, "status" | "shipped_at" | "created_at" | "items">, openRequests: number, now = Date.now()): { ok: true } | { ok: false; error: string } {
  if (o.status !== "shipped") return { ok: false, error: o.status === "cancelled" ? "This order was cancelled." : "You can ask for a return once your order has shipped." };
  if (!o.items.some((l) => l.type === "product")) return { ok: false, error: "Gift cards cannot be returned." };
  const since = Date.parse(o.shipped_at ?? o.created_at);
  if (Number.isFinite(since) && now - since > RETURN_WINDOW_DAYS * 86400_000) return { ok: false, error: `Returns can be requested within ${RETURN_WINDOW_DAYS} days of dispatch. Please contact us.` };
  if (openRequests > 0) return { ok: false, error: "You already have a return request open for this order." };
  return { ok: true };
}

export type ReturnInput = { items: { line: number; qty: number }[]; reason: string; details: string };

/** Validate and record a return request for an order the caller has already proved is theirs. */
export async function createReturn(db: Db, o: OrderRow, input: ReturnInput): Promise<{ ok: true; row: ReturnRow } | { ok: false; error: string }> {
  const { data: open } = await db.from("return_requests").select("id").eq("order_id", o.id).in("status", ["requested", "approved", "received"]);
  const el = returnEligibility(o, ((open ?? []) as unknown[]).length);
  if (!el.ok) return el;
  if (!(RETURN_REASONS as readonly string[]).includes(input.reason)) return { ok: false, error: "Choose a reason." };
  const items: ReturnRow["items"] = [];
  for (const it of input.items) {
    const line = o.items[it.line];
    if (!line || line.type !== "product") continue;
    const qty = Math.max(0, Math.min(Math.floor(Number(it.qty) || 0), line.qty));
    if (qty && !items.some((x) => x.line === it.line)) items.push({ line: it.line, name: line.name, qty });
  }
  if (!items.length) return { ok: false, error: "Choose at least one item to return." };
  const { data, error } = await db.from("return_requests").insert({ order_id: o.id, order_number: o.number, email: o.email, name: o.name, items, reason: input.reason, details: String(input.details ?? "").trim().slice(0, 1000), status: "requested" }).select("*").single();
  if (error) return { ok: false, error: `${error.message}. Run the latest supabase/admin.sql.` };
  return { ok: true, row: data as ReturnRow };
}
