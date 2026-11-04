export const SITE = {
  name: "Sparkthunder Shop",
  legalName: "Sparkthunder",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://sparkthunder.shop").replace(/\/$/, ""),
  tagline: "Official merchandise from the Sparkthunder universe of franchises",
  description:
    "The official Sparkthunder store. Shop apparel, collectibles, drinkware, posters and tabletop gear from Knightverge, Grim Gala and every franchise in the Sparkthunder universe.",
  locale: "en_GB",
  currency: "GBP",
  twitter: "@sparkthunder",
  // Links used in Organization JSON-LD `sameAs` - add real profiles as they exist.
  sameAs: [] as string[],
} as const;

/**
 * Optional free-shipping threshold in pence, set via NEXT_PUBLIC_FREE_SHIPPING_PENCE (e.g. 5000 for GBP 50).
 * Leave unset until the shop really offers it: the progress bar only appears when this has a value.
 */
const freeShipping = Number(process.env.NEXT_PUBLIC_FREE_SHIPPING_PENCE);
export const FREE_SHIPPING_PENCE: number | null = Number.isFinite(freeShipping) && freeShipping > 0 ? freeShipping : null;

/** Public contact address shown on the legal pages. Set NEXT_PUBLIC_CONTACT_EMAIL once a real inbox exists. */
export const CONTACT_EMAIL: string | null = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || null;

/** Payment methods shown in the footer. Keep in step with what Stripe is configured to accept. */
export const PAYMENT_METHODS = ["Visa", "Mastercard", "American Express", "Apple Pay", "Google Pay"] as const;

export const LEGAL_PAGES = [
  { href: "/terms", label: "Terms of use" },
  { href: "/privacy", label: "Privacy policy" },
  { href: "/cookies", label: "Cookie policy" },
  { href: "/accessibility", label: "Accessibility statement" },
] as const;

export function absoluteUrl(path = "/"): string {
  return `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
}

export function formatPrice(pence: number, currency: string = SITE.currency): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(pence / 100);
}

/** Rotating announcement-bar messages. Keep these factual: only advertise offers that really exist. */
export const ANNOUNCEMENTS: { text: string; href?: string }[] = [
  { text: "Official merchandise from every Sparkthunder universe", href: "/shop" },
  { text: "New arrivals just landed", href: "/new" },
  { text: "Join the list for first access to new drops", href: "#newsletter" },
];
