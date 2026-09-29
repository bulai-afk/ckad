"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  initYandexMetrika,
  isYandexMetrikaEnabled,
  trackYandexMetrikaHit,
} from "@/lib/yandexMetrika";

function isAdminPath(pathname: string | null): boolean {
  return Boolean(pathname?.startsWith("/admin"));
}

function buildPageUrl(pathname: string): string {
  if (typeof window === "undefined") return pathname;
  const query = window.location.search;
  return query ? `${pathname}${query}` : pathname;
}

export function YandexMetrika() {
  const pathname = usePathname();
  const skipNextHitRef = useRef(true);

  useEffect(() => {
    if (!isYandexMetrikaEnabled() || isAdminPath(pathname)) return;
    initYandexMetrika();
    skipNextHitRef.current = true;
  }, [pathname]);

  useEffect(() => {
    if (!isYandexMetrikaEnabled() || isAdminPath(pathname) || !pathname) return;

    const url = buildPageUrl(pathname);
    if (skipNextHitRef.current) {
      skipNextHitRef.current = false;
      return;
    }
    trackYandexMetrikaHit(url);
  }, [pathname]);

  return null;
}
