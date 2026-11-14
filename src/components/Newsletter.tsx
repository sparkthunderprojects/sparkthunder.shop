import { getT } from "@/lib/i18n/server";
import { SubscribeForm } from "@/components/SubscribeForm";

export async function Newsletter({ blurb }: { blurb: string }) {
  const { t } = await getT();
  return (
    <section id="newsletter" aria-labelledby="nl-h" className="bg-bolt text-(--color-on-accent)">
      <div className="grid gap-8 px-(--gutter) py-14 md:grid-cols-2 md:items-center">
        <div>
          <h2 id="nl-h" className="display text-[clamp(2rem,4vw,3.5rem)]">{t("First access to every drop")}</h2>
          <p className="mt-4 max-w-md text-lg">{blurb}</p>
        </div>
        <div>
          <SubscribeForm idPrefix="nl" />
          <p className="mt-3 max-w-xl text-sm">{t("We’ll only email you about new releases. Unsubscribe any time.")}</p>
        </div>
      </div>
    </section>
  );
}
