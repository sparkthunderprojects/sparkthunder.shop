import type { DayPoint } from "@/lib/analytics";
import { formatPrice } from "@/lib/site";

const nice = (max: number) => { if (max <= 0) return 1; const p = 10 ** Math.floor(Math.log10(max)), n = max / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; };

/** Change against the previous period, as a coloured badge. `invert` for numbers where down is good (refunds). */
export function Delta({ now, before, invert }: { now: number; before: number | null | undefined; invert?: boolean }) {
  if (before == null) return null;
  if (before === 0) return <span className="adm-hint">{now === 0 ? "no change" : "new"}</span>;
  const pct = Math.round(((now - before) / before) * 100), good = invert ? pct <= 0 : pct >= 0;
  return <span style={{ fontSize: 12, fontWeight: 700, color: pct === 0 ? "#666" : good ? "#0a7d33" : "#c62828" }}>{pct > 0 ? "▲" : pct < 0 ? "▼" : "•"} {Math.abs(pct)}%</span>;
}

export function StatCard({ label, value, now, before, invert }: { label: string; value: string; now: number; before: number | null | undefined; invert?: boolean }) {
  return (
    <div className="adm-card" style={{ margin: 0 }}>
      <div className="adm-stat-l">{label}</div>
      <div className="adm-stat">{value}</div>
      <div style={{ minHeight: 18 }}><Delta now={now} before={before} invert={invert} /> {before != null ? <span className="adm-hint">vs previous period</span> : null}</div>
    </div>
  );
}

/** Sales as a line (left axis) with orders as bars behind it (right axis). Plain SVG, no script. */
export function SalesChart({ days, ariaLabel }: { days: DayPoint[]; ariaLabel: string }) {
  const W = 760, H = 260, L = 56, R = 36, T = 12, B = 26, iw = W - L - R, ih = H - T - B;
  const vMax = nice(Math.max(...days.map((d) => d.value), 10000)), oMax = Math.max(4, nice(Math.max(...days.map((d) => d.orders), 1)));
  const x = (i: number) => L + (days.length <= 1 ? iw / 2 : (i / (days.length - 1)) * iw);
  const yv = (v: number) => T + ih - (v / vMax) * ih, yo = (o: number) => T + ih - (o / oMax) * ih;
  const line = days.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${yv(d.value).toFixed(1)}`).join(" ");
  const area = days.length ? `${line} L${x(days.length - 1).toFixed(1)},${T + ih} L${x(0).toFixed(1)},${T + ih} Z` : "";
  const bw = Math.max(1, Math.min(14, (iw / Math.max(days.length, 1)) * 0.6));
  const ticks = [0, 0.25, 0.5, 0.75, 1], labelEvery = Math.max(1, Math.ceil(days.length / 7));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} style={{ width: "100%", height: "auto", maxHeight: 300, display: "block" }}>
      {ticks.map((t) => <g key={t}><line x1={L} x2={W - R} y1={T + ih - t * ih} y2={T + ih - t * ih} stroke="#e6e6ef" strokeDasharray={t ? "3 3" : undefined} />
        <text x={L - 6} y={T + ih - t * ih + 4} fontSize="11" textAnchor="end" fill="#666">{formatPrice(vMax * t).replace(/\.00$/, "")}</text>
        <text x={W - R + 6} y={T + ih - t * ih + 4} fontSize="11" fill="#666">{Math.round(oMax * t)}</text></g>)}
      {days.map((d, i) => d.orders ? <rect key={d.day} x={x(i) - bw / 2} y={yo(d.orders)} width={bw} height={T + ih - yo(d.orders)} fill="#d9d4ff" /> : null)}
      {area ? <path d={area} fill="#6b5cff" opacity=".08" /> : null}
      <path d={line} fill="none" stroke="#6b5cff" strokeWidth="2.5" strokeLinejoin="round" />
      {days.length <= 45 ? days.map((d, i) => <circle key={d.day} cx={x(i)} cy={yv(d.value)} r="3" fill="#6b5cff"><title>{`${d.day}: ${formatPrice(d.value)}, ${d.orders} order${d.orders === 1 ? "" : "s"}`}</title></circle>) : days.map((d, i) => <rect key={d.day} x={x(i) - iw / days.length / 2} y={T} width={iw / days.length} height={ih} fill="transparent"><title>{`${d.day}: ${formatPrice(d.value)}, ${d.orders} order${d.orders === 1 ? "" : "s"}`}</title></rect>)}
      {days.map((d, i) => i % labelEvery === 0 ? <text key={d.day} x={x(i)} y={H - 6} fontSize="11" textAnchor="middle" fill="#666">{d.day.slice(5)}</text> : null)}
    </svg>
  );
}
