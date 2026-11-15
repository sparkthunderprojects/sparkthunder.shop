import { getAdmin } from "@/lib/admin/auth";
import { currentStoreId, listStores, PREVIEW_COOKIE } from "@/lib/db/stores";
import { storeForHost } from "@/lib/db/stores-core";

export const dynamic = "force-dynamic";

/**
 * Admin > View storefront. A storefront is chosen by the address it is opened on, so a store with no domain yet cannot be
 * opened. This sets a private, session-only cookie that makes the storefront show the store being edited, for this
 * browser only. ?off=1 clears it. When the store already owns the address, nothing is set.
 */
export async function GET(req: Request) {
  const admin = await getAdmin();
  if (!admin) return new Response("Not signed in", { status: 401 });
  const url = new URL(req.url);
  const back = (clear: boolean, set?: string) => {
    const res = new Response(null, { status: 303, headers: { Location: new URL("/", req.url).toString() } });
    const secure = url.protocol === "https:" ? "; Secure" : "";
    res.headers.append("Set-Cookie", clear ? `${PREVIEW_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure}` : `${PREVIEW_COOKIE}=${set}; Path=/; HttpOnly; SameSite=Lax${secure}`);
    return res;
  };
  if (url.searchParams.get("off")) return back(true);
  const id = await currentStoreId();
  if (admin.access !== "*" && !admin.access.includes(id)) return new Response("No access to that store", { status: 403 });
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const owner = storeForHost(await listStores(), host).id;
  return id === owner ? back(true) : back(false, id);
}
