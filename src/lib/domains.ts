/**
 * Domain connection helper: what to set up at the DNS provider, and checks that tell the owner whether it worked.
 * Pure logic with injected network calls so it can be tested without a network.
 */
export type CheckStatus = "ok" | "warn" | "fail" | "unknown";
export type Check = { id: "dns" | "target" | "https" | "store"; label: string; status: CheckStatus; detail: string };
export type Resolver = {
  cname: (host: string) => Promise<string[]>; a: (host: string) => Promise<string[]>; aaaa: (host: string) => Promise<string[]>;
  /** Fetches https://host/api/store-ping and returns the store id it reports. Throws with a code on TLS/connection errors. */
  ping: (host: string) => Promise<{ store: string }>;
};
export type Targets = { cname: string; ips: string[] };

const LABEL = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
/** A clean hostname from what someone typed ("https://www.Example.com/shop" becomes "www.example.com"), or null if it is not a usable domain. */
export function normaliseDomain(input: string): string | null {
  const h = input.trim().toLowerCase().replace(/^[a-z]+:\/\//, "").replace(/[/?#].*$/, "").replace(/:\d+$/, "").replace(/\.$/, "");
  if (!h || h.length > 253 || !h.includes(".")) return null;
  const labels = h.split(".");
  if (!labels.every((l) => LABEL.test(l)) || /^\d+$/.test(labels[labels.length - 1])) return null;
  if (/^(localhost|.*\.localhost|.*\.test|.*\.invalid)$/.test(h)) return null;
  return h;
}
export const isWww = (d: string) => d.startsWith("www.");
/** The other form of a domain: www.example.com for example.com and the reverse. */
export const counterpart = (d: string) => (isWww(d) ? d.slice(4) : `www.${d}`);
export const isApex = (d: string) => d.split(".").length === 2; // example.com (not co.uk-aware; the hint just says "at the root")

/** The records the owner should create. The platform's own target comes from settings (PLATFORM_DNS_TARGET / PLATFORM_DNS_IPS). */
export function dnsInstructions(domain: string, t: Targets): { type: string; host: string; value: string; note: string }[] {
  const out: { type: string; host: string; value: string; note: string }[] = [];
  if (isApex(domain) || !isWww(domain)) {
    if (isApex(domain)) for (const ip of t.ips) out.push({ type: "A", host: "@", value: ip, note: "The bare domain (no www)." });
    else if (t.cname) out.push({ type: "CNAME", host: domain.split(".")[0], value: t.cname, note: "A sub-domain." });
  }
  if (isWww(domain) && t.cname) out.push({ type: "CNAME", host: "www", value: t.cname, note: "The www version." });
  if (isApex(domain) && !t.ips.length && t.cname) out.push({ type: "CNAME / ALIAS", host: "@", value: t.cname, note: "If your DNS provider supports ALIAS or flattened CNAME at the root." });
  return out;
}

export function readTargets(env: Record<string, string | undefined> = process.env): Targets {
  return { cname: (env.PLATFORM_DNS_TARGET ?? "").trim().toLowerCase().replace(/\.$/, ""), ips: (env.PLATFORM_DNS_IPS ?? "").split(",").map((s) => s.trim()).filter(Boolean) };
}

const safe = async <T,>(f: () => Promise<T[]>): Promise<T[]> => { try { return await f(); } catch { return []; } };

/** Runs the checklist for one domain. Never throws. */
export async function checkDomain(domain: string, storeId: string, t: Targets, r: Resolver): Promise<Check[]> {
  const checks: Check[] = [];
  const [cname, a, aaaa] = await Promise.all([safe(() => r.cname(domain)), safe(() => r.a(domain)), safe(() => r.aaaa(domain))]);
  const resolves = cname.length + a.length + aaaa.length > 0;
  checks.push(resolves
    ? { id: "dns", label: "The domain has DNS records", status: "ok", detail: [...cname.map((c) => `CNAME ${c}`), ...a.map((x) => `A ${x}`), ...aaaa.map((x) => `AAAA ${x}`)].join(", ") }
    : { id: "dns", label: "The domain has DNS records", status: "fail", detail: "Nothing found yet. Add the records below at your DNS provider. Changes can take from a few minutes to a few hours." });

  if (!t.cname && !t.ips.length) checks.push({ id: "target", label: "Points at this platform", status: "unknown", detail: "The platform's address is not set (PLATFORM_DNS_TARGET or PLATFORM_DNS_IPS), so this can't be compared. The later checks still show whether it works." });
  else if (!resolves) checks.push({ id: "target", label: "Points at this platform", status: "fail", detail: "Waiting for DNS records." });
  else {
    const viaCname = !!t.cname && cname.some((c) => c.toLowerCase().replace(/\.$/, "") === t.cname);
    const viaIp = t.ips.some((ip) => a.includes(ip));
    checks.push(viaCname || viaIp
      ? { id: "target", label: "Points at this platform", status: "ok", detail: viaCname ? `CNAME goes to ${t.cname}` : "A record matches" }
      : { id: "target", label: "Points at this platform", status: "warn", detail: `It points somewhere else${t.cname ? ` (expected ${t.cname})` : ` (expected ${t.ips.join(" or ")})`}. If you use a proxy such as Cloudflare this can be normal; the next checks decide.` });
  }

  try {
    const res = await r.ping(domain);
    checks.push({ id: "https", label: "HTTPS works", status: "ok", detail: "The secure address answers with a valid certificate." });
    checks.push(res.store === storeId
      ? { id: "store", label: "Shows this store", status: "ok", detail: "The domain reaches this store." }
      : { id: "store", label: "Shows this store", status: "fail", detail: `The domain reaches the platform but belongs to "${res.store}", not this store.` });
  } catch (e) {
    const code = (e as { code?: string; cause?: { code?: string } })?.code ?? (e as { cause?: { code?: string } })?.cause?.code ?? "";
    const cert = /CERT|TLS|SSL|ALTNAME|SELF_SIGNED/i.test(code);
    checks.push({ id: "https", label: "HTTPS works", status: "fail", detail: cert ? "The domain answers but its security certificate is not valid yet. Add the domain in your host's dashboard so it issues a certificate (this can take a few minutes)." : resolves ? "The domain did not answer over HTTPS. Check that it is added in your host's dashboard (Bolt > Domains) and that the DNS has finished updating." : "Not reachable yet." });
    checks.push({ id: "store", label: "Shows this store", status: "unknown", detail: "Checked once HTTPS works." });
  }
  return checks;
}

/** Overall state for a list of checks. */
export const overall = (c: Check[]): "live" | "pending" | "problem" => (c.every((x) => x.status === "ok" || x.status === "unknown") && c.some((x) => x.id === "store" && x.status === "ok") ? "live" : c.some((x) => x.status === "fail" && x.id === "store") ? "problem" : "pending");
