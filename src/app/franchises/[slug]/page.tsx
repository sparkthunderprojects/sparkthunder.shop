import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { ProductCard } from "@/components/ProductCard";
import { getCategories, getFranchise, getFranchises, getProducts } from "@/lib/catalog";
import { breadcrumbLd, buildMetadata, clip, itemListLd } from "@/lib/seo";

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
    <div style={{ ["--color-accent" as string]: franchise.accent }}>
      <JsonLd data={[
        breadcrumbLd([{ name: "Home", path: "/" }, { name: "Franchises", path: "/franchises" }, { name: franchise.name, path }]),
        itemListLd(`${franchise.name} merchandise`, path, products),
      ]} />
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Franchises", href: "/franchises" }, { name: franchise.name }]} />
      <h1 className="text-4xl font-extrabold sm:text-5xl">{franchise.name} Merchandise</h1>
      <p className="mt-3 text-xl text-accent">{franchise.tagline}</p>
      <p className="mt-6 max-w-3xl leading-relaxed text-muted">{franchise.description}</p>

      {used.length > 0 && (
        <ul className="mt-8 flex flex-wrap gap-3" aria-label={`${franchise.name} categories`}>
          {used.map((c) => (
            <li key={c.slug}>
              <Link href={`/categories/${c.slug}?franchise=${franchise.slug}`} className="rounded-full border border-white/15 px-4 py-2 text-sm hover:border-accent hover:text-accent">{c.name}</Link>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-12 text-2xl font-bold">All {franchise.name} products</h2>
      {products.length === 0 ? (
        <p className="mt-4 text-muted">New {franchise.name} merchandise is on its way. Check back soon.</p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {products.map((p, i) => <ProductCard key={p.slug} product={p} priority={i < 4} />)}
        </div>
      )}
    </div>
  );
}
