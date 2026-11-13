"use server";

import { getCommerce } from "@/lib/commerce";
import { sendEmail } from "@/lib/email/send";
import { getStore } from "@/lib/store";
import { rateLimit, LIMITS } from "@/lib/ratelimit";
import { log } from "@/lib/log";
import { HELP_TOPICS } from "@/lib/help";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** A shopper's message from the Help Center goes to the store's support address, with their email as the reply-to. */
export async function sendHelpMessageAction(form: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    if (String(form.get("website") ?? "")) return { ok: true }; // hidden field: bots fill it, people never see it
    if (!(await rateLimit("contact", LIMITS.contact)).ok) return { ok: false, error: "You have sent several messages recently. Please wait a while before sending another." };
    const name = String(form.get("name") ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
    const email = String(form.get("email") ?? "").trim().slice(0, 120);
    const order = String(form.get("order") ?? "").replace(/[^A-Za-z0-9 #-]/g, "").trim().slice(0, 30);
    const topicRaw = String(form.get("topic") ?? "");
    const topic = (HELP_TOPICS as readonly string[]).includes(topicRaw) ? topicRaw : "Something else";
    const message = String(form.get("message") ?? "").trim().slice(0, 3000);
    if (name.length < 2) return { ok: false, error: "Please tell us your name." };
    if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: "Please enter a valid email address so we can reply." };
    if (message.length < 10) return { ok: false, error: "Please tell us a little more (at least 10 characters)." };
    const to = (await getCommerce()).supportEmail;
    if (!to) return { ok: false, error: "Messages are not set up for this shop yet." };
    const store = await getStore();
    const subject = `[${store.name}] ${topic}${order ? ` (order ${order})` : ""} from ${name}`;
    const text = `From: ${name} <${email}>\nTopic: ${topic}\nOrder: ${order || "not given"}\n\n${message}`;
    const html = `<div style="font-family:Arial,sans-serif;line-height:1.5"><p><b>From:</b> ${esc(name)} &lt;${esc(email)}&gt;<br><b>Topic:</b> ${esc(topic)}<br><b>Order:</b> ${esc(order || "not given")}</p><p>${esc(message).replace(/\n/g, "<br>")}</p><p style="color:#666">Reply to this email to answer the customer.</p></div>`;
    const r = await sendEmail({ to, subject, html, text, replyTo: email });
    if (!r.ok) { await log.warn("help.message_failed", r.error, { topic }); return { ok: false, error: "We could not send your message. Please try again, or email us directly." }; }
    return { ok: true };
  } catch { return { ok: false, error: "Something went wrong. Please try again." }; }
}
