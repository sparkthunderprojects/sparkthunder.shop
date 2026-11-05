// Drop-in server component for a Next.js universe website (App Router).
// Copy to components/SparkthunderLatestProducts.tsx. Needs Tailwind; no other dependencies.
// If you use next/image, add sparkthunder.shop (and its Supabase storage host) to images.remotePatterns, or keep the plain <img> below.
const SHOP = process.env.NEXT_PUBLIC_SPARKTHUNDER_SHOP_URL ?? "https://sparkthunder.shop";

type Product = { slug: string; name: string; url: string; image: string; price: string; comparePricePence: number | null; pricePence: number; inStock: boolean; isNew: boolean };
type Feed = { shop: { name: string; url: string }; franchise: { name: string; url: string; accent: string } | null; products: Product[] };

export async function SparkthunderLatestProducts({ franchise = "all", limit = 4, title, ref }: { franchise?: string; limit?: number; title?: string; ref?: string }) {
  let feed: Feed | null = null;
  try {
    const q = new URLSearchParams({ franchise, limit: String(limit) });
    if (ref) q.set("ref", ref);
    const res = await fetch(`${SHOP}/api/feed/products?${q}`, { next: { revalidate: 300 } });
    if (res.ok) feed = await res.json();
  } catch {}
  if (!feed || feed.products.length === 0) return null; // fail quietly: never break the host page

  return (
    <section aria-label="Latest products" className="rounded-2xl border border-white/10 bg-black/40 p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-lg font-bold">{title ?? (feed.franchise ? `Latest ${feed.franchise.name} merch` : "Latest from the Sparkthunder shop")}</h2>
        <a href={feed.franchise?.url ?? feed.shop.url} target="_blank" rel="noopener" className="text-sm font-semibold underline-offset-4 hover:underline">Shop all ↗</a>
      </div>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {feed.products.map((p) => (
          <li key={p.slug}>
            <a href={p.url} target="_blank" rel="noopener" className="group block overflow-hidden rounded-xl border border-white/10 bg-white/5 transition hover:-translate-y-0.5 hover:border-white/40">
              <div className="relative aspect-square bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image} alt={p.name} loading="lazy" className="h-full w-full object-cover" />
                {p.isNew && <span className="absolute left-2 top-2 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-extrabold text-black">NEW</span>}
              </div>
              <div className="p-3">
                <p className="line-clamp-2 text-sm">{p.name}</p>
                <p className="mt-1 text-sm font-bold">{p.price}{!p.inStock && <span className="ml-2 text-xs font-normal opacity-70">Sold out</span>}</p>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
