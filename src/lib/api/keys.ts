import { createHash, randomBytes } from "node:crypto";
import type { Db } from "@/lib/db/clients";

export type Scope = "read" | "write";
export type ApiKeyRow = { id: string; name: string; prefix: string; scopes: Scope[]; created_by: string; created_at: string; last_used_at: string | null; revoked_at: string | null };

export const hashKey = (key: string) => createHash("sha256").update(key).digest("hex");
export const newKey = () => `spk_${randomBytes(30).toString("base64url")}`;

/** Make a key. The key itself is returned once; only its hash is kept. */
export async function createApiKey(db: Db, o: { name: string; scopes: Scope[]; by: string }): Promise<{ ok: true; key: string; row: ApiKeyRow } | { ok: false; error: string }> {
  const key = newKey();
  const { data, error } = await db.from("api_keys").insert({ name: o.name.trim().slice(0, 60) || "API key", key_hash: hashKey(key), prefix: key.slice(0, 10), scopes: o.scopes, created_by: o.by }).select("*").single();
  if (error) return { ok: false, error: `${error.message}. Run the latest supabase/admin.sql.` };
  return { ok: true, key, row: data as ApiKeyRow };
}

export type AuthResult = { ok: true; key: ApiKeyRow } | { ok: false; status: 401 | 403; error: string };

/** Check `Authorization: Bearer <key>` against this store's keys (the db client is already limited to the store the request is for). */
export async function authenticate(db: Db, header: string | null, need: Scope): Promise<AuthResult> {
  const key = (header ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!key.startsWith("spk_")) return { ok: false, status: 401, error: "Send your API key as: Authorization: Bearer <key>" };
  const { data } = await db.from("api_keys").select("*").eq("key_hash", hashKey(key)).maybeSingle();
  const row = data as ApiKeyRow | null;
  if (!row || row.revoked_at) return { ok: false, status: 401, error: "That API key is not valid." };
  if (!row.scopes.includes(need)) return { ok: false, status: 403, error: `This key does not have the "${need}" permission.` };
  if (!row.last_used_at || Date.now() - Date.parse(row.last_used_at) > 60_000) await db.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", row.id);
  return { ok: true, key: row };
}
