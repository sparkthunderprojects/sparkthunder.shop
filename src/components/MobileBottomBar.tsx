"use client";
import { splitLocale } from "@/lib/i18n/config";

import { useT } from "@/components/LocaleProvider";
import Link from "@/components/LocaleLink";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/CartProvider";
import { useShopUi } from "@/components/ShopUi";
import { useWishlist } from "@/components/WishlistProvider";

const icon = { viewBox: "0 0 24 24", className: "h-6 w-6", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinejoin: "round" as const, "aria-hidden": true };

/** Thumb-reach navigation for phones: home, shop, search, favourites and basket. */
export function MobileBottomBar() {
  const pathname = usePathname();
  const { t } = useT();
  const { count, openCart } = useCart();
  const { slugs } = useWishlist();
  const { openPanel } = useShopUi();
  const item = "relative flex flex-col items-center gap-0.5 py-2 text-[0.7rem] font-bold";
  const cls = (href: string) => `${item} ${splitLocale(pathname).path === href ? "bg-bolt" : ""}`;
  const badge = (n: number) => n > 0 && <span className="absolute right-[calc(50%-1.5rem)] top-1 bg-ink px-1.5 text-[0.65rem] font-extrabold leading-4 text-bolt">{n}</span>;

  return (
    <nav aria-label={t("Quick navigation")} className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-ink/15 bg-paper md:hidden">
      <Link href="/" className={cls("/")}>
        <svg {...icon}><path d="M3 11 12 3l9 8v10h-6v-6H9v6H3z" /></svg>{t("Home")}
      </Link>
      <Link href="/shop" className={cls("/shop")}>
        <svg {...icon}><path d="M4 4h16v4H4zM4 12h7v8H4zM15 12h5v8h-5z" /></svg>{t("Shop")}
      </Link>
      <button type="button" onClick={() => openPanel("search")} className={item} aria-haspopup="dialog">
        <svg {...icon}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 5 5" /></svg>{t("Search")}
      </button>
      <button type="button" onClick={() => openPanel("wishlist")} className={item} aria-haspopup="dialog" aria-label={t("Favourites, {n} saved", { n: slugs.length })}>
        <svg {...icon}><path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z" /></svg>{t("Saved")}{badge(slugs.length)}
      </button>
      <button type="button" onClick={openCart} className={item} aria-haspopup="dialog" aria-label={count === 1 ? t("Open basket, 1 item") : t("Open basket, {n} items", { n: count })}>
        <svg {...icon}><path d="M5 8h14l-1.2 12H6.2zM9 8V6a3 3 0 0 1 6 0v2" /></svg>{t("Basket")}{badge(count)}
      </button>
    </nav>
  );
}
