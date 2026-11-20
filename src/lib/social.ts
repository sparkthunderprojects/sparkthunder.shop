/** Social media planning for a store: pure helpers (caption drafting, tracked links, limits, best times) and the saved shape. */

export const PLATFORMS = ["instagram", "facebook", "tiktok", "x", "pinterest", "youtube"] as const;
export type Platform = (typeof PLATFORMS)[number];
export const PLATFORM_INFO: Record<Platform, { label: string; limit: number; colour: string; tags: number; linkInText: boolean }> = {
  instagram: { label: "Instagram", limit: 2200, colour: "#e1306c", tags: 5, linkInText: false },
  facebook: { label: "Facebook", limit: 5000, colour: "#1877f2", tags: 2, linkInText: true },
  tiktok: { label: "TikTok", limit: 2200, colour: "#111111", tags: 4, linkInText: false },
  x: { label: "X", limit: 280, colour: "#000000", tags: 2, linkInText: true },
  pinterest: { label: "Pinterest", limit: 500, colour: "#e60023", tags: 3, linkInText: false },
  youtube: { label: "YouTube", limit: 5000, colour: "#ff0000", tags: 3, linkInText: true },
};
export const isPlatform = (v: unknown): v is Platform => typeof v === "string" && (PLATFORMS as readonly string[]).includes(v);

export type SocialAccount = { id: string; platform: Platform; handle: string };
export type PostMetrics = { reach: number; likes: number; comments: number; shares: number; clicks: number };
export type PostStatus = "draft" | "scheduled" | "posted";
export type SocialPost = {
  id: string; platforms: Platform[]; text: string; productSlug: string; image: string;
  /** ISO time it should go out (scheduled) or did go out (posted). Empty for drafts. */
  at: string; status: PostStatus; metrics?: PostMetrics;
};
export type SocialData = { accounts: SocialAccount[]; posts: SocialPost[] };
export const EMPTY_SOCIAL: SocialData = { accounts: [], posts: [] };

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v) : 0);
const str = (v: unknown, max = 5000) => (typeof v === "string" ? v.slice(0, max) : "");
const iso = (v: unknown) => (typeof v === "string" && Number.isFinite(Date.parse(v)) ? new Date(v).toISOString() : "");

/** Clean whatever was saved (or submitted) into a safe SocialData. */
export function normaliseSocial(raw: unknown): SocialData {
  const r = (raw && typeof raw === "object" ? raw : {}) as { accounts?: unknown; posts?: unknown };
  const accounts = (Array.isArray(r.accounts) ? r.accounts : []).flatMap((a: Record<string, unknown>) =>
    a && isPlatform(a.platform) && str(a.handle, 80).trim() ? [{ id: str(a.id, 40) || `a-${a.platform}`, platform: a.platform, handle: str(a.handle, 80).trim().replace(/^@+/, "") }] : []);
  const posts = (Array.isArray(r.posts) ? r.posts : []).flatMap((p: Record<string, unknown>) => {
    if (!p || typeof p !== "object") return [];
    const platforms = (Array.isArray(p.platforms) ? p.platforms : []).filter(isPlatform);
    const status: PostStatus = p.status === "scheduled" || p.status === "posted" ? p.status : "draft";
    const at = iso(p.at), m = p.metrics as Record<string, unknown> | undefined;
    if (!str(p.id, 40) || !platforms.length) return [];
    return [{ id: str(p.id, 40), platforms, text: str(p.text), productSlug: str(p.productSlug, 120), image: str(p.image, 500), at: status === "draft" ? "" : at, status: status !== "draft" && !at ? "draft" as const : status,
      ...(m ? { metrics: { reach: num(m.reach), likes: num(m.likes), comments: num(m.comments), shares: num(m.shares), clicks: num(m.clicks) } } : {}) }];
  });
  return { accounts, posts: posts.slice(0, 500) };
}

/** A product link tagged so the visit shows up in analytics as coming from this platform and campaign. */
export function trackedLink(origin: string, path: string, platform: Platform, campaign: string): string {
  const u = new URL(path.startsWith("/") ? path : `/${path}`, origin.replace(/\/$/, "") + "/");
  u.searchParams.set("utm_source", platform); u.searchParams.set("utm_medium", "social"); u.searchParams.set("utm_campaign", campaign.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "post");
  return u.toString();
}

