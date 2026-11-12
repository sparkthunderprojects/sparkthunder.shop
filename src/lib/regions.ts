/** Which currency each country normally uses. Used by the region picker to pair a delivery country with a display currency. */
const TABLE = `AD EUR,AE AED,AL ALL,AM AMD,AR ARS,AT EUR,AU AUD,AZ AZN,BA BAM,BD BDT,BE EUR,BG BGN,BH BHD,BR BRL,CA CAD,CH CHF,CL CLP,CN CNY,CO COP,CR CRC,CY EUR,CZ CZK,DE EUR,DK DKK,DO DOP,EC USD,EE EUR,EG EGP,ES EUR,FI EUR,FR EUR,GB GBP,GE GEL,GR EUR,GT GTQ,HK HKD,HR EUR,HU HUF,ID IDR,IE EUR,IL ILS,IN INR,IS ISK,IT EUR,JM JMD,JO JOD,JP JPY,KE KES,KR KRW,KW KWD,KZ KZT,LI CHF,LK LKR,LT EUR,LU EUR,LV EUR,MA MAD,MC EUR,MD MDL,ME EUR,MK MKD,MT EUR,MX MXN,MY MYR,NG NGN,NL EUR,NO NOK,NZ NZD,OM OMR,PA USD,PE PEN,PH PHP,PK PKR,PL PLN,PT EUR,QA QAR,RO RON,RS RSD,SA SAR,SE SEK,SG SGD,SI EUR,SK EUR,TH THB,TN TND,TR TRY,TW TWD,UA UAH,US USD,UY UYU,VN VND,ZA ZAR`;
export const COUNTRY_CURRENCY: Record<string, string> = Object.fromEntries(TABLE.split(",").map((p) => p.split(" ")));

/** The currency a country uses, or null if we have no entry for it. */
export const currencyFor = (country: string): string | null => COUNTRY_CURRENCY[country.toUpperCase()] ?? null;

/** Plain-English country name ("United Kingdom"). */
export function countryName(code: string): string {
  try { return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code; } catch { return code; }
}
/** The currency's symbol on its own ("€", "$", "£"). */
export function currencySymbol(code: string): string {
  try { return new Intl.NumberFormat("en", { style: "currency", currency: code, currencyDisplay: "narrowSymbol" }).formatToParts(0).find((p) => p.type === "currency")?.value ?? code; } catch { return code; }
}
/** Currencies needed to cover a list of delivery countries, other than the store's own. */
export function currenciesForCountries(countries: string[], base: string): string[] {
  return [...new Set(countries.map(currencyFor).filter((c): c is string => Boolean(c) && c !== base))];
}
