import { localePath } from "@/lib/i18n/config";
import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { serviceClient } from "@/lib/db/clients";
import { currentStoreId } from "@/lib/db/stores";
import { unsubscribe, verifyUnsubscribe } from "@/lib/lifecycle";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Unsubscribe"), robots: { index: false, follow: false } };
}

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ e?: string; t?: string; done?: string }> }) {
  await connection();
  const { t, locale } = await getT();
  const { e = "", t: tk = "", done } = await searchParams;
  const valid = Boolean(e && tk && verifyUnsubscribe(await currentStoreId(), e, tk));
  async function confirm() {
    "use server";
    const id = await currentStoreId();
    if (!verifyUnsubscribe(id, e, tk)) return;
    const db = serviceClient(id);
    if (db) await unsubscribe(db, e);
    redirect(localePath(`/unsubscribe?e=${encodeURIComponent(e)}&t=${encodeURIComponent(tk)}&done=1`, locale) as never);
  }
  return (
    <div className="mx-auto max-w-xl pt-16">
      <h1 className="display text-4xl">{t("Unsubscribe")}</h1>
      {!valid ? <p className="mt-4 text-muted">{t("This unsubscribe link is not valid. If you want to stop our emails, reply to any of them and we will remove you.")}</p>
        : done ? <p className="mt-4">{t("Done.")} <b>{e}</b> {t("will not get basket reminders or review requests from us any more. Order and shipping emails still come to you, because they are about something you bought.")}</p>
        : (
          <form action={confirm}>
            <p className="mt-4">{t("Stop basket reminders and review requests to")} <b>{e}</b>?</p>
            <button className="btn mt-6">{t("Yes, unsubscribe me")}</button>
          </form>
        )}
    </div>
  );
}
