import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { getFranchises } from "@/lib/catalog";
import { breadcrumbLd, buildMetadata } from "@/lib/seo";

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
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Franchises" }]} />
      <h1 className="text-4xl font-extrabold">Shop by franchise</h1>
      <p className="mt-3 max-w-2xl text-muted">Every Sparkthunder universe has its own range of official merchandise. Pick a franchise to explore apparel, collectibles, drinkware, prints and tabletop gear.</p>
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {franchises.map((f) => (
          <Link key={f.slug} href={`/franchises/${f.slug}`} style={{ ["--color-accent" as string]: f.accent }} className="group rounded-2xl border border-white/10 bg-panel p-8 hover:border-accent">
            <h2 className="text-2xl font-extrabold group-hover:text-accent">{f.name}</h2>
            <p className="mt-2 text-muted">{f.tagline}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
