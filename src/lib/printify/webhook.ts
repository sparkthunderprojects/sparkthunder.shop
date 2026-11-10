import { createHmac, timingSafeEqual } from "node:crypto";
import type { Db } from "@/lib/db/clients";
import { sendEmail } from "@/lib/email/send";
import { shippedEmail } from "@/lib/email/templates";
import type { OrderRow } from "@/lib/shop/fulfil";

/** Printify signs the raw body: `X-Pfy-Signature: sha256=<hex hmac>`. */
export function verifySignature(raw: string, header: string | null, secret: string): boolean {
  if (!secret || !header) return false;
  const want = createHmac("sha256", secret).update(raw).digest("hex");
  const got = header.replace(/^sha256=/i, "").trim().toLowerCase();
  const a = Buffer.from(want), b = Buffer.from(got);
  return a.length === b.length && timingSafeEqual(a, b);
}

type Event = { type?: string; resource?: { id?: string; data?: { status?: string; carrier?: { code?: string; tracking_number?: string; tracking_url?: string } } } };

/**
 * Apply a Printify event to the matching order. Safe to receive twice: a shipment we already recorded is not emailed again.
 * Returns what happened, for logging and tests.
 */
export async function handlePrintifyEvent(db: Db, ev: Event): Promise<"shipped" | "status" | "ignored" | "unknown-order" | "duplicate"> {
  const pid = ev.resource?.id;
  if (!pid || !ev.type) return "ignored";
  const { data } = await db.from("orders").select("*").eq("printify_order_id", pid).maybeSingle();
  const o = data as OrderRow | null;
  if (!o) return "unknown-order";

  if (ev.type === "order:shipment:created" || ev.type === "order:shipment:delivered") {
    const c = ev.resource?.data?.carrier ?? {};
    const carrier = (c.code ?? "").trim(), tracking = (c.tracking_number ?? "").trim();
    if (ev.type === "order:shipment:delivered") { await db.from("orders").update({ printify_status: "delivered" }).eq("id", o.id); return "status"; }
    if (o.status === "shipped" && o.tracking_number === tracking) return "duplicate";
    if (o.status === "cancelled") return "ignored";
    await db.from("orders").update({ status: "shipped", tracking_carrier: carrier, tracking_number: tracking, shipped_at: new Date().toISOString(), printify_status: "shipped", attention_reason: "" }).eq("id", o.id);
    if (o.email) await sendEmail({ to: o.email, ...shippedEmail({ number: o.number, name: o.name, carrier, tracking }) });
    return "shipped";
  }
  const status = ev.resource?.data?.status;
  if (status) { await db.from("orders").update({ printify_status: status }).eq("id", o.id); return "status"; }
  if (ev.type === "order:sent-to-production") { await db.from("orders").update({ printify_status: "in-production" }).eq("id", o.id); return "status"; }
  return "ignored";
}
