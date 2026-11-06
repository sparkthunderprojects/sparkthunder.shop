import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { getCharacters } from "@/lib/characters";
import { breadcrumbLd } from "@/lib/seo";
import { buildMetadata } from "@/lib/seo-metadata";

export const revalidate = 300;
export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({ title: "Shop by character", description: "Find official Sparkthunder merchandise for your favourite Knightverge and Occult Inc characters.", path: "/characters" });
}

export default async function CharactersPage() {
  const list = await getCharacters();
  return (
    <div>
      <JsonLd data={breadcrumbLd([{ name: "Home", path: "/" }, { name: "Shop by character", path: "/characters" }])} />
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Shop by character" }]} />
      <h1 className="display mt-6 text-4xl sm:text-5xl">Shop by character</h1>
      <p className="serif mt-3 max-w-2xl text-xl text-muted">Pick a hero, villain or legend and see everything made for them.</p>
      {list.length === 0 ? <p className="mt-10 text-muted">Character merchandise is on its way.</p> : (
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => (
            <li key={c.slug} className="border border-ink/15 p-5"><Link href={`/characters/${c.slug}`} className="display link-line text-xl">{c.name}</Link><p className="mt-1 text-sm text-muted">{c.count} {c.count === 1 ? "product" : "products"}</p></li>
          ))}
        </ul>
      )}
    </div>
  );
}
