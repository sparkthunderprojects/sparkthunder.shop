import { requireAdmin } from "@/lib/admin/auth";
import { currentStoreId } from "@/lib/db/stores";
import { getStoreSecrets } from "@/lib/secrets";
import { listCategories, listFranchises } from "@/lib/admin/repo";
import { PrintifyPanel } from "./PrintifyPanel";

export const metadata = { title: "Printify" };

export default async function PrintifyPage() {
  const { db } = await requireAdmin();
  const [s, franchises, categories, count] = await Promise.all([
    currentStoreId().then(getStoreSecrets), listFranchises(db), listCategories(db),
    db.from("products").select("slug", { count: "exact", head: true }).neq("printify_id", ""),
  ]);
  return <PrintifyPanel status={{ token: Boolean(s.printifyToken), shopId: s.printifyShopId, webhook: Boolean(s.printifyWebhookSecret), imported: count.count ?? 0 }}
    franchises={franchises.map((f) => ({ slug: f.slug, name: f.name }))} categories={categories.map((c) => ({ slug: c.slug, name: c.name }))} />;
}
