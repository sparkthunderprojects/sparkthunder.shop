import { requireAdmin } from "@/lib/admin/auth";
import { getFranchises } from "@/lib/catalog";
import type { DiscountRow } from "@/lib/discounts";
import { DiscountManager } from "./DiscountManager";

export const metadata = { title: "Discount codes" };

export default async function DiscountsAdmin() {
  const { db } = await requireAdmin();
  const [{ data }, franchises] = await Promise.all([db.from("discount_codes").select("*").order("created_at", { ascending: false }), getFranchises()]);
  return (
    <>
      <div className="adm-h"><div><h1>Discount codes</h1><p>Percentage or fixed-amount codes for launches, newsletters and creators. They apply to products only (not gift cards or shipping).</p></div></div>
      <DiscountManager rows={(data ?? []) as DiscountRow[]} franchises={franchises.map((f) => ({ slug: f.slug, name: f.name }))} />
    </>
  );
}
