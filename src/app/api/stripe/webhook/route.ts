import { revalidatePath, revalidateTag } from "next/cache";
import type Stripe from "stripe";
import { CATALOG_TAG } from "@/lib/catalog";
import { serviceClient } from "@/lib/db/clients";
import { fulfilOrder } from "@/lib/shop/fulfil";
import { getStripe } from "@/lib/shop/stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers.get("stripe-signature");
  if (!secret || !sig) return new Response("Webhook is not configured", { status: 400 });

  let event: Stripe.Event;
  try { event = getStripe().webhooks.constructEvent(await req.text(), sig, secret); }
  catch { return new Response("Invalid signature", { status: 400 }); }

  if (event.type === "checkout.session.completed") {
    const s = event.data.object as Stripe.Checkout.Session;
    if (s.payment_status === "paid" || s.payment_status === "no_payment_required") {
      const db = serviceClient();
      if (!db) return new Response("Database not configured", { status: 500 });
      const ship = (s as unknown as { collected_information?: { shipping_details?: { name?: string; address?: Stripe.Address } } }).collected_information?.shipping_details
        ?? (s as unknown as { shipping_details?: { name?: string; address?: Stripe.Address } }).shipping_details;
      const a = ship?.address;
      try {
        await fulfilOrder(db, {
          sessionId: s.id,
          paymentIntent: typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id ?? "",
          email: s.customer_details?.email ?? "", name: s.customer_details?.name ?? ship?.name ?? "", phone: s.customer_details?.phone ?? "",
          address: a ? { name: ship?.name ?? "", line1: a.line1 ?? "", line2: a.line2 ?? "", city: a.city ?? "", postcode: a.postal_code ?? "", country: a.country ?? "" } : null,
        });
        revalidateTag(CATALOG_TAG, "max");
        revalidatePath("/admin", "layout");
      } catch (e) {
        console.error("[stripe webhook] fulfilment failed", e);
        return new Response("Fulfilment failed", { status: 500 }); // Stripe will retry; fulfilOrder is idempotent
      }
    }
  }
  return new Response("ok");
}
