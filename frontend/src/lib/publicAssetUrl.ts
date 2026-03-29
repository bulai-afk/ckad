/**
 * Для публичных карточек: не используем абсолютные URL на localhost / loopback,
 * иначе с продакшена подтягиваются картинки, зашитые в HTML/БД при разработке на локалке.
 *
 * Путь вида `/длинный-slug-без-расширения` не считается картинкой: иначе браузер запрашивает
 * его как страницу и получает 404 (частая ошибка, если в превью папки попал slug).
 */
export function sanitizePublicAssetUrl(url: string | null | undefined): string {
  if (url == null) return "";
  const u = String(url).trim();
  if (!u) return "";
  if (u.startsWith("data:")) return u;
  if (u.startsWith("/")) {
    const pathOnly = u.split("?")[0] ?? "";
    if (
      pathOnly.startsWith("/api/") ||
      pathOnly.startsWith("/_next/") ||
      pathOnly.startsWith("/favicon")
    ) {
      return u;
    }
    const lastSeg = pathOnly.split("/").filter(Boolean).pop() ?? "";
    if (/\.(svg|png|jpe?g|webp|gif|ico|woff2?)$/i.test(lastSeg)) {
      return u;
    }
    return "";
  }
  try {
    const parsed = new URL(u);
    const h = parsed.hostname.toLowerCase();
    if (h === "localhost" || h === "127.0.0.1" || h === "[::1]") return "";
    return u;
  } catch {
    return "";
  }
}
