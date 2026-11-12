import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { currentStoreId, listStores } from "@/lib/db/stores";
import { readTargets } from "@/lib/domains";
import { DomainManager } from "./DomainManager";

export const metadata = { title: "Domains" };

export default async function DomainsPage() {
  const admin = await requireAdmin();
  if (admin.access !== "*") redirect("/admin");
  const id = await currentStoreId();
  const store = (await listStores()).find((s) => s.id === id);
  return <DomainManager storeName={store?.name ?? id} domains={store?.domains ?? []} targets={readTargets()} />;
}
