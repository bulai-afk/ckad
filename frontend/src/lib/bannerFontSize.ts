/**
 * Размеры заголовка/подзаголовка баннера хранятся в «процентах» (75–400) от базы BannerTextOverlayBand.
 * Поддерживаем числа и строки из JSON; старые данные в px (≤64) переводим в %.
 */
function coerceToFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const t = value.trim().replace(",", ".");
    if (t === "") return undefined;
    const p = parseFloat(t);
    if (Number.isFinite(p)) return p;
  }
  return undefined;
}

export function normalizeFontSizeToPercent(value: unknown): number {
  const n = coerceToFiniteNumber(value);
  if (n === undefined || Number.isNaN(n)) return 200;
  // Backward compatibility: old saved values were in px (usually <= 64).
  if (n > 0 && n <= 64) {
    return Math.max(75, Math.min(400, Math.round((n / 16) * 100)));
  }
  return Math.max(75, Math.min(400, Math.round(n)));
}
