"use client";

import { useT } from "@/components/LocaleProvider";
import Image from "next/image";
import Link from "@/components/LocaleLink";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { useShopUi } from "@/components/ShopUi";
import { useDialogBehaviour, useTransitionMount } from "@/components/SlideOver";
import { useMoney } from "@/components/Currency";
import { useLocale } from "@/components/LocaleProvider";
import { localePath } from "@/lib/i18n/config";

type Hit = { slug: string; name: string; pricePence: number; image: string; franchise: string; inStock: boolean };
type LinkHit = { label: string; href: string; kind: string };
type Data = { products: Hit[]; links: LinkHit[]; suggest: string[]; total: number; corrected?: string | null };
type Option = { key: string; href: string };

const EMPTY: Data = { products: [], links: [], suggest: [], total: 0, corrected: null };

/** Full-width search drop-down: predictive text in the field, with matching products and their images beneath as you type. */
export function SearchOverlay({ popular }: { popular: { label: string; href: string }[] }) {
  const money = useMoney();
  const { panel, closePanel } = useShopUi();
  const { locale } = useLocale();
  const { t } = useT();
  const open = panel === "search";
  const { mounted, shown } = useTransitionMount(open, 350);
  useDialogBehaviour(open, closePanel);

  const router = useRouter();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [data, setData] = useState<Data>(EMPTY);
  const [active, setActive] = useState(-1);

  const term = q.trim();
  const typed = term.length >= 2;

  useEffect(() => { if (open) { const t = setTimeout(() => input.current?.focus(), 60); return () => clearTimeout(t); } }, [open]);
  useEffect(() => { if (!open) { setQ(""); setData(EMPTY); setActive(-1); } }, [open]);

  useEffect(() => {
    if (!typed) { setData(EMPTY); return; }
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctl.signal });
        if (!res.ok) return;
        setData({ ...EMPTY, ...(await res.json()) });
        setActive(-1);
      } catch {}
    }, 150);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [term, typed]);

  const searchHref = (s: string) => `/search?q=${encodeURIComponent(s)}`;
  const options: Option[] = typed
    ? [
        ...data.suggest.map((s) => ({ key: `s-${s}`, href: searchHref(s) })),
        ...data.links.map((l) => ({ key: `l-${l.href}`, href: l.href })),
        ...data.products.map((p) => ({ key: `p-${p.slug}`, href: `/products/${p.slug}` })),
      ]
    : popular.map((p) => ({ key: `pop-${p.href}`, href: p.href }));
  const optId = (i: number) => `${id}-opt-${i}`;

  // Predictive text: the first suggestion that begins with exactly what was typed.
  const completion = typed ? data.suggest.find((s) => s.toLowerCase().startsWith(q.toLowerCase()) && s.length > q.length) : undefined;
  const ghost = completion ? completion.slice(q.length) : "";

  function go(href: string) { closePanel(); router.push(localePath(href, locale) as never); }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const el = e.currentTarget;
    if ((e.key === "Tab" || e.key === "ArrowRight") && ghost && el.selectionStart === q.length && !e.shiftKey) {
      e.preventDefault();
      setQ(completion!);
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const n = options.length;
      if (n) setActive((a) => (e.key === "ArrowDown" ? (a + 1) % n : (a - 1 + n) % n));
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0 && options[active]) go(options[active].href);
      else if (term) go(searchHref(term));
    }
  }

  const chip = (i: number) => `inline-flex items-center gap-2 border px-3.5 py-2 text-sm font-bold ${active === i ? "border-bolt bg-bolt text-(--color-on-accent)" : "border-white/25 hover:border-white/60"}`;

  if (!mounted) return null;
  let idx = -1;
  return (
    <div className="fixed inset-0 z-[55]" role="dialog" aria-modal="true" aria-label={t("Search the shop")}>
      <button aria-label={t("Close search")} tabIndex={-1} onClick={closePanel}
        className={`absolute inset-0 bg-black/45 backdrop-blur-[3px] transition-opacity duration-300 ${shown ? "opacity-100" : "opacity-0"}`} />
      <div className={`glass-dark glass-dark-strong absolute inset-x-0 top-0 max-h-[100dvh] overflow-y-auto border-b border-white/15 shadow-2xl shadow-black/60 transition-transform duration-[350ms] ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform motion-reduce:transition-none ${shown ? "translate-y-0" : "-translate-y-full"}`}>
        <div className="px-(--gutter)">
          <form action="/search" role="search" onSubmit={(e) => { e.preventDefault(); if (term) go(searchHref(term)); }} className="flex items-center gap-4 border-b border-white/20 py-5 sm:py-7">
            <svg viewBox="0 0 24 24" className="h-7 w-7 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 5 5" /></svg>
            <div className="relative min-w-0 flex-1">
              <label htmlFor={`${id}-q`} className="sr-only">{t("Search the shop")}</label>
              {/* Ghost text shows the rest of the best match; Tab or the right arrow accepts it. */}
              <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center overflow-hidden whitespace-pre text-[clamp(1.5rem,3.4vw,2.75rem)] font-bold tracking-tight">
                <span className="invisible">{q}</span><span className="text-ink/35">{ghost}</span>
              </div>
              <input
                ref={input} id={`${id}-q`} name="q" type="search" value={q} autoComplete="off" autoCapitalize="off" spellCheck={false}
                placeholder={t("Search the shop")} enterKeyHint="search"
                role="combobox" aria-expanded={true} aria-controls={`${id}-list`} aria-autocomplete="both"
                aria-activedescendant={active >= 0 ? optId(active) : undefined}
                onChange={(e) => setQ(e.target.value)} onKeyDown={onKeyDown}
                className="relative w-full bg-transparent text-[clamp(1.5rem,3.4vw,2.75rem)] font-bold tracking-tight placeholder:text-ink/35 focus:outline-none focus-visible:!outline-none [&::-webkit-search-cancel-button]:hidden"
              />
            </div>
            {ghost && <span className="hidden shrink-0 border border-white/30 px-2 py-0.5 text-xs font-bold text-muted sm:inline">Tab</span>}
            <button type="button" onClick={closePanel} className="shrink-0 px-2 py-1 font-bold underline underline-offset-4">{t("Close")}</button>
          </form>

          <div id={`${id}-list`} role="listbox" aria-label={t("Search suggestions")} className="pb-10 pt-6">
            {!typed ? (
              <section aria-label={t("Popular searches")}>
                <p className="text-xs font-bold uppercase tracking-wide text-muted">{t("Popular")}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {popular.map((p) => { idx++; const i = idx; return (
                    <span key={p.href} id={optId(i)} role="option" aria-selected={active === i}>
                      <Link href={p.href} tabIndex={-1} onClick={closePanel} className={chip(i)}>{p.label}</Link>
                    </span>
                  ); })}
                </div>
                <p className="mt-8 text-sm text-muted">{t("Start typing to see matching products.")}</p>
              </section>
            ) : (
              <div className="grid gap-8 lg:grid-cols-[16rem_1fr] lg:gap-12">
                <div>
                  {data.suggest.length > 0 && (
                    <>
                      <p className="text-xs font-bold uppercase tracking-wide text-muted">{t("Suggestions")}</p>
                      <ul className="mt-2 flex flex-wrap gap-2 lg:block lg:space-y-0.5">
                        {data.suggest.map((s) => { idx++; const i = idx; return (
                          <li key={s} id={optId(i)} role="option" aria-selected={active === i}>
                            <Link href={searchHref(s)} tabIndex={-1} onClick={closePanel}
                              className={`block px-2 py-1.5 font-bold lg:-mx-2 ${active === i ? "bg-bolt text-(--color-on-accent)" : "hover:bg-white/10"}`}>
                              <span className="text-muted">{s.slice(0, s.toLowerCase().indexOf(term.toLowerCase()))}</span>
                              {s.toLowerCase().includes(term.toLowerCase()) ? <>{s.slice(s.toLowerCase().indexOf(term.toLowerCase()), s.toLowerCase().indexOf(term.toLowerCase()) + term.length)}<span className="text-muted">{s.slice(s.toLowerCase().indexOf(term.toLowerCase()) + term.length)}</span></> : s}
                            </Link>
                          </li>
                        ); })}
                      </ul>
                    </>
                  )}
                  {data.links.length > 0 && (
                    <>
                      <p className="mt-6 text-xs font-bold uppercase tracking-wide text-muted">{t("Go to")}</p>
                      <ul className="mt-2 flex flex-wrap gap-2 lg:block lg:space-y-0.5">
                        {data.links.map((l) => { idx++; const i = idx; return (
                          <li key={l.href} id={optId(i)} role="option" aria-selected={active === i}>
                            <Link href={l.href} tabIndex={-1} onClick={closePanel}
                              className={`flex items-center justify-between gap-3 px-2 py-1.5 font-bold lg:-mx-2 ${active === i ? "bg-bolt text-(--color-on-accent)" : "hover:bg-white/10"}`}>
                              {l.label}<span className="text-xs font-normal text-muted">{t(l.kind)}</span>
                            </Link>
                          </li>
                        ); })}
                      </ul>
                    </>
                  )}
                </div>

                <div>
                  {data.corrected ? <p className="mb-3 text-sm">{t("Showing results for")} <Link href={searchHref(data.corrected)} onClick={closePanel} className="font-bold underline underline-offset-4">{data.corrected}</Link> <span className="text-muted">{t("(no matches for “{term}”)", { term })}</span></p> : null}
                  <p className="text-xs font-bold uppercase tracking-wide text-muted">{t("Products")}</p>
                  {data.products.length > 0 ? (
                    <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 xl:grid-cols-4">
                      {data.products.map((h) => { idx++; const i = idx; return (
                        <li key={h.slug} id={optId(i)} role="option" aria-selected={active === i}>
                          <Link href={`/products/${h.slug}`} tabIndex={-1} onClick={closePanel} className="group block">
                            <div className={`overflow-hidden bg-paper-2 ${active === i ? "outline outline-2 outline-bolt" : ""}`}>
                              <Image src={h.image} alt="" width={320} height={400} unoptimized className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" />
                            </div>
                            <p className="mt-2 truncate text-sm font-bold group-hover:underline group-hover:underline-offset-4">{h.name}</p>
                            <p className="text-sm text-muted">{h.franchise}</p>
                            <p className="text-sm font-bold">{h.inStock ? money(h.pricePence) : t("Sold out")}</p>
                          </Link>
                        </li>
                      ); })}
                    </ul>
                  ) : (
                    <p className="mt-3 text-muted">{t("No quick matches for “{term}”. Press Enter to search everything.", { term })}</p>
                  )}
                  <Link href={searchHref(term)} tabIndex={-1} onClick={closePanel} className="btn btn-sm mt-8">
                    {data.total > 1 ? t("See all {n} results for “{term}”", { n: data.total, term }) : data.total === 1 ? t("See the 1 result for “{term}”", { term }) : t("Search for “{term}”", { term })}
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
