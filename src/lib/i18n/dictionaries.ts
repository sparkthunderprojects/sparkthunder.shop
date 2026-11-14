import type { Locale } from "./config";
import { PHRASES_LIST as PHRASES } from "./phrases";

/**
 * Words the shop's own furniture uses (menus, footer, basket, search). English is the source: any key missing from another
 * language quietly falls back to English, so a half-finished translation never shows a blank or a raw key.
 * Product and collection text is translated separately, when it is saved.
 */
const en = {
  "skip": "Skip to content",
  "menu": "Menu", "close": "Close",
  "search.shop": "Search the shop", "search.button": "Search",
  "nav.shop": "Shop", "nav.gifts": "Gifts", "nav.franchises": "Franchises", "nav.universes": "The universes",
  "nav.shopByType": "Shop by type", "nav.shopByFranchise": "Shop by franchise", "nav.allMerch": "All merchandise",
  "nav.allFranchises": "All franchises", "nav.shopAll": "Shop all {name}", "nav.new": "New arrivals",
  "nav.giftsByPrice": "Gifts by price", "nav.under15": "Under £15", "nav.15to25": "£15 to £25", "nav.25to50": "£25 to £50",
  "nav.giftCards": "Gift cards", "nav.allGifts": "All gifts", "nav.more": "More", "nav.favourites": "Favourites", "nav.account": "My Sparkthunder ID",
  "nav.home": "{name} home",
  "nav.giftsByFranchise": "Gifts by franchise", "nav.forFans": "For {name} fans",
  "nav.giftBlurb": "Official merchandise makes an easy gift for readers, players and collectors alike. Start with a price, or pick the universe they love.",
  "footer.balance": "Check gift card balance", "footer.help": "Help Centre", "footer.payment": "Payment options",
  "footer.rights": "Official merchandise.", "footer.site": "{name} website", "footer.language": "Language",
  "legal.privacy": "Privacy", "legal.terms": "Terms", "legal.delivery": "Delivery and returns", "legal.accessibility": "Accessibility", "legal.cookies": "Cookie settings", "legal.cookiePolicy": "Cookie policy",
  "lang.switch": "Change language",
} as const;
export type DictKey = keyof typeof en;
type Dict = Record<DictKey, string>;

