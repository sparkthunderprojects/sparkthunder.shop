/**
 * Security headers for every response.
 *
 * The Content-Security-Policy keeps inline scripts allowed (Next.js and the JSON-LD data need them, and nonces would make every page
 * dynamic and uncacheable) but locks down everything else that matters: where scripts may come from, where data may be sent,
 * what can frame the site, where forms can post, and base tags and plugins. Consent-gated analytics hosts are listed explicitly.
 *
 * SPARK_CSP=report-only logs violations in the browser console without blocking; SPARK_CSP=off removes the policy (an emergency switch).
 */
const dev = process.env.NODE_ENV !== "production";

export function contentSecurityPolicy(opts: { admin?: boolean } = {}): string {
  const analytics = ["https://www.googletagmanager.com", "https://connect.facebook.net"];
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", ...(dev ? ["'unsafe-eval'"] : []), ...analytics],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'", "https://*.supabase.co", "wss://*.supabase.co", "https://www.googletagmanager.com", "https://*.google-analytics.com", "https://*.analytics.google.com", "https://www.facebook.com", "https://connect.facebook.net"],
    "frame-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": [opts.admin ? "'none'" : "'self'"],
    ...(dev ? {} : { "upgrade-insecure-requests": [] }),
  };
  return Object.entries(directives).map(([k, v]) => [k, ...v].join(" ")).join("; ");
}

type Header = { key: string; value: string };

export function securityHeaders(opts: { admin?: boolean } = {}): Header[] {
  const mode = process.env.SPARK_CSP;
  const list: Header[] = [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: opts.admin ? "DENY" : "SAMEORIGIN" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self), interest-cohort=()" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
    { key: "X-DNS-Prefetch-Control", value: "on" },
  ];
  if (!dev) list.push({ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" });
  if (mode !== "off") list.push({ key: mode === "report-only" ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy", value: contentSecurityPolicy(opts) });
  return list;
}
