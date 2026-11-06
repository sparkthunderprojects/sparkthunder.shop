/*
# Admin (CMS) + SEO + commerce extensions

Extends the base schema with admin users, SEO columns, media library, redirects,
settings, gift cards, orders/checkout, discount codes, collections, reviews,
reward points, product questions, and multi-store support.

1. New Tables
- `admin_users` — links auth.users to admin access. PK: user_id.
- `media` — uploaded media files (path, url, alt, dimensions).
- `redirects` — URL redirects with status code.
- `settings` — key/value store for store settings.
- `gift_cards` — gift card balances and metadata. Code is secret (not publicly readable).
- `gift_card_ledger` — gift card balance changes (issue, redeem, refund, adjust, void).
- `checkout_snapshots` — server-side basket snapshot at checkout start.
- `orders` — customer orders with Stripe integration, shipping, gift options.
- `discount_codes` — discount codes (percent or fixed), with usage limits and expiry.
- `stock_alerts` — back-in-stock email notifications.
- `collections` — curated product collections / drops.
- `reviews` — verified-buyer reviews with photos. Buyer email hidden via column-level privileges.
- `reward_points` — fan rewards ledger (earn on order/review, spend on redeem).
- `product_questions` — customer Q&A on product pages.
- `stores` — multi-store support. Each store-owned row carries a store_id.
- `store_secrets` — per-store credentials (Stripe, Resend). No public access.
- `store_admins` — per-store staff access (separate from global admin_users).

2. Column additions to existing tables
- products: seo_title, seo_description, canonical_url, og_image, noindex, focus_keyword,
  tags[], image_alts[], track_stock, stock_qty, low_stock_threshold, variants (jsonb),
  bundle_items (jsonb), updated_at.
- franchises: seo_title, seo_description, og_image, noindex, focus_keyword, site_url, updated_at.
- categories: seo_title, seo_description, og_image, noindex, focus_keyword, updated_at.
- orders: discount_code, discount_pence, gift_message, gift_wrap, gift_wrap_pence.
- All store-owned tables: store_id column (defaults to 'sparkthunder').

3. Functions
- `is_admin()` — checks if current user is in admin_users.
- `can_admin_store(sid)` — checks is_admin() OR store_admins membership.
- `auto_admin()` — trigger: auto-promotes thegmpfury@gmail.com to admin on confirmed email.
- `touch_updated_at()` — trigger: sets updated_at on row update.
- `gift_card_lookup(p_code, p_store)` — public RPC: look up gift card balance by code (SECURITY DEFINER, no email leak).
- `set_store_staff(p_email, p_store, p_add)` — admin RPC: add/remove store staff by email.

4. Security (RLS + policies)
- admin_users: self-read only (user_id = auth.uid()).
- All catalog tables: public read (anon + authenticated) + store-admin write (can_admin_store).
- media, redirects, settings: public read + store-admin write.
- gift_cards, gift_card_ledger: admin/store-staff only (not publicly readable — code is secret).
  Public lookup only via gift_card_lookup RPC (returns balance/status only).
- orders, checkout_snapshots: admin/store-staff full access. Customers can read own orders by email match.
- discount_codes, stock_alerts: admin/store-staff only.
- collections: public read (published) + store-admin write.
- reviews: public read approved only, with email column revoked. Store-admin full access.
- reward_points: customer read own (by email match). Store-admin full access.
- product_questions: public read answered only. Store-admin full access.
- stores: public read. Owner (is_admin) write.
- store_secrets: NO public access (service role only — RLS enabled, no policies).
- store_admins: owners manage, staff see own access.
- Storage: product-images bucket (public read, store-staff write). review-photos bucket (public read, server upload only).

5. Multi-store
- stores table with is_default flag (one default store allowed).
- All store-owned tables get store_id column + composite primary keys (store_id, slug).
- Default store 'sparkthunder' inserted.
- Store-admin policies replace global admin policies on store-owned tables.

6. Notes
- The auto_admin trigger promotes thegmpfury@gmail.com to admin automatically when that email is confirmed.
- Gift card codes are uppercase, 12 chars, displayed as SPK-XXXX-XXXX-XXXX.
- Reviews use column-level privileges to hide buyer email from public reads.
- reward_points has a unique index on (store_id, reason, ref) to prevent double-awards (except 'adjust').
- All policies use TO anon, authenticated for public reads since the storefront allows anonymous browsing.
*/

