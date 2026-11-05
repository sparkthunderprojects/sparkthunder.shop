"use client";

import { useShopUi } from "@/components/ShopUi";
import { useWishlist } from "@/components/WishlistProvider";

export function WishlistLink() {
  const { slugs } = useWishlist();
  const { openPanel } = useShopUi();
  return (
    <button onClick={() => openPanel("wishlist")} aria-haspopup="dialog" aria-label={`Favourites, ${slugs.length} saved`} className="relative flex h-10 w-10 items-center justify-center hover:bg-paper-2">
      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true"><path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
      {slugs.length > 0 && <span className="absolute -right-0.5 top-0 bg-bolt px-1 text-[0.7rem] font-extrabold leading-4 text-black">{slugs.length}</span>}
    </button>
  );
}
