import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { currentStoreId, listStores } from "@/lib/db/stores";
import { StoresManager } from "./StoresManager";

export const metadata = { title: "Stores" };

export default async function StoresPage() {
  const admin = await requireAdmin();
  if (admin.access !== "*") redirect("/admin");
  return <StoresManager stores={await listStores()} current={await currentStoreId()} />;
}