-- ================================================================
-- Admin users
-- ================================================================
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;

create or replace function public.is_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

drop policy if exists "admins see themselves" on public.admin_users;
create policy "admins see themselves" on public.admin_users for select
  to authenticated using (user_id = auth.uid());

-- Auto-promote thegmpfury@gmail.com to admin on confirmed email
create or replace function public.auto_admin() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if lower(new.email) = 'thegmpfury@gmail.com' and new.email_confirmed_at is not null then
    insert into public.admin_users (user_id) values (new.id) on conflict do nothing;
  end if;
  return new;
end $$;
drop trigger if exists auto_admin on auth.users;
create trigger auto_admin after insert or update of email_confirmed_at on auth.users for each row execute function public.auto_admin();

-- ================================================================
-- SEO + extra columns on existing tables
-- ================================================================
alter table public.products
  add column if not exists seo_title text not null default '',
  add column if not exists seo_description text not null default '',
  add column if not exists canonical_url text not null default '',
  add column if not exists og_image text not null default '',
  add column if not exists noindex boolean not null default false,
  add column if not exists focus_keyword text not null default '',
  add column if not exists tags text[] not null default '{}',
  add column if not exists image_alts text[] not null default '{}',
  add column if not exists track_stock boolean not null default false,
  add column if not exists stock_qty int not null default 0 check (stock_qty >= 0),
  add column if not exists low_stock_threshold int not null default 5,
  add column if not exists variants jsonb not null default '[]',
  add column if not exists updated_at timestamptz not null default now();

alter table public.franchises
  add column if not exists seo_title text not null default '',
  add column if not exists seo_description text not null default '',
  add column if not exists og_image text not null default '',
  add column if not exists noindex boolean not null default false,
  add column if not exists focus_keyword text not null default '',
  add column if not exists updated_at timestamptz not null default now();

alter table public.categories
  add column if not exists seo_title text not null default '',
  add column if not exists seo_description text not null default '',
  add column if not exists og_image text not null default '',
  add column if not exists noindex boolean not null default false,
  add column if not exists focus_keyword text not null default '',
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products for each row execute function public.touch_updated_at();
drop trigger if exists franchises_touch on public.franchises;
create trigger franchises_touch before update on public.franchises for each row execute function public.touch_updated_at();
drop trigger if exists categories_touch on public.categories;
create trigger categories_touch before update on public.categories for each row execute function public.touch_updated_at();

-- ================================================================
-- Media, redirects, settings
-- ================================================================
create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  path text not null unique,
  url text not null,
  alt text not null default '',
  width int,
  height int,
  bytes int,
  created_at timestamptz not null default now()
);

