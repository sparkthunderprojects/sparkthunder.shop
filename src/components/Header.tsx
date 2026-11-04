import Link from "next/link";
import { CartLink } from "@/components/CartLink";
import { getCategories, getFranchises } from "@/lib/catalog";
import { SITE } from "@/lib/site";

export async function Header() {
  const [franchises, categories] = await Promise.all([getFranchises(), getCategories()]);
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-ink/90 backdrop-blur">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded focus:bg-accent focus:px-3 focus:py-2 focus:text-black">Skip to content</a>
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-4">
        <Link href="/" className="text-lg font-extrabold tracking-wide">
          <span className="text-accent">SPARK</span>THUNDER <span className="font-light text-muted">SHOP</span>
          <span className="sr-only"> - {SITE.tagline}</span>
        </Link>
        <nav aria-label="Primary" className="hidden flex-1 items-center gap-6 text-sm font-medium lg:flex">
          {franchises.map((f) => <Link key={f.slug} href={`/franchises/${f.slug}`} className="hover:text-accent">{f.name}</Link>)}
          <span className="h-4 w-px bg-white/15" aria-hidden />
          {categories.map((c) => <Link key={c.slug} href={`/categories/${c.slug}`} className="text-muted hover:text-accent">{c.name}</Link>)}
          <Link href="/new" className="text-accent hover:underline">New</Link>
        </nav>
        <form action="/search" role="search" className="ml-auto hidden md:block">
          <label htmlFor="q" className="sr-only">Search the shop</label>
          <input id="q" name="q" type="search" placeholder="Search merch…" className="w-48 rounded-full border border-white/15 bg-panel px-4 py-2 text-sm placeholder:text-muted" />
        </form>
        <div className="ml-auto md:ml-0"><CartLink /></div>
      </div>
      {/* Mobile nav: plain links, no JS needed, fully crawlable */}
      <nav aria-label="Mobile" className="flex gap-4 overflow-x-auto border-t border-white/10 px-4 py-2 text-sm lg:hidden">
        {franchises.map((f) => <Link key={f.slug} href={`/franchises/${f.slug}`} className="whitespace-nowrap">{f.name}</Link>)}
        {categories.map((c) => <Link key={c.slug} href={`/categories/${c.slug}`} className="whitespace-nowrap text-muted">{c.name}</Link>)}
        <Link href="/new" className="whitespace-nowrap text-accent">New</Link>
        <Link href="/search" className="whitespace-nowrap text-muted">Search</Link>
      </nav>
    </header>
  );
}
