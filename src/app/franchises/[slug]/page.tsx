import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { Listing } from "@/components/Listing";
import { getCategories, getFranchise, getFranchises, getProducts } from "@/lib/catalog";
import { breadcrumbLd, buildMetadata, clip, itemListLd } from "@/lib/seo";
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
  return buildMetadata({
    title: `${f.name} Merchandise & Official Store`,
    description: clip(`Shop official ${f.name} merchandise. ${f.tagline} ${f.description}`),
    path: `/franchises/${f.slug}`,
  });
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
        <h1 className="display mt-10 text-[clamp(4.5rem,14vw,12rem)]">{franchise.name}<span className="sr-only"> merchandise</span></h1>
        <p className="serif mt-4 text-2xl italic" style={{ color: "var(--world-bright)" }}>{franchise.tagline}</p>
        <p className="prose-lore mt-8 text-paper/85">{franchise.description}</p>
        {used.length > 0 && (
          <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-3" aria-label={`${franchise.name} categories`}>
            {used.map((c) => (
              <li key={c.slug}><Link href={`/categories/${c.slug}?franchise=${franchise.slug}`} className="link-line font-bold">{c.name}</Link></li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-16" aria-labelledby="all-h">
        <h2 id="all-h" className="display text-5xl">All {franchise.name} products</h2>
        {products.length === 0 ? (
          <p className="serif mt-6 text-xl text-muted">New {franchise.name} merchandise is on its way.</p>
        ) : (
          <div className="mt-8"><Listing products={products} franchiseNames={{ [franchise.slug]: franchise.name }} categoryNames={Object.fromEntries(categories.map((c) => [c.slug, c.name]))} /></div>
        )}
      </section>
    </div>
  );
}
