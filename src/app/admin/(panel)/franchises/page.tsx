import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { listFranchises, listProducts } from "@/lib/admin/repo";

export const metadata = { title: "Franchises" };

export default async function List() {
  const { db } = await requireAdmin();
  const [items, products] = await Promise.all([listFranchises(db), listProducts(db)]);
  return (
    <>
      <div className="adm-h"><div><h1>Franchises</h1><p>{items.length} total</p></div><Link className="adm-btn adm-bolt" href="/admin/franchises/new">Add new</Link></div>
      <div className="adm-card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="adm-table"><thead><tr><th>Name</th><th>URL</th><th>Products</th><th>Order</th></tr></thead><tbody>
          {items.map((i) => (
            <tr key={i.slug}><td><Link href={`/admin/franchises/${i.slug}`}><b>{i.name}</b></Link></td><td>/franchises/{i.slug}</td><td>{products.filter((p) => p.franchiseSlug === i.slug).length}</td><td>{i.sortOrder}</td></tr>
          ))}
        </tbody></table>
      </div>
    </>
  );
}
