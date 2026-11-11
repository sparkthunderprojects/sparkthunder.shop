"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { formatMoney, type DisplayCurrency } from "@/lib/currency";

const KEY = "spark-currency";
type Ctx = { base: string; options: DisplayCurrency[]; code: string; setCode: (c: string) => void };
const C = createContext<Ctx>({ base: "GBP", options: [], code: "GBP", setCode: () => {} });

/**
 * Lets shoppers view prices in another currency. The server always renders the store's own currency (so search engines, caching and
 * the first paint agree); after load, a saved choice switches the display. Payment is always in the store's currency.
 */
export function CurrencyProvider({ base, options, children }: { base: string; options: DisplayCurrency[]; children: React.ReactNode }) {
  const [code, set] = useState(base);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a saved choice can only be read after hydration, so the server and first paint agree
    try { const s = localStorage.getItem(KEY); if (s && options.some((o) => o.code === s)) set(s); } catch { /* private mode */ }
  }, [options]);
  const setCode = useCallback((c: string) => { set(c); try { if (c === base) localStorage.removeItem(KEY); else localStorage.setItem(KEY, c); } catch { /* private mode */ } }, [base]);
  const value = useMemo(() => ({ base, options, code, setCode }), [base, options, code, setCode]);
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
