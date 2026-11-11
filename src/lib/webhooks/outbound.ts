import { createHmac, randomBytes } from "node:crypto";
import { lookup } from "node:dns/promises";
import type { Db } from "@/lib/db/clients";
import { log } from "@/lib/log";

export const EVENTS = ["order.created", "order.shipped", "order.refunded", "return.requested"] as const;
export type WebhookEvent = (typeof EVENTS)[number];
export const MAX_ATTEMPTS = 6;
const BACKOFF_MIN = [1, 5, 30, 120, 720]; // minutes before attempt 2..6

export const newSecret = () => `whsec_${randomBytes(24).toString("hex")}`;
export const sign = (secret: string, body: string) => `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;

const PRIVATE = /^(localhost|.*\.local|.*\.internal|0\.0\.0\.0)$/i;
const privateIp = (ip: string) => /^(10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.|::1$|fc|fd|fe80)/i.test(ip);

/** Only public https addresses: a webhook must never be pointed at our own network. (Checked again at delivery time, after DNS.) */
export function checkWebhookUrl(raw: string): { ok: true; url: URL } | { ok: false; error: string } {
  let u: URL;
  try { u = new URL(raw.trim()); } catch { return { ok: false, error: "Enter a full address starting with https://" }; }
  if (u.protocol !== "https:") return { ok: false, error: "Webhook addresses must start with https://" };
  if (u.username || u.password) return { ok: false, error: "Do not put a username or password in the address." };
  if (PRIVATE.test(u.hostname) || privateIp(u.hostname) || /^\[/.test(u.hostname) || !u.hostname.includes(".")) return { ok: false, error: "That address is not a public website." };
  return { ok: true, url: u };
}

type Endpoint = { id: string; url: string; secret: string; events: string[]; active: boolean };
type Delivery = { id: string; endpoint_id: string; event: string; payload: unknown; attempts: number };

/** POST one delivery. Returns what happened; the caller records it. */
export async function send(ep: Pick<Endpoint, "url" | "secret">, d: { id: string; event: string; payload: unknown }, fetchImpl: typeof fetch = fetch): Promise<{ ok: boolean; status: number; error: string }> {
  const checked = checkWebhookUrl(ep.url);
  if (!checked.ok) return { ok: false, status: 0, error: checked.error };
  try {
    if (fetchImpl === fetch) { const a = await lookup(checked.url.hostname, { all: true }); if (a.some((x) => privateIp(x.address))) return { ok: false, status: 0, error: "That address points inside a private network." }; }
    const body = JSON.stringify({ id: d.id, event: d.event, created_at: new Date().toISOString(), data: d.payload });
    const res = await fetchImpl(checked.url, { method: "POST", redirect: "manual", headers: { "Content-Type": "application/json", "User-Agent": "SparkMerchant-Webhooks/1.0", "X-Spark-Event": d.event, "X-Spark-Delivery": d.id, "X-Spark-Signature": sign(ep.secret, body) }, body, signal: AbortSignal.timeout(8000) });
    return res.status >= 200 && res.status < 300 ? { ok: true, status: res.status, error: "" } : { ok: false, status: res.status, error: `Your server answered ${res.status}` };
  } catch (e) { return { ok: false, status: 0, error: e instanceof Error ? e.message.slice(0, 200) : "Could not connect" }; }
}

async function attempt(db: Db, ep: Endpoint, d: Delivery, fetchImpl?: typeof fetch, now = Date.now()) {
  const r = await send(ep, d, fetchImpl);
  const attempts = d.attempts + 1;
  await db.from("webhook_deliveries").update(r.ok
    ? { status: "ok", attempts, last_status: r.status, last_error: "" }
    : attempts >= MAX_ATTEMPTS ? { status: "failed", attempts, last_status: r.status || null, last_error: r.error }
    : { attempts, last_status: r.status || null, last_error: r.error, next_attempt_at: new Date(now + BACKOFF_MIN[attempts - 1] * 60_000).toISOString() }).eq("id", d.id);
  return r;
}

/**
 * Tell every interested endpoint about something that happened. The delivery is recorded first (so it can never be lost) and tried
 * straight away; if the receiver is down it is retried by the scheduled job. Never throws: webhooks must not break an order.
 */
export async function emitEvent(db: Db, event: WebhookEvent, payload: unknown, fetchImpl?: typeof fetch): Promise<void> {
  try {
    const { data } = await db.from("webhook_endpoints").select("*").eq("active", true);
    for (const ep of ((data ?? []) as Endpoint[]).filter((e) => !e.events.length || e.events.includes(event))) {
      const { data: row, error } = await db.from("webhook_deliveries").insert({ endpoint_id: ep.id, event, payload, status: "pending", attempts: 0, next_attempt_at: new Date().toISOString() }).select("*").single();
      if (error || !row) { await log.warn("webhook.record_failed", error?.message ?? "no row", { event }); continue; }
      await attempt(db, ep, row as Delivery, fetchImpl);
    }
  } catch (e) { await log.warn("webhook.emit_failed", e instanceof Error ? e.message : "error", { event }); }
}

/** Retry deliveries that are due. Called by the scheduled job. */
export async function runDeliveries(db: Db, o: { now?: number; fetchImpl?: typeof fetch; limit?: number } = {}): Promise<{ retried: number; ok: number }> {
  const now = o.now ?? Date.now();
  const { data } = await db.from("webhook_deliveries").select("*").eq("status", "pending").lte("next_attempt_at", new Date(now).toISOString()).limit(o.limit ?? 50);
  const due = (data ?? []) as Delivery[];
  const { data: eps } = await db.from("webhook_endpoints").select("*");
  const byId = new Map(((eps ?? []) as Endpoint[]).map((e) => [e.id, e]));
  let ok = 0;
  for (const d of due) {
    const ep = byId.get(d.endpoint_id);
    if (!ep || !ep.active) { await db.from("webhook_deliveries").update({ status: "failed", last_error: "Endpoint removed or switched off" }).eq("id", d.id); continue; }
    if ((await attempt(db, ep, d, o.fetchImpl, now)).ok) ok++;
  }
  return { retried: due.length, ok };
}
