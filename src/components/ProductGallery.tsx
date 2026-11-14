"use client";

import { useT } from "@/components/LocaleProvider";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { isPlaceholderArt } from "@/lib/card";

/** Main image with hover zoom, thumbnails when there are several photos, and a full-screen lightbox. */
export function ProductGallery({ images, name, sizes, alts = [] }: { images: string[]; name: string; sizes: string; alts?: string[] }) {
  const [idx, setIdx] = useState(0);
  const { t } = useT();
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const [light, setLight] = useState(false);
  // A chosen option (shade, colour...) can have its own photo: show it until another thumbnail is picked.
  const [extra, setExtra] = useState<string | null>(null);
  useEffect(() => {
    const on = (e: Event) => {
      const src = (e as CustomEvent<string>).detail;
      const at = images.indexOf(src);
      if (at >= 0) { setIdx(at); setExtra(null); } else setExtra(src);
    };
    window.addEventListener("spark:variant-image", on);
    return () => window.removeEventListener("spark:variant-image", on);
  }, [images]);
  const shown = extra ?? images[idx];
  const closeRef = useRef<HTMLButtonElement>(null);
  const many = images.length > 1;
  const alt = (i: number) => alts[i]?.trim() || (i === 0 ? t("{name} - official Sparkthunder merchandise", { name }) : t("{name} - photo {n}", { name, n: i + 1 }));

  const step = useCallback((d: number) => setIdx((i) => (i + d + images.length) % images.length), [images.length]);

  useEffect(() => {
    if (!light) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLight(false);
      if (e.key === "ArrowRight" && many) step(1);
      if (e.key === "ArrowLeft" && many) step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [light, many, step]);

  function onMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  }

  return (
    <div className="self-start">
      <button
        type="button"
        onClick={() => setLight(true)}
        onPointerMove={onMove}
        onPointerLeave={() => setZoom(null)}
        aria-label={t("Open {name} image full screen", { name })}
        className="block w-full cursor-zoom-in overflow-hidden border border-ink/20 bg-paper-2"
      >
        <Image
          src={shown} alt={extra ? t("{name} - selected option", { name }) : alt(idx)} width={1200} height={1200} sizes={sizes} priority={idx === 0}
          unoptimized={isPlaceholderArt(shown)}
          style={zoom ? { transform: "scale(2)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
          className="aspect-square h-auto w-full object-cover transition-transform duration-100"
        />
      </button>

      {many && (
        <ul className="mt-3 grid grid-cols-5 gap-3" aria-label={t("Product photos")}>
          {images.map((src, i) => (
            <li key={src}>
              <button type="button" onClick={() => { setExtra(null); setIdx(i); }} aria-label={t("Show photo {n}", { n: i + 1 })} aria-current={i === idx} className={`block w-full border ${i === idx ? "border-ink" : "border-ink/25 hover:border-ink"}`}>
                <Image src={src} alt="" width={160} height={160} unoptimized={isPlaceholderArt(src)} className="aspect-square w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {light && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/95 p-4" role="dialog" aria-modal="true" aria-label={t("{name} images", { name })}>
          <button ref={closeRef} onClick={() => setLight(false)} className="absolute right-4 top-4 z-10 bg-bolt px-4 py-2 font-bold text-(--color-on-accent)">{t("Close")}</button>
          {many && <button onClick={() => step(-1)} aria-label={t("Previous photo")} className="absolute left-3 top-1/2 z-10 -translate-y-1/2 bg-paper px-3 py-4 text-xl font-bold">‹</button>}
          <Image src={shown} alt={extra ? t("{name} - selected option", { name }) : alt(idx)} width={1600} height={1600} unoptimized={isPlaceholderArt(shown)} className="max-h-full w-auto max-w-full object-contain" />
          {many && <button onClick={() => step(1)} aria-label={t("Next photo")} className="absolute right-3 top-1/2 z-10 -translate-y-1/2 bg-paper px-3 py-4 text-xl font-bold">›</button>}
        </div>
      )}
    </div>
  );
}
