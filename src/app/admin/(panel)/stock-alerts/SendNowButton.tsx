"use client";
import { useRouter } from "next/navigation";
import { sendRestockEmailsAction } from "../../alert-actions";
import { useAction } from "../../ui";

export function SendNowButton() {
  const router = useRouter();
  const { pending, run, toast } = useAction();
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
      <button className="adm-btn adm-pri" disabled={pending} onClick={() => run(sendRestockEmailsAction, "Emails sent", () => router.refresh())}>{pending ? "Sending..." : "Send back-in-stock emails now"}</button>
      {toast}
    </div>
  );
}
