import { T } from "@/components/T";
import Link from "@/components/LocaleLink";
import { CardActions } from "@/components/CardActions";
import { ProductImage } from "@/components/ProductImage";
import { QuickAdd } from "@/components/QuickAdd";
import { QuickViewOverlay } from "@/components/QuickViewOverlay";
import { discountPercent, toQuick } from "@/lib/card";
import { Price } from "@/components/Currency";
import { isUpcoming } from "@/lib/launch";
import { optionGroups, priceRange } from "@/lib/variants";
import Image from "next/image";
import { CatBookmark, CatPlus } from "@/components/CatalogueParts";
import type { Product } from "@/lib/types";

type Props = { product: Product; franchiseName?: string; priority?: boolean; variant?: "default" | "flush" | "catalogue" };

export function ProductCard({ product, franchiseName, priority = false, variant = "default" }: Props) {
  const pct = discountPercent(product);
  const badge = isUpcoming(product.launchAt) ? "Coming soon" : !product.inStock ? "Sold out" : pct ? `-${pct}%` : product.bestSeller ? "Best seller" : product.isNew ? "New" : null;
  const badgeText = badge && badge.startsWith("-") ? badge : badge ? <T text={badge} /> : null;
  const sizes = "(min-width:1536px) 16vw, (min-width:1280px) 20vw, (min-width:768px) 33vw, 50vw";
  const badgeEl = badge && <span className={`absolute left-0 top-0 z-[1] px-3 py-1 text-sm font-bold ${badge === "New" || badge === "Best seller" ? "bg-bolt text-(--color-on-accent)" : "bg-ink text-paper"}`}>{badgeText}</span>;
  const quick = toQuick(product, franchiseName);
  const range = priceRange(product.pricePence, product.variants ?? []);

  if (variant === "catalogue") {
    // Matches the reference catalogue tile: 3:4 grey image area, bookmark top right, plus bottom right, then one row of title and price and one row of colours.
    const vs = product.variants ?? [];
    const og = optionGroups(vs.map((v) => ({ name: v.name, stockQty: v.stockQty ?? 0 })), product.optionNames ?? []);
    const colourAxis = og.split ? og.labels.findIndex((l) => /colou?r|shade/i.test(l)) : -1;
    const colours = colourAxis >= 0 ? og.groups[colourAxis] : [];
    const sizeAxis = og.split ? og.labels.findIndex((l) => /size/i.test(l)) : og.groups.length ? 0 : -1;
    const sizes = sizeAxis >= 0 ? og.groups[sizeAxis]?.length ?? 0 : 0;
    const src = product.images[0] ?? `/art/${product.slug}`;
    const note = !product.inStock ? null : colours.length ? (colours.length === 1 ? "1 Colour" : `${colours.length} Colours`) : sizes ? (sizes === 1 ? "1 Size" : `${sizes} Sizes`) : "";
    const tag = badge && badge !== "Best seller" ? badgeText : null;
    return (
      <article className="pcard pcard-cat group relative flex flex-col bg-paper text-ink">
        <Link href={`/products/${product.slug}`} className="flex w-full flex-col">
          <div className="relative aspect-[3/4] overflow-hidden bg-[#f7f7f7]">
            <Image src={src} alt={product.imageAlts?.[0]?.trim() || product.name} fill sizes="(min-width:1280px) 25vw, 50vw" priority={priority} unoptimized={!product.images[0] || src.endsWith(".svg")} className="object-contain p-[4%]" />
            {tag && <span className="absolute left-[13px] top-[14px] text-[11px] leading-4">{tag}</span>}
          </div>
          <div className="flex flex-col gap-1 px-[14px] pb-4 pt-4 text-xs leading-4">
            <div className="flex items-start justify-between gap-3"><h3 className="font-medium">{product.name}</h3><span className="shrink-0"><Price pence={range.min} whole /></span></div>
            <div className="flex min-h-5 items-center gap-[9px]">
              {colours.slice(0, 5).map((c) => <span key={c} aria-hidden className="h-3 w-3 rounded-full border border-black/15" style={{ background: product.swatches?.[c] ?? "#999" }} />)}
              {note && <span className="text-[#737373]">{note}</span>}
            </div>
          </div>
        </Link>
        <CatBookmark slug={product.slug} name={product.name} />
        {product.inStock && !isUpcoming(product.launchAt) && <div className="pointer-events-none absolute inset-x-0 top-0 aspect-[3/4]"><div className="pointer-events-auto"><CatPlus quick={quick} /></div></div>}
      </article>
    );
  }

  if (variant === "flush") {
    // Edge-to-edge catalogue cell: borderless image on a soft ground, centred copy, Quick View on hover.
    return (
      <article className="pcard pcard-flush group relative flex flex-col border-b border-r border-ink/15 bg-paper">
        <Link href={`/products/${product.slug}`} className="block">
          <div className="relative bg-paper-2">
            <ProductImage product={product} priority={priority} sizes={sizes} />
            {badgeEl}
          </div>
          <h3 className="mx-auto mt-4 max-w-[26ch] px-3 text-center font-bold leading-snug group-hover:underline group-hover:underline-offset-4">{product.name}</h3>
          <p className="mb-5 mt-1 flex items-baseline justify-center gap-2 px-3 text-center">
            {product.comparePricePence && range.max === range.min && <s className="text-sm text-muted"><Price pence={product.comparePricePence} /></s>}
            <span className="font-bold">{range.max > range.min ? <T text="From " /> : ""}<Price pence={range.min} /></span>
          </p>
        </Link>
        <CardActions quick={quick} hideQuick />
        <QuickViewOverlay quick={quick} />
      </article>
    );
  }

  return (
    <article className="pcard group relative">
      <Link href={`/products/${product.slug}`} className="block">
        <div className="pcard-frame relative border border-ink/20 bg-paper-2">
          <ProductImage product={product} priority={priority} sizes={sizes} />
          {badgeEl}
        </div>
        <h3 className="pcard-title mt-3 font-bold leading-snug decoration-2 underline-offset-4 group-hover:underline">{product.name}</h3>
        <p className="mt-1 flex items-baseline justify-between gap-3 text-sm">
          <span className="text-muted">{franchiseName}</span>
          <span className="flex items-baseline gap-2">
            {product.comparePricePence && range.max === range.min && <s className="text-muted"><Price pence={product.comparePricePence} /></s>}
            <span className="text-base font-bold">{range.max > range.min ? <T text="From " /> : ""}<Price pence={range.min} /></span>
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
