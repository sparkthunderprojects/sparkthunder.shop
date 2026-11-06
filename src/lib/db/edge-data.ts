import { createClient } from "@supabase/supabase-js";
import { createFakeClient } from "@/lib/db/fake";
import { SUPABASE_ANON_KEY, SUPABASE_URL, hasSupabase, isDemo } from "@/lib/db/env";
import { isKnownHost, storeForHost, type StoreRow } from "@/lib/db/stores-core";

/** Data for the request proxy, read straight from the database with small in-memory caches (no self-requests, no framework cache). */
type Rule = { from_path: string; to_path: string; status: number };

function client() {
  if (isDemo) return createFakeClient() as never as ReturnType<typeof createClient>;
  return hasSupabase ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } }) : null;
}

let storesMemo: { at: number; v: StoreRow[] } | null = null;
const rulesMemo = new Map<string, { at: number; v: Map<string, Rule> }>();

async function stores(): Promise<StoreRow[]> {
  if (storesMemo && Date.now() - storesMemo.at < 30_000) return storesMemo.v;
  const db = client();
  let v = storesMemo?.v ?? [];
  if (db) {
    const { data, error } = await db.from("stores").select("id,name,domains,is_default").order("created_at");
    if (!error && data?.length) v = data as StoreRow[];
  }
  storesMemo = { at: Date.now(), v };
  return v;
}

/** Is this host served, and what are its redirects? Failing open only when the database cannot be reached at all. */
export async function hostInfo(host: string): Promise<{ known: boolean; storeId: string; rules: Map<string, Rule> }> {
  const list = await stores();
  if (!list.length) return { known: true, storeId: "sparkthunder", rules: new Map() }; // no stores table yet: single-store mode
  const known = isKnownHost(list, host);
  const store = storeForHost(list, host);
  if (!known) return { known, storeId: store.id, rules: new Map() };
  const hit = rulesMemo.get(store.id);
  if (hit && Date.now() - hit.at < 10_000) return { known, storeId: store.id, rules: hit.v };
  const db = client();
  let rules = hit?.v ?? new Map<string, Rule>();
  if (db) {
    const { data, error } = await db.from("redirects").select("from_path,to_path,status").eq("store_id", store.id);
    if (!error) rules = new Map(((data ?? []) as Rule[]).map((r) => [r.from_path, r]));
  }
  if (rulesMemo.size > 500) rulesMemo.clear();
  rulesMemo.set(store.id, { at: Date.now(), v: rules });
  return { known, storeId: store.id, rules };
}
