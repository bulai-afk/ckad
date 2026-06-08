"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { BANNER_COVER_MOBILE_MAX_WIDTH_PX } from "@/lib/bannerCoverPresets";
import { bannerDebugEnabled, logBannerDebug } from "@/lib/bannerDebugLog";

const BANNER_MOBILE_MQL = `(max-width: ${BANNER_COVER_MOBILE_MAX_WIDTH_PX}px)`;

type SlideWithId = { id: string };

type BannerCarouselFrameProps<TSlide extends SlideWithId> = {
  slides: TSlide[];
  activeIndex: number;
  onSelectSlide: (index: number) => void;
  swipeProps?: HTMLAttributes<HTMLDivElement>;
  roundedClassName?: string;
  aspectClassName?: string;
  /** На главной ≤1205px — высота cover по контенту, как на странице клиента. */
  mobileDynamicHeight?: boolean;
  renderSlide: (slide: TSlide, index: number) => ReactNode;
};

export function BannerCarouselFrame<TSlide extends SlideWithId>({
  slides,
  activeIndex,
  onSelectSlide,
  swipeProps,
  roundedClassName = "rounded-xl",
  aspectClassName = "aspect-[2/1] w-full min-h-px",
  mobileDynamicHeight = false,
  renderSlide,
}: BannerCarouselFrameProps<TSlide>) {
  const [mobileUniformHeight, setMobileUniformHeight] = useState<number | null>(null);
  const slideMeasureRefs = useRef<(HTMLDivElement | null)[]>([]);
  slideMeasureRefs.current.length = slides.length;

  const mobileHeightLocked = mobileDynamicHeight && mobileUniformHeight != null;
  const swipeShellClass = mobileDynamicHeight
    ? mobileHeightLocked
      ? "max-[1205px]:relative max-[1205px]:h-full max-[1205px]:min-h-0 max-[1205px]:overflow-hidden min-[1206px]:absolute min-[1206px]:inset-0 min-[1206px]:min-h-0 min-[1206px]:overflow-hidden"
      : "max-[1205px]:relative max-[1205px]:h-auto max-[1205px]:overflow-visible min-[1206px]:absolute min-[1206px]:inset-0 min-[1206px]:min-h-0 min-[1206px]:overflow-hidden"
    : "absolute inset-0 min-h-0 overflow-hidden";
  const trackClass = mobileDynamicHeight
    ? mobileHeightLocked
      ? "flex h-full min-h-0 w-full min-w-0 max-w-none transition-transform duration-300 ease-out"
      : "flex max-[1205px]:h-auto min-[1206px]:h-full min-h-0 w-full min-w-0 max-w-none transition-transform duration-300 ease-out"
    : "flex h-full min-h-0 w-full min-w-0 max-w-none transition-transform duration-300 ease-out";
  const slideShellClass = mobileDynamicHeight
    ? mobileHeightLocked
      ? "box-border h-full min-h-0 min-w-0 shrink-0 overflow-hidden"
      : "box-border max-[1205px]:h-auto min-[1206px]:h-full min-h-0 min-w-0 shrink-0 overflow-hidden"
    : "box-border h-full min-h-0 min-w-0 shrink-0 overflow-hidden";
  const aspectRef = useRef<HTMLDivElement>(null);
  const n = slides.length;
  /** Явная ширина полосы и слайдов — в Safari иначе flex-% часто даёт 0 высоты у aspect-ratio внутри. */
  const trackStyle =
    n > 0
      ? {
          width: `${n * 100}%` as const,
          transform: `translateX(-${(activeIndex * 100) / n}%)` as const,
        }
      : { width: "100%" as const, transform: "translateX(0)" as const };
  const slideBasisPct = n > 0 ? 100 / n : 100;
  const hasDots = n > 1;
  const aspectRoundedClass = hasDots
    ? roundedClassName === "rounded-none"
      ? "rounded-none"
      : `${roundedClassName.replace(/^rounded-/u, "rounded-t-")} rounded-b-none`
    : roundedClassName;
  const dotsBarRoundedClass =
    hasDots && roundedClassName !== "rounded-none"
      ? roundedClassName.replace(/^rounded-/u, "rounded-b-")
      : "";

  useEffect(() => {
    if (!mobileDynamicHeight) {
      setMobileUniformHeight(null);
      return;
    }

    const mq = window.matchMedia(BANNER_MOBILE_MQL);

    const measureSlideHeights = () => {
      if (!mq.matches) {
        setMobileUniformHeight(null);
        return;
      }

      requestAnimationFrame(() => {
        let maxH = 0;
        for (const el of slideMeasureRefs.current) {
          if (!el) continue;
          const coverRoot = el.querySelector("[data-home-banner-cover]") as HTMLElement | null;
          const cover = el.querySelector(".page-web-cover") as HTMLElement | null;
          const measured = Math.max(
            coverRoot?.scrollHeight ?? 0,
            cover?.scrollHeight ?? 0,
            el.scrollHeight,
          );
          maxH = Math.max(maxH, measured);
        }
        if (maxH > 0) {
          setMobileUniformHeight((prev) => (prev === maxH ? prev : maxH));
        }
      });
    };

    measureSlideHeights();

    const ro = new ResizeObserver(() => measureSlideHeights());
    for (const el of slideMeasureRefs.current) {
      if (!el) continue;
      ro.observe(el);
      const coverRoot = el.querySelector("[data-home-banner-cover]");
      const cover = el.querySelector(".page-web-cover");
      if (coverRoot instanceof HTMLElement) ro.observe(coverRoot);
      if (cover instanceof HTMLElement) ro.observe(cover);
    }

    mq.addEventListener("change", measureSlideHeights);
    window.addEventListener("resize", measureSlideHeights);

    return () => {
      ro.disconnect();
      mq.removeEventListener("change", measureSlideHeights);
      window.removeEventListener("resize", measureSlideHeights);
    };
  }, [mobileDynamicHeight, slides, activeIndex]);

  useEffect(() => {
    if (!bannerDebugEnabled()) return;
    const el = aspectRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let t: number | undefined;
    const report = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const r = el.getBoundingClientRect();
          const cs = window.getComputedStyle(el);
          const beforeCs =
            typeof window.getComputedStyle === "function"
              ? window.getComputedStyle(el, "::before")
              : null;
          const h = r.height || 1;
          logBannerDebug("frame:aspect-box", {
            width: Math.round(r.width),
            height: Math.round(r.height),
            widthOverHeight: Math.round((r.width / h) * 1000) / 1000,
            expectWidthOverHeight: "mobile: dynamic/auto, desktop: aspect-ratio from data-cover-aspect",
            computedAspectRatio: cs.aspectRatio,
            computedPaddingBottom: cs.paddingBottom,
            boxSizing: cs.boxSizing,
            beforePaddingBottom: beforeCs?.paddingBottom ?? "",
          });
        });
      });
    };
    const ro = new ResizeObserver(() => {
      window.clearTimeout(t);
      t = window.setTimeout(report, 120);
    });
    ro.observe(el);
    report();
    return () => {
      window.clearTimeout(t);
      ro.disconnect();
    };
  }, [n]);

  return (
    <div className={`relative min-w-0 max-w-full overflow-hidden bg-slate-100 p-0 ${roundedClassName}`}>
      {/* Пропорции — только утилиты Tailwind (один слой каскада). isolate + min-h-px помогают WebKit с aspect-ratio при absolute-детях. */}
      <div
        ref={aspectRef}
        className={`relative isolate w-full min-h-px min-w-0 max-w-full max-h-[calc(100dvh-var(--site-header-offset)-env(safe-area-inset-bottom,0px)-0.5rem)] overflow-hidden bg-slate-100 ${aspectClassName} ${aspectRoundedClass}`}
        style={
          mobileUniformHeight != null
            ? { height: mobileUniformHeight, minHeight: mobileUniformHeight }
            : undefined
        }
      >
        <div className={`min-w-0 touch-pan-y ${swipeShellClass}`} {...swipeProps}>
          <div className={trackClass} style={trackStyle}>
            {slides.map((slide, idx) => (
              <div
                key={slide.id}
                ref={(el) => {
                  slideMeasureRefs.current[idx] = el;
                }}
                className={slideShellClass}
                style={{ width: `${slideBasisPct}%` }}
              >
                {renderSlide(slide, idx)}
              </div>
            ))}
          </div>
        </div>
      </div>

      {hasDots ? (
        <div
          className={`flex items-center justify-center gap-1.5 border-t border-slate-200/80 bg-slate-100 px-4 py-2.5 ${dotsBarRoundedClass}`}
          role="tablist"
          aria-label="Выбор слайда баннера"
        >
          {slides.map((slide, idx) => (
            <button
              key={slide.id}
              type="button"
              role="tab"
              aria-selected={idx === activeIndex}
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              onClick={() => onSelectSlide(idx)}
              className="inline-flex h-9 min-w-9 shrink-0 items-center justify-center rounded-full"
              aria-label={`Перейти к банеру ${idx + 1}`}
            >
              <span
                className={`h-2.5 rounded-full transition-all ${
                  idx === activeIndex
                    ? "w-6 bg-[#496db3]"
                    : "w-2.5 bg-slate-400/90 hover:bg-slate-500"
                }`}
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

