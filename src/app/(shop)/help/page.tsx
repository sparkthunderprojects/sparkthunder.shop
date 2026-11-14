import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import Link from "@/components/LocaleLink";
import { connection } from "next/server";
import { CategoryTile, HelpHero, HelpJobs } from "@/components/HelpUi";
import { JsonLd } from "@/components/JsonLd";
import { getHelp } from "@/lib/help-ctx";
import { HELP_CATEGORIES, helpPath, popularArticles } from "@/lib/help";
import { breadcrumbLd } from "@/lib/seo";
import { buildMetadata } from "@/lib/seo-metadata";
import { getStore } from "@/lib/store";

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const store = await getStore();
  const { t } = await getT();
  return buildMetadata({ title: t("Help Centre"), description: t("Answers about orders, delivery, returns, payments and gift cards from the {store} team.", { store: store.name }), path: "/help" });
}

export default async function HelpHome() {
  await connection();
  const { t } = await getT();
  const [store, { ctx, articles, original }] = await Promise.all([getStore(), getHelp()]);
  const popular = popularArticles(articles);
  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: t("Home"), path: "/" }, { name: t("Help Centre"), path: "/help" }])} />
      <HelpHero store={store} crumbs={[{ name: t("Home"), href: "/" }, { name: t("Help Centre") }]} title={t("Welcome to {store} Help Centre", { store: store.name })} big panels={original} />
      <HelpJobs />

      <section className="mt-16" aria-labelledby="sections-h">
        <h2 id="sections-h" className="display text-2xl sm:text-3xl">{t("Help Centre sections")}</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {HELP_CATEGORIES.map((c) => <li key={c.slug}><CategoryTile {...c} title={t(c.title)} blurb={t(c.blurb)} /></li>)}
        </ul>
      </section>

      <section className="mt-16" aria-labelledby="popular-h">
        <h2 id="popular-h" className="display text-2xl sm:text-3xl">{t("Popular topics")}</h2>
        <ul className="mt-6 grid gap-x-10 sm:grid-cols-2">
          {popular.map((a) => (
            <li key={a.slug} className="border-b border-ink/10"><Link href={helpPath(a) as never} className="flex items-center justify-between gap-4 py-4 font-semibold hover:text-bolt" data-helppopular={a.slug}>{a.title}<span aria-hidden>&rsaquo;</span></Link></li>
          ))}
        </ul>
      </section>

      <section className="mt-16 border border-ink/15 bg-paper-2 p-8" aria-labelledby="contact-h">
        <h2 id="contact-h" className="display text-2xl sm:text-3xl">{t("Contact us")}</h2>
        <p className="mt-3 max-w-2xl text-muted">{t("Cannot find what you need? Send us a message and we will reply by email.")}{ctx.email ? t(" You can also write to {email}.", { email: ctx.email }) : ""}</p>
        <Link href="/help/contact" className="btn mt-6 inline-block" data-help="contact-link">{t("Email us")}</Link>
      </section>
    </>
  );
}
