import { apiBaseUrl } from "./apiBaseUrl";

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
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function apiGet<T>(path: string, timeoutMs = 2500): Promise<T> {
  const res = await fetchWithTimeout(apiUrl(path), undefined, timeoutMs);
  if (!res.ok) {
    throw new Error(`GET ${path} failed with ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function apiPost<T>(
  path: string,
  body: unknown,
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
    8000,
  );
  if (!res.ok) {
    throw new Error(`POST ${path} failed with ${res.status}`);
  }
  return res.json();
}

export async function apiPut<T>(
  path: string,
  body: unknown,
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
    8000,
  );

  if (!res.ok) {
    throw new Error(`PUT ${path} failed with ${res.status}`);
  }

  return res.json();
}

export async function apiDelete(path: string): Promise<void> {
  const res = await fetchWithTimeout(
    apiUrl(path),
    {
      method: "DELETE",
    },
    8000,
  );

  if (!res.ok) {
    throw new Error(`DELETE ${path} failed with ${res.status}`);
  }
}
