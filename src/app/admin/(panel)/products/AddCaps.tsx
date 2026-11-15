"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { addSampleCapsAction } from "@/app/admin/caps-actions";

/** Button on the Products page: fills the store with twelve sample caps so a collection page can be previewed. */
export function AddCaps() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <button type="button" className="adm-btn" disabled={busy} data-add-caps onClick={async () => {
        setBusy(true); setMsg("");
        const r = await addSampleCapsAction();
        setBusy(false);
        setMsg(r.ok ? (r.added ? `Added ${r.added} caps.` : "The caps are already there.") : r.error);
        if (r.ok) router.refresh();
      }}>{busy ? "Adding..." : "Add 12 sample caps"}</button>
      {msg ? <span role="status" style={{ fontSize: 12 }}>{msg}</span> : null}
    </span>
  );
}
