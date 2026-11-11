"use server";

import { dbSetupProblem } from "@/lib/db/env";
import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { logActivity as audit } from "@/lib/admin/activity";
import { requireAdminAction } from "@/lib/admin/auth";
import { serviceClient } from "@/lib/db/clients";
import { currentStoreId } from "@/lib/db/stores";
import { forgetStoreSecrets, getStoreSecrets } from "@/lib/secrets";
import { Printify } from "@/lib/printify/api";
import { syncPrintify, type SyncResult } from "@/lib/printify/sync";

type R<T = object> = ({ ok: true } & T) | { ok: false; error: string };
const msg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");

async function client() {
  const storeId = await currentStoreId();
  const s = await getStoreSecrets(storeId);
  if (!s.printifyToken) throw new Error("Save your Printify token first.");
  return { storeId, secrets: s, api: new Printify(s.printifyToken) };
}

/** Save the token (and optionally the shop id). Write-only: values are never shown again. Finds the shop id itself when the account has one shop. */
export async function connectPrintifyAction(input: { token: string; shopId: string }): Promise<R<{ shops: { id: string; title: string }[]; shopId: string }>> {
  try {
    await requireAdminAction("settings");
    const storeId = await currentStoreId();
    const token = input.token.trim(), existing = await getStoreSecrets(storeId);
    const use = token || existing.printifyToken;
    if (!use) return { ok: false, error: "Paste your Printify token." };
    const shops = await new Printify(use).shops(); // proves the token works
    let shopId = input.shopId.trim() || existing.printifyShopId;
    if (!shopId && shops.length === 1) shopId = String(shops[0].id);
    if (shopId && !shops.some((s) => String(s.id) === shopId)) return { ok: false, error: "That shop id is not in this Printify account." };
    const svc = serviceClient(storeId);
    if (!svc) return { ok: false, error: dbSetupProblem() };
    const { error } = await svc.from("store_secrets").upsert({ store_id: storeId, ...(token ? { printify_token: token } : {}), printify_shop_id: shopId }, { onConflict: "store_id" });
    if (error) return { ok: false, error: `${error.message}. Run the latest supabase/admin.sql.` };
    forgetStoreSecrets(storeId);
    await audit("printify.connect", "Connected this store to Printify (token is never logged)");
    revalidatePath("/admin/printify");
    return { ok: true, shops: shops.map((s) => ({ id: String(s.id), title: s.title })), shopId };
  } catch (e) { return { ok: false, error: msg(e) }; }
}

export async function disconnectPrintifyAction(): Promise<R> {
  try {
    await requireAdminAction("settings");
    const storeId = await currentStoreId(), svc = serviceClient(storeId);
    if (!svc) return { ok: false, error: dbSetupProblem() };
    await svc.from("store_secrets").upsert({ store_id: storeId, printify_token: "", printify_shop_id: "", printify_webhook_secret: "" }, { onConflict: "store_id" });
    forgetStoreSecrets(storeId);
    await audit("printify.disconnect", "Disconnected Printify. New orders will no longer be sent for printing.");
    revalidatePath("/admin/printify");
    return { ok: true };
  } catch (e) { return { ok: false, error: msg(e) }; }
}

export async function importPrintifyAction(input: { franchiseSlug: string; categorySlug: string; publishNew: boolean }): Promise<R<{ result: SyncResult }>> {
  try {
    const { db } = await requireAdminAction("settings");
    const { secrets, api } = await client();
    if (!secrets.printifyShopId) return { ok: false, error: "Choose your Printify shop first." };
    if (!input.franchiseSlug || !input.categorySlug) return { ok: false, error: "Choose where new products should go (a franchise and a category)." };
    const result = await syncPrintify(db, api, secrets.printifyShopId, { franchiseSlug: input.franchiseSlug, categorySlug: input.categorySlug }, { publishNew: input.publishNew });
    await audit("printify.import", `Printify import: ${result.added} added, ${result.updated} updated, ${result.hidden} hidden`);
    revalidatePath("/admin/products"); revalidatePath("/admin/printify");
    return { ok: true, result };
  } catch (e) { return { ok: false, error: msg(e) }; }
}

/** Register the tracking webhook at Printify, pointing at this store's own domain. A fresh signing secret is made and stored. */
export async function connectPrintifyWebhookAction(): Promise<R<{ url: string }>> {
  try {
    await requireAdminAction("settings");
    const { storeId, secrets, api } = await client();
    if (!secrets.printifyShopId) return { ok: false, error: "Choose your Printify shop first." };
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
    if (!host || /^(localhost|127\.)/.test(host)) return { ok: false, error: "Printify can only reach a public address. Do this from your live site, not from localhost." };
    const url = `https://${host}/api/printify/webhook`;
    const svc = serviceClient(storeId);
    if (!svc) return { ok: false, error: dbSetupProblem() };
    const topics = ["order:shipment:created", "order:shipment:delivered", "order:sent-to-production"];
    const have = new Set((await api.listWebhooks(secrets.printifyShopId).catch(() => [])).filter((w) => w.url === url).map((w) => w.topic));
    // Hooks already made for this address keep their signing secret; only missing ones are added, so a half-finished earlier try can be completed.
    const secret = have.size && secrets.printifyWebhookSecret ? secrets.printifyWebhookSecret : randomBytes(24).toString("hex");
    if (have.size && !secrets.printifyWebhookSecret) return { ok: false, error: "Printify already has a tracking webhook for this address that this store does not know the secret of. Delete it in Printify (Account > Connections > API), then try again." };
    if (secret !== secrets.printifyWebhookSecret) { await svc.from("store_secrets").upsert({ store_id: storeId, printify_webhook_secret: secret }, { onConflict: "store_id" }); forgetStoreSecrets(storeId); }
    for (const topic of topics) if (!have.has(topic)) await api.createWebhook(secrets.printifyShopId, topic, url, secret);
    await audit("printify.webhook", "Connected Printify tracking updates");
    revalidatePath("/admin/printify");
    return { ok: true, url };
  } catch (e) { return { ok: false, error: msg(e) }; }
}
