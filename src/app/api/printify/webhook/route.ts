import { log } from "@/lib/log";
import { serviceClient } from "@/lib/db/clients";
import { currentStoreId } from "@/lib/db/stores";
import { getStoreSecrets } from "@/lib/secrets";
import { handlePrintifyEvent, verifySignature } from "@/lib/printify/webhook";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const storeId = await currentStoreId();
  const secret = (await getStoreSecrets(storeId)).printifyWebhookSecret;
  const raw = await req.text();
  if (!secret) return new Response("Webhook is not configured", { status: 400 });
  if (!verifySignature(raw, req.headers.get("x-pfy-signature"), secret)) { await log.warn("printify.bad_signature", "A Printify webhook with an invalid signature was rejected"); return new Response("Invalid signature", { status: 400 }); }
  const db = serviceClient(storeId);
  if (!db) return new Response("Database not configured", { status: 500 });
  try { await handlePrintifyEvent(db, JSON.parse(raw)); }
  catch (e) { await log.error("printify.webhook_failed", "Could not apply a Printify event; Printify will retry", { error: e }, { storeId }); return new Response("Failed", { status: 500 }); }
  return new Response("ok");
}
