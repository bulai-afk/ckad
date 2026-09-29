import { DEFAULT_PUBLIC_SITE_ORIGIN } from "@/lib/publicSiteConstants";

/**
 * Основной сайт. Зеркала (centrcatalog.ru, www, http) всегда ведут сюда.
 * Canonical, og:url, sitemap и robots не собираются из заголовка Host.
 */
export const CANONICAL_PUBLIC_HOSTNAME_ASCII = "xn----8sbaaoishcaoovty5ae8dp.xn--p1ai";

/** Хосты, с которых нужен один 301 сразу на канонический HTTPS (без цепочки). */
const MIRROR_HOSTS = new Set([
  "centrcatalog.ru",
  "www.centrcatalog.ru",
  `www.${CANONICAL_PUBLIC_HOSTNAME_ASCII}`,
  // Кириллическое зеркало без дефиса — уже 301 в nginx, тот же адрес и в приложении.
  "xn--80aaalhpgcamnurx3ad5do.xn--p1ai",
  "www.xn--80aaalhpgcamnurx3ad5do.xn--p1ai",
]);

export function canonicalPublicOrigin(): string {
  return DEFAULT_PUBLIC_SITE_ORIGIN;
}

/**
 * Публичный host. На localhost не подменяем его X-Forwarded-Host,
 * чтобы локальная разработка не уезжала на боевой домен.
 */
export function selectPublicHost(
  hostHeader: string | null | undefined,
  forwardedHost: string | null | undefined,
): string {
  const host = String(hostHeader || "").split(",")[0]?.trim() || "";
  const forwarded = String(forwardedHost || "").split(",")[0]?.trim() || "";
  if (host && isLoopbackHostname(normalizeHostname(host))) return host;
  return forwarded || host;
}

export function isLoopbackHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "[::1]" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local")
  );
}

/** Host без порта и регистра; кириллица и punycode сводятся к ASCII-форме. */
export function normalizeHostname(rawHost: string | null | undefined): string {
  const first = String(rawHost || "").split(",")[0]?.trim().toLowerCase() ?? "";
  if (!first) return "";
  const withoutTrailingDot = first.endsWith(".") ? first.slice(0, -1) : first;
  try {
    return new URL(`http://${withoutTrailingDot}`).hostname.toLowerCase();
  } catch {
    return withoutTrailingDot.replace(/:\d+$/, "");
  }
}

export function isCanonicalPublicHost(rawHost: string | null | undefined): boolean {
  const hostname = normalizeHostname(rawHost);
  return hostname === CANONICAL_PUBLIC_HOSTNAME_ASCII;
}

export function isMirrorPublicHost(rawHost: string | null | undefined): boolean {
  const hostname = normalizeHostname(rawHost);
  return MIRROR_HOSTS.has(hostname);
}

export function normalizePublicProtocol(rawProtocol: string | null | undefined): "http" | "https" {
  const value = String(rawProtocol || "")
    .split(",")[0]
    ?.trim()
    .toLowerCase()
    .replace(/:$/, "");
  return value === "https" ? "https" : "http";
}

export function canonicalAbsoluteUrl(pathname: string, search = ""): string {
  let path = pathname || "/";
  if (!path.startsWith("/") || path.startsWith("//")) path = "/";
  const query = !search ? "" : search.startsWith("?") ? search : `?${search}`;
  return `${canonicalPublicOrigin()}${path}${query}`;
}

/**
 * Куда отправить запрос одним 301, либо null если редирект не нужен.
 * Сравнивает host без регистра и порта. localhost и прочие домены не трогает.
 */
export function canonicalHostRedirectTarget(options: {
  host: string | null | undefined;
  protocol: string | null | undefined;
  pathname: string;
  search?: string;
}): string | null {
  const hostname = normalizeHostname(options.host);
  if (!hostname || isLoopbackHostname(hostname)) return null;

  const mirror = MIRROR_HOSTS.has(hostname);
  const canonicalHttp =
    hostname === CANONICAL_PUBLIC_HOSTNAME_ASCII &&
    normalizePublicProtocol(options.protocol) !== "https";

  if (!mirror && !canonicalHttp) return null;
  return canonicalAbsoluteUrl(options.pathname, options.search ?? "");
}

/** Счётчик и прочая аналитика: только production и только основной домен. */
export function shouldEnableProductionAnalytics(
  nodeEnv: string | undefined,
  hostname: string | null | undefined,
): boolean {
  return nodeEnv === "production" && isCanonicalPublicHost(hostname);
}
