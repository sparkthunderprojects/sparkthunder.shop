import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { BalanceChecker } from "@/components/BalanceChecker";
import { getStore } from "@/lib/store";
import { getCommerce } from "@/lib/commerce";

export async function generateMetadata(): Promise<Metadata> {
  const store = await getStore();
  const { t } = await getT();
  return {
    title: t("Check your gift card balance"),
    description: t("Enter your {store} gift card code to see how much you have left to spend.", { store: store.name }),
    alternates: { canonical: "/gift-cards/balance" },
    robots: { index: false, follow: true },
  };
}

export default async function BalancePage() {
  const { t } = await getT();
  const { codePrefix } = await getCommerce();
  return (
    <>
      <div className="pt-8"><Breadcrumbs items={[{ name: t("Home"), href: "/" }, { name: t("Gift cards"), href: "/gift-cards" }, { name: t("Check balance") }]} /></div>
      <h1 className="display mt-6 text-[clamp(2rem,4.2vw,3.25rem)]">{t("Check your gift card balance")}</h1>
      <p className="prose-lore mt-4 text-muted">{t("Enter the code from your email. It starts with {prefix}.", { prefix: codePrefix })}</p>
      <BalanceChecker />
    </>
  );
}
