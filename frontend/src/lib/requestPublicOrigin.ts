import { DEFAULT_PUBLIC_SITE_ORIGIN } from "@/lib/hubFolderMetadata";

function isLoopbackHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h.endsWith(".local");
}

/**
 * Публичный origin для редиректов из Route Handlers и middleware.
 * За nginx `req.url` часто указывает на 127.0.0.1:3000 — берём Host / X-Forwarded-*.
 */
export function requestPublicOrigin(req: Request): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "") ||
    process.env.SITE_URL?.trim().replace(/\/+$/, "") ||
    "";
  if (fromEnv) return fromEnv;

  const forwardedHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || req.headers.get("host")?.trim();
  if (host) {
    const hostname = host.split(":")[0] ?? host;
    const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    let proto = forwardedProto;
    if (!proto) {
      try {
        proto = new URL(req.url).protocol.replace(":", "");
      } catch {
        proto = isLoopbackHost(hostname) ? "http" : "https";
      }
    }
    if (isLoopbackHost(hostname) && proto === "https") {
      proto = "http";
    }
    return `${proto}://${host}`.replace(/\/+$/, "");
  }

  try {
    const url = new URL(req.url);
    if (!isLoopbackHost(url.hostname)) {
      return url.origin;
    }
  } catch {
    /* fallback */
  }

  return DEFAULT_PUBLIC_SITE_ORIGIN;
}
