"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LOCALES, LOCALE_INFO, DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { saveLanguagesAction } from "../../languages-actions";
import { Toggle } from "../../ui";

export function LanguagesForm({ enabled }: { enabled: Locale[] }) {
  const router = useRouter();
  const [on, setOn] = useState<Locale[]>(enabled);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const toggle = (l: Locale, v: boolean) => setOn((x) => (v ? [...x, l] : x.filter((y) => y !== l)));
  const save = async () => {
    setBusy(true);
    const r = await saveLanguagesAction(on);
    setBusy(false);
    setMsg(r.ok ? "Saved." : r.error);
    if (r.ok) router.refresh();
  };
  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 640 }}>
      <h1>Languages</h1>
      <p>Turn on the languages this store speaks. Each one gets its own address (<code>/fr</code>, <code>/de</code>, <code>/es</code>) and a language list in the footer. English stays at the normal address and is always on.</p>
      <p style={{ opacity: 0.75 }}>Menus, the footer and basket words are translated for you. Product and collection descriptions are translated separately; until they are, those pages show the English text under the translated menus, so it is best to switch a language on once its products are ready.</p>
      {LOCALES.map((l) => (
        <Toggle key={l} label={`${LOCALE_INFO[l].name} (${LOCALE_INFO[l].english})`} checked={l === DEFAULT_LOCALE || on.includes(l)} onChange={(v) => l !== DEFAULT_LOCALE && toggle(l, v)}
          hint={l === DEFAULT_LOCALE ? "Always on" : `Address: /${l}`} />
      ))}
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button type="button" className="adm-btn" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save languages"}</button>
        {msg ? <span role="status">{msg}</span> : null}
      </div>
    </div>
  );
}
