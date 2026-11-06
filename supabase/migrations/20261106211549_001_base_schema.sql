/*
# Base schema — Sparkthunder Shop

Creates the core catalog tables for the storefront.

1. New Tables
- `franchises` — product universes (e.g. Knightverge, Occult Inc). PK: slug.
- `categories` — product categories (apparel, drinkware, etc). PK: slug.
- `products` — the shop catalog. PK: slug. FK to franchises + categories.
  Columns: sku, name, price_pence, compare_price_pence, short_description,
  description, details[], images[], in_stock, is_new, is_featured, published, created_at.
- `subscribers` — newsletter sign-ups. PK: email. Anyone can insert, nobody can read the list with the anon key.

2. Indexes
- products_franchise_idx on products(franchise_slug)
- products_category_idx on products(category_slug)

3. Security (RLS)
- franchises: public read (anon + authenticated), no public writes.
- categories: public read (anon + authenticated), no public writes.
- products: public read only published rows, no public writes.
- subscribers: public insert only, no reads (anon can subscribe but not list emails).

4. Notes
- All policies use TO anon, authenticated for public read since the storefront has no sign-in requirement for browsing.
- Writes to catalog tables are handled server-side (service role / admin), not through public RLS.
*/

create table if not exists public.franchises (
  slug text primary key,
  name text not null,
  tagline text not null default '',
  description text not null default '',
  accent text not null default '#3a5fc8',
  sort_order int not null default 0
);

create table if not exists public.categories (
  slug text primary key,
  name text not null,
  description text not null default '',
  sort_order int not null default 0
);

create table if not exists public.products (
  slug text primary key,
  sku text not null unique,
  name text not null,
  franchise_slug text not null references public.franchises(slug) on update cascade,
  category_slug text not null references public.categories(slug) on update cascade,
  price_pence int not null check (price_pence >= 0),
  compare_price_pence int check (compare_price_pence is null or compare_price_pence > price_pence),
  short_description text not null default '',
  description text not null default '',
  details text[] not null default '{}',
  images text[] not null default '{}',
  in_stock boolean not null default true,
  is_new boolean not null default false,
  is_featured boolean not null default false,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists products_franchise_idx on public.products (franchise_slug);
create index if not exists products_category_idx on public.products (category_slug);

-- Enable RLS on all core tables
alter table public.franchises enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;

-- Public read policies (storefront has no sign-in for browsing)
grant select on public.franchises to anon, authenticated;
grant select on public.categories to anon, authenticated;
grant select on public.products to anon, authenticated;

drop policy if exists "public read franchises" on public.franchises;
create policy "public read franchises" on public.franchises for select
  to anon, authenticated using (true);

drop policy if exists "public read categories" on public.categories;
create policy "public read categories" on public.categories for select
  to anon, authenticated using (true);

drop policy if exists "public read products" on public.products;
create policy "public read products" on public.products for select
  to anon, authenticated using (published = true);

-- Newsletter sign-ups: anyone can add an email, nobody can read the list with the anon key.
create table if not exists public.subscribers (
  email text primary key check (email = lower(email) and length(email) <= 254),
  created_at timestamptz not null default now()
);
alter table public.subscribers enable row level security;

grant insert on public.subscribers to anon, authenticated;

drop policy if exists "anyone can subscribe" on public.subscribers;
create policy "anyone can subscribe" on public.subscribers for insert
  to anon, authenticated with check (true);