"use client";

import { useT } from "@/components/LocaleProvider";
import { useEffect, useRef, useState, type ReactNode } from "react";

/** Keeps a panel mounted through its exit so it can animate out as smoothly as it animates in. */
export function useTransitionMount(open: boolean, ms = 380) {
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
      return () => cancelAnimationFrame(id);
    }
    setShown(false);
    const t = setTimeout(() => setMounted(false), ms);
    return () => clearTimeout(t);
  }, [open, ms]);
  return { mounted, shown };
}

/** Locks page scroll and closes on Escape while `active`. */
export function useDialogBehaviour(active: boolean, onClose: () => void) {
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [active, onClose]);
}

/** A frosted, see-through panel that slides in from the right over a dimmed, blurred page. */
export function SlideOver({ open, onClose, title, children, wide = false, width }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean; width?: string }) {
  const { t } = useT();
  const { mounted, shown } = useTransitionMount(open);
  const closeRef = useRef<HTMLButtonElement>(null);
  useDialogBehaviour(open, onClose);
  useEffect(() => { if (open) closeRef.current?.focus(); }, [open]);

  if (!mounted) return null;
  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label={`Close ${title.toLowerCase()}`} tabIndex={-1} onClick={onClose}
        className={`absolute inset-0 bg-black/35 backdrop-blur-[3px] transition-opacity duration-300 ease-out ${shown ? "opacity-100" : "opacity-0"}`} />
      <aside className={`glass-dark absolute right-0 top-0 flex h-full ${width ?? (wide ? "w-[min(68rem,100vw)]" : "w-[min(28rem,100vw)]")} flex-col border-l border-white/15 shadow-2xl shadow-black/50 transition-transform duration-[380ms] ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform motion-reduce:transition-none ${shown ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between border-b border-white/15 px-5 py-4">
          <h2 className="display text-3xl">{title}</h2>
          <button ref={closeRef} onClick={onClose} className="px-2 py-1 font-bold underline underline-offset-4">{t("Close")}</button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </aside>
    </div>
  );
}
