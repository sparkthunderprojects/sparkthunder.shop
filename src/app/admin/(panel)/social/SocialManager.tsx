"use client";
import { useMemo, useState } from "react";
import { saveSocialAction } from "../../social-actions";
import { Field, useAction } from "../../ui";
import { PLATFORMS, PLATFORM_INFO, draftCaption, engagementRate, fillLink, overLimit, profileUrl, shareUrl, sumMetrics, trackedLink,
  type Platform, type PostMetrics, type SocialData, type SocialPost } from "@/lib/social";
import { formatPrice } from "@/lib/site";

export type ProductOpt = { slug: string; name: string; blurb: string; pricePence: number; image: string; franchise: string };
type Tab = "overview" | "calendar" | "results" | "accounts";
const TABS: [Tab, string][] = [["overview", "Overview"], ["calendar", "Calendar"], ["results", "Results"], ["accounts", "Accounts"]];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const STATUS_COLOUR = { draft: "#8b8c95", scheduled: "#6b5cff", posted: "#12805c" } as const;
const pad = (n: number) => String(n).padStart(2, "0");
const when = (iso: string) => (iso ? `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC` : "No date");
const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 12) : String(Math.random()).slice(2, 14));

export function SocialManager({ initial, products, origin, brand, best, nowIso }: { initial: SocialData; products: ProductOpt[]; origin: string; brand: string; best: { day: number; hour: number; orders: number }[]; nowIso: string }) {
  const [data, setData] = useState(initial);
  const [tab, setTab] = useState<Tab>("overview");
  const [edit, setEdit] = useState<SocialPost | null>(null);
  const [month, setMonth] = useState(nowIso.slice(0, 7));
  const { pending, run, toast } = useAction();
  const save = (next: SocialData, text = "Saved") => { setData(next); run(() => saveSocialAction(next), text, (r) => setData(r.data)); };
  const posts = useMemo(() => [...data.posts].sort((a, b) => (a.at || "9").localeCompare(b.at || "9")), [data.posts]);
  const upcoming = posts.filter((p) => p.status === "scheduled" && p.at >= nowIso);
  const drafts = posts.filter((p) => p.status === "draft");
  const posted = posts.filter((p) => p.status === "posted");
  const product = (slug: string) => products.find((p) => p.slug === slug);

  /** The next time that weekday (Mon=0) and UTC hour comes round after now. */
  const nextSlot = (day: number, hour: number) => { const n = new Date(nowIso); const add = (day - ((n.getUTCDay() + 6) % 7) + 7) % 7; const d = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() + add, hour)); if (d <= n) d.setUTCDate(d.getUTCDate() + 7); return d.toISOString(); };
  const blank = (at = ""): SocialPost => ({ id: newId(), platforms: data.accounts.length ? [...new Set(data.accounts.map((a) => a.platform))].slice(0, 3) : ["instagram"], text: "", productSlug: "", image: "", at, status: at ? "scheduled" : "draft" });

  return (
    <>
      <div className="adm-tabs" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{TABS.map(([k, l]) => <button key={k} type="button" className="adm-chip" aria-pressed={tab === k} onClick={() => setTab(k)}>{l}</button>)}</div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>{toast}<button type="button" className="adm-btn adm-bolt" onClick={() => setEdit(blank())}>Create post</button></div>
      </div>

      {tab === "overview" ? (
        <>
          <div className="adm-grid adm-g4" style={{ marginBottom: 14 }}>
            {[[upcoming.length, "Scheduled"], [drafts.length, "Drafts"], [posted.length, "Posted"], [data.accounts.length, "Accounts"]].map(([n, l]) => <div key={l} className="adm-card" style={{ margin: 0 }}><div className="adm-stat">{n}</div><div className="adm-stat-l">{l}</div></div>)}
          </div>
          <div className="adm-grid adm-g2">
            <section className="adm-card"><h2>Coming up</h2>
              {upcoming.length === 0 ? <p className="adm-hint">Nothing scheduled. Create a post and pick a time.</p> : upcoming.slice(0, 6).map((p) => <PostRow key={p.id} p={p} product={product(p.productSlug)} onOpen={() => setEdit(p)} />)}</section>
            <section className="adm-card"><h2>Best times to post</h2>
              {best.length === 0 ? <p className="adm-hint">Once this store has orders, the hours when customers buy most show here.</p> : <>
                <p className="adm-hint" style={{ marginTop: 0 }}>Taken from when this store really gets orders (last 90 days, UTC). Click one to plan a post for it.</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{best.map((b) => <button key={`${b.day}-${b.hour}`} type="button" className="adm-btn" onClick={() => setEdit(blank(nextSlot(b.day, b.hour)))}>{DAYS[b.day]} {pad(b.hour)}:00 <span className="adm-hint">{b.orders} orders</span></button>)}</div></>}
              <h2 style={{ marginTop: 20 }}>Drafts</h2>
              {drafts.length === 0 ? <p className="adm-hint">No drafts.</p> : drafts.slice(0, 5).map((p) => <PostRow key={p.id} p={p} product={product(p.productSlug)} onOpen={() => setEdit(p)} />)}</section>
          </div>
        </>
      ) : null}

      {tab === "calendar" ? <Calendar month={month} setMonth={setMonth} posts={posts} onOpen={setEdit} onNew={(day) => setEdit(blank(`${day}T12:00:00.000Z`))} /> : null}

      {tab === "results" ? <Results posted={posted} onSave={(p) => save({ ...data, posts: data.posts.map((x) => (x.id === p.id ? p : x)) }, "Results saved")} product={product} pending={pending} /> : null}

      {tab === "accounts" ? <Accounts data={data} onChange={(accounts) => save({ ...data, accounts }, "Accounts saved")} /> : null}

      {edit ? <Composer key={edit.id} post={edit} exists={data.posts.some((p) => p.id === edit.id)} products={products} origin={origin} brand={brand} best={best} nextSlot={nextSlot} pending={pending}
        onClose={() => setEdit(null)}
        onSave={(p, text) => { save({ ...data, posts: data.posts.some((x) => x.id === p.id) ? data.posts.map((x) => (x.id === p.id ? p : x)) : [...data.posts, p] }, text); setEdit(null); }}
        onDelete={(id) => { save({ ...data, posts: data.posts.filter((x) => x.id !== id) }, "Post deleted"); setEdit(null); }} /> : null}
    </>
  );
}

