-- Sparkthunder Shop admin (CMS) + SEO extensions.
-- Run AFTER schema.sql, in the Supabase SQL editor. Safe to re-run.

-- ---------------------------------------------------------------- admins
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
create policy "admins see themselves" on public.admin_users for select using (user_id = auth.uid());

-- First admin: create this user under Authentication > Users first, then re-run this file.
insert into public.admin_users (user_id)
select id from auth.users where email = 'thegmpfury@gmail.com'
on conflict do nothing;

-- ...and make that email an admin automatically when it signs in with GOOGLE (Google verifies the address itself).
-- Deliberately NOT for email/password sign-ups: if "Confirm email" is ever off in Supabase, anyone could register
-- that address and become an admin. Email/password admins are added by the insert above or in admin_users.
create or replace function public.auto_admin() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if lower(new.email) = 'thegmpfury@gmail.com'
     and new.email_confirmed_at is not null
     and coalesce(new.raw_app_meta_data ->> 'provider', '') = 'google' then
    insert into public.admin_users (user_id) values (new.id) on conflict do nothing;
  end if;
  return new;
end $$;
drop trigger if exists auto_admin on auth.users;
create trigger auto_admin after insert or update of email_confirmed_at on auth.users for each row execute function public.auto_admin();

-- ---------------------------------------------------------------- columns
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
  add column if not exists option_names text[] not null default '{}',
  add column if not exists option_swatches jsonb not null default '{}',
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

-- ---------------------------------------------------------------- media, redirects, settings
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

-- ---------------------------------------------------------------- row level security
alter table public.media enable row level security;
alter table public.redirects enable row level security;
alter table public.settings enable row level security;

