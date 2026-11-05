"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

export type HeroSlide = { id: string; label: string; background: string; children: ReactNode };

const INTERVAL_MS = 7000;

/** Full-bleed hero carousel: autoplays, pauses on hover/focus, supports swipe, arrows and dots. */
export function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const startX = useRef<number | null>(null);
  const n = slides.length;
  const go = useCallback((to: number) => setI(((to % n) + n) % n), [n]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    if (paused || reduced || n < 2) return;
    const t = setTimeout(() => setI((v) => (v + 1) % n), INTERVAL_MS);
    return () => clearTimeout(t);
  }, [i, paused, reduced, n]);

  const arrow = "grid h-11 w-11 place-items-center border border-ink/30 bg-black/40 text-ink backdrop-blur hover:bg-bolt hover:text-black hover:border-bolt";

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured"
      className="relative -mx-(--gutter) overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onPointerDown={(e) => { startX.current = e.clientX; }}
      onPointerUp={(e) => {
        if (startX.current === null) return;
        const dx = e.clientX - startX.current;
        startX.current = null;
        if (Math.abs(dx) > 60) go(i + (dx < 0 ? 1 : -1));
      }}
    >
      <div
        className="flex transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none"
        style={{ transform: `translateX(-${i * 100}%)` } as CSSProperties}
        aria-live={paused || reduced ? "polite" : "off"}
      >
        {slides.map((s, idx) => (
          <div
            key={s.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${idx + 1} of ${n}: ${s.label}`}
            aria-hidden={idx !== i}
            inert={idx !== i}
            className="w-full shrink-0 px-(--gutter)"
            style={{ background: s.background }}
          >
            {s.children}
          </div>
        ))}
      </div>

      {n > 1 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-5 flex items-center justify-between px-(--gutter)">
          <div className="pointer-events-auto flex items-center gap-2" role="tablist" aria-label="Choose slide">
            {slides.map((s, idx) => (
              <button
                key={s.id}
                role="tab"
                aria-selected={idx === i}
                aria-label={`Show slide ${idx + 1}: ${s.label}`}
                onClick={() => go(idx)}
                className={`h-2.5 transition-all ${idx === i ? "w-9 bg-bolt" : "w-2.5 bg-ink/40 hover:bg-ink/70"}`}
              />
            ))}
          </div>
          <div className="pointer-events-auto hidden gap-2 sm:flex">
            <button aria-label="Previous slide" onClick={() => go(i - 1)} className={arrow}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden><path d="M15 5l-7 7 7 7" /></svg>
            </button>
            <button aria-label="Next slide" onClick={() => go(i + 1)} className={arrow}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden><path d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
