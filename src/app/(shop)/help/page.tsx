import type { Metadata } from "next";
import Link from "next/link";
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
  return buildMetadata({ title: "Help Centre", description: `Answers about orders, delivery, returns, payments and gift cards from the ${store.name} team.`, path: "/help" });
}

export default async function HelpHome() {
  await connection();
  const [store, { ctx, articles }] = await Promise.all([getStore(), getHelp()]);
  const popular = popularArticles(articles);
  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: "Home", path: "/" }, { name: "Help Centre", path: "/help" }])} />
      <HelpHero store={store} crumbs={[{ name: "Home", href: "/" }, { name: "Help Centre" }]} title={`Welcome to ${store.name} Help Centre`} big />
      <HelpJobs />

      <section className="mt-16" aria-labelledby="sections-h">
        <h2 id="sections-h" className="display text-2xl sm:text-3xl">Help Centre sections</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {HELP_CATEGORIES.map((c) => <li key={c.slug}><CategoryTile {...c} /></li>)}
        </ul>
      </section>

      <section className="mt-16" aria-labelledby="popular-h">
        <h2 id="popular-h" className="display text-2xl sm:text-3xl">Popular topics</h2>
        <ul className="mt-6 grid gap-x-10 sm:grid-cols-2">
          {popular.map((a) => (
            <li key={a.slug} className="border-b border-ink/10"><Link href={helpPath(a) as never} className="flex items-center justify-between gap-4 py-4 font-semibold hover:text-bolt" data-helppopular={a.slug}>{a.title}<span aria-hidden>&rsaquo;</span></Link></li>
          ))}
        </ul>
      </section>

      <section className="mt-16 border border-ink/15 bg-paper-2 p-8" aria-labelledby="contact-h">
        <h2 id="contact-h" className="display text-2xl sm:text-3xl">Contact us</h2>
        <p className="mt-3 max-w-2xl text-muted">Cannot find what you need? Send us a message and we will reply by email.{ctx.email ? ` You can also write to ${ctx.email}.` : ""}</p>
        <Link href="/help/contact" className="btn mt-6 inline-block" data-help="contact-link">Email us</Link>
      </section>
    </>
  );
}
