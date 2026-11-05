import { SITE } from "@/lib/site";

/** Tells Bing, Yandex and other IndexNow engines that URLs changed, so updates are crawled in minutes. Best effort. */
export async function pingIndexNow(paths: string[]) {
  const key = process.env.INDEXNOW_KEY;
  if (!key || paths.length === 0) return { sent: false as const };
  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host: new URL(SITE.url).host, key, keyLocation: `${SITE.url}/indexnow-key.txt`, urlList: paths.map((p) => `${SITE.url}${p}`) }),
      signal: AbortSignal.timeout(5000),
    });
    return { sent: true as const, status: res.status };
  } catch {
    return { sent: false as const };
  }
}
