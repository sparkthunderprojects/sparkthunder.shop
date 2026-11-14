import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { ResetForm } from "@/components/ResetForm";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Choose a new password"), robots: { index: false, follow: false } };
}

export default async function ResetPage() {
  const { t } = await getT();
  return (
    <div className="pt-12">
      <h1 className="display text-[clamp(2rem,4.2vw,3.25rem)]">{t("Choose a new password")}</h1>
      <ResetForm />
    </div>
  );
}
