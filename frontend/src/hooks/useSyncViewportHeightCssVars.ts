"use client";

import { useEffect } from "react";

/**
 * Пишет на document.documentElement (для calc() в CSS):
 * - --vh: 1% от window.innerHeight в px (как «стабильный vh» на мобилках).
 * - --vh-visual: 1% от visualViewport.height, если есть — ближе к реально видимой области (клавиатура, полоски UI).
 * - --viewport-height-px: целая высота innerHeight (px), для редких calc без dvh.
 *
 * В CSS: высота 85% экрана → height: calc(var(--vh) * 85);
 * Предпочтительно также использовать dvh/svh (см. баннер max-h-[min(92dvh,92svh)]).
 */
export function useSyncViewportHeightCssVars(): void {
  useEffect(() => {
    const apply = () => {
      const inner = window.innerHeight;
      const unit = inner * 0.01;
      document.documentElement.style.setProperty("--vh", `${unit}px`);
      document.documentElement.style.setProperty("--viewport-height-px", `${inner}px`);

      const vv = window.visualViewport;
      if (vv) {
        document.documentElement.style.setProperty("--vh-visual", `${vv.height * 0.01}px`);
        document.documentElement.style.setProperty("--viewport-visual-height-px", `${Math.round(vv.height)}px`);
      } else {
        document.documentElement.style.setProperty("--vh-visual", `${unit}px`);
        document.documentElement.style.removeProperty("--viewport-visual-height-px");
      }
    };

    apply();
    window.addEventListener("resize", apply);
    window.addEventListener("orientationchange", apply);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", apply);
    vv?.addEventListener("scroll", apply);

    return () => {
      window.removeEventListener("resize", apply);
      window.removeEventListener("orientationchange", apply);
      vv?.removeEventListener("resize", apply);
      vv?.removeEventListener("scroll", apply);
    };
  }, []);
}
