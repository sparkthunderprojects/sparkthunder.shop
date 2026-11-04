import Link from "next/link";
import type { Metadata } from "next";
import { ProductCard } from "@/components/ProductCard";
import { getFeaturedProducts, getFranchises, getProducts } from "@/lib/catalog";
import { buildMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: `${SITE.name} | Official Knightverge, Grim Gala & Sparkthunder Merchandise`,
  description: "Shop official Sparkthunder merchandise: apparel, collectibles, drinkware, posters and tabletop gear from Knightverge, Grim Gala and more.",
  path: "/",
});

export default async function HomePage() {
  const [franchises, featured, fresh] = await Promise.all([getFranchises(), getFeaturedProducts(8), getProducts({ onlyNew: true })]);
  const nameBySlug = Object.fromEntries(franchises.map((f) => [f.slug, f.name]));

  return (
    <div className="space-y-20">
      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-panel via-ink to-accent/20 px-6 py-16 sm:px-12 sm:py-24">
        <p className="text-sm uppercase tracking-[0.3em] text-accent">The official Sparkthunder store</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-extrabold leading-tight sm:text-6xl">Official merchandise from every Sparkthunder universe</h1>
        <p className="mt-6 max-w-2xl text-lg text-muted">{SITE.description}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/new" className="rounded-full bg-accent px-7 py-3.5 font-semibold text-black hover:brightness-110">Shop new arrivals</Link>
          <Link href="/franchises" className="rounded-full border border-white/20 px-7 py-3.5 font-semibold hover:border-accent hover:text-accent">Browse franchises</Link>
        </div>
      </section>

      <section aria-labelledby="franchises-h">
        <h2 id="franchises-h" className="text-2xl font-bold">Shop by franchise</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {franchises.map((f) => (
            <Link key={f.slug} href={`/franchises/${f.slug}`} style={{ ["--color-accent" as string]: f.accent }} className="group rounded-2xl border border-white/10 bg-panel p-8 transition hover:border-accent">
              <h3 className="text-2xl font-extrabold group-hover:text-accent">{f.name}</h3>
              <p className="mt-2 text-muted">{f.tagline}</p>
              <span className="mt-6 inline-block text-sm font-semibold text-accent">Shop {f.name} →</span>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="featured-h">
        <div className="flex items-end justify-between">
          <h2 id="featured-h" className="text-2xl font-bold">Featured merchandise</h2>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {featured.map((p, i) => <ProductCard key={p.slug} product={p} franchiseName={nameBySlug[p.franchiseSlug]} priority={i < 4} />)}
        </div>
      </section>

      {fresh.length > 0 && (
        <section aria-labelledby="new-h">
          <div className="flex items-end justify-between">
            <h2 id="new-h" className="text-2xl font-bold">New arrivals</h2>
            <Link href="/new" className="text-sm text-accent hover:underline">View all →</Link>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {fresh.slice(0, 4).map((p) => <ProductCard key={p.slug} product={p} franchiseName={nameBySlug[p.franchiseSlug]} />)}
          </div>
        </section>
      )}
    </div>
  );
}
