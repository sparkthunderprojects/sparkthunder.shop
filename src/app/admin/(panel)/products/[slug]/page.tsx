import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { getProductRaw, listCategories, listFranchises, listMedia } from "@/lib/admin/repo";
import type { Product } from "@/lib/types";
import { ProductEditor } from "./ProductEditor";

export async function generateMetadata({ params }: PageProps<"/admin/products/[slug]">) {
  const { slug } = await params;
  return { title: slug === "new" ? "New product" : "Edit product" };
}

export default async function EditProduct({ params }: PageProps<"/admin/products/[slug]">) {
  const { slug } = await params;
  const { db } = await requireAdmin();
  const [franchises, categories, media] = await Promise.all([listFranchises(db), listCategories(db), listMedia(db)]);
  let product: Product | null = null;
  if (slug !== "new") { product = await getProductRaw(db, slug); if (!product) notFound(); }
  const blank: Product = {
    slug: "", sku: "", name: "", franchiseSlug: franchises[0]?.slug ?? "", categorySlug: categories[0]?.slug ?? "", pricePence: 0,
    shortDescription: "", description: "", details: [], images: [], inStock: true, isNew: true, isFeatured: false, createdAt: new Date().toISOString().slice(0, 10), published: false,
    imageAlts: [], tags: [], variants: [], trackStock: false, stockQty: 0, lowStockThreshold: 3,
  };
  return <ProductEditor initial={product ?? blank} isNew={!product} franchises={franchises} categories={categories} media={media} />;
}
