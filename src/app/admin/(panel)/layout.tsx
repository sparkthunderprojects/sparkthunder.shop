import { requireAdmin } from "@/lib/admin/auth";
import { Sidebar } from "../Sidebar";

export default async function PanelLayout({ children }: LayoutProps<"/admin">) {
  const admin = await requireAdmin();
  return (
    <div className="adm-shell">
      <Sidebar email={admin.email} demo={admin.demo} />
      <main className="adm-main" id="main">{children}</main>
    </div>
  );
}