do $$
declare t text;
begin
  foreach t in array array['products','franchises','categories','media','redirects','settings','subscribers'] loop
    execute format('drop policy if exists "admin all %1$s" on public.%1$I', t);
    execute format('create policy "admin all %1$s" on public.%1$I for all using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

drop policy if exists "public read media" on public.media;
create policy "public read media" on public.media for select using (true);
drop policy if exists "public read redirects" on public.redirects;
create policy "public read redirects" on public.redirects for select using (true);
drop policy if exists "public read settings" on public.settings;
create policy "public read settings" on public.settings for select using (true);

-- ---------------------------------------------------------------- image storage
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "public read product images" on storage.objects;
create policy "public read product images" on storage.objects for select using (bucket_id = 'product-images');
drop policy if exists "admins write product images" on storage.objects;
create policy "admins write product images" on storage.objects for insert with check (bucket_id = 'product-images' and public.is_admin());
drop policy if exists "admins update product images" on storage.objects;
create policy "admins update product images" on storage.objects for update using (bucket_id = 'product-images' and public.is_admin());
drop policy if exists "admins delete product images" on storage.objects;
create policy "admins delete product images" on storage.objects for delete using (bucket_id = 'product-images' and public.is_admin());

-- ---------------------------------------------------------------- gift cards
create table if not exists public.gift_cards (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,                       -- 12 chars, shown as SPK-XXXX-XXXX-XXXX
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

-- Gift cards are NOT publicly readable (the code is the secret). Admins manage them directly...
alter table public.gift_cards enable row level security;
alter table public.gift_card_ledger enable row level security;
drop policy if exists "admin all gift_cards" on public.gift_cards;
create policy "admin all gift_cards" on public.gift_cards for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin all gift_card_ledger" on public.gift_card_ledger;
create policy "admin all gift_card_ledger" on public.gift_card_ledger for all using (public.is_admin()) with check (public.is_admin());

-- ...and shoppers can only look one up by exact code, which returns just the balance and status.
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

-- ---------------------------------------------------------------- orders and checkout (Stripe)
alter table public.gift_cards add column if not exists emailed_at timestamptz;

-- Server-side snapshot of what was in the basket when checkout started (prices come from the catalogue, never the browser).
create table if not exists public.checkout_snapshots (
  id text primary key,                      -- Stripe Checkout Session id
  payload jsonb not null,
  created_at timestamptz not null default now(),
  fulfilled_at timestamptz
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,              -- e.g. SPK-1001
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

-- Only admins can read these through the API. The checkout and Stripe webhook use the service role key, which bypasses RLS.
alter table public.orders enable row level security;
alter table public.checkout_snapshots enable row level security;
drop policy if exists "admin all orders" on public.orders;
create policy "admin all orders" on public.orders for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin all checkout_snapshots" on public.checkout_snapshots;
create policy "admin all checkout_snapshots" on public.checkout_snapshots for all using (public.is_admin()) with check (public.is_admin());

-- Signed-in customers (Sparkthunder ID) can read their own orders by email. Keep "Confirm email" ON in Supabase Auth.
drop policy if exists "customers read own orders" on public.orders;
create policy "customers read own orders" on public.orders for select using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- ---------------------------------------------------------------- universe websites
alter table public.franchises add column if not exists site_url text not null default '';

-- ============================================================================
-- Round 2: discount codes, bundles, back-in-stock alerts (idempotent)
-- ============================================================================

-- Discount codes. Checked and redeemed only by the server (service role); admins manage them here.
create table if not exists public.discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  kind text not null check (kind in ('percent', 'fixed')),
  value integer not null check (value > 0),          -- percent (1-100) or pence off
  min_spend_pence integer not null default 0,
  max_uses integer,                                  -- null = unlimited
  uses integer not null default 0,
  franchise_slug text not null default '',           -- '' = every universe
  starts_at timestamptz,
  expires_at timestamptz,
  active boolean not null default true,
  note text not null default '',
  created_at timestamptz not null default now()
);
alter table public.discount_codes enable row level security;
drop policy if exists "admin all discount_codes" on public.discount_codes;
create policy "admin all discount_codes" on public.discount_codes for all using (public.is_admin()) with check (public.is_admin());

alter table public.orders add column if not exists discount_code text not null default '';
alter table public.orders add column if not exists discount_pence integer not null default 0;

-- Bundles: a product that contains other products, e.g. [{"slug":"knightverge-heroes-mug","qty":1}]
alter table public.products add column if not exists bundle_items jsonb not null default '[]'::jsonb;

-- Back-in-stock alerts. Written by the server (service role) only; admins can read and manage.
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
create policy "admin all stock_alerts" on public.stock_alerts for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------- Round 3: collections and drops
create table if not exists public.collections (
  slug text primary key,
  name text not null,
  description text not null default '',
  image text not null default '',
  launch_at timestamptz,                      -- empty = already on sale
  product_slugs text[] not null default '{}',
  sort_order integer not null default 0,
  published boolean not null default true,
  updated_at timestamptz not null default now()
);
drop trigger if exists collections_touch on public.collections;
create trigger collections_touch before update on public.collections for each row execute function public.touch_updated_at();
alter table public.collections enable row level security;
drop policy if exists "public read collections" on public.collections;
create policy "public read collections" on public.collections for select using (published);
drop policy if exists "admin all collections" on public.collections;
create policy "admin all collections" on public.collections for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------- Round 3: verified-buyer reviews with photos
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_slug text not null,
  email text not null,                        -- the buyer (never shown publicly)
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
-- The public can read approved reviews only, and never the buyer's email (column-level privileges). Writes go through the server.
revoke select on public.reviews from anon, authenticated;
grant select (id, product_slug, name, rating, title, body, photos, verified, status, created_at) on public.reviews to anon, authenticated;
drop policy if exists "public read approved reviews" on public.reviews;
create policy "public read approved reviews" on public.reviews for select using (status = 'approved');
drop policy if exists "admin all reviews" on public.reviews;
create policy "admin all reviews" on public.reviews for all using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public) values ('review-photos', 'review-photos', true) on conflict (id) do nothing;
drop policy if exists "public read review photos" on storage.objects;
create policy "public read review photos" on storage.objects for select using (bucket_id = 'review-photos');
-- Uploads happen only through the server (service role), so no public write policy is created.

-- ---------------------------------------------------------------- Round 3: Spark points (fan rewards)
create table if not exists public.reward_points (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  points integer not null,                    -- positive = earned, negative = spent
  reason text not null check (reason in ('order','review','redeem','adjust')),
  ref text not null default '',               -- order number, review id or code (makes awards happen once)
  note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists reward_points_email_idx on public.reward_points (lower(email));
create unique index if not exists reward_points_once on public.reward_points (reason, ref) where reason <> 'adjust';
alter table public.reward_points enable row level security;
drop policy if exists "customers read own points" on public.reward_points;
create policy "customers read own points" on public.reward_points for select using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
drop policy if exists "admin all reward points" on public.reward_points;
create policy "admin all reward points" on public.reward_points for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------- Amazon-style round: gift options and product questions
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
-- The public reads only questions you have answered. Asking goes through the server (service role).
drop policy if exists "public read answered questions" on public.product_questions;
create policy "public read answered questions" on public.product_questions for select using (status = 'answered');
drop policy if exists "admin all product questions" on public.product_questions;
create policy "admin all product questions" on public.product_questions for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- Multi-store (Spark Merchant): many stores on one database. Idempotent.
-- Every store-owned row carries a store_id; the app scopes every query by it (src/lib/db/scope.ts).
-- ============================================================================
create table if not exists public.stores (
  id text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  name text not null,
  domains text[] not null default '{}',        -- e.g. {sparkthunder.shop,www.sparkthunder.shop}
  is_default boolean not null default false,   -- used for unknown hosts (previews, localhost)
  created_at timestamptz not null default now()
);
create unique index if not exists stores_one_default on public.stores (is_default) where is_default;
insert into public.stores (id, name, domains, is_default)
values ('sparkthunder', 'Sparkthunder Shop', '{sparkthunder.shop,www.sparkthunder.shop}', true)
on conflict (id) do nothing;
alter table public.stores enable row level security;
drop policy if exists "public read stores" on public.stores;
create policy "public read stores" on public.stores for select using (true);
drop policy if exists "admin all stores" on public.stores;
create policy "admin all stores" on public.stores for all using (public.is_admin()) with check (public.is_admin());

do $$
declare t text;
begin
  foreach t in array array['franchises','categories','products','collections','orders','checkout_snapshots','discount_codes','gift_cards',
                           'reviews','stock_alerts','reward_points','product_questions','media','redirects','settings','subscribers'] loop
    execute format('alter table public.%I add column if not exists store_id text not null default %L references public.stores(id) on update cascade', t, 'sparkthunder');
    execute format('create index if not exists %I on public.%I (store_id)', t || '_store_idx', t);
  end loop;
end $$;

-- Slugs, SKUs and the like only need to be unique inside one store (two stores can both sell a "tee" or have a /sale redirect).
alter table public.products drop constraint if exists products_franchise_slug_fkey;
alter table public.products drop constraint if exists products_category_slug_fkey;
alter table public.products drop constraint if exists products_franchise_fkey;
alter table public.products drop constraint if exists products_category_fkey;
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

-- Public reads of reviews keep hiding the buyer's email; store_id is safe to expose.
grant select (store_id) on public.reviews to anon, authenticated;

-- ============================================================================
-- Scale hardening for many stores (idempotent)
-- ============================================================================

-- Per-store credentials (Stripe, Resend). RLS is on with NO policies, so only the server's service key can read or write them.
create table if not exists public.store_secrets (
  store_id text primary key references public.stores(id) on update cascade on delete cascade,
  stripe_secret text not null default '',
  stripe_webhook_secret text not null default '',
  resend_key text not null default '',
  email_from text not null default ''
);
alter table public.store_secrets enable row level security;
revoke all on public.store_secrets from anon, authenticated;

-- Store staff: a person can be allowed to run one store (or several) without touching the others.
-- Owners (rows in admin_users) can still manage every store.
create table if not exists public.store_admins (
  user_id uuid not null references auth.users(id) on delete cascade,
  store_id text not null references public.stores(id) on update cascade on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, store_id)
);
alter table public.store_admins enable row level security;
drop policy if exists "owners manage store admins" on public.store_admins;
create policy "owners manage store admins" on public.store_admins for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "staff see own access" on public.store_admins;
create policy "staff see own access" on public.store_admins for select using (user_id = auth.uid());

create or replace function public.can_admin_store(sid text) returns boolean
language sql security definer set search_path = public stable as $$
  select public.is_admin() or exists (select 1 from public.store_admins a where a.user_id = auth.uid() and a.store_id = sid);
$$;
grant execute on function public.can_admin_store(text) to anon, authenticated;

-- Owners add or remove staff by email (the person must already have signed up).
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

-- Every store-owned table is managed by that store's staff (and owners), never by staff of another store.
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
drop policy if exists "owners manage stores" on public.stores;
create policy "owners manage stores" on public.stores for all using (public.is_admin()) with check (public.is_admin());

-- Uploads live under <store id>/..., and only that store's staff can write there.
drop policy if exists "admins write product images" on storage.objects;
drop policy if exists "store staff write product images" on storage.objects;
create policy "store staff write product images" on storage.objects for insert with check (bucket_id = 'product-images' and public.can_admin_store((storage.foldername(name))[1]));
drop policy if exists "admins update product images" on storage.objects;
drop policy if exists "store staff update product images" on storage.objects;
create policy "store staff update product images" on storage.objects for update using (bucket_id = 'product-images' and public.can_admin_store((storage.foldername(name))[1]));
drop policy if exists "admins delete product images" on storage.objects;
drop policy if exists "store staff delete product images" on storage.objects;
create policy "store staff delete product images" on storage.objects for delete using (bucket_id = 'product-images' and public.can_admin_store((storage.foldername(name))[1]));

-- Gift card balance lookups are per store: a card from one store cannot be probed from another.
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

-- Indexes for the busiest per-store queries.
create index if not exists products_store_pub_idx on public.products (store_id, published, created_at desc);
create index if not exists orders_store_created_idx on public.orders (store_id, created_at desc);
create index if not exists reviews_store_product_idx on public.reviews (store_id, product_slug, status);
create index if not exists discount_codes_store_idx on public.discount_codes (store_id, code);
create index if not exists gift_cards_store_idx on public.gift_cards (store_id, code);

-- ============================================================================
-- Reliable fulfilment (idempotent): resumable orders, exactly-once stock, atomic order numbers
-- ============================================================================
do $$ begin
  -- Orders that existed before this was added are finished: never resume them.
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'orders' and column_name = 'fulfilled_at') then
    alter table public.orders add column fulfilled_at timestamptz;
    update public.orders set fulfilled_at = created_at;
  end if;
