import { createClient } from "@supabase/supabase-js";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return Response.json({ error: "Sign-ups aren’t switched on yet. Please check back soon." }, { status: 503 });

  let email = "";
  try { email = String((await req.json()).email ?? "").trim().toLowerCase(); } catch {}
  if (!EMAIL.test(email) || email.length > 254) return Response.json({ error: "Please enter a valid email address." }, { status: 400 });

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await supabase.from("subscribers").insert({ email });
  // 23505 = already subscribed; treat as success so we never reveal who is on the list.
  if (error && error.code !== "23505") return Response.json({ error: "Couldn’t sign you up right now. Please try again." }, { status: 500 });
  return Response.json({ ok: true });
}
