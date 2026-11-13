import { currentStoreId, DEFAULT_STORE_ID } from "@/lib/db/stores";
import Link from "next/link";
import Image from "next/image";
import { RegionSwitcher } from "@/components/Currency";
import { PaymentBadges } from "@/components/PaymentBadges";
import { getCategories, getFranchises } from "@/lib/catalog";
import { getStore } from "@/lib/store";
import { getCommerce } from "@/lib/commerce";
import { enabledMethods } from "@/lib/pay-later";
import { getTheme } from "@/lib/theme.server";
import { LEGAL_PAGES, outbound } from "@/lib/site";
import { CookieSettingsLink } from "@/components/CookieSettingsLink";

export async function Footer() {
  const [franchises, categories, store, storeId, theme, commerce] = await Promise.all([getFranchises(), getCategories(), getStore(), currentStoreId(), getTheme(), getCommerce()]);
  const waysToPay = enabledMethods(commerce.payLater).length > 0;
  const original = storeId === DEFAULT_STORE_ID;
  const col = "mt-4 space-y-2.5 text-[0.95rem] text-ink/75";
  const lnk = "hover:text-bolt hover:underline hover:underline-offset-4";
  if (theme.footer === "compact") {
    return (
      <footer className="theme-dark border-t border-ink/15" data-footer="compact">
        <div className="flex flex-col gap-5 px-(--gutter) py-8 text-sm text-ink/70 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link href="/" className="display text-lg text-ink">{store.name}</Link>
            <span>© {new Date().getFullYear()} {store.legalName}.{original ? " Official merchandise." : ""}</span>
          </div>
          <nav aria-label="Legal"><ul className="flex flex-wrap gap-x-6 gap-y-2 font-semibold text-ink/80">
            {LEGAL_PAGES.map((l) => <li key={l.href}><Link className={lnk} href={l.href}>{l.label}</Link></li>)}
            <li><CookieSettingsLink className={lnk} /></li>
          </ul></nav>
        </div>
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 px-(--gutter) pb-8"><RegionSwitcher /><PaymentBadges /></div>
      </footer>
    );
  }
  return (
    <footer className="theme-dark border-t border-ink/15">
      <div className="px-(--gutter) pb-10 pt-14">
        <div className="flex w-[min(34rem,100%)] flex-col items-center gap-3">
          {store.logoUrl ? <Image src={store.logoUrl} alt={store.legalName} width={store.logoWidth} height={store.logoHeight} unoptimized className="h-auto w-full" /> : <span className="display text-4xl">{store.name}</span>}
          {store.logoLabel ? (
            <span className="flex w-full items-center gap-4 text-bolt">
              <span className="h-px flex-1 bg-bolt/50" />
              <span className="logo-shop pl-[0.6em] text-[clamp(0.9rem,2.6vw,1.4rem)] tracking-[0.6em]">{store.logoLabel}</span>
              <span className="h-px flex-1 bg-bolt/50" />
            </span>
          ) : null}
        </div>
        <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <p className="serif max-w-sm text-lg leading-relaxed text-ink/80">{store.description}</p>
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
              <li><Link className={lnk} href="/gift-cards">Gift cards</Link></li>
              <li><Link className={lnk} href="/gift-cards/balance">Check gift card balance</Link></li>
              {waysToPay ? <li><Link className={lnk} href="/payment-options">Ways to pay</Link></li> : null}
              <li><Link className={lnk} href="/shop">All merchandise</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="font-bold">The universes</h2>
            <ul className={col}>
              {franchises.filter((f) => f.siteUrl).map((f) => (
                <li key={f.slug}><a className={lnk} href={outbound(f.siteUrl!, "footer")} rel="noopener">{f.name} website</a></li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-14 flex flex-col gap-5 border-t border-ink/15 pt-6 text-sm text-ink/60 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} {store.legalName}.{original ? " Official merchandise." : ""}</p>
          <nav aria-label="Legal">
            <ul className="flex flex-wrap gap-x-7 gap-y-2 font-semibold text-ink/75">
              {LEGAL_PAGES.map((l) => <li key={l.href}><Link className={lnk} href={l.href}>{l.label}</Link></li>)}
              <li><CookieSettingsLink className={lnk} /></li>
            </ul>
          </nav>
        </div>
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3"><RegionSwitcher /><PaymentBadges /></div>
      </div>
    </footer>
  );
}
