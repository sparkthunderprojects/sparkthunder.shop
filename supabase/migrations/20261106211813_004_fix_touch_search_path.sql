/*
# Fix: set search_path on touch_updated_at trigger function

The database linter flagged touch_updated_at for having a mutable search_path.
This sets an explicit search_path to harden the function.

No data changes. No policy changes.
*/

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;