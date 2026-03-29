/**
 * Базовый URL для запросов к backend API.
 * - В браузере без NEXT_PUBLIC_API_URL: пустая строка → тот же origin (Next проксирует в Express).
 * - На сервере (SSR, route handlers): BACKEND_API_URL / API_URL / 127.0.0.1:4000.
 */
export function apiBaseUrl(): string {
  const env = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (env) return env.replace(/\/$/, "");
  if (typeof window !== "undefined") return "";
  return (
    process.env.BACKEND_API_URL?.trim() ||
    process.env.API_URL?.trim() ||
    "http://127.0.0.1:4000"
  );
}
