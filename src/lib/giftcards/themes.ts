/**
 * Gift card designs. "brand" always uses the store's own colours, so every store has a card that looks like itself.
 * The universe designs (bolt, knightverge, occult) belong to the original Sparkthunder shop; other stores get neutral extras instead.
 * Older cards keep whatever design id they were issued with, so every id here must stay valid forever.
 */
export type GiftTheme = { id: string; label: string; bg: string; accent: string };

const UNIVERSE: GiftTheme[] = [
  { id: "bolt", label: "Bolt", bg: "linear-gradient(135deg,#0b0b0c 0%,#1a1a1f 60%,#2a2400 100%)", accent: "#ffd400" },
  { id: "knightverge", label: "Knightverge", bg: "linear-gradient(135deg,#0b0b0c 0%,#10172e 100%)", accent: "#6ea8ff" },
  { id: "occult", label: "Occult Inc", bg: "linear-gradient(135deg,#0b0b0c 0%,#2a1450 100%)", accent: "#b794f6" },
];
const NEUTRAL: GiftTheme[] = [
  { id: "rose", label: "Rose", bg: "linear-gradient(135deg,#2b0f1a 0%,#5a1f3a 100%)", accent: "#ff9ec0" },
  { id: "forest", label: "Forest", bg: "linear-gradient(135deg,#07130d 0%,#12392a 100%)", accent: "#7be0a8" },
  { id: "midnight", label: "Midnight", bg: "linear-gradient(135deg,#0b0b0c 0%,#10172e 100%)", accent: "#6ea8ff" },
];

export const BRAND_THEME_ID = "brand";
export const ALL_THEME_IDS = [BRAND_THEME_ID, ...UNIVERSE.map((t) => t.id), ...NEUTRAL.map((t) => t.id)];
export const isGiftThemeId = (id: unknown): id is string => typeof id === "string" && ALL_THEME_IDS.includes(id);

export function brandTheme(store: { name: string; dark: string; accent: string }): GiftTheme {
  return { id: BRAND_THEME_ID, label: store.name, bg: `linear-gradient(135deg,${store.dark} 0%,${store.dark} 55%,${store.accent}55 130%)`, accent: store.accent };
}

/** The designs a store offers when selling a gift card. */
export function giftThemes(store: { name: string; dark: string; accent: string }, isOriginalStore: boolean): GiftTheme[] {
  return [brandTheme(store), ...(isOriginalStore ? UNIVERSE : NEUTRAL)];
}

/** Colour of the amount and "GIFT CARD" label in the emailed card. The brand design uses a template token filled per store. */
export function emailAccent(id: string): string {
  if (id === BRAND_THEME_ID) return "{{accent}}";
  return [...UNIVERSE, ...NEUTRAL].find((t) => t.id === id)?.accent ?? "{{accent}}";
}
