import Link from "next/link";
import { ProductImage } from "@/components/ProductImage";
import { formatPrice } from "@/lib/site";
import type { Product } from "@/lib/types";

export function ProductCard({ product, franchiseName, priority = false }: { product: Product; franchiseName?: string; priority?: boolean }) {
  const badge = !product.inStock ? "Sold out" : product.comparePricePence ? "Sale" : product.isNew ? "New" : null;
  return (
    <article>
      <Link href={`/products/${product.slug}`} className="group block">
        <div className="relative border-2 border-ink bg-paper-2">
          <ProductImage product={product} priority={priority} sizes="(min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw" />
          {badge && (
            <span className={`absolute left-0 top-0 px-3 py-1 text-sm font-bold ${badge === "New" ? "bg-bolt text-ink" : "bg-ink text-paper"}`}>{badge}</span>
          )}
        </div>
        <h3 className="mt-3 font-bold leading-snug decoration-2 underline-offset-4 group-hover:underline">{product.name}</h3>
        <p className="mt-1 flex items-baseline justify-between gap-3 text-sm">
          <span className="text-muted">{franchiseName}</span>
          <span className="flex items-baseline gap-2">
            {product.comparePricePence && <s className="text-muted">{formatPrice(product.comparePricePence)}</s>}
            <span className="text-base font-bold">{formatPrice(product.pricePence)}</span>
          </span>
        </p>
      </Link>
    </article>
  );
}
