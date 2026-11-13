import { notFound } from "next/navigation";
import { connection } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import { InstalmentCalculator } from "@/components/InstalmentCalculator";
import { JsonLd } from "@/components/JsonLd";
import { PayMethodHero } from "@/components/PayMethodHero";
import { getAllProducts } from "@/lib/catalog";
import { getCommerce } from "@/lib/commerce";
import { isPayMethod, PAY_INFO, PAY_LATER_SMALL_PRINT } from "@/lib/pay-later";
import { breadcrumbLd } from "@/lib/seo";
import { buildMetadata } from "@/lib/seo-metadata";
import { absoluteUrl } from "@/lib/site";
import { getStore } from "@/lib/store";

// The pages shown depend on this store's settings, so they are rendered per request (the data behind them is cached).
async function load(slug: string) {
  await connection();
  if (!isPayMethod(slug)) return null;
  const commerce = await getCommerce();
  return commerce.payLater[slug] ? PAY_INFO[slug] : null;
}

export async function generateMetadata(props: PageProps<"/payment-options/[method]">): Promise<Metadata> {
  const m = await load((await props.params).method);
  const store = await getStore();
  if (!m) return { title: "Page not found", robots: { index: false } };
  return buildMetadata({ title: m.id === "giftcard" ? "Pay with a gift card" : `Pay with ${m.name}`, description: `How to pay for your ${store.name} order with ${m.name}: ${m.sub}`, path: `/payment-options/${m.id}` });
}

export default async function PayMethodPage(props: PageProps<"/payment-options/[method]">) {
  const m = await load((await props.params).method);
  if (!m) notFound();
  const store = await getStore();
  const all = await getAllProducts();
  const pick = all.filter((p) => p.isFeatured && p.inStock).concat(all.filter((p) => !p.isFeatured && p.inStock)).slice(0, 3);
  const path = `/payment-options/${m.id}`;
  const faqLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: m.faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) };
  return (
    <>
      <JsonLd data={[breadcrumbLd([{ name: "Home", path: "/" }, { name: "Payment options", path: "/payment-options" }, { name: m.name, path }]), { "@context": "https://schema.org", "@type": "WebPage", "@id": `${absoluteUrl(path)}#page`, url: absoluteUrl(path), name: `Pay with ${m.name} at ${store.name}` }, faqLd]} />
      <PayMethodHero m={m} products={pick} />

      <section id="how" className="scroll-mt-24 pt-16" aria-labelledby="how-h">
        <h2 id="how-h" className="display text-2xl sm:text-3xl">How {m.name} works at {store.name}</h2>
        <ol className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {m.steps.map(([t, d], i) => (
            <li key={t} className="border-t-2 border-ink pt-4"><span className="text-sm font-bold text-muted">0{i + 1}</span><h3 className="mt-1 text-xl font-bold">{t}</h3><p className="mt-1 text-muted">{d}</p></li>
          ))}
        </ol>
      </section>

      {m.parts > 0 && (
        <section className="mt-16" aria-labelledby="split-h">
          <h2 id="split-h" className="display text-2xl sm:text-3xl">See how a basket could split</h2>
          <div className="mt-6 max-w-3xl"><InstalmentCalculator name={m.name} schedule={m.schedule} note={m.scheduleNote} accent={m.tint} /></div>
        </section>
      )}

      <section className="mt-16" aria-labelledby="facts-h">
        <h2 id="facts-h" className="display text-2xl sm:text-3xl">The good to know</h2>
        <dl className="mt-6 grid gap-x-10 gap-y-6 sm:grid-cols-2">
          {m.facts.map(([t, d]) => <div key={t}><dt className="font-bold">{t}</dt><dd className="mt-1 text-muted">{d}</dd></div>)}
        </dl>
      </section>

      <section className="mt-16" aria-labelledby="faq-h">
        <h2 id="faq-h" className="display text-2xl sm:text-3xl">{m.name} questions</h2>
        <div className="mt-6 max-w-3xl divide-y divide-ink/15 border-y border-ink/15">
          {m.faq.map(([q, a]) => <details key={q} className="py-4"><summary className="cursor-pointer list-none font-bold marker:hidden">{q}</summary><p className="mt-2 text-muted">{a}</p></details>)}
        </div>
        <p className="mt-8 text-muted">{m.id === "giftcard" ? <>Got a code? <Link href="/gift-cards/balance" className="font-bold underline underline-offset-4">Check your balance</Link>. Want to give one? <Link href="/gift-cards/send" className="font-bold underline underline-offset-4">Send a gift card</Link>. </> : null}Ready? <Link href="/shop" className="font-bold underline underline-offset-4">Browse the shop</Link>, or read our <Link href="/delivery-returns" className="font-bold underline underline-offset-4">delivery and returns</Link>.</p>
        {m.credit ? <p className="mt-6 max-w-3xl text-xs text-muted" data-smallprint>{PAY_LATER_SMALL_PRINT}</p> : null}
      </section>
    </>
  );
}
