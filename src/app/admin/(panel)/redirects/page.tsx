import { requireAdmin } from "@/lib/admin/auth";
import { listRedirects } from "@/lib/admin/repo";
import { checkRedirects } from "@/lib/seo/redirects-check";
import { livePaths } from "@/lib/seo/live-paths";
import { RedirectManager } from "./RedirectManager";

export const metadata = { title: "Redirects" };

export default async function RedirectsPage() {
  const { db } = await requireAdmin("catalogue");
  const rows = await listRedirects(db);
  return <RedirectManager initial={rows} issues={checkRedirects(rows, await livePaths())} />;
}
