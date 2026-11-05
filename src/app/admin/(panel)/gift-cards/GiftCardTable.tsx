"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { formatPrice } from "@/lib/site";

export type GRow = { id: string; code: string; recipient: string; email: string; initial: number; balance: number; status: string; source: string; created: string; expires: string | null };
const BADGE: Record<string, string> = { active: "adm-ok", used: "", expired: "adm-warn", disabled: "adm-bad" };

export function GiftCardTable({ rows }: { rows: GRow[] }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase().replace(/\s/g, "");
    return rows.filter((r) => (!status || r.status === status) && (!s || r.code.toLowerCase().replace(/-/g, "").includes(s.replace(/-/g, "")) || r.recipient.toLowerCase().includes(s) || r.email.includes(s)));
  }, [rows, q, status]);
  return (
    <>
      <div className="adm-card" style={{ padding: 14 }}>
        <div className="adm-grid adm-g2">
          <input className="adm-in" type="search" aria-label="Search gift cards" placeholder="Search by code, name or email" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="adm-sel" aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option><option value="active">Active</option><option value="used">Fully used</option><option value="expired">Expired</option><option value="disabled">Disabled</option></select>
        </div>
      </div>
      <div className="adm-card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="adm-table"><thead><tr><th>Code</th><th>Recipient</th><th>Value</th><th>Balance</th><th>Status</th><th>Source</th><th>Issued</th></tr></thead><tbody>
          {shown.map((r) => (
            <tr key={r.id}>
              <td><Link href={`/admin/gift-cards/${r.id}`}><code style={{ fontWeight: 700 }}>{r.code}</code></Link></td>
              <td>{r.recipient}</td><td>{formatPrice(r.initial)}</td><td><b>{formatPrice(r.balance)}</b></td>
              <td><span className={`adm-badge ${BADGE[r.status] ?? ""}`}>{r.status}</span></td><td>{r.source}</td><td>{new Date(r.created).toLocaleDateString("en-GB")}</td>
            </tr>
          ))}
          {shown.length === 0 ? <tr><td colSpan={7} className="adm-hint" style={{ padding: 24 }}>{rows.length === 0 ? "No gift cards yet. Issue the first one." : "No cards match."}</td></tr> : null}
        </tbody></table>
      </div>
    </>
  );
}
