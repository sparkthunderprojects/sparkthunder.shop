import { requireAdmin } from "@/lib/admin/auth";
import { currentStoreId, DEFAULT_STORE_ID } from "@/lib/db/stores";
import { normaliseTheme, type ThemeLayout } from "@/lib/theme-config";
import { ThemeForm } from "./ThemeForm";

export const metadata = { title: "Theme and layout" };

export default async function ThemePage() {
  const { db } = await requireAdmin("settings");
  const [{ data }, id] = await Promise.all([db.from("settings").select("value").eq("key", "theme").maybeSingle(), currentStoreId()]);
  const theme = normaliseTheme((data as { value?: Partial<ThemeLayout> } | null)?.value);
  return <ThemeForm initial={theme} original={id === DEFAULT_STORE_ID} />;
}
