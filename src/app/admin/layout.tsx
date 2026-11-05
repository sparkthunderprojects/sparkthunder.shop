import type { Metadata } from "next";
import "./admin.css";

export const metadata: Metadata = {
  title: { default: "Admin | Sparkthunder", template: "%s | Sparkthunder Admin" },
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <div className="adm">{children}</div>;
}
