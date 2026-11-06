import { siteOrigin } from "@/lib/site-info";

/** Tells Bing, Yandex and other IndexNow engines that URLs changed, so updates are crawled in minutes. Best effort. */
export async function pingIndexNow(paths: string[]) {
  const key = process.env.INDEXNOW_KEY;
  if (!key || paths.length === 0) return { sent: false as const };
  try {
    const origin = await siteOrigin();
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host: new URL(origin).host, key, keyLocation: `${origin}/indexnow-key.txt`, urlList: paths.map((p) => `${origin}${p}`) }),
      signal: AbortSignal.timeout(5000),
    });
    return { sent: true as const, status: res.status };
  } catch {
    return { sent: false as const };
  }
}
