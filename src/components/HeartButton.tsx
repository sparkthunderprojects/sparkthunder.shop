"use client";

import { useWishlist } from "@/components/WishlistProvider";

export function HeartButton({ slug, name, className = "" }: { slug: string; name: string; className?: string }) {
  const { has, toggle } = useWishlist();
  const on = has(slug);
  return (
    <button
      type="button"
      onClick={() => toggle(slug)}
      aria-pressed={on}
      aria-label={on ? `Remove ${name} from favourites` : `Add ${name} to favourites`}
      className={`flex h-9 w-9 items-center justify-center border-2 border-ink bg-paper ${className}`}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z" fill={on ? "#11142a" : "none"} stroke="#11142a" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
