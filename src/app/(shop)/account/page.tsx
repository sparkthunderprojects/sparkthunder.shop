import { localePath } from "@/lib/i18n/config";
import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import Link from "@/components/LocaleLink";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { SignOutButton } from "@/components/SignOutButton";
import { getAdmin } from "@/lib/admin/auth";
import { sessionClient } from "@/lib/db/clients";
import type { OrderRow } from "@/lib/shop/fulfil";
import { formatPrice } from "@/lib/site";
import { OrderTimeline } from "@/components/OrderTimeline";
import { BuyAgain, type AgainLine } from "@/components/BuyAgain";
import { getAllProducts } from "@/lib/catalog";
import { isUpcoming } from "@/lib/launch";
import { productImagePath } from "@/lib/card";
import { ReturnRequest } from "@/components/ReturnRequest";
import { RETURN_LABEL, returnEligibility, type ReturnRow } from "@/lib/returns";
import { RedeemPoints } from "@/components/RedeemPoints";
import { balanceOf, ledgerFor, REDEEM_OPTIONS, REVIEW_BONUS, POINTS_PER_POUND } from "@/lib/rewards";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("My Sparkthunder ID"), robots: { index: false, follow: false } };
}
const STATUS = { paid: "Being prepared", shipped: "Shipped", cancelled: "Cancelled", attention: "Being prepared" } as const;

export default async function AccountPage() {
  await connection();
  const { t, locale } = await getT();
  const db = await sessionClient();
  const { data } = (await db?.auth.getUser()) ?? { data: { user: null } };
  const user = data.user;
  if (!db || !user) redirect(localePath("/account/login?next=/account", locale) as never);
  const name = (user.user_metadata?.full_name as string | undefined) || (user.user_metadata?.name as string | undefined) || "";
  const { data: rows } = await db.from("orders").select("*").eq("email", user.email ?? "").order("created_at", { ascending: false });
  const orders = (rows ?? []) as OrderRow[];
  const catalogue = new Map((await getAllProducts()).map((x) => [x.slug, x]));
  const again = (o: OrderRow) => {
    const lines: AgainLine[] = []; let missing = 0;
    for (const l of o.items) {
      if (l.type !== "product") continue;
      const pr = catalogue.get(l.slug);
      const v = l.variant ? pr?.variants?.find((x) => x.name === l.variant) : undefined;
      const ok = pr && pr.inStock && !isUpcoming(pr.launchAt) && (!l.variant || (v && (!pr.trackStock || v.stockQty > 0)));
      if (!ok || !pr) { missing++; continue; }
      lines.push({ slug: l.slug, variant: l.variant, name: l.name, pricePence: v?.pricePence ?? pr.pricePence, image: productImagePath(pr), qty: l.qty });
    }
    return { lines, missing };
  };
  const { data: retRows } = await db.from("return_requests").select("*").order("created_at", { ascending: false });
  const returns = (retRows ?? []) as ReturnRow[];
  const ledger = await ledgerFor(db, user.email ?? "");
  const balance = balanceOf(ledger);
  const admin = await getAdmin();
  return (
    <div className="pt-12">
      <h1 className="display text-[clamp(2rem,4.2vw,3.25rem)]">{name ? t("Hello, {name}", { name: name.split(" ")[0] }) : t("My Sparkthunder ID")}</h1>
      <p className="mt-2 text-muted">{user.email}</p>
      <div className="mt-6 flex flex-wrap gap-3"><SignOutButton />{admin ? <Link href="/admin" className="btn btn-ink">{t("Open the admin")}</Link> : null}</div>

      <section className="mt-12" aria-labelledby="points-h">
        <h2 id="points-h" className="display text-2xl sm:text-3xl">{t("Spark points")}</h2>
        <p className="mt-3 flex items-baseline gap-3"><span className="display text-5xl">{balance}</span><span className="text-muted">{t("points")}</span></p>
        <p className="mt-2 max-w-xl text-sm text-muted">{t("Earn {n} point for every £1 you spend on products, plus {bonus} for each approved review. Spend them on money off your next order.", { n: POINTS_PER_POUND, bonus: REVIEW_BONUS })}</p>
        <div className="mt-5"><RedeemPoints balance={balance} options={[...REDEEM_OPTIONS]} /></div>
        {ledger.length > 0 ? (
          <ul className="mt-6 max-w-xl divide-y divide-ink/15 border-y border-ink/15 text-sm">
            {ledger.slice(0, 8).map((r) => <li key={r.id} className="flex justify-between gap-3 py-2"><span>{t(r.note || r.reason)} <span className="text-muted">· {new Date(r.created_at).toLocaleDateString(locale === "en" ? "en-GB" : locale)}</span></span><b>{r.points > 0 ? `+${r.points}` : r.points}</b></li>)}
          </ul>
        ) : null}
      </section>

      <section className="mt-12" aria-labelledby="orders-h">
        <h2 id="orders-h" className="display text-2xl sm:text-3xl">{t("Your orders")}</h2>
        {orders.length === 0 ? <p className="mt-4 text-muted">{t("No orders yet.")} <Link href="/shop" className="font-bold underline underline-offset-4">{t("Start shopping")}</Link>.</p> : (
          <ul className="mt-5 divide-y divide-ink/15 border-y border-ink/15">
            {orders.map((o) => (
              <li key={o.id} className="py-4">
                <p className="flex flex-wrap justify-between gap-2"><b>{o.number}</b><span>{formatPrice(o.total_pence + o.gift_card_pence)}</span></p>
                <p className="text-sm text-muted">{new Date(o.created_at).toLocaleDateString(locale === "en" ? "en-GB" : locale)} · {t(STATUS[o.status])}</p>
                <OrderTimeline order={o} />
                <p className="mt-3 text-sm">{o.items.map((l) => `${l.name} × ${l.qty}`).join(", ")}</p>
                {o.status !== "cancelled" && o.items.some((l) => l.type === "product") ? (() => { const a = again(o); return <BuyAgain lines={a.lines} missing={a.missing} />; })() : null}
                {returns.filter((r) => r.order_id === o.id).map((r) => (
                  <p key={r.id} className="mt-3 text-sm"><b>{t("Return:")}</b> {r.items.map((i) => `${i.name} × ${i.qty}`).join(", ")} · {t(RETURN_LABEL[r.status])}{r.admin_note ? <span className="block text-muted">{r.admin_note}</span> : null}</p>
                ))}
                {returnEligibility(o, returns.filter((r) => r.order_id === o.id && ["requested", "approved", "received"].includes(r.status)).length).ok
                  ? <ReturnRequest orderId={o.id} lines={o.items.flatMap((l, i) => (l.type === "product" ? [{ line: i, name: l.name, qty: l.qty }] : []))} /> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="mt-10 max-w-xl text-sm text-muted">{t("Your Sparkthunder ID is shared across our sites, so the same email and password (or Google account) works everywhere it is offered.")}</p>
    </div>
  );
}
