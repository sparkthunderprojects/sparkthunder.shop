import { timingSafeEqual } from "node:crypto";
import { log } from "@/lib/log";
import { serviceClient } from "@/lib/db/clients";
import { currentStoreId } from "@/lib/db/stores";
import { sendEmail } from "@/lib/email/send";
import { runLifecycle } from "@/lib/lifecycle";

export const runtime = "nodejs";
export const maxDuration = 60;

const same = (a: string, b: string) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };

/**
 * Scheduled emails for the store this host belongs to. Called by a scheduler (see .github/workflows/lifecycle.yml) with
 * `Authorization: Bearer <CRON_SECRET>`. Does nothing without that secret set on the host, so it can never be triggered by a stranger.
 */
async function handle(req: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!secret || !given || !same(secret, given)) return new Response("Unauthorised", { status: 401 });
  const storeId = await currentStoreId();
  const db = serviceClient(storeId);
  if (!db) return new Response("Database not configured", { status: 500 });
  try {
    const result = await runLifecycle(db, { storeId, send: sendEmail });
    if (result.reminders || result.reviewRequests) await log.info("lifecycle.sent", `Sent ${result.reminders} basket reminders and ${result.reviewRequests} review requests`, result as never, { storeId });
    return Response.json(result);
  } catch (e) {
    await log.error("lifecycle.failed", "The scheduled emails failed", { error: e }, { storeId });
    return new Response("Failed", { status: 500 });
  }
}
export const POST = handle;
export const GET = handle;
