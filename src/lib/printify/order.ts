import type { Db } from "@/lib/db/clients";
import type { Snapshot } from "@/lib/shop/types";
import { Printify, PrintifyError, type PfyAddress } from "./api";

/** A reportable (not retryable) problem. fulfil.ts treats it as "tell the owner". */
export class PrintifyProblem extends Error {}

export type PrintifyState = { orderId?: string; sent?: boolean };

type Addr = Record<string, string> | null;
const splitName = (n: string) => { const p = n.trim().split(/\s+/); return { first: p[0] || "Customer", last: p.slice(1).join(" ") || "-" }; };

export function toPfyAddress(name: string, email: string, phone: string, a: Addr): PfyAddress {
  const { first, last } = splitName(name || a?.name || "");
  return { first_name: first, last_name: last, email, phone: phone || "", country: (a?.country ?? "").toUpperCase(), region: a?.state ?? "", address1: a?.line1 ?? "", address2: a?.line2 ?? "", city: a?.city ?? "", zip: a?.postcode ?? "" };
}

/** Which of an order's lines are Printify products, with the Printify ids they need. Lines we cannot match are returned in `missing`. */
export async function printifyLines(db: Db, lines: Snapshot["lines"]) {
  const out: { product_id: string; variant_id: number; quantity: number }[] = [], missing: string[] = [];
  let anyPrintify = false;
  for (const l of lines) {
    if (l.type !== "product") continue;
    const { data } = await db.from("products").select("printify_id, variants").eq("slug", l.slug).maybeSingle();
    const p = data as { printify_id?: string; variants?: { name: string; externalId?: string }[] | null } | null;
    if (!p?.printify_id) continue;
    anyPrintify = true;
    const v = (p.variants ?? []).find((x) => x.name === (l.variant ?? "")) ?? (!l.variant && (p.variants ?? []).length === 1 ? p.variants![0] : undefined);
    const id = Number(v?.externalId);
    if (!id) { missing.push(`${l.name}${l.variant ? ` (${l.variant})` : ""}`); continue; }
    out.push({ product_id: p.printify_id, variant_id: id, quantity: l.qty });
  }
  return { anyPrintify, lines: out, missing };
}

/**
 * Create the Printify order and send it to production. Safe to repeat: the order number is the external id, so a second create is
 * recognised (409) and the existing order is found instead. `state` is saved by the caller between the two calls.
 */
export async function sendToPrintify(db: Db, api: Printify, shopId: string, o: { number: string; email: string; name: string; phone: string; address: Addr; lines: Snapshot["lines"] }, state: PrintifyState, save: () => Promise<void>): Promise<{ touched: boolean }> {
  if (state.sent) return { touched: false };
  const pl = await printifyLines(db, o.lines);
  if (!pl.anyPrintify) return { touched: false };
  if (pl.missing.length) throw new PrintifyProblem(`Not sent to Printify: ${pl.missing.join(", ")} cannot be matched to a Printify option. Re-sync products and use Finish processing.`);
  if (!o.address?.line1 || !o.address.country) throw new PrintifyProblem("Not sent to Printify: the order has no delivery address.");
  try {
    if (!state.orderId) {
      try {
        const r = await api.createOrder(shopId, { external_id: o.number, label: o.number, line_items: pl.lines, shipping_method: 1, send_shipping_notification: false, address_to: toPfyAddress(o.name, o.email, o.phone, o.address) });
        state.orderId = r.id;
      } catch (e) {
        if (!(e instanceof PrintifyError) || e.status !== 409) throw e;
        // We created it on an earlier attempt but never saved its id: find it by our order number.
        for (let page = 1; page <= 3 && !state.orderId; page++) {
          const list = await api.listOrders(shopId, page);
          state.orderId = list.data.find((x) => x.app_order_id === o.number || x.external_id === o.number || x.label === o.number)?.id;
          if (!list.data.length) break;
        }
        if (!state.orderId) throw new PrintifyProblem(`Printify already has an order with number ${o.number} but it could not be found to send. Check it in Printify.`);
      }
      await save();
    }
    try { await api.sendToProduction(shopId, state.orderId); }
    catch (e) { if (!(e instanceof PrintifyError) || e.status !== 400 || !/already|production/i.test(e.message)) throw e; }
    state.sent = true; await save();
    return { touched: true };
  } catch (e) {
    if (e instanceof PrintifyProblem) throw e;
    if (e instanceof PrintifyError && !e.retryable) throw new PrintifyProblem(`Printify refused the order: ${e.message}`);
    throw e; // temporary: fulfilOrder retries
  }
}
