import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { Listing } from "@/components/Listing";
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
      <div className="pt-8"><Breadcrumbs items={[{ name: "Home", href: "/" }, { name: category.name }]} /></div>
      <h1 className="display mt-6 text-[clamp(2rem,4.2vw,3.25rem)]">{category.name}</h1>
      <p className="prose-lore mt-6 text-muted">{category.description}</p>

      <ul className="mt-10 flex flex-wrap gap-x-7 gap-y-2 border-y border-ink/15 py-4" aria-label="Filter by franchise">
        <li><Link href={path} aria-current={!franchiseFilter ? "page" : undefined} className={`font-bold ${!franchiseFilter ? "link-line" : "text-muted hover:text-ink"}`}>All franchises</Link></li>
        {franchises.map((f) => (
          <li key={f.slug}>
            <Link href={`${path}?franchise=${f.slug}`} rel="nofollow" aria-current={franchiseFilter === f.slug ? "page" : undefined} className={`font-bold ${franchiseFilter === f.slug ? "link-line" : "text-muted hover:text-ink"}`}>{f.name}</Link>
          </li>
        ))}
      </ul>

      {products.length === 0 ? (
        <p className="serif mt-10 text-xl text-muted">Nothing here yet. New merchandise is added regularly.</p>
      ) : (
        <div className="mt-10"><Listing products={products} franchiseNames={nameBySlug} flush /></div>
      )}
    </>
  );
}
