import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/db/clients";
import { isDemo } from "@/lib/db/env";
import { fulfilOrder } from "@/lib/shop/fulfil";
import { hasStripe } from "@/lib/shop/stripe";

/** LOCAL DEMO ONLY: stands in for Stripe's "payment complete" so the whole order flow can be tried without keys. */
export async function GET(req: Request) {
  if (!isDemo || hasStripe()) return new NextResponse("Not found", { status: 404 });
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const db = serviceClient()!;
  await fulfilOrder(db, { sessionId: id, paymentIntent: "pi_demo", email: "buyer@example.com", name: "Demo Buyer", phone: "", address: { name: "Demo Buyer", line1: "1 Test Street", line2: "", city: "London", postcode: "N1 1AA", country: "GB" } });
  return NextResponse.redirect(new URL(`/checkout/success?session_id=${id}`, req.url));
}
