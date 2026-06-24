"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  hasCookieConsent,
  subscribeCookieConsent,
} from "@/lib/cookieConsent";
import {
  initYandexMetrika,
  isYandexMetrikaConfigured,
  trackYandexMetrikaHit,
} from "@/lib/yandexMetrika";

function buildPageUrl(pathname: string, searchParams: URLSearchParams): string {
  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function isAdminPath(pathname: string | null): boolean {
  return Boolean(pathname?.startsWith("/admin"));
}

export function YandexMetrika() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [consented, setConsented] = useState(false);
  const skipNextHitRef = useRef(true);

  useEffect(() => {
    if (!isYandexMetrikaConfigured()) return;
    setConsented(hasCookieConsent());
    return subscribeCookieConsent(() => setConsented(true));
  }, []);

  useEffect(() => {
    if (!consented || isAdminPath(pathname)) return;
    initYandexMetrika();
    skipNextHitRef.current = true;
  }, [consented, pathname]);

  useEffect(() => {
    if (!consented || isAdminPath(pathname) || !pathname) return;

    const url = buildPageUrl(pathname, searchParams);
    if (skipNextHitRef.current) {
      skipNextHitRef.current = false;
      return;
    }
    trackYandexMetrikaHit(url);
  }, [consented, pathname, searchParams]);

  return null;
}
