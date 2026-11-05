import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { listCategories, listProducts } from "@/lib/admin/repo";

export const metadata = { title: "Categories" };

export default async function List() {
  const { db } = await requireAdmin();
  const [items, products] = await Promise.all([listCategories(db), listProducts(db)]);
  return (
    <>
      <div className="adm-h"><div><h1>Categories</h1><p>{items.length} total</p></div><Link className="adm-btn adm-bolt" href="/admin/categories/new">Add new</Link></div>
      <div className="adm-card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="adm-table"><thead><tr><th>Name</th><th>URL</th><th>Products</th><th>Order</th></tr></thead><tbody>
          {items.map((i) => (
            <tr key={i.slug}><td><Link href={`/admin/categories/${i.slug}`}><b>{i.name}</b></Link></td><td>/categories/{i.slug}</td><td>{products.filter((p) => p.categorySlug === i.slug).length}</td><td>{i.sortOrder}</td></tr>
          ))}
        </tbody></table>
      </div>
    </>
  );
}
