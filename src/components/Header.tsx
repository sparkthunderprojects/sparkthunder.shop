import Link from "next/link";
import { Bolt } from "@/components/Bolt";
import { CartLink } from "@/components/CartLink";
import { getCategories, getFranchises } from "@/lib/catalog";
import { SITE } from "@/lib/site";

export async function Header() {
  const [franchises, categories] = await Promise.all([getFranchises(), getCategories()]);
  return (
    <header className="sticky top-0 z-40 border-b border-ink/15 bg-paper/95 backdrop-blur">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:bg-bolt focus:px-3 focus:py-2">Skip to content</a>
      <div className="mx-auto flex max-w-7xl items-center gap-8 px-4 py-3.5">
        <Link href="/" className="flex shrink-0 items-center gap-2 whitespace-nowrap" aria-label={`${SITE.name} home`}>
          <Bolt className="h-7 w-5 text-ink" />
          <span className="display text-[1.7rem] leading-none">Sparkthunder<span className="font-light"> Shop</span></span>
        </Link>
        <nav aria-label="Primary" className="hidden flex-1 items-center gap-6 whitespace-nowrap text-[0.95rem] lg:flex">
          {franchises.map((f) => <Link key={f.slug} href={`/franchises/${f.slug}`} className="font-bold hover:underline hover:decoration-2 hover:underline-offset-4">{f.name}</Link>)}
          <span className="hidden h-4 w-px bg-ink/25 xl:block" aria-hidden />
          {categories.map((c) => <Link key={c.slug} href={`/categories/${c.slug}`} className="hidden text-muted hover:text-ink hover:underline hover:decoration-2 hover:underline-offset-4 xl:inline">{c.name}</Link>)}
          <Link href="/new" className="font-bold underline decoration-bolt decoration-[3px] underline-offset-4">New</Link>
        </nav>
        <form action="/search" role="search" className="ml-auto hidden md:block">
          <label htmlFor="q" className="sr-only">Search the shop</label>
          <input id="q" name="q" type="search" placeholder="Search the shop" className="w-44 border-b-2 border-ink/30 bg-transparent px-1 py-1.5 text-sm placeholder:text-muted focus:border-ink focus:outline-none" />
        </form>
        <div className="ml-auto md:ml-0"><CartLink /></div>
      </div>
      {/* Mobile nav: plain, crawlable links */}
      <nav aria-label="Mobile" className="flex gap-5 overflow-x-auto border-t border-ink/10 px-4 py-2.5 text-sm lg:hidden">
        {franchises.map((f) => <Link key={f.slug} href={`/franchises/${f.slug}`} className="whitespace-nowrap font-bold">{f.name}</Link>)}
        {categories.map((c) => <Link key={c.slug} href={`/categories/${c.slug}`} className="whitespace-nowrap text-muted">{c.name}</Link>)}
        <Link href="/new" className="whitespace-nowrap font-bold">New</Link>
        <Link href="/search" className="whitespace-nowrap text-muted">Search</Link>
      </nav>
    </header>
  );
}
