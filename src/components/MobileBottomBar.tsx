"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/CartProvider";
import { useWishlist } from "@/components/WishlistProvider";

const icon = { viewBox: "0 0 24 24", className: "h-6 w-6", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinejoin: "round" as const, "aria-hidden": true };

/** Thumb-reach navigation for phones: home, shop, search, favourites and basket. */
export function MobileBottomBar() {
  const pathname = usePathname();
  const { count, openCart } = useCart();
  const { slugs } = useWishlist();
  const item = "relative flex flex-col items-center gap-0.5 py-2 text-[0.7rem] font-bold";
  const cls = (href: string) => `${item} ${pathname === href ? "bg-bolt" : ""}`;
  const badge = (n: number) => n > 0 && <span className="absolute right-[calc(50%-1.5rem)] top-1 bg-ink px-1.5 text-[0.65rem] font-extrabold leading-4 text-bolt">{n}</span>;

  return (
    <nav aria-label="Quick navigation" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-ink/15 bg-paper md:hidden">
      <Link href="/" className={cls("/")}>
        <svg {...icon}><path d="M3 11 12 3l9 8v10h-6v-6H9v6H3z" /></svg>Home
      </Link>
      <Link href="/shop" className={cls("/shop")}>
        <svg {...icon}><path d="M4 4h16v4H4zM4 12h7v8H4zM15 12h5v8h-5z" /></svg>Shop
      </Link>
      <Link href="/search" className={cls("/search")}>
        <svg {...icon}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 5 5" /></svg>Search
      </Link>
      <Link href="/wishlist" className={cls("/wishlist")} aria-label={`Favourites, ${slugs.length} saved`}>
        <svg {...icon}><path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z" /></svg>Saved{badge(slugs.length)}
      </Link>
      <button type="button" onClick={openCart} className={item} aria-haspopup="dialog" aria-label={`Open basket, ${count} item${count === 1 ? "" : "s"}`}>
        <svg {...icon}><path d="M5 8h14l-1.2 12H6.2zM9 8V6a3 3 0 0 1 6 0v2" /></svg>Basket{badge(count)}
      </button>
    </nav>
  );
}
