import type { GiftTheme } from "@/lib/giftcards/themes";

type Store = { name: string; logoUrl: string; logoWidth: number; logoHeight: number; dark: string; accent: string };

const DOTS = [[6, 12, 10], [14, 30, 6], [22, 8, 8], [31, 22, 5], [44, 10, 7], [58, 26, 6], [66, 9, 9], [74, 20, 5], [83, 11, 8], [91, 28, 6], [96, 7, 10], [3, 46, 6], [95, 52, 7]];

const Star = ({ className }: { className: string }) => (
  <svg viewBox="0 0 40 40" className={className} aria-hidden><path d="M20 0c1.2 10.5 3.3 16.8 7 20-3.7 3.2-5.8 9.5-7 20-1.2-10.5-3.3-16.8-7-20 3.7-3.2 5.8-9.5 7-20Z" fill="white" /><path d="M0 20c10.500-1.200 16.800-3.300 20-7 3.200 3.700 9.500 5.800 20 7-10.500 1.200-16.800 3.300-20 7-3.200-3.700-9.500-5.800-20-7Z" fill="white" /></svg>
);

/** Full-width branded banner for the gift cards page: the store's own colours, logo, a floating phone showing the emailed card, sparkles and swooping lines. */
export function GiftCardHero({ store, card }: { store: Store; card: GiftTheme }) {
  return (
    <section className="relative -mx-(--gutter) mt-6 overflow-hidden text-white" data-giftcards="hero" style={{ background: `linear-gradient(180deg, ${store.dark} 0%, ${store.dark} 22%, color-mix(in srgb, ${store.dark} 55%, ${store.accent}) 78%, color-mix(in srgb, ${store.dark} 25%, ${store.accent}) 100%)` }}>
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

      <div className="relative mx-auto flex min-h-[34rem] max-w-5xl flex-col items-center px-(--gutter) pt-10 text-center md:min-h-[40rem]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {store.logoUrl ? <img src={store.logoUrl} alt={store.name} width={store.logoWidth || 240} height={store.logoHeight || 60} className="h-12 w-auto max-w-[70vw] md:h-16" /> : <span className="display text-4xl md:text-5xl">{store.name}</span>}
        <h1 className="mt-2 text-3xl font-extrabold uppercase tracking-[0.35em] md:text-5xl"><span className="sr-only">{store.name} </span>Gift card</h1>
        <p className="mt-3 text-lg text-white/85">One card. A world of possibilities!</p>

        {/* phones */}
        <div aria-hidden className="relative mt-8 h-[25rem] w-full max-w-lg md:h-[29rem]">
          {/* a notification slides in above the phones */}
          <div className="gc-toast absolute left-1/2 top-0 z-20 flex w-64 -translate-x-1/2 items-center gap-3 rounded-2xl bg-white/95 px-4 py-3 text-left text-black shadow-2xl backdrop-blur">
            <span className="grid h-9 w-9 flex-none place-items-center rounded-xl text-lg" style={{ background: store.accent }}>&#127873;</span>
            <span className="min-w-0 text-xs leading-tight"><b className="block text-[0.8rem]">You&apos;ve got a gift card!</b><span className="text-black/60">Sam sent you £50 for {store.name}</span></span>
          </div>

          {/* back phone: shows its camera side */}
          <div className="gc-float-b absolute left-[6%] top-14 h-[28rem] w-[13.5rem] md:left-[10%]">
            <div className="gc-phone-metal relative h-full w-full -rotate-6 rounded-[2.6rem] p-[7px]">
              <div className="h-full w-full rounded-[2.2rem] bg-gradient-to-b from-neutral-100 to-neutral-300" />
              <div className="absolute left-4 top-4 grid h-[4.6rem] w-[4.6rem] grid-cols-2 place-items-center gap-1 rounded-[1.3rem] bg-gradient-to-br from-neutral-200 to-neutral-400 p-2 shadow-inner">
                <span className="gc-lens h-7 w-7 rounded-full" /><span className="gc-lens h-7 w-7 rounded-full" /><span className="gc-lens h-7 w-7 rounded-full" /><span className="h-2.5 w-2.5 rounded-full bg-amber-100" />
              </div>
            </div>
          </div>

          {/* front phone */}
          <div className="gc-float absolute left-1/2 top-20 h-[28.5rem] w-[15rem] -translate-x-[38%]">
            <div className="gc-phone-metal relative h-full w-full rotate-3 rounded-[2.9rem] p-[7px]">
              <span className="absolute -left-[3px] top-24 h-10 w-[3px] rounded-l bg-neutral-500" /><span className="absolute -left-[3px] top-40 h-14 w-[3px] rounded-l bg-neutral-500" /><span className="absolute -right-[3px] top-32 h-20 w-[3px] rounded-r bg-neutral-500" />
              <div className="relative h-full w-full overflow-hidden rounded-[2.5rem] border-[5px] border-black bg-white text-black">
                <span className="absolute left-1/2 top-2.5 z-10 h-6 w-[5.5rem] -translate-x-1/2 rounded-full bg-black" />
                <div className="flex items-center justify-between px-6 pt-3 text-[0.6rem] font-bold"><span>9:41</span><span className="opacity-0">.</span></div>
                <div className="mt-6 border-b border-black/10 px-4 pb-2 text-center"><p className="text-[0.95rem] font-extrabold tracking-tight">{store.name}</p></div>
                <div className="px-4 pt-3 text-left text-[0.72rem] leading-snug">
                  <p><b>To:</b> Alex</p><p className="mt-1"><b>From:</b> Sam</p>
                  <p className="mt-3 text-[0.8rem] font-bold">Here&apos;s a gift for you!</p>
                  <p className="mt-1 text-black/60">Enjoy something from the shop. Happy birthday!</p>
                  <div className="gc-card relative mt-3 aspect-[1.6/1] overflow-hidden rounded-xl p-3 shadow-lg" style={{ background: card.bg }}>
                    <span className="block text-[0.5rem] font-bold uppercase tracking-[0.2em]" style={{ color: card.accent }}>Gift card</span>
                    <span className="mt-1 block text-2xl font-extrabold text-white">£50</span>
                    <span className="gc-shine absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-white/25" />
                  </div>
                  <span className="mt-3 block rounded-full py-1.5 text-center text-[0.65rem] font-bold" style={{ background: store.accent, color: store.dark }}>Use my gift card</span>
                </div>
                <span className="gc-glare pointer-events-none absolute inset-0" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
