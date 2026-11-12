"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

export type CharacterTile = { slug: string; name: string; image: string; franchise?: string; accent?: string };

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

/** "Shop by character": dark tiles with the cut-out figure and the name along the bottom. Arrows on wide screens, swipe on phones. */
export function CharacterCarousel({ title, items, viewAllHref, id }: { title: string; items: CharacterTile[]; viewAllHref?: string; id: string }) {
  const track = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState({ start: true, end: true });
  const measure = useCallback(() => {
    const el = track.current; if (!el) return;
    setEdge({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);
  useEffect(() => {
    measure();
    const el = track.current; if (!el) return;
    const ro = new ResizeObserver(measure); ro.observe(el);
    return () => ro.disconnect();
  }, [measure, items.length]);
  const go = (dir: 1 | -1) => track.current?.scrollBy({ left: dir * Math.max(240, track.current.clientWidth * 0.8), behavior: "smooth" });
  if (items.length === 0) return null;
  const canScroll = !(edge.start && edge.end);
  return (
    <section aria-labelledby={`${id}-h`} className="mt-14" data-characters={id}>
      <div className="flex items-end justify-between gap-4">
        <h2 id={`${id}-h`} className="display text-2xl sm:text-3xl">{title}</h2>
        <div className="flex items-center gap-4">
          {viewAllHref ? <Link href={viewAllHref} className="link-line text-sm font-semibold">View all</Link> : null}
          {canScroll ? (
            <span className="hidden gap-2 md:flex">
              <button type="button" className="char-arrow" aria-label="Previous characters" disabled={edge.start} onClick={() => go(-1)}>&larr;</button>
              <button type="button" className="char-arrow" aria-label="Next characters" disabled={edge.end} onClick={() => go(1)}>&rarr;</button>
            </span>
          ) : null}
        </div>
      </div>
      <ul ref={track} onScroll={measure} className="char-track mt-5" aria-label={title}>
        {items.map((c) => (
          <li key={c.slug} className="char-slide">
            <Link href={`/characters/${c.slug}`} className="char-tile" style={c.accent ? ({ ["--char-accent" as string]: c.accent }) : undefined} data-character={c.slug}>
              {c.image
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={c.image} alt="" loading="lazy" decoding="async" className="char-img" />
                : <span className="char-initials" aria-hidden>{initials(c.name)}</span>}
              <span className="char-name">{c.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
