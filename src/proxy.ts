import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type Rule = { from_path: string; to_path: string; status: number };
let cache: { at: number; map: Map<string, Rule> } | null = null;

async function rules(origin: string): Promise<Map<string, Rule>> {
  if (cache && Date.now() - cache.at < 10_000) return cache.map;
  try {
    const res = await fetch(`${origin}/api/redirects`, { signal: AbortSignal.timeout(1500) });
    const list: Rule[] = res.ok ? await res.json() : [];
    cache = { at: Date.now(), map: new Map(list.map((r) => [r.from_path, r])) };
  } catch {
    cache = { at: Date.now() - 5_000, map: cache?.map ?? new Map() };
  }
  return cache.map;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Admin: keep the session fresh and send signed-out visitors to the login page.
  if (pathname.startsWith("/admin") || pathname.startsWith("/account") || pathname.startsWith("/auth")) {
    const isAdmin = pathname.startsWith("/admin");
    let res = NextResponse.next({ request: req });
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && key) {
      const supabase = createServerClient(url, key, {
        cookies: {
          getAll: () => req.cookies.getAll(),
          setAll: (list) => {
            list.forEach(({ name, value }) => req.cookies.set(name, value));
            res = NextResponse.next({ request: req });
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
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/|api/|art/|uploads/|franchise/|hero/|.*\\..*).*)"],
};
