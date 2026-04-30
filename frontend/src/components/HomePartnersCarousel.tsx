"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useCarouselSwipe } from "@/hooks/useCarouselSwipe";
import { useCarouselVisibleCount } from "@/hooks/useCarouselVisibleCount";
import { apiBaseUrl } from "@/lib/apiBaseUrl";

const AUTOPLAY_INTERVAL_MS = 5500;

type PartnerSlide = {
  id: string;
  image: string | null;
};

type HomePartnersCarouselProps = {
  slides: PartnerSlide[];
  /** Заголовок над каруселью */
  title?: string;
  /** Компактный вид: меньше отступов, без текста-описания под заголовком */
  compact?: boolean;
};

const logoImgClassDefault =
  "mx-auto block h-auto max-h-11 w-full max-w-[10rem] object-contain sm:max-h-12";

const logoImgClassCompact =
  "mx-auto block h-auto max-h-9 w-full max-w-[8rem] object-contain sm:max-h-10";

export function HomePartnersCarousel({
  slides,
  title = "Наши партнеры",
  compact = false,
}: HomePartnersCarouselProps) {
  const [runtimeSlides, setRuntimeSlides] = useState<PartnerSlide[]>(
    Array.isArray(slides) ? slides : [],
  );
  const [index, setIndex] = useState(0);
  const [renderIndex, setRenderIndex] = useState(0);
  const visibleCount = useCarouselVisibleCount("partners");
  const [carouselHovered, setCarouselHovered] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);

  useEffect(() => {
    if (slides.length > 0) {
      setRuntimeSlides(slides);
      return;
    }
    void (async () => {
      try {
        const res = await fetch(`${apiBaseUrl()}/api/pages/partners`, {
          method: "GET",
          headers: { Accept: "application/json" },
        });
        if (!res.ok) return;
        const data = (await res.json()) as { slides?: PartnerSlide[] };
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
        (s): s is PartnerSlide =>
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

  const logoImgClass = compact ? logoImgClassCompact : logoImgClassDefault;
  const labelWord = compact ? "Клиент" : "Партнёр";

  const headingBlock = compact ? (
    <h2 className="about-template-fallback__eyebrow about-template-fallback__eyebrow--tight mb-0 text-center text-base font-semibold text-[#b91c1c]">
      {title}
    </h2>
  ) : (
    <>
      <h2 className="text-center text-lg/8 font-semibold text-gray-900">{title}</h2>
      <p className="mx-auto mt-4 max-w-2xl text-center text-sm leading-relaxed text-gray-600">
        Рядом с нами компании и организации, которым доверяют сложные проекты: вместе мы усиливаем экспертизу
        в каталогизации и анализе данных.
      </p>
    </>
  );

  const outerSectionClass = compact
    ? "relative isolate py-0"
    : "relative isolate py-8 sm:py-10";
  const innerMaxClass = compact ? "relative z-20 mx-auto max-w-7xl" : "relative z-20 mx-auto max-w-7xl px-6 lg:px-8";
  const slideGap = compact ? "px-1.5 sm:px-2" : "px-2 sm:px-2.5";
  const logoSlotClass =
    "flex min-h-0 w-full flex-1 items-center justify-center py-1 sm:py-1.5";

  return (
    <section className={outerSectionClass}>
      <div className={innerMaxClass}>
        <div className="text-center">{headingBlock}</div>

        <div className={compact ? "mt-3" : "mt-8"}>
          <div
            className="relative w-full min-w-0 touch-pan-y py-1 sm:py-2"
            onMouseEnter={() => setCarouselHovered(true)}
            onMouseLeave={() => setCarouselHovered(false)}
            {...carouselSwipe}
          >
            <div className="min-w-0 w-full overflow-hidden py-0.5 sm:py-1">
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
                    className={`box-border flex min-h-0 shrink-0 self-stretch ${slideGap}`}
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
                      <div className={logoSlotClass}>
                        {slide.image ? (
                          <img
                            src={slide.image}
                            alt={`${labelWord} ${slideIndex + 1}`}
                            className={`pointer-events-none ${logoImgClass}`}
                            draggable={false}
                          />
                        ) : (
                          <span className="text-xs text-slate-400">Логотип</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {dotCount > 1 ? (
              <div
                className="mt-3 flex flex-wrap items-center justify-center gap-1.5 sm:mt-4"
                role="tablist"
                aria-label="Переключение слайдов"
              >
                {Array.from({ length: dotCount }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    role="tab"
                    aria-selected={i === safeIndex}
                    aria-label={`Слайд ${i + 1} из ${dotCount}`}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                    }}
                    onPointerUp={(e) => e.stopPropagation()}
                    onClick={() => setIndex(i)}
                    className={`h-2.5 rounded-full transition-all ${
                      i === safeIndex ? "w-6 bg-[#496db3]" : "w-2.5 bg-slate-300 hover:bg-slate-400"
                    }`}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
