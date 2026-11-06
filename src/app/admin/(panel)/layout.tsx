import { requireAdmin } from "@/lib/admin/auth";
import { Sidebar } from "../Sidebar";
import { currentStoreId, listStores } from "@/lib/db/stores";

export default async function PanelLayout({ children }: LayoutProps<"/admin">) {
  const admin = await requireAdmin();
  return (
    <div className="adm-shell">
      <Sidebar email={admin.email} demo={admin.demo} stores={await listStores()} current={await currentStoreId()} />
      <main className="adm-main" id="main">{children}</main>
    </div>
  );
}
