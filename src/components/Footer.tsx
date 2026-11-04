import Link from "next/link";
import { Bolt } from "@/components/Bolt";
import { PaymentBadges } from "@/components/PaymentBadges";
import { getCategories, getFranchises } from "@/lib/catalog";
import { LEGAL_PAGES, SITE } from "@/lib/site";

export async function Footer() {
  const [franchises, categories] = await Promise.all([getFranchises(), getCategories()]);
  const col = "mt-4 space-y-2.5 text-[0.95rem] text-paper/75";
  const lnk = "hover:text-bolt hover:underline hover:underline-offset-4";
  return (
    <footer className="on-ink">
      <div className="px-(--gutter) pb-10 pt-16">
        <div className="flex items-end gap-3">
          <Bolt className="h-16 w-12 text-bolt sm:h-24 sm:w-[4.5rem]" />
          <p className="display text-[clamp(3.5rem,11vw,9rem)]">Sparkthunder</p>
        </div>
        <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <p className="serif max-w-sm text-lg leading-relaxed text-paper/80">{SITE.description}</p>
          <div>
            <h2 className="font-bold">Franchises</h2>
            <ul className={col}>
              {franchises.map((f) => <li key={f.slug}><Link className={lnk} href={`/franchises/${f.slug}`}>{f.name}</Link></li>)}
              <li><Link className={lnk} href="/franchises">All franchises</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="font-bold">Shop</h2>
            <ul className={col}>
              {categories.map((c) => <li key={c.slug}><Link className={lnk} href={`/categories/${c.slug}`}>{c.name}</Link></li>)}
              <li><Link className={lnk} href="/new">New arrivals</Link></li>
              <li><Link className={lnk} href="/gifts">Gifts</Link></li>
              <li><Link className={lnk} href="/shop">All merchandise</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="font-bold">The universes</h2>
            <ul className={col}>
              <li><a className={lnk} href="https://knightverge.com">Knightverge.com</a></li>
              <li><a className={lnk} href="https://grimgala.com">GrimGala.com</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-14 flex flex-col gap-5 border-t border-paper/15 pt-6 text-sm text-paper/60 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} {SITE.legalName}. Official merchandise.</p>
          <nav aria-label="Legal">
            <ul className="flex flex-wrap gap-x-7 gap-y-2 font-bold uppercase tracking-wide text-paper/75">
              {LEGAL_PAGES.map((l) => <li key={l.href}><Link className={lnk} href={l.href}>{l.label}</Link></li>)}
            </ul>
          </nav>
        </div>
        <PaymentBadges />
      </div>
    </footer>
  );
}
