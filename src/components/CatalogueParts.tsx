"use client";

import { useT } from "@/components/LocaleProvider";
import { useWishlist } from "@/components/WishlistProvider";
import { useAddToBasket } from "@/components/useAddToBasket";
import type { QuickProduct } from "@/lib/card";

/** Bookmark in the top-right corner of a catalogue tile (45 x 45 hit area, 16px icon). */
export function CatBookmark({ slug, name }: { slug: string; name: string }) {
  const { has, toggle } = useWishlist();
  const { t } = useT();
  const on = has(slug);
  return (
    <button type="button" onClick={() => toggle(slug)} aria-pressed={on} aria-label={on ? t("Remove {name} from favourites", { name }) : t("Add {name} to favourites", { name })} className="absolute right-0 top-0 z-10 grid h-[45px] w-[45px] place-items-center text-ink">
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M3.5 1.5h9v13L8 11l-4.5 3.5z" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" /></svg>
    </button>
  );
}

/** Plus in the bottom-right corner of a catalogue tile: adds the product, or opens the size picker when it has options. */
export function CatPlus({ quick }: { quick: QuickProduct }) {
  const addOrChoose = useAddToBasket();
  const { t } = useT();
  const choose = quick.variants.length > 0;
  return (
    <button type="button" onClick={() => addOrChoose(quick)} aria-label={choose ? t("Choose options for {name}", { name: quick.name }) : t("Add {name} to basket", { name: quick.name })} className="absolute bottom-0 right-0 z-10 grid h-[45px] w-[45px] place-items-center text-ink">
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1" fill="none" /></svg>
    </button>
  );
}
