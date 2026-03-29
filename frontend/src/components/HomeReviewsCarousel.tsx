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
    <section className="bg-transparent p-0">
      <div
        className="mb-4 flex items-center justify-center text-[13px] font-semibold tracking-tight"
        style={{ fontSize: "clamp(10px, 1.2vw, 16px)" }}
      >
        <h2
          className="text-center uppercase text-[#496db3]"
          style={{
            fontSize: "230%",
            lineHeight: 1.1,
            fontWeight: 950,
            textShadow:
              "0.35px 0 currentColor, -0.35px 0 currentColor, 0 0.35px currentColor, 0 -0.35px currentColor",
          }}
        >
          Отзывы о проделанной работе
        </h2>
      </div>

      <div className="mb-4" style={{ fontSize: "clamp(13px, 0.7vw, 14px)" }}>
        <p
          className="whitespace-pre-wrap text-center font-semibold text-[#496db3]"
          style={{ fontSize: "112%", lineHeight: 1.35 }}
        >
          Мы гордимся каждым клиентом и бережно храним благодарности: это подтверждение того, что задачи по
          каталогизации и анализу данных мы доводим до результата, которым можно делиться с коллегами и
          руководством.
        </p>
      </div>

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
            className="mt-4 flex flex-wrap items-center justify-center gap-2"
            role="tablist"
            aria-label="Переключение слайдов отзывов"
          >
            {Array.from({ length: dotCount }, (_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === safeIndex}
                aria-label={`Слайд ${i + 1} из ${dotCount}`}
                onPointerDown={(e) => {
                  /* иначе useCarouselSwipe на родителе: setPointerCapture ломает click */
                  e.stopPropagation();
                }}
                onClick={() => setIndex(i)}
                className={`h-2.5 w-2.5 rounded-full border transition ${
                  i === safeIndex
                    ? "border-[#496db3] bg-[#496db3] shadow-[0_0_0_2px_rgba(73,109,179,0.25)]"
                    : "border-[#496db3]/55 bg-white hover:border-[#496db3] hover:bg-[#496db3]/10"
                }`}
              />
            ))}
          </div>
        ) : null}
      </div>

      {previewSession && typeof document !== "undefined"
        ? createPortal(
            <CarouselFullPreviewOverlay
              session={previewSession}
              onClose={() => setPreviewSession(null)}
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
