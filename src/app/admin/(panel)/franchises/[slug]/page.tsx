import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { listFranchises, listProducts } from "@/lib/admin/repo";
import { TaxonomyEditor } from "../../../TaxonomyEditor";

export default async function Edit({ params }: PageProps<"/admin/franchises/[slug]">) {
  const { slug } = await params;
  const { db } = await requireAdmin("catalogue");
  const [items, products] = await Promise.all([listFranchises(db), listProducts(db)]);
  const found = items.find((i) => i.slug === slug);
  if (slug !== "new" && !found) notFound();
  const initial = found ?? ({ slug: "", name: "", tagline: "", description: "", accent: "#7c3aed", sortOrder: (items.length + 1) * 10 });
  return <TaxonomyEditor kind="franchises" initial={initial} isNew={!found} productCount={products.filter((p) => p.franchiseSlug === slug).length} />;
}