function PostRow({ p, product, onOpen }: { p: SocialPost; product?: ProductOpt; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} style={{ display: "flex", gap: 10, width: "100%", textAlign: "left", background: "none", border: 0, borderBottom: "1px solid #eef0f3", padding: "8px 0", cursor: "pointer", alignItems: "center" }}>
      {product?.image ? <img className="adm-thumb" src={product.image} alt="" /> : <span className="adm-thumb" />}
      <span style={{ flex: 1, minWidth: 0 }}><b style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.text.split("\n")[0] || "(no text yet)"}</b>
        <span className="adm-hint">{when(p.at)} · {p.platforms.map((x) => PLATFORM_INFO[x].label).join(", ")}</span></span>
      <span className="adm-badge" style={{ background: STATUS_COLOUR[p.status], color: "#fff" }}>{p.status}</span>
    </button>
  );
}

function Calendar({ month, setMonth, posts, onOpen, onNew }: { month: string; setMonth: (m: string) => void; posts: SocialPost[]; onOpen: (p: SocialPost) => void; onNew: (day: string) => void }) {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1)), lead = (first.getUTCDay() + 6) % 7, count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const shift = (n: number) => { const d = new Date(Date.UTC(y, m - 1 + n, 1)); setMonth(`${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`); };
  const cells = Array.from({ length: Math.ceil((lead + count) / 7) * 7 }, (_, i) => i - lead + 1);
  return (
    <section className="adm-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>{first.toLocaleString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })}</h2>
        <div style={{ display: "flex", gap: 6 }}><button type="button" className="adm-btn" onClick={() => shift(-1)} aria-label="Previous month">‹</button><button type="button" className="adm-btn" onClick={() => shift(1)} aria-label="Next month">›</button></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", gap: 4 }}>
        {DAYS.map((d) => <div key={d} className="adm-hint" style={{ textAlign: "center", fontWeight: 700 }}>{d}</div>)}
        {cells.map((n, i) => {
          if (n < 1 || n > count) return <div key={i} style={{ minHeight: 84, background: "#f7f7f8", borderRadius: 8 }} />;
          const day = `${month}-${pad(n)}`, list = posts.filter((p) => p.at.startsWith(day));
          return (
            <div key={i} style={{ minHeight: 84, border: "1px solid var(--a-line)", borderRadius: 8, padding: 4, background: "#fff", display: "flex", flexDirection: "column", gap: 3 }}>
              <button type="button" onClick={() => onNew(day)} aria-label={`New post on ${day}`} style={{ background: "none", border: 0, textAlign: "left", fontSize: 12, fontWeight: 700, cursor: "pointer", color: "#555" }}>{n}</button>
              {list.map((p) => <button key={p.id} type="button" onClick={() => onOpen(p)} title={p.text} style={{ background: STATUS_COLOUR[p.status], color: "#fff", border: 0, borderRadius: 5, fontSize: 11, padding: "2px 5px", textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer" }}>{p.at.slice(11, 16)} {p.text.split("\n")[0] || "Post"}</button>)}
            </div>
          );
        })}
      </div>
      <p className="adm-hint">Click a date to plan a post. Times are UTC.</p>
    </section>
  );
}

function Results({ posted, onSave, product, pending }: { posted: SocialPost[]; onSave: (p: SocialPost) => void; product: (s: string) => ProductOpt | undefined; pending: boolean }) {
  const total = sumMetrics(posted);
  const byPlatform = PLATFORMS.map((pl) => { const list = posted.filter((p) => p.platforms.includes(pl)); const m = sumMetrics(list); return { pl, posts: list.length, m }; }).filter((x) => x.posts);
  return (
    <>
      <div className="adm-grid adm-g4" style={{ marginBottom: 14 }}>
        {[[total.reach.toLocaleString(), "Reach"], [(total.likes + total.comments + total.shares).toLocaleString(), "Likes, comments, shares"], [`${engagementRate(total).toFixed(1)}%`, "Engagement rate"], [total.clicks.toLocaleString(), "Link clicks"]].map(([v, l]) => <div key={l} className="adm-card" style={{ margin: 0 }}><div className="adm-stat">{v}</div><div className="adm-stat-l">{l}</div></div>)}
      </div>
      <section className="adm-card"><h2>By platform</h2>
        {byPlatform.length === 0 ? <p className="adm-hint">Mark a post as posted and add its numbers to see results here.</p> : <table className="adm-table"><thead><tr><th>Platform</th><th>Posts</th><th>Reach</th><th>Engagement</th><th>Clicks</th></tr></thead><tbody>
          {byPlatform.map((x) => <tr key={x.pl}><td><b style={{ color: PLATFORM_INFO[x.pl].colour }}>{PLATFORM_INFO[x.pl].label}</b></td><td>{x.posts}</td><td>{x.m.reach.toLocaleString()}</td><td>{engagementRate(x.m).toFixed(1)}%</td><td>{x.m.clicks}</td></tr>)}</tbody></table>}</section>
      <section className="adm-card"><h2>Posted</h2>
        <p className="adm-hint" style={{ marginTop: 0 }}>Type in the numbers from the platform. Automatic numbers arrive when the platforms are connected.</p>
        {posted.length === 0 ? <p className="adm-hint">No posted posts yet. Open a post and choose &quot;Mark as posted&quot;.</p> : <div style={{ overflowX: "auto" }}><table className="adm-table"><thead><tr><th>Post</th>{(["reach", "likes", "comments", "shares", "clicks"] as const).map((k) => <th key={k}>{k}</th>)}</tr></thead><tbody>
          {posted.map((p) => (
            <tr key={p.id}><td style={{ maxWidth: 260 }}><b style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.text.split("\n")[0] || "Post"}</b><span className="adm-hint">{product(p.productSlug)?.name ?? ""} {when(p.at)}</span></td>
              {(["reach", "likes", "comments", "shares", "clicks"] as const).map((k) => <td key={k}><input className="adm-in" type="number" min={0} style={{ width: 84 }} disabled={pending} defaultValue={p.metrics?.[k] ?? 0}
                onBlur={(e) => { const v = Math.max(0, Math.round(Number(e.target.value) || 0)); if (v !== (p.metrics?.[k] ?? 0)) onSave({ ...p, metrics: { reach: 0, likes: 0, comments: 0, shares: 0, clicks: 0, ...p.metrics, [k]: v } as PostMetrics }); }} aria-label={`${k} for this post`} /></td>)}</tr>
          ))}</tbody></table></div>}</section>
    </>
  );
}

function Accounts({ data, onChange }: { data: SocialData; onChange: (a: SocialData["accounts"]) => void }) {
  const [platform, setPlatform] = useState<Platform>("instagram"), [handle, setHandle] = useState("");
  return (
    <section className="adm-card"><h2>Accounts for this store</h2>
      <p className="adm-hint" style={{ marginTop: 0 }}>Add the profile handles this store posts from. Connecting for automatic posting comes later; for now posts are written and scheduled here, then published with one click.</p>
      {data.accounts.length === 0 ? <p className="adm-hint">No accounts yet.</p> : <table className="adm-table"><tbody>{data.accounts.map((a) => (
        <tr key={a.id}><td><b style={{ color: PLATFORM_INFO[a.platform].colour }}>{PLATFORM_INFO[a.platform].label}</b></td><td><a href={profileUrl(a)} target="_blank" rel="noreferrer">@{a.handle}</a></td>
          <td style={{ textAlign: "right" }}><button type="button" className="adm-btn adm-danger" onClick={() => onChange(data.accounts.filter((x) => x.id !== a.id))}>Remove</button></td></tr>))}</tbody></table>}
      <form style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14, alignItems: "end" }} onSubmit={(e) => { e.preventDefault(); if (!handle.trim()) return; onChange([...data.accounts, { id: newId(), platform, handle: handle.trim().replace(/^@+/, "") }]); setHandle(""); }}>
        <Field label="Platform"><select className="adm-sel" value={platform} onChange={(e) => setPlatform(e.target.value as Platform)}>{PLATFORMS.map((p) => <option key={p} value={p}>{PLATFORM_INFO[p].label}</option>)}</select></Field>
        <Field label="Handle"><input className="adm-in" value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="osaka76" /></Field>
        <button className="adm-btn adm-pri">Add account</button>
      </form>
    </section>
  );
}

