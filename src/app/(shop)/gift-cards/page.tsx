import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { GiftCardDesigner } from "@/components/GiftCardDesigner";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbLd } from "@/lib/seo";
import { buildMetadata } from "@/lib/seo-metadata";
import { absoluteUrl } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
  title: "Sparkthunder Gift Cards - Digital Gift Cards for Fans",
  description: "Give the gift of choice with a Sparkthunder digital gift card. Pick an amount from £5 to £250, add a message and email it straight to a Knightverge or Occult Inc fan.",
  path: "/gift-cards",
});
}

const FAQ = [
  { q: "How is the gift card delivered?", a: "By email, as a unique code. You choose who it goes to, so you can send it straight to the recipient or to yourself to forward on the day." },
  { q: "How do I spend a gift card?", a: "Enter the code at checkout and the balance is taken off your order. Any balance left over stays on the card for next time." },
  { q: "What can it be used on?", a: "Anything in the Sparkthunder shop, across Knightverge, Occult Inc and every universe we add." },
  { q: "Can I choose any amount?", a: "Yes. Pick £10, £25, £50 or £100, or type any amount from £5 to £250." },
  { q: "Can I get a refund on a gift card?", a: "Gift cards are not refundable for cash once issued. If something goes wrong with delivery, contact us and we will resend it." },
];

export default function GiftCardsPage() {
  const faqLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) };
  const pageLd = { "@context": "https://schema.org", "@type": "WebPage", "@id": absoluteUrl("/gift-cards#page"), url: absoluteUrl("/gift-cards"), name: "Sparkthunder Gift Cards", isPartOf: { "@id": absoluteUrl("/#website") } };
  return (
    <>
      <JsonLd data={[breadcrumbLd([{ name: "Home", path: "/" }, { name: "Gift cards", path: "/gift-cards" }]), pageLd, faqLd]} />
      <div className="pt-8"><Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Gift cards" }]} /></div>
      <h1 className="display mt-6 text-[clamp(2rem,4.2vw,3.25rem)]">Sparkthunder gift cards</h1>
      <div className="prose-lore mt-6 space-y-4 text-muted">
        <p>Not sure which tee, mug or print they would love? Let them choose. A Sparkthunder gift card is delivered by email in minutes and works across the whole shop, from Knightverge to Occult Inc.</p>
      </div>
      <p className="mt-4"><Link href="/gift-cards/balance" className="font-bold underline underline-offset-4">Already have a gift card? Check your balance</Link></p>
      <div className="mt-10"><GiftCardDesigner /></div>

      <section className="mt-20" aria-labelledby="how-h">
        <h2 id="how-h" className="display text-2xl sm:text-3xl">How it works</h2>
        <ol className="mt-6 grid gap-6 sm:grid-cols-3">
          {[["Choose", "Pick an amount and a design, then add a name and message."], ["Send", "We email the card with a unique code to whoever you choose."], ["Spend", "They enter the code at checkout and pick whatever they like."]].map(([t, d], i) => (
            <li key={t} className="border-t-2 border-ink pt-4"><span className="text-sm font-bold text-muted">0{i + 1}</span><h3 className="mt-1 text-xl font-bold">{t}</h3><p className="mt-1 text-muted">{d}</p></li>
          ))}
        </ol>
      </section>

      <section className="mt-20" aria-labelledby="faq-h">
        <h2 id="faq-h" className="display text-2xl sm:text-3xl">Gift card questions</h2>
        <div className="mt-6 max-w-3xl divide-y divide-ink/15 border-y border-ink/15">
          {FAQ.map((f) => (
            <details key={f.q} className="group py-4"><summary className="cursor-pointer list-none font-bold marker:hidden">{f.q}</summary><p className="mt-2 text-muted">{f.a}</p></details>
          ))}
        </div>
        <p className="mt-8 text-muted">Prefer to pick the present yourself? <Link href="/gifts" className="font-bold underline underline-offset-4">Browse gifts by price</Link>.</p>
      </section>
    </>
  );
}
