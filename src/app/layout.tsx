import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "./globals.css";
import { getSiteSettings } from "@/lib/catalog";
import { SITE } from "@/lib/site";

export const viewport: Viewport = { themeColor: "#000000", width: "device-width", initialScale: 1 };

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings();
  const description = s.defaultDescription || SITE.description;
  return {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} | Official Merchandise`, template: `%s | ${SITE.name}` },
  description,
  applicationName: SITE.name,
  alternates: { canonical: "/" },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  openGraph: { type: "website", siteName: SITE.name, locale: SITE.locale, url: SITE.url, title: `${SITE.name} | Official Merchandise`, description, ...(s.defaultOgImage ? { images: [s.defaultOgImage] } : {}) },
  twitter: { card: "summary_large_image", site: s.twitterHandle || SITE.twitter },
  ...(s.googleVerification || s.bingVerification ? { verification: { google: s.googleVerification || undefined, other: s.bingVerification ? { "msvalidate.01": s.bingVerification } : undefined } } : {}),
  formatDetection: { telephone: false, email: false, address: false },
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
