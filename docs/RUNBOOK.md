# Spark Merchant runbook: backups, restore, and when something goes wrong

Plain steps for the owner. Nothing here needs a developer unless a step says so.

## 1. What holds what

| Thing | Where it lives | Backed up by |
|---|---|---|
| Products, orders, customers' emails, gift cards, discount codes, refunds, audit log, every store's settings | Supabase Postgres | Supabase (see 2) plus your own dump (see 3) |
| Product photos and uploads | Supabase Storage bucket `product-images` | Not covered by database backups: see 4 |
| Card payments, payouts, Stripe's own refund records | Stripe | Stripe keeps these; export from the Stripe dashboard if needed |
| Sent emails | Resend | Resend's logs (limited retention) |
| The code | GitHub (`sparkthunderprojects/sparkthunder.shop`) | GitHub |
| Secrets (Stripe keys, Resend key, service role key) | Host environment variables and the `store_secrets` table | You: keep a copy in a password manager |

## 2. Turn on Supabase backups (do this once, now)

1. Supabase dashboard, your project, **Database, Backups**.
2. On a paid plan daily backups are on automatically. Switch on **Point in time recovery** if offered: it lets you restore to any minute, which matters for a shop taking orders.
3. The free plan has no backups. Do not run a live shop on it.

## 3. Your own copy (monthly, and before any big change)

Needs `pg_dump` (PostgreSQL client) and the database connection string from Supabase: **Project settings, Database, Connection string (URI)**.

```bash
export DATABASE_URL='postgresql://postgres:YOUR-PASSWORD@db.xxxx.supabase.co:5432/postgres'
./scripts/backup.sh
```

This writes `backups/spark-YYYY-MM-DD-HHMM.sql.gz`. It contains customers' personal data: keep it encrypted and private (for example in an encrypted drive), never in the repository, never in a public place. The `backups/` folder is already ignored by git.

## 4. Product photos

Photos live in the Supabase Storage bucket `product-images`. Database backups do not include the files. Either:
- keep the originals of everything you upload (recommended and simplest), or
- download the bucket occasionally with the Supabase CLI (`supabase storage cp`, see the Supabase docs for the current syntax).

## 5. Restoring

Restoring replaces data, so do it on a **new, empty Supabase project first** to check the backup is good, and only then decide about production.

From a Supabase backup: dashboard, **Database, Backups**, pick the time, **Restore**. (Point in time recovery: choose the minute just before things went wrong.) Orders placed after that moment are lost from the database, but Stripe still has the payments: compare the Stripe payments list with the Orders page and finish any missing orders by hand.

From your own dump:

```bash
gunzip -c backups/spark-2026-01-01-0900.sql.gz | psql "$NEW_DATABASE_URL"
```

After any restore: open `/admin`, check Orders, Products and one gift card, place a test order on a staging store, and check the Stripe webhook still points at the live site.

## 6. Practise it (quarterly)

A backup nobody has restored is a hope, not a backup. Once a quarter: restore the latest dump into a throwaway Supabase project, open the admin against it, and confirm the product count and the latest order match. Write the date below.

Restore drills done: (none yet)

## 7. If something goes wrong

**The shop shows errors after a deploy.** Roll back in your host (Bolt, Vercel or Netlify: redeploy the previous version). Code is separate from data, so a rollback is safe. If the new version needed new SQL, the old version still works: the SQL in `supabase/admin.sql` only adds things.

**Orders paid but not appearing / half finished.** Open the order: a yellow box "This order has not finished processing" has a **Finish processing** button. It only does the steps still missing (stock, gift cards, points, email), so it is safe to press. If an order is missing entirely, find the payment in Stripe, then in Stripe open the webhook and **resend** the `checkout.session.completed` event. The shop will create it once.

**A refund shows "unfinished".** Press **Retry** on it. If Stripe already refunded, it will not refund twice.

**Someone else may have your admin password or a key.** Change the Supabase user password, rotate the Stripe secret key and Resend key (then paste the new ones into Shipping and payments for that store), and look at **Activity log** for anything you did not do. Rotate `SUPABASE_SERVICE_ROLE_KEY` in Supabase (Project settings, API) and update the host.

**Locked out of the admin.** Sign in with Google or reset the password in Supabase Authentication. A user needs a row in `admin_users` (owner) or `store_admins` (one store).

**Site down.** Check the host's status page, then Supabase's status page, then Stripe's. The storefront needs Supabase; payments need Stripe; if only Resend is down, orders still complete and the confirmation emails fail (the order shows the problem, and the email can be re-sent from the order).

## 8. Environment variables

Required in production: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (or `SPARK_SERVICE_KEY` where the host forbids the SUPABASE_ prefix), `NEXT_PUBLIC_SITE_URL`.
Per store (set in admin, Shipping and payments, and stored in the database): Stripe secret and webhook secret, Resend key and from address. The `STRIPE_*`, `RESEND_API_KEY` and `EMAIL_FROM` variables are the fallback for the default store.
Optional: `PLATFORM_HOSTS` (extra host names that count as this platform rather than a store), `REVALIDATE_SECRET`, `INDEXNOW_KEY`, `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_META_PIXEL_ID`, `SPARK_CSP` (`report-only` or `off` for the security policy).
Never set `SPARKTHUNDER_DEMO` in production: it replaces the database with a fake one.

## Printify (print on demand)
- Connect under Admin > Printify: paste the API token (Printify: Account > Connections > API tokens), press Connect, import products, then Connect tracking from the live site.
- Paid orders containing Printify products are created at Printify (external id = our order number) and sent to production automatically. Repeats are safe.
- If an order shows "Sending the order to Printify" under attention, fix the cause (address, product removed at Printify) and press Finish processing on the order. It resumes without creating a second Printify order.
- A full refund tries to cancel the Printify order. Printify only allows that before production starts; if it refuses, the order is flagged "needs attention" so you cancel it in the Printify dashboard.
- Prices come from Printify. After changing a price or switching options on/off there, press Import / refresh. Edited wording is kept.
