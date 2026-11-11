import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { serviceClient } from "@/lib/db/clients";
import { currentStoreId } from "@/lib/db/stores";
import { unsubscribe, verifyUnsubscribe } from "@/lib/lifecycle";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false, follow: false } };

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ e?: string; t?: string; done?: string }> }) {
  await connection();
  const { e = "", t = "", done } = await searchParams;
  const valid = Boolean(e && t && verifyUnsubscribe(await currentStoreId(), e, t));
  async function confirm() {
    "use server";
    const id = await currentStoreId();
    if (!verifyUnsubscribe(id, e, t)) return;
    const db = serviceClient(id);
    if (db) await unsubscribe(db, e);
    redirect(`/unsubscribe?e=${encodeURIComponent(e)}&t=${encodeURIComponent(t)}&done=1`);
  }
  return (
    <div className="mx-auto max-w-xl pt-16">
      <h1 className="display text-4xl">Unsubscribe</h1>
      {!valid ? <p className="mt-4 text-muted">This unsubscribe link is not valid. If you want to stop our emails, reply to any of them and we will remove you.</p>
        : done ? <p className="mt-4">Done. <b>{e}</b> will not get basket reminders or review requests from us any more. Order and shipping emails still come to you, because they are about something you bought.</p>
        : (
          <form action={confirm}>
            <p className="mt-4">Stop basket reminders and review requests to <b>{e}</b>?</p>
            <button className="btn mt-6">Yes, unsubscribe me</button>
          </form>
        )}
    </div>
  );
}
