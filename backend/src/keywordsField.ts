/** Лимит meta keywords: ~15–20 фраз без обрезки посередине запроса. */
export const PAGE_KEYWORDS_MAX = 1000;

export function truncateKeywordsField(value: string, maxLen = PAGE_KEYWORDS_MAX): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxLen) return trimmed;
  const cut = trimmed.slice(0, maxLen);
  const lastComma = cut.lastIndexOf(",");
  if (lastComma > 0) return cut.slice(0, lastComma).trim();
  return cut.trim();
}

export function sanitizeKeywordsField(value: unknown, maxLen = PAGE_KEYWORDS_MAX): string {
  if (typeof value !== "string") return "";
  return truncateKeywordsField(value, maxLen);
}
