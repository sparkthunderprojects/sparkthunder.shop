"use server";

import { promises as dns } from "node:dns";
import { revalidatePath, updateTag } from "next/cache";
import { logActivity as audit } from "@/lib/admin/activity";
import { requireOwnerAction } from "@/lib/admin/auth";
import { currentStoreId, listStores } from "@/lib/db/stores";
import { checkDomain, normaliseDomain, readTargets, type Check, type Resolver } from "@/lib/domains";

type Result = { ok: true } | { ok: false; error: string };
const fail = (e: unknown): Result => ({ ok: false, error: e instanceof Error ? e.message : "Something went wrong." });

async function save(domains: string[], what: string): Promise<Result> {
  const { db } = await requireOwnerAction();
  const id = await currentStoreId();
  const { error } = await db.from("stores").update({ domains }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  updateTag("stores"); revalidatePath("/admin", "layout");
  await audit("store.domains", what, { type: "store", id });
  return { ok: true };
}

export async function addDomainAction(input: string): Promise<Result> {
  try {
    await requireOwnerAction();
    const d = normaliseDomain(input);
    if (!d) return { ok: false, error: "Enter a domain like shop.example.com (no http:// and no path)." };
    const id = await currentStoreId(), stores = await listStores();
    const taken = stores.find((s) => s.id !== id && s.domains.includes(d));
    if (taken) return { ok: false, error: `${d} already belongs to ${taken.name}. A domain can only point at one store.` };
    const mine = stores.find((s) => s.id === id)?.domains ?? [];
    if (mine.includes(d)) return { ok: false, error: `${d} is already on this store.` };
    return await save([...mine, d], `Added domain ${d}`);
  } catch (e) { return fail(e); }
}

export async function removeDomainAction(domain: string): Promise<Result> {
  try {
    await requireOwnerAction();
    const id = await currentStoreId(), mine = (await listStores()).find((s) => s.id === id)?.domains ?? [];
    return await save(mine.filter((d) => d !== domain), `Removed domain ${domain}`);
  } catch (e) { return fail(e); }
}

/** The first domain is the store's main one (used for links, emails and the sitemap). */
export async function makePrimaryDomainAction(domain: string): Promise<Result> {
  try {
    await requireOwnerAction();
    const id = await currentStoreId(), mine = (await listStores()).find((s) => s.id === id)?.domains ?? [];
    if (!mine.includes(domain)) return { ok: false, error: "That domain is not on this store." };
    return await save([domain, ...mine.filter((d) => d !== domain)], `Made ${domain} the main domain`);
  } catch (e) { return fail(e); }
}

const resolver: Resolver = {
  cname: (h) => dns.resolveCname(h), a: (h) => dns.resolve4(h), aaaa: (h) => dns.resolve6(h),
  ping: async (h) => {
    const res = await fetch(`https://${h}/api/store-ping`, { cache: "no-store", signal: AbortSignal.timeout(8000), redirect: "follow" });
    if (!res.ok) throw Object.assign(new Error(`status ${res.status}`), { code: `HTTP_${res.status}` });
    const j = (await res.json()) as { store?: unknown };
    if (typeof j.store !== "string") throw Object.assign(new Error("not a platform response"), { code: "NOT_PLATFORM" });
    return { store: j.store };
  },
};

/** Runs the checklist for every domain on the current store. */
export async function checkDomainsAction(): Promise<{ ok: true; results: Record<string, Check[]> } | { ok: false; error: string }> {
  try {
    await requireOwnerAction();
    const id = await currentStoreId(), mine = (await listStores()).find((s) => s.id === id)?.domains ?? [];
    const t = readTargets();
    const entries = await Promise.all(mine.slice(0, 10).map(async (d) => [d, await checkDomain(d, id, t, resolver)] as const));
    return { ok: true, results: Object.fromEntries(entries) };
  } catch (e) { return fail(e) as { ok: false; error: string }; }
}
