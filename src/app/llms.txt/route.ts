import { getAllProducts, getCategories, getFranchises } from "@/lib/catalog";
import { formatPrice, SITE, absoluteUrl } from "@/lib/site";
import { productSeo } from "@/lib/seo/effective";

export const revalidate = 3600;

/** A plain-text map of the store for AI assistants and answer engines (llmstxt.org). */
export async function GET() {
  const [franchises, categories, products] = await Promise.all([getFranchises(), getCategories(), getAllProducts()]);
  const visible = products.filter((p) => !productSeo(p, null).noindex);
  const lines = [
    `# ${SITE.name}`, "",
    `> ${SITE.description}`, "",
    "Official merchandise for the Sparkthunder universes. Prices are in GBP.", "",
    "## Franchises",
    ...franchises.map((f) => `- [${f.name}](${absoluteUrl(`/franchises/${f.slug}`)}): ${f.tagline}`), "",
    "## Categories",
    ...categories.map((c) => `- [${c.name}](${absoluteUrl(`/categories/${c.slug}`)})`), "",
    "## Products",
    ...visible.map((p) => `- [${p.name}](${absoluteUrl(`/products/${p.slug}`)}): ${formatPrice(p.pricePence)}${p.inStock ? "" : " (sold out)"}. ${p.shortDescription}`), "",
    "## Policies",
    `- [Terms](${absoluteUrl("/terms")})`, `- [Privacy](${absoluteUrl("/privacy")})`, "",
  ];
  return new Response(lines.join("\n"), { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
