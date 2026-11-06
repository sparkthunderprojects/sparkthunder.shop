import { fillForRequest } from "@/lib/site-info";

/** Transactional email through Resend's HTTP API. Never throws: callers record the outcome. */
export async function sendEmail(msg: { to: string; subject: string; html: string; text: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return { ok: false, error: "Email is not configured (set RESEND_API_KEY and EMAIL_FROM)." };
  try {
    // The templates carry store stand-ins (brand, domain, colours); fill them for the store this request belongs to.
    msg = await fillForRequest(msg);
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [msg.to], subject: msg.subject, html: msg.html, text: msg.text }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { ok: false, error: `Email provider said ${res.status}: ${(await res.text()).slice(0, 200)}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Email failed." };
  }
}
