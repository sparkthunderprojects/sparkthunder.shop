"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/CartProvider";
import { useShopUi } from "@/components/ShopUi";
import { SUBSCRIBED_KEY, SubscribeForm } from "@/components/SubscribeForm";
import { Bolt } from "@/components/Bolt";

const SEEN_KEY = "sparkthunder-nl-popup-v1";
const QUIET_DAYS = 14;
const DELAY_MS = 30_000;

/**
 * Sign-up popup for desktop visitors only (Google penalises intrusive mobile interstitials).
 * Shows once after 30 seconds, or when the cursor heads for the browser chrome, then stays quiet for 14 days.
 */
export function NewsletterPopup() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { isOpen: cartOpen } = useCart();
  const { quick } = useShopUi();
  const busy = useRef(false);
  busy.current = cartOpen || Boolean(quick);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (pathname === "/cart") return;
    if (!window.matchMedia("(min-width: 1024px) and (hover: hover)").matches) return;
    try {
      if (localStorage.getItem(SUBSCRIBED_KEY)) return;
      const seen = Number(localStorage.getItem(SEEN_KEY) ?? 0);
      if (seen && Date.now() - seen < QUIET_DAYS * 86_400_000) return;
    } catch { return; }

    let armed = false;
    let done = false;
    const show = () => {
      if (done || busy.current) return;
      done = true;
      try { localStorage.setItem(SEEN_KEY, String(Date.now())); } catch {}
      setOpen(true);
    };
    const arm = setTimeout(() => { armed = true; }, 8000);
    const timer = setTimeout(show, DELAY_MS);
    const onLeave = (e: MouseEvent) => { if (armed && e.clientY <= 0) show(); };
    document.addEventListener("mouseleave", onLeave);
    return () => { clearTimeout(arm); clearTimeout(timer); document.removeEventListener("mouseleave", onLeave); };
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center p-6" role="dialog" aria-modal="true" aria-labelledby="nlp-h">
      <button aria-label="Close" tabIndex={-1} onClick={() => setOpen(false)} className="absolute inset-0 bg-ink/70" />
      <div className="relative w-full max-w-xl border-2 border-ink bg-bolt p-10 text-ink shadow-[8px_8px_0_0_#11142a]">
        <button ref={closeRef} onClick={() => setOpen(false)} className="absolute right-4 top-4 border-2 border-ink bg-paper px-3 py-1 text-sm font-bold hover:bg-ink hover:text-paper">Close</button>
        <Bolt className="h-9 w-6 text-ink" />
        <h2 id="nlp-h" className="display mt-4 text-6xl">Don’t miss the next drop</h2>
        <p className="serif mt-4 text-xl">Join the list for first access to new official merchandise from every Sparkthunder universe.</p>
        <div className="mt-6"><SubscribeForm idPrefix="nlp" onDone={() => setTimeout(() => setOpen(false), 2500)} /></div>
        <p className="mt-3 text-sm">New releases only. Unsubscribe any time.</p>
      </div>
    </div>
  );
}
