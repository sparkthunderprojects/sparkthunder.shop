import { requireAdmin } from "@/lib/admin/auth";
import { listMedia } from "@/lib/admin/repo";
import { DEFAULT_STORE, normaliseStore, type StoreSettings } from "@/lib/store-config";
import { StoreForm } from "./StoreForm";

export const metadata = { title: "Brand and design" };

export default async function StorePage() {
  const { db } = await requireAdmin();
  const [{ data }, media] = await Promise.all([db.from("settings").select("value").eq("key", "store").maybeSingle(), listMedia(db)]);
  const initial = normaliseStore((data as { value?: Partial<StoreSettings> } | null)?.value);
  return <StoreForm initial={initial} defaults={DEFAULT_STORE} media={media} />;
}
