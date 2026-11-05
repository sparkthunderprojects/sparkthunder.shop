import { FranchiseLogo } from "@/components/FranchiseLogo";
import Image from "next/image";
import Link from "next/link";
import { CartLink } from "@/components/CartLink";
import { MobileMenu } from "@/components/MobileMenu";
import { RecentButton } from "@/components/RecentButton";
import { SearchTrigger } from "@/components/SearchTrigger";
import { WishlistLink } from "@/components/WishlistLink";
import { getAllProducts, getCategories, getFranchises } from "@/lib/catalog";
import { SITE, formatPrice } from "@/lib/site";
import type { Product } from "@/lib/types";

const topLink = "flex h-full items-center border-b-4 border-transparent px-1 font-bold group-hover:border-bolt group-focus-within:border-bolt";
const panel = "mega absolute inset-x-0 top-full hidden border-b border-ink/15 bg-paper group-hover:block group-focus-within:block";
const subLink = "block py-1.5 hover:underline hover:underline-offset-4";

function MiniProduct({ p }: { p: Product }) {
  return (
    <Link href={`/products/${p.slug}`} className="block">
      <div className="border border-ink/20 bg-paper-2">
        <Image src={p.images[0] ?? `/art/${p.slug}`} alt="" width={240} height={240} unoptimized={!p.images[0]} className="aspect-square w-full object-cover" />
      </div>
      <p className="mt-2 text-sm font-bold leading-snug hover:underline hover:underline-offset-4">{p.name}</p>
      <p className="text-sm text-muted">{formatPrice(p.pricePence)}</p>
    </Link>
  );
}

export async function Header() {
  const [franchises, categories, products] = await Promise.all([getFranchises(), getCategories(), getAllProducts()]);
  const newest = [...products].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3);

  return (
    <header className="theme-dark sticky top-0 z-40 border-b border-ink/15 bg-paper">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:bg-bolt focus:px-3 focus:py-2">Skip to content</a>
      <div className="grid h-[5rem] grid-cols-[1fr_auto_1fr] items-center gap-2 px-(--gutter)">
        <div className="flex items-center gap-3">
          <MobileMenu franchises={franchises.map(({ slug, name }) => ({ slug, name }))} categories={categories.map(({ slug, name }) => ({ slug, name }))} />
          <div className="hidden md:block"><SearchTrigger /></div>
        </div>
        <Link href="/" className="mx-auto flex flex-col items-center gap-1.5" aria-label={`${SITE.name} Shop home`}>
          <Image src="/sparkthunder-logo.png" alt="Sparkthunder" width={1200} height={186} priority className="h-6 w-auto sm:h-8" />
          <span aria-hidden className="flex w-full items-center gap-2.5 text-bolt">
            <span className="h-px flex-1 bg-bolt/50" />
            <span className="logo-shop pl-[0.5em] text-[0.7rem] tracking-[0.5em] sm:text-[0.8rem]">SHOP</span>
            <span className="h-px flex-1 bg-bolt/50" />
          </span>
        </Link>
        <div className="flex items-center justify-end gap-2"><RecentButton /><WishlistLink /><CartLink /></div>
      </div>

      <div className="hidden border-t border-ink/15 lg:block">
        <nav aria-label="Primary" className="flex h-12 items-stretch justify-center gap-9 whitespace-nowrap px-(--gutter) text-[0.95rem]">
          {franchises.map((f) => {
            const mine = products.filter((p) => p.franchiseSlug === f.slug);
            const picks = [...mine].sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured)).slice(0, 3);
            const cats = categories.filter((c) => mine.some((p) => p.categorySlug === c.slug));
            return (
              <div key={f.slug} className="group static">
                <Link href={`/franchises/${f.slug}`} className={topLink}>{f.name}</Link>
                <div className={panel} style={{ ["--color-world" as string]: f.accent }}>
                  <div className="grid grid-cols-[minmax(16rem,1fr)_minmax(12rem,0.7fr)_repeat(3,minmax(0,1fr))] gap-8 px-(--gutter) py-8">
                    <div className="world -my-8 -ml-(--gutter) flex flex-col justify-end gap-3 py-8 pl-(--gutter) pr-8 whitespace-normal">
                      <FranchiseLogo slug={f.slug} name={f.name} className="h-12" textClassName="display text-3xl" />
                      <p className="serif" style={{ color: "var(--world-bright)" }}>{f.tagline}</p>
                      <Link href={`/franchises/${f.slug}`} className="btn btn-sm mt-2 w-fit">Shop all {f.name}</Link>
                    </div>
                    <div>
                      <p className="font-bold">Shop by type</p>
                      <ul className="mt-2">
                        {cats.map((c) => <li key={c.slug}><Link rel="nofollow" href={`/categories/${c.slug}?franchise=${f.slug}`} className={subLink}>{c.name}</Link></li>)}
                      </ul>
                    </div>
                    {picks.map((p) => <MiniProduct key={p.slug} p={p} />)}
                  </div>
                </div>
              </div>
            );
          })}

          <div className="group static">
            <Link href="/shop" className={topLink}>Shop</Link>
            <div className={panel}>
              <div className="grid grid-cols-[1fr_1fr_repeat(3,minmax(0,1fr))] gap-8 px-(--gutter) py-8">
                <div>
                  <p className="font-bold">Shop by type</p>
                  <ul className="mt-2">
                    {categories.map((c) => <li key={c.slug}><Link href={`/categories/${c.slug}`} className={subLink}>{c.name}</Link></li>)}
                    <li><Link href="/shop" className={`${subLink} font-bold`}>All merchandise</Link></li>
                  </ul>
                </div>
                <div>
                  <p className="font-bold">Shop by franchise</p>
                  <ul className="mt-2">
                    {franchises.map((f) => <li key={f.slug}><Link href={`/franchises/${f.slug}`} className={subLink}>{f.name}</Link></li>)}
                    <li><Link href="/franchises" className={`${subLink} font-bold`}>All franchises</Link></li>
                  </ul>
                </div>
                {newest.map((p) => <MiniProduct key={p.slug} p={p} />)}
              </div>
            </div>
          </div>

          <div className="group static">
            <Link href="/gifts" className={topLink}>Gifts</Link>
            <div className={panel}>
              <div className="grid grid-cols-[1fr_1fr_2fr] gap-8 px-(--gutter) py-8">
                <div>
                  <p className="font-bold">Gifts by price</p>
                  <ul className="mt-2">
                    <li><Link href="/gifts#under-15" className={subLink}>Under £15</Link></li>
                    <li><Link href="/gifts#15-to-25" className={subLink}>£15 to £25</Link></li>
                    <li><Link href="/gifts#25-to-50" className={subLink}>£25 to £50</Link></li>
                    <li><Link href="/gifts" className={`${subLink} font-bold`}>All gifts</Link></li>
                  </ul>
                </div>
                <div>
                  <p className="font-bold">Gifts by franchise</p>
                  <ul className="mt-2 whitespace-normal">
                    {franchises.map((f) => <li key={f.slug}><Link href={`/franchises/${f.slug}`} className={subLink}>For {f.name} fans</Link></li>)}
                  </ul>
                </div>
                <p className="serif max-w-md self-center whitespace-normal text-lg leading-relaxed text-muted">Official merchandise makes an easy gift for readers, players and collectors alike. Start with a price, or pick the universe they love.</p>
              </div>
            </div>
          </div>

          <Link href="/new" className="flex h-full items-center border-b-4 border-bolt px-1 font-bold">New</Link>
        </nav>

      </div>
    </header>
  );
}
