export const COOKIE_CONSENT_STORAGE_KEY = "ckad_cookie_notice_v1";

export const COOKIE_CONSENT_EVENT = "ckad:cookie-consent";

export function hasCookieConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return Boolean(window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY));
  } catch {
    return false;
  }
}

export function grantCookieConsent(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, new Date().toISOString());
  } catch {
    /* частный режим и т.п. */
  }
  window.dispatchEvent(new Event(COOKIE_CONSENT_EVENT));
}

export function subscribeCookieConsent(onConsent: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(COOKIE_CONSENT_EVENT, onConsent);
  return () => window.removeEventListener(COOKIE_CONSENT_EVENT, onConsent);
}
