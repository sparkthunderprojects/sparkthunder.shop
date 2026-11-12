import { notFound } from "next/navigation";
import { connection } from "next/server";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { Listing } from "@/components/Listing";
import { getCategories, getFranchises } from "@/lib/catalog";
import Link from "next/link";
import { getCharacter, getCharacterProducts } from "@/lib/characters";
import { breadcrumbLd, itemListLd } from "@/lib/seo";
import { buildMetadata } from "@/lib/seo-metadata";

// Characters are added in the admin at any time and differ per store, so these pages are rendered per request
// (the data behind them is cached) instead of being prebuilt for slugs known at build time.

export async function generateMetadata(props: PageProps<"/characters/[slug]">): Promise<Metadata> {
  await connection();
  const { slug } = await props.params;
  const [c, products] = await Promise.all([getCharacter(slug), getCharacterProducts(slug)]);
  if (!c || !products.length) return { title: "Character not found", robots: { index: false } };
  return buildMetadata({ title: `${c.name} merchandise`, description: c.blurb || `Official ${c.name} merchandise: ${products.slice(0, 3).map((p) => p.name).join(", ")} and more.`, path: `/characters/${slug}`, image: c.image || undefined });
}

export default async function CharacterPage(props: PageProps<"/characters/[slug]">) {
  await connection();
  const { slug } = await props.params;
  const [c, products] = await Promise.all([getCharacter(slug), getCharacterProducts(slug)]);
  if (!c || !products.length) notFound();
  const [franchises, categories] = await Promise.all([getFranchises(), getCategories()]);
  const name = c.name;
  const franchise = franchises.find((f) => f.slug === c.franchiseSlug);
  const path = `/characters/${slug}`;
  return (
    <div>
      <JsonLd data={[breadcrumbLd([{ name: "Home", path: "/" }, { name: "Shop by character", path: "/characters" }, { name, path }]), itemListLd(`${name} merchandise`, path, products)]} />
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Shop by character", href: "/characters" }, { name }]} />
      <div className="mt-6 flex items-end gap-6">
        {c.image
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={c.image} alt={name} width={160} height={200} className="h-40 w-auto max-w-[40vw] object-contain object-bottom sm:h-52" />
          : null}
        <div>
          <h1 className="display text-4xl sm:text-5xl">{name} merchandise</h1>
          {c.blurb ? <p className="serif mt-3 max-w-2xl text-xl text-muted">{c.blurb}</p> : null}
          {franchise ? <p className="mt-3 text-sm"><Link href={`/franchises/${franchise.slug}`} className="link-line font-semibold">More from {franchise.name}</Link></p> : null}
        </div>
      </div>
      <div className="mt-10"><Listing products={products} franchiseNames={Object.fromEntries(franchises.map((f) => [f.slug, f.name]))} categoryNames={Object.fromEntries(categories.map((x) => [x.slug, x.name]))} flush /></div>
    </div>
  );
}
