import { requireAdmin } from "@/lib/admin/auth";
import type { ReturnRow } from "@/lib/returns";
import { ReturnsTable } from "./ReturnsTable";

export const metadata = { title: "Returns" };

export default async function ReturnsAdmin() {
  const { db } = await requireAdmin("orders");
  const { data, error } = await db.from("return_requests").select("*").order("created_at", { ascending: false }).limit(200);
  return (
    <>
      <div className="adm-h"><div><h1>Returns</h1><p>Return requests from customers. Approve or decline, mark received, then refund from the order page.</p></div></div>
      {error ? <p className="adm-hint">Returns are not set up yet. Run the latest supabase/admin.sql in Supabase.</p> : <ReturnsTable rows={(data ?? []) as ReturnRow[]} />}
    </>
  );
}
