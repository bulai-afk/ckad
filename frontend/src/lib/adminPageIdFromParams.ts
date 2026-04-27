/** Числовой id страницы из useParams() (Next может отдать string | string[]). */
export function adminPageIdFromParams(params: { id?: string | string[] } | null): number {
  const raw = params?.id;
  const s = Array.isArray(raw) ? raw[0] : raw;
  if (typeof s !== "string" || !s.trim()) return Number.NaN;
  const n = Number(s);
  return Number.isFinite(n) ? n : Number.NaN;
}
