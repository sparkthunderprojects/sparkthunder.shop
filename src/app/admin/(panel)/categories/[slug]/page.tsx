import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { listCategories, listProducts } from "@/lib/admin/repo";
import { TaxonomyEditor } from "../../../TaxonomyEditor";

export default async function Edit({ params }: PageProps<"/admin/categories/[slug]">) {
  const { slug } = await params;
  const { db } = await requireAdmin();
  const [items, products] = await Promise.all([listCategories(db), listProducts(db)]);
  const found = items.find((i) => i.slug === slug);
  if (slug !== "new" && !found) notFound();
  const initial = found ?? ({ slug: "", name: "", description: "", sortOrder: (items.length + 1) * 10 });
  return <TaxonomyEditor kind="categories" initial={initial} isNew={!found} productCount={products.filter((p) => p.categorySlug === slug).length} />;
}
