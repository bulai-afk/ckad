/** Лимит meta keywords: достаточно для ~15–20 фраз, без обрезки посередине запроса. */
export const PAGE_KEYWORDS_MAX = 1000;

/** Собирает строку keywords, укладывая только целые фразы в лимит. */
export function joinKeywordsWithinLimit(keywords: string[], maxLen = PAGE_KEYWORDS_MAX): string {
  const parts: string[] = [];
  for (const raw of keywords) {
    const kw = raw.trim();
    if (!kw) continue;
    const next = parts.length > 0 ? `${parts.join(", ")}, ${kw}` : kw;
    if (next.length > maxLen) break;
    parts.push(kw);
  }
  return parts.join(", ");
}

/** Обрезает введённую строку по границе запятой, не рвёт фразу посередине. */
export function truncateKeywordsField(value: string, maxLen = PAGE_KEYWORDS_MAX): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxLen) return trimmed;
  const cut = trimmed.slice(0, maxLen);
  const lastComma = cut.lastIndexOf(",");
  if (lastComma > 0) return cut.slice(0, lastComma).trim();
  return cut.trim();
}
