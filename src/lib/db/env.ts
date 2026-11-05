export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/**
 * Demo mode: an in-memory store seeded from the built-in catalogue, with the admin login bypassed.
 * It only switches on when SPARKTHUNDER_DEMO=1 is set explicitly, Supabase is not configured and
 * the code is not running on a known host, so it can never expose a live admin by accident.
 */
export const isDemo =
  !hasSupabase &&
  process.env.SPARKTHUNDER_DEMO === "1" &&
  !process.env.NETLIFY && !process.env.VERCEL && !process.env.CI;
