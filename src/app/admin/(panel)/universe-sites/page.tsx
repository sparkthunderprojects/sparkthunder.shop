import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { getFranchises } from "@/lib/catalog";
import { EmbedBuilder } from "./EmbedBuilder";

export const metadata = { title: "Universe sites" };

export default async function UniverseSitesAdmin() {
  await requireAdmin("catalogue");
  const franchises = await getFranchises();
  return (
    <>
      <div className="adm-h"><div><h1>Universe sites</h1><p>Show your latest products on each universe website. Every click opens the shop in a new tab, tagged so you can see which site sent the shopper.</p></div></div>
      <div className="adm-card">
        <h3>Linked websites</h3>
        <table className="adm-table"><thead><tr><th>Universe</th><th>Website</th><th /></tr></thead><tbody>
          {franchises.map((f) => (
            <tr key={f.slug}><td>{f.name}</td><td>{f.siteUrl ? <a href={f.siteUrl} target="_blank" rel="noopener">{f.siteUrl}</a> : <em>Not set</em>}</td><td><Link href={`/admin/franchises/${f.slug}`}>{f.siteUrl ? "Edit" : "Add website"}</Link></td></tr>
          ))}
        </tbody></table>
      </div>
      <EmbedBuilder franchises={franchises.map((f) => ({ slug: f.slug, name: f.name }))} />
    </>
  );
}
