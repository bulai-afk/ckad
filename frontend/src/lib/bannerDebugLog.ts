/**
 * Логи для сравнения баннеров между браузерами.
 * Включается в dev или в браузере: localStorage.setItem("BANNER_DEBUG", "1") и перезагрузка.
 */

export function bannerDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (process.env.NODE_ENV === "development") return true;
  try {
    return window.localStorage.getItem("BANNER_DEBUG") === "1";
  } catch {
    return false;
  }
}

export function describeBannerImageRef(src: string): {
  kind: "empty" | "data" | "blob" | "http" | "https" | "relative" | "other";
  length: number;
  preview: string;
} {
  const length = src.length;
  if (!src) {
    return { kind: "empty", length: 0, preview: "" };
  }
  const head = src.slice(0, 48);
  if (src.startsWith("data:")) return { kind: "data", length, preview: `${head}…` };
  if (src.startsWith("blob:")) return { kind: "blob", length, preview: `${head}…` };
  if (src.startsWith("https:")) return { kind: "https", length, preview: `${head}…` };
  if (src.startsWith("http:")) return { kind: "http", length, preview: `${head}…` };
  if (src.startsWith("/")) return { kind: "relative", length, preview: `${head}…` };
  return { kind: "other", length, preview: `${head}…` };
}

export function logBannerDebug(
  scope: string,
  payload: Record<string, unknown>,
): void {
  if (!bannerDebugEnabled()) return;
  const ua =
    typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 160) : "";
  const w = typeof window !== "undefined" ? window.innerWidth : 0;
  const h = typeof window !== "undefined" ? window.innerHeight : 0;
  const o =
    typeof window !== "undefined" && window.screen?.orientation?.type
      ? window.screen.orientation.type
      : "";
  // eslint-disable-next-line no-console -- отладка баннеров по запросу
  console.log(`[BANNER] ${scope}`, {
    ...payload,
    viewport: { w, h, orientation: o },
    ua,
  });
}
