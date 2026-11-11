import { isDemo } from "@/lib/db/env";
import { getStripe, hasStripe } from "@/lib/shop/stripe";
import type { RefundStripe } from "@/lib/shop/refund";

/** Stripe for refunds. In demo mode a stand-in answers, so the whole flow can be tried without a payment account. */
export async function refundStripe(): Promise<RefundStripe | null> {
  if (isDemo) return { refunds: { create: async (_p, o) => ({ id: `re_demo_${o?.idempotencyKey ?? Date.now()}` }) } };
  if (!(await hasStripe())) return null;
  return (await getStripe()) as unknown as RefundStripe;
}
