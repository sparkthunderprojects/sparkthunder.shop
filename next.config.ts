import type { NextConfig } from "next";
import { securityHeaders } from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  experimental: { serverActions: { bodySizeLimit: "10mb" } },
  trailingSlash: false,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      // Supabase Storage (product photography lives here once uploaded)
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
      // Print on demand mockups imported from Printify
      { protocol: "https", hostname: "images-api.printify.com" },
      { protocol: "https", hostname: "*.printify.com" },
    ],
  },
  async headers() {
    return [
      // The embeddable widget is loaded by other websites, so it must be cacheable, framable-safe (it is a script) and CORS-readable.
      { source: "/embed/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=3600, stale-while-revalidate=86400" }, { key: "Access-Control-Allow-Origin", value: "*" }] },
      { source: "/((?!admin(?:/|$)).*)", headers: securityHeaders() },
      // The admin and account pages are private: never framed, never cached by a shared cache.
      { source: "/admin/:path*", headers: [...securityHeaders({ admin: true }), { key: "Cache-Control", value: "private, no-store" }] },
      { source: "/account/:path*", headers: [{ key: "Cache-Control", value: "private, no-store" }] },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
