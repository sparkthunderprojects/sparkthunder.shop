import { getCommerce } from "@/lib/commerce";
import { sendEmail } from "@/lib/email/send";
import { log } from "@/lib/log";
import { rateLimit } from "@/lib/ratelimit";
import { currentStoreId } from "@/lib/db/stores";

/**
 * Tell the store owner something needs attention. Goes to the store's support email (Shipping and payments) and, if the host
 * sets ALERT_WEBHOOK_URL (a Slack or Discord style incoming webhook), there too. The same alert (same `key`) is sent at most
 * once an hour, so a retry loop cannot flood anyone. Never throws.
 */
export async function notifyOwner(subject: string, body: string, key: string): Promise<void> {
  try {
    const store = await currentStoreId().catch(() => "unknown");
    if (!(await rateLimit("alert", { limit: 1, windowSec: 3600 }, `${store}:${key}`)).ok) return;
    const to = (await getCommerce()).supportEmail;
    let delivered = false;
    if (to) {
      const r = await sendEmail({ to, subject: `[${store}] ${subject}`, html: `<p style="font-family:Arial,sans-serif">${body.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!).replace(/\n/g, "<br>")}</p><p style="font-family:Arial,sans-serif;color:#666">Open the admin and check the Health page.</p>`, text: `${body}\n\nOpen the admin and check the Health page.` });
      delivered = r.ok;
      if (!r.ok) await log.warn("alert.email_failed", r.error, { subject }, { record: false });
    }
    const hook = process.env.ALERT_WEBHOOK_URL;
    if (hook) {
      try { const r = await fetch(hook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: `[${store}] ${subject}\n${body}` }), signal: AbortSignal.timeout(5000) }); delivered = delivered || r.ok; } catch { /* logged below */ }
    }
    if (!delivered) await log.warn("alert.not_delivered", "No alert could be sent: set a support email under Shipping and payments (or ALERT_WEBHOOK_URL).", { subject });
  } catch { /* alerts must never break the work that raised them */ }
}
