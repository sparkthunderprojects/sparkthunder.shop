import { revalidatePath } from "next/cache";
import { notifyOwner } from "@/lib/alerts";
import { log } from "@/lib/log";
import { revalidateStoreTag } from "@/lib/tags";
import { currentStoreId } from "@/lib/db/stores";
import type Stripe from "stripe";
import { CATALOG_TAG } from "@/lib/catalog";
import { serviceClient } from "@/lib/db/clients";
import { fulfilOrder } from "@/lib/shop/fulfil";
import { recordExternalRefunds } from "@/lib/shop/refund";
import { getStripe } from "@/lib/shop/stripe";
import { getStoreSecrets } from "@/lib/secrets";

export const runtime = "nodejs";

export async function POST(req: Request) {
  // The store is the one that owns the host Stripe posted to, so each store verifies with its own webhook secret.
  const secret = (await getStoreSecrets(await currentStoreId())).stripeWebhookSecret;
  const sig = req.headers.get("stripe-signature");
  if (!secret || !sig) return new Response("Webhook is not configured", { status: 400 });

  let event: Stripe.Event;
  try { event = (await getStripe()).webhooks.constructEvent(await req.text(), sig, secret); }
  catch { await log.warn("webhook.bad_signature", "A webhook with an invalid signature was rejected"); return new Response("Invalid signature", { status: 400 }); }

  if (event.type === "checkout.session.completed") {
    const s = event.data.object as Stripe.Checkout.Session;
    if (s.payment_status === "paid" || s.payment_status === "no_payment_required") {
      const db = serviceClient();
      if (!db) return new Response("Database not configured", { status: 500 });
      const ship = (s as unknown as { collected_information?: { shipping_details?: { name?: string; address?: Stripe.Address } } }).collected_information?.shipping_details
        ?? (s as unknown as { shipping_details?: { name?: string; address?: Stripe.Address } }).shipping_details;
      const a = ship?.address;
      try {
        const result = await fulfilOrder(db, {
          storeId: await currentStoreId(),
          sessionId: s.id,
          paymentIntent: typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id ?? "",
          email: s.customer_details?.email ?? "", name: s.customer_details?.name ?? ship?.name ?? "", phone: s.customer_details?.phone ?? "",
          address: a ? { name: ship?.name ?? "", line1: a.line1 ?? "", line2: a.line2 ?? "", city: a.city ?? "", postcode: a.postal_code ?? "", country: a.country ?? "" } : null,
        });
        // Another worker is finishing this order right now: ask Stripe to try again later rather than do it twice.
        if (result.busy) return new Response("Order is being processed", { status: 503 });
        await revalidateStoreTag(CATALOG_TAG, await currentStoreId());
        revalidatePath("/admin", "layout");
      } catch (e) {
        await log.error("webhook.fulfil_failed", "Fulfilment failed; Stripe will retry", { session: s.id, error: e });
        await notifyOwner("An order payment could not be processed yet", "A payment came in but the order could not be finished. The system will retry automatically. If this keeps happening, open the order in the admin and press Finish processing.", `webhook:${s.id}`);
        return new Response("Fulfilment failed", { status: 500 }); // Stripe will retry; fulfilOrder resumes from the last finished step
      }
    }
  }
  if (event.type === "charge.refunded") {
    const ch = event.data.object as Stripe.Charge;
    const db = serviceClient();
    if (!db) return new Response("Database not configured", { status: 500 });
    try {
      const pi = typeof ch.payment_intent === "string" ? ch.payment_intent : ch.payment_intent?.id ?? "";
      // The event may carry only the latest refunds, so ask Stripe for the full list.
      const list = await (await getStripe()).refunds.list({ payment_intent: pi, limit: 100 });
      await recordExternalRefunds(db, await currentStoreId(), pi, list.data.map((r) => ({ id: r.id, amount: r.amount, status: r.status, metadata: r.metadata })));
      revalidatePath("/admin", "layout");
    } catch (e) {
      await log.error("webhook.refund_record_failed", "Could not record a Stripe-dashboard refund", { error: e });
      return new Response("Could not record the refund", { status: 500 });
    }
  }
  return new Response("ok");
}
