import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";
import { fillForRequest, siteOrigin } from "@/lib/site-info";

export default async function robots(): Promise<MetadataRoute.Robots> {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/cart", "/wishlist", "/compare", "/search", "/api/", "/admin", "/account", "/auth", "/checkout"] }],
    sitemap: await fillForRequest(absoluteUrl("/sitemap.xml")),
    host: await siteOrigin(),
  };
}