end $$;
alter table public.orders
  add column if not exists fulfilment jsonb not null default '{}',          -- which steps are done (stock, gift cards, points, email...)
  add column if not exists fulfil_attempts int not null default 0,
  add column if not exists fulfilment_lock_until timestamptz;               -- one worker at a time finishes an order
alter table public.gift_cards add column if not exists fulfil_key text;     -- makes "issue this purchased card" safe to repeat
create unique index if not exists gift_cards_fulfil_key_idx on public.gift_cards (fulfil_key) where fulfil_key is not null;

-- One row per product taken off stock by an order. The unique key is what makes taking stock safe to repeat.
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  store_id text not null references public.stores(id) on update cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  product_slug text not null,
  variant text not null default '',
  qty int not null,
  before_qty int,
  oversold boolean not null default false,
  created_at timestamptz not null default now(),
  unique (order_id, product_slug, variant)
);
alter table public.stock_movements enable row level security;
drop policy if exists "admin read stock movements" on public.stock_movements;
create policy "admin read stock movements" on public.stock_movements for select using (public.can_admin_store(store_id));

create table if not exists public.store_counters (
  store_id text not null references public.stores(id) on update cascade,
  name text not null,
  value int not null,
  primary key (store_id, name)
);
alter table public.store_counters enable row level security;
revoke all on public.store_counters from anon, authenticated;

