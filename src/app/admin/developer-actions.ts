"use server";

import { serviceClient, type Db } from "@/lib/db/clients";
import { dbSetupProblem } from "@/lib/db/env";
import { currentStoreId } from "@/lib/db/stores";
import { revalidatePath } from "next/cache";
import { logActivity as audit } from "@/lib/admin/activity";
import { requireAdminAction } from "@/lib/admin/auth";
import { createApiKey, type Scope } from "@/lib/api/keys";
import { checkWebhookUrl, EVENTS, newSecret, runDeliveries, send } from "@/lib/webhooks/outbound";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };
/** The permission is checked first (requireAdminAction); the writes then use the server's own client, limited to this store, so they do not depend on extra row-level policies. */
async function svc(): Promise<Db> {
  const db = serviceClient(await currentStoreId());
  if (!db) throw new Error(dbSetupProblem());
  return db;
}
const message = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");

export async function createApiKeyAction(name: string, write: boolean): Promise<Result<{ key: string }>> {
  try {
    const { email } = await requireAdminAction("settings");
    const db = await svc();
    const scopes: Scope[] = write ? ["read", "write"] : ["read"];
    const r = await createApiKey(db, { name, scopes, by: email });
    if (!r.ok) return r;
    revalidatePath("/admin/developers");
    await audit("apikey.create", `Created API key "${r.row.name}" (${scopes.join(" + ")})`, { type: "api_key", id: r.row.id });
    return { ok: true, key: r.key };
  } catch (e) { return { ok: false, error: message(e) }; }
}

export async function revokeApiKeyAction(id: string): Promise<Result> {
  try {
    await requireAdminAction("settings");
    const db = await svc();
    const { error } = await db.from("api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/developers");
    await audit("apikey.revoke", "Revoked an API key", { type: "api_key", id });
    return { ok: true };
  } catch (e) { return { ok: false, error: message(e) }; }
}

export async function createWebhookAction(url: string, events: string[]): Promise<Result<{ secret: string }>> {
  try {
    await requireAdminAction("settings");
    const db = await svc();
    const c = checkWebhookUrl(url);
    if (!c.ok) return c;
    const chosen = events.filter((e) => (EVENTS as readonly string[]).includes(e));
    const { count } = await db.from("webhook_endpoints").select("id", { count: "exact", head: true });
    if ((count ?? 0) >= 10) return { ok: false, error: "You can have up to 10 webhooks. Remove one first." };
    const secret = newSecret();
    const { error } = await db.from("webhook_endpoints").insert({ url: c.url.toString(), secret, events: chosen, active: true });
    if (error) return { ok: false, error: `${error.message}. Run the latest supabase/admin.sql.` };
    revalidatePath("/admin/developers");
    await audit("webhook.create", `Added a webhook to ${c.url.host}`, { type: "webhook" });
    return { ok: true, secret };
  } catch (e) { return { ok: false, error: message(e) }; }
}

export async function setWebhookActiveAction(id: string, active: boolean): Promise<Result> {
  try {
    await requireAdminAction("settings");
    const db = await svc();
    const { error } = await db.from("webhook_endpoints").update({ active }).eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/developers");
    await audit("webhook.toggle", `${active ? "Turned on" : "Turned off"} a webhook`, { type: "webhook", id });
    return { ok: true };
  } catch (e) { return { ok: false, error: message(e) }; }
}

export async function deleteWebhookAction(id: string): Promise<Result> {
  try {
    await requireAdminAction("settings");
    const db = await svc();
    const { error } = await db.from("webhook_endpoints").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/developers");
    await audit("webhook.delete", "Deleted a webhook", { type: "webhook", id });
    return { ok: true };
  } catch (e) { return { ok: false, error: message(e) }; }
}

/** A new signing secret. The old one stops working at once, so update the receiving end straight after. */
export async function rotateWebhookSecretAction(id: string): Promise<Result<{ secret: string }>> {
  try {
    await requireAdminAction("settings");
    const db = await svc();
    const secret = newSecret();
    const { error } = await db.from("webhook_endpoints").update({ secret }).eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/developers");
    await audit("webhook.rotate", "Changed a webhook's signing secret", { type: "webhook", id });
    return { ok: true, secret };
  } catch (e) { return { ok: false, error: message(e) }; }
}

/** Send a harmless "ping" so you can see your receiver answers. Not recorded as a delivery. */
export async function testWebhookAction(id: string): Promise<Result<{ note: string }>> {
  try {
    await requireAdminAction("settings");
    const db = await svc();
    const { data } = await db.from("webhook_endpoints").select("*").eq("id", id).maybeSingle();
    const ep = data as { url: string; secret: string } | null;
    if (!ep) return { ok: false, error: "Webhook not found." };
    const r = await send(ep, { id: crypto.randomUUID(), event: "ping", payload: { message: "This is a test from Spark Merchant." } });
    return r.ok ? { ok: true, note: `Your server answered ${r.status}.` } : { ok: false, error: r.error || "No answer." };
  } catch (e) { return { ok: false, error: message(e) }; }
}

/** Put a failed delivery back in the queue and try it now. */
export async function retryDeliveryAction(id: string): Promise<Result> {
  try {
    await requireAdminAction("settings");
    const db = await svc();
    const { error } = await db.from("webhook_deliveries").update({ status: "pending", attempts: 0, next_attempt_at: new Date().toISOString() }).eq("id", id);
    if (error) return { ok: false, error: error.message };
    await runDeliveries(db, { limit: 20 });
    revalidatePath("/admin/developers");
    return { ok: true };
  } catch (e) { return { ok: false, error: message(e) }; }
}