create table if not exists public.redirects (
  id bigint generated always as identity primary key,
  from_path text not null unique check (from_path like '/%'),
  to_path text not null,
  status int not null default 301 check (status in (301, 302, 307, 308)),
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.settings (
  key text primary key,
  value jsonb not null default '{}'
);

alter table public.media enable row level security;
alter table public.redirects enable row level security;
alter table public.settings enable row level security;

-- Public read on media, redirects, settings
grant select on public.media to anon, authenticated;
grant select on public.redirects to anon, authenticated;
grant select on public.settings to anon, authenticated;

drop policy if exists "public read media" on public.media;
create policy "public read media" on public.media for select to anon, authenticated using (true);
drop policy if exists "public read redirects" on public.redirects;
create policy "public read redirects" on public.redirects for select to anon, authenticated using (true);
drop policy if exists "public read settings" on public.settings;
create policy "public read settings" on public.settings for select to anon, authenticated using (true);

-- ================================================================
-- Image storage bucket
-- ================================================================
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "public read product images" on storage.objects;
create policy "public read product images" on storage.objects for select using (bucket_id = 'product-images');

-- ================================================================
-- Gift cards
-- ================================================================
create table if not exists public.gift_cards (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  initial_pence integer not null check (initial_pence > 0),
  balance_pence integer not null check (balance_pence >= 0),
  currency text not null default 'GBP',
  status text not null default 'active' check (status in ('active','disabled')),
  recipient_name text not null default '',
  recipient_email text not null default '',
  sender_name text not null default '',
  message text not null default '',
  theme text not null default 'bolt',
  source text not null default 'admin' check (source in ('admin','purchase','promo')),
  order_ref text not null default '',
  note text not null default '',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gift_card_ledger (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.gift_cards(id) on delete cascade,
  delta_pence integer not null,
  balance_after integer not null check (balance_after >= 0),
  kind text not null check (kind in ('issue','redeem','refund','adjust','void')),
  order_ref text not null default '',
  note text not null default '',
  created_by text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists gift_card_ledger_card_idx on public.gift_card_ledger (card_id, created_at desc);

drop trigger if exists gift_cards_touch on public.gift_cards;
create trigger gift_cards_touch before update on public.gift_cards for each row execute function public.touch_updated_at();

alter table public.gift_cards enable row level security;
alter table public.gift_card_ledger enable row level security;

drop policy if exists "admin all gift_cards" on public.gift_cards;
create policy "admin all gift_cards" on public.gift_cards for all
  to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin all gift_card_ledger" on public.gift_card_ledger;
create policy "admin all gift_card_ledger" on public.gift_card_ledger for all
  to authenticated using (public.is_admin()) with check (public.is_admin());

-- Public gift card balance lookup by code (SECURITY DEFINER, no email leak)
create or replace function public.gift_card_lookup(p_code text)
returns table (balance_pence integer, currency text, status text, expires_at timestamptz)
language sql security definer set search_path = public stable as $$
  select g.balance_pence, g.currency,
    case when g.status <> 'active' then 'disabled'
         when g.expires_at is not null and g.expires_at < now() then 'expired'
         when g.balance_pence = 0 then 'used'
         else 'active' end,
    g.expires_at
  from public.gift_cards g where g.code = upper(p_code) limit 1;
$$;
revoke all on function public.gift_card_lookup(text) from public;
grant execute on function public.gift_card_lookup(text) to anon, authenticated;

-- ================================================================
-- Orders and checkout (Stripe)
-- ================================================================
alter table public.gift_cards add column if not exists emailed_at timestamptz;

create table if not exists public.checkout_snapshots (
  id text primary key,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  fulfilled_at timestamptz
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  stripe_session_id text unique,
  stripe_payment_intent text not null default '',
  status text not null default 'paid' check (status in ('paid','shipped','cancelled','attention')),
  email text not null default '',
  name text not null default '',
  phone text not null default '',
  shipping_address jsonb,
  items jsonb not null default '[]',
  subtotal_pence integer not null default 0,
  shipping_pence integer not null default 0,
  gift_card_pence integer not null default 0,
  total_pence integer not null default 0,
  gift_card_code text not null default '',
  tracking_carrier text not null default '',
  tracking_number text not null default '',
  notes text not null default '',
  attention_reason text not null default '',
  shipped_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_created_idx on public.orders (created_at desc);
drop trigger if exists orders_touch on public.orders;
create trigger orders_touch before update on public.orders for each row execute function public.touch_updated_at();

alter table public.orders enable row level security;
alter table public.checkout_snapshots enable row level security;

drop policy if exists "admin all orders" on public.orders;
create policy "admin all orders" on public.orders for all
  to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin all checkout_snapshots" on public.checkout_snapshots;
create policy "admin all checkout_snapshots" on public.checkout_snapshots for all
  to authenticated using (public.is_admin()) with check (public.is_admin());

-- Signed-in customers can read their own orders by email
drop policy if exists "customers read own orders" on public.orders;
create policy "customers read own orders" on public.orders for select
  to authenticated using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- ================================================================
-- Universe website URLs
-- ================================================================
alter table public.franchises add column if not exists site_url text not null default '';

-- ================================================================
-- Discount codes
-- ================================================================
create table if not exists public.discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  kind text not null check (kind in ('percent', 'fixed')),
  value integer not null check (value > 0),
  min_spend_pence integer not null default 0,
  max_uses integer,
  uses integer not null default 0,
  franchise_slug text not null default '',
  starts_at timestamptz,
  expires_at timestamptz,
  active boolean not null default true,
  note text not null default '',
  created_at timestamptz not null default now()
);
alter table public.discount_codes enable row level security;
drop policy if exists "admin all discount_codes" on public.discount_codes;
create policy "admin all discount_codes" on public.discount_codes for all
  to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.orders add column if not exists discount_code text not null default '';
alter table public.orders add column if not exists discount_pence integer not null default 0;

-- Bundle items on products
alter table public.products add column if not exists bundle_items jsonb not null default '[]'::jsonb;

-- ================================================================
-- Back-in-stock alerts
-- ================================================================
create table if not exists public.stock_alerts (
  id uuid primary key default gen_random_uuid(),
  product_slug text not null,
  variant text not null default '',
  email text not null,
  created_at timestamptz not null default now(),
  notified_at timestamptz,
  unique (product_slug, variant, email)
);
create index if not exists stock_alerts_product_idx on public.stock_alerts (product_slug) where notified_at is null;
alter table public.stock_alerts enable row level security;
drop policy if exists "admin all stock_alerts" on public.stock_alerts;
create policy "admin all stock_alerts" on public.stock_alerts for all
  to authenticated using (public.is_admin()) with check (public.is_admin());

-- ================================================================
-- Collections and drops
-- ================================================================
create table if not exists public.collections (
  slug text primary key,
  name text not null,
  description text not null default '',
  image text not null default '',
  launch_at timestamptz,
  product_slugs text[] not null default '{}',
  sort_order integer not null default 0,
  published boolean not null default true,
  updated_at timestamptz not null default now()
);
drop trigger if exists collections_touch on public.collections;
create trigger collections_touch before update on public.collections for each row execute function public.touch_updated_at();
alter table public.collections enable row level security;

grant select on public.collections to anon, authenticated;
drop policy if exists "public read collections" on public.collections;
create policy "public read collections" on public.collections for select
  to anon, authenticated using (published);
drop policy if exists "admin all collections" on public.collections;
create policy "admin all collections" on public.collections for all
  to authenticated using (public.is_admin()) with check (public.is_admin());

-- ================================================================
-- Verified-buyer reviews with photos
-- ================================================================
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_slug text not null,
  email text not null,
  name text not null default 'Verified buyer',
  rating integer not null check (rating between 1 and 5),
  title text not null default '',
  body text not null default '',
  photos text[] not null default '{}',
  verified boolean not null default true,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  unique (product_slug, email)
);
create index if not exists reviews_product_idx on public.reviews (product_slug, status);
alter table public.reviews enable row level security;

-- Column-level: public reads approved reviews but never the buyer's email
revoke select on public.reviews from anon, authenticated;
grant select (id, product_slug, name, rating, title, body, photos, verified, status, created_at) on public.reviews to anon, authenticated;
drop policy if exists "public read approved reviews" on public.reviews;
create policy "public read approved reviews" on public.reviews for select
  to anon, authenticated using (status = 'approved');
drop policy if exists "admin all reviews" on public.reviews;
create policy "admin all reviews" on public.reviews for all
  to authenticated using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public) values ('review-photos', 'review-photos', true) on conflict (id) do nothing;
drop policy if exists "public read review photos" on storage.objects;
create policy "public read review photos" on storage.objects for select using (bucket_id = 'review-photos');

-- ================================================================
-- Spark points (fan rewards)
-- ================================================================
create table if not exists public.reward_points (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  points integer not null,
  reason text not null check (reason in ('order','review','redeem','adjust')),
  ref text not null default '',
  note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists reward_points_email_idx on public.reward_points (lower(email));
create unique index if not exists reward_points_once on public.reward_points (reason, ref) where reason <> 'adjust';
alter table public.reward_points enable row level security;

drop policy if exists "customers read own points" on public.reward_points;
create policy "customers read own points" on public.reward_points for select
  to authenticated using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
drop policy if exists "admin all reward points" on public.reward_points;
create policy "admin all reward points" on public.reward_points for all
  to authenticated using (public.is_admin()) with check (public.is_admin());

-- ================================================================
-- Gift options and product questions
-- ================================================================
alter table public.orders add column if not exists gift_message text not null default '';
alter table public.orders add column if not exists gift_wrap boolean not null default false;
alter table public.orders add column if not exists gift_wrap_pence integer not null default 0;

create table if not exists public.product_questions (
  id uuid primary key default gen_random_uuid(),
  product_slug text not null,
  name text not null default '',
  question text not null,
  answer text not null default '',
  status text not null default 'pending' check (status in ('pending','answered','rejected')),
  created_at timestamptz not null default now(),
  answered_at timestamptz
);
create index if not exists product_questions_idx on public.product_questions (product_slug, status);
alter table public.product_questions enable row level security;

grant select on public.product_questions to anon, authenticated;
drop policy if exists "public read answered questions" on public.product_questions;
create policy "public read answered questions" on public.product_questions for select
  to anon, authenticated using (status = 'answered');
drop policy if exists "admin all product_questions" on public.product_questions;
create policy "admin all product_questions" on public.product_questions for all
  to authenticated using (public.is_admin()) with check (public.is_admin());

-- ================================================================
-- Multi-store support
-- ================================================================
create table if not exists public.stores (
  id text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  name text not null,
  domains text[] not null default '{}',
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists stores_one_default on public.stores (is_default) where is_default;
insert into public.stores (id, name, domains, is_default)
values ('sparkthunder', 'Sparkthunder Shop', '{sparkthunder.shop,www.sparkthunder.shop}', true)
on conflict (id) do nothing;
alter table public.stores enable row level security;

grant select on public.stores to anon, authenticated;
drop policy if exists "public read stores" on public.stores;
create policy "public read stores" on public.stores for select to anon, authenticated using (true);
drop policy if exists "admin all stores" on public.stores;
create policy "admin all stores" on public.stores for all
  to authenticated using (public.is_admin()) with check (public.is_admin());

-- Add store_id to all store-owned tables
do $$
declare t text;
begin
  foreach t in array array['franchises','categories','products','collections','orders','checkout_snapshots','discount_codes','gift_cards',
                           'reviews','stock_alerts','reward_points','product_questions','media','redirects','settings','subscribers'] loop
    execute format('alter table public.%I add column if not exists store_id text not null default %L references public.stores(id) on update cascade', t, 'sparkthunder');
    execute format('create index if not exists %I on public.%I (store_id)', t || '_store_idx', t);
  end loop;
end $$;

-- Replace single-store primary keys / unique constraints with composite (store_id, ...) versions
alter table public.products drop constraint if exists products_franchise_slug_fkey;
alter table public.products drop constraint if exists products_category_slug_fkey;
alter table public.products drop constraint if exists products_pkey;
alter table public.products drop constraint if exists products_sku_key;
alter table public.franchises drop constraint if exists franchises_pkey;
alter table public.categories drop constraint if exists categories_pkey;
alter table public.collections drop constraint if exists collections_pkey;
alter table public.settings drop constraint if exists settings_pkey;
alter table public.subscribers drop constraint if exists subscribers_pkey;
alter table public.media drop constraint if exists media_path_key;
alter table public.redirects drop constraint if exists redirects_from_path_key;
alter table public.orders drop constraint if exists orders_number_key;
alter table public.stock_alerts drop constraint if exists stock_alerts_product_slug_variant_email_key;
alter table public.reviews drop constraint if exists reviews_product_slug_email_key;
drop index if exists public.reward_points_once;

do $$ begin
  alter table public.franchises add constraint franchises_pkey primary key (store_id, slug);
  alter table public.categories add constraint categories_pkey primary key (store_id, slug);
  alter table public.products add constraint products_pkey primary key (store_id, slug);
  alter table public.products add constraint products_sku_key unique (store_id, sku);
  alter table public.products add constraint products_franchise_fkey foreign key (store_id, franchise_slug) references public.franchises(store_id, slug) on update cascade;
  alter table public.products add constraint products_category_fkey foreign key (store_id, category_slug) references public.categories(store_id, slug) on update cascade;
  alter table public.collections add constraint collections_pkey primary key (store_id, slug);
  alter table public.settings add constraint settings_pkey primary key (store_id, key);
  alter table public.subscribers add constraint subscribers_pkey primary key (store_id, email);
  alter table public.media add constraint media_path_key unique (store_id, path);
  alter table public.redirects add constraint redirects_from_path_key unique (store_id, from_path);
  alter table public.orders add constraint orders_number_key unique (store_id, number);
  alter table public.stock_alerts add constraint stock_alerts_unique unique (store_id, product_slug, variant, email);
  alter table public.reviews add constraint reviews_unique unique (store_id, product_slug, email);
exception when duplicate_object or duplicate_table or invalid_table_definition then null;
end $$;
create unique index if not exists reward_points_once on public.reward_points (store_id, reason, ref) where reason <> 'adjust';

-- Expose store_id on reviews to public reads
grant select (store_id) on public.reviews to anon, authenticated;

-- ================================================================
-- Per-store credentials and staff
-- ================================================================
create table if not exists public.store_secrets (
  store_id text primary key references public.stores(id) on update cascade on delete cascade,
  stripe_secret text not null default '',
  stripe_webhook_secret text not null default '',
  resend_key text not null default '',
  email_from text not null default ''
);
alter table public.store_secrets enable row level security;
revoke all on public.store_secrets from anon, authenticated;

create table if not exists public.store_admins (
  user_id uuid not null references auth.users(id) on delete cascade,
  store_id text not null references public.stores(id) on update cascade on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, store_id)
);
alter table public.store_admins enable row level security;
drop policy if exists "owners manage store admins" on public.store_admins;
create policy "owners manage store admins" on public.store_admins for all
  to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "staff see own access" on public.store_admins;
create policy "staff see own access" on public.store_admins for select
  to authenticated using (user_id = auth.uid());

create or replace function public.can_admin_store(sid text) returns boolean
language sql security definer set search_path = public stable as $$
  select public.is_admin() or exists (select 1 from public.store_admins a where a.user_id = auth.uid() and a.store_id = sid);
$$;
grant execute on function public.can_admin_store(text) to anon, authenticated;

create or replace function public.set_store_staff(p_email text, p_store text, p_add boolean) returns void
language plpgsql security definer set search_path = public, auth as $$
declare uid uuid;
begin
  if not public.is_admin() then raise exception 'Only owners can manage staff'; end if;
  select id into uid from auth.users where lower(email) = lower(p_email);
  if uid is null then raise exception 'No account with that email. Ask them to sign up first.'; end if;
  if p_add then insert into public.store_admins (user_id, store_id) values (uid, p_store) on conflict do nothing;
  else delete from public.store_admins where user_id = uid and store_id = p_store; end if;
end $$;
revoke all on function public.set_store_staff(text, text, boolean) from public;
grant execute on function public.set_store_staff(text, text, boolean) to authenticated;

-- Replace admin policies with store-admin policies on store-owned tables
do $$
declare t text; pol record;
begin
  foreach t in array array['franchises','categories','products','collections','orders','checkout_snapshots','discount_codes','gift_cards',
                           'reviews','stock_alerts','reward_points','product_questions','media','redirects','settings','subscribers'] loop
    for pol in select policyname from pg_policies where schemaname = 'public' and tablename = t and policyname like 'admin all%' loop
      execute format('drop policy %I on public.%I', pol.policyname, t);
    end loop;
    execute format('drop policy if exists "store admin all %1$s" on public.%1$I', t);
    execute format('create policy "store admin all %1$s" on public.%1$I for all using (public.can_admin_store(store_id)) with check (public.can_admin_store(store_id))', t);
  end loop;
end $$;
drop policy if exists "admin all stores" on public.stores;
create policy "owners manage stores" on public.stores for all
  to authenticated using (public.is_admin()) with check (public.is_admin());

-- Storage: store-scoped write policies
drop policy if exists "admins write product images" on storage.objects;
create policy "store staff write product images" on storage.objects for insert
  with check (bucket_id = 'product-images' and public.can_admin_store((storage.foldername(name))[1]));
drop policy if exists "admins update product images" on storage.objects;
create policy "store staff update product images" on storage.objects for update
  using (bucket_id = 'product-images' and public.can_admin_store((storage.foldername(name))[1]));
drop policy if exists "admins delete product images" on storage.objects;
create policy "store staff delete product images" on storage.objects for delete
  using (bucket_id = 'product-images' and public.can_admin_store((storage.foldername(name))[1]));

-- Gift card lookup is per-store
drop function if exists public.gift_card_lookup(text);
create or replace function public.gift_card_lookup(p_code text, p_store text)
returns table (balance_pence integer, currency text, status text, expires_at timestamptz)
language sql security definer set search_path = public stable as $$
  select g.balance_pence, g.currency,
    case when g.status <> 'active' then 'disabled'
         when g.expires_at is not null and g.expires_at < now() then 'expired'
         when g.balance_pence = 0 then 'used'
         else 'active' end,
    g.expires_at
  from public.gift_cards g where g.code = upper(p_code) and g.store_id = p_store limit 1;
$$;
revoke all on function public.gift_card_lookup(text, text) from public;
grant execute on function public.gift_card_lookup(text, text) to anon, authenticated;

-- Per-store query indexes
create index if not exists products_store_pub_idx on public.products (store_id, published, created_at desc);
create index if not exists orders_store_created_idx on public.orders (store_id, created_at desc);
create index if not exists reviews_store_product_idx on public.reviews (store_id, product_slug, status);
create index if not exists discount_codes_store_idx on public.discount_codes (store_id, code);
create index if not exists gift_cards_store_idx on public.gift_cards (store_id, code);