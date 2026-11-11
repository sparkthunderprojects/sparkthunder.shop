/**
 * Which pages a shared cache (a CDN in front of the site) may keep, and for how long.
 *
 * Only pages that look the same to every visitor of a store: the home page, catalogue pages and the standing legal pages.
 * Never the basket, checkout, account, search, admin or anything that reads a cookie, because a shared cache would show one visitor's page to another.
 * Pages are kept for 30 seconds and may be shown up to 2 minutes stale while a fresh copy is fetched, so an edit in the admin reaches shoppers within about 30 seconds
 * (a shopper can always check out at the live price and stock: checkout re-checks everything).
 * The cache is per web address, so one store's page is never served for another store's domain.
 */
export const PUBLIC_PAGE_CACHE = "public, max-age=0, s-maxage=30, stale-while-revalidate=120";

export const CACHEABLE_SOURCES = [
  "/",
  "/shop",
  "/new",
  "/products/:slug",
  "/categories/:slug",
  "/franchises",
  "/franchises/:slug",
  "/collections/:slug",
  "/delivery-returns",
  "/privacy",
  "/terms",
  "/cookies",
  "/accessibility",
];
