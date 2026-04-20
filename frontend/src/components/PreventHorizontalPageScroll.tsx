"use client";

import { useEffect } from "react";

/**
 * Some mobile browsers (notably iOS Safari) allow sideways "page panning"
 * even when overflow-x is hidden/clip, especially with transformed children.
 * This component force-resets horizontal scroll and blocks horizontal swipes.
 */
export function PreventHorizontalPageScroll() {
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    const reset = () => {
      if (root.scrollLeft) root.scrollLeft = 0;
      if (body.scrollLeft) body.scrollLeft = 0;
    };

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(reset);
    };

    let startX = 0;
    let startY = 0;
    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      startX = t.clientX;
      startY = t.clientY;
    };

    const HORIZONTAL_LOCK_PX = 14;
    const VERTICAL_ALLOW_PX = 8;
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      // Do not interfere with normal vertical scrolling.
      if (absDy >= VERTICAL_ALLOW_PX && absDy >= absDx) return;
      // Block only clearly horizontal gestures.
      if (absDx >= HORIZONTAL_LOCK_PX && absDx > absDy * 1.5) {
        e.preventDefault();
        reset();
      }
    };

    reset();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  return null;
}

