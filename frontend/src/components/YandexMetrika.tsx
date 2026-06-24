"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
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
  const skipNextHitRef = useRef(true);

  useEffect(() => {
    if (!isYandexMetrikaConfigured() || isAdminPath(pathname)) return;
    initYandexMetrika();
    skipNextHitRef.current = true;
  }, [pathname]);

  useEffect(() => {
    if (!isYandexMetrikaConfigured() || isAdminPath(pathname) || !pathname) return;

    const url = buildPageUrl(pathname, searchParams);
    if (skipNextHitRef.current) {
      skipNextHitRef.current = false;
      return;
    }
    trackYandexMetrikaHit(url);
  }, [pathname, searchParams]);

  return null;
}
