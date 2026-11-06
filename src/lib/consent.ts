/** Cookie and privacy choices. "Necessary" is always on; the other two are opt-in and stored only in this browser. */
export const CONSENT_KEY = "sparkthunder-consent-v1";
export const CONSENT_EVENT = "sparkthunder:consent";
export const OPEN_CONSENT_EVENT = "sparkthunder:open-consent";

export type Consent = { performance: boolean; targeting: boolean; at: number };

export function readConsent(): Consent | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as Partial<Consent>;
    return { performance: c.performance === true, targeting: c.targeting === true, at: Number(c.at) || 0 };
  } catch { return null; }
}

export function saveConsent(c: Pick<Consent, "performance" | "targeting">): Consent {
  const full: Consent = { ...c, at: Date.now() };
  try { localStorage.setItem(CONSENT_KEY, JSON.stringify(full)); } catch {}
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: full }));
  return full;
}

/** Lets any link (for example the footer) reopen the settings. */
export const openConsentSettings = () => window.dispatchEvent(new Event(OPEN_CONSENT_EVENT));
