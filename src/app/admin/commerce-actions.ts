"use server";

import { dbSetupProblem } from "@/lib/db/env";
import { logActivity as audit } from "@/lib/admin/activity";

import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/admin/auth";
import { serviceClient } from "@/lib/db/clients";
import { currentStoreId } from "@/lib/db/stores";
import { fetchRates } from "@/lib/currency";
import { SITE } from "@/lib/site";
import { normaliseCommerce, type CommerceSettings } from "@/lib/commerce-config";
import { forgetStoreSecrets, getStoreSecrets } from "@/lib/secrets";
import { bustTag } from "@/lib/tags";

type Result = { ok: true } | { ok: false; error: string };

export async function saveCommerceAction(input: CommerceSettings): Promise<Result> {
  try {
    const { db } = await requireAdminAction("settings");
    const value = normaliseCommerce(input);
    const { error } = await db.from("settings").upsert({ key: "commerce", value }, { onConflict: "key" });
    if (error) return { ok: false, error: error.message };
    await bustTag("settings");
    revalidatePath("/", "layout");
    await audit("commerce.save", "Saved shipping and payment settings");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." }; }
}

/** What is connected, without ever returning the secrets themselves. */
export async function secretsStatusAction(): Promise<{ stripe: boolean; webhook: boolean; email: boolean; emailFrom: string }> {
  await requireAdminAction("settings");
  const s = await getStoreSecrets(await currentStoreId());
  return { stripe: Boolean(s.stripeSecret), webhook: Boolean(s.stripeWebhookSecret), email: Boolean(s.resendKey), emailFrom: s.emailFrom };
}

/** Write-only: blank fields are left as they were; "clear" removes everything for this store. */
export async function saveSecretsAction(input: { stripeSecret: string; stripeWebhookSecret: string; resendKey: string; emailFrom: string; clear?: boolean }): Promise<Result> {
  try {
    await requireAdminAction("settings");
    const storeId = await currentStoreId();
    const svc = serviceClient(storeId);
    if (!svc) return { ok: false, error: dbSetupProblem() };
    const patch: Record<string, string> = {};
    const take = (k: string, v: string, ok: (x: string) => boolean, msg: string) => { const t = v.trim(); if (!t) return; if (!ok(t)) throw new Error(msg); patch[k] = t; };
    if (input.clear) { Object.assign(patch, { stripe_secret: "", stripe_webhook_secret: "", resend_key: "", email_from: "" }); }
    else {
      take("stripe_secret", input.stripeSecret, (x) => /^(sk|rk)_(live|test)_/.test(x), "That does not look like a Stripe secret key (it starts sk_live_ or sk_test_).");
      take("stripe_webhook_secret", input.stripeWebhookSecret, (x) => /^whsec_/.test(x), "A Stripe webhook secret starts whsec_.");
      take("resend_key", input.resendKey, (x) => /^re_/.test(x), "A Resend API key starts re_.");
      take("email_from", input.emailFrom, (x) => /^[^<>]*<?\S+@\S+\.\S+>?$/.test(x), "Use an address like Shop Name <orders@yourdomain.com>.");
    }
    if (!Object.keys(patch).length) return { ok: true };
    const { error } = await svc.from("store_secrets").upsert({ store_id: storeId, ...patch }, { onConflict: "store_id" });
    if (error) return { ok: false, error: error.message };
    forgetStoreSecrets(storeId);
    await audit("secrets.save", input.clear ? "Removed this store's payment and email keys" : "Changed this store's payment/email keys (values are never logged)");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." }; }
}

/** Today's reference exchange rates for the currencies you listed (European Central Bank figures). Nothing is saved until you press Save. */
export async function fetchRatesAction(codes: string[]): Promise<{ ok: true; rates: Record<string, number> } | { ok: false; error: string }> {
  try {
    await requireAdminAction("settings");
    return await fetchRates(SITE.currency, codes);
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." }; }
}
