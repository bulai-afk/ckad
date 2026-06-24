export const YM_COUNTER_ID = Number(process.env.NEXT_PUBLIC_YM_COUNTER_ID || "98614192");

export const YM_SCRIPT_SRC = "https://mc.yandex.ru/metrika/tag.js";

type YmCommand =
  | ["init", Record<string, unknown>]
  | ["hit", string, Record<string, unknown>?];

type YmFn = {
  (counterId: number, ...args: YmCommand): void;
  a?: unknown[];
  l?: number;
};

declare global {
  interface Window {
    ym?: YmFn;
  }
}

function getYm(): YmFn | undefined {
  return typeof window !== "undefined" ? window.ym : undefined;
}

export function isYandexMetrikaConfigured(): boolean {
  return Number.isFinite(YM_COUNTER_ID) && YM_COUNTER_ID > 0;
}

export function loadYandexMetrikaScript(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const ym = getYm();
  if (!ym) {
    const stub: YmFn = ((...args: unknown[]) => {
      (stub.a = stub.a || []).push(args);
    }) as YmFn;
    stub.l = Date.now();
    window.ym = stub;
  }

  for (let i = 0; i < document.scripts.length; i += 1) {
    if (document.scripts[i]?.src === YM_SCRIPT_SRC) return;
  }

  const script = document.createElement("script");
  script.async = true;
  script.src = YM_SCRIPT_SRC;
  const firstScript = document.getElementsByTagName("script")[0];
  firstScript?.parentNode?.insertBefore(script, firstScript);
}

let initialized = false;

export function initYandexMetrika(): void {
  if (!isYandexMetrikaConfigured() || initialized) return;

  loadYandexMetrikaScript();
  getYm()?.(YM_COUNTER_ID, "init", {
    webvisor: true,
    clickmap: true,
    referrer: document.referrer,
    url: location.href,
    accurateTrackBounce: true,
    trackLinks: true,
  });
  initialized = true;
}

export function trackYandexMetrikaHit(url: string): void {
  if (!initialized || !isYandexMetrikaConfigured()) return;
  getYm()?.(YM_COUNTER_ID, "hit", url);
}
