/**
 * Базовый URL для запросов к backend API.
 * - В браузере без NEXT_PUBLIC_API_URL: пустая строка → тот же origin (Next проксирует в Express).
 * - На сервере (SSR, route handlers): BACKEND_API_URL / API_URL / 127.0.0.1:4000.
 *
 * Если NEXT_PUBLIC_API_URL указывает на localhost / 127.0.0.1 / частную сеть / *.local,
 * в браузере он игнорируется (пустая строка). Иначе Chrome на публичном HTTPS блокирует
 * такие запросы (Local Network Access / Private Network Access).
 */
function isLocalNetworkHttpOrigin(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    const h = u.hostname.toLowerCase();
    if (h === "localhost" || h === "[::1]") return true;
    if (h.endsWith(".local")) return true;
    if (h === "127.0.0.1") return true;

    const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
    if (!m) return false;
    const a = Number(m[1]);
    const b = Number(m[2]);
    const c = Number(m[3]);
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 169 && b === 254) return true;
    if (a === 192 && b === 0 && c === 0) return true;
    return false;
  } catch {
    return false;
  }
}

export function apiBaseUrl(): string {
  const envRaw = process.env.NEXT_PUBLIC_API_URL?.trim();
  const env = envRaw ? envRaw.replace(/\/$/, "") : "";

  if (typeof window !== "undefined") {
    if (!env) return "";
    if (isLocalNetworkHttpOrigin(env)) return "";
    return env;
  }

  if (env) return env;
  return (
    process.env.BACKEND_API_URL?.trim() ||
    process.env.API_URL?.trim() ||
    "http://127.0.0.1:4000"
  );
}
