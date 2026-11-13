import { ShopShell } from "@/components/ShopShell";
import { requireLocale } from "@/lib/i18n/server";

export default async function ShopLayout({ children }: LayoutProps<"/">) {
  await requireLocale(); // a language this store has not switched on is a 404
  return <ShopShell>{children}</ShopShell>;
}
