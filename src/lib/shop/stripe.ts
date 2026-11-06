import Stripe from "stripe";
import { currentStoreId } from "@/lib/db/stores";
import { getStoreSecrets } from "@/lib/secrets";

const clients = new Map<string, Stripe>();

/** Does this store have its own Stripe account connected? */
export async function hasStripe(): Promise<boolean> {
  return Boolean((await getStoreSecrets(await currentStoreId())).stripeSecret);
}

/** The Stripe client for this store's own account (one per key, reused). */
export async function getStripe(): Promise<Stripe> {
  const key = (await getStoreSecrets(await currentStoreId())).stripeSecret;
  if (!key) throw new Error("Stripe is not configured for this store.");
  let c = clients.get(key);
  if (!c) { if (clients.size > 200) clients.clear(); c = new Stripe(key); clients.set(key, c); }
  return c;
}
