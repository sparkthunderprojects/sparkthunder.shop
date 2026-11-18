import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import Link from "@/components/LocaleLink";
import { ElixirHero } from "@/components/ElixirHero";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbLd } from "@/lib/seo";
import { buildMetadata } from "@/lib/seo-metadata";
import { absoluteUrl } from "@/lib/site";
import { getElixirRate } from "@/lib/elixir";
import { elixirPointsFor, elixirPointsValuePence } from "@/lib/elixir-points";

const ELIXIR_URL = "https://elixirpoints.com";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return buildMetadata({
    title: t("Elixir Points"),
    description: t("Earn Elixir Points on every order, then spend them across Sparkthunder, Knightverge, Miss Petty and more. Free to join."),
    path: "/elixir-points",
  });
}

export default async function ElixirPointsPage() {
  const { t } = await getT();
  const rate = await getElixirRate();
  const example = 50;
  const pts = elixirPointsFor(example * 100, rate);
  const worth = (elixirPointsValuePence(pts, rate) / 100).toFixed(2);
  const join = `${ELIXIR_URL}/signup`, signin = `${ELIXIR_URL}/login`;

  const FAQ = [
    { q: t("What are Elixir Points?"), a: t("Elixir Points are one loyalty scheme across every Sparkthunder brand. Shop in one place, spend your points in another.") },
    { q: t("How many points do I earn?"), a: t("You earn {earn} Elixir Point for every £1 you spend on products. Delivery and gift cards do not earn points.", { earn: rate.earnPerGbp }) },
    { q: t("What are they worth?"), a: t("{redeem} points are worth £1 off. Your points are shown in your Elixir account.", { redeem: rate.redeemPerGbp }) },
    { q: t("Do I need an account?"), a: t("Yes, it is free. Join with the same email you use at checkout and any points waiting for you are added to your account.") },
    { q: t("What happens if I return something?"), a: t("The points earned on a refunded item are taken back, in proportion to the refund.") },
  ];
  const faqLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) };
  const pageLd = { "@context": "https://schema.org", "@type": "WebPage", "@id": absoluteUrl("/elixir-points#page"), url: absoluteUrl("/elixir-points"), name: "Elixir Points", isPartOf: { "@id": absoluteUrl("/#website") } };

  return (
    <>
      <JsonLd data={[breadcrumbLd([{ name: t("Home"), path: "/" }, { name: "Elixir Points", path: "/elixir-points" }]), pageLd, faqLd]} />

      <ElixirHero earn={rate.earnPerGbp} example={example} />

      <section className="relative z-10 -mt-12 md:-mt-40" aria-labelledby="ex-ways-h">
        <h2 id="ex-ways-h" className="sr-only">{t("Choose how to start")}</h2>
        <ul className="grid max-w-md gap-3">
          <li>
            <a href={join} className="group flex h-full flex-col gap-2 border border-ink/15 bg-paper p-6 shadow-lg transition-colors hover:bg-paper-2" data-elixir="join">
              <span className="self-start bg-paper-2 px-3 py-1 text-xs font-bold uppercase tracking-widest">{t("Free to join")}</span>
              <span className="display text-3xl">{t("Join Elixir Points")}</span>
              <span className="text-muted">{t("Create your account and start collecting on your next order.")}</span>
              <span className="btn btn-sm mt-2 self-start">{t("Join now")} <span aria-hidden>&rarr;</span></span>
            </a>
          </li>
          <li>
            <a href={signin} className="group flex h-full flex-col gap-2 border border-ink/15 bg-paper p-6 shadow-lg transition-colors hover:bg-paper-2" data-elixir="signin">
              <span className="self-start bg-paper-2 px-3 py-1 text-xs font-bold uppercase tracking-widest">{t("Already a member?")}</span>
              <span className="display text-3xl">{t("Check your points")}</span>
              <span className="text-muted">{t("Sign in to see your balance and what you can spend it on.")}</span>
              <span className="btn btn-sm btn-ink mt-2 self-start">{t("Sign in")} <span aria-hidden>&rarr;</span></span>
            </a>
          </li>
        </ul>
      </section>

      <section className="mt-16 grid gap-10 md:grid-cols-2" aria-labelledby="ex-earn-h">
        <div>
          <h2 id="ex-earn-h" className="display text-2xl sm:text-3xl">{t("What you earn")}</h2>
          <p className="mt-5 text-3xl font-extrabold">{t("{earn} point for every £1", { earn: rate.earnPerGbp })}</p>
          <p className="mt-3 text-muted">{t("Spend £{amount} and collect {pts} points, worth £{worth}.", { amount: example, pts, worth })}</p>
        </div>
        <div>
          <h2 className="display text-2xl sm:text-3xl">{t("Where to spend it")}</h2>
          <p className="mt-5 text-muted">{t("Across the Sparkthunder family: this shop, Knightverge, Miss Petty and every brand we add. {redeem} points are worth £1.", { redeem: rate.redeemPerGbp })}</p>
        </div>
      </section>

      <section className="mt-16" aria-labelledby="ex-how-h">
        <h2 id="ex-how-h" className="display text-2xl sm:text-3xl">{t("How it works")}</h2>
        <ol className="mt-6 grid gap-6 sm:grid-cols-3">
          {[["Join", "Make a free Elixir account with your email."], ["Shop", "Order as normal. Points are added once your order is on its way."], ["Spend", "Use your points on later orders across the brands."]].map(([h, d], i) => (
            <li key={h} className="border-t-2 border-ink pt-4"><span className="text-sm font-bold text-muted">0{i + 1}</span><h3 className="mt-1 text-xl font-bold">{t(h)}</h3><p className="mt-1 text-muted">{t(d)}</p></li>
          ))}
        </ol>
      </section>

      <section className="mt-16" aria-labelledby="ex-faq-h">
        <h2 id="ex-faq-h" className="display text-2xl sm:text-3xl">{t("Elixir Points questions")}</h2>
        <div className="mt-6 max-w-3xl divide-y divide-ink/15 border-y border-ink/15">
          {FAQ.map((f) => (
            <details key={f.q} className="group py-4"><summary className="cursor-pointer list-none font-bold marker:hidden">{f.q}</summary><p className="mt-2 text-muted">{f.a}</p></details>
          ))}
        </div>
        <p className="mt-8 text-muted">{t("Want to know more?")} <a href={ELIXIR_URL} className="font-bold underline underline-offset-4">elixirpoints.com</a>. <Link href="/delivery-returns" className="font-bold underline underline-offset-4">{t("Delivery and returns")}</Link>.</p>
      </section>
    </>
  );
}