-- Next order number for a store, safe when many orders arrive at once. Starts after any orders that already exist.
create or replace function public.next_order_number(p_store text) returns int
language plpgsql security definer set search_path = public as $$
declare v int;
begin
  insert into public.store_counters (store_id, name, value)
  values (p_store, 'order', 1001 + (select count(*) from public.orders where store_id = p_store))
  on conflict (store_id, name) do update set value = public.store_counters.value + 1
  returning value into v;
  return v;
end $$;

-- Take stock off a product (or one variant) for an order. Locks the product row, so two orders can never overwrite each other,
-- and records a movement, so calling it twice for the same order and product does nothing the second time.
-- Returns the quantity in stock before this order (so a caller can spot overselling), -1 if already applied, -2 if stock is not tracked.
create or replace function public.take_stock(p_store text, p_order uuid, p_slug text, p_variant text, p_qty int) returns int
language plpgsql security definer set search_path = public as $$
declare prod public.products%rowtype; v_before int; vs jsonb; total int;
begin
  insert into public.stock_movements (store_id, order_id, product_slug, variant, qty)
  values (p_store, p_order, p_slug, coalesce(p_variant, ''), p_qty)
  on conflict (order_id, product_slug, variant) do nothing;
  if not found then return -1; end if;

  select * into prod from public.products where store_id = p_store and slug = p_slug for update;
  if not found or not prod.track_stock then return -2; end if;

  if coalesce(p_variant, '') <> '' and jsonb_typeof(prod.variants) = 'array' and jsonb_array_length(prod.variants) > 0 then
    select (v ->> 'stockQty')::int into v_before from jsonb_array_elements(prod.variants) v where v ->> 'name' = p_variant limit 1;
    select coalesce(jsonb_agg(case when v ->> 'name' = p_variant
                                   then jsonb_set(v, '{stockQty}', to_jsonb(greatest(0, (v ->> 'stockQty')::int - p_qty)))
                                   else v end order by ord), '[]'::jsonb)
      into vs from jsonb_array_elements(prod.variants) with ordinality as t(v, ord);
    select coalesce(sum((v ->> 'stockQty')::int), 0) into total from jsonb_array_elements(vs) v;
    update public.products set variants = vs, stock_qty = total, in_stock = total > 0 where store_id = p_store and slug = p_slug;
  else
    v_before := prod.stock_qty;
    update public.products set stock_qty = greatest(0, prod.stock_qty - p_qty),
                               in_stock = case when prod.stock_qty - p_qty <= 0 then false else prod.in_stock end
      where store_id = p_store and slug = p_slug;
  end if;
  update public.stock_movements set before_qty = v_before, oversold = coalesce(v_before, 0) < p_qty
    where order_id = p_order and product_slug = p_slug and variant = coalesce(p_variant, '');
  return coalesce(v_before, 0);
