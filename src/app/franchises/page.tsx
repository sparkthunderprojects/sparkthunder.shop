import { FranchiseLogo } from "@/components/FranchiseLogo";
import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { getFranchises } from "@/lib/catalog";
import { breadcrumbLd, buildMetadata } from "@/lib/seo";
import { worldStyle } from "@/lib/theme";

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: "All Franchises",
  description: "Browse official merchandise by franchise: Knightverge, Occult Inc and every universe in the Sparkthunder family.",
  path: "/franchises",
});

export default async function FranchisesPage() {
  const franchises = await getFranchises();
  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: "Home", path: "/" }, { name: "Franchises", path: "/franchises" }])} />
      <div className="pt-8"><Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Franchises" }]} /></div>
      <h1 className="display mt-6 text-[clamp(2rem,4.2vw,3.25rem)]">Shop by franchise</h1>
      <p className="prose-lore mt-6 text-muted">Every Sparkthunder universe has its own range of official merchandise. Pick a franchise to explore apparel, collectibles, drinkware, prints and tabletop gear.</p>
      <div className="mt-12 grid gap-0 md:grid-cols-2">
        {franchises.map((f) => (
          <Link key={f.slug} href={`/franchises/${f.slug}`} style={worldStyle(f.accent)} className="world group block p-8 sm:p-12">
            <h2><FranchiseLogo slug={f.slug} name={f.name} className="h-16 sm:h-24" textClassName="display text-3xl sm:text-7xl" /></h2>
            <p className="serif mt-4 max-w-sm text-xl" style={{ color: "var(--world-bright)" }}>{f.tagline}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
