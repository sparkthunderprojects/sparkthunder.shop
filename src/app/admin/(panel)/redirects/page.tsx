import { requireAdmin } from "@/lib/admin/auth";
import { listRedirects } from "@/lib/admin/repo";
import { RedirectManager } from "./RedirectManager";

export const metadata = { title: "Redirects" };

export default async function RedirectsPage() {
  const { db } = await requireAdmin("catalogue");
  return <RedirectManager initial={await listRedirects(db)} />;
}
