import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { Listing } from "@/components/Listing";
import { getCategories, getFranchises } from "@/lib/catalog";
import { characterName, getCharacterProducts, getCharacters } from "@/lib/characters";
import { breadcrumbLd, buildMetadata, itemListLd } from "@/lib/seo";

export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  return (await getCharacters()).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata(props: PageProps<"/characters/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const products = await getCharacterProducts(slug);
  if (!products.length) return { title: "Character not found", robots: { index: false } };
  const name = characterName(slug);
  return buildMetadata({ title: `${name} merchandise`, description: `Official ${name} merchandise: ${products.slice(0, 3).map((p) => p.name).join(", ")} and more from Sparkthunder.`, path: `/characters/${slug}` });
}

export default async function CharacterPage(props: PageProps<"/characters/[slug]">) {
  const { slug } = await props.params;
  const products = await getCharacterProducts(slug);
  if (!products.length) notFound();
  const [franchises, categories] = await Promise.all([getFranchises(), getCategories()]);
  const name = characterName(slug);
  const path = `/characters/${slug}`;
  return (
    <div>
      <JsonLd data={[breadcrumbLd([{ name: "Home", path: "/" }, { name: "Shop by character", path: "/characters" }, { name, path }]), itemListLd(`${name} merchandise`, path, products)]} />
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Shop by character", href: "/characters" }, { name }]} />
      <h1 className="display mt-6 text-4xl sm:text-5xl">{name} merchandise</h1>
      <div className="mt-10"><Listing products={products} franchiseNames={Object.fromEntries(franchises.map((f) => [f.slug, f.name]))} categoryNames={Object.fromEntries(categories.map((x) => [x.slug, x.name]))} flush /></div>
    </div>
  );
}
