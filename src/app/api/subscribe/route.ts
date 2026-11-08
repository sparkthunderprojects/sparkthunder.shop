import { publicClient } from "@/lib/db/clients";
import { LIMITS, rateLimit, wait } from "@/lib/ratelimit";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(req: Request) {
  const db = publicClient(); // scoped to the store this request is for, so each store keeps its own list
  if (!db) return Response.json({ error: "Sign-ups aren\u2019t switched on yet. Please check back soon." }, { status: 503 });

  const rl = await rateLimit("newsletter", LIMITS.newsletter);
  if (!rl.ok) return Response.json({ error: `Too many sign-ups from this connection. Please wait ${wait(rl)} and try again.` }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });

  let email = "";
  try { email = String((await req.json()).email ?? "").trim().toLowerCase(); } catch {}
  if (!EMAIL.test(email) || email.length > 254) return Response.json({ error: "Please enter a valid email address." }, { status: 400 });

  const { error } = await db.from("subscribers").insert({ email });
  // 23505 = already subscribed; treat as success so we never reveal who is on the list.
  if (error && error.code !== "23505") return Response.json({ error: "Couldn\u2019t sign you up right now. Please try again." }, { status: 500 });
  return Response.json({ ok: true });
}
