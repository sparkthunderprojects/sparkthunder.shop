import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AddToCart } from "@/components/AddToCart";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { ProductCard } from "@/components/ProductCard";
import { ProductImage } from "@/components/ProductImage";
import { getAllProducts, getCategory, getFranchise, getFranchises, getProduct, getRelatedProducts } from "@/lib/catalog";
import { breadcrumbLd, buildMetadata, clip, productImageUrl, productLd } from "@/lib/seo";
import { formatPrice } from "@/lib/site";

export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  return (await getAllProducts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata(props: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const p = await getProduct(slug);
  if (!p) return { title: "Product not found", robots: { index: false } };
  const f = await getFranchise(p.franchiseSlug);
  return buildMetadata({
    title: `${p.name}${f ? ` - ${f.name}` : ""} | ${formatPrice(p.pricePence)}`,
    description: clip(`${p.shortDescription} ${p.description}`),
    path: `/products/${p.slug}`,
    image: productImageUrl(p),
  });
}

export default async function ProductPage(props: PageProps<"/products/[slug]">) {
  const { slug } = await props.params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const [franchise, category, related, franchises] = await Promise.all([
    getFranchise(product.franchiseSlug),
    getCategory(product.categorySlug),
    getRelatedProducts(product),
    getFranchises(),
  ]);
  const nameBySlug = Object.fromEntries(franchises.map((f) => [f.slug, f.name]));
  const path = `/products/${product.slug}`;

  return (
    <div style={{ ["--color-accent" as string]: franchise?.accent }}>
      <JsonLd data={[
        productLd(product, franchise, category),
        breadcrumbLd([
          { name: "Home", path: "/" },
          ...(franchise ? [{ name: franchise.name, path: `/franchises/${franchise.slug}` }] : []),
          ...(category ? [{ name: category.name, path: `/categories/${category.slug}` }] : []),
          { name: product.name, path },
        ]),
      ]} />
      <Breadcrumbs items={[
        { name: "Home", href: "/" },
        ...(franchise ? [{ name: franchise.name, href: `/franchises/${franchise.slug}` }] : []),
        ...(category ? [{ name: category.name, href: `/categories/${category.slug}` }] : []),
        { name: product.name },
      ]} />

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <ProductImage product={product} priority sizes="(min-width:1024px) 50vw, 100vw" />
          </div>
        </div>

        <div>
          {franchise && <Link href={`/franchises/${franchise.slug}`} className="text-sm uppercase tracking-widest text-accent hover:underline">{franchise.name}</Link>}
          <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">{product.name}</h1>
          <p className="mt-4 flex items-baseline gap-3 text-2xl">
            <span className="font-bold text-accent">{formatPrice(product.pricePence)}</span>
            {product.comparePricePence && <s className="text-base text-muted">{formatPrice(product.comparePricePence)}</s>}
          </p>
          <p className="mt-1 text-sm text-muted">{product.inStock ? "In stock" : "Currently out of stock"} · SKU {product.sku}</p>
          <p className="mt-6 leading-relaxed text-muted">{product.description}</p>

          <div className="mt-8">
            <AddToCart inStock={product.inStock} item={{ slug: product.slug, name: product.name, pricePence: product.pricePence, image: product.images[0] ?? `/art/${product.slug}` }} />
          </div>

          {product.details.length > 0 && (
            <section className="mt-10" aria-labelledby="details-h">
              <h2 id="details-h" className="text-lg font-bold">Product details</h2>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-muted">
                {product.details.map((d) => <li key={d}>{d}</li>)}
              </ul>
            </section>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-20" aria-labelledby="related-h">
          <h2 id="related-h" className="text-2xl font-bold">You might also like</h2>
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {related.map((p) => <ProductCard key={p.slug} product={p} franchiseName={nameBySlug[p.franchiseSlug]} />)}
          </div>
        </section>
      )}
    </div>
  );
}
