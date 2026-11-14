import { useT } from "@/components/LocaleProvider";
import { trackingUrl } from "@/lib/tracking";
import type { OrderRow } from "@/lib/shop/fulfil";

const fmt = (iso: string | null | undefined, loc: string) => (iso ? new Date(iso).toLocaleDateString(loc === "en" ? "en-GB" : loc, { day: "numeric", month: "short" }) : "");

/** Ordered → Dispatched, with a tracking link when we know the carrier. Gift-card-only orders have nothing to post. */
export function OrderTimeline({ order }: { order: OrderRow }) {
  const { t, locale } = useT();
  if (order.status === "cancelled") return <p className="mt-3 text-sm font-bold">{t("This order was cancelled.")}</p>;
  const posted = order.items.some((l) => l.type === "product");
  const shipped = order.status === "shipped";
  const steps = posted
    ? [{ label: t("Order placed"), on: true, when: fmt(order.created_at, locale) }, { label: t("Being prepared"), on: true, when: "" }, { label: t("Dispatched"), on: shipped, when: fmt(order.shipped_at, locale) }]
    : [{ label: t("Order placed"), on: true, when: fmt(order.created_at, locale) }, { label: t("Sent by email"), on: true, when: "" }];
  const link = trackingUrl(order.tracking_carrier, order.tracking_number);
  return (
    <div className="mt-3">
      <ol className="flex items-start" aria-label={t("Order progress")}>
        {steps.map((s, i) => (
          <li key={s.label} className="flex-1">
            <div className="flex items-center">
              <span aria-hidden className={`h-3.5 w-3.5 shrink-0 rounded-full border-2 border-ink ${s.on ? "bg-ink" : "bg-paper"}`} />
              {i < steps.length - 1 ? <span aria-hidden className={`h-0.5 flex-1 ${steps[i + 1].on ? "bg-ink" : "bg-ink/20"}`} /> : null}
            </div>
            <p className={`mt-1.5 text-xs ${s.on ? "font-bold" : "text-muted"}`}>{s.label}{s.when ? <><br /><span className="font-normal text-muted">{s.when}</span></> : null}</p>
          </li>
        ))}
      </ol>
      {order.tracking_number ? (
        <p className="mt-3 text-sm">{order.tracking_carrier || t("Tracking")} <b>{order.tracking_number}</b>{link ? <> · <a href={link} target="_blank" rel="noopener" className="font-bold underline underline-offset-4">{t("Track parcel")}<span className="sr-only">{t(" (opens in a new tab)")}</span></a></> : null}</p>
      ) : null}
    </div>
  );
}
