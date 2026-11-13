import { requireAdmin } from "@/lib/admin/auth";
import { getLanguages } from "@/lib/i18n/server";
import { LanguagesForm } from "./LanguagesForm";

export const metadata = { title: "Languages" };

export default async function LanguagesPage() {
  await requireAdmin("settings");
  return <LanguagesForm enabled={await getLanguages()} />;
}
