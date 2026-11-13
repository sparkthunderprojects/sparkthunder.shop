import type { Metadata } from "next";
import Link from "@/components/LocaleLink";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { HelpBlocks, HelpSearch } from "@/components/HelpUi";
import { JsonLd } from "@/components/JsonLd";
import { getHelp } from "@/lib/help-ctx";
import { articleBySlug, categoryBySlug, helpPath, relatedArticles } from "@/lib/help";
import { breadcrumbLd } from "@/lib/seo";
import { buildMetadata } from "@/lib/seo-metadata";

type P = { params: Promise<{ category: string; article: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  await connection();
  const { category, article } = await params;
  const { articles } = await getHelp();
  const a = articleBySlug(articles, category, article);
  if (!a) return {};
  return buildMetadata({ title: a.title, description: a.summary, path: helpPath(a) });
}

export default async function HelpArticlePage({ params }: P) {
  await connection();
  const { category, article } = await params;
  const cat = categoryBySlug(category);
  const { articles } = await getHelp();
  const a = articleBySlug(articles, category, article);
  if (!cat || !a) notFound();
  const related = relatedArticles(articles, a);
  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: "Home", path: "/" }, { name: "Help Centre", path: "/help" }, { name: cat.title, path: `/help/${cat.slug}` }, { name: a.title, path: helpPath(a) }])} />
      <div className="pt-8"><Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Help Centre", href: "/help" }, { name: cat.title, href: `/help/${cat.slug}` }, { name: a.title }]} /></div>
      <HelpSearch className="mt-6 !max-w-xl border border-ink/15" />
      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_18rem]">
        <article>
          <h1 className="display text-[clamp(1.8rem,3.6vw,2.8rem)]">{a.title}</h1>
          <p className="mt-4 text-lg text-muted">{a.summary}</p>
          <div className="mt-8"><HelpBlocks blocks={a.blocks} /></div>
          <div className="mt-12 border border-ink/15 bg-paper-2 p-6">
            <p className="font-bold">Still need help?</p>
            <p className="mt-1 text-muted">Send us a message and we will reply by email.</p>
            <Link href="/help/contact" className="btn mt-4 inline-block">Contact us</Link>
          </div>
        </article>
        {related.length > 0 && (
          <aside aria-label="Related articles"><h2 className="font-bold">Related articles</h2>
            <ul className="mt-4">{related.map((r) => <li key={r.slug} className="border-b border-ink/10"><Link href={helpPath(r) as never} className="block py-3 hover:text-bolt">{r.title}</Link></li>)}</ul>
          </aside>
        )}
      </div>
    </>
  );
}
