import type { Metadata } from "next";
import { Listing } from "@/components/Listing";
import Link from "next/link";
import { getCategories, getFranchises, getProducts } from "@/lib/catalog";

// Internal search results are thin, infinite-URL pages: keep them out of the index.
export const metadata: Metadata = { title: "Search", robots: { index: false, follow: true } };

export default async function SearchPage(props: PageProps<"/search">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";
  const [products, franchises, categories] = await Promise.all([q ? getProducts({ q }) : Promise.resolve([]), getFranchises(), getCategories()]);
  const nameBySlug = Object.fromEntries(franchises.map((f) => [f.slug, f.name]));
  return (
    <>
      <h1 className="display pt-10 text-[clamp(2rem,4.2vw,3.25rem)]">{q ? `Results for “${q}”` : "Search the shop"}</h1>
      <form action="/search" role="search" className="mt-8 flex max-w-xl gap-3">
        <label htmlFor="sq" className="sr-only">Search</label>
        <input id="sq" name="q" defaultValue={q} type="search" placeholder="Try “dice” or “Grim Gala”" className="flex-1 border border-ink/20 bg-paper px-4 py-3" />
        <button className="btn">Search</button>
      </form>
      {!q && (
        <section className="mt-12" aria-labelledby="pop-h">
          <h2 id="pop-h" className="display text-4xl">Popular searches</h2>
          <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
            {[...franchises.map((f) => f.name), ...categories.map((c) => c.name), "Dice", "Mug", "Poster"].map((t) => (
              <li key={t}><Link href={`/search?q=${encodeURIComponent(t)}`} className="link-line font-bold">{t}</Link></li>
            ))}
          </ul>
        </section>
      )}
      {q && products.length === 0 && <p className="serif mt-8 text-xl text-muted">No products found. Try a franchise name or a product type like “mug” or “dice”.</p>}
      {products.length > 0 && <div className="mt-10"><Listing products={products} franchiseNames={nameBySlug} categoryNames={Object.fromEntries(categories.map((c) => [c.slug, c.name]))} priorityCount={5} flush /></div>}
    </>
  );
}
