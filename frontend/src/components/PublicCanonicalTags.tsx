"use client";

import { usePathname } from "next/navigation";
import { canonicalAbsoluteUrl } from "@/lib/publicSiteHosts";

const SKIP_PREFIXES = ["/admin", "/api"];

/**
 * canonical и og:url всегда на https://центр-каталогизации.рф + текущий путь.
 * Не через Metadata API: Next записывает абсолютный URL как punycode (URL.href)
 * и не даёт собрать его из Host.
 */
export function PublicCanonicalTags() {
  const pathname = usePathname() || "/";
  if (!pathname.startsWith("/") || pathname.startsWith("//")) return null;
  if (SKIP_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return null;
  }

  const href = canonicalAbsoluteUrl(pathname);
  return (
    <>
      <link rel="canonical" href={href} />
      <meta property="og:url" content={href} />
    </>
  );
}
