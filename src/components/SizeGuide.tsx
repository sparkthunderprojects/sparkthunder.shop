"use client";

import { useT } from "@/components/LocaleProvider";
import { useEffect, useRef, useState } from "react";

const ROWS: [string, string, string, string][] = [
  ["XS", "86-91", "34-36", "66"],
  ["S", "91-96", "36-38", "69"],
  ["M", "97-102", "38-40", "72"],
  ["L", "104-109", "41-43", "74"],
  ["XL", "111-117", "44-46", "76"],
  ["XXL", "119-127", "47-50", "78"],
];

/** "Size guide" link that opens a measurement chart. Used beside the size picker on apparel. */
export function SizeGuide() {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" className="text-sm font-bold underline underline-offset-4">{t("Size guide")}</button>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={t("Size guide")}>
          <button type="button" aria-label={t("Close size guide")} tabIndex={-1} onClick={() => setOpen(false)} className="absolute inset-0 bg-ink/60" />
          <div className="relative max-h-full w-full max-w-lg overflow-y-auto border border-ink/15 bg-paper p-6 text-ink">
            <div className="flex items-start justify-between gap-4">
              <h2 className="display text-3xl">{t("Size guide")}</h2>
              <button ref={closeRef} type="button" onClick={() => setOpen(false)} className="px-2 py-1 font-bold underline underline-offset-4">{t("Close")}</button>
            </div>
            <p className="mt-2 text-sm text-muted">{t("Unisex fit. Measure your chest around the fullest part, under the arms. Between sizes? Go up one for a relaxed fit.")}</p>
            <table className="mt-5 w-full text-left text-sm">
              <caption className="sr-only">{t("Chest and length by size")}</caption>
              <thead><tr className="border-b border-ink/25"><th className="py-2 pr-2">{t("Size")}</th><th className="py-2 pr-2">{t("Chest (cm)")}</th><th className="py-2 pr-2">{t("Chest (in)")}</th><th className="py-2">{t("Length (cm)")}</th></tr></thead>
              <tbody>
                {ROWS.map((r) => (
                  <tr key={r[0]} className="border-b border-ink/10"><th scope="row" className="py-2 pr-2 font-bold">{r[0]}</th><td className="py-2 pr-2">{r[1]}</td><td className="py-2 pr-2">{r[2]}</td><td className="py-2">{r[3]}</td></tr>
                ))}
              </tbody>
            </table>
            <p className="mt-4 text-xs text-muted">{t("Measurements are approximate and can vary by up to 2cm.")}</p>
          </div>
        </div>
      )}
    </>
  );
}
