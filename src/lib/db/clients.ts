import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createFakeClient } from "@/lib/db/fake";
import { scopeClient } from "@/lib/db/scope";
import { currentStoreId } from "@/lib/db/stores";
import { SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY, SUPABASE_URL, hasSupabase, isDemo } from "@/lib/db/env";

export type Db = SupabaseClient;

/** Read-only storefront client (anon key). Null when the site runs on the built-in catalogue. */
const scoped = (db: Db, storeId?: string) => scopeClient(db, storeId ?? currentStoreId);

/**
 * Every client below is limited to one store. Pass a store id when running outside a request or inside a cache
 * (where the host is not available); otherwise the store is found from the request's host.
 * Pass "*" for platform-wide work that must see every store.
 */
export function publicClient(storeId?: string): Db | null {
  if (isDemo) return scoped(createFakeClient() as unknown as Db, storeId);
  if (!hasSupabase) return null;
  return scoped(createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } }), storeId);
}

/** Admin client bound to the signed-in user's session cookies, so row-level security applies. */
export async function sessionClient(storeId?: string): Promise<Db | null> {
  if (isDemo) return scoped(createFakeClient() as unknown as Db, storeId);
  if (!hasSupabase) return null;
  const jar = await cookies();
  return scoped(createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (list) => { try { list.forEach(({ name, value, options }) => jar.set(name, value, options)); } catch { /* called from a Server Component */ } },
    },
  }) as unknown as Db, storeId);
}

/**
 * Privileged client for server-only work with no signed-in admin: starting a checkout and the Stripe webhook.
 * Bypasses row-level security, so it must never be imported by client components or exposed to the browser.
 */
export function serviceClient(storeId?: string): Db | null {
  if (isDemo) return scoped(createFakeClient() as unknown as Db, storeId);
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null;
  return scoped(createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } }), storeId);
}
