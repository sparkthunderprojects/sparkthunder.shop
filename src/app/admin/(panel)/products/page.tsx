import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { runAudit } from "@/lib/admin/audit";
import { ProductTable, type Row } from "./ProductTable";

export const metadata = { title: "Products" };

export default async function ProductsPage() {
  const { db } = await requireAdmin("catalogue");
  const audit = await runAudit(db);
  const score = new Map(audit.rows.filter((r) => r.kind === "product").map((r) => [r.slug, r.score]));
  const fr = new Map(audit.franchises.map((f) => [f.slug, f.name]));
  const cat = new Map(audit.categories.map((c) => [c.slug, c.name]));
  const rows: Row[] = audit.products.map((p) => ({
    slug: p.slug, name: p.name, sku: p.sku, image: p.images[0] ?? "", franchise: fr.get(p.franchiseSlug) ?? p.franchiseSlug, category: cat.get(p.categorySlug) ?? p.categorySlug,
    pricePence: p.pricePence, stock: p.trackStock ? (p.stockQty ?? 0) : null, inStock: p.inStock, published: p.published !== false, featured: p.isFeatured, isNew: p.isNew, seo: score.get(p.slug) ?? 0, createdAt: p.createdAt,
  }));
  return (
    <>
      <div className="adm-h"><div><h1>Products</h1><p>{rows.length} products</p></div><div style={{ display: "flex", gap: 8 }}><a className="adm-btn" href="/admin/export/products" download>Download CSV</a><Link className="adm-btn" href="/admin/products/import">Import / bulk edit</Link><Link className="adm-btn adm-bolt" href="/admin/products/new">Add product</Link></div></div>
      <ProductTable rows={rows} franchises={audit.franchises.map((f) => f.name)} />
    </>
  );
}