const fr: Partial<Dict> = {
  "skip": "Aller au contenu",
  "menu": "Menu", "close": "Fermer",
  "search.shop": "Rechercher dans la boutique", "search.button": "Rechercher",
  "nav.shop": "Boutique", "nav.gifts": "Cadeaux", "nav.franchises": "Franchises", "nav.universes": "Les univers",
  "nav.shopByType": "Acheter par type", "nav.shopByFranchise": "Acheter par franchise", "nav.allMerch": "Tous les produits",
  "nav.allFranchises": "Toutes les franchises", "nav.shopAll": "Tout voir : {name}", "nav.new": "Nouveautés",
  "nav.giftsByPrice": "Cadeaux par prix", "nav.under15": "Moins de 15 £", "nav.15to25": "De 15 £ à 25 £", "nav.25to50": "De 25 £ à 50 £",
  "nav.giftCards": "Cartes cadeaux", "nav.allGifts": "Tous les cadeaux", "nav.more": "Plus", "nav.favourites": "Favoris", "nav.account": "Mon identifiant Sparkthunder",
  "nav.home": "Accueil {name}",
  "nav.giftsByFranchise": "Cadeaux par franchise", "nav.forFans": "Pour les fans de {name}",
  "nav.giftBlurb": "Les produits officiels font un cadeau facile pour les lecteurs, les joueurs et les collectionneurs. Commencez par un prix, ou choisissez l’univers qu’ils aiment.",
  "footer.balance": "Consulter le solde d’une carte cadeau", "footer.help": "Centre d’aide", "footer.payment": "Moyens de paiement",
  "footer.rights": "Produits officiels.", "footer.site": "Site {name}", "footer.language": "Langue",
  "legal.privacy": "Confidentialité", "legal.terms": "Conditions", "legal.delivery": "Livraison et retours", "legal.accessibility": "Accessibilité", "legal.cookies": "Paramètres des cookies", "legal.cookiePolicy": "Politique relative aux cookies",
  "lang.switch": "Changer de langue",
};
const de: Partial<Dict> = {
  "skip": "Zum Inhalt springen",
  "menu": "Menü", "close": "Schließen",
  "search.shop": "Im Shop suchen", "search.button": "Suchen",
  "nav.shop": "Shop", "nav.gifts": "Geschenke", "nav.franchises": "Franchises", "nav.universes": "Die Universen",
  "nav.shopByType": "Nach Art einkaufen", "nav.shopByFranchise": "Nach Franchise einkaufen", "nav.allMerch": "Alle Artikel",
  "nav.allFranchises": "Alle Franchises", "nav.shopAll": "Alles von {name}", "nav.new": "Neuheiten",
  "nav.giftsByPrice": "Geschenke nach Preis", "nav.under15": "Unter 15 £", "nav.15to25": "15 £ bis 25 £", "nav.25to50": "25 £ bis 50 £",
  "nav.giftCards": "Geschenkkarten", "nav.allGifts": "Alle Geschenke", "nav.more": "Mehr", "nav.favourites": "Favoriten", "nav.account": "Meine Sparkthunder-ID",
  "nav.home": "{name} Startseite",
  "nav.giftsByFranchise": "Geschenke nach Franchise", "nav.forFans": "Für {name}-Fans",
  "nav.giftBlurb": "Offizielle Fanartikel sind ein einfaches Geschenk für Leser, Spieler und Sammler. Starten Sie mit einem Preis oder wählen Sie das Universum, das sie lieben.",
  "footer.balance": "Guthaben der Geschenkkarte prüfen", "footer.help": "Hilfe-Center", "footer.payment": "Zahlungsarten",
  "footer.rights": "Offizielle Fanartikel.", "footer.site": "{name} Website", "footer.language": "Sprache",
  "legal.privacy": "Datenschutz", "legal.terms": "Geschäftsbedingungen", "legal.delivery": "Lieferung und Rückgabe", "legal.accessibility": "Barrierefreiheit", "legal.cookies": "Cookie-Einstellungen", "legal.cookiePolicy": "Cookie-Richtlinie",
  "lang.switch": "Sprache ändern",
};
const es: Partial<Dict> = {
  "skip": "Saltar al contenido",
  "menu": "Menú", "close": "Cerrar",
  "search.shop": "Buscar en la tienda", "search.button": "Buscar",
  "nav.shop": "Tienda", "nav.gifts": "Regalos", "nav.franchises": "Franquicias", "nav.universes": "Los universos",
  "nav.shopByType": "Comprar por tipo", "nav.shopByFranchise": "Comprar por franquicia", "nav.allMerch": "Todos los productos",
  "nav.allFranchises": "Todas las franquicias", "nav.shopAll": "Ver todo de {name}", "nav.new": "Novedades",
  "nav.giftsByPrice": "Regalos por precio", "nav.under15": "Menos de 15 £", "nav.15to25": "De 15 £ a 25 £", "nav.25to50": "De 25 £ a 50 £",
  "nav.giftCards": "Tarjetas regalo", "nav.allGifts": "Todos los regalos", "nav.more": "Más", "nav.favourites": "Favoritos", "nav.account": "Mi ID de Sparkthunder",
  "nav.home": "Inicio de {name}",
  "nav.giftsByFranchise": "Regalos por franquicia", "nav.forFans": "Para fans de {name}",
  "nav.giftBlurb": "Los productos oficiales son un regalo fácil para lectores, jugadores y coleccionistas. Empieza por un precio o elige el universo que más les gusta.",
  "footer.balance": "Consultar el saldo de una tarjeta regalo", "footer.help": "Centro de ayuda", "footer.payment": "Formas de pago",
  "footer.rights": "Productos oficiales.", "footer.site": "Sitio de {name}", "footer.language": "Idioma",
  "legal.privacy": "Privacidad", "legal.terms": "Condiciones", "legal.delivery": "Envíos y devoluciones", "legal.accessibility": "Accesibilidad", "legal.cookies": "Ajustes de cookies", "legal.cookiePolicy": "Política de cookies",
  "lang.switch": "Cambiar de idioma",
};

const TABLES: Record<Locale, Partial<Dict>> = { en, fr, de, es };

/** A language's full table, English filling any gap. Small enough to hand to the browser. */
export function dictionary(locale: Locale): Dict {
  if (locale === "en") return { ...en };
  const i = locale === "fr" ? 1 : locale === "de" ? 2 : 3;
  const phrases: Record<string, string> = {};
  for (const p of PHRASES) if (p[i]) phrases[p[0]] = p[i];
  return { ...en, ...phrases, ...TABLES[locale] } as Dict;
}

/**
 * Keys are either a short dotted name from the table above, or the English sentence itself (the phrase book in phrases/).
 * Anything not found, in any language, shows as written: English is always the fallback.
 */
export function translate(dict: Dict, key: string, vars?: Record<string, string | number>): string {
  const text = (dict as Record<string, string>)[key] ?? key;
  return vars ? text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : text;
}
export { en as ENGLISH };
export type { Dict };
