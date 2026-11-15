import type { Product } from "@/lib/types";

/** Twelve sample caps and hats for the Osaka76 template (placeholder art in public/osaka76/hats). Used by the demo store and by Admin > Products > "Add sample caps". */
export const CAP_COLOURS: Record<string, string> = { Black: "#111111", Ecru: "#e8e0d0", Red: "#b01e28", Navy: "#1f2a44", Brown: "#6b4a3a", Slate: "#4f5b6b" };
export const CAPS: [slug: string, name: string, pricePence: number, colours: string[], isNew: boolean][] = [
  ["osaka76-castle-cap", "Osaka76 Castle Cap", 4500, ["Black", "Brown", "Red", "Slate"], true], ["dotonbori-trucker", "Dotonbori Trucker Cap", 4200, ["Black", "Navy", "Red", "Ecru"], false], ["kita-bucket-hat", "Kita Washed Bucket Hat", 4800, ["Ecru", "Black", "Slate"], true],
  ["shibuya-five-panel", "Shibuya 5-Panel Cap", 4500, ["Navy", "Black", "Brown", "Red"], false], ["namba-beanie", "Namba Ribbed Beanie", 3200, ["Black", "Ecru", "Red"], true], ["sakai-dad-cap", "Sakai Distressed Dad Cap", 4600, ["Brown", "Black", "Slate", "Navy"], false],
  ["midosuji-snapback", "Midosuji Snapback", 4400, ["Black", "Red"], false], ["umeda-ball-cap", "Umeda Ball Cap", 4000, ["Black", "Ecru", "Navy", "Red"], false], ["tsuruhashi-visor", "Tsuruhashi Visor", 3800, ["Black", "Ecru"], false],
  ["kansai-beanie", "Kansai Cuffed Beanie", 3400, ["Slate", "Black", "Brown", "Red"], true], ["script-76-cap", "76 Script Cap", 4700, ["Black", "Brown", "Navy", "Ecru"], true], ["night-market-cap", "Night Market Cap", 4900, ["Black", "Slate", "Red"], false],
];
export const CAP_SLUGS = CAPS.map((c) => c[0]);

export function capProduct([slug, name, pricePence, colours, isNew]: (typeof CAPS)[number], createdAt: string): Product {
  return {
    slug, sku: `O76-${slug.replace(/-/g, "").slice(0, 10)}`.toUpperCase(), name, franchiseSlug: "core", categorySlug: "hats", pricePence,
    shortDescription: `${name}. One size, adjustable.`, description: `${name} from Osaka76: structured crown, embroidered 76 mark, adjustable strap. One size.`,
    details: [], images: [`/osaka76/hats/${slug}.svg`], inStock: true, isNew, isFeatured: isNew, createdAt, trackStock: true, stockQty: colours.length * 12, lowStockThreshold: 5,
    optionNames: ["Colour", "Size"], swatches: Object.fromEntries(colours.map((c) => [c, CAP_COLOURS[c]])),
    variants: colours.map((c) => ({ name: `${c} / One size`, sku: `O76-${slug.replace(/-/g, "").slice(0, 8)}-${c.slice(0, 3)}`.toUpperCase(), stockQty: 12 })),
    published: true,
  };
}
