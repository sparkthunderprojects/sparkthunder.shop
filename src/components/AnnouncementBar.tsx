"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function AnnouncementBar({ items }: { items: { text: string; href?: string }[] }) {
  const ANNOUNCEMENTS = items;
  const [i, setI] = useState(0);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    try { if (sessionStorage.getItem("announce-closed")) setHidden(true); } catch {}
  }, []);
  useEffect(() => {
    if (hidden || ANNOUNCEMENTS.length < 2) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const t = setInterval(() => setI((n) => (n + 1) % ANNOUNCEMENTS.length), 6000);
    return () => clearInterval(t);
  }, [hidden]);

  if (hidden || ANNOUNCEMENTS.length === 0) return null;
  const msg = ANNOUNCEMENTS[i];
  return (
    <div className="relative bg-bolt text-(--color-on-accent)" role="region" aria-label="Announcements">
      <p className="px-12 py-2 text-center text-sm font-semibold">
        {msg.href ? <Link href={msg.href} className="hover:underline hover:underline-offset-4">{msg.text}</Link> : msg.text}
      </p>
      <button
        aria-label="Close announcement"
        onClick={() => { setHidden(true); try { sessionStorage.setItem("announce-closed", "1"); } catch {} }}
        className="absolute right-3 top-1/2 -translate-y-1/2 px-2 text-lg font-bold leading-none"
      >×</button>
    </div>
  );
}
