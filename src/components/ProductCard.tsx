import Link from "next/link";
import { ProductImage } from "@/components/ProductImage";
import { formatPrice } from "@/lib/site";
import type { Product } from "@/lib/types";

export function ProductCard({ product, franchiseName, priority = false }: { product: Product; franchiseName?: string; priority?: boolean }) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-white/10 bg-panel transition hover:border-accent/60">
      <Link href={`/products/${product.slug}`} className="block">
        <div className="relative overflow-hidden">
          <ProductImage product={product} priority={priority} sizes="(min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw" className="transition duration-500 group-hover:scale-105" />
          <div className="absolute left-3 top-3 flex gap-2">
            {product.isNew && <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-black">New</span>}
            {product.comparePricePence && <span className="rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold">Sale</span>}
            {!product.inStock && <span className="rounded-full bg-black/70 px-2.5 py-1 text-xs font-bold">Sold out</span>}
          </div>
        </div>
        <div className="p-4">
          {franchiseName && <p className="text-xs uppercase tracking-widest text-muted">{franchiseName}</p>}
          <h3 className="mt-1 font-semibold leading-snug">{product.name}</h3>
          <p className="mt-2 flex items-baseline gap-2">
            <span className="font-bold text-accent">{formatPrice(product.pricePence)}</span>
            {product.comparePricePence && <s className="text-sm text-muted">{formatPrice(product.comparePricePence)}</s>}
          </p>
        </div>
      </Link>
    </article>
  );
}
