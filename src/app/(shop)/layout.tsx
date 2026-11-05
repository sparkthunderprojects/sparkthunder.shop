import { ShopShell } from "@/components/ShopShell";

export default function ShopLayout({ children }: LayoutProps<"/">) {
  return <ShopShell>{children}</ShopShell>;
}
