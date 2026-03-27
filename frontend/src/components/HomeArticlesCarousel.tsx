"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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

  useEffect(() => {
    const updateVisibleCount = () => {
      const width = window.innerWidth;
      if (width < 768) return setVisibleCount(1);
      if (width < 1280) return setVisibleCount(2);
      return setVisibleCount(3);
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
  const canPrev = safeIndex > 0;
  const canNext = safeIndex < maxStart;
  const safeRenderIndex = Math.max(0, Math.min(renderIndex, maxStart));

  useEffect(() => {
    if (index !== safeIndex) setIndex(safeIndex);
    if (renderIndex !== safeRenderIndex) setRenderIndex(safeRenderIndex);
  }, [index, safeIndex]);

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

      <p className="mb-4 text-center font-semibold text-[#496db3]" style={{ fontSize: "clamp(13px, 0.7vw, 14px)" }}>
        Полезные материалы по каталогизации и анализу данных — советы и разборы кейсов, которые
        помогут быстрее пройти согласования и избежать ошибок.
      </p>

      <div className="relative rounded-xl bg-slate-100 p-3">
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (!canPrev) return;
              setIndex(Math.max(0, safeIndex - 1));
            }}
            aria-disabled={!canPrev}
            className={`relative z-20 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-slate-100 text-xl leading-none text-slate-700 shadow-sm ${
              canPrev ? "" : "opacity-40 cursor-not-allowed"
            }`}
            aria-label="Предыдущие статьи"
          >
            ‹
          </button>

          <div className="min-w-0 flex-1 overflow-visible rounded-xl bg-slate-100 p-2">
            <div
              className="flex transition-transform duration-300 ease-out"
              style={{ transform: `translateX(-${safeIndex * (100 / visibleCount)}%)` }}
              onTransitionEnd={(e) => {
                if (e.propertyName !== "transform") return;
                setRenderIndex(safeIndex);
              }}
            >
              {normalized.map((a, slideIndex) => (
                <div
                  key={a.id}
                  className="shrink-0 px-1.5"
                  style={{ flexBasis: `${100 / visibleCount}%` }}
                >
                  <Link
                    href={`/${a.slug}`}
                    className="why-us-card group relative z-10 block h-full overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"
                    style={
                      isSlideInRenderRange(slideIndex)
                        ? isSlideActive(slideIndex)
                          ? { opacity: 1, visibility: "visible", pointerEvents: "auto" }
                          : { opacity: 0, visibility: "visible", pointerEvents: "none" }
                        : { opacity: 0, visibility: "hidden", pointerEvents: "none" }
                    }
                  >
                    <div
                      className="relative aspect-square w-full overflow-hidden bg-slate-50 bg-cover bg-center transition-transform duration-300 ease-out group-hover:scale-[1.01]"
                      style={
                        a.preview?.trim()
                          ? {
                              backgroundImage: `url(${a.preview})`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                              backgroundRepeat: "no-repeat",
                            }
                          : undefined
                      }
                    >
                      {!a.preview?.trim() ? (
                        <div className="absolute inset-0 flex items-center justify-center text-center text-[12px] font-semibold text-slate-400">
                          Нет изображения
                        </div>
                      ) : null}

                      {/* Тёмный полупрозрачный фон поверх бэкграунда */}
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 z-0"
                        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
                      />
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-t from-black/55 via-black/20 to-transparent"
                      />

                      <div className="absolute inset-x-0 bottom-0 z-10 p-5 sm:p-6">
                        <h3 className="text-balance text-[16px] font-black leading-[1.15] tracking-tight text-white">
                          {a.title}
                        </h3>
                        {a.description?.trim() ? (
                          <p className="mt-2 text-[12px] font-semibold leading-[1.5] text-white">
                            {a.description}
                          </p>
                        ) : (
                          <p className="mt-2 text-[12px] font-semibold leading-[1.5] text-white/80">
                            Откройте статью, чтобы прочитать полностью.
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (!canNext) return;
              setIndex(Math.min(maxStart, safeIndex + 1));
            }}
            aria-disabled={!canNext}
            className={`relative z-20 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-slate-100 text-xl leading-none text-slate-700 shadow-sm ${
              canNext ? "" : "opacity-40 cursor-not-allowed"
            }`}
            aria-label="Следующие статьи"
          >
            ›
          </button>
        </div>
      </div>
    </section>
  );
}

