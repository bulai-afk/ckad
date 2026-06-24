"use client";

import { useEffect } from "react";
import {
  YM_TRACKABLE_CTA_SELECTOR,
  trackCtaElementMetrikaGoal,
} from "@/lib/yandexMetrika";

export function CtaYandexMetrikaTracker() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = (event.target as Element | null)?.closest?.(YM_TRACKABLE_CTA_SELECTOR);
      if (!target) return;
      trackCtaElementMetrikaGoal(target);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
