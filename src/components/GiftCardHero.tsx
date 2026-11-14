import { getT } from "@/lib/i18n/server";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import type { GiftTheme } from "@/lib/giftcards/themes";

type Store = { name: string; logoUrl: string; logoWidth: number; logoHeight: number; dark: string; accent: string };

const DOTS = [[6, 12, 10], [14, 30, 6], [22, 8, 8], [31, 22, 5], [44, 10, 7], [58, 26, 6], [66, 9, 9], [74, 20, 5], [83, 11, 8], [91, 28, 6], [96, 7, 10], [3, 46, 6], [95, 52, 7]];

const Star = ({ className }: { className: string }) => (
  <svg viewBox="0 0 40 40" className={className} aria-hidden><path d="M20 0c1.2 10.5 3.3 16.8 7 20-3.7 3.2-5.8 9.5-7 20-1.2-10.5-3.3-16.8-7-20 3.7-3.2 5.8-9.5 7-20Z" fill="white" /><path d="M0 20c10.500-1.200 16.800-3.300 20-7 3.200 3.700 9.500 5.800 20 7-10.500 1.200-16.800 3.300-20 7-3.200-3.700-9.500-5.800-20-7Z" fill="white" /></svg>
);

/** Full-width branded banner for the gift cards page: the store's own colours, logo, a floating phone showing the emailed card, sparkles and swooping lines. */
export async function GiftCardHero({ store, card }: { store: Store; card: GiftTheme }) {
  const { t } = await getT();
  return (
    <section className="relative -mx-(--gutter) overflow-hidden text-white" data-giftcards="hero" style={{ background: `linear-gradient(180deg, ${store.dark} 0%, ${store.dark} 22%, color-mix(in srgb, ${store.dark} 55%, ${store.accent}) 78%, color-mix(in srgb, ${store.dark} 25%, ${store.accent}) 100%)` }}>
      {/* sparkles */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {DOTS.map(([x, y, s], i) => <span key={i} className="gc-twinkle absolute rounded-full bg-white/50" style={{ animationDelay: `${(i % 6) * 0.45}s`, left: `${x}%`, top: `${y}%`, width: s, height: s, filter: s > 7 ? "blur(1px)" : undefined, opacity: 0.35 + (i % 4) * 0.15 }} />)}
        <Star className="gc-twinkle absolute right-[17%] top-[52%] hidden h-14 w-14 opacity-90 md:block" />
        <Star className="gc-twinkle absolute left-[24%] top-[38%] hidden h-6 w-6 opacity-70 md:block" />
        <Star className="gc-twinkle absolute right-[8%] top-[24%] hidden h-5 w-5 opacity-60 md:block" />
        <svg className="gc-drift absolute -bottom-6 left-0 h-3/5 w-full opacity-40" viewBox="0 0 1200 300" preserveAspectRatio="none">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => <path key={i} d={`M-20 ${250 - i * 6} C 300 ${290 - i * 10}, 700 ${120 + i * 8}, 1220 ${40 + i * 14}`} fill="none" stroke="white" strokeWidth="1" strokeOpacity={0.25 + i * 0.07} />)}
        </svg>
      </div>

      <div className="absolute left-(--gutter) top-5 z-20"><Breadcrumbs tone="world" items={[{ name: t("Home"), href: "/" }, { name: t("Gift cards") }]} /></div>

      <div className="relative mx-auto flex min-h-[38rem] max-w-5xl flex-col items-center px-(--gutter) pt-16 text-center md:min-h-[44rem]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {store.logoUrl ? <img src={store.logoUrl} alt={store.name} width={store.logoWidth || 240} height={store.logoHeight || 60} className="h-12 w-auto max-w-[70vw] md:h-16" /> : <span className="display text-4xl md:text-5xl">{store.name}</span>}
        <h1 className="mt-2 text-3xl font-extrabold uppercase tracking-[0.35em] md:text-5xl"><span className="sr-only">{store.name} </span>{t("Gift card")}</h1>
        <p className="mt-3 text-lg text-white/85">{t("One card. A world of possibilities!")}</p>

        {/* phones */}
        <div aria-hidden className="relative mt-8 h-[31rem] w-full max-w-xl md:h-[34rem]" style={{ perspective: "1400px" }}>
          {/* a notification slides in above the phones */}
          <div className="gc-toast absolute left-1/2 top-0 z-30 flex w-64 -translate-x-1/2 items-center gap-3 rounded-2xl bg-white/95 px-4 py-3 text-left text-black shadow-2xl backdrop-blur">
            <span className="grid h-9 w-9 flex-none place-items-center rounded-xl text-lg" style={{ background: store.accent }}>&#127873;</span>
            <span className="min-w-0 text-xs leading-tight"><b className="block text-[0.8rem]">{t("You've got a gift card!")}</b><span className="text-black/60">{t("Sam sent you £50 for {store}", { store: store.name })}</span></span>
          </div>

          {/* floor shadow */}
          <span className="absolute bottom-2 left-1/2 h-8 w-[22rem] -translate-x-1/2 rounded-[50%] bg-black/50 blur-2xl" />

          {/* back phone: matte glass back with the camera plateau */}
          <div className="gc-float-b absolute left-[3%] top-14 h-[28.8rem] w-[14rem] md:left-[8%]">
            <div className="relative h-full w-full" style={{ transform: "rotateY(18deg) rotateX(3deg) rotateZ(-5deg)", transformStyle: "preserve-3d" }}>
              <span className="gc-btn absolute -left-[3px] top-[5.2rem] h-7 w-[4px] rounded-l" /><span className="gc-btn absolute -left-[3px] top-[8rem] h-12 w-[4px] rounded-l" /><span className="gc-btn absolute -left-[3px] top-[11.4rem] h-12 w-[4px] rounded-l" /><span className="gc-btn absolute -right-[3px] top-[9rem] h-[4.5rem] w-[4px] rounded-r" />
              <div className="gc-titanium absolute inset-0 rounded-[2.7rem]" />
              <div className="gc-back absolute inset-[3px] rounded-[2.55rem]">
                <div className="gc-plateau absolute left-3 top-3 h-[6.3rem] w-[6.3rem] rounded-[1.6rem]">
                  <span className="gc-cam absolute left-2 top-2" /><span className="gc-cam absolute bottom-2 left-2" /><span className="gc-cam absolute right-2 top-1/2 -translate-y-1/2" />
                  <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-amber-100 shadow-[inset_0_0_2px_rgb(0_0_0/0.4)]" />
                  <span className="absolute bottom-2 right-2 h-2.5 w-2.5 rounded-full bg-black/80" />
                </div>
              </div>
            </div>
          </div>

          {/* front phone */}
          <div className="gc-float absolute left-1/2 top-24 h-[28.8rem] w-[14rem] -translate-x-[34%]">
            <div className="relative h-full w-full" style={{ transform: "rotateY(-16deg) rotateX(4deg) rotateZ(3deg)", transformStyle: "preserve-3d" }}>
              <span className="gc-btn absolute -left-[3px] top-[5.2rem] h-7 w-[4px] rounded-l" /><span className="gc-btn absolute -left-[3px] top-[8rem] h-12 w-[4px] rounded-l" /><span className="gc-btn absolute -left-[3px] top-[11.4rem] h-12 w-[4px] rounded-l" /><span className="gc-btn absolute -right-[3px] top-[9rem] h-[4.5rem] w-[4px] rounded-r" />
              <div className="gc-titanium absolute inset-0 rounded-[2.7rem]" />
              <div className="absolute inset-[3px] rounded-[2.55rem] bg-black" />
              <div className="absolute inset-[8px] overflow-hidden rounded-[2.15rem] bg-white text-black">
                {/* status bar */}
                <span className="absolute left-1/2 top-2 z-10 flex h-[1.35rem] w-[4.7rem] -translate-x-1/2 items-center justify-end rounded-full bg-black pr-2"><span className="h-2 w-2 rounded-full bg-[#10131f] shadow-[inset_0_0_2px_#3b4468]" /></span>
                <div className="flex items-center justify-between px-6 pt-[0.7rem] text-[0.62rem] font-bold">
                  <span>9:41</span>
                  <span className="flex items-center gap-1">
                    <svg width="14" height="9" viewBox="0 0 14 9"><rect x="0" y="6" width="2.4" height="3" rx=".6" /><rect x="3.8" y="4" width="2.4" height="5" rx=".6" /><rect x="7.6" y="2" width="2.4" height="7" rx=".6" /><rect x="11.4" y="0" width="2.4" height="9" rx=".6" /></svg>
                    <svg width="13" height="9" viewBox="0 0 13 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M1 3.2a8 8 0 0 1 11 0M3 5.4a5 5 0 0 1 7 0" /><circle cx="6.5" cy="7.6" r=".9" fill="currentColor" stroke="none" /></svg>
                    <svg width="21" height="10" viewBox="0 0 21 10"><rect x=".5" y=".5" width="17" height="9" rx="2.6" fill="none" stroke="currentColor" opacity=".45" /><rect x="2" y="2" width="14" height="6" rx="1.6" /><rect x="18.4" y="3.2" width="1.6" height="3.6" rx=".8" opacity=".5" /></svg>
                  </span>
                </div>
                {/* mail UI */}
                <div className="mt-3 flex items-center justify-between px-4 text-[0.65rem] font-semibold" style={{ color: "#2563eb" }}><span>&lsaquo; {t("Inbox")}</span><span>&#8942;</span></div>
                <div className="mt-2 flex items-center gap-2 border-b border-black/10 px-4 pb-2">
                  <span className="grid h-7 w-7 flex-none place-items-center rounded-full text-[0.7rem] font-extrabold" style={{ background: store.accent, color: store.dark }}>{store.name.charAt(0)}</span>
                  <span className="min-w-0 flex-1 text-left leading-tight"><b className="block truncate text-[0.7rem]">{store.name}</b><span className="text-[0.58rem] text-black/50">{t("to me")}</span></span>
                  <span className="text-[0.55rem] text-black/45">9:41</span>
                </div>
                <div className="px-4 pt-2 text-left text-[0.7rem] leading-snug">
                  <p className="text-[0.82rem] font-extrabold leading-tight">{t("Sam sent you a gift card")}</p>
                  <p className="mt-1 text-black/60">{t("Hi Alex, here's a little something from the shop. Happy birthday!")}</p>
                  <div className="gc-card relative mt-3 aspect-[1.6/1] overflow-hidden rounded-xl p-3 shadow-lg ring-1 ring-black/10" style={{ background: card.bg }}>
                    <span className="block text-[0.5rem] font-bold uppercase tracking-[0.2em]" style={{ color: card.accent }}>{t("Gift card")}</span>
                    <span className="mt-1 block text-2xl font-extrabold text-white">£50</span>
                    <span className="gc-shine absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-white/25" />
                  </div>
                  <span className="mt-3 block rounded-full py-1.5 text-center text-[0.65rem] font-bold" style={{ background: store.accent, color: store.dark }}>{t("Use my gift card")}</span>
                </div>
                <span className="absolute bottom-1.5 left-1/2 h-1 w-[5.5rem] -translate-x-1/2 rounded-full bg-black" />
                <span className="gc-glare pointer-events-none absolute inset-0" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
