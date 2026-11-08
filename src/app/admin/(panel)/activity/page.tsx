import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import type { ActivityRow } from "@/lib/admin/activity";

export const metadata = { title: "Activity log" };
const GROUPS = [["", "Everything"], ["product", "Products"], ["order", "Orders and refunds"], ["giftcard", "Gift cards"], ["discount", "Discounts"], ["login", "Sign-ins"], ["store", "Store settings"], ["staff", "Staff"], ["secrets", "Keys"]] as const;

export default async function ActivityPage({ searchParams }: PageProps<"/admin/activity">) {
  const { db } = await requireAdmin();
  const q = await searchParams;
  const group = typeof q.g === "string" ? q.g : "";
  let query = db.from("audit_log").select("*").order("created_at", { ascending: false }).limit(300);
  if (group) query = query.ilike("action", `${group.replace(/[^a-z]/g, "")}%`);
  const { data, error } = await query;
  const rows = (data ?? []) as ActivityRow[];
  return (
    <>
      <div className="adm-h"><div><h1>Activity log</h1><p>Who changed what in this store&apos;s admin. This record can only be added to, never edited or deleted. Showing the latest 300.</p></div></div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {GROUPS.map(([g, label]) => <Link key={g} href={g ? `/admin/activity?g=${g}` : "/admin/activity"} className={`adm-btn ${group === g ? "adm-pri" : ""}`}>{label}</Link>)}
      </div>
      {error ? <section className="adm-card"><p className="adm-hint">The activity log is not set up yet. Run the latest supabase/admin.sql in Supabase.</p></section> : (
        <div className="adm-card" style={{ padding: 0, overflowX: "auto" }}>
          <table className="adm-table"><thead><tr><th>When</th><th>Who</th><th>What</th><th>Type</th></tr></thead><tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={{ whiteSpace: "nowrap" }}>{new Date(r.created_at).toLocaleString("en-GB")}</td>
                <td>{r.actor}</td>
                <td>{r.summary}{r.target_type === "order" && r.target_id ? <> · <Link href={`/admin/orders/${r.target_id}`}>open order</Link></> : null}</td>
                <td><span className="adm-hint">{r.action}</span></td>
              </tr>
            ))}
            {rows.length === 0 ? <tr><td colSpan={4} className="adm-hint">Nothing recorded yet.</td></tr> : null}
          </tbody></table>
        </div>
      )}
    </>
  );
}
