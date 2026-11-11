/** A currency shoppers can view prices in. `rate` is how many of this currency equal 1 unit of the store's own currency (e.g. 1.27 USD per GBP). */
export type DisplayCurrency = { code: string; rate: number };

// Older browsers cannot list currencies; there the three-letter check alone applies (this code also runs on the server, where it always can).
const KNOWN: Set<string> | null = typeof Intl.supportedValuesOf === "function" ? new Set<string>(Intl.supportedValuesOf("currency")) : null;

/** Clean up currencies from the admin form: three-letter codes the browser knows, never the store's own, each once, with a sensible positive rate. */
export function normaliseCurrencies(raw: unknown, base: string): DisplayCurrency[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>([base.toUpperCase()]), out: DisplayCurrency[] = [];
  for (const c of raw.slice(0, 12) as Partial<DisplayCurrency>[]) {
    const code = String(c?.code ?? "").trim().toUpperCase(), rate = Number(c?.rate);
    if (!/^[A-Z]{3}$/.test(code) || seen.has(code) || !Number.isFinite(rate) || rate <= 0 || rate > 100000) continue;
    if (KNOWN && !KNOWN.has(code)) continue;
    seen.add(code); out.push({ code, rate: Math.round(rate * 1e6) / 1e6 });
  }
  return out;
}

/** Show an amount held in pence of the store's currency. With a chosen currency it is converted and marked as approximate; the store is always paid in its own currency. */
export function formatMoney(pence: number, base: string, chosen?: DisplayCurrency | null): string {
  if (!chosen || chosen.code === base) return new Intl.NumberFormat("en-GB", { style: "currency", currency: base }).format(pence / 100);
  return "≈" + new Intl.NumberFormat("en-GB", { style: "currency", currency: chosen.code }).format((pence / 100) * chosen.rate);
}

type Fetch = (url: string) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;
/** Today's reference rates (European Central Bank, via frankfurter.dev). Returns only the codes it knew. */
export async function fetchRates(base: string, codes: string[], fetchImpl: Fetch = fetch as unknown as Fetch): Promise<{ ok: true; rates: Record<string, number> } | { ok: false; error: string }> {
  const want = [...new Set(codes.map((c) => c.toUpperCase()).filter((c) => /^[A-Z]{3}$/.test(c) && c !== base))];
  if (!want.length) return { ok: false, error: "Add at least one currency first." };
  try {
    const res = await fetchImpl(`https://api.frankfurter.dev/v1/latest?base=${base}&symbols=${want.join(",")}`);
    if (!res.ok) return { ok: false, error: "The rate service did not answer. Try again, or type the rates in yourself." };
    const body = (await res.json()) as { rates?: Record<string, number> };
    const rates = Object.fromEntries(Object.entries(body.rates ?? {}).filter(([k, v]) => want.includes(k) && Number.isFinite(v) && v > 0));
    return Object.keys(rates).length ? { ok: true, rates } : { ok: false, error: "The rate service had none of those currencies." };
  } catch { return { ok: false, error: "Could not reach the rate service. Type the rates in yourself, or try again later." }; }
}
