import { unstable_cache } from "next/cache";
import { cookies, headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { createFakeClient } from "@/lib/db/fake";
import { SUPABASE_ANON_KEY, SUPABASE_URL, hasSupabase, isDemo } from "@/lib/db/env";

/** The store used when no host matches (local dev, preview URLs) and for data created before multi-store existed. */
export const DEFAULT_STORE_ID = "sparkthunder";
export const ADMIN_STORE_COOKIE = "spark-admin-store";

export type StoreRow = { id: string; name: string; domains: string[]; is_default: boolean };

const FALLBACK: StoreRow[] = [{ id: DEFAULT_STORE_ID, name: "Sparkthunder Shop", domains: [], is_default: true }];

/** Every store on the platform. Public by design: it only holds names and domains. Cached for a minute. */
export const listStores = unstable_cache(
  async (): Promise<StoreRow[]> => {
    const db = isDemo ? (createFakeClient() as never as ReturnType<typeof createClient>) : hasSupabase ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } }) : null;
    if (!db) return FALLBACK;
    const { data, error } = await db.from("stores").select("id,name,domains,is_default").order("created_at");
    if (error || !data?.length) return FALLBACK;
    return data as StoreRow[];
  },
  ["stores-v1"],
  { tags: ["stores"], revalidate: 60 },
);

const bareHost = (h: string) => h.toLowerCase().replace(/:\d+$/, "").replace(/^www\./, "");

export function storeForHost(stores: StoreRow[], host: string | null | undefined): StoreRow {
  const h = bareHost(host ?? "");
  return stores.find((s) => s.domains.some((d) => bareHost(d) === h)) ?? stores.find((s) => s.is_default) ?? stores[0] ?? FALLBACK[0];
}

/**
 * The store this request is for: the admin's chosen store inside /admin, otherwise whichever store owns the host.
 * Outside a request (build time) it is the default store.
 */
export async function currentStoreId(): Promise<string> {
  try {
    const h = await headers();
    const stores = await listStores();
    if (h.get("x-spark-admin") === "1") {
      const chosen = (await cookies()).get(ADMIN_STORE_COOKIE)?.value;
      if (chosen && stores.some((s) => s.id === chosen)) return chosen;
    }
    return storeForHost(stores, h.get("x-forwarded-host") ?? h.get("host")).id;
  } catch {
    return DEFAULT_STORE_ID;
  }
}

/** The public origin of a store, from its first real domain (used in sitemaps, canonicals and emails). */
export function storeOrigin(store: StoreRow, fallback: string): string {
  const d = store.domains.find((x) => !/localhost|\.test$|127\.0\.0\.1/.test(x));
  return d ? `https://${d.replace(/^www\./, "")}` : fallback;
}
