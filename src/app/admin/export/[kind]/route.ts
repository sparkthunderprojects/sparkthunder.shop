import { getAdmin, permsHere } from "@/lib/admin/auth";
import { can } from "@/lib/admin/roles";
import { logActivity } from "@/lib/admin/activity";
import { toCsv } from "@/lib/csv";
import { loadCustomers } from "@/lib/admin/customers-data";
import { currentStoreId } from "@/lib/db/stores";
import type { OrderRow } from "@/lib/shop/fulfil";

export const dynamic = "force-dynamic";
const pounds = (p: number | null | undefined) => ((p ?? 0) / 100).toFixed(2);

/** Download this store's data as CSV: orders (for accounting), products, newsletter subscribers. */
export async function GET(_req: Request, { params }: { params: Promise<{ kind: string }> }) {
  const admin = await getAdmin();
  if (!admin) return new Response("Not signed in", { status: 401 });
  const { kind } = await params;
  const need = kind === "products" ? "catalogue" : kind === "subscribers" ? "marketing" : kind === "customers" ? "customers" : "reports";
  if (!can(await permsHere(admin), need)) return new Response("Your role does not allow that export.", { status: 403 });
  const { db } = admin;
  let name = "", body = "";
  if (kind === "orders") {
    const { data } = await db.from("orders").select("*").order("created_at", { ascending: false });
    const rows = ((data ?? []) as OrderRow[]).map((o) => [o.number, o.created_at, o.status, o.name, o.email, o.items.map((l) => `${l.qty} x ${l.name}`).join("; "), pounds(o.subtotal_pence), pounds(o.shipping_pence), pounds(o.discount_pence), o.discount_code ?? "", pounds(o.gift_card_pence), pounds(o.total_pence), pounds(o.refunded_card_pence), pounds(o.vat_pence), o.tracking_number]);
    name = "orders"; body = toCsv(["Order", "Placed", "Status", "Customer", "Email", "Items", "Items total", "Shipping", "Discount", "Discount code", "Paid by gift card", "Paid by card", "Refunded to card", "VAT included", "Tracking"], rows);
  } else if (kind === "products") {
    const { data } = await db.from("products").select("*").order("created_at", { ascending: false });
    const rows = ((data ?? []) as Record<string, unknown>[]).map((p) => [p.slug, p.sku, p.name, p.franchise_slug, p.category_slug, pounds(p.price_pence as number), p.compare_price_pence ? pounds(p.compare_price_pence as number) : "", p.track_stock ? p.stock_qty : "", p.in_stock ? "yes" : "no", p.published ? "yes" : "no", ((p.variants as unknown[]) ?? []).length]);
    name = "products"; body = toCsv(["Slug", "SKU", "Name", "Franchise", "Category", "Price", "Compare price", "Stock", "In stock", "Published", "Variants"], rows);
  } else if (kind === "subscribers") {
    const { data } = await db.from("subscribers").select("*").order("created_at", { ascending: false });
    name = "subscribers"; body = toCsv(["Email", "Joined"], ((data ?? []) as { email: string; created_at: string }[]).map((s) => [s.email, s.created_at]));
  } else if (kind === "customers") {
    const list = await loadCustomers(db);
    const rows = list.sort((a, b) => b.spendPence - a.spendPence).map((c) => [c.email, c.name, c.phone, c.orders, pounds(c.spendPence), pounds(c.aovPence), c.firstOrderAt ?? "", c.lastOrderAt ?? "", c.subscribed ? "yes" : "no", c.points, c.tags.join("; "), c.address?.country ?? ""]);
    name = "customers"; body = toCsv(["Email", "Name", "Phone", "Orders", "Lifetime spend", "Average order", "First order", "Last order", "Newsletter", "Spark points", "Tags", "Country"], rows);
  } else return new Response("Unknown export", { status: 404 });
  await logActivity("export", `Downloaded ${name} as CSV`, { type: "export", id: name });
  return new Response(body, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${await currentStoreId()}-${name}-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "private, no-store" } });
}
