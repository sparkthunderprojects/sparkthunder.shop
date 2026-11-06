import Link from "next/link";
import { CardActions } from "@/components/CardActions";
import { ProductImage } from "@/components/ProductImage";
import { QuickAdd } from "@/components/QuickAdd";
import { QuickViewOverlay } from "@/components/QuickViewOverlay";
import { discountPercent, productImagePath, toQuick } from "@/lib/card";
import { formatPrice } from "@/lib/site";
import { isUpcoming } from "@/lib/launch";
import type { Product } from "@/lib/types";

type Props = { product: Product; franchiseName?: string; priority?: boolean; variant?: "default" | "flush" };

export function ProductCard({ product, franchiseName, priority = false, variant = "default" }: Props) {
  const pct = discountPercent(product);
  const badge = isUpcoming(product.launchAt) ? "Coming soon" : !product.inStock ? "Sold out" : pct ? `-${pct}%` : product.bestSeller ? "Best seller" : product.isNew ? "New" : null;
  const sizes = "(min-width:1536px) 16vw, (min-width:1280px) 20vw, (min-width:768px) 33vw, 50vw";
  const badgeEl = badge && <span className={`absolute left-0 top-0 z-[1] px-3 py-1 text-sm font-bold ${badge === "New" || badge === "Best seller" ? "bg-bolt text-(--color-on-accent)" : "bg-ink text-paper"}`}>{badge}</span>;
  const quick = toQuick(product, franchiseName);

  if (variant === "flush") {
    // Edge-to-edge catalogue cell: borderless image on a soft ground, centred copy, Quick View on hover.
    return (
      <article className="group relative flex flex-col border-b border-r border-ink/15 bg-paper">
        <Link href={`/products/${product.slug}`} className="block">
          <div className="relative bg-paper-2">
            <ProductImage product={product} priority={priority} sizes={sizes} />
            {badgeEl}
          </div>
          <h3 className="mx-auto mt-4 max-w-[26ch] px-3 text-center font-bold leading-snug group-hover:underline group-hover:underline-offset-4">{product.name}</h3>
          <p className="mb-5 mt-1 flex items-baseline justify-center gap-2 px-3 text-center">
            {product.comparePricePence && <s className="text-sm text-muted">{formatPrice(product.comparePricePence)}</s>}
            <span className="font-bold">{formatPrice(product.pricePence)}</span>
          </p>
        </Link>
        <CardActions quick={quick} hideQuick />
        <QuickViewOverlay quick={quick} />
      </article>
    );
  }

  return (
    <article className="group relative">
      <Link href={`/products/${product.slug}`} className="block">
        <div className="relative border border-ink/20 bg-paper-2">
          <ProductImage product={product} priority={priority} sizes={sizes} />
          {badgeEl}
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
      <CardActions quick={quick} />
      {product.inStock && !isUpcoming(product.launchAt) && (
        <div className="pointer-events-none absolute inset-x-0 top-0 aspect-square overflow-hidden">
          <QuickAdd quick={quick} />
        </div>
      )}
    </article>
  );
}
