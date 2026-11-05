# Showing Sparkthunder products on a universe website

Every click opens sparkthunder.shop in a **new tab**, with UTM tags (`utm_source=<your site>`, `utm_medium=universe-site`, `utm_campaign=latest-products`) so you can see which site sent each shopper.

## Option A: any website (Bolt, Wix, WordPress, plain HTML)
```html
<script src="https://sparkthunder.shop/embed/sparkthunder-products.js" async></script>
<sparkthunder-products franchise="knightverge" limit="4"></sparkthunder-products>
```
Attributes: `franchise` (slug or `all`), `limit` (1-24), `sort` (`new`|`featured`), `theme` (`dark`|`light`), `title`, `accent` (hex), `instock="1"`, `ref`.
Also works as `<div data-sparkthunder-products data-franchise="knightverge"></div>`.

## Option B: Next.js / React site
Copy `integrations/next/SparkthunderLatestProducts.tsx` into the site, then `<SparkthunderLatestProducts franchise="knightverge" limit={4} />`. Rendered on the server and cached for 5 minutes, so it is crawlable.
Optional env: `NEXT_PUBLIC_SPARKTHUNDER_SHOP_URL`.

## Option C: JSON feed
`GET https://sparkthunder.shop/api/feed/products?franchise=knightverge&limit=8&sort=new&instock=1&ref=knightverge-com`
Public, read-only, CORS `*`, cached 5 minutes.

## If the site has a Content-Security-Policy
Allow `script-src`, `connect-src` and `img-src` for `https://sparkthunder.shop` (and your Supabase storage host for `img-src`).

Set each universe's website in **Admin > Franchises**; it then appears in the shop footer and on the universe page. The **Admin > Universe sites** page generates these snippets with a live preview.
