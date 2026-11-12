import type { Metadata } from "next";
import Link from "next/link";
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
  return buildMetadata({ title: "Send a digital gift card", description: `Choose an amount from £5 to £250, pick a design, add a message and email a ${store.name} gift card straight to the lucky person.`, path: "/gift-cards/send" });
}

export default async function SendGiftCardPage() {
  const store = await getStore(), original = (await currentStoreId()) === DEFAULT_STORE_ID;
  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: "Home", path: "/" }, { name: "Gift cards", path: "/gift-cards" }, { name: "Send by email", path: "/gift-cards/send" }])} />
      <div className="pt-8"><Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Gift cards", href: "/gift-cards" }, { name: "Send by email" }]} /></div>
      <h1 className="display mt-6 text-[clamp(2rem,4.2vw,3.25rem)]">Send a {store.name} gift card</h1>
      <p className="mt-4 text-muted">Delivered by email in minutes. <Link href="/gift-cards/balance" className="font-bold underline underline-offset-4">Already have a card? Check your balance</Link></p>
      <div className="mt-10"><GiftCardDesigner store={{ name: store.name, logoUrl: store.logoUrl, logoWidth: store.logoWidth, logoHeight: store.logoHeight, themes: giftThemes(store, original) }} /></div>
    </>
  );
}
