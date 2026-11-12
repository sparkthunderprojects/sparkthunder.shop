import type { CSSProperties } from "react";
import { SITE } from "@/lib/site";

/**
 * A store's brand and look. Everything a second store would change lives here, in the database,
 * so a new store is new settings rather than new code. Defaults reproduce the current Sparkthunder shop exactly.
 */
export type FontPreset = "bold" | "editorial" | "modern" | "soft";
export type StoreSettings = {
  name: string;            // shown in the browser tab and structured data
  legalName: string;
  tagline: string;
  /** Main heading on the home page (an H1, so make it say what the store sells). */
  heroHeading: string;
  description: string;     // longer blurb: footer text and default search description
  logoUrl: string;         // logo for dark backgrounds (white or light artwork)
  logoWidth: number;
  logoHeight: number;
  logoLabel: string;       // small word under the logo, e.g. SHOP. Empty = none
  accent: string;          // buttons, highlights, price slider
  dark: string;            // header, footer and dark sections
  light: string;           // page background
  text: string;            // text colour on light areas
  font: FontPreset;
  radius: number;          // button and field corner radius in px
  uppercaseButtons: boolean;
  announcements: { text: string; href: string }[];
};

export const FONT_PRESETS: Record<FontPreset, { label: string; display: string; body: string; weight: number; tracking: string }> = {
  bold: { label: "Bold (Inter)", display: '"Inter Variable"', body: '"Inter Variable"', weight: 800, tracking: "-0.035em" },
  editorial: { label: "Editorial (Playfair Display + Inter)", display: '"Playfair Display Variable"', body: '"Inter Variable"', weight: 600, tracking: "-0.01em" },
  modern: { label: "Modern (Space Grotesk)", display: '"Space Grotesk Variable"', body: '"Space Grotesk Variable"', weight: 700, tracking: "-0.03em" },
  soft: { label: "Soft (DM Sans)", display: '"DM Sans Variable"', body: '"DM Sans Variable"', weight: 600, tracking: "-0.02em" },
};

export const DEFAULT_STORE: StoreSettings = {
  name: SITE.name,
  legalName: SITE.legalName,
  tagline: SITE.tagline,
  heroHeading: "Official merchandise from every Sparkthunder universe",
  description: SITE.description,
  logoUrl: "/sparkthunder-logo.png",
  logoWidth: 1200,
  logoHeight: 186,
  logoLabel: "SHOP",
  accent: "#ffd400",
  dark: "#000000",
  light: "#ffffff",
  text: "#0b0b0c",
  font: "bold",
  radius: 2,
  uppercaseButtons: false,
  announcements: [
    { text: "Official merchandise from every Sparkthunder universe", href: "/shop" },
    { text: "New arrivals just landed", href: "/new" },
    { text: "Join the list for first access to new drops", href: "#newsletter" },
  ],
};

const HEX = /^#[0-9a-fA-F]{6}$/;
const hex = (v: unknown, fallback: string) => (typeof v === "string" && HEX.test(v.trim()) ? v.trim().toLowerCase() : fallback);
const str = (v: unknown, fallback: string, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : fallback);

/** Clean, range-checked settings. Anything missing or invalid falls back to the default. */
export function normaliseStore(raw: Partial<StoreSettings> | null | undefined): StoreSettings {
  const r = raw ?? {};
  const d = DEFAULT_STORE;
  const font = (r.font && r.font in FONT_PRESETS ? r.font : d.font) as FontPreset;
  const logoUrl = str(r.logoUrl, d.logoUrl, 500);
  return {
    name: str(r.name, d.name, 60) || d.name,
    legalName: str(r.legalName, d.legalName, 80) || d.legalName,
    tagline: str(r.tagline, d.tagline, 160),
    heroHeading: str(r.heroHeading, d.heroHeading, 120),
    description: str(r.description, d.description, 320),
    logoUrl: r.logoUrl === "" ? "" : /^(\/|https:\/\/)/.test(logoUrl) ? logoUrl : d.logoUrl,
    logoWidth: Math.min(4000, Math.max(20, Math.round(Number(r.logoWidth) || d.logoWidth))),
    logoHeight: Math.min(4000, Math.max(20, Math.round(Number(r.logoHeight) || d.logoHeight))),
    logoLabel: str(r.logoLabel, d.logoLabel, 14),
    accent: hex(r.accent, d.accent), dark: hex(r.dark, d.dark), light: hex(r.light, d.light), text: hex(r.text, d.text),
    font,
    radius: Math.min(32, Math.max(0, Math.round(Number(r.radius ?? d.radius)))),
    uppercaseButtons: r.uppercaseButtons === true,
    announcements: Array.isArray(r.announcements)
      ? r.announcements.map((a) => ({ text: str(a?.text, "", 120), href: /^(\/|#|https:\/\/)/.test(str(a?.href, "", 300)) ? str(a?.href, "", 300) : "" })).filter((a) => a.text).slice(0, 6)
      : d.announcements,
  };
}

/** Black or white, whichever reads better on this colour (used for text on buttons). */
export function readableOn(color: string): "#000000" | "#ffffff" {
  const c = HEX.test(color) ? color : "#000000";
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? "#000000" : "#ffffff";
}

/** CSS variables for the whole page, set once on <html>. Components keep using the same classes; the values change per store. */
export function storeCssVars(s: StoreSettings): CSSProperties {
  const f = FONT_PRESETS[s.font];
  return {
    ["--color-bolt" as string]: s.accent,
    ["--color-on-accent" as string]: readableOn(s.accent),
    ["--color-paper" as string]: s.light,
    ["--color-ink" as string]: s.text,
    ["--store-dark" as string]: s.dark,
    // Text on the dark areas (header, footer): light on a dark colour, dark on a light one, so any header colour stays readable.
    ["--store-dark-ink" as string]: readableOn(s.dark) === "#ffffff" ? "#f5f5f5" : "#0b0b0c",
    ["--store-dark-muted" as string]: readableOn(s.dark) === "#ffffff" ? "#a1a1a8" : "#55555c",
    ["--store-light" as string]: s.light,
    ["--store-text" as string]: s.text,
    ["--font-display" as string]: `${f.display}, ui-sans-serif, system-ui, sans-serif`,
    ["--font-sans" as string]: `${f.body}, ui-sans-serif, system-ui, sans-serif`,
    ["--display-weight" as string]: String(f.weight),
    ["--display-tracking" as string]: f.tracking,
    ["--btn-radius" as string]: `${s.radius}px`,
    ["--btn-transform" as string]: s.uppercaseButtons ? "uppercase" : "none",
  } as CSSProperties;
}

