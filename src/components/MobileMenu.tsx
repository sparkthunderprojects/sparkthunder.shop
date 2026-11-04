"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type Item = { slug: string; name: string };

export function MobileMenu({ franchises, categories }: { franchises: Item[]; categories: Item[] }) {
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
        <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18" stroke="#11142a" strokeWidth="2.5" fill="none" /></svg>
        <span className="sr-only sm:not-sr-only">{open ? "Close" : "Menu"}</span>
      </button>
      {open && (
        <nav id="mobile-menu" aria-label="Mobile" className="absolute inset-x-0 top-full z-50 max-h-[calc(100dvh-8rem)] overflow-y-auto border-b-2 border-ink bg-paper px-(--gutter) pb-8 pt-2">
          <form action="/search" role="search" className="mb-3 flex gap-2 py-3">
            <label htmlFor="mq" className="sr-only">Search the shop</label>
            <input id="mq" name="q" type="search" placeholder="Search the shop" className="flex-1 border-2 border-ink bg-paper px-3 py-2" />
            <button className="btn btn-sm">Search</button>
          </form>
          <p className="pb-1 text-sm text-muted">Franchises</p>
          {franchises.map((f) => <Link key={f.slug} href={`/franchises/${f.slug}`} className={row}>{f.name}</Link>)}
          <p className="pb-1 pt-5 text-sm text-muted">Shop by type</p>
          {categories.map((c) => <Link key={c.slug} href={`/categories/${c.slug}`} className={row}>{c.name}</Link>)}
          <p className="pb-1 pt-5 text-sm text-muted">More</p>
          <Link href="/new" className={row}>New arrivals</Link>
          <Link href="/gifts" className={row}>Gifts</Link>
          <Link href="/shop" className={row}>All merchandise</Link>
          <Link href="/wishlist" className={row}>Favourites</Link>
        </nav>
      )}
    </div>
  );
}
