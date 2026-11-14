import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import Link from "@/components/LocaleLink";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { CategoryTile, HelpHero } from "@/components/HelpUi";
import { JsonLd } from "@/components/JsonLd";
import { getHelp } from "@/lib/help-ctx";
import { articlesIn, categoryBySlug, HELP_CATEGORIES, helpPath } from "@/lib/help";
import { breadcrumbLd } from "@/lib/seo";
import { buildMetadata } from "@/lib/seo-metadata";
import { getStore } from "@/lib/store";

type P = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const c = categoryBySlug((await params).category);
  if (!c) return {};
  const { t } = await getT();
  return buildMetadata({ title: t("{name} help", { name: t(c.title) }), description: t(c.blurb), path: `/help/${c.slug}` });
}

export default async function HelpCategoryPage({ params }: P) {
  await connection();
  const { t } = await getT();
  const c = categoryBySlug((await params).category);
  if (!c) notFound();
  const [store, { articles }] = await Promise.all([getStore(), getHelp()]);
  const list = articlesIn(articles, c.slug);
  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: t("Home"), path: "/" }, { name: t("Help Centre"), path: "/help" }, { name: t(c.title), path: `/help/${c.slug}` }])} />
      <HelpHero store={store} crumbs={[{ name: t("Home"), href: "/" }, { name: t("Help Centre"), href: "/help" }, { name: t(c.title) }]} title={t(c.title)} />
      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_18rem]">
        <ul aria-label={t("{name} articles", { name: t(c.title) })}>
          {list.map((a) => (
            <li key={a.slug} className="border-b border-ink/10 py-5" data-helparticle={a.slug}>
              <Link href={helpPath(a) as never} className="text-lg font-bold hover:text-bolt">{a.title}</Link>
              <p className="mt-1 text-muted">{a.summary}</p>
            </li>
          ))}
        </ul>
        <aside aria-label={t("Other sections")}><h2 className="font-bold">{t("Other sections")}</h2>
          <ul className="mt-4 grid gap-3">{HELP_CATEGORIES.filter((x) => x.slug !== c.slug).slice(0, 5).map((x) => <li key={x.slug}><CategoryTile {...x} title={t(x.title)} blurb={t(x.blurb)} /></li>)}</ul>
        </aside>
      </div>
    </>
  );
}
