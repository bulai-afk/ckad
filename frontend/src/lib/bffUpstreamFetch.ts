import type { NextRequest } from "next/server";

/** Запрос из админки (cookie admin_auth) — без CDN-кэша списков. */
export function isAdminSessionRequest(req: NextRequest | Request): boolean {
  const cookie = req.headers.get("cookie") ?? "";
  return /(?:^|;\s*)admin_auth=1(?:;|$)/.test(cookie);
}

export function upstreamPagesListInit(
  req: NextRequest | Request,
): RequestInit & { next?: { revalidate: number } } {
  if (isAdminSessionRequest(req)) {
    return { cache: "no-store", headers: { Accept: "application/json" } };
  }
  return {
    cache: "force-cache",
    next: { revalidate: 120 },
    headers: { Accept: "application/json" },
  };
}
