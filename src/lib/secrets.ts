import { createClient } from "@supabase/supabase-js";
import { createFakeClient } from "@/lib/db/fake";
import { SUPABASE_SERVICE_KEY, SUPABASE_URL, isDemo } from "@/lib/db/env";
import { DEFAULT_STORE_ID } from "@/lib/db/stores";

/** Credentials that belong to one store. Kept in a table only the server's service key can read; never sent to a browser. */
export type StoreSecrets = { stripeSecret: string; stripeWebhookSecret: string; resendKey: string; emailFrom: string };

const EMPTY: StoreSecrets = { stripeSecret: "", stripeWebhookSecret: "", resendKey: "", emailFrom: "" };

function db() {
  if (isDemo) return createFakeClient() as never as ReturnType<typeof createClient>;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
}

const memo = new Map<string, { at: number; v: StoreSecrets }>();

/**
 * Secrets for a store. The original store may fall back to the platform's environment variables;
 * every other store must have its own, so a new store can never charge customers into (or email from) another store's accounts.
 */
export async function getStoreSecrets(storeId: string): Promise<StoreSecrets> {
  const hit = memo.get(storeId);
  if (hit && Date.now() - hit.at < 30_000) return hit.v;
  const client = db();
  let v = EMPTY;
  if (client) {
    const { data } = await client.from("store_secrets").select("*").eq("store_id", storeId).maybeSingle();
    const r = data as { stripe_secret?: string; stripe_webhook_secret?: string; resend_key?: string; email_from?: string } | null;
    if (r) v = { stripeSecret: r.stripe_secret ?? "", stripeWebhookSecret: r.stripe_webhook_secret ?? "", resendKey: r.resend_key ?? "", emailFrom: r.email_from ?? "" };
  }
  if (storeId === DEFAULT_STORE_ID) {
    v = { stripeSecret: v.stripeSecret || process.env.STRIPE_SECRET_KEY || "", stripeWebhookSecret: v.stripeWebhookSecret || process.env.STRIPE_WEBHOOK_SECRET || "", resendKey: v.resendKey || process.env.RESEND_API_KEY || "", emailFrom: v.emailFrom || process.env.EMAIL_FROM || "" };
  }
  if (memo.size > 300) memo.clear();
  memo.set(storeId, { at: Date.now(), v });
  return v;
}

export const forgetStoreSecrets = (storeId: string) => { memo.delete(storeId); };
