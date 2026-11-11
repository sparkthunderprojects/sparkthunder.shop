import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { getCommerce } from "@/lib/commerce";
import { currentStoreId } from "@/lib/db/stores";
import { getStoreSecrets } from "@/lib/secrets";
import { loadHealth, overall } from "@/lib/admin/health";

export const metadata = { title: "Health" };
const COLOUR = { red: "#c0392b", amber: "#b7791f", green: "#2f855a" } as const;
const WORD = { red: "Needs attention", amber: "Worth a look", green: "All clear" } as const;

export default async function HealthPage() {
  const { db } = await requireAdmin("settings");
  const [secrets, commerce] = await Promise.all([getStoreSecrets(await currentStoreId()), getCommerce()]);
  const { checks, events, setupSql } = await loadHealth(db, { stripe: Boolean(secrets.stripeSecret), webhook: Boolean(secrets.stripeWebhookSecret), email: Boolean(secrets.resendKey && secrets.emailFrom), supportEmail: Boolean(commerce.supportEmail) });
  const state = overall(checks);
  return (
    <>
      <div className="adm-h"><div><h1>Health</h1><p>Anything stuck, failing or running low in this store, checked every time you open this page.</p></div>
        <span className="adm-badge" style={{ background: COLOUR[state], color: "#fff" }}>{WORD[state]}</span></div>
      <div className="adm-card" style={{ padding: 0 }}>
        <table className="adm-table"><tbody>
          {checks.map((c) => (
            <tr key={c.id}>
              <td style={{ width: 14 }}><span aria-hidden style={{ display: "inline-block", width: 12, height: 12, borderRadius: 99, background: COLOUR[c.severity] }} /><span className="sr-only">{c.severity}</span></td>
              <td><b>{c.label}</b><div className="adm-hint">{c.detail}</div></td>
              <td align="right">{c.href && c.severity !== "green" ? <Link className="adm-btn" href={c.href}>Open</Link> : null}</td>
            </tr>
          ))}
        </tbody></table>
      </div>
      <section id="events" className="adm-card" style={{ marginTop: 18 }}>
        <h2>Recent problems (7 days)</h2>
        {!setupSql ? <p className="adm-hint">The problem record is not set up yet. Run the latest supabase/admin.sql in Supabase.</p>
          : events.length === 0 ? <p className="adm-hint">Nothing has gone wrong in the last 7 days.</p>
          : <table className="adm-table"><tbody>{events.slice(0, 40).map((e) => (
              <tr key={e.id}><td style={{ whiteSpace: "nowrap" }}>{new Date(e.created_at).toLocaleString("en-GB")}</td><td><span className={`adm-badge ${e.level === "error" ? "adm-bad" : "adm-warn"}`}>{e.level}</span></td><td>{e.message}<div className="adm-hint">{e.event}</div></td></tr>
            ))}</tbody></table>}
      </section>
    </>
  );
}
