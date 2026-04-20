"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useCarouselSwipe } from "@/hooks/useCarouselSwipe";
import { useCarouselVisibleCount } from "@/hooks/useCarouselVisibleCount";
import {
  ArticleTeaserCard,
  excerptFromArticleDescription,
  formatArticleDate,
} from "@/components/ArticleTeaserCard";
import { sanitizePublicAssetUrl } from "@/lib/publicAssetUrl";

const AUTOPLAY_INTERVAL_MS = 5500;

export type HomeArticleSlide = {
  id: number;
  title: string;
  slug: string;
  description?: string | null;
  preview?: string | null;
  createdAt?: string | null;
  /** Дата последнего изменения (для сортировки и подписи на главной). */
  updatedAt?: string | null;
  articleKind?: "news" | "article";
};

type Props = {
  slides: HomeArticleSlide[];
};

export function HomeArticlesCarousel({ slides }: Props) {
  const [runtimeSlides, setRuntimeSlides] = useState<HomeArticleSlide[]>(
    Array.isArray(slides) ? slides : [],
  );

  useEffect(() => {
    setRuntimeSlides(Array.isArray(slides) ? slides : []);
  }, [slides]);

  const normalized = useMemo(
    () =>
      runtimeSlides
        .filter((s) => s && typeof s.id === "number" && typeof s.slug === "string")
        .slice(0, 10),
    [runtimeSlides],
  );

  const [index, setIndex] = useState(0);
  const [renderIndex, setRenderIndex] = useState(0);
  const visibleCount = useCarouselVisibleCount("articles");
  const [carouselHovered, setCarouselHovered] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);

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

  if (normalized.length === 0) return null;

  return (
    <section className="bg-transparent py-8 sm:py-10 about-template-fallback">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto mt-0 max-w-3xl text-center">
          <h2 className="about-template-fallback__eyebrow about-template-fallback__eyebrow--tight mb-0 text-base font-semibold text-[#b91c1c]">
            Новости
          </h2>
          <p className="about-template-fallback__title -mt-1.5 mt-0 text-balance text-pretty sm:-mt-2">
            Актуальная информация
          </p>
          <p className="mt-6 text-pretty text-sm font-medium text-slate-600 sm:text-base">
            Полезные материалы по каталогизации и анализу данных — советы и разборы кейсов, которые помогут
            быстрее пройти согласования и избежать ошибок.
          </p>
        </div>

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
                {normalized.map((a, slideIndex) => {
                  const href = `/${a.slug}`;
                  const thumb = sanitizePublicAssetUrl(
                    typeof a.preview === "string" ? a.preview.trim() : "",
                  );
                  const { dateTime, label } = formatArticleDate(a.updatedAt ?? a.createdAt);
                  const excerpt = excerptFromArticleDescription(a.description);

                  return (
                    <div
                      key={a.id}
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
                        <ArticleTeaserCard
                          href={href}
                          previewUrl={thumb}
                          dateTime={dateTime}
                          dateLabel={label}
                          title={a.title}
                          excerpt={excerpt}
                          articleKind={a.articleKind}
                          isolateLinksForCarousel
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {dotCount > 1 ? (
              <div
                className="mt-4 flex flex-wrap items-center justify-center gap-1.5"
                role="tablist"
                aria-label="Переключение слайдов новостей"
              >
                {Array.from({ length: dotCount }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    role="tab"
                    aria-selected={i === safeIndex}
                    aria-label={`Перейти к слайду ${i + 1} из ${dotCount}`}
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
    </section>
  );
}
