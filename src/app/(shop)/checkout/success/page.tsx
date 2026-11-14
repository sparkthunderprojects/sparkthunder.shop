import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import Link from "@/components/LocaleLink";
import { connection } from "next/server";
import { ClearBasket } from "@/components/ClearBasket";
import { serviceClient } from "@/lib/db/clients";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Order confirmed"), robots: { index: false, follow: false } };
}

export default async function Success({ searchParams }: PageProps<"/checkout/success">) {
  await connection();
  const { t } = await getT();
  const sp = await searchParams;
  const id = typeof sp.session_id === "string" ? sp.session_id : "";
  const db = serviceClient();
  const { data } = id && db ? await db.from("orders").select("number,email").eq("stripe_session_id", id).maybeSingle() : { data: null };
  const order = data as { number: string; email: string } | null;
  return (
    <div className="pt-16">
      <ClearBasket active={Boolean(order)} retry={!order && Boolean(id)} />
      <h1 className="display text-[clamp(2.25rem,5vw,4rem)]">{order ? t("Thank you!") : t("Finishing your order...")}</h1>
      {order ? (
        <div className="prose-lore mt-6 space-y-3 text-muted">
          <p>{t("Your order {number} is confirmed.", { number: order.number }).split(order.number).flatMap((s, i, a) => i < a.length - 1 ? [s, <b key={i} className="text-ink">{order.number}</b>] : [s])}{order.email ? t(" A confirmation is on its way to {email}.", { email: order.email }) : ""}</p>
          <p>{t("Bought a gift card? It has been emailed to the recipient.")}</p>
        </div>
      ) : (
        <p className="prose-lore mt-6 text-muted">{t("Your payment went through and we are creating your order. This page refreshes by itself. If it takes more than a minute, check your email for a confirmation.")}</p>
      )}
      <Link href="/shop" className="btn mt-8">{t("Keep shopping")}</Link>
    </div>
  );
}
