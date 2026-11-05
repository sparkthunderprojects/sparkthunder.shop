import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AuthForm } from "@/components/AuthForm";
import { safeNext } from "@/lib/account/next";
import { sessionClient } from "@/lib/db/clients";
import { hasSupabase } from "@/lib/db/env";

export const metadata: Metadata = { title: "Sign in to your Sparkthunder ID", robots: { index: false, follow: true }, alternates: { canonical: "/account/login" } };

export default async function LoginPage({ searchParams }: PageProps<"/account/login">) {
  await connection();
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : null);
  if (hasSupabase) {
    const db = await sessionClient();
    const { data } = (await db?.auth.getUser()) ?? { data: { user: null } };
    if (data.user) redirect(next);
  }
  return (
    <div className="pt-12">
      <h1 className="display text-[clamp(2rem,4.2vw,3.25rem)]">Your Sparkthunder ID</h1>
      <p className="prose-lore mt-4 text-muted">One account for the whole Sparkthunder universe. Sign in to see your orders and favourites, and use the same login on our other sites.</p>
      <AuthForm next={next} configured={hasSupabase} linkError={sp.error === "link"} />
    </div>
  );
}
