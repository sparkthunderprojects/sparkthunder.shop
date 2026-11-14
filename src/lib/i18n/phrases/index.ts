import { cart, region } from "./cart";
import { search, consent } from "./search";
import { shopui } from "./shopui";
import { product } from "./product";
import { listing } from "./listing";
import { social, social2 } from "./social";
import { home } from "./home";
import { pdp } from "./pdp";
import { pay } from "./pay";
import { help, helpUi } from "./help";
import { pages, pages2, pages3, pages4, pages5 } from "./pages";
export type Phrase = readonly [en: string, fr: string, de: string, es: string];
export const PHRASES_LIST: Phrase[] = dedupe([...cart, ...region, ...search, ...consent, ...shopui, ...product, ...listing, ...social, ...social2, ...home, ...pdp, ...pages, ...pages2, ...pages3, ...pages4, ...pages5, ...pay, ...help, ...helpUi]);

/** The same English wording can appear in several files; the first translation wins. */
function dedupe(list: Phrase[]): Phrase[] {
  const seen = new Set<string>();
  return list.filter((p) => (seen.has(p[0]) ? false : (seen.add(p[0]), true)));
}
