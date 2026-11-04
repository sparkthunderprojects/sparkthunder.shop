-- Sparkthunder Shop schema. Run in the Supabase SQL editor (or `supabase db push`).

create table if not exists public.franchises (
  slug text primary key,
  name text not null,
  tagline text not null default '',
  description text not null default '',
  accent text not null default '#c9a227',
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

-- Public read-only access for the storefront (anon key). Writes need the service role / dashboard.
alter table public.franchises enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;

drop policy if exists "public read franchises" on public.franchises;
drop policy if exists "public read categories" on public.categories;
drop policy if exists "public read products" on public.products;
create policy "public read franchises" on public.franchises for select using (true);
create policy "public read categories" on public.categories for select using (true);
create policy "public read products" on public.products for select using (published = true);
