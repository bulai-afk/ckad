export type PageDisplayOrderMap = Record<string, string[]>;

export function normalizeOrderSlug(input: string): string {
  return input
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .toLowerCase();
}

export function normalizePageDisplayOrderMap(raw: unknown): PageDisplayOrderMap {
  if (typeof raw !== "object" || raw === null) return {};
  const out: PageDisplayOrderMap = {};
  for (const [sectionKey, value] of Object.entries(raw as Record<string, unknown>)) {
    const section = normalizeOrderSlug(sectionKey);
    if (!section || !Array.isArray(value)) continue;
    const seen = new Set<string>();
    const slugs = value
      .map((entry) => normalizeOrderSlug(String(entry || "")))
      .filter((slug) => slug && (slug === section || slug.startsWith(`${section}/`)))
      .filter((slug) => {
        if (seen.has(slug)) return false;
        seen.add(slug);
        return true;
      });
    out[section] = slugs;
  }
  return out;
}

export function sortBySectionDisplayOrder<T>(
  items: T[],
  sectionSlug: string,
  getSlug: (item: T) => string,
  orderBySection: PageDisplayOrderMap,
  fallback: (a: T, b: T) => number,
): T[] {
  const section = normalizeOrderSlug(sectionSlug);
  const order = orderBySection[section] ?? [];
  const rank = new Map<string, number>(order.map((slug, index) => [normalizeOrderSlug(slug), index]));
  const out = [...items];
  out.sort((a, b) => {
    const aRank = rank.get(normalizeOrderSlug(getSlug(a)));
    const bRank = rank.get(normalizeOrderSlug(getSlug(b)));
    if (aRank !== undefined && bRank !== undefined) return aRank - bRank;
    if (aRank !== undefined) return -1;
    if (bRank !== undefined) return 1;
    return fallback(a, b);
  });
  return out;
}

