"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { formatMoney, type DisplayCurrency } from "@/lib/currency";
import { countryName, currencyFor, currencySymbol } from "@/lib/regions";

const KEY = "spark-currency", REGION = "spark-region";
type Ctx = { base: string; options: DisplayCurrency[]; code: string; setCode: (c: string) => void; countries: string[]; country: string; setRegion: (c: string) => void };
const C = createContext<Ctx>({ base: "GBP", options: [], code: "GBP", setCode: () => {}, countries: [], country: "GB", setRegion: () => {} });

/**
 * Lets shoppers view prices in another currency. The server always renders the store's own currency (so search engines, caching and
 * the first paint agree); after load, a saved choice switches the display. Payment is always in the store's currency.
 */
export function CurrencyProvider({ base, options, countries, children }: { base: string; options: DisplayCurrency[]; countries: string[]; children: React.ReactNode }) {
  const [code, set] = useState(base);
  const [country, setCountry] = useState(countries[0] ?? "GB");
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- a saved choice can only be read after hydration, so the server and first paint agree
      const s = localStorage.getItem(KEY); if (s && options.some((o) => o.code === s)) set(s);
      const r = localStorage.getItem(REGION); if (r && countries.includes(r)) setCountry(r); // eslint-disable-line react-hooks/set-state-in-effect -- same reason
    } catch { /* private mode */ }
  }, [options, countries]);
  const setCode = useCallback((c: string) => { set(c); try { if (c === base) localStorage.removeItem(KEY); else localStorage.setItem(KEY, c); } catch { /* private mode */ } }, [base]);
  /** Picking a region sets the delivery country and, where we show prices in that region's currency, the display currency too. */
  const setRegion = useCallback((c: string) => {
    setCountry(c);
    const cur = currencyFor(c), next = cur && options.some((o) => o.code === cur) ? cur : base;
    try { localStorage.setItem(REGION, c); } catch { /* private mode */ }
    setCode(next);
  }, [options, base, setCode]);
  const value = useMemo(() => ({ base, options, code, setCode, countries, country, setRegion }), [base, options, code, setCode, countries, country, setRegion]);
  return <C.Provider value={value}>{children}</C.Provider>;
}

/** `money(pence)` for client components: the amount in the shopper's chosen currency (the store's own if none). */
export function useMoney() {
  const { base, options, code } = useContext(C);
  const chosen = options.find((o) => o.code === code) ?? null;
  return useCallback((pence: number) => formatMoney(pence, base, chosen), [base, chosen]);
}
export const useCurrency = () => useContext(C);

/** For server components: renders an amount that follows the shopper's chosen currency. */
export function Price({ pence }: { pence: number }) { return <>{useMoney()(pence)}</>; }

export function CurrencySwitcher() {
  const { base, options, code, setCode } = useCurrency();
  if (!options.length) return null;
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span>Show prices in</span>
      <select value={code} onChange={(e) => setCode(e.target.value)} className="border border-ink/30 bg-paper px-2 py-1">
        <option value={base}>{base}</option>
        {options.map((o) => <option key={o.code} value={o.code}>{o.code}</option>)}
      </select>
    </label>
  );
}

const flag = (c: string) => `/flags/${c.toLowerCase()}.svg`;

/** Footer button that opens a full-screen list of regions (flag, name, currency). Falls back to the plain currency list when the store ships to one country. */
export function RegionSwitcher() {
  const { base, options, countries, country, setRegion } = useCurrency();
  const ref = useRef<HTMLDialogElement>(null);
  if (countries.length < 2) return <CurrencySwitcher />;
  const shown = (c: string) => { const cur = currencyFor(c); return cur && (cur === base || options.some((o) => o.code === cur)) ? cur : base; };
  return (
    <>
      <button type="button" onClick={() => ref.current?.showModal()} aria-haspopup="dialog" className="inline-flex items-center gap-2 border border-ink/30 px-3 py-2 text-sm">
        {/* eslint-disable-next-line @next/next/no-img-element -- tiny local SVG */}
        <img src={flag(country)} alt="" width={24} height={16} className="h-4 w-6 object-cover" />
        <span>{countryName(country)}</span><span aria-hidden>▾</span>
      </button>
      <dialog ref={ref} aria-label="Select your region" onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }} className="m-0 h-full max-h-none w-full max-w-none bg-ink/95 p-0 text-paper backdrop:bg-ink/80">
        <div className="mx-auto max-w-4xl px-6 py-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Select your region</h2>
            <button type="button" onClick={() => ref.current?.close()} className="border border-paper/40 px-3 py-1 text-sm">Close</button>
          </div>
          <p className="mt-2 text-sm opacity-70">Sets where we deliver and the currency you see prices in. You are always charged in {base}.</p>
          <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {countries.map((c) => (
              <li key={c}>
                <button type="button" aria-current={c === country} onClick={() => { setRegion(c); ref.current?.close(); }} className={`flex w-full items-center gap-3 border px-3 py-3 text-left ${c === country ? "border-paper" : "border-paper/20"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- tiny local SVG */}
                  <img src={flag(c)} alt="" width={32} height={21} className="h-5 w-8 shrink-0 object-cover" />
                  <span><span className="block">{countryName(c)}</span><span className="block text-xs opacity-70">{shown(c)} {currencySymbol(shown(c))}</span></span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </dialog>
    </>
  );
}
