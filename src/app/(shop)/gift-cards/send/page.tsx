import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import Link from "@/components/LocaleLink";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { GiftCardDesigner } from "@/components/GiftCardDesigner";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbLd } from "@/lib/seo";
import { buildMetadata } from "@/lib/seo-metadata";
import { getStore } from "@/lib/store";
import { currentStoreId, DEFAULT_STORE_ID } from "@/lib/db/stores";
import { giftThemes } from "@/lib/giftcards/themes";

export async function generateMetadata(): Promise<Metadata> {
  const store = await getStore();
  const { t } = await getT();
  return buildMetadata({ title: t("Send a digital gift card"), description: t("Choose an amount from £5 to £250, pick a design, add a message and email a {store} gift card straight to the lucky person.", { store: store.name }), path: "/gift-cards/send" });
}

export default async function SendGiftCardPage() {
  const { t } = await getT();
  const store = await getStore(), original = (await currentStoreId()) === DEFAULT_STORE_ID;
  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: t("Home"), path: "/" }, { name: t("Gift cards"), path: "/gift-cards" }, { name: t("Send by email"), path: "/gift-cards/send" }])} />
      <div className="pt-8"><Breadcrumbs items={[{ name: t("Home"), href: "/" }, { name: t("Gift cards"), href: "/gift-cards" }, { name: t("Send by email") }]} /></div>
      <h1 className="display mt-6 text-[clamp(2rem,4.2vw,3.25rem)]">{t("Send a {store} gift card", { store: store.name })}</h1>
      <p className="mt-4 text-muted">{t("Delivered by email in minutes.")} <Link href="/gift-cards/balance" className="font-bold underline underline-offset-4">{t("Already have a card? Check your balance")}</Link></p>
      <div className="mt-10"><GiftCardDesigner store={{ name: store.name, logoUrl: store.logoUrl, logoWidth: store.logoWidth, logoHeight: store.logoHeight, themes: giftThemes(store, original) }} /></div>
    </>
  );
}
