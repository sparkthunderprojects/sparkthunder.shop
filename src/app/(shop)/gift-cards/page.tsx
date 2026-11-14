import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import Link from "@/components/LocaleLink";
import { GiftCardHero } from "@/components/GiftCardHero";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbLd } from "@/lib/seo";
import { buildMetadata } from "@/lib/seo-metadata";
import { absoluteUrl } from "@/lib/site";
import { getStore } from "@/lib/store";
import { currentStoreId, DEFAULT_STORE_ID } from "@/lib/db/stores";
import { giftThemes } from "@/lib/giftcards/themes";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  const store = await getStore(), original = (await currentStoreId()) === DEFAULT_STORE_ID;
  return buildMetadata({
    title: original ? t("Gift Cards for Fans") : t("Gift Cards"),
    description: t("Give the gift of choice with a {store} gift card. Pick an amount from £5 to £250, add a message and email it straight to the lucky person{extra}.", { store: store.name, extra: original ? t(", whether they are a Knightverge or Occult Inc fan or not") : "" }),
    path: "/gift-cards",
  });
}

const AMOUNTS = [10, 25, 50, 100, 250];

const faq = (t: (k: string, v?: Record<string, string | number>) => string, name: string, original: boolean) => [
  { q: t("How is the gift card delivered?"), a: t("By email, as a unique code. You choose who it goes to, so you can send it straight to the recipient or to yourself to forward on the day.") },
  { q: t("How do I spend a gift card?"), a: t("Enter the code at checkout and the balance is taken off your order. Any balance left over stays on the card for next time.") },
  { q: t("What can it be used on?"), a: original ? t("Anything in the {store} shop, across Knightverge, Occult Inc and every universe we add.", { store: name }) : t("Anything in the {store} shop.", { store: name }) },
  { q: t("Can I choose any amount?"), a: t("Yes. Pick £10, £25, £50, £100 or £250, or type any amount from £5 to £250.") },
  { q: t("Can I get a refund on a gift card?"), a: t("Gift cards are not refundable for cash once issued. If something goes wrong with delivery, contact us and we will resend it.") },
];

export default async function GiftCardsPage() {
  const { t } = await getT();
  const store = await getStore(), original = (await currentStoreId()) === DEFAULT_STORE_ID, FAQ = faq(t, store.name, original);
  const themes = giftThemes(store, original);
  const faqLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) };
  const pageLd = { "@context": "https://schema.org", "@type": "WebPage", "@id": absoluteUrl("/gift-cards#page"), url: absoluteUrl("/gift-cards"), name: t("{store} Gift Cards", { store: store.name }), isPartOf: { "@id": absoluteUrl("/#website") } };
  return (
    <>
      <JsonLd data={[breadcrumbLd([{ name: t("Home"), path: "/" }, { name: t("Gift cards"), path: "/gift-cards" }]), pageLd, faqLd]} />

      <GiftCardHero store={{ name: store.name, logoUrl: store.logoUrl, logoWidth: store.logoWidth, logoHeight: store.logoHeight, dark: store.dark, accent: store.accent }} card={themes[0]} />

      {/* Two ways in: overlap the bottom of the banner on wide screens */}
      <section className="relative z-10 -mt-12 md:-mt-40" aria-labelledby="ways-h">
        <h2 id="ways-h" className="sr-only">{t("Choose how to start")}</h2>
        <ul className="grid max-w-md gap-3">
          <li>
            <Link href="/gift-cards/send" className="group flex h-full flex-col gap-2 border border-ink/15 bg-paper p-6 shadow-lg transition-colors hover:bg-paper-2" data-giftcards="send">
              <span className="self-start bg-paper-2 px-3 py-1 text-xs font-bold uppercase tracking-widest">{t("Quickest delivery")}</span>
              <span className="display text-3xl">{t("Send by email")}</span>
              <span className="text-muted">{t("Pick an amount and a design, add a message and we email the card with a unique code, now or on the day.")}</span>
              <span className="btn btn-sm mt-2 self-start">{t("Shop now")} <span aria-hidden>&rarr;</span></span>
            </Link>
          </li>
          <li>
            <Link href="/gift-cards/balance" className="group flex h-full flex-col gap-2 border border-ink/15 bg-paper p-6 shadow-lg transition-colors hover:bg-paper-2" data-giftcards="balance">
              <span className="self-start bg-paper-2 px-3 py-1 text-xs font-bold uppercase tracking-widest">{t("Got a code?")}</span>
              <span className="display text-3xl">{t("Check your balance")}</span>
              <span className="text-muted">{t("Enter your gift card code to see what is left, then spend it at checkout.")}</span>
              <span className="btn btn-sm btn-ink mt-2 self-start">{t("Check balance")} <span aria-hidden>&rarr;</span></span>
            </Link>
          </li>
        </ul>
      </section>

      {/* Amounts and where to spend */}
      <section className="mt-16 grid gap-10 md:grid-cols-2" aria-labelledby="amounts-h">
        <div>
          <h2 id="amounts-h" className="display text-2xl sm:text-3xl">{t("Choose your amount")}</h2>
          <ul className="mt-5 flex flex-wrap gap-2">
            {AMOUNTS.map((a) => <li key={a} className="border border-ink/25 px-5 py-3 text-lg font-bold">£{a}</li>)}
          </ul>
          <p className="mt-4 text-muted">{t("Or type any amount from £5 to £250.")}</p>
        </div>
        <div>
          <h2 className="display text-2xl sm:text-3xl">{t("Where to spend it")}</h2>
          <p className="mt-5 text-muted">{original ? t("Online at {store}, on anything from Knightverge, Occult Inc and every universe we add.", { store: store.name }) : t("Online at {store}, on anything in the shop.", { store: store.name })}{t(" Part-spent cards keep their balance for next time.")}</p>
        </div>
      </section>

      <section className="mt-16" aria-labelledby="how-h">
        <h2 id="how-h" className="display text-2xl sm:text-3xl">{t("How to redeem")}</h2>
        <ol className="mt-6 grid gap-6 sm:grid-cols-3">
          {[["Choose", "Pick an amount and a design, then add a name and message."], ["Send", "We email the card with a unique code to whoever you choose."], ["Spend", "They enter the code at checkout and pick whatever they like."]].map(([h, d], i) => (
            <li key={h} className="border-t-2 border-ink pt-4"><span className="text-sm font-bold text-muted">0{i + 1}</span><h3 className="mt-1 text-xl font-bold">{t(h)}</h3><p className="mt-1 text-muted">{t(d)}</p></li>
          ))}
        </ol>
      </section>

      <section className="mt-16" aria-labelledby="faq-h">
        <h2 id="faq-h" className="display text-2xl sm:text-3xl">{t("Gift card questions")}</h2>
        <div className="mt-6 max-w-3xl divide-y divide-ink/15 border-y border-ink/15">
          {FAQ.map((f) => (
            <details key={f.q} className="group py-4"><summary className="cursor-pointer list-none font-bold marker:hidden">{f.q}</summary><p className="mt-2 text-muted">{f.a}</p></details>
          ))}
        </div>
        <p className="mt-8 text-muted">{t("Need help with a gift card?")} <Link href="/delivery-returns" className="font-bold underline underline-offset-4">{t("Delivery and returns")}</Link>. {t("Prefer to pick the present yourself?")} <Link href="/gifts" className="font-bold underline underline-offset-4">{t("Browse gifts by price")}</Link>.</p>
      </section>
    </>
  );
}
