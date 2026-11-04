import type { Metadata, Viewport } from "next";
import "@fontsource-variable/bricolage-grotesque/wdth.css";
import "@fontsource-variable/newsreader/opsz.css";
import "./globals.css";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { BackToTop } from "@/components/BackToTop";
import { CartDrawer } from "@/components/CartDrawer";
import { CartProvider } from "@/components/CartProvider";
import { CompareBar } from "@/components/CompareBar";
import { MobileBottomBar } from "@/components/MobileBottomBar";
import { Newsletter } from "@/components/Newsletter";
import { NewsletterPopup } from "@/components/NewsletterPopup";
import { QuickViewModal } from "@/components/QuickViewModal";
import { ShopUiProvider } from "@/components/ShopUi";
import { WishlistProvider } from "@/components/WishlistProvider";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { JsonLd } from "@/components/JsonLd";
import { getAllProducts, getFranchises } from "@/lib/catalog";
import { toQuick } from "@/lib/card";
import { organizationLd, websiteLd } from "@/lib/seo";
import { SITE } from "@/lib/site";

export const viewport: Viewport = { themeColor: "#f1f0f6", width: "device-width", initialScale: 1 };

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} | Official Merchandise`, template: `%s | ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  alternates: { canonical: "/" },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  openGraph: { type: "website", siteName: SITE.name, locale: SITE.locale, url: SITE.url, title: `${SITE.name} | Official Merchandise`, description: SITE.description },
  twitter: { card: "summary_large_image", site: SITE.twitter },
  formatDetection: { telephone: false, email: false, address: false },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [products, franchises] = await Promise.all([getAllProducts(), getFranchises()]);
  const names = Object.fromEntries(franchises.map((f) => [f.slug, f.name]));
  // Suggestions for the basket drawer: featured first, then newest.
  const suggestions = [...products].sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || b.createdAt.localeCompare(a.createdAt)).slice(0, 8).map((p) => toQuick(p, names[p.franchiseSlug]));
  return (
    <html lang="en-GB" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <JsonLd data={[organizationLd(), websiteLd()]} />
        <CartProvider>
          <WishlistProvider>
            <ShopUiProvider>
            <AnnouncementBar />
            <Header />
            <main id="main" className="w-full flex-1 px-(--gutter) pb-24">{children}</main>
            <Newsletter />
            <Footer />
            <div className="h-14 md:hidden" aria-hidden />
            <CartDrawer suggestions={suggestions} />
            <QuickViewModal />
            <CompareBar />
            <MobileBottomBar />
            <BackToTop />
            <NewsletterPopup />
            </ShopUiProvider>
          </WishlistProvider>
        </CartProvider>
      </body>
    </html>
  );
}
