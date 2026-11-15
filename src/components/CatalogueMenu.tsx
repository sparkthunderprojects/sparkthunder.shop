"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "@/components/LocaleLink";

type Item = { label: string; href: string };
/** The slim header's main menu on large screens: a 320px white panel under the bar (big links, small grey section labels, 32px rows) and a promo photo beside it, over a dimmed page. */
export function CatalogueMenu({ name, features, sections, promo }: { name: string; features: Item[]; sections: { title: string; items: Item[] }[]; promo?: { image: string; title: string; href: string } }) {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); btn.current?.focus(); } };
    window.addEventListener("keydown", key);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", key); };
  }, [open]);
  const close = () => setOpen(false);
  return (
    <>
      <button ref={btn} type="button" aria-expanded={open} aria-controls="cat-menu" onClick={() => setOpen((o) => !o)} className="hidden h-[46px] items-center gap-1.5 px-3 text-xs hover:underline hover:underline-offset-4 lg:flex" data-cat-menu-button>
        {name}
        <svg width="8" height="5" viewBox="0 0 8 5" fill="none" stroke="currentColor" aria-hidden className={open ? "rotate-180" : ""}><path d="M1 1l3 3 3-3" /></svg>
      </button>
      {open && (
        <div className="fixed inset-x-0 bottom-0 top-[46px] z-[45] hidden lg:block" id="cat-menu" data-cat-menu>
          <button type="button" aria-label="Close menu" tabIndex={-1} onClick={close} className="absolute inset-0 bg-black/35 backdrop-blur-[3px]" />
          <nav aria-label={name} className="absolute left-0 top-0 h-full w-[320px] overflow-y-auto bg-paper px-6 pb-10 pt-5 text-ink">
            <ul>{features.map((f) => <li key={f.href}><Link href={f.href as never} onClick={close} className="flex h-[30px] items-center text-base font-medium hover:underline hover:underline-offset-4">{f.label}</Link></li>)}</ul>
            {sections.map((s) => (
              <section key={s.title} className="mt-[54px] first-of-type:mt-[54px]">
                <h2 className="mb-0 h-[25px] text-[10px] font-medium uppercase leading-[25px] text-[#757575]">{s.title}</h2>
                <ul>{s.items.map((i) => <li key={i.href + i.label}><Link href={i.href as never} onClick={close} className="flex h-8 items-center text-xs hover:underline hover:underline-offset-4">{i.label}</Link></li>)}</ul>
              </section>
            ))}
          </nav>
          {promo && (
            <Link href={promo.href as never} onClick={close} className="absolute bottom-6 left-[344px] top-6 hidden w-[min(591px,calc(100vw-368px))] overflow-hidden bg-[#f7f7f7] xl:block" aria-label={promo.title}>
              <Image src={promo.image} alt="" fill sizes="591px" unoptimized={promo.image.startsWith("https://") || promo.image.endsWith(".svg")} className="object-cover object-top" />
            </Link>
          )}
        </div>
      )}
    </>
  );
}
