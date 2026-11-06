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
import { JsonLd } from "@/components/JsonLd";
import { getAllProducts, getCategories, getFranchises, getSiteSettings } from "@/lib/catalog";
import { toQuick } from "@/lib/card";
import { organizationLd, websiteLd } from "@/lib/seo";
import { SITE } from "@/lib/site";
import { getStore } from "@/lib/store";

/** Storefront chrome: providers, header, footer and the slide-over panels. Used by the (shop) layout and the global 404. */
export async function ShopShell({ children }: { children: React.ReactNode }) {
  const [products, franchises, categories, settings, store] = await Promise.all([getAllProducts(), getFranchises(), getCategories(), getSiteSettings(), getStore()]);
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
      <CartProvider>
        <WishlistProvider>
          <ShopUiProvider>
            <AnnouncementBar items={store.announcements} />
            <Header />
            <main id="main" className="w-full flex-1 px-(--gutter) pb-24">{children}</main>
            <Newsletter />
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
            <NewsletterPopup />
            <ConsentManager logo={{ src: store.logoUrl, width: store.logoWidth, height: store.logoHeight, alt: store.legalName }} />
          </ShopUiProvider>
        </WishlistProvider>
      </CartProvider>
    </>
  );
}
