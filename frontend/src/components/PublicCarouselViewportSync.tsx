"use client";

import { useEffect } from "react";
import {
  getCarouselSlideWidthPx,
  getCarouselVisibleSlides,
  refreshCarouselStripTranslateAfterLayout,
  shiftCarouselStripBySlide,
} from "@/lib/pageWebCarouselTranslate";

function syncCarouselsInDocument() {
  document.querySelectorAll(".page-content .page-web-carousel-viewport").forEach((node) => {
    const vp = node as HTMLElement;
    if (!vp.querySelector(":scope > .page-web-carousel-strip")) {
      vp.style.removeProperty("--carousel-inner-px");
      vp.style.removeProperty("--carousel-slide-px");
      return;
    }
    const cs = getComputedStyle(vp);
    const pl = parseFloat(cs.paddingLeft) || 0;
    const pr = parseFloat(cs.paddingRight) || 0;
    const inner = Math.max(0, vp.clientWidth - pl - pr);
    const slidePx = getCarouselSlideWidthPx(inner, getCarouselVisibleSlides(vp));
    vp.style.setProperty("--carousel-inner-px", `${inner}px`);
    vp.style.setProperty("--carousel-slide-px", `${slidePx}px`);
    const strip = vp.querySelector(":scope > .page-web-carousel-strip") as HTMLElement | null;
    strip?.style.removeProperty("width");
    refreshCarouselStripTranslateAfterLayout(vp);
  });
}

/** Публичная страница: карусель на grid + cqi; transform-навигация из lib. */
export function PublicCarouselViewportSync() {
  useEffect(() => {
    const run = () => syncCarouselsInDocument();
    run();
    const ro = new ResizeObserver(run);
    document.querySelectorAll(".page-content .page-web-carousel-viewport").forEach((el) => ro.observe(el));
    document.querySelectorAll(".page-content").forEach((el) => ro.observe(el));
    window.addEventListener("resize", run);

    const onClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (!el.closest?.(".page-content")) return;
      const prev = el.closest?.(".page-web-carousel-prev");
      const next = el.closest?.(".page-web-carousel-next");
      if (!prev && !next) return;
      const arrowBtn = el.closest(".page-web-carousel-arrow") as HTMLButtonElement | null;
      if (arrowBtn?.disabled) return;
      const carousel = el.closest(".page-web-carousel");
      if (!carousel) return;
      const vp = carousel.querySelector(".page-web-carousel-viewport") as HTMLElement | null;
      if (!vp?.querySelector(":scope > .page-web-carousel-strip")) return;
      e.preventDefault();
      shiftCarouselStripBySlide(vp, prev ? -1 : 1);
    };
    document.addEventListener("click", onClick);

    let touchStartX = 0;
    let touchCarouselVp: HTMLElement | null = null;

    const onTouchStart = (e: TouchEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest?.(".page-content")) return;
      const vp = t.closest?.(".page-web-carousel-viewport") as HTMLElement | null;
      if (!vp?.querySelector(":scope > .page-web-carousel-strip")) return;
      touchStartX = e.changedTouches[0].screenX;
      touchCarouselVp = vp;
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!touchCarouselVp) return;
      const endX = e.changedTouches[0].screenX;
      const d = endX - touchStartX;
      if (d < -50) shiftCarouselStripBySlide(touchCarouselVp, 1);
      else if (d > 50) shiftCarouselStripBySlide(touchCarouselVp, -1);
      touchCarouselVp = null;
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("resize", run);
      ro.disconnect();
      document.removeEventListener("click", onClick);
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, []);
  return null;
}