const tag = (s: string) => "#" + s.replace(/[^A-Za-z0-9]+/g, "");
export type ProductBrief = { name: string; blurb: string; pricePence: number; franchise: string };

/** A first draft for one platform, in that platform's style. Always short enough for its limit. */
export function draftCaption(p: ProductBrief, platform: Platform, link: string, brand: string, price: string): string {
  const tags = [tag(brand), ...(p.franchise ? [tag(p.franchise)] : []), "#newdrop", "#merch", "#shopsmall"].slice(0, PLATFORM_INFO[platform].tags).join(" ");
  const blurb = p.blurb.trim();
  let out: string;
  switch (platform) {
    case "x": out = `${p.name} is here. ${price}\n${link}\n${tags}`; break;
    case "instagram": out = `New: ${p.name} ✨\n${blurb}\n\nFrom ${price}. Link in bio.\n\n${tags}`; break;
    case "tiktok": out = `${p.name} just landed. ${blurb}\nLink in bio.\n${tags}`; break;
    case "pinterest": out = `${p.name}. ${blurb} ${price}\n${tags}`; break;
    case "youtube": out = `${p.name}\n${blurb}\n\nShop: ${link}\n\n${tags}`; break;
    default: out = `Just in: ${p.name}.\n${blurb}\n\nFrom ${price}. Shop now: ${link}\n\n${tags}`;
  }
  const max = PLATFORM_INFO[platform].limit;
  return out.length <= max ? out : out.slice(0, max - 1).trimEnd() + "…";
}

/** Which of the chosen platforms the text is too long for. */
export const overLimit = (text: string, platforms: Platform[]) => platforms.filter((p) => text.length > PLATFORM_INFO[p].limit);

/** The best slots to post: the weekday/hour pairs (UTC) when this store gets the most orders. `grid` is Monday-first, 24 hours. */
export function bestTimes(grid: number[][], n = 3): { day: number; hour: number; orders: number }[] {
  const all = grid.flatMap((row, day) => row.map((orders, hour) => ({ day, hour, orders })));
  return all.filter((s) => s.orders > 0).sort((a, b) => b.orders - a.orders || a.day - b.day || a.hour - b.hour).slice(0, n);
}

/** Link that opens the platform's own share screen, where one exists. */
export function shareUrl(platform: Platform, text: string, link: string, image: string): string | null {
  const q = encodeURIComponent;
  if (platform === "x") return `https://twitter.com/intent/tweet?text=${q(text)}`;
  if (platform === "facebook") return `https://www.facebook.com/sharer/sharer.php?u=${q(link)}`;
  if (platform === "pinterest") return `https://www.pinterest.com/pin/create/button/?url=${q(link)}&description=${q(text)}${image ? `&media=${q(image)}` : ""}`;
  return null;
}

export const sumMetrics = (posts: SocialPost[]): PostMetrics => posts.reduce((t, p) => ({ reach: t.reach + (p.metrics?.reach ?? 0), likes: t.likes + (p.metrics?.likes ?? 0), comments: t.comments + (p.metrics?.comments ?? 0), shares: t.shares + (p.metrics?.shares ?? 0), clicks: t.clicks + (p.metrics?.clicks ?? 0) }), { reach: 0, likes: 0, comments: 0, shares: 0, clicks: 0 });
export const engagementRate = (m: PostMetrics) => (m.reach ? ((m.likes + m.comments + m.shares) / m.reach) * 100 : 0);

/** Captions hold `{link}` where the tracked product link goes; each platform gets its own tagged link. */
export const fillLink = (text: string, link: string) => text.replaceAll("{link}", link);
export const profileUrl = (a: SocialAccount) => ({ instagram: `https://instagram.com/${a.handle}`, facebook: `https://facebook.com/${a.handle}`, tiktok: `https://tiktok.com/@${a.handle}`, x: `https://x.com/${a.handle}`, pinterest: `https://pinterest.com/${a.handle}`, youtube: `https://youtube.com/@${a.handle}` })[a.platform];
