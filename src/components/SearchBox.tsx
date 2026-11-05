"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { formatPrice } from "@/lib/site";

type Hit = { slug: string; name: string; pricePence: number; image: string; franchise: string };
type LinkHit = { label: string; href: string; kind: string };
type Option = { key: string; href: string };

/** Header search with live product suggestions (combobox pattern, keyboard friendly). */
export function SearchBox({ popular }: { popular: { label: string; href: string }[] }) {
  const router = useRouter();
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [hits, setHits] = useState<Hit[]>([]);
  const [links, setLinks] = useState<LinkHit[]>([]);
  const [active, setActive] = useState(-1);

  const term = q.trim();
  useEffect(() => {
    if (term.length < 2) { setHits([]); setLinks([]); return; }
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctl.signal });
        if (!res.ok) return;
        const data = await res.json();
        setHits(data.products ?? []);
        setLinks(data.links ?? []);
        setActive(-1);
      } catch {}
    }, 180);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [term]);

  const typed = term.length >= 2;
  const options: Option[] = typed
    ? [...links.map((l) => ({ key: l.href, href: l.href })), ...hits.map((h) => ({ key: h.slug, href: `/products/${h.slug}` }))]
    : popular.map((p) => ({ key: p.href, href: p.href }));
  const optId = (i: number) => `${id}-opt-${i}`;

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") { setOpen(false); return; }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      const n = options.length;
      if (n) setActive((a) => (e.key === "ArrowDown" ? (a + 1) % n : (a - 1 + n) % n));
    }
    if (e.key === "Enter" && active >= 0 && options[active]) {
      e.preventDefault();
      setOpen(false);
      router.push(options[active].href);
    }
  }

  const rowCls = (i: number) => `flex items-center gap-3 px-4 py-2.5 ${active === i ? "bg-bolt" : "hover:bg-paper-2"}`;
  let idx = -1;

  return (
    <div ref={box} className="relative" onBlur={(e) => { if (!box.current?.contains(e.relatedTarget as Node)) setOpen(false); }}>
      <form action="/search" role="search" onSubmit={() => setOpen(false)}>
        <label htmlFor={`${id}-q`} className="sr-only">Search the shop</label>
        <input
          id={`${id}-q`} name="q" type="search" value={q} autoComplete="off" placeholder="Search the shop"
          role="combobox" aria-expanded={open} aria-controls={`${id}-list`} aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? optId(active) : undefined}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="w-44 border-b border-ink/30 bg-transparent px-1 py-1.5 text-sm placeholder:text-muted focus:border-ink focus:outline-none xl:w-60"
        />
      </form>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(26rem,90vw)] border border-ink/20 bg-paper shadow-2xl shadow-black/40">
          <ul id={`${id}-list`} role="listbox" aria-label="Search suggestions">
            {!typed && (
              <>
                <li role="presentation" className="px-4 pb-1 pt-3 text-xs font-bold uppercase tracking-wide text-muted">Popular</li>
                {popular.map((p) => { idx++; const i = idx; return (
                  <li key={p.href} id={optId(i)} role="option" aria-selected={active === i}>
                    <Link href={p.href} tabIndex={-1} onClick={() => setOpen(false)} className={rowCls(i)}><span className="font-bold">{p.label}</span></Link>
                  </li>
                ); })}
              </>
            )}
            {typed && links.map((l) => { idx++; const i = idx; return (
              <li key={l.href} id={optId(i)} role="option" aria-selected={active === i}>
                <Link href={l.href} tabIndex={-1} onClick={() => setOpen(false)} className={rowCls(i)}>
                  <span className="font-bold">{l.label}</span><span className="text-sm text-muted">{l.kind}</span>
                </Link>
              </li>
            ); })}
            {typed && hits.map((h) => { idx++; const i = idx; return (
              <li key={h.slug} id={optId(i)} role="option" aria-selected={active === i}>
                <Link href={`/products/${h.slug}`} tabIndex={-1} onClick={() => setOpen(false)} className={rowCls(i)}>
                  <Image src={h.image} alt="" width={44} height={44} unoptimized className="h-11 w-11 shrink-0 border border-ink/20 object-cover" />
                  <span className="min-w-0 flex-1"><span className="block truncate font-bold">{h.name}</span><span className="block text-sm text-muted">{h.franchise}</span></span>
                  <span className="font-bold">{formatPrice(h.pricePence)}</span>
                </Link>
              </li>
            ); })}
          </ul>
          {typed && hits.length === 0 && links.length === 0 && <p className="px-4 py-3 text-sm text-muted">No quick matches. Press Enter to search everything.</p>}
          {typed && (
            <Link href={`/search?q=${encodeURIComponent(term)}`} tabIndex={-1} onClick={() => setOpen(false)} className="block border-t border-ink/15 px-4 py-3 text-sm font-bold hover:bg-paper-2">
              See all results for “{term}”
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
