"use client";

import { useT } from "@/components/LocaleProvider";
import Link from "@/components/LocaleLink";
import { useCart } from "@/components/CartProvider";
import { PanelProductRow } from "@/components/PanelProductRow";
import { useShopUi } from "@/components/ShopUi";
import { SlideOver } from "@/components/SlideOver";
import { useProductLookup } from "@/components/useProductLookup";
import { useWishlist } from "@/components/WishlistProvider";

/** Favourites, as a frosted panel that slides out from the right. */
export function WishlistDrawer() {
  const { t } = useT();
  const { panel, closePanel, openQuick } = useShopUi();
  const open = panel === "wishlist";
  const { slugs, toggle } = useWishlist();
  const { add, openCart } = useCart();
  const { products, loading } = useProductLookup(slugs, open);
  const shown = products.filter((p) => slugs.includes(p.slug));

  return (
    <SlideOver open={open} onClose={closePanel} title={t("Your favourites")}>
      {slugs.length === 0 ? (
        <div className="flex-1 p-6">
          <p className="serif text-xl text-muted">{t("Nothing saved yet. Tap the heart on any product to keep it here.")}</p>
          <Link href="/new" onClick={closePanel} className="btn mt-6">{t("Shop new arrivals")}</Link>
        </div>
      ) : (
        <>
          <ul className="flex-1 divide-y divide-white/15 overflow-y-auto px-5" aria-busy={loading}>
            {shown.map((p) => (
              <PanelProductRow key={p.slug} product={p} onNavigate={closePanel}>
                {p.inStock ? (
                  <button className="btn btn-sm" onClick={() => { closePanel(); if (p.variants.length) openQuick(p); else { add({ slug: p.slug, name: p.name, pricePence: p.pricePence, image: p.image }, 1); openCart(); } }}>{p.variants.length ? t("Choose options") : t("Add to basket")}</button>
                ) : (
                  <span className="text-sm font-bold text-muted">{t("Sold out")}</span>
                )}
                <button onClick={() => toggle(p.slug)} className="text-sm underline underline-offset-4 hover:text-muted">{t("Remove")}</button>
              </PanelProductRow>
            ))}
            {shown.length === 0 && <li className="py-6 text-muted">{t("Loading your favourites…")}</li>}
          </ul>
          <div className="border-t border-white/15 p-5">
            <Link href="/wishlist" onClick={closePanel} className="btn btn-ink w-full">{t("View all favourites")}</Link>
          </div>
        </>
      )}
    </SlideOver>
  );
}
