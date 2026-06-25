export const YM_COUNTER_ID = Number(process.env.NEXT_PUBLIC_YM_COUNTER_ID || "98614192");

export const YM_SCRIPT_SRC = "https://mc.yandex.ru/metrika/tag.js";

/** Идентификатор цели на кнопках CTA (редактор страниц → Метрика reachGoal). */
export const YM_GOAL_DATA_ATTR = "data-ym-goal";

export const YM_TRACKABLE_CTA_SELECTOR =
  "a.page-web-cover-el-button, a.page-web-elements-cta-button, a.page-web-elements-cta-button-secondary, a.page-web-cover-el-announcement-learn-more, a.page-web-cover-el-learn-more, a.page-web-elements-announcement-learn-more, a.page-web-feature-grid-link";

type YmCommand =
  | ["init", Record<string, unknown>]
  | ["hit", string, Record<string, unknown>?]
  | ["reachGoal", string, Record<string, unknown>?];

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

export function copyYmGoalAttribute(from: Element, to: Element): void {
  const goal = (from.getAttribute(YM_GOAL_DATA_ATTR) || "").trim();
  if (goal) to.setAttribute(YM_GOAL_DATA_ATTR, goal);
  else to.removeAttribute(YM_GOAL_DATA_ATTR);
}

export function reachYandexMetrikaGoal(goal: string): void {
  const name = goal.trim();
  if (!name || !isYandexMetrikaConfigured()) return;
  loadYandexMetrikaScript();
  getYm()?.(YM_COUNTER_ID, "reachGoal", name);
}

export function trackCtaElementMetrikaGoal(element: Element | null | undefined): void {
  if (!element) return;
  const goal = (element.getAttribute(YM_GOAL_DATA_ATTR) || "").trim();
  if (goal) reachYandexMetrikaGoal(goal);
}

export function trimYmGoalValue(goal: string | null | undefined): string {
  return String(goal || "").trim();
}
