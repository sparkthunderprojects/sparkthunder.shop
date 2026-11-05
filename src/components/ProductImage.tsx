import Image from "next/image";
import type { Product } from "@/lib/types";

export function ProductImage({ product, sizes, priority = false, className = "" }: { product: Product; sizes: string; priority?: boolean; className?: string }) {
  const src = product.images[0] ?? `/art/${product.slug}`;
  return (
    <Image
      src={src}
      alt={product.imageAlts?.[0]?.trim() || `${product.name} - official Sparkthunder merchandise`}
      width={1200}
      height={1200}
      sizes={sizes}
      priority={priority}
      unoptimized={!product.images[0]}
      className={`aspect-square h-auto w-full object-cover ${className}`}
    />
  );
}
