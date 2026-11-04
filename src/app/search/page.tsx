import type { Metadata } from "next";
import { ProductCard } from "@/components/ProductCard";
import { getFranchises, getProducts } from "@/lib/catalog";

// Internal search results are thin, infinite-URL pages: keep them out of the index.
export const metadata: Metadata = { title: "Search", robots: { index: false, follow: true } };

export default async function SearchPage(props: PageProps<"/search">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";
  const [products, franchises] = await Promise.all([q ? getProducts({ q }) : Promise.resolve([]), getFranchises()]);
  const nameBySlug = Object.fromEntries(franchises.map((f) => [f.slug, f.name]));
  return (
    <>
      <h1 className="display pt-10 text-[clamp(3rem,8vw,6.5rem)]">{q ? `Results for “${q}”` : "Search the shop"}</h1>
      <form action="/search" role="search" className="mt-8 flex max-w-xl gap-3">
        <label htmlFor="sq" className="sr-only">Search</label>
        <input id="sq" name="q" defaultValue={q} type="search" placeholder="Try “dice” or “Grim Gala”" className="flex-1 border-2 border-ink bg-paper px-4 py-3" />
        <button className="btn">Search</button>
      </form>
      {q && products.length === 0 && <p className="serif mt-8 text-xl text-muted">No products found. Try a franchise name or a product type like “mug” or “dice”.</p>}
      <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4">
        {products.map((p) => <ProductCard key={p.slug} product={p} franchiseName={nameBySlug[p.franchiseSlug]} />)}
      </div>
    </>
  );
}
