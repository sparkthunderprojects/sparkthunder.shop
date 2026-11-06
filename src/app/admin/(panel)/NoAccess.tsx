"use client";
import { useRouter } from "next/navigation";
import { switchStoreAction } from "../stores-actions";

export function NoAccess({ firstId }: { firstId: string }) {
  const router = useRouter();
  return (
    <div className="adm-card"><h1>You do not have access to this store</h1>
      <p>Choose one of your stores from the switcher.</p>
      {firstId ? <button type="button" className="adm-btn" onClick={async () => { await switchStoreAction(firstId); router.refresh(); }}>Go to my store</button> : null}
    </div>
  );
}
