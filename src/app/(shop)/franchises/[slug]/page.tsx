import { outbound } from "@/lib/site";
import { franchiseSeo } from "@/lib/seo/effective";
import { FranchiseLogo } from "@/components/FranchiseLogo";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { Listing } from "@/components/Listing";
import { getCategories, getFranchise, getFranchises, getProducts } from "@/lib/catalog";
import { breadcrumbLd, itemListLd } from "@/lib/seo";
import { buildMetadata } from "@/lib/seo-metadata";
import { worldStyle } from "@/lib/theme";

export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  return (await getFranchises()).map((f) => ({ slug: f.slug }));
}

export async function generateMetadata(props: PageProps<"/franchises/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const f = await getFranchise(slug);
  if (!f) return { title: "Franchise not found", robots: { index: false } };
  const seo = franchiseSeo(f);
  return buildMetadata({ title: seo.title, description: seo.description, path: seo.path, image: seo.image, noindex: seo.noindex });
}

export default async function FranchisePage(props: PageProps<"/franchises/[slug]">) {
  const { slug } = await props.params;
  const franchise = await getFranchise(slug);
  if (!franchise) notFound();
  const [products, categories] = await Promise.all([getProducts({ franchise: slug }), getCategories()]);
  const used = categories.filter((c) => products.some((p) => p.categorySlug === c.slug));
  const path = `/franchises/${slug}`;

  return (
    <div style={worldStyle(franchise.accent)}>
      <JsonLd data={[
        breadcrumbLd([{ name: "Home", path: "/" }, { name: "Franchises", path: "/franchises" }, { name: franchise.name, path }]),
        itemListLd(`${franchise.name} merchandise`, path, products),
      ]} />

      <section className="world bleed pb-16 pt-8">
        <Breadcrumbs tone="world" items={[{ name: "Home", href: "/" }, { name: "Franchises", href: "/franchises" }, { name: franchise.name }]} />
        <h1 className="mt-10"><FranchiseLogo slug={franchise.slug} name={franchise.name} priority className="h-20 sm:h-28 md:h-36" textClassName="display text-[clamp(2.75rem,7vw,5.5rem)]" /><span className="sr-only"> merchandise</span></h1>
        <p className="serif mt-4 text-2xl" style={{ color: "var(--world-bright)" }}>{franchise.tagline}</p>
        <p className="prose-lore mt-8 text-paper/85">{franchise.description}</p>
        {franchise.siteUrl ? <p className="mt-6"><a href={outbound(franchise.siteUrl, "franchise-page")} target="_blank" rel="noopener" className="link-line font-bold">Explore the {franchise.name} universe at {franchise.siteUrl.replace(/^https?:\/\//, "")} <span aria-hidden>↗</span><span className="sr-only"> (opens in a new tab)</span></a></p> : null}
        {used.length > 0 && (
          <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-3" aria-label={`${franchise.name} categories`}>
            {used.map((c) => (
              <li key={c.slug}><Link href={`/categories/${c.slug}?franchise=${franchise.slug}`} className="link-line font-bold">{c.name}</Link></li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-16" aria-labelledby="all-h">
        <h2 id="all-h" className="display text-2xl sm:text-3xl">All {franchise.name} products</h2>
        {products.length === 0 ? (
          <p className="serif mt-6 text-xl text-muted">New {franchise.name} merchandise is on its way.</p>
        ) : (
          <div className="mt-8"><Listing products={products} franchiseNames={{ [franchise.slug]: franchise.name }} categoryNames={Object.fromEntries(categories.map((c) => [c.slug, c.name]))} flush /></div>
        )}
      </section>
    </div>
  );
}
