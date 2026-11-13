import { hostInfo } from "@/lib/db/edge-data";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { splitLocale, DEFAULT_LOCALE } from "@/lib/i18n/config";

export async function proxy(req: NextRequest) {
  // /fr/..., /de/... and /es/... are the same pages in another language: strip the prefix, remember the language, and serve the normal route.
  const split = splitLocale(req.nextUrl.pathname);
  const locale = /^\/(admin|api|auth)(\/|$)/.test(split.path) ? DEFAULT_LOCALE : split.locale;
  const pathname = locale === DEFAULT_LOCALE ? req.nextUrl.pathname : split.path;
  if (locale === DEFAULT_LOCALE && split.locale !== DEFAULT_LOCALE) return new NextResponse("Not found", { status: 404, headers: { "Content-Type": "text/plain" } });
  const pass = (headers: Headers) => {
    headers.delete("x-locale"); // never trust this from outside
    if (locale === DEFAULT_LOCALE) return NextResponse.next({ request: { headers } });
    headers.set("x-locale", locale);
    const to = req.nextUrl.clone(); to.pathname = pathname;
    return NextResponse.rewrite(to, { request: { headers } });
  };

  // Admin: keep the session fresh and send signed-out visitors to the login page.
  if (pathname.startsWith("/admin") || pathname.startsWith("/account") || pathname.startsWith("/auth")) {
    const isAdmin = pathname.startsWith("/admin");
    // Tell the data layer this is the admin, where the chosen store comes from the switcher rather than the host.
    const fwd = new Headers(req.headers);
    if (isAdmin) fwd.set("x-spark-admin", "1"); else fwd.delete("x-spark-admin");
    let res = pass(fwd);
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && key) {
      const supabase = createServerClient(url, key, {
        cookies: {
          getAll: () => req.cookies.getAll(),
          setAll: (list) => {
            list.forEach(({ name, value }) => req.cookies.set(name, value));
            res = pass(fwd);
            res.headers.set("X-Robots-Tag", "noindex, nofollow");
            list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
          },
        },
      });
      const { data } = await supabase.auth.getUser();
      if (isAdmin && !data.user && pathname !== "/admin/login") return NextResponse.redirect(new URL("/admin/login", req.url));
    }
    return res;
  }

  // Storefront: apply admin-managed redirects.
  const info = await hostInfo(req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "");
  if (!info.known) return new NextResponse("Not found", { status: 404, headers: { "X-Robots-Tag": "noindex, nofollow", "Content-Type": "text/plain" } });
  const rule = info.rules.get(pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname);
  if (rule) {
    const to = /^https?:\/\//.test(rule.to_path) ? rule.to_path : new URL(rule.to_path, req.url).toString();
    return NextResponse.redirect(to, rule.status as 301 | 302 | 307 | 308);
  }
  const open = new Headers(req.headers);
  open.delete("x-spark-admin"); // never trust this from outside
  return pass(open);
}

export const config = {
  matcher: ["/((?!_next/|api/|art/|uploads/|franchise/|hero/|.*\\..*).*)"],
};
