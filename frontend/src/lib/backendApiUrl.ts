/**
 * Базовый URL Express-бэкенда на сервере Next.js (SSR и Route Handlers).
 *
 * Приоритет: `BACKEND_API_URL` / `API_URL` (внутренний адрес) → иначе публичный
 * `NEXT_PUBLIC_API_URL`, если это не loopback/частная сеть → иначе `http://127.0.0.1:4000`.
 *
 * На проде задавайте `BACKEND_API_URL=http://127.0.0.1:4000` (или сокет к backend-сервису),
 * чтобы не ходить на сайт «через интернет» при каждом SSR-запросе.
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

export function backendApiUrl(): string {
  const internalRaw =
    process.env.BACKEND_API_URL?.trim() || process.env.API_URL?.trim() || "";
  const internal = internalRaw.replace(/\/+$/, "");
  if (internal) return internal;

  // Route Handlers на сервере всегда ходят на локальный Express, не на публичный URL.
  if (typeof window === "undefined" && process.env.NODE_ENV === "production") {
    return "http://127.0.0.1:4000";
  }

  const pubRaw = process.env.NEXT_PUBLIC_API_URL?.trim() || "";
  const pub = pubRaw.replace(/\/+$/, "");
  if (pub && !isLocalNetworkHttpOrigin(pub)) return pub;

  return "http://127.0.0.1:4000";
}
