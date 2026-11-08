import { getCommerce } from "@/lib/commerce";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { listCards } from "@/lib/giftcards/ledger";
import { effectiveStatus, formatCode } from "@/lib/giftcards/format";
import { formatPrice } from "@/lib/site";
import { GiftCardTable, type GRow } from "./GiftCardTable";

export const metadata = { title: "Gift cards" };

export default async function GiftCardsAdmin() {
  const { db } = await requireAdmin();
  const cards = await listCards(db);
  const prefix = (await getCommerce()).codePrefix;
  const active = cards.filter((c) => effectiveStatus(c) === "active");
  const outstanding = active.reduce((n, c) => n + c.balance_pence, 0);
  const issued = cards.reduce((n, c) => n + c.initial_pence, 0);
  const rows: GRow[] = cards.map((c) => ({ id: c.id, code: formatCode(c.code, prefix), recipient: c.recipient_name || c.recipient_email || "-", email: c.recipient_email, initial: c.initial_pence, balance: c.balance_pence, status: effectiveStatus(c), source: c.source, created: c.created_at, expires: c.expires_at }));
  return (
    <>
      <div className="adm-h"><div><h1>Gift cards</h1><p>Issue cards, check balances and keep a full history of every pound spent.</p></div><Link className="adm-btn adm-bolt" href="/admin/gift-cards/new">Issue a gift card</Link></div>
      <div className="adm-grid adm-g4" style={{ marginBottom: 18 }}>
        {[[formatPrice(outstanding), "Outstanding balance (what you still owe)"], [String(active.length), "Active cards"], [formatPrice(issued), "Total issued"], [formatPrice(issued - cards.reduce((n, c) => n + c.balance_pence, 0)), "Total spent"]].map(([v, l]) => (
          <div key={l} className="adm-card" style={{ margin: 0 }}><div className="adm-stat">{v}</div><div className="adm-stat-l">{l}</div></div>
        ))}
      </div>
      <GiftCardTable rows={rows} />
    </>
  );
}
