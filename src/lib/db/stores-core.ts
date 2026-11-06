export const DEFAULT_STORE_ID = "sparkthunder";
export type StoreRow = { id: string; name: string; domains: string[]; is_default: boolean };
export const FALLBACK: StoreRow[] = [{ id: DEFAULT_STORE_ID, name: "Sparkthunder Shop", domains: [], is_default: true }];

const bareHost = (h: string) => h.toLowerCase().replace(/:\d+$/, "").replace(/^www\./, "");

/** Local development and preview hosts, which may show the default store. Add your platform's own hostnames with PLATFORM_HOSTS (comma separated). */
export function isPlatformHost(host: string): boolean {
  const h = bareHost(host);
  const extra = (process.env.PLATFORM_HOSTS ?? "").split(",").map((x) => bareHost(x.trim())).filter(Boolean);
  return /^(localhost|127\.0\.0\.1|\[::1\])$|\.localhost$|\.test$|\.vercel\.app$|\.netlify\.app$/.test(h) || extra.includes(h);
}

/** Does this host belong to a store (or is it a platform/preview host)? Anything else must not be served, or an unrelated domain pointed at the platform would show a copy of a store. */
export function isKnownHost(stores: StoreRow[], host: string | null | undefined): boolean {
  const h = bareHost(host ?? "");
  return stores.some((s) => s.domains.some((d) => bareHost(d) === h)) || isPlatformHost(h);
}

export function storeForHost(stores: StoreRow[], host: string | null | undefined): StoreRow {
  const h = bareHost(host ?? "");
  return stores.find((s) => s.domains.some((d) => bareHost(d) === h)) ?? stores.find((s) => s.is_default) ?? stores[0] ?? FALLBACK[0];
}

