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
