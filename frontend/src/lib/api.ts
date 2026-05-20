import { apiBaseUrl } from "./apiBaseUrl";

function parseApiErrorDetail(bodyText: string, fallback: string): string {
  const compact = bodyText.replace(/\s+/g, " ").trim().slice(0, 220);
  try {
    const j = JSON.parse(bodyText) as { error?: unknown; message?: unknown };
    if (typeof j?.error === "string" && j.error.trim()) return j.error.trim();
    if (typeof j?.message === "string" && j.message.trim()) return j.message.trim();
  } catch {
    /* compact */
  }
  return compact || fallback;
}

/** Ошибка HTTP при запросах к API (статус и путь для UI). */
export class ApiHttpError extends Error {
  readonly status: number;
  readonly path: string;
  readonly bodyText: string;

  constructor(method: string, path: string, status: number, bodyText: string) {
    const detail = parseApiErrorDetail(bodyText, "");
    super(
      detail
        ? `${method} ${path} failed (${status}): ${detail}`
        : `${method} ${path} failed with ${status}`,
    );
    this.name = "ApiHttpError";
    this.status = status;
    this.path = path;
    this.bodyText = bodyText;
  }
}

/** Ошибка HTTP при apiGet (статус и путь для UI). */
export class ApiRequestError extends Error {
  readonly status: number;
  readonly path: string;
  readonly bodyText: string;

  constructor(path: string, status: number, bodyText: string) {
    const compact = bodyText.replace(/\s+/g, " ").trim().slice(0, 220);
    let detail = compact;
    try {
      const j = JSON.parse(bodyText) as { error?: unknown; message?: unknown };
      if (typeof j?.error === "string" && j.error.trim()) detail = j.error.trim();
      else if (typeof j?.message === "string" && j.message.trim()) detail = j.message.trim();
    } catch {
      /* оставляем compact */
    }
    super(
      compact
        ? `GET ${path} failed (${status}): ${detail}`
        : `GET ${path} failed with ${status}`,
    );
    this.name = "ApiRequestError";
    this.status = status;
    this.path = path;
    this.bodyText = bodyText;
  }
}

/** GET `/api/pages/:id` (числовой id) — редактор и предпросмотр. */
export function isPageByIdApiPath(path: string): boolean {
  return /^\/api\/pages\/\d+$/.test(path);
}

function isAbortError(e: unknown): boolean {
  if (typeof e !== "object" || e === null) return false;
  return (e as { name?: string }).name === "AbortError";
}

function apiUrl(path: string): string {
  const base = apiBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...(init || {}), signal: controller.signal });
  } catch (e: unknown) {
    // Браузер/Node могут логировать «Fetch is aborted»; заменяем на обычную ошибку.
    if (isAbortError(e)) {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
}

/** По умолчанию 10s: короткий таймаут в dev (Turbopack/холодный старт) давал AbortError в консоли. */
export async function apiGet<T>(path: string, timeoutMs = 10_000): Promise<T> {
  const res = await fetchWithTimeout(
    apiUrl(path),
    { cache: "no-store" },
    timeoutMs,
  );
  const text = await res.text();
  if (!res.ok) {
    throw new ApiRequestError(path, res.status, text);
  }
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error(`GET ${path}: empty response`);
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    throw new Error(`GET ${path}: response is not JSON`);
  }
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  timeoutMs = 8000,
): Promise<T> {
  const res = await fetchWithTimeout(
    apiUrl(path),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
    timeoutMs,
  );
  const text = await res.text();
  if (!res.ok) {
    throw new ApiHttpError("POST", path, res.status, text);
  }
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error(`POST ${path}: empty response`);
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    throw new Error(`POST ${path}: response is not JSON`);
  }
}

export async function apiPut<T>(
  path: string,
  body: unknown,
  /** Большие JSON (data URL картинок) — увеличьте при сохранении каруселей. */
  timeoutMs = 8000,
): Promise<T> {
  const res = await fetchWithTimeout(
    apiUrl(path),
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
    timeoutMs,
  );

  const text = await res.text();
  if (!res.ok) {
    throw new ApiHttpError("PUT", path, res.status, text);
  }
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error(`PUT ${path}: empty response`);
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    throw new Error(`PUT ${path}: response is not JSON`);
  }
}

export async function apiDelete(path: string): Promise<void> {
  const res = await fetchWithTimeout(
    apiUrl(path),
    {
      method: "DELETE",
    },
    8000,
  );

  const text = await res.text();
  if (!res.ok) {
    throw new ApiHttpError("DELETE", path, res.status, text);
  }
}

export function formatApiErrorForUi(e: unknown, fallback: string): string {
  if (e instanceof ApiHttpError) {
    if (e.status === 409) {
      return "Страница с таким служебным адресом уже есть — измените адрес (slug).";
    }
    if (e.status === 400) {
      return "Проверьте название и служебный адрес страницы.";
    }
    const detail = parseApiErrorDetail(e.bodyText, "");
    if (detail === "Slug must be unique") {
      return "Страница с таким служебным адресом уже есть — измените адрес (slug).";
    }
    if (detail) return detail;
  }
  if (e instanceof Error && /timed out/i.test(e.message)) {
    return "Сервер не ответил вовремя. Уменьшите превью или повторите попытку.";
  }
  return fallback;
}
