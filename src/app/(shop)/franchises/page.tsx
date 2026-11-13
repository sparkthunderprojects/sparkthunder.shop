import { FranchiseLogo } from "@/components/FranchiseLogo";
import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CharacterCarousel } from "@/components/CharacterCarousel";
import { JsonLd } from "@/components/JsonLd";
import { getAllProducts, getFranchises } from "@/lib/catalog";
import { homeList } from "@/lib/character-config";
import { getCharacters } from "@/lib/characters";
import { breadcrumbLd } from "@/lib/seo";
import { buildMetadata } from "@/lib/seo-metadata";
import { worldStyle } from "@/lib/theme";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "All Franchises",
    description: "Browse official merchandise by franchise: Knightverge, Occult Inc and every universe in the Sparkthunder family.",
    path: "/franchises",
  });
}

export default async function FranchisesPage() {
  const [franchises, products, characters] = await Promise.all([getFranchises(), getAllProducts(), getCharacters()]);
  const count = (slug: string) => products.filter((p) => p.franchiseSlug === slug).length;
  const nameBySlug = Object.fromEntries(franchises.map((f) => [f.slug, f.name]));
  const chars = homeList(characters);
  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: "Home", path: "/" }, { name: "Franchises", path: "/franchises" }])} />

      <section className="relative -mx-(--gutter) text-white overflow-hidden px-(--gutter) pb-14 pt-5" data-franchises="hero" style={{ background: "linear-gradient(180deg, var(--store-dark, #000) 0%, color-mix(in srgb, var(--store-dark, #000) 70%, var(--color-bolt, #ffd400)) 160%)" }}>
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-40" style={{ backgroundImage: "radial-gradient(1.5px 1.5px at 12% 30%, #fff 50%, transparent), radial-gradient(1px 1px at 28% 70%, #fff 50%, transparent), radial-gradient(2px 2px at 47% 22%, #fff 50%, transparent), radial-gradient(1px 1px at 63% 60%, #fff 50%, transparent), radial-gradient(1.5px 1.5px at 81% 35%, #fff 50%, transparent), radial-gradient(1px 1px at 92% 78%, #fff 50%, transparent)" }} />
        <div className="relative"><Breadcrumbs tone="world" items={[{ name: "Home", href: "/" }, { name: "Franchises" }]} /></div>
        <div className="relative mx-auto mt-10 max-w-3xl text-center">
          <h1 className="display text-[clamp(2.25rem,5vw,4.25rem)]">Shop by franchise</h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">Every universe has its own range of official merchandise. Pick a franchise to explore apparel, collectibles, drinkware, prints and tabletop gear.</p>
        </div>
      </section>

      <section className="mt-10" aria-label="Franchises">
        <ul className="flex flex-wrap justify-center gap-3 md:gap-4">
          {franchises.map((f) => (
            <li key={f.slug} className="w-[calc(50%-0.375rem)] md:w-[calc(33.333%-0.7rem)] xl:w-[calc(25%-0.75rem)]">
              <Link href={`/franchises/${f.slug}`} style={worldStyle(f.accent)} className="world group relative flex aspect-square flex-col items-center justify-center gap-3 overflow-hidden p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-12px_var(--color-world)]" data-franchise={f.slug}>
                <span aria-hidden className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: "radial-gradient(80% 80% at 50% 40%, color-mix(in oklab, var(--color-world) 45%, transparent), transparent 70%)" }} />
                <span className="relative flex h-1/2 w-full items-center justify-center">
                  <FranchiseLogo slug={f.slug} name={f.name} className="max-h-full !self-center !object-center" textClassName="display text-3xl sm:text-4xl" />
                </span>
                <span className="relative text-xs font-bold uppercase tracking-widest text-white/70">{count(f.slug)} {count(f.slug) === 1 ? "product" : "products"}</span>
                <span className="relative text-sm font-semibold opacity-90 transition-opacity group-hover:opacity-100">Shop {f.name} <span aria-hidden>&rarr;</span></span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {chars.length > 0 && <CharacterCarousel id="franchises-characters" title="Shop by character" viewAllHref="/characters" items={chars.map((c) => ({ slug: c.slug, name: c.name, image: c.image, franchise: nameBySlug[c.franchiseSlug], accent: franchises.find((f) => f.slug === c.franchiseSlug)?.accent }))} />}
    </>
  );
}
