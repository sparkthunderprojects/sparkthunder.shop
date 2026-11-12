import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbLd } from "@/lib/seo";
import { buildMetadata } from "@/lib/seo-metadata";
import { absoluteUrl } from "@/lib/site";
import { getStore } from "@/lib/store";
import { currentStoreId, DEFAULT_STORE_ID } from "@/lib/db/stores";
import { giftThemes } from "@/lib/giftcards/themes";

export async function generateMetadata(): Promise<Metadata> {
  const store = await getStore(), original = (await currentStoreId()) === DEFAULT_STORE_ID;
  return buildMetadata({
    title: original ? "Gift Cards for Fans" : "Gift Cards",
    description: `Give the gift of choice with a ${store.name} gift card. Pick an amount from £5 to £250, add a message and email it straight to the lucky person${original ? ", whether they are a Knightverge or Occult Inc fan or not" : ""}.`,
    path: "/gift-cards",
  });
}

const AMOUNTS = [10, 25, 50, 100, 250];

const faq = (name: string, original: boolean) => [
  { q: "How is the gift card delivered?", a: "By email, as a unique code. You choose who it goes to, so you can send it straight to the recipient or to yourself to forward on the day." },
  { q: "How do I spend a gift card?", a: "Enter the code at checkout and the balance is taken off your order. Any balance left over stays on the card for next time." },
  { q: "What can it be used on?", a: original ? `Anything in the ${name} shop, across Knightverge, Occult Inc and every universe we add.` : `Anything in the ${name} shop.` },
  { q: "Can I choose any amount?", a: "Yes. Pick £10, £25, £50, £100 or £250, or type any amount from £5 to £250." },
  { q: "Can I get a refund on a gift card?", a: "Gift cards are not refundable for cash once issued. If something goes wrong with delivery, contact us and we will resend it." },
];

