import { createHash } from "node:crypto";
import { serviceClient, type Db } from "@/lib/db/clients";
import { dbSetupProblem } from "@/lib/db/env";
import { currentStoreId } from "@/lib/db/stores";
import { rateLimit } from "@/lib/ratelimit";
import { authenticate, type ApiKeyRow, type Scope } from "@/lib/api/keys";

export const API_LIMIT = { limit: 120, windowSec: 60 } as const;
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) => Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
export const fail = (status: number, error: string, headers?: Record<string, string>) => json({ error }, status, headers);

export const clampLimit = (v: string | null, def = 25, max = 100) => { const n = Number(v); return Number.isFinite(n) && n >= 1 ? Math.min(Math.floor(n), max) : def; };

type Ctx = { db: Db; key: ApiKeyRow; req: Request };
/**
 * Wraps an endpoint: finds the store from the host, checks the key and its permission, applies a per-key rate limit
 * (120 a minute) and turns any failure into a JSON error. The database client only ever sees this store's rows.
 */
export function endpoint<P = object>(need: Scope, fn: (c: Ctx, params: P) => Promise<Response>) {
  return async (req: Request, { params }: { params: Promise<P> }): Promise<Response> => {
    try {
      const db = serviceClient(await currentStoreId());
      if (!db) return fail(503, dbSetupProblem());
      const auth = await authenticate(db, req.headers.get("authorization"), need);
      if (!auth.ok) return fail(auth.status, auth.error, auth.status === 401 ? { "WWW-Authenticate": 'Bearer realm="Spark Merchant API"' } : undefined);
      const rl = await rateLimit("api", API_LIMIT, createHash("sha256").update(String(auth.key.id)).digest("hex"));
      if (!rl.ok) return fail(429, "Too many requests. Slow down and try again.", { "Retry-After": String(rl.retryAfter) });
      return await fn({ db, key: auth.key, req }, await params);
    } catch { return fail(500, "Something went wrong on our side."); }
  };
}
