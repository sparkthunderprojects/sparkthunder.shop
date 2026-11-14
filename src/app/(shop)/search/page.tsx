import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { Listing } from "@/components/Listing";
import Link from "@/components/LocaleLink";
import { getAllProducts, getCategories, getFranchises, getProducts } from "@/lib/catalog";
import { correctQuery } from "@/lib/search-fuzzy";

// Internal search results are thin, infinite-URL pages: keep them out of the index.
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Search"), robots: { index: false, follow: true } };
}

export default async function SearchPage(props: PageProps<"/search">) {
  const { t } = await getT();
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";
  const [products, franchises, categories] = await Promise.all([q ? getProducts({ q }) : Promise.resolve([]), getFranchises(), getCategories()]);
  let shown = products;
  let corrected: string | null = null;
  if (q && products.length === 0) {
    corrected = correctQuery(q, await getAllProducts(), franchises, categories);
    if (corrected) { shown = await getProducts({ q: corrected }); if (shown.length === 0) corrected = null; }
  }
  const nameBySlug = Object.fromEntries(franchises.map((f) => [f.slug, f.name]));
  return (
    <>
      <h1 className="display pt-10 text-[clamp(2rem,4.2vw,3.25rem)]">{q ? t("Results for “{q}”", { q }) : t("Search the shop")}</h1>
      <form action="/search" role="search" className="mt-8 flex max-w-xl gap-3">
        <label htmlFor="sq" className="sr-only">{t("Search")}</label>
        <input id="sq" name="q" defaultValue={q} type="search" placeholder={t("Try “dice” or “Occult Inc”")} className="flex-1 border border-ink/20 bg-paper px-4 py-3" />
        <button className="btn">{t("Search")}</button>
      </form>
      {!q && (
        <section className="mt-12" aria-labelledby="pop-h">
          <h2 id="pop-h" className="display text-4xl">{t("Popular searches")}</h2>
          <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
            {[...franchises.map((f) => f.name), ...categories.map((c) => c.name), t("Dice"), t("Mug"), t("Poster")].map((w) => (
              <li key={w}><Link href={`/search?q=${encodeURIComponent(w)}`} className="link-line font-bold">{w}</Link></li>
            ))}
          </ul>
        </section>
      )}
      {corrected ? <p className="serif mt-8 text-xl text-muted">{t("No results for “{q}”. Showing results for", { q })} <Link href={`/search?q=${encodeURIComponent(corrected)}`} className="link-line font-bold">{corrected}</Link>.</p> : null}
      {q && shown.length === 0 && <p className="serif mt-8 text-xl text-muted">{t("No products found. Try a franchise name or a product type like “mug” or “dice”.")}</p>}
      {shown.length > 0 && <div className="mt-10"><Listing products={shown} franchiseNames={nameBySlug} categoryNames={Object.fromEntries(categories.map((c) => [c.slug, c.name]))} priorityCount={5} flush /></div>}
    </>
  );
}
