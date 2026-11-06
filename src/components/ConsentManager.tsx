"use client";

import Image from "next/image";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { CONSENT_EVENT, OPEN_CONSENT_EVENT, readConsent, saveConsent, type Consent } from "@/lib/consent";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "";
const META_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "";

const CATEGORIES = [
  { key: "performance", title: "Performance cookies", body: "Help us see which pages and products are popular and how the shop is used, so we can make it faster and easier. The data is aggregated." },
  { key: "necessary", title: "Strictly necessary", body: "Remember your basket, favourites, compare list and these choices. The shop cannot work without them, and they never leave your device." },
  { key: "targeting", title: "Targeting cookies", body: "Let us measure our adverts and show you relevant Sparkthunder merchandise on other sites." },
] as const;

function Toggle({ on, onChange, label, locked = false }: { on: boolean; onChange?: (v: boolean) => void; label: string; locked?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={locked} onClick={() => onChange?.(!on)}
      className={`relative h-7 w-12 shrink-0 rounded-full border border-ink/40 transition-colors ${on ? "bg-ink" : "bg-paper-2"} ${locked ? "opacity-60" : ""}`}>
      <span className={`absolute top-0.5 h-5.5 w-5.5 rounded-full transition-all ${on ? "left-[1.4rem] bg-bolt" : "left-0.5 bg-ink/60"}`} style={{ height: "1.375rem", width: "1.375rem" }} />
    </button>
  );
}

/**
 * Privacy choices dialog (first visit, and from "Cookie settings" in the footer) plus the loader for optional scripts.
 * Optional scripts (analytics, advertising) are only added to the page after the matching choice is on.
 */
export function ConsentManager() {
  const [consent, setConsent] = useState<Consent | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [perf, setPerf] = useState(false);
  const [targ, setTarg] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const first = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const c = readConsent();
    setConsent(c); setReady(true);
    if (!c) setOpen(true);
    const onChange = (e: Event) => setConsent((e as CustomEvent<Consent>).detail);
    const onOpen = () => { const cur = readConsent(); setPerf(cur?.performance ?? false); setTarg(cur?.targeting ?? false); setOpen(true); };
    window.addEventListener(CONSENT_EVENT, onChange);
    window.addEventListener(OPEN_CONSENT_EVENT, onOpen);
    return () => { window.removeEventListener(CONSENT_EVENT, onChange); window.removeEventListener(OPEN_CONSENT_EVENT, onOpen); };
  }, []);

  useEffect(() => {
    if (!open) return;
    first.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const choose = (p: boolean, t: boolean) => { saveConsent({ performance: p, targeting: t }); setOpen(false); };
  // Closing with the X is the same as rejecting the optional cookies.
  const dismiss = () => choose(false, false);

  return (
    <>
      {ready && consent?.performance && GA_ID ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
          <Script id="ga-init" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID.replace(/[^A-Za-z0-9-]/g, "")}',{anonymize_ip:true});`}</Script>
        </>
      ) : null}
      {ready && consent?.targeting && META_ID ? (
        <Script id="meta-pixel" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${META_ID.replace(/[^0-9]/g, "")}');fbq('track','PageView');`}</Script>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-ink/70 p-3 sm:p-6" data-consent-dialog>
          <div role="dialog" aria-modal="true" aria-labelledby="consent-h" className="relative max-h-full w-full max-w-xl overflow-y-auto border border-ink/20 bg-paper text-ink shadow-2xl">
            <div className="relative flex flex-col items-center gap-1.5 bg-black px-14 py-5">
              <Image src="/sparkthunder-logo.png" alt="Sparkthunder" width={1200} height={186} className="h-7 w-auto sm:h-8" />
              <span aria-hidden className="flex w-full max-w-[16rem] items-center gap-2.5 text-bolt">
                <span className="h-px flex-1 bg-bolt/50" />
                <span className="logo-shop pl-[0.5em] text-[0.7rem] tracking-[0.5em]">SHOP</span>
                <span className="h-px flex-1 bg-bolt/50" />
              </span>
              <button type="button" onClick={dismiss} aria-label="Close and keep only the necessary cookies" className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center border border-white/40 text-xl leading-none text-white">×</button>
            </div>
            <div className="p-5 sm:p-8">
            <h2 id="consent-h" className="display text-2xl sm:text-3xl">Your privacy choices</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">We use your browser to remember your basket and, only if you agree, to understand how the shop is used and to measure our adverts. Turning optional cookies off will not stop you shopping. See our <a href="/cookies" className="underline underline-offset-4">cookie policy</a> and <a href="/privacy" className="underline underline-offset-4">privacy policy</a>.</p>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-bold">Manage consent preferences</h3>
              <div className="flex gap-2">
                <button ref={first} type="button" onClick={() => choose(false, false)} className="btn btn-ink btn-sm">Reject all</button>
                <button type="button" onClick={() => choose(true, true)} className="btn btn-ink btn-sm">Accept all</button>
              </div>
            </div>

            <ul className="mt-3 divide-y divide-ink/15 border-y border-ink/15">
              {CATEGORIES.map((c) => {
                const isOpen = expanded === c.key;
                const on = c.key === "necessary" ? true : c.key === "performance" ? perf : targ;
                return (
                  <li key={c.key} className="py-3">
                    <div className="flex items-center justify-between gap-4">
                      <button type="button" aria-expanded={isOpen} onClick={() => setExpanded(isOpen ? null : c.key)} className="flex flex-1 items-center gap-3 text-left font-bold">
                        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.5" className={isOpen ? "rotate-90 transition-transform" : "transition-transform"}><path d="m9 5 7 7-7 7" /></svg>
                        {c.title}
                      </button>
                      {c.key === "necessary" ? <span className="text-xs font-bold">Always active</span> : null}
                      <Toggle on={on} locked={c.key === "necessary"} label={c.title} onChange={c.key === "performance" ? setPerf : setTarg} />
                    </div>
                    {isOpen ? <p className="mt-2 pl-7 text-sm text-muted">{c.body}</p> : null}
                  </li>
                );
              })}
            </ul>
            <div className="mt-5 flex justify-end"><button type="button" onClick={() => choose(perf, targ)} className="btn">Confirm my choices</button></div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
