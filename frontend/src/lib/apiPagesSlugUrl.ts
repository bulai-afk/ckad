/**
 * Путь `/api/pages/slug/...` с несколькими сегментами (каждый encodeURIComponent).
 * Не использовать один сегмент с `%2F` — после деплоя nginx/прокси часто отдают 404.
 */
export function apiPagesSlugRequestPath(slugOrSegments: string | string[]): string {
  const segments = Array.isArray(slugOrSegments)
    ? slugOrSegments
    : slugOrSegments
        .trim()
        .replace(/^\/+|\/+$/g, "")
        .split("/")
        .filter(Boolean);
  if (segments.length === 0) return "/api/pages/slug";
  return `/api/pages/slug/${segments.map((s) => encodeURIComponent(s)).join("/")}`;
}
