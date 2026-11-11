import { requireAdmin } from "@/lib/admin/auth";
import { getCategories, getFranchises } from "@/lib/catalog";
import type { PromotionRow } from "@/lib/promotions";
import { PromotionManager } from "./PromotionManager";

export const metadata = { title: "Automatic offers" };

export default async function PromotionsAdmin() {
  const { db } = await requireAdmin("marketing");
  const [{ data }, franchises, categories] = await Promise.all([db.from("promotions").select("*").order("created_at", { ascending: false }), getFranchises(), getCategories()]);
  return (
    <>
      <div className="adm-h"><div><h1>Automatic offers</h1><p>Offers that apply by themselves when a basket qualifies: percent off, buy X get Y, free delivery. No code needed.</p></div></div>
      <PromotionManager rows={(data ?? []) as PromotionRow[]} franchises={franchises.map((f) => ({ slug: f.slug, name: f.name }))} categories={categories.map((c) => ({ slug: c.slug, name: c.name }))} />
    </>
  );
}
