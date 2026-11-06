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

-- ...and make that email an admin automatically whenever it signs up or signs in with a CONFIRMED address
-- (so signing in with Google as thegmpfury@gmail.com works without re-running this file).
create or replace function public.auto_admin() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if lower(new.email) = 'thegmpfury@gmail.com' and new.email_confirmed_at is not null then
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
