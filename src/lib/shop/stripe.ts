import Stripe from "stripe";

let client: Stripe | null = null;
export const hasStripe = () => Boolean(process.env.STRIPE_SECRET_KEY);
export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("Stripe is not configured.");
  return (client ??= new Stripe(process.env.STRIPE_SECRET_KEY));
}
