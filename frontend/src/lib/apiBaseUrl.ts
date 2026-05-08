import { backendApiUrl } from "./backendApiUrl";

/**
 * Базовый URL для запросов к backend API.
 * - В браузере: всегда пустая строка → same-origin `/api/*` (Next Route Handlers → Express).
 * - На сервере (SSR): см. `backendApiUrl()` — сначала внутренний `BACKEND_API_URL` / `API_URL`.
 */
export function apiBaseUrl(): string {
  if (typeof window !== "undefined") {
    return "";
  }
  return backendApiUrl();
}
