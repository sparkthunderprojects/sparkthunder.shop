import type { Metadata, Viewport } from "next";
import "@fontsource-variable/bricolage-grotesque/wdth.css";
import "@fontsource-variable/newsreader/opsz.css";
import "./globals.css";
import { CartProvider } from "@/components/CartProvider";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { JsonLd } from "@/components/JsonLd";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <JsonLd data={[organizationLd(), websiteLd()]} />
        <CartProvider>
          <Header />
          <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 pb-24">{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
