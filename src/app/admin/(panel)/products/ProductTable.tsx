"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { bulkProductsAction } from "../../actions";
import { useAction } from "../../ui";
import { formatPrice } from "@/lib/site";

export type Row = { slug: string; name: string; sku: string; image: string; franchise: string; category: string; pricePence: number; stock: number | null; inStock: boolean; published: boolean; featured: boolean; isNew: boolean; seo: number; createdAt: string };
type Bulk = Parameters<typeof bulkProductsAction>[1];

export function ProductTable({ rows, franchises }: { rows: Row[]; franchises: string[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [fr, setFr] = useState("");
  const [status, setStatus] = useState<"" | "published" | "draft" | "low" | "seo">("");
  const [sort, setSort] = useState<"newest" | "name" | "price" | "seo">("newest");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const { pending, run, toast } = useAction();

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = rows.filter((r) =>
      (!s || r.name.toLowerCase().includes(s) || r.sku.toLowerCase().includes(s) || r.slug.includes(s)) &&
      (!fr || r.franchise === fr) &&
      (status === "" || (status === "published" ? r.published : status === "draft" ? !r.published : status === "low" ? r.stock !== null && r.stock <= 3 : r.seo < 75)));
    return list.sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : sort === "price" ? b.pricePence - a.pricePence : sort === "seo" ? a.seo - b.seo : b.createdAt.localeCompare(a.createdAt));
  }, [rows, q, fr, status, sort]);

  const allOn = shown.length > 0 && shown.every((r) => sel.has(r.slug));
  const toggle = (slug: string) => setSel((x) => { const n = new Set(x); if (n.has(slug)) n.delete(slug); else n.add(slug); return n; });
  const bulk = (a: Bulk, text: string) => run(() => bulkProductsAction([...sel], a), text, () => { setSel(new Set()); router.refresh(); });

  return (
    <>
      <div className="adm-card" style={{ padding: 14 }}>
        <div className="adm-grid adm-g4">
          <input className="adm-in" type="search" placeholder="Search name, SKU or URL" aria-label="Search products" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="adm-sel" aria-label="Franchise" value={fr} onChange={(e) => setFr(e.target.value)}><option value="">All franchises</option>{franchises.map((f) => <option key={f}>{f}</option>)}</select>
          <select className="adm-sel" aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            <option value="">All statuses</option><option value="published">Published</option><option value="draft">Drafts</option><option value="low">Low stock</option><option value="seo">SEO below 75</option>
          </select>
          <select className="adm-sel" aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}><option value="newest">Newest</option><option value="name">Name</option><option value="price">Price, high to low</option><option value="seo">SEO, lowest first</option></select>
        </div>
      </div>
      {sel.size > 0 ? (
        <div className="adm-card" style={{ padding: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <b>{sel.size} selected</b>
          <button className="adm-btn" disabled={pending} onClick={() => bulk("publish", "Published")}>Publish</button>
          <button className="adm-btn" disabled={pending} onClick={() => bulk("unpublish", "Moved to drafts")}>Unpublish</button>
          <button className="adm-btn" disabled={pending} onClick={() => bulk("feature", "Featured")}>Feature</button>
          <button className="adm-btn" disabled={pending} onClick={() => bulk("unfeature", "Unfeatured")}>Unfeature</button>
          <button className="adm-btn" disabled={pending} onClick={() => bulk("mark-new", "Marked new")}>Mark new</button>
          <button className="adm-btn" disabled={pending} onClick={() => bulk("in-stock", "Marked in stock")}>In stock</button>
          <button className="adm-btn" disabled={pending} onClick={() => bulk("out-of-stock", "Marked out of stock")}>Out of stock</button>
        </div>
      ) : null}
      {toast}
      <div className="adm-card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="adm-table">
          <thead><tr>
            <th style={{ width: 36 }}><input type="checkbox" aria-label="Select all" checked={allOn} onChange={() => setSel(allOn ? new Set() : new Set(shown.map((r) => r.slug)))} /></th>
            <th>Product</th><th>Franchise</th><th>Price</th><th>Stock</th><th>Status</th><th>SEO</th>
          </tr></thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.slug}>
                <td><input type="checkbox" aria-label={`Select ${r.name}`} checked={sel.has(r.slug)} onChange={() => toggle(r.slug)} /></td>
                <td><Link href={`/admin/products/${r.slug}`} style={{ display: "flex", gap: 10, alignItems: "center", textDecoration: "none" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {r.image ? <img className="adm-thumb" src={r.image} alt="" /> : <span className="adm-thumb" />}
                  <span><b>{r.name}</b><span className="adm-hint" style={{ display: "block", marginTop: 0 }}>{r.sku} · {r.category}</span></span></Link></td>
                <td>{r.franchise}</td>
                <td>{formatPrice(r.pricePence)}</td>
                <td>{r.stock === null ? <span className={`adm-badge ${r.inStock ? "adm-ok" : "adm-bad"}`}>{r.inStock ? "In stock" : "Out"}</span> : <span className={`adm-badge ${r.stock <= 3 ? "adm-bad" : "adm-ok"}`}>{r.stock}</span>}</td>
                <td><span className={`adm-badge ${r.published ? "adm-ok" : ""}`}>{r.published ? "Published" : "Draft"}</span>{r.featured ? " ⭐" : ""}{r.isNew ? " 🆕" : ""}</td>
                <td><span className={`adm-badge ${r.seo >= 75 ? "adm-ok" : r.seo >= 55 ? "adm-warn" : "adm-bad"}`}>{r.seo}</span></td>
              </tr>
            ))}
            {shown.length === 0 ? <tr><td colSpan={7} className="adm-hint" style={{ padding: 24 }}>No products match.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
