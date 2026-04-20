"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { useEffect, useRef } from "react";
import { bannerDebugEnabled, logBannerDebug } from "@/lib/bannerDebugLog";

type SlideWithId = { id: string };

type BannerCarouselFrameProps<TSlide extends SlideWithId> = {
  slides: TSlide[];
  activeIndex: number;
  onSelectSlide: (index: number) => void;
  swipeProps?: HTMLAttributes<HTMLDivElement>;
  roundedClassName?: string;
  aspectClassName?: string;
  renderSlide: (slide: TSlide, index: number) => ReactNode;
};

export function BannerCarouselFrame<TSlide extends SlideWithId>({
  slides,
  activeIndex,
  onSelectSlide,
  swipeProps,
  roundedClassName = "rounded-xl",
  aspectClassName = "h-[200vw] sm:h-[50vw]",
  renderSlide,
}: BannerCarouselFrameProps<TSlide>) {
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
            expectWidthOverHeight: "mobile: h=200vw (1/2), tablet/desktop: h=50vw (2/1)",
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
        className={`relative isolate w-full min-h-px min-w-0 max-w-full max-h-[calc(100dvh-var(--site-header-offset)-env(safe-area-inset-bottom,0px)-0.5rem)] overflow-hidden bg-slate-100 ${aspectClassName} ${roundedClassName}`}
      >
        <div
          className="absolute inset-0 min-w-0 touch-pan-y overflow-hidden"
          {...swipeProps}
        >
          <div
            className="flex h-full min-h-0 w-full min-w-0 max-w-none transition-transform duration-300 ease-out"
            style={trackStyle}
          >
            {slides.map((slide, idx) => (
              <div
                key={slide.id}
                className="box-border h-full min-h-0 min-w-0 shrink-0 overflow-hidden"
                style={{ width: `${slideBasisPct}%` }}
              >
                {renderSlide(slide, idx)}
              </div>
            ))}
          </div>
        </div>

        {slides.length > 1 ? (
          <div className="pointer-events-none absolute bottom-3 left-1/2 z-30 flex -translate-x-1/2 items-center justify-center gap-1.5 [&_button]:pointer-events-auto">
            {slides.map((slide, idx) => (
              <button
                key={slide.id}
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                onClick={() => onSelectSlide(idx)}
                className={`h-2.5 rounded-full transition-all ${
                  idx === activeIndex
                    ? "w-6 bg-[#496db3]"
                    : "w-2.5 bg-slate-300 hover:bg-slate-400"
                }`}
                aria-label={`Перейти к банеру ${idx + 1}`}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

