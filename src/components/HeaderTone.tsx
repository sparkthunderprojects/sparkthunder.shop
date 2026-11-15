"use client";
import { useEffect } from "react";

/** On a page that opens with a full-screen banner the slim header starts transparent; this turns it solid once you scroll past the top. */
export function HeaderTone() {
  useEffect(() => {
    const h = document.querySelector<HTMLElement>("[data-header='slim']");
    if (!h) return;
    const set = () => { if (window.scrollY > 40) h.setAttribute("data-solid", ""); else h.removeAttribute("data-solid"); };
    set();
    window.addEventListener("scroll", set, { passive: true });
    return () => window.removeEventListener("scroll", set);
  }, []);
  return null;
}
