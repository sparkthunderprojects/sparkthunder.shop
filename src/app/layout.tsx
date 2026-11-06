import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "./globals.css";
import { getSiteSettings } from "@/lib/catalog";
import { SITE } from "@/lib/site";
import { getSiteInfo } from "@/lib/site-info";
import { getStore, storeCssVars } from "@/lib/store";

export async function generateViewport(): Promise<Viewport> {
  return { themeColor: (await getStore()).dark, width: "device-width", initialScale: 1 };
}

export async function generateMetadata(): Promise<Metadata> {
  const [s, store, info] = await Promise.all([getSiteSettings(), getStore(), getSiteInfo()]);
  const description = s.defaultDescription || store.description;
  return {
  metadataBase: new URL(info.origin),
  title: { default: `${store.name} | ${store.tagline}`, template: `%s | ${store.name}` },
  description,
  applicationName: store.name,
  alternates: { canonical: "/" },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  openGraph: { type: "website", siteName: store.name, locale: SITE.locale, url: info.origin, title: `${store.name} | ${store.tagline}`, description, ...(s.defaultOgImage ? { images: [s.defaultOgImage] } : {}) },
  twitter: { card: "summary_large_image", site: s.twitterHandle || SITE.twitter },
  ...(s.googleVerification || s.bingVerification ? { verification: { google: s.googleVerification || undefined, other: s.bingVerification ? { "msvalidate.01": s.bingVerification } : undefined } } : {}),
  formatDetection: { telephone: false, email: false, address: false },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const store = await getStore();
  return (
    <html lang="en-GB" className="h-full antialiased" style={storeCssVars(store)}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
