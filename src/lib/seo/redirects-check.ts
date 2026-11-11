export type RedirectLike = { id: number; from_path: string; to_path: string; status: number };
export type RedirectIssue = { id: number; kind: "chain" | "loop" | "dead" | "shadows" | "duplicate"; from: string; to: string; message: string; fixTo?: string };

const norm = (p: string) => { const x = p.split("#")[0].split("?")[0]; return x.length > 1 ? x.replace(/\/$/, "") : x; };
const isExternal = (p: string) => /^https?:\/\//i.test(p);
const DYNAMIC = ["/products/", "/franchises/", "/categories/", "/collections/"];

/**
 * Look over a store's redirects for the problems that cost search ranking:
 * chains (A to B to C: Google may stop following), loops, redirects that hide a page that exists, redirects that lead to a page that no longer exists, and repeats.
 * `live` is the set of product, franchise, category and collection paths that currently exist.
 */
export function checkRedirects(rows: RedirectLike[], live: Set<string>): RedirectIssue[] {
  const issues: RedirectIssue[] = [];
  const map = new Map<string, RedirectLike>();
  const seen = new Set<string>();
  for (const r of rows) {
    const f = norm(r.from_path);
    if (seen.has(f)) issues.push({ id: r.id, kind: "duplicate", from: r.from_path, to: r.to_path, message: `There is more than one redirect from ${f}. Only one is used.` });
    seen.add(f); if (!map.has(f)) map.set(f, r);
  }
  for (const r of rows) {
    const f = norm(r.from_path), t = norm(r.to_path);
    if (live.has(f)) issues.push({ id: r.id, kind: "shadows", from: r.from_path, to: r.to_path, message: `${f} is a live page, but this redirect sends visitors away from it. Remove the redirect if the page should show.` });
    if (isExternal(r.to_path)) continue;
    // follow the chain
    const path = [f]; let cur = t, loop = false;
    while (map.has(cur) && !isExternal(map.get(cur)!.to_path)) {
      if (path.includes(cur)) { loop = true; break; }
      path.push(cur); cur = norm(map.get(cur)!.to_path);
      if (path.length > 20) { loop = true; break; }
    }
    if (loop || cur === f) { issues.push({ id: r.id, kind: "loop", from: r.from_path, to: r.to_path, message: "This redirect goes round in a circle, so the page never loads." }); continue; }
    if (path.length > 1 || (map.has(t) && isExternal(map.get(t)!.to_path))) {
      const final = map.has(cur) ? map.get(cur)!.to_path : cur;
      issues.push({ id: r.id, kind: "chain", from: r.from_path, to: r.to_path, message: `Goes through ${path.length} hops before reaching ${final}. Send it straight there.`, fixTo: final });
      continue;
    }
    if (DYNAMIC.some((d) => t.startsWith(d)) && !live.has(t)) issues.push({ id: r.id, kind: "dead", from: r.from_path, to: r.to_path, message: `${t} does not exist, so visitors land on a not-found page.` });
  }
  return issues;
}