export default async function GiftCardsPage() {
  const store = await getStore(), original = (await currentStoreId()) === DEFAULT_STORE_ID, FAQ = faq(store.name, original);
  const themes = giftThemes(store, original);
  const faqLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) };
  const pageLd = { "@context": "https://schema.org", "@type": "WebPage", "@id": absoluteUrl("/gift-cards#page"), url: absoluteUrl("/gift-cards"), name: `${store.name} Gift Cards`, isPartOf: { "@id": absoluteUrl("/#website") } };
  return (
    <>
      <JsonLd data={[breadcrumbLd([{ name: "Home", path: "/" }, { name: "Gift cards", path: "/gift-cards" }]), pageLd, faqLd]} />
      <div className="pt-8"><Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Gift cards" }]} /></div>

      {/* Hero banner: the store's own card designs fanned out */}
      <section className="theme-dark -mx-(--gutter) mt-6 overflow-hidden px-(--gutter) py-14 md:py-20" data-giftcards="hero">
        <div className="grid items-center gap-10 md:grid-cols-[1fr_1fr]">
          <div>
            <h1 className="display text-[clamp(2.25rem,5vw,4.25rem)]">{store.name} gift cards</h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink/75">Not sure what they would love? Let them choose. Delivered by email in minutes and spendable on everything in the shop{original ? ", from Knightverge to Occult Inc" : ""}.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/gift-cards/send" className="btn">Send a gift card</Link>
              <Link href="/gift-cards/balance" className="btn btn-ink">Check your balance</Link>
            </div>
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:gap-4" aria-hidden>
            {themes.slice(0, 4).map((t, i) => (
              <li key={t.id} className={`aspect-[1.6/1] rounded-xl p-4 shadow-xl ring-1 ring-white/20 ${i % 2 ? "translate-y-4 rotate-2" : "-rotate-2"}`} style={{ background: t.bg }}>
                <span className="block text-[0.65rem] font-bold uppercase tracking-[0.2em]" style={{ color: t.accent }}>Gift card</span>
                <span className="mt-1 block text-lg font-extrabold text-white sm:text-2xl">£{AMOUNTS[(i + 1) % AMOUNTS.length]}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Two ways in */}
      <section className="mt-12" aria-labelledby="ways-h">
        <h2 id="ways-h" className="sr-only">Choose how to start</h2>
        <ul className="grid gap-4 md:grid-cols-2">
          <li>
            <Link href="/gift-cards/send" className="group flex h-full flex-col gap-3 border border-ink/15 p-8 transition-colors hover:bg-paper-2" data-giftcards="send">
              <span className="text-xs font-bold uppercase tracking-widest text-muted">Quickest delivery</span>
              <span className="display text-3xl">Send by email</span>
              <span className="text-muted">Pick an amount and a design, add a message and we email the card with a unique code, now or on the day.</span>
              <span className="btn btn-sm mt-2 self-start">Shop now <span aria-hidden>&rarr;</span></span>
            </Link>
          </li>
          <li>
            <Link href="/gift-cards/balance" className="group flex h-full flex-col gap-3 border border-ink/15 p-8 transition-colors hover:bg-paper-2" data-giftcards="balance">
              <span className="text-xs font-bold uppercase tracking-widest text-muted">Got a code?</span>
              <span className="display text-3xl">Check your balance</span>
              <span className="text-muted">Enter your gift card code to see what is left, then spend it at checkout.</span>
              <span className="btn btn-sm btn-ink mt-2 self-start">Check balance <span aria-hidden>&rarr;</span></span>
            </Link>
          </li>
        </ul>
      </section>

      {/* Amounts and where to spend */}
      <section className="mt-16 grid gap-10 md:grid-cols-2" aria-labelledby="amounts-h">
        <div>
          <h2 id="amounts-h" className="display text-2xl sm:text-3xl">Choose your amount</h2>
          <ul className="mt-5 flex flex-wrap gap-2">
            {AMOUNTS.map((a) => <li key={a} className="border border-ink/25 px-5 py-3 text-lg font-bold">£{a}</li>)}
          </ul>
          <p className="mt-4 text-muted">Or type any amount from £5 to £250.</p>
        </div>
        <div>
          <h2 className="display text-2xl sm:text-3xl">Where to spend it</h2>
          <p className="mt-5 text-muted">{original ? `Online at ${store.name}, on anything from Knightverge, Occult Inc and every universe we add.` : `Online at ${store.name}, on anything in the shop.`} Part-spent cards keep their balance for next time.</p>
        </div>
      </section>

      <section className="mt-16" aria-labelledby="how-h">
        <h2 id="how-h" className="display text-2xl sm:text-3xl">How to redeem</h2>
        <ol className="mt-6 grid gap-6 sm:grid-cols-3">
          {[["Choose", "Pick an amount and a design, then add a name and message."], ["Send", "We email the card with a unique code to whoever you choose."], ["Spend", "They enter the code at checkout and pick whatever they like."]].map(([t, d], i) => (
            <li key={t} className="border-t-2 border-ink pt-4"><span className="text-sm font-bold text-muted">0{i + 1}</span><h3 className="mt-1 text-xl font-bold">{t}</h3><p className="mt-1 text-muted">{d}</p></li>
          ))}
        </ol>
      </section>

      <section className="mt-16" aria-labelledby="faq-h">
        <h2 id="faq-h" className="display text-2xl sm:text-3xl">Gift card questions</h2>
        <div className="mt-6 max-w-3xl divide-y divide-ink/15 border-y border-ink/15">
          {FAQ.map((f) => (
            <details key={f.q} className="group py-4"><summary className="cursor-pointer list-none font-bold marker:hidden">{f.q}</summary><p className="mt-2 text-muted">{f.a}</p></details>
          ))}
        </div>
        <p className="mt-8 text-muted">Need help with a gift card? <Link href="/delivery-returns" className="font-bold underline underline-offset-4">Delivery and returns</Link>. Prefer to pick the present yourself? <Link href="/gifts" className="font-bold underline underline-offset-4">Browse gifts by price</Link>.</p>
      </section>
    </>
  );
}
