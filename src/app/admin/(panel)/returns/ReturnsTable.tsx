"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { setReturnStatusAction } from "../../return-actions";
import { useAction } from "../../ui";
import { RETURN_LABEL, type ReturnRow } from "@/lib/returns";

export function ReturnsTable({ rows }: { rows: ReturnRow[] }) {
  const router = useRouter();
  const { pending, run, toast } = useAction();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const go = (r: ReturnRow, status: ReturnRow["status"], ok: string) => run(() => setReturnStatusAction(r.id, status, notes[r.id] ?? ""), ok, () => router.refresh());
  if (!rows.length) return <section className="adm-card"><p className="adm-hint">No return requests yet.</p></section>;
  return (
    <section className="adm-card" style={{ padding: 0, overflowX: "auto" }}>
      {toast}
      <table className="adm-table"><thead><tr><th>Order</th><th>Items and reason</th><th>Status</th><th>Your note to the customer</th><th /></tr></thead><tbody>
        {rows.map((r) => {
          const closed = r.status === "rejected" || r.status === "refunded";
          return (
            <tr key={r.id}>
              <td><Link href={`/admin/orders/${r.order_id}`}><b>{r.order_number}</b></Link><div className="adm-hint">{r.name || r.email}<br />{new Date(r.created_at).toLocaleDateString("en-GB")}</div></td>
              <td>{r.items.map((i) => `${i.name} × ${i.qty}`).join(", ")}<div className="adm-hint">{r.reason}{r.details ? ` · ${r.details}` : ""}</div></td>
              <td><span className={`adm-badge ${r.status === "requested" ? "adm-warn" : r.status === "rejected" ? "adm-bad" : "adm-ok"}`}>{RETURN_LABEL[r.status]}</span></td>
              <td>{closed ? <span className="adm-hint">{r.admin_note}</span> : <textarea className="adm-in" rows={2} defaultValue={r.admin_note} onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))} placeholder="e.g. No need to send it back, we will reprint it." />}</td>
              <td style={{ whiteSpace: "nowrap" }}>
                {closed ? null : (<>
                  {r.status === "requested" ? <button className="adm-btn adm-pri" disabled={pending} onClick={() => go(r, "approved", "Approved")}>Approve</button> : null}{" "}
                  {r.status === "approved" ? <button className="adm-btn" disabled={pending} onClick={() => go(r, "received", "Marked received")}>Mark received</button> : null}{" "}
                  {r.status !== "requested" ? <button className="adm-btn" disabled={pending} onClick={() => go(r, "refunded", "Marked refunded")}>Mark refunded</button> : null}{" "}
                  <button className="adm-btn" disabled={pending} onClick={() => { if (confirm("Decline this return? The customer will be emailed.")) go(r, "rejected", "Declined"); }}>Decline</button>
                </>)}
              </td>
            </tr>
          );
        })}
      </tbody></table>
    </section>
  );
}
