import Link from "@/components/LocaleLink";
import { ShopShell } from "@/components/ShopShell";

export default function GlobalNotFound() {
  return (
    <ShopShell>
      <div className="pt-24">
        <h1 className="display text-[clamp(2.75rem,7vw,5.5rem)]">Page not found</h1>
        <p className="prose-lore mt-6 text-muted">That page has moved or never existed. Pick a franchise to keep browsing.</p>
        <Link href="/franchises" className="btn mt-8">Browse franchises</Link>
      </div>
    </ShopShell>
  );
}
