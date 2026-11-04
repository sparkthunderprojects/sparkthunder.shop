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

export function absoluteUrl(path = "/"): string {
  return `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
}

export function formatPrice(pence: number, currency: string = SITE.currency): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(pence / 100);
}
