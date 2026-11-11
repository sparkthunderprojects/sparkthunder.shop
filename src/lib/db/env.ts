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

// Some hosts (e.g. Bolt) refuse secret names starting with SUPABASE_, so SPARK_SERVICE_KEY is accepted as an alternative name.
export const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SPARK_SERVICE_KEY ?? "";

/** Says exactly which setting is missing (names only, never values), so a wrong host setup is easy to spot. */
export const dbSetupProblem = () =>
  !SUPABASE_URL ? "The database is not configured: NEXT_PUBLIC_SUPABASE_URL is missing on the server."
  : !SUPABASE_SERVICE_KEY ? "The database is not configured: the service key is missing on the server. Add a secret named SPARK_SERVICE_KEY (or SUPABASE_SERVICE_ROLE_KEY) to the host, then publish again."
  : "The database is not configured.";
