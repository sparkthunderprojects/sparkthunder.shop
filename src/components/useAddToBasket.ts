"use client";

import { useCart } from "@/components/CartProvider";
import { useShopUi } from "@/components/ShopUi";
import type { QuickProduct } from "@/lib/card";

/** Adds straight to the basket, or opens quick view first when the product needs a size/colour choice. */
export function useAddToBasket() {
  const { add } = useCart();
  const { openQuick } = useShopUi();
  return (q: QuickProduct) => {
    if (q.variants.length > 0) openQuick(q);
    else add({ slug: q.slug, name: q.name, pricePence: q.pricePence, image: q.image }, 1);
  };
}
