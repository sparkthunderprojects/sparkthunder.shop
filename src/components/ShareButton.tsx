"use client";

import { useT } from "@/components/LocaleProvider";
import { useState } from "react";

export function ShareButton({ title, path }: { title: string; path: string }) {
  const [copied, setCopied] = useState(false);
  const { t } = useT();
  async function share() {
    const url = `${location.origin}${path}`;
    try {
      if (navigator.share) { await navigator.share({ title, url }); return; }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }
  return (
    <button type="button" onClick={share} className="link-line font-bold" aria-live="polite">
      {copied ? t("Link copied") : t("Share this product")}
    </button>
  );
}
