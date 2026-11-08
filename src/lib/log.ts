import { serviceClient } from "@/lib/db/clients";
import { currentStoreId } from "@/lib/db/stores";

type Level = "info" | "warn" | "error";
const SECRET = /key|secret|token|password|authorization|cookie|card|iban/i;

/** Remove anything that looks like a secret and shorten long values, so logs are safe to share. */
export function scrub(v: unknown, depth = 0): unknown {
  if (v instanceof Error) return { name: v.name, message: v.message.slice(0, 300) };
  if (typeof v === "string") return v.length > 300 ? `${v.slice(0, 300)}…` : v;
  if (Array.isArray(v)) return depth > 3 ? "[…]" : v.slice(0, 20).map((x) => scrub(x, depth + 1));
  if (v && typeof v === "object") {
    if (depth > 3) return "[…]";
    return Object.fromEntries(Object.entries(v as Record<string, unknown>).slice(0, 30).map(([k, x]) => [k, SECRET.test(k) ? "[hidden]" : scrub(x, depth + 1)]));
  }
  return v;
}

/**
 * One structured JSON line per event (your host's log viewer can search and filter these), always carrying the store id.
 * Warnings and errors are also saved to `system_events` so the admin health page can show them. Never throws.
 */
async function write(level: Level, event: string, message: string, ctx: Record<string, unknown> = {}, o: { storeId?: string; record?: boolean } = {}) {
  let store = o.storeId ?? "";
  if (!store) { try { store = await currentStoreId(); } catch { store = "unknown"; } }
  const safe = scrub(ctx) as Record<string, unknown>;
  const line = JSON.stringify({ t: new Date().toISOString(), level, event, store, msg: message.slice(0, 500), ...safe });
  (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(line);
  if (level === "info" || o.record === false) return;
  try {
    const db = serviceClient(store);
    if (db) await db.from("system_events").insert({ store_id: store, level, event, message: message.slice(0, 500), ctx: safe });
  } catch { /* the console line above is the fallback */ }
}

export const log = {
  info: (event: string, message: string, ctx?: Record<string, unknown>, o?: { storeId?: string }) => write("info", event, message, ctx, o),
  warn: (event: string, message: string, ctx?: Record<string, unknown>, o?: { storeId?: string; record?: boolean }) => write("warn", event, message, ctx, o),
  error: (event: string, message: string, ctx?: Record<string, unknown>, o?: { storeId?: string; record?: boolean }) => write("error", event, message, ctx, o),
};
