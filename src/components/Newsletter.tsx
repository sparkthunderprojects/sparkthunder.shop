import { SubscribeForm } from "@/components/SubscribeForm";

export function Newsletter() {
  return (
    <section id="newsletter" aria-labelledby="nl-h" className="bg-bolt text-ink">
      <div className="grid gap-8 px-(--gutter) py-16 md:grid-cols-2 md:items-center">
        <div>
          <h2 id="nl-h" className="display text-[clamp(2.75rem,6vw,5.5rem)]">First access to every drop</h2>
          <p className="serif mt-4 max-w-md text-xl">New merchandise from Knightverge, Grim Gala and the rest of the universe, straight to your inbox.</p>
        </div>
        <div>
          <SubscribeForm idPrefix="nl" />
          <p className="mt-3 max-w-xl text-sm">We’ll only email you about new releases. Unsubscribe any time.</p>
        </div>
      </div>
    </section>
  );
}
