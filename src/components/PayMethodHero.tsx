import Image from "next/image";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { isPlaceholderArt, productImagePath } from "@/lib/card";
import type { PayMethod } from "@/lib/pay-later";
import type { Product } from "@/lib/types";

const Icon = ({ d }: { d: string }) => <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>;

/** Banner for a "ways to pay" page: the provider's mark and message on the left, real Sparkthunder products on the right. */
export function PayMethodHero({ m, products }: { m: PayMethod; products: Product[] }) {
  const shown = products.slice(0, 3);
  return (
    <section className="relative -mx-(--gutter) overflow-hidden text-[#0b1b3a]" data-paymethod={m.id} style={{ background: `linear-gradient(135deg, #f7f7f5 0%, #f7f7f5 45%, ${m.tint} 130%)` }}>
      <div className="absolute left-(--gutter) top-5 z-20 text-black"><Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Payment options", href: "/payment-options" }, { name: m.name }]} /></div>
      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-(--gutter) pb-16 pt-20 md:grid-cols-[1.05fr_0.95fr] md:pb-20">
        <div>
          <div className="flex items-center gap-3">
            <Image src={m.logo} alt="" width={m.logoW} height={m.logoH} className="h-12 w-auto" />
            <span className="text-2xl font-semibold sm:text-3xl">Pay with {m.name}.</span>
          </div>
          <h1 className="mt-8 text-[clamp(2rem,4.4vw,3.6rem)] font-extrabold leading-[1.05] tracking-tight">{m.headline}</h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-black/75">{m.sub}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#how" className="inline-block rounded-full px-8 py-4 text-lg font-semibold" style={{ background: m.button, color: m.buttonText }}>{m.cta}</a>
            <Link href="/shop" className="inline-block rounded-full border-2 border-black/80 px-8 py-4 text-lg font-semibold text-black">Start shopping</Link>
          </div>
          <p className="mt-10 max-w-xl text-xs text-black/55">*{m.id === "paypal" ? "Pay later options are offered by PayPal, subject to status." : "Subject to status."} 18+, UK residents only. Terms apply.</p>
        </div>

        <div className="relative mx-auto h-[24rem] w-full max-w-lg md:h-[28rem]" aria-hidden>
          <ul className="absolute inset-0">
            {shown.map((p, i) => (
              <li key={p.slug} className={`${i % 2 ? "gc-float-b" : "gc-float"} absolute w-[44%] overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/10`} style={{ left: `${[2, 30, 54][i]}%`, top: `${[14, 0, 22][i]}%`, rotate: `${[-5, 3, 6][i]}deg` }}>
                <Image src={productImagePath(p)} alt="" width={480} height={600} unoptimized={isPlaceholderArt(productImagePath(p))} className="aspect-[4/5] w-full object-cover" />
                <span className="block truncate px-3 py-2 text-xs font-bold text-black">{p.name}</span>
              </li>
            ))}
          </ul>
          <div className="absolute bottom-0 right-0 w-[17rem] rounded-2xl p-4 shadow-2xl" style={{ background: m.button, color: m.buttonText }}>
            <div className="flex items-center justify-center gap-2"><Image src={m.logo} alt="" width={m.logoW} height={m.logoH} className="h-7 w-auto" /><b className="text-lg">{m.name}</b></div>
            <ul className="mt-3 grid grid-cols-3 gap-1 text-center text-[0.65rem] font-semibold leading-tight">
              <li className="grid justify-items-center gap-1"><Icon d="M19 5L5 19M7.5 8.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM16.5 18.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />Interest-free if paid on time</li>
              <li className="grid justify-items-center gap-1"><Icon d="M21 8l-9-5-9 5v8l9 5 9-5V8zM3 8l9 5 9-5M12 13v8" />Ships just like any order</li>
              <li className="grid justify-items-center gap-1"><Icon d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4" />Flexible payments</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
