import { fillForRequest } from "@/lib/site-info";
import { log } from "@/lib/log";
import { currentStoreId } from "@/lib/db/stores";
import { getStoreSecrets } from "@/lib/secrets";

/** Transactional email through Resend's HTTP API. Never throws: callers record the outcome. */
export async function sendEmail(msg: { to: string; subject: string; html: string; text: string; replyTo?: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  const secrets = await getStoreSecrets(await currentStoreId());
  const key = secrets.resendKey, from = secrets.emailFrom;
  if (!key || !from) return { ok: false, error: "Email is not set up for this store (add a Resend key and from-address under Payments and email)." };
  try {
    // The templates carry store stand-ins (brand, domain, colours); fill them for the store this request belongs to.
    msg = await fillForRequest(msg);
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [msg.to], subject: msg.subject, html: msg.html, text: msg.text, ...(msg.replyTo ? { reply_to: msg.replyTo } : {}) }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) { const error = `Email provider said ${res.status}: ${(await res.text()).slice(0, 200)}`; await log.warn("email.failed", error, { subject: msg.subject }); return { ok: false, error }; }
    return { ok: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Email failed.";
    await log.warn("email.failed", error, { subject: msg.subject });
    return { ok: false, error };
  }
}
