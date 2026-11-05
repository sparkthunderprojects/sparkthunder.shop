import { NextResponse } from "next/server";
import { sessionClient } from "@/lib/db/clients";
import { safeNext } from "@/lib/account/next";

/** Landing point for Google sign-in, email confirmation and password-reset links. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));
  if (code) {
    const db = await sessionClient();
    const { error } = (await db?.auth.exchangeCodeForSession(code)) ?? { error: new Error("no client") };
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  return NextResponse.redirect(new URL("/account/login?error=link", url.origin));
}
