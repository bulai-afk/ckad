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

const PAGE_SLUG_DATA_TAG_PREFIX = "page-slug-data:";

/**
 * Тег для `fetch(..., { next: { tags } })` при загрузке страницы по slug на SSR.
 * После сохранения в админке вызывается `revalidateTag` с тем же тегом — иначе
 * `revalidatePath` не сбрасывает кэш запросов на абсолютный URL бэкенда.
 */
export function apiPagesSlugDataCacheTag(slugOrSegments: string | string[]): string {
  const segments = Array.isArray(slugOrSegments)
    ? slugOrSegments.filter(Boolean)
    : slugOrSegments
        .trim()
        .replace(/^\/+|\/+$/g, "")
        .split("/")
        .filter(Boolean);
  if (segments.length === 0) return `${PAGE_SLUG_DATA_TAG_PREFIX}_`;
  const path = segments.map((s) => encodeURIComponent(s)).join("/");
  return `${PAGE_SLUG_DATA_TAG_PREFIX}${path}`;
}