function Composer({ post, exists, products, origin, brand, best, nextSlot, pending, onClose, onSave, onDelete }: {
  post: SocialPost; exists: boolean; products: ProductOpt[]; origin: string; brand: string; best: { day: number; hour: number; orders: number }[]; nextSlot: (d: number, h: number) => string; pending: boolean;
  onClose: () => void; onSave: (p: SocialPost, text: string) => void; onDelete: (id: string) => void;
}) {
  const [p, setP] = useState(post), [copied, setCopied] = useState("");
  const product = products.find((x) => x.slug === p.productSlug);
  const campaign = product?.slug ?? "post";
  const link = (pl: Platform) => (product ? trackedLink(origin, `/products/${product.slug}`, pl, campaign) : origin);
  const resolved = (pl: Platform) => fillLink(p.text, link(pl));
  const over = overLimit(p.text.replaceAll("{link}", link(p.platforms[0] ?? "x")), p.platforms);
  const set = (patch: Partial<SocialPost>) => setP((v) => ({ ...v, ...patch }));
  const toggle = (pl: Platform) => set({ platforms: p.platforms.includes(pl) ? p.platforms.filter((x) => x !== pl) : [...p.platforms, pl] });
  const pick = (slug: string) => { const pr = products.find((x) => x.slug === slug); set({ productSlug: slug, image: pr?.image ?? p.image, text: pr && !p.text.trim() ? draftCaption(pr, p.platforms[0] ?? "instagram", "{link}", brand, formatPrice(pr.pricePence)) : p.text }); };
  const date = p.at.slice(0, 10), time = p.at.slice(11, 16) || "12:00";
  const setWhen = (d: string, t: string) => set({ at: d ? new Date(`${d}T${t || "12:00"}:00.000Z`).toISOString() : "" });
  const copy = async (pl: Platform) => { try { await navigator.clipboard.writeText(resolved(pl)); setCopied(pl); setTimeout(() => setCopied(""), 2000); } catch { setCopied(""); } };
  const status = p.status === "posted" ? "posted" : p.at ? "scheduled" : "draft";
  return (
    <div className="adm-modal" role="dialog" aria-modal="true" aria-label="Post" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ maxWidth: 980 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}><h2 style={{ margin: 0 }}>{exists ? "Edit post" : "New post"}</h2><button type="button" className="adm-btn" onClick={onClose}>Close</button></div>
        <div className="adm-grid adm-g2" style={{ alignItems: "start" }}>
          <div style={{ display: "grid", gap: 12 }}>
            <Field label="Product (optional)"><select className="adm-sel" value={p.productSlug} onChange={(e) => pick(e.target.value)}><option value="">No product</option>{products.map((x) => <option key={x.slug} value={x.slug}>{x.name}</option>)}</select></Field>
            <div><span className="adm-lbl">Post to</span><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{PLATFORMS.map((pl) => <button key={pl} type="button" className="adm-chip" aria-pressed={p.platforms.includes(pl)} onClick={() => toggle(pl)}>{PLATFORM_INFO[pl].label}</button>)}</div></div>
            <Field label="Caption" hint={<>Use <code>{"{link}"}</code> where the tracked product link goes. <button type="button" className="adm-btn" style={{ padding: "2px 8px" }} disabled={!product} onClick={() => product && set({ text: draftCaption(product, p.platforms[0] ?? "instagram", "{link}", brand, formatPrice(product.pricePence)) })}>Write it for me</button></>}>
              <textarea className="adm-ta" style={{ minHeight: 150 }} value={p.text} onChange={(e) => set({ text: e.target.value })} /></Field>
            {over.length ? <p role="alert" className="adm-toast err">Too long for {over.map((x) => PLATFORM_INFO[x].label).join(", ")}.</p> : null}
            <Field label="Image address" hint="Filled from the product. Paste another address to change it."><input className="adm-in" value={p.image} onChange={(e) => set({ image: e.target.value })} /></Field>
            <div className="adm-grid adm-g2">
              <Field label="Date (UTC)"><input className="adm-in" type="date" value={date} onChange={(e) => setWhen(e.target.value, time)} /></Field>
              <Field label="Time (UTC)"><input className="adm-in" type="time" value={time} onChange={(e) => setWhen(date || new Date().toISOString().slice(0, 10), e.target.value)} /></Field>
            </div>
            {best.length ? <div className="adm-hint">Best times: {best.map((b) => <button key={`${b.day}-${b.hour}`} type="button" className="adm-chip" style={{ marginRight: 4 }} onClick={() => set({ at: nextSlot(b.day, b.hour), status: p.status === "posted" ? "posted" : "scheduled" })}>{DAYS[b.day]} {pad(b.hour)}:00</button>)}</div> : null}
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            {p.platforms.length === 0 ? <p className="adm-hint">Pick at least one platform to see its preview.</p> : p.platforms.map((pl) => {
              const t = resolved(pl), share = shareUrl(pl, t, link(pl), p.image), tooLong = t.length > PLATFORM_INFO[pl].limit;
              return (
                <div key={pl} className="adm-card" style={{ margin: 0, padding: 14, borderTop: `3px solid ${PLATFORM_INFO[pl].colour}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><b>{PLATFORM_INFO[pl].label}</b><span className={`adm-count ${tooLong ? "over" : ""}`}>{t.length}/{PLATFORM_INFO[pl].limit}</span></div>
                  {p.image ? <img src={p.image} alt="" style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 8, margin: "8px 0" }} /> : null}
                  <p style={{ whiteSpace: "pre-wrap", margin: "6px 0", wordBreak: "break-word", fontSize: 13 }}>{t || <span className="adm-hint">Nothing written yet.</span>}</p>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button type="button" className="adm-btn" onClick={() => copy(pl)}>{copied === pl ? "Copied" : "Copy text"}</button>
                    {share ? <a className="adm-btn" href={share} target="_blank" rel="noreferrer">Open {PLATFORM_INFO[pl].label}</a> : p.image ? <a className="adm-btn" href={p.image} target="_blank" rel="noreferrer">Open image</a> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16, alignItems: "center" }}>
          <button type="button" className="adm-btn adm-pri" disabled={pending || !p.platforms.length || (status !== "posted" && !p.at)} onClick={() => onSave({ ...p, status: p.status === "posted" ? "posted" : "scheduled" }, p.status === "posted" ? "Saved" : "Post scheduled")}>{p.status === "posted" ? "Save" : "Schedule"}</button>
          <button type="button" className="adm-btn" disabled={pending || !p.platforms.length} onClick={() => onSave({ ...p, status: "draft", at: "" }, "Draft saved")}>Save as draft</button>
          {p.status !== "posted" ? <button type="button" className="adm-btn" disabled={pending || !p.platforms.length} onClick={() => onSave({ ...p, status: "posted", at: p.at || new Date().toISOString() }, "Marked as posted")}>Mark as posted</button> : null}
          {exists ? <button type="button" className="adm-btn adm-danger" disabled={pending} onClick={() => onDelete(p.id)}>Delete</button> : null}
          <span className="adm-hint">Status: {status}</span>
        </div>
      </div>
    </div>
  );
}
