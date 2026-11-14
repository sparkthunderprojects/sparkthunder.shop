import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "@/components/LocaleLink";
import { connection } from "next/server";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PaymentBadges } from "@/components/PaymentBadges";
import { JsonLd } from "@/components/JsonLd";
import { getCommerce } from "@/lib/commerce";
import { enabledMethods, GROUP_TITLE, PAY_INFO, PAY_LATER_SMALL_PRINT, type PayGroup } from "@/lib/pay-later";
import { breadcrumbLd } from "@/lib/seo";
import { buildMetadata } from "@/lib/seo-metadata";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return buildMetadata({ title: t("Payment options"), description: t("See every way to pay for your order, including pay later options."), path: "/payment-options" });
}

export default async function PaymentOptionsPage() {
  await connection();
  const { t } = await getT();
  const on = enabledMethods((await getCommerce()).payLater);
  const methods = on.map((m) => ({ ...PAY_INFO[m], name: t(PAY_INFO[m].name) }));
  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: t("Home"), path: "/" }, { name: t("Payment options"), path: "/payment-options" }])} />
      <div className="pt-8"><Breadcrumbs items={[{ name: t("Home"), href: "/" }, { name: t("Payment options") }]} /></div>
      <h1 className="display mt-6 text-[clamp(2rem,4.2vw,3.25rem)]">{t("Payment options")}</h1>
      <p className="mt-4 max-w-2xl text-muted">{t("Pick how you would like to pay. Every payment is handled securely by Stripe, so your card details never touch our servers.")}</p>
      <PaymentBadges className="mt-6" methods={on} />
      {(["wallet", "store", "later"] as PayGroup[]).map((g) => {
        const list = methods.filter((m) => m.group === g);
        return list.length === 0 ? null : (
          <section key={g} className="mt-12" aria-label={t(GROUP_TITLE[g])}>
            <h2 className="display text-2xl sm:text-3xl">{t(GROUP_TITLE[g])}</h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((m) => (
                <li key={m.id}>
                  <Link href={`/payment-options/${m.id}`} className="flex h-full flex-col gap-3 p-8 text-black transition-transform hover:-translate-y-1" style={{ background: m.tint }} data-payoption={m.id}>
                    {m.logo ? <Image src={m.logo} alt="" width={m.logoW ?? 120} height={m.logoH ?? 120} className="h-14 w-auto self-start" /> : null}
                    <span className="display text-3xl">{m.name}</span>
                    <span>{t(m.hubLine)}</span>
                    <span className="mt-auto pt-2 font-bold underline underline-offset-4">{t("How {name} works", { name: m.name })} &rarr;</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {methods.some((m) => m.credit) && <p className="mt-8 max-w-3xl text-xs text-muted">{t(PAY_LATER_SMALL_PRINT)}</p>}
    </>
  );
}
