"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  CarouselFullPreviewOverlay,
  type CarouselPreviewSessionState,
} from "@/components/CarouselFullPreviewOverlay";

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
  const [visibleCount, setVisibleCount] = useState(4);
  const [previewSession, setPreviewSession] = useState<CarouselPreviewSessionState | null>(null);

  useEffect(() => {
    if (slides.length > 0) {
      setRuntimeSlides(slides);
      return;
    }
    void (async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
        const res = await fetch(`${apiUrl}/api/pages/reviews`, {
          method: "GET",
          headers: { Accept: "application/json" },
        });
        if (!res.ok) return;
        const data = (await res.json()) as { slides?: ReviewSlide[] };
        if (Array.isArray(data.slides)) {
          setRuntimeSlides(data.slides);
        }
      } catch {
        // keep empty state
      }
    })();
  }, [slides]);

  useEffect(() => {
    const updateVisibleCount = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setVisibleCount(2);
        return;
      }
      if (width < 1024) {
        setVisibleCount(3);
        return;
      }
      setVisibleCount(4);
    };
    updateVisibleCount();
    window.addEventListener("resize", updateVisibleCount);
    return () => window.removeEventListener("resize", updateVisibleCount);
  }, []);

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
  const canPrev = safeIndex > 0;
  const canNext = safeIndex < maxStart;

  useEffect(() => {
    if (index !== safeIndex) {
      setIndex(safeIndex);
    }
  }, [index, safeIndex]);

  if (normalized.length === 0) {
    return null;
  }

  const previewSlidesPayload = normalized.map((s, i) => ({
    src: typeof s.image === "string" ? s.image : null,
    label: `Отзыв ${i + 1}`,
  }));

  const openFullPreview = (slideIndex: number) => {
    /* Отзывы — сканы А4: полный просмотр 210∶297, не 9∶16 и не 16∶9 */
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

      <div className="relative overflow-hidden rounded-xl bg-slate-100 p-3">
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setIndex((prev) => (prev > 0 ? prev - 1 : prev))}
            disabled={!canPrev}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-slate-100 text-xl leading-none text-slate-700 shadow-sm disabled:opacity-40"
            aria-label="Предыдущие отзывы"
          >
            ‹
          </button>

          <div
            className="w-full overflow-hidden rounded-xl bg-slate-100 p-2"
            style={{ clipPath: "inset(0 5px 0 5px)" }}
          >
            <div
              className="flex transition-transform duration-300 ease-out"
              style={{ transform: `translateX(-${safeIndex * (100 / visibleCount)}%)` }}
            >
              {normalized.map((slide, slideIndex) => (
                <div
                  key={slide.id}
                  className="shrink-0 px-1.5"
                  style={{ flexBasis: `${100 / visibleCount}%` }}
                >
                  <div
                    className="relative overflow-hidden rounded-lg border border-slate-200 bg-white"
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
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIndex((prev) => (prev < maxStart ? prev + 1 : prev))}
            disabled={!canNext}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-slate-100 text-xl leading-none text-slate-700 shadow-sm disabled:opacity-40"
            aria-label="Следующие отзывы"
          >
            ›
          </button>
        </div>
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
