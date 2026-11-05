"use client";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/db/browser";

export function SignOutButton() {
  const router = useRouter();
  return <button className="btn" onClick={async () => { await browserClient()?.auth.signOut(); router.push("/"); router.refresh(); }}>Sign out</button>;
}
