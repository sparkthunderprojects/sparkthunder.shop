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
  return buildMetadata({ title: `${c.title} help`, description: c.blurb, path: `/help/${c.slug}` });
}

export default async function HelpCategoryPage({ params }: P) {
  await connection();
  const c = categoryBySlug((await params).category);
  if (!c) notFound();
  const [store, { articles }] = await Promise.all([getStore(), getHelp()]);
  const list = articlesIn(articles, c.slug);
  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: "Home", path: "/" }, { name: "Help Centre", path: "/help" }, { name: c.title, path: `/help/${c.slug}` }])} />
      <HelpHero store={store} crumbs={[{ name: "Home", href: "/" }, { name: "Help Centre", href: "/help" }, { name: c.title }]} title={c.title} />
      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_18rem]">
        <ul aria-label={`${c.title} articles`}>
          {list.map((a) => (
            <li key={a.slug} className="border-b border-ink/10 py-5" data-helparticle={a.slug}>
              <Link href={helpPath(a) as never} className="text-lg font-bold hover:text-bolt">{a.title}</Link>
              <p className="mt-1 text-muted">{a.summary}</p>
            </li>
          ))}
        </ul>
        <aside aria-label="Other sections"><h2 className="font-bold">Other sections</h2>
          <ul className="mt-4 grid gap-3">{HELP_CATEGORIES.filter((x) => x.slug !== c.slug).slice(0, 5).map((x) => <li key={x.slug}><CategoryTile {...x} /></li>)}</ul>
        </aside>
      </div>
    </>
  );
}
