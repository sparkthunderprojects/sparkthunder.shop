import { requireAdmin } from "@/lib/admin/auth";
import { Sidebar } from "../Sidebar";
import { NoAccess } from "./NoAccess";
import { currentStoreId, listStores } from "@/lib/db/stores";

export default async function PanelLayout({ children }: LayoutProps<"/admin">) {
  const admin = await requireAdmin();
  const all = await listStores();
  const stores = admin.access === "*" ? all : all.filter((s) => admin.access.includes(s.id));
  const current = await currentStoreId();
  const allowed = stores.some((s) => s.id === current);
  return (
    <div className="adm-shell">
      <Sidebar email={admin.email} demo={admin.demo} stores={stores} current={allowed ? current : ""} owner={admin.access === "*"} />
      <main className="adm-main" id="main">{allowed ? children : <NoAccess firstId={stores[0]?.id ?? ""} />}</main>
    </div>
  );
}
