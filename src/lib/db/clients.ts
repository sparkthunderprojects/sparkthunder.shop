import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createFakeClient } from "@/lib/db/fake";
import { SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY, SUPABASE_URL, hasSupabase, isDemo } from "@/lib/db/env";

export type Db = SupabaseClient;

/** Read-only storefront client (anon key). Null when the site runs on the built-in catalogue. */
export function publicClient(): Db | null {
  if (isDemo) return createFakeClient() as unknown as Db;
  if (!hasSupabase) return null;
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
}

/** Admin client bound to the signed-in user's session cookies, so row-level security applies. */
export async function sessionClient(): Promise<Db | null> {
  if (isDemo) return createFakeClient() as unknown as Db;
  if (!hasSupabase) return null;
  const jar = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (list) => { try { list.forEach(({ name, value, options }) => jar.set(name, value, options)); } catch { /* called from a Server Component */ } },
    },
  }) as unknown as Db;
}

/**
 * Privileged client for server-only work with no signed-in admin: starting a checkout and the Stripe webhook.
 * Bypasses row-level security, so it must never be imported by client components or exposed to the browser.
 */
export function serviceClient(): Db | null {
  if (isDemo) return createFakeClient() as unknown as Db;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
}
