"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useCarouselSwipe } from "@/hooks/useCarouselSwipe";
import { useCarouselVisibleCount } from "@/hooks/useCarouselVisibleCount";
import { createPortal } from "react-dom";
import {
  CarouselFullPreviewOverlay,
  type CarouselPreviewSessionState,
} from "@/components/CarouselFullPreviewOverlay";
import { apiBaseUrl } from "@/lib/apiBaseUrl";

const AUTOPLAY_INTERVAL_MS = 5500;

type ReviewSlide = {
  id: string;
  image: string | null;
};

type HomeReviewsCarouselProps = {
  slides: ReviewSlide[];
};

export function HomeReviewsCarousel({ slides }: HomeReviewsCarouselProps) {
  const [runtimeSlides, setRuntimeSlides] = useState<ReviewSlide[]>(
    Array.isArray(slides) ? slides : [],
  );
  const [index, setIndex] = useState(0);
  const [renderIndex, setRenderIndex] = useState(0);
  const visibleCount = useCarouselVisibleCount("reviews");
  const [carouselHovered, setCarouselHovered] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);
  const [previewSession, setPreviewSession] = useState<CarouselPreviewSessionState | null>(null);

  useEffect(() => {
    if (slides.length > 0) {
      setRuntimeSlides(slides);
      return;
    }
    void (async () => {
      try {
        const res = await fetch(`${apiBaseUrl()}/api/pages/reviews`, {
          method: "GET",
          headers: { Accept: "application/json" },
        });
        if (!res.ok) return;
        const data = (await res.json()) as { slides?: ReviewSlide[] };
        if (Array.isArray(data.slides)) {
          setRuntimeSlides(data.slides);
        }
      } catch {
        /* keep empty */
      }
    })();
  }, [slides]);

  const normalized = useMemo(
    () =>
      runtimeSlides.filter(
        (s): s is ReviewSlide =>
          typeof s === "object" &&
          s !== null &&
          typeof s.id === "string" &&
          (typeof s.image === "string" || s.image === null),
      ),
    [runtimeSlides],
  );

  const maxStart = Math.max(0, normalized.length - visibleCount);
  const safeIndex = Math.max(0, Math.min(index, maxStart));
  const safeRenderIndex = Math.max(0, Math.min(renderIndex, maxStart));
  const dotCount = maxStart + 1;

  useEffect(() => {
    const onVisibility = () => setTabVisible(!document.hidden);
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (dotCount <= 1 || !tabVisible || carouselHovered) return;
    const tick = () => {
      setIndex((prev) => (prev >= maxStart ? 0 : prev + 1));
    };
    const id = window.setInterval(tick, AUTOPLAY_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [dotCount, tabVisible, carouselHovered, maxStart]);

  useEffect(() => {
    if (index !== safeIndex) setIndex(safeIndex);
    if (renderIndex !== safeRenderIndex) setRenderIndex(safeRenderIndex);
  }, [index, safeIndex, renderIndex, safeRenderIndex]);

  const isSlideInRenderRange = useMemo(() => {
    const start = Math.min(safeIndex, safeRenderIndex);
    const end = Math.max(safeIndex, safeRenderIndex) + visibleCount - 1;
    const bufferedStart = Math.max(0, start - 1);
    const bufferedEnd = Math.min(normalized.length - 1, end + 1);
    return (slideIndex: number) => slideIndex >= bufferedStart && slideIndex <= bufferedEnd;
  }, [safeIndex, safeRenderIndex, visibleCount, normalized.length]);

  const isSlideActive = useMemo(() => {
    const start = safeIndex;
    const end = safeIndex + visibleCount - 1;
    return (slideIndex: number) => slideIndex >= start && slideIndex <= end;
  }, [safeIndex, visibleCount]);

  const goPrev = useCallback(() => {
    setIndex((prev) => Math.max(0, prev - 1));
  }, []);
  const goNext = useCallback(() => {
    setIndex((prev) => Math.min(maxStart, prev + 1));
  }, [maxStart]);
  const carouselSwipe = useCarouselSwipe(goPrev, goNext, { enabled: dotCount > 1 });

  if (normalized.length === 0) {
    return null;
  }

  const headingBlock = (
    <div className="mx-auto mt-0 max-w-3xl text-center">
      <h2 className="about-template-fallback__eyebrow about-template-fallback__eyebrow--tight mb-0 text-base font-semibold text-[#b91c1c]">
        Отзывы
      </h2>
      <p className="about-template-fallback__title -mt-1.5 mt-0 text-balance text-pretty sm:-mt-2">
        Отзывы о проделанной работе
      </p>
      <p className="mt-6 text-pretty text-sm font-medium text-slate-600 sm:text-base">
        Мы гордимся каждым клиентом и бережно храним благодарности: это подтверждение того, что задачи по
        каталогизации и анализу данных мы доводим до результата, которым можно делиться с коллегами и
        руководством.
      </p>
    </div>
  );

  const previewSlidesPayload = normalized.map((s, i) => ({
    src: typeof s.image === "string" ? s.image : null,
    label: `Отзыв ${i + 1}`,
  }));

  const openFullPreview = (slideIndex: number) => {
    setPreviewSession({
      slides: previewSlidesPayload,
      index: Math.max(0, Math.min(slideIndex, normalized.length - 1)),
      aspect: "a4",
    });
  };

  return (
    <section className="bg-transparent py-8 sm:py-10 about-template-fallback">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {headingBlock}
        <div className="mt-8 max-w-none">
          <div
            className="relative w-full min-w-0 touch-pan-y py-2"
        onMouseEnter={() => setCarouselHovered(true)}
        onMouseLeave={() => setCarouselHovered(false)}
        {...carouselSwipe}
      >
        <div className="min-w-0 w-full overflow-hidden rounded-xl bg-slate-100 p-2 sm:p-3">
          <div
            className="flex w-full min-w-0 items-stretch transition-transform duration-300 ease-out"
            style={{
              transform: `translateX(-${safeIndex * (100 / visibleCount)}%)`,
            }}
            onTransitionEnd={(e) => {
              if (e.propertyName !== "transform") return;
              setRenderIndex(safeIndex);
            }}
          >
            {normalized.map((slide, slideIndex) => (
              <div
                key={slide.id}
                className="box-border flex min-h-0 shrink-0 self-stretch px-1.5"
                style={{
                  flex: `0 0 calc(100% / ${visibleCount})`,
                  minWidth: 0,
                }}
              >
                <div
                  className="flex h-full min-h-0 w-full min-w-0 flex-col"
                  style={
                    isSlideInRenderRange(slideIndex)
                      ? isSlideActive(slideIndex)
                        ? { opacity: 1, visibility: "visible", pointerEvents: "auto" }
                        : { opacity: 0, visibility: "visible", pointerEvents: "none" }
                      : { opacity: 0, visibility: "hidden", pointerEvents: "none" }
                  }
                >
                  <div
                    className="relative w-full overflow-hidden rounded-lg border border-slate-200 bg-white"
                    style={{ paddingTop: "141.4214%" }}
                  >
                    <button
                      type="button"
                      className="absolute inset-0 block h-full w-full cursor-zoom-in border-0 bg-transparent p-0 text-left outline-none ring-[#496db3] focus-visible:ring-2"
                      onPointerDown={(e) => {
                        // На десктопе родительский swipe-хэндлер делает setPointerCapture,
                        // из-за чего клик по карточке может не доходить до onClick.
                        // Отсекаем событие для mouse, чтобы fullscreen стабильно открывался.
                        if (e.pointerType === "mouse") e.stopPropagation();
                      }}
                      onClick={() => openFullPreview(slideIndex)}
                      aria-label={`Открыть отзыв ${slideIndex + 1} из ${normalized.length} на весь экран`}
                    >
                      {slide.image ? (
                        <img
                          src={slide.image}
                          alt={`Отзыв ${slideIndex + 1}`}
                          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                          draggable={false}
                        />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center text-xs text-slate-500">
                          Слайд отзыва
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {dotCount > 1 ? (
          <div
            className="mt-4 flex flex-wrap items-center justify-center gap-1.5"
            role="tablist"
            aria-label="Переключение слайдов отзывов"
          >
            {Array.from({ length: dotCount }, (_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === safeIndex}
                aria-label={`Перейти к отзыву ${i + 1} из ${dotCount}`}
                onPointerDown={(e) => {
                  e.stopPropagation();
                }}
                onPointerUp={(e) => e.stopPropagation()}
                onClick={() => setIndex(i)}
                className={`h-2.5 rounded-full transition-all ${
                  i === safeIndex
                    ? "w-6 bg-[#496db3]"
                    : "w-2.5 bg-slate-300 hover:bg-slate-400"
                }`}
              />
            ))}
          </div>
        ) : null}

          </div>
        </div>
      </div>

      {previewSession && typeof document !== "undefined"
        ? createPortal(
            <CarouselFullPreviewOverlay
              session={previewSession}
              onClose={() => setPreviewSession(null)}
              mode="reviews"
              onSelectIndex={(i) =>
                setPreviewSession((s) =>
                  s ? { ...s, index: Math.max(0, Math.min(s.slides.length - 1, i)) } : s,
                )
              }
              onPrev={() =>
                setPreviewSession((s) =>
                  s ? { ...s, index: Math.max(0, s.index - 1) } : s,
                )
              }
              onNext={() =>
                setPreviewSession((s) =>
                  s
                    ? { ...s, index: Math.min(s.slides.length - 1, s.index + 1) }
                    : s,
                )
              }
            />,
            document.body,
          )
        : null}
    </section>
  );
}
