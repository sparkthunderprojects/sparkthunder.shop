"use client";
import { useState } from "react";
import { descPx, DESC_PX, titlePx, TITLE_PX } from "@/lib/seo/text";
import type { SeoResult } from "@/lib/seo/score";
import { SITE } from "@/lib/site";

export function Counter({ value, max, px, pxMax }: { value: string; max: number; px: number; pxMax: number }) {
  const over = px > pxMax;
  return (
    <div className={`adm-count${over ? " over" : ""}`}>
      <span>{value.length} characters (about {px}px of {pxMax}px)</span>
      <span>{over ? "Will be truncated" : `${Math.max(0, max - value.length)} left (soft)`}</span>
    </div>
  );
}
export const TitleCounter = ({ value }: { value: string }) => <Counter value={value} max={60} px={titlePx(value)} pxMax={TITLE_PX} />;
export const DescCounter = ({ value }: { value: string }) => <Counter value={value} max={160} px={descPx(value)} pxMax={DESC_PX} />;

function truncatePx(text: string, px: (t: string) => number, limit: number) {
  if (px(text) <= limit) return text;
  let t = text;
  while (t.length > 1 && px(t + "...") > limit) t = t.slice(0, -1);
  return t.trimEnd() + "...";
}

export function SerpPreview({ title, description, path }: { title: string; description: string; path: string }) {
  const [mobile, setMobile] = useState(false);
  const host = SITE.url.replace(/^https?:\/\//, "");
  const crumbs = path.split("/").filter(Boolean).join(" › ");
  const t = mobile ? title : truncatePx(title, titlePx, TITLE_PX);
  const d = truncatePx(description, descPx, mobile ? 650 : DESC_PX);
  return (
    <div>
      <div className="adm-tabs" role="group" aria-label="Preview device">
        <button type="button" className="adm-chip" aria-pressed={!mobile} onClick={() => setMobile(false)}>Desktop</button>
        <button type="button" className="adm-chip" aria-pressed={mobile} onClick={() => setMobile(true)}>Mobile</button>
      </div>
      <div className={`adm-serp ${mobile ? "m" : "d"}`} aria-label="Google result preview">
        <div className="u"><b>S</b><div style={{ minWidth: 0 }}><div style={{ fontSize: 14 }}>{SITE.name}</div><span>{host}{crumbs ? ` › ${crumbs}` : ""}</span></div></div>
        <h3>{t || "Untitled page"}</h3>
        <p>{d || "No description yet. Google will pick text from the page."}</p>
      </div>
    </div>
  );
}

export function SocialPreview({ title, description, image }: { title: string; description: string; image?: string }) {
  return (
    <div className="adm-og" aria-label="Social share preview">
      {image ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={image} alt="" /> : <div className="ph" />}
      <div className="t"><small>{SITE.url.replace(/^https?:\/\//, "")}</small><strong>{title || "Untitled"}</strong><span>{description.slice(0, 110)}</span></div>
    </div>
  );
}

const COLOR = { A: "#12805c", B: "#3b7f1f", C: "#b7791f", D: "#c0392b" };
export function ScoreBadge({ score, grade }: { score: number; grade: string }) {
  return <div className="adm-score" style={{ background: COLOR[grade as keyof typeof COLOR] ?? "#444" }} aria-label={`SEO score ${score}, grade ${grade}`}>{score}</div>;
}

export function ScoreList({ result }: { result: SeoResult }) {
  const order = { fail: 0, warn: 1, pass: 2 } as const;
  const checks = [...result.checks].sort((a, b) => order[a.status] - order[b.status]);
  return (
    <div>
      <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 10 }}>
        <ScoreBadge score={result.score} grade={result.grade} />
        <div><b>Grade {result.grade}</b><div className="adm-hint">{checks.filter((c) => c.status === "fail").length} to fix, {checks.filter((c) => c.status === "warn").length} to improve</div></div>
      </div>
      {checks.map((c) => (
        <div key={c.id} className="adm-chk">
          <span className={`adm-dot ${c.status}`} aria-hidden>{c.status === "pass" ? "✓" : c.status === "warn" ? "!" : "×"}</span>
          <div><b>{c.label}</b><span className="sr-only"> ({c.status})</span><div className="adm-hint" style={{ marginTop: 0 }}>{c.hint}</div></div>
        </div>
      ))}
    </div>
  );
}
