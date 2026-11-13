import Image from "next/image";
import { FRANCHISE_LOGOS } from "@/lib/site";

/** A franchise's own logo when we have one, otherwise its name set as display text. */
export function FranchiseLogo({ slug, name, className = "h-12", textClassName = "display text-4xl", priority }: {
  slug: string;
  name: string;
  /** Height classes for the logo image (width follows the artwork). */
  className?: string;
  /** Classes for the text fallback. */
  textClassName?: string;
  priority?: boolean;
}) {
  const logo = FRANCHISE_LOGOS[slug];
  if (!logo) return <span className={textClassName}>{name}</span>;
  return <Image src={logo.src} alt={name} width={logo.width} height={logo.height} priority={priority} style={logo.glow ? { filter: "drop-shadow(0 0 2px rgba(255,255,255,0.9)) drop-shadow(0 0 14px rgba(215,195,255,0.55))" } : undefined} className={`w-auto max-w-full self-start object-contain object-left ${className}`} />;
}
