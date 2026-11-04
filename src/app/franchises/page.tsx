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
  description: "Browse official merchandise by franchise: Knightverge, Grim Gala and every universe in the Sparkthunder family.",
  path: "/franchises",
});

export default async function FranchisesPage() {
  const franchises = await getFranchises();
  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: "Home", path: "/" }, { name: "Franchises", path: "/franchises" }])} />
      <div className="pt-8"><Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Franchises" }]} /></div>
      <h1 className="display mt-6 text-[clamp(3.5rem,8vw,7rem)]">Shop by franchise</h1>
      <p className="prose-lore mt-6 text-muted">Every Sparkthunder universe has its own range of official merchandise. Pick a franchise to explore apparel, collectibles, drinkware, prints and tabletop gear.</p>
      <div className="mt-12 grid gap-0 md:grid-cols-2">
        {franchises.map((f) => (
          <Link key={f.slug} href={`/franchises/${f.slug}`} style={worldStyle(f.accent)} className="world group block p-8 sm:p-12">
            <h2 className="display text-6xl group-hover:underline group-hover:decoration-bolt group-hover:decoration-4 group-hover:underline-offset-8 sm:text-7xl">{f.name}</h2>
            <p className="serif mt-4 max-w-sm text-xl italic" style={{ color: "var(--world-bright)" }}>{f.tagline}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
