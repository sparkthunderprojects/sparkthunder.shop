import { DEFAULT_STORE, normaliseStore, type FontPreset, type StoreSettings } from "@/lib/store-config";

/**
 * A store's layout choices, kept next to its colours and fonts. Stored per store as one JSON setting (key "theme"),
 * so every brand can look and feel different without separate code.
 */
export const HEADERS = ["classic", "compact"] as const;
export const CARDS = ["bordered", "soft", "minimal"] as const;
export const PRODUCT_PAGES = ["split", "stacked"] as const;
export const FOOTERS = ["full", "compact"] as const;
export const HOME_SECTION_IDS = ["hero", "categories", "characters", "featured", "new", "story", "gift-cards"] as const;
export type HeaderStyle = (typeof HEADERS)[number];
export type CardStyle = (typeof CARDS)[number];
export type ProductPageStyle = (typeof PRODUCT_PAGES)[number];
export type FooterStyle = (typeof FOOTERS)[number];
export type HomeSectionId = (typeof HOME_SECTION_IDS)[number];

export type ThemeLayout = {
  header: HeaderStyle; card: CardStyle; productPage: ProductPageStyle; footer: FooterStyle;
  /** Home page sections, in order. Used by every store except the original Sparkthunder shop, whose home page is hand-designed. */
  home: { id: HomeSectionId; on: boolean }[];
  storyTitle: string; storyText: string;
};

export const LABELS = {
  header: { classic: "Classic: centred logo with a menu of franchises underneath", compact: "Compact: logo on the left, links in one row" },
  card: { bordered: "Bordered: image in a thin frame", soft: "Soft: tinted cards with rounded corners", minimal: "Minimal: no frame, text on the left" },
  productPage: { split: "Side by side: photos left, details right", stacked: "Stacked: big photos on top, details centred below" },
  footer: { full: "Full: logo, description and link columns", compact: "Compact: one tidy row" },
} as const;
export const SECTION_LABEL: Record<HomeSectionId, string> = {
  hero: "Hero: heading, text and featured products", categories: "Shop by category", characters: "Shop by character", featured: "Featured products", new: "New arrivals", story: "Brand story", "gift-cards": "Gift cards banner",
};

export const DEFAULT_THEME: ThemeLayout = {
  header: "classic", card: "bordered", productPage: "split", footer: "full",
  home: [{ id: "hero", on: true }, { id: "categories", on: true }, { id: "characters", on: false }, { id: "new", on: true }, { id: "featured", on: false }, { id: "story", on: false }, { id: "gift-cards", on: false }],
  storyTitle: "Our story", storyText: "",
};

const pick = <T extends string>(list: readonly T[], v: unknown, fallback: T): T => (typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : fallback);

/** Clean layout settings: unknown values fall back, home sections are de-duplicated, and every section is always present exactly once. */
export function normaliseTheme(raw: Partial<ThemeLayout> | null | undefined): ThemeLayout {
  const r = raw ?? {}, d = DEFAULT_THEME;
  const seen = new Set<HomeSectionId>();
  const home: ThemeLayout["home"] = [];
  for (const s of Array.isArray(r.home) ? r.home : []) {
    const id = s?.id as HomeSectionId;
    if ((HOME_SECTION_IDS as readonly string[]).includes(id) && !seen.has(id)) { seen.add(id); home.push({ id, on: s.on === true }); }
  }
  for (const s of d.home) if (!seen.has(s.id)) home.push({ ...s, on: Array.isArray(r.home) ? false : s.on });
  return {
    header: pick(HEADERS, r.header, d.header), card: pick(CARDS, r.card, d.card), productPage: pick(PRODUCT_PAGES, r.productPage, d.productPage), footer: pick(FOOTERS, r.footer, d.footer),
    home, storyTitle: typeof r.storyTitle === "string" ? r.storyTitle.trim().slice(0, 80) : d.storyTitle, storyText: typeof r.storyText === "string" ? r.storyText.trim().slice(0, 1500) : d.storyText,
  };
}

export type Preset = { id: string; name: string; blurb: string; look: Partial<StoreSettings> & { font: FontPreset }; layout: Partial<ThemeLayout> };
/** Starting points. Applying one sets colours, type, corners and layout together; the owner can then adjust anything. */
export const PRESETS: Preset[] = [
  { id: "classic", name: "Classic", blurb: "The original Sparkthunder look: black header, yellow accent, bold type.",
    look: { accent: DEFAULT_STORE.accent, dark: "#000000", light: "#ffffff", text: "#0b0b0c", font: "bold", radius: 2, uppercaseButtons: false }, layout: { header: "classic", card: "bordered", productPage: "split", footer: "full" } },
  { id: "dark-bold", name: "Dark and bold", blurb: "Near-black, neon accent, sharp corners and loud type. Good for horror, sci-fi and gaming brands.",
    look: { accent: "#7cff4d", dark: "#07080c", light: "#101218", text: "#f2f3f5", font: "modern", radius: 0, uppercaseButtons: true }, layout: { header: "compact", card: "minimal", productPage: "split", footer: "compact" } },
  { id: "clean-light", name: "Clean and light", blurb: "White space, a soft accent and rounded corners. Soft pink accent on a plum header. Good for beauty, lifestyle and gift brands.",
    look: { accent: "#e0457b", dark: "#2b1a24", light: "#fbf8f6", text: "#222222", font: "soft", radius: 24, uppercaseButtons: false }, layout: { header: "compact", card: "soft", productPage: "stacked", footer: "full" } },
  { id: "editorial", name: "Editorial", blurb: "Serif headlines, calm colours and a magazine feel. Good for books, art and collectables.",
    look: { accent: "#b08d57", dark: "#14110f", light: "#f6f1ea", text: "#1d1a17", font: "editorial", radius: 0, uppercaseButtons: false }, layout: { header: "classic", card: "minimal", productPage: "stacked", footer: "compact" } },
];

/** The store look and layout a preset produces, merged over what the store already has (name, logo and text are kept). */
export function applyPreset(id: string, store: StoreSettings, theme: ThemeLayout): { store: StoreSettings; theme: ThemeLayout } | null {
  const p = PRESETS.find((x) => x.id === id);
  if (!p) return null;
  return { store: normaliseStore({ ...store, ...p.look }), theme: normaliseTheme({ ...theme, ...p.layout }) };
}
