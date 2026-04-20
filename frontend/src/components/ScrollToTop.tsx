"use client";

import { useLayoutEffect, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function scrollTop() {
  window.scrollTo(0, 0);
}

/**
 * После перехода по сайту и при полном обновлении страницы показываем контент сверху,
 * без восстановления прежней позиции прокрутки.
 */
export function ScrollToTop() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams?.toString() ?? "";

  useLayoutEffect(() => {
    scrollTop();
  }, [pathname, search]);

  useEffect(() => {
    if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) scrollTop();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  return null;
}
