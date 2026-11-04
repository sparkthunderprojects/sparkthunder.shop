# sparkthunder.shop

Official merchandise store for every Sparkthunder franchise (Knightverge, Grim Gala, …), modelled on shopDisney.

**Stack:** Next.js 16 (App Router, server-rendered + ISR) · Tailwind CSS 4 · Supabase · self-hosted Geist font.

## Run it

```bash
npm install
cp .env.example .env.local   # optional: without Supabase keys the site uses src/data/seed.ts
npm run dev
```

## Supabase setup

1. Create/choose a Supabase project.
2. Run `supabase/schema.sql`, then `supabase/seed.sql` in the SQL editor (regenerate with `npm run seed:sql`).
3. Put the URL + anon key in `.env.local` / your host's env vars.
4. Optional: add a database webhook on `products` that POSTs to `/api/revalidate` with header `x-revalidate-secret` so edits go live instantly (otherwise pages refresh every 5 minutes).

## SEO (built in, not bolted on)

- Fully server-rendered HTML for every page; ISR (5 min) with on-demand revalidation
- Unique `<title>`, meta description, canonical, Open Graph and Twitter tags on every page (`src/lib/seo.ts`)
- JSON-LD: `Organization`, `WebSite` + `SearchAction`, `Product` + `Offer` (price, GBP, availability, SKU, brand), `BreadcrumbList`, `CollectionPage`/`ItemList`
- `sitemap.xml` (with product images) and `robots.txt` generated from the catalogue
- Filter URLs canonicalised to the base page and set `noindex,follow`; search and basket are `noindex`
- Generated OG image, icon, logo and product placeholder art (PNG); `next/image` AVIF/WebP for real photos
- Security headers, `lang="en-GB"`, skip link, semantic landmarks, reduced-motion support

## Before launch (placeholders to replace)

- **All products, prices and copy in `src/data/seed.ts` are placeholders.** Replace via Supabase.
- Upload real product photos and put their public URLs in `products.images` (placeholder art is used until then).
- Franchise/category copy should be 200+ unique words per page; Grim Gala copy is generic and needs real lore.
- Checkout/payments are **not connected** (basket works; checkout button is disabled). Choose a provider (e.g. Stripe).
- Add `SITE.sameAs` social profiles in `src/lib/site.ts`, shipping/returns pages, and Search Console verification.
