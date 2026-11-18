import { getT } from "@/lib/i18n/server";
import { Breadcrumbs } from "@/components/Breadcrumbs";

// Falling droplets: [left %, width px, fall seconds, delay seconds, opacity]
const RAIN = [[4, 22, 9, 0, 0.55], [11, 34, 12, 3.2, 0.8], [18, 18, 8, 6.1, 0.45], [26, 28, 11, 1.4, 0.7], [33, 40, 14, 4.6, 0.9], [41, 20, 9.5, 7.3, 0.5], [49, 30, 12.5, 2.2, 0.75], [57, 18, 8.5, 5.4, 0.45], [64, 36, 13, 0.8, 0.85], [72, 24, 10, 3.9, 0.6], [79, 32, 12, 6.8, 0.8], [86, 20, 9, 1.9, 0.5], [92, 38, 14, 4.1, 0.9], [97, 22, 10.5, 7.9, 0.55]];

const DOTS = [[6, 12, 10], [14, 30, 6], [22, 8, 8], [31, 22, 5], [44, 10, 7], [58, 26, 6], [66, 9, 9], [74, 20, 5], [83, 11, 8], [91, 28, 6], [96, 7, 10], [3, 46, 6], [95, 52, 7]];

/** Full-width banner for the Elixir Points page: the Elixir droplet-with-an-e mark on the programme's own navy and red. */
export async function ElixirHero({ earn, example }: { earn: number; example: number }) {
  const { t } = await getT();
  return (
    <section className="relative -mx-(--gutter) overflow-hidden text-white" data-elixir="hero" style={{ background: "linear-gradient(180deg, #0f1a30 0%, #1d3557 45%, #7a2a45 85%, #bd3141 100%)" }}>
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {DOTS.map(([x, y, s], i) => <span key={i} className="gc-twinkle absolute rounded-full bg-white/50" style={{ animationDelay: `${(i % 6) * 0.45}s`, left: `${x}%`, top: `${y}%`, width: s, height: s, filter: s > 7 ? "blur(1px)" : undefined, opacity: 0.35 + (i % 4) * 0.15 }} />)}
        <svg className="gc-drift absolute -bottom-6 left-0 h-3/5 w-full opacity-40" viewBox="0 0 1200 300" preserveAspectRatio="none">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => <path key={i} d={`M-20 ${250 - i * 6} C 300 ${290 - i * 10}, 700 ${120 + i * 8}, 1220 ${40 + i * 14}`} fill="none" stroke="white" strokeWidth="1" strokeOpacity={0.25 + i * 0.07} />)}
        </svg>
      </div>

      {/* rain of Elixir droplets */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {RAIN.map(([x, w, dur, delay, o], i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src="/elixir-mark.png" alt="" width={w} height={Math.round(w * 1.36)} className="elx-rain absolute -top-16 h-auto" style={{ left: `${x}%`, width: w, animationDuration: `${dur}s`, animationDelay: `-${delay}s`, ["--o" as string]: o, filter: "drop-shadow(0 6px 8px rgba(0,0,0,0.35))" }} />
        ))}
      </div>

      <div className="absolute left-(--gutter) top-5 z-20"><Breadcrumbs tone="world" items={[{ name: t("Home"), href: "/" }, { name: t("Elixir Points") }]} /></div>

      <div className="relative mx-auto flex min-h-[34rem] max-w-5xl flex-col items-center px-(--gutter) pb-32 pt-20 text-center md:min-h-[40rem] md:pb-48">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/elixir-mark.png" alt="" width={200} height={275} className="gc-float-b h-40 w-auto drop-shadow-2xl md:h-52" />
        <h1 className="mt-4 text-3xl font-extrabold uppercase tracking-[0.35em] md:text-5xl"><span className="sr-only">Sparkthunder </span>Elixir Points</h1>
        <p className="mt-3 max-w-xl text-lg text-white/85">{t("Earn on every order. Spend it across the Sparkthunder worlds.")}</p>
        <div aria-hidden className="relative mt-8 h-16 w-full"><div className="gc-toast absolute left-1/2 top-0 flex w-72 items-center gap-3 rounded-2xl bg-white/95 px-4 py-3 text-left text-black shadow-2xl backdrop-blur">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/elixir-mark.png" alt="" width={200} height={275} className="h-9 w-auto flex-none" />
          <span className="min-w-0 text-xs leading-tight"><b className="block text-[0.8rem]">{t("+{n} Elixir Points", { n: example * earn })}</b><span className="text-black/60">{t("Added after your {amount} order", { amount: `£${example}` })}</span></span>
        </div></div>
      </div>
    </section>
  );
}
