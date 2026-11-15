import { normaliseStore, type StoreSettings } from "@/lib/store-config";
import { normaliseTheme, type ThemeLayout } from "@/lib/theme-config";

/**
 * Ready-made starting points for a new store: brand, layout, product lines, categories and (empty, unpublished) collections.
 * Never products, orders, customers or keys. Used by Admin > Stores ("Start a store from a template") and by the demo data.
 */
export type Starter = {
  id: string; name: string; blurb: string;
  store: Partial<StoreSettings>;
  theme: Partial<ThemeLayout>;
  franchises: { slug: string; name: string; tagline: string; description: string; accent: string }[];
  categories: { slug: string; name: string; description: string }[];
  collections: { slug: string; name: string; description: string }[];
};

export const OSAKA76: Starter = {
  id: "osaka76", name: "Osaka76", blurb: "Premium streetwear: white catalogue look, slim header, banner slides, members club, hoodies, tees, trousers, outerwear, hats and accessories.",
  store: {
    name: "Osaka76", legalName: "Osaka76", tagline: "Premium streetwear", heroHeading: "Osaka76 premium streetwear",
    description: "Heavyweight, boxy, made to last. Premium streetwear drawn from Osaka nights.",
    logoUrl: "/osaka76/logo-white.png", logoWidth: 604, logoHeight: 600, logoLabel: "",
    accent: "#e4002b", dark: "#0a0a0a", light: "#ffffff", text: "#0a0a0a", font: "modern", radius: 0, uppercaseButtons: true, announcements: [],
  },
  theme: {
    header: "slim", card: "catalogue", productPage: "split", footer: "full",
    home: [{ id: "split", on: true }, { id: "slides", on: false }, { id: "new", on: true }, { id: "categories", on: true }, { id: "loyalty", on: true }, { id: "featured", on: true }, { id: "story", on: true }, { id: "hero", on: false }, { id: "characters", on: false }, { id: "gift-cards", on: false }],
    storyTitle: "Born in Osaka",
    storyText: "Osaka76 started with one heavyweight hoodie and a simple rule: if it is not worth wearing for ten years, we do not make it. Every piece is cut boxy, washed by hand and numbered by drop.",
    split: [
      { image: "/osaka76/osaka-street-tee.jpg", label: "Winter 76", title: "Osaka Street", label1: "Shop now", href1: "/new", label2: "Shop tees", href2: "/categories/tees" },
      { image: "/osaka76/drunken-octopus-tee.jpg", label: "Dotonbori", title: "Drunken Octopus", label1: "Shop now", href1: "/categories/tees", label2: "Shop collection", href2: "/collections/streetwear-hats" },
    ],
    slides: [
      { image: "/osaka76/banner-1.svg", headline: "Winter 76 is here", text: "Heavyweight hoodies, boxy tees and the new Kansai puffer.", label1: "Shop new arrivals", href1: "/new", label2: "Shop outerwear", href2: "/categories/outerwear" },
      { image: "/osaka76/banner-2.svg", headline: "The Members Club", text: "Early access to every drop, points on every order.", label1: "Join the club", href1: "/account", label2: "", href2: "" },
    ],
    lookbook: [
      { image: "/osaka76/look-1.svg", title: "Core", caption: "Everyday essentials", href: "/franchises/core" }, { image: "/osaka76/look-2.svg", title: "Archive", caption: "Numbered, limited drops", href: "/franchises/archive" },
      { image: "/osaka76/look-3.svg", title: "Winter 76", caption: "Heavyweight layers", href: "/categories/outerwear" }, { image: "/osaka76/look-4.svg", title: "Bestsellers", caption: "What everyone is wearing", href: "/collections/bestsellers" },
      { image: "/osaka76/look-5.svg", title: "New arrivals", caption: "The latest drop", href: "/new" },
    ],
    loyalty: { title: "The Osaka76 Members Club", text: "Free to join. Made for people who never miss a drop.", bullets: ["Early access to every drop", "Points on every order", "Members-only restocks"], joinLabel: "Join", joinHref: "/account", image: "" },
  },
  franchises: [
    { slug: "core", name: "Core", tagline: "The everyday range", description: "Year-round essentials.", accent: "#e4002b" },
    { slug: "archive", name: "Archive", tagline: "Limited runs", description: "Numbered, limited and gone when sold out.", accent: "#0a0a0a" },
  ],
  categories: ["hoodies", "tees", "trousers", "outerwear", "hats", "accessories"].map((c) => ({ slug: c, name: c[0].toUpperCase() + c.slice(1), description: `Osaka76 ${c}.` })),
  collections: [
    { slug: "new-arrivals", name: "New arrivals", description: "The latest drop." },
    { slug: "bestsellers", name: "Bestsellers", description: "What everyone is wearing." },
    { slug: "streetwear-hats", name: "Caps & Hats", description: "Shop caps and hats from Osaka76. From structured baseball caps and truckers to washed bucket hats and ribbed beanies, every piece is cut from premium materials with refined detailing." },
  ],
};

export const STARTERS: Starter[] = [OSAKA76];
export const starterById = (id: string) => STARTERS.find((s) => s.id === id) ?? null;

/** The settings a starter writes, cleaned the same way the admin cleans them on save. */
export const starterSettings = (s: Starter, name: string): { store: StoreSettings; theme: ThemeLayout } => ({
  store: normaliseStore({ ...s.store, name, legalName: name }),
  theme: normaliseTheme(s.theme),
});
