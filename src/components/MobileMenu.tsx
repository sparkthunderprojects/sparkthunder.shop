"use client";

import Link from "@/components/LocaleLink";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useT } from "@/components/LocaleProvider";
import { localePath } from "@/lib/i18n/config";

type Item = { slug: string; name: string };

export function MobileMenu({ franchises, categories }: { franchises: Item[]; categories: Item[] }) {
  const { t, locale } = useT();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const row = "block border-t border-ink/20 py-3.5 text-lg font-bold";
  return (
    <div className="lg:hidden">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="mobile-menu" className="flex h-10 items-center gap-2 pr-2 font-bold">
        <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2.5" fill="none" /></svg>
        <span className="sr-only sm:not-sr-only">{open ? t("close") : t("menu")}</span>
      </button>
      {open && (
        <nav id="mobile-menu" aria-label="Mobile" className="absolute inset-x-0 top-full z-50 max-h-[calc(100dvh-8rem)] overflow-y-auto border-b border-ink/15 bg-paper px-(--gutter) pb-8 pt-2">
          <form action={localePath("/search", locale)} role="search" className="mb-3 flex gap-2 py-3">
            <label htmlFor="mq" className="sr-only">{t("search.shop")}</label>
            <input id="mq" name="q" type="search" placeholder={t("search.shop")} className="flex-1 border border-ink/20 bg-paper px-3 py-2" />
            <button className="btn btn-sm">{t("search.button")}</button>
          </form>
          <p className="pb-1 text-sm text-muted">{t("nav.franchises")}</p>
          {franchises.map((f) => <Link key={f.slug} href={`/franchises/${f.slug}`} className={row}>{f.name}</Link>)}
          <p className="pb-1 pt-5 text-sm text-muted">{t("nav.shopByType")}</p>
          {categories.map((c) => <Link key={c.slug} href={`/categories/${c.slug}`} className={row}>{c.name}</Link>)}
          <p className="pb-1 pt-5 text-sm text-muted">{t("nav.more")}</p>
          <Link href="/new" className={row}>{t("nav.new")}</Link>
          <Link href="/gifts" className={row}>{t("nav.gifts")}</Link>
          <Link href="/gift-cards" className={row}>{t("nav.giftCards")}</Link>
          <Link href="/shop" className={row}>{t("nav.allMerch")}</Link>
          <Link href="/wishlist" className={row}>{t("nav.favourites")}</Link>
          <Link href="/account" className={row}>{t("nav.account")}</Link>
        </nav>
      )}
    </div>
  );
}
