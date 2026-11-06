# sparkthunder.shop

Official merchandise store for every Sparkthunder franchise (Knightverge, Occult Inc, …), modelled on shopDisney.

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
- Franchise/category copy should be 200+ unique words per page; Occult Inc copy is generic and needs real lore.
- Checkout/payments are **not connected** (basket works; checkout button is disabled). Choose a provider (e.g. Stripe).
- Add `SITE.sameAs` social profiles in `src/lib/site.ts`, shipping/returns pages, and Search Console verification.

## Admin (CMS) setup

The shop management system lives at `/admin` (products, variants and stock, franchises, categories, image library, per-page SEO editor with live Google/social previews and score, site-wide SEO audit, redirects, settings).

1. Create a Supabase project; set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` on your host.
2. In the SQL editor run `supabase/schema.sql`, then `supabase/admin.sql`.
3. In Supabase Authentication, add a user (email + password). `thegmpfury@gmail.com` is made an admin automatically by `admin.sql`; add other admins to the `admin_users` table.
4. Optional: set `INDEXNOW_KEY` for instant indexing pings.

Local trial without Supabase: `SPARKTHUNDER_DEMO=1 npm run dev` (in-memory fake DB; disabled on Netlify/Vercel/CI).

## Sparkthunder ID (customer sign-in) and Google

Customers sign in at `/account/login` with email + password or Google. This is the shared Supabase "Sparkthunder ID" user pool: the same project URL and anon key on other Sparkthunder sites give the same login.

1. Supabase > Authentication > Providers: keep **Email** on with **Confirm email** enabled (customers can read their own orders by email, so unconfirmed emails must not be allowed).
2. Authentication > URL Configuration: set **Site URL** to `https://sparkthunder.shop` and add Redirect URLs `https://sparkthunder.shop/auth/callback` and `http://localhost:3000/auth/callback`.
3. Google: in Google Cloud Console create an OAuth client (Web application). Authorised redirect URI = the callback URL shown in Supabase > Authentication > Providers > Google (`https://<project-ref>.supabase.co/auth/v1/callback`). Paste the Client ID and Secret into that Supabase provider and enable it.
4. Re-run `supabase/admin.sql` (adds orders access and the auto-admin rule).

## Checkout, orders and email

Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY` and `EMAIL_FROM` (see `.env.example`). In Stripe add a webhook endpoint `https://sparkthunder.shop/api/stripe/webhook` for `checkout.session.completed`. Prices are treated as VAT-inclusive; Stripe Tax is not enabled.

## Running many stores (Spark Merchant)

One deployment serves any number of stores. Each store has its own domains, products, orders, design, SEO, shipping rules, Stripe account and sending address.

- **Add a store:** Admin > Stores (owners only), either blank or as a copy of an existing store (design, shipping rules, categories; never products, orders or keys). Then point the domain at the platform.
- **Connect money and email:** switch to the store in the sidebar, open Shipping and payments, and add its own Stripe keys and Resend key. A store with no keys cannot take payment and never falls back to another store's accounts. Create a Stripe webhook on that store's domain pointing at `/api/stripe/webhook`.
- **Staff:** owners can give someone access to one store only (Stores page). Database row-level security enforces it.
- **Unknown domains** pointed at the platform get a 404 with `noindex`. Set `PLATFORM_HOSTS` (comma separated) for your own platform hostnames, such as a preview URL.
- **Safety net:** every query on store-owned tables is scoped to the current store by `src/lib/db/scope.ts`, caches and their tags are per store, and uploads are stored under the store's id.
- **Test it:** `SPARKTHUNDER_DEMO=1 SPARKTHUNDER_DEMO_STORES=100 npx next start -p 3460`, then `node scripts/isolation-test.mjs 3460 100`. It checks that each of 100 stores shows only its own products, canonicals and sitemap, and that unknown domains are refused.
