import type { MetadataRoute } from "next";
import { SITE, absoluteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/cart", "/wishlist", "/compare", "/search", "/api/", "/admin", "/account", "/auth", "/checkout"] }],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: SITE.url,
  };
}
