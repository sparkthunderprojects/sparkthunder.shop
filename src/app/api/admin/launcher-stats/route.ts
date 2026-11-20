import { getAdmin } from "@/lib/admin/auth";
import { launcherStats, type OpenOrder, type StatsOrder } from "@/lib/admin/launcher-stats";
import { listStores } from "@/lib/db/stores";
import { nowMs } from "@/lib/time";

export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" };

/**
 * Read-only snapshot for the Sparkthunder Admin Launcher desktop app. Only a signed-in admin gets anything, and only for the stores
 * that admin may manage. Reads go through the admin's own session, so row-level security applies exactly as it does in the admin.
 * No customer details are returned: only counts, money and the newest order's number.
 */
export async function GET() {
  const admin = await getAdmin();
  if (!admin) return Response.json({ error: "Not signed in." }, { status: 401, headers });
  const stores = (await listStores()).filter((s) => admin.access === "*" || admin.access.includes(s.id));
  const now = nowMs();
  if (!stores.length) return Response.json({ generatedAt: new Date(now).toISOString(), stores: [] }, { headers });
  const ids = stores.map((s) => s.id);
  const since = new Date(now - 7 * 86_400_000).toISOString();
  const [recent, open] = await Promise.all([
    admin.db.from("orders").select("id, number, store_id, status, total_pence, refunded_card_pence, created_at").in("store_id", ids).gte("created_at", since).order("created_at", { ascending: false }).limit(2000),
    admin.db.from("orders").select("store_id, status").in("store_id", ids).in("status", ["paid", "attention"]).limit(5000),
  ]);
  if (recent.error || open.error) return Response.json({ error: "Could not read orders." }, { status: 500, headers });
  return Response.json(
    { generatedAt: new Date(now).toISOString(), stores: launcherStats(stores.map((s) => ({ id: s.id, name: s.name })), (recent.data ?? []) as StatsOrder[], (open.data ?? []) as OpenOrder[], now) },
    { headers },
  );
}
