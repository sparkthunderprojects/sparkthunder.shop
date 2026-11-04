import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-24 text-center">
      <p className="text-sm uppercase tracking-[0.3em] text-accent">404</p>
      <h1 className="mt-3 text-4xl font-extrabold">We couldn’t find that page</h1>
      <p className="mt-3 text-muted">It may have moved or sold out for good. Try one of our franchises instead.</p>
      <Link href="/franchises" className="mt-8 inline-block rounded-full bg-accent px-7 py-3.5 font-semibold text-black">Browse franchises</Link>
    </div>
  );
}