end $$;

-- These run with the service key only (the server), never from a browser.
revoke all on function public.next_order_number(text) from public, anon, authenticated;
revoke all on function public.take_stock(text, uuid, text, text, int) from public, anon, authenticated;
grant execute on function public.next_order_number(text) to service_role;
grant execute on function public.take_stock(text, uuid, text, text, int) to service_role;

-- ============================================================================
-- Stock holds at checkout (idempotent): the last item cannot be sold twice
-- ============================================================================
create table if not exists public.stock_reservations (
  id uuid primary key default gen_random_uuid(),
  store_id text not null references public.stores(id) on update cascade,
  hold_key text not null,                         -- one checkout attempt
  product_slug text not null,
  variant text not null default '',
  qty int not null check (qty > 0),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (hold_key, product_slug, variant)
);
create index if not exists stock_reservations_lookup on public.stock_reservations (store_id, product_slug, expires_at);
alter table public.stock_reservations enable row level security;
drop policy if exists "admin read stock reservations" on public.stock_reservations;
create policy "admin read stock reservations" on public.stock_reservations for select using (public.can_admin_store(store_id));

-- Hold stock for a checkout. All or nothing: if any item is short (counting what other shoppers are holding), nothing is held and
-- the short items come back. Product rows are locked in a fixed order, so two checkouts can never both take the last unit.
-- p_items is [{"slug":"tee","variant":"","qty":2}, ...]. Holding again with the same key replaces that checkout's earlier hold.
create or replace function public.reserve_stock(p_store text, p_key text, p_items jsonb, p_minutes int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare it record; prod public.products%rowtype; on_hand int; held int; short jsonb := '[]'::jsonb; exp timestamptz := now() + make_interval(mins => p_minutes);
begin
  delete from public.stock_reservations where hold_key = p_key or expires_at < now() - interval '1 day';
  for it in
    select x.slug, coalesce(x.variant, '') as variant, sum(x.qty)::int as qty
    from jsonb_to_recordset(p_items) as x(slug text, variant text, qty int)
    group by 1, 2 order by 1, 2
  loop
    select * into prod from public.products where store_id = p_store and slug = it.slug for update;
    if not found or not prod.track_stock then continue; end if;
    if it.variant <> '' and jsonb_typeof(prod.variants) = 'array' and jsonb_array_length(prod.variants) > 0 then
      select coalesce((v ->> 'stockQty')::int, 0) into on_hand from jsonb_array_elements(prod.variants) v where v ->> 'name' = it.variant limit 1;
      on_hand := coalesce(on_hand, 0);
    else
      on_hand := prod.stock_qty;
    end if;
    select coalesce(sum(qty), 0) into held from public.stock_reservations
      where store_id = p_store and product_slug = it.slug and variant = it.variant and expires_at > now();
    if it.qty > on_hand - held then
      short := short || jsonb_build_array(jsonb_build_object('slug', it.slug, 'variant', it.variant, 'wanted', it.qty, 'available', greatest(0, on_hand - held)));
    end if;
  end loop;
  if jsonb_array_length(short) > 0 then return jsonb_build_object('ok', false, 'short', short); end if;
  insert into public.stock_reservations (store_id, hold_key, product_slug, variant, qty, expires_at)
  select p_store, p_key, x.slug, coalesce(x.variant, ''), sum(x.qty)::int, exp
  from jsonb_to_recordset(p_items) as x(slug text, variant text, qty int)
  join public.products p on p.store_id = p_store and p.slug = x.slug and p.track_stock
  group by 1, 2, 3, 4, 6;
  return jsonb_build_object('ok', true, 'expires_at', exp);
end $$;

-- Give a checkout's stock back (paid and counted, abandoned, or expired). Safe to call any number of times.
create or replace function public.release_stock(p_store text, p_key text) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  delete from public.stock_reservations where store_id = p_store and hold_key = p_key;
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.reserve_stock(text, text, jsonb, int) from public, anon, authenticated;
revoke all on function public.release_stock(text, text) from public, anon, authenticated;
grant execute on function public.reserve_stock(text, text, jsonb, int) to service_role;
grant execute on function public.release_stock(text, text) to service_role;
