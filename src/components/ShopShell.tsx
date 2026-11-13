import { AnnouncementBar } from "@/components/AnnouncementBar";
import { BackToTop } from "@/components/BackToTop";
import { CartDrawer } from "@/components/CartDrawer";
import { RecentDrawer } from "@/components/RecentDrawer";
import { SearchOverlay } from "@/components/SearchOverlay";
import { WishlistDrawer } from "@/components/WishlistDrawer";
import { CartProvider } from "@/components/CartProvider";
import { CompareBar } from "@/components/CompareBar";
import { MobileBottomBar } from "@/components/MobileBottomBar";
import { Newsletter } from "@/components/Newsletter";
import { NewsletterPopup } from "@/components/NewsletterPopup";
import { ConsentManager } from "@/components/ConsentManager";
import { QuickViewModal } from "@/components/QuickViewModal";
import { ShopUiProvider } from "@/components/ShopUi";
import { WishlistProvider } from "@/components/WishlistProvider";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { CommerceProvider } from "@/components/CommerceProvider";
import { CurrencyProvider } from "@/components/Currency";
import { getCommerce } from "@/lib/commerce";
import { JsonLd } from "@/components/JsonLd";
import { getAllProducts, getCategories, getFranchises, getSiteSettings } from "@/lib/catalog";
import { toQuick } from "@/lib/card";
import { organizationLd, websiteLd } from "@/lib/seo";
import { SITE } from "@/lib/site";
import { getStore } from "@/lib/store";
import { LocaleProvider } from "@/components/LocaleProvider";
import { getLanguages, getLocale } from "@/lib/i18n/server";
import { currentStoreId, DEFAULT_STORE_ID } from "@/lib/db/stores";

/** Storefront chrome: providers, header, footer and the slide-over panels. Used by the (shop) layout and the global 404. */
export async function ShopShell({ children }: { children: React.ReactNode }) {
  const [products, franchises, categories, settings, store, commerce] = await Promise.all([getAllProducts(), getFranchises(), getCategories(), getSiteSettings(), getStore(), getCommerce()]);
  const [locale, enabled] = await Promise.all([getLocale(), getLanguages()]);
  const original = (await currentStoreId()) === DEFAULT_STORE_ID;
  // The original shop talks about its universes; any other store speaks for itself.
  const nlBlurb = original ? "New merchandise from Knightverge, Occult Inc and the rest of the universe, straight to your inbox." : `New arrivals and offers from ${store.name}, straight to your inbox.`;
  const popupBlurb = original ? "Join the list for first access to new official merchandise from every Sparkthunder universe." : `Join the list for first access to new arrivals and offers from ${store.name}.`;
  const names = Object.fromEntries(franchises.map((f) => [f.slug, f.name]));
  const popular = [
    ...franchises.map((f) => ({ label: f.name, href: `/franchises/${f.slug}` })),
    ...categories.map((c) => ({ label: c.name, href: `/categories/${c.slug}` })),
  ];
  // Suggestions for the basket drawer: featured first, then newest.
  const suggestions = [...products].sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || b.createdAt.localeCompare(a.createdAt)).slice(0, 8).map((p) => toQuick(p, names[p.franchiseSlug]));
  return (
    <>
      <JsonLd data={[organizationLd([...SITE.sameAs, ...settings.sameAs], { name: store.legalName, logo: store.logoUrl }), websiteLd({ name: store.name, description: store.description })]} />
      <LocaleProvider locale={locale} enabled={enabled}>
      <CommerceProvider value={{ freeShippingPence: commerce.freeShippingPence, giftWrapPence: commerce.giftWrapPence, codePrefix: commerce.codePrefix, shippingZones: commerce.shippingZones, shippingFlatPence: commerce.shippingFlatPence, shippingCountries: commerce.shippingCountries }}>
      <CurrencyProvider base={SITE.currency} options={commerce.currencies} countries={commerce.shippingCountries}>
      <CartProvider>
        <WishlistProvider>
          <ShopUiProvider>
            <AnnouncementBar items={store.announcements} />
            <Header />
            <main id="main" className="w-full flex-1 px-(--gutter) pb-24">{children}</main>
            <Newsletter blurb={nlBlurb} />
            <Footer />
            <div className="h-14 md:hidden" aria-hidden />
            <CartDrawer suggestions={suggestions} />
            <WishlistDrawer />
            <RecentDrawer />
            <SearchOverlay popular={popular} />
            <QuickViewModal />
            <CompareBar />
            <MobileBottomBar />
            <BackToTop />
            <NewsletterPopup blurb={popupBlurb} />
            <ConsentManager logo={{ src: store.logoUrl, width: store.logoWidth, height: store.logoHeight, alt: store.legalName }} />
          </ShopUiProvider>
        </WishlistProvider>
      </CartProvider>
      </CurrencyProvider>
      </CommerceProvider>
      </LocaleProvider>
    </>
  );
}
