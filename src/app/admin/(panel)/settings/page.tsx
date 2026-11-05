import { requireAdmin } from "@/lib/admin/auth";
import { readSettings } from "@/lib/admin/repo";
import { SettingsForm } from "./SettingsForm";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { db } = await requireAdmin();
  return <SettingsForm initial={await readSettings(db)} indexNow={Boolean(process.env.INDEXNOW_KEY)} />;
}
