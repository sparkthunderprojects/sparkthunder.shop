import { listCategories, listFranchises, listProducts } from "@/lib/admin/repo";
import type { Db } from "@/lib/db/clients";
import { categorySeo, franchiseSeo, productSeo } from "@/lib/seo/effective";
import { buildDupes, categoryInput, franchiseInput, productInput, scoreSeo, type Check } from "@/lib/seo/score";

export type AuditRow = { kind: "product" | "franchise" | "category"; slug: string; name: string; href: string; score: number; grade: string; noindex: boolean; issues: Check[] };

export async function runAudit(db: Db) {
  const [products, franchises, categories] = await Promise.all([listProducts(db), listFranchises(db), listCategories(db)]);
  const fmap = new Map(franchises.map((f) => [f.slug, f]));
  const dupes = buildDupes([
    ...products.map((p) => productSeo(p, fmap.get(p.franchiseSlug))),
    ...franchises.map(franchiseSeo),
    ...categories.map(categorySeo),
  ]);
  const rows: AuditRow[] = [];
  const push = (kind: AuditRow["kind"], slug: string, name: string, href: string, r: ReturnType<typeof scoreSeo>, noindex: boolean) =>
    rows.push({ kind, slug, name, href, score: r.score, grade: r.grade, noindex, issues: r.checks.filter((c) => c.status !== "pass") });
  for (const p of products) { const i = productInput(p, fmap.get(p.franchiseSlug), dupes); push("product", p.slug, p.name, `/admin/products/${p.slug}`, scoreSeo(i), i.noindex); }
  for (const f of franchises) { const i = franchiseInput(f, dupes); push("franchise", f.slug, f.name, `/admin/franchises/${f.slug}`, scoreSeo(i), i.noindex); }
  for (const c of categories) { const i = categoryInput(c, dupes); push("category", c.slug, c.name, `/admin/categories/${c.slug}`, scoreSeo(i), i.noindex); }
  const indexable = rows.filter((r) => !r.noindex);
  const average = indexable.length ? Math.round(indexable.reduce((n, r) => n + r.score, 0) / indexable.length) : 0;
  const byIssue = new Map<string, { label: string; count: number; status: Check["status"] }>();
  for (const r of indexable) for (const c of r.issues) {
    const e = byIssue.get(c.id) ?? { label: c.label, count: 0, status: c.status };
    e.count++; if (c.status === "fail") e.status = "fail"; byIssue.set(c.id, e);
  }
  return { rows, average, products, franchises, categories, issues: [...byIssue.values()].sort((a, b) => b.count - a.count) };
}
