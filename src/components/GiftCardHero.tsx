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
        {DOTS.map(([x, y, s], i) => <span key={i} className="absolute rounded-full bg-white/50" style={{ left: `${x}%`, top: `${y}%`, width: s, height: s, filter: s > 7 ? "blur(1px)" : undefined, opacity: 0.35 + (i % 4) * 0.15 }} />)}
        <Star className="absolute right-[17%] top-[52%] hidden h-14 w-14 opacity-90 md:block" />
        <Star className="absolute left-[24%] top-[38%] hidden h-6 w-6 opacity-70 md:block" />
        <Star className="absolute right-[8%] top-[24%] hidden h-5 w-5 opacity-60 md:block" />
        <svg className="absolute -bottom-6 left-0 h-3/5 w-full opacity-40" viewBox="0 0 1200 300" preserveAspectRatio="none">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => <path key={i} d={`M-20 ${250 - i * 6} C 300 ${290 - i * 10}, 700 ${120 + i * 8}, 1220 ${40 + i * 14}`} fill="none" stroke="white" strokeWidth="1" strokeOpacity={0.25 + i * 0.07} />)}
        </svg>
      </div>

      <div className="relative mx-auto flex min-h-[34rem] max-w-5xl flex-col items-center px-(--gutter) pt-10 text-center md:min-h-[40rem]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {store.logoUrl ? <img src={store.logoUrl} alt={store.name} width={store.logoWidth || 240} height={store.logoHeight || 60} className="h-12 w-auto max-w-[70vw] md:h-16" /> : <span className="display text-4xl md:text-5xl">{store.name}</span>}
        <h1 className="mt-2 text-3xl font-extrabold uppercase tracking-[0.35em] md:text-5xl"><span className="sr-only">{store.name} </span>Gift card</h1>
        <p className="mt-3 text-lg text-white/85">One card. A world of possibilities!</p>

        {/* phones */}
        <div aria-hidden className="relative mt-10 h-[24rem] w-full max-w-md md:h-[28rem]">
          <div className="absolute left-[8%] top-6 h-[30rem] w-[13rem] -rotate-6 rounded-[2.4rem] border-[10px] border-neutral-300 bg-neutral-200 shadow-2xl md:left-[12%]" />
          <div className="absolute left-1/2 top-16 h-[30rem] w-[15rem] -translate-x-[40%] rotate-3 rounded-[2.6rem] border-[9px] border-black bg-white text-black shadow-2xl">
            <span className="mx-auto mt-3 block h-6 w-24 rounded-full bg-black" />
            <div className="mt-7 px-4 text-center">
              <p className="text-sm font-extrabold tracking-tight">{store.name}</p>
              <p className="mt-5 text-left text-[0.8rem]"><b>To:</b> Alex</p>
              <p className="mt-2 text-left text-[0.8rem]"><b>From:</b> Sam</p>
              <p className="mt-4 text-left text-[0.8rem] font-semibold">Here&apos;s a gift for you!</p>
              <div className="mt-4 aspect-[1.6/1] rounded-lg p-3 text-left shadow-md" style={{ background: card.bg }}>
                <span className="block text-[0.5rem] font-bold uppercase tracking-[0.2em]" style={{ color: card.accent }}>Gift card</span>
                <span className="mt-1 block text-xl font-extrabold text-white">£50</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
