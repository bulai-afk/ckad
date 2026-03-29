"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCarouselSwipe } from "@/hooks/useCarouselSwipe";
import { HomeServicesFolderCards } from "@/components/HomeServicesFolderCards";

const AUTOPLAY_INTERVAL_MS = 5500;

export type HomeArticleSlide = {
  id: number;
  title: string;
  slug: string;
  description?: string | null;
  preview?: string | null;
  createdAt?: string | null;
};

type Props = {
  slides: HomeArticleSlide[];
};

export function HomeArticlesCarousel({ slides }: Props) {
  const [index, setIndex] = useState(0);
  const [renderIndex, setRenderIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(1);
  const [carouselHovered, setCarouselHovered] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);

  useEffect(() => {
    const updateVisibleCount = () => {
      const width = window.innerWidth;
      if (width < 640) return setVisibleCount(2);
      return setVisibleCount(4);
    };
    updateVisibleCount();
    window.addEventListener("resize", updateVisibleCount);
    return () => window.removeEventListener("resize", updateVisibleCount);
  }, []);

  const normalized = useMemo(() => {
    return (Array.isArray(slides) ? slides : [])
      .filter((s) => s && typeof s.id === "number" && typeof s.slug === "string")
      .slice(0, 12);
  }, [slides]);

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

  const trackRef = useRef<HTMLDivElement>(null);

  /**
   * Один раз после шрифтов и превью: max(offsetHeight) по всем слотам → одна высота всем.
   * Ранний useLayoutEffect давал малый max — картинки ещё не были в layout.
   */
  useEffect(() => {
    if (normalized.length < 2) return;

    let cancelled = false;
    let applied = false;

    const applyHeights = () => {
      if (cancelled || applied) return;
      const root = trackRef.current;
      if (!root) return;

      const slots = [...root.querySelectorAll<HTMLElement>("[data-folder-card-slot]")];
      if (slots.length < 2) return;

      slots.forEach((el) => {
        el.style.height = "";
        el.style.minHeight = "";
      });
      void root.offsetHeight;

      const heights = slots.map((el) => el.offsetHeight);
      const positive = heights.filter((h) => h > 0);
      const maxPx = positive.length > 0 ? Math.max(...positive) : Math.max(0, ...heights);
      if (maxPx <= 0) return;

      applied = true;
      slots.forEach((el) => {
        el.style.boxSizing = "border-box";
        el.style.height = `${maxPx}px`;
        el.style.minHeight = `${maxPx}px`;
      });
    };

    const waitImagesIn = (root: HTMLElement) => {
      const imgs = [...root.querySelectorAll("img")];
      return Promise.all(
        imgs.map(async (img) => {
          if (!img.complete) {
            await new Promise<void>((resolve) => {
              img.addEventListener("load", () => resolve(), { once: true });
              img.addEventListener("error", () => resolve(), { once: true });
            });
          }
          try {
            if (img.decode) await img.decode();
          } catch {
            /* ignore */
          }
        }),
      );
    };

    const run = async () => {
      try {
        await document.fonts?.ready;
      } catch {
        /* ignore */
      }
      if (cancelled) return;

      const root = trackRef.current;
      if (!root) return;

      await waitImagesIn(root);
      if (cancelled) return;

      requestAnimationFrame(() => {
        requestAnimationFrame(applyHeights);
      });
    };

    void run();

    const fallback = window.setTimeout(() => {
      if (!cancelled && !applied) applyHeights();
    }, 2800);

    return () => {
      cancelled = true;
      window.clearTimeout(fallback);
      const r = trackRef.current;
      if (r) {
        [...r.querySelectorAll<HTMLElement>("[data-folder-card-slot]")].forEach((el) => {
          el.style.height = "";
          el.style.minHeight = "";
        });
      }
    };
  }, [normalized]);

  const goPrev = useCallback(() => {
    setIndex((prev) => Math.max(0, prev - 1));
  }, []);
  const goNext = useCallback(() => {
    setIndex((prev) => Math.min(maxStart, prev + 1));
  }, [maxStart]);
  const carouselSwipe = useCarouselSwipe(goPrev, goNext, { enabled: dotCount > 1 });

  if (normalized.length === 0) return null;

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
          Наши статьи
        </h2>
      </div>

      <div className="mb-4" style={{ fontSize: "clamp(13px, 0.7vw, 14px)" }}>
        <p
          className="whitespace-pre-wrap text-center font-semibold text-[#496db3]"
          style={{ fontSize: "112%", lineHeight: 1.35 }}
        >
          Полезные материалы по каталогизации и анализу данных — советы и разборы кейсов, которые помогут
          быстрее пройти согласования и избежать ошибок.
        </p>
      </div>

      <div
        className="relative w-full min-w-0 touch-pan-y py-2"
        onMouseEnter={() => setCarouselHovered(true)}
        onMouseLeave={() => setCarouselHovered(false)}
        {...carouselSwipe}
      >
        <div className="min-w-0 w-full">
          <div
            ref={trackRef}
            className="flex w-full min-w-0 items-stretch transition-transform duration-300 ease-out"
            style={{
              transform: `translateX(-${safeIndex * (100 / visibleCount)}%)`,
            }}
            onTransitionEnd={(e) => {
              if (e.propertyName !== "transform") return;
              setRenderIndex(safeIndex);
            }}
          >
            {normalized.map((a, slideIndex) => (
              <div
                key={a.id}
                className="flex min-h-0 shrink-0 self-stretch px-1.5"
                style={{ flexBasis: `${100 / visibleCount}%`, minWidth: 0 }}
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
                  <HomeServicesFolderCards
                    embedInCarousel
                    equalHeight
                    alwaysShowPreview
                    ctaLabel="Читать"
                    limit={1}
                    cards={[
                      {
                        slugPath: a.slug,
                        label: a.title,
                        description: a.description?.trim() || undefined,
                        preview: a.preview?.trim() || undefined,
                      },
                    ]}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {dotCount > 1 ? (
          <div
            className="mt-4 flex flex-wrap items-center justify-center gap-2"
            role="tablist"
            aria-label="Переключение слайдов статей"
          >
            {Array.from({ length: dotCount }, (_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === safeIndex}
                aria-label={`Слайд ${i + 1} из ${dotCount}`}
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
    </section>
  );
}

