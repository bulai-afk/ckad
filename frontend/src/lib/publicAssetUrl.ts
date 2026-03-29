/**
 * Для публичных карточек: не используем абсолютные URL на localhost / loopback,
 * иначе с продакшена подтягиваются картинки, зашитые в HTML/БД при разработке на локалке.
 */
export function sanitizePublicAssetUrl(url: string | null | undefined): string {
  if (url == null) return "";
  const u = String(url).trim();
  if (!u) return "";
  if (u.startsWith("data:")) return u;
  if (u.startsWith("/")) return u;
  try {
    const parsed = new URL(u);
    const h = parsed.hostname.toLowerCase();
    if (h === "localhost" || h === "127.0.0.1" || h === "[::1]") return "";
    return u;
  } catch {
    return "";
  }
}
