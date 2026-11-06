import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type Rule = { from_path: string; to_path: string; status: number };
const caches = new Map<string, { at: number; map: Map<string, Rule> }>();

async function rules(origin: string): Promise<Map<string, Rule>> {
  const cache = caches.get(origin);
  if (cache && Date.now() - cache.at < 10_000) return cache.map;
  try {
    const res = await fetch(`${origin}/api/redirects`, { signal: AbortSignal.timeout(1500) });
    const list: Rule[] = res.ok ? await res.json() : [];
    caches.set(origin, { at: Date.now(), map: new Map(list.map((r) => [r.from_path, r])) });
  } catch {
    caches.set(origin, { at: Date.now() - 5_000, map: cache?.map ?? new Map() });
  }
  return caches.get(origin)!.map;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Admin: keep the session fresh and send signed-out visitors to the login page.
  if (pathname.startsWith("/admin") || pathname.startsWith("/account") || pathname.startsWith("/auth")) {
    const isAdmin = pathname.startsWith("/admin");
    // Tell the data layer this is the admin, where the chosen store comes from the switcher rather than the host.
    const fwd = new Headers(req.headers);
    if (isAdmin) fwd.set("x-spark-admin", "1"); else fwd.delete("x-spark-admin");
    let res = NextResponse.next({ request: { headers: fwd } });
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && key) {
      const supabase = createServerClient(url, key, {
        cookies: {
          getAll: () => req.cookies.getAll(),
          setAll: (list) => {
            list.forEach(({ name, value }) => req.cookies.set(name, value));
            res = NextResponse.next({ request: { headers: fwd } });
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
  const rule = (await rules(req.nextUrl.origin)).get(pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname);
  if (rule) {
    const to = /^https?:\/\//.test(rule.to_path) ? rule.to_path : new URL(rule.to_path, req.url).toString();
    return NextResponse.redirect(to, rule.status as 301 | 302 | 307 | 308);
  }
  const open = new Headers(req.headers);
  open.delete("x-spark-admin"); // never trust this from outside
  return NextResponse.next({ request: { headers: open } });
}

export const config = {
  matcher: ["/((?!_next/|api/|art/|uploads/|franchise/|hero/|.*\\..*).*)"],
};
