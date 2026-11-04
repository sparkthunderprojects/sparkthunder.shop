import Link from "next/link";
import { CardActions } from "@/components/CardActions";
import { ProductImage } from "@/components/ProductImage";
import { QuickAdd } from "@/components/QuickAdd";
import { discountPercent, productImagePath, toQuick } from "@/lib/card";
import { formatPrice } from "@/lib/site";
import type { Product } from "@/lib/types";

export function ProductCard({ product, franchiseName, priority = false }: { product: Product; franchiseName?: string; priority?: boolean }) {
  const pct = discountPercent(product);
  const badge = !product.inStock ? "Sold out" : pct ? `-${pct}%` : product.isNew ? "New" : null;
  return (
    <article className="group relative">
      <Link href={`/products/${product.slug}`} className="block">
        <div className="relative border-2 border-ink bg-paper-2">
          <ProductImage product={product} priority={priority} sizes="(min-width:1536px) 16vw, (min-width:1280px) 20vw, (min-width:768px) 33vw, 50vw" />
          {badge && <span className={`absolute left-0 top-0 px-3 py-1 text-sm font-bold ${badge === "New" ? "bg-bolt text-ink" : "bg-ink text-paper"}`}>{badge}</span>}
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
      <CardActions quick={toQuick(product, franchiseName)} />
      {product.inStock && (
        <div className="pointer-events-none absolute inset-x-0 top-0 aspect-square overflow-hidden">
          <QuickAdd item={{ slug: product.slug, name: product.name, pricePence: product.pricePence, image: productImagePath(product) }} />
        </div>
      )}
    </article>
  );
}
