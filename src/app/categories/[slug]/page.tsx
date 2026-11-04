import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { ProductCard } from "@/components/ProductCard";
import { getCategories, getCategory, getFranchises, getProducts } from "@/lib/catalog";
import { breadcrumbLd, buildMetadata, clip, itemListLd } from "@/lib/seo";

export async function generateMetadata(props: PageProps<"/categories/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const { franchise } = await props.searchParams;
  const c = await getCategory(slug);
  if (!c) return { title: "Category not found", robots: { index: false } };
  // Filtered views are a faceted-navigation duplicate: canonical to the base page, keep out of the index.
  return buildMetadata({
    title: `${c.name} - Official Sparkthunder Merchandise`,
    description: clip(`Shop official ${c.name.toLowerCase()} from Knightverge, Grim Gala and the Sparkthunder universe. ${c.description}`),
    path: `/categories/${c.slug}`,
    noindex: Boolean(franchise),
  });
}

export default async function CategoryPage(props: PageProps<"/categories/[slug]">) {
  const { slug } = await props.params;
  const sp = await props.searchParams;
  const franchiseFilter = typeof sp.franchise === "string" ? sp.franchise : undefined;

  const category = await getCategory(slug);
  if (!category) notFound();
  const [franchises, products] = await Promise.all([getFranchises(), getProducts({ category: slug, franchise: franchiseFilter })]);
  const nameBySlug = Object.fromEntries(franchises.map((f) => [f.slug, f.name]));
  const path = `/categories/${slug}`;

  return (
    <>
      <JsonLd data={[
        breadcrumbLd([{ name: "Home", path: "/" }, { name: category.name, path }]),
        itemListLd(category.name, path, products),
      ]} />
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: category.name }]} />
      <h1 className="text-4xl font-extrabold">{category.name}</h1>
      <p className="mt-5 max-w-3xl leading-relaxed text-muted">{category.description}</p>

      <ul className="mt-8 flex flex-wrap gap-3" aria-label="Filter by franchise">
        <li><Link href={path} className={`rounded-full border px-4 py-2 text-sm ${!franchiseFilter ? "border-accent text-accent" : "border-white/15 hover:border-accent"}`}>All</Link></li>
        {franchises.map((f) => (
          <li key={f.slug}>
            <Link href={`${path}?franchise=${f.slug}`} rel="nofollow" className={`rounded-full border px-4 py-2 text-sm ${franchiseFilter === f.slug ? "border-accent text-accent" : "border-white/15 hover:border-accent"}`}>{f.name}</Link>
          </li>
        ))}
      </ul>

      {products.length === 0 ? (
        <p className="mt-10 text-muted">No products match yet. New merchandise is added regularly.</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {products.map((p, i) => <ProductCard key={p.slug} product={p} franchiseName={nameBySlug[p.franchiseSlug]} priority={i < 4} />)}
        </div>
      )}
    </>
  );
}
