import { requireAdmin } from "@/lib/admin/auth";
import { serviceClient } from "@/lib/db/clients";
import { POINTS_PER_POUND, REVIEW_BONUS, REDEEM_OPTIONS, type LedgerRow } from "@/lib/rewards";
import { formatPrice } from "@/lib/site";
import { AdjustPoints } from "./AdjustPoints";

export const metadata = { title: "Spark points" };

export default async function RewardsAdmin() {
  const { db } = await requireAdmin();
  const { data } = await (serviceClient() ?? db).from("reward_points").select("*").order("created_at", { ascending: false });
  const rows = (data ?? []) as LedgerRow[];
  const by = new Map<string, { email: string; balance: number; earned: number; last: string }>();
  for (const r of rows) {
    const x = by.get(r.email) ?? { email: r.email, balance: 0, earned: 0, last: r.created_at };
    x.balance += r.points; if (r.points > 0) x.earned += r.points; by.set(r.email, x);
  }
  const people = [...by.values()].sort((a, b) => b.balance - a.balance);
  const outstanding = people.reduce((n, p) => n + Math.max(0, p.balance), 0);
  return (
    <>
      <div className="adm-h"><div><h1>Spark points</h1><p>Fans earn {POINTS_PER_POUND} point per £1 on products and {REVIEW_BONUS} per approved review, and trade points for single-use codes ({REDEEM_OPTIONS.map((o) => `${o.points} = ${formatPrice(o.pence)}`).join(", ")}). Points follow the email on the order, so they appear in a fan's Sparkthunder ID account.</p></div></div>
      <div className="adm-grid adm-g3" style={{ marginBottom: 18 }}>
        {[[String(people.length), "Fans with points"], [String(outstanding), "Points outstanding"], [String(rows.filter((r) => r.reason === "redeem").length), "Rewards redeemed"]].map(([v, l]) => <div key={l} className="adm-card" style={{ margin: 0 }}><div className="adm-stat">{v}</div><div className="adm-stat-l">{l}</div></div>)}
      </div>
      <AdjustPoints />
      <section className="adm-card" style={{ padding: 0, overflowX: "auto" }}>
        {people.length === 0 ? <p style={{ padding: 18 }} className="adm-hint">No points yet. They are added when an order is paid.</p> : (
          <table className="adm-table"><thead><tr><th>Fan</th><th>Balance</th><th>Earned in total</th></tr></thead><tbody>
            {people.map((p) => <tr key={p.email}><td>{p.email}</td><td><b>{p.balance}</b></td><td>{p.earned}</td></tr>)}
          </tbody></table>
        )}
      </section>
    </>
  );
}
