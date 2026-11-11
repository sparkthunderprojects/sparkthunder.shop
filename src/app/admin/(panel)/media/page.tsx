import { requireAdmin } from "@/lib/admin/auth";
import { listMedia } from "@/lib/admin/repo";
import { MediaLibrary } from "./MediaLibrary";

export const metadata = { title: "Media library" };

export default async function MediaPage() {
  const { db } = await requireAdmin("catalogue");
  return <MediaLibrary initial={await listMedia(db)} />;
}
