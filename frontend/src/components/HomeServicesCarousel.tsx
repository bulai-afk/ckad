"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircleIcon } from "@heroicons/react/20/solid";

export type HomeServicesCarouselPage = {
  id: number;
  title: string;
  slug: string;
};

export type HomeServicesCarouselCard = {
  slugPath: string;
  label: string;
  description?: string;
  preview?: string;
  pages: HomeServicesCarouselPage[];
  children?: HomeServicesCarouselCard[];
  isMetaFolder?: boolean;
};

type Props = {
  cards: HomeServicesCarouselCard[];
};

export function HomeServicesCarousel({ cards }: Props) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);
  const [renderIndex, setRenderIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(1);
  const lastAnimIndexRef = useRef<number>(0);

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

  const pageCards = useMemo(() => {
    // Не показываем пустые карточки (на случай если API вернуло странные узлы).
    return (cards || []).filter((c) => c && (c.pages?.length || c.isMetaFolder)).slice(0, 12);
  }, [cards]);

  const maxStart = Math.max(0, pageCards.length - visibleCount);
  const safeIndex = Math.max(0, Math.min(index, maxStart));
  const safeRenderIndex = Math.max(0, Math.min(renderIndex, maxStart));
  const canPrev = safeIndex > 0;
  const canNext = safeIndex < maxStart;
  const transformX = `translateX(-${safeIndex * (100 / visibleCount)}%)`;

  useEffect(() => {
    if (index !== safeIndex) setIndex(safeIndex);
    if (renderIndex !== safeRenderIndex) setRenderIndex(safeRenderIndex);
  }, [index, safeIndex]);

  const isSlideInRenderRange = useCallback(
    (slideIndex: number) => {
      const start = Math.min(safeIndex, safeRenderIndex);
      const end = Math.max(safeIndex, safeRenderIndex) + visibleCount - 1;
      // Небольшой буфер по краям на время анимации.
      const bufferedStart = Math.max(0, start - 1);
      const bufferedEnd = Math.min(pageCards.length - 1, end + 1);
      return slideIndex >= bufferedStart && slideIndex <= bufferedEnd;
    },
    [safeIndex, safeRenderIndex, visibleCount, pageCards.length],
  );

  const isSlideActive = useCallback(
    (slideIndex: number) => {
      const start = safeIndex;
      const end = safeIndex + visibleCount - 1;
      return slideIndex >= start && slideIndex <= end;
    },
    [safeIndex, visibleCount],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setIndex((prev) => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setIndex((prev) => (prev < maxStart ? prev + 1 : prev));
      }
    },
    [maxStart],
  );

  return (
    <div className="relative rounded-xl bg-slate-100 p-3">
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => {
            const next = Math.max(0, safeIndex - 1);
            if (!canPrev) return;
            setIndex(next);
          }}
          aria-disabled={!canPrev}
          className={`relative z-20 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-slate-100 text-xl leading-none text-slate-700 shadow-sm ${
            canPrev ? "" : "opacity-40 cursor-not-allowed"
          }`}
          aria-label="Предыдущие услуги"
        >
          ‹
        </button>

        <div
          tabIndex={0}
          onKeyDown={onKeyDown}
          className="min-w-0 flex-1 overflow-visible rounded-xl bg-slate-100 p-2 outline-none ring-[#496db3] focus-visible:ring-2"
        >
          <div
            ref={trackRef}
            className="flex items-stretch transition-transform duration-300 ease-out"
            style={{
              transform: `translate3d(-${safeIndex * (100 / visibleCount)}%, 0, 0)`,
              willChange: "transform",
            }}
            onTransitionEnd={(e) => {
              if (e.propertyName !== "transform") return;
              if (lastAnimIndexRef.current !== safeIndex) {
                lastAnimIndexRef.current = safeIndex;
              }
              setRenderIndex(safeIndex);
            }}
          >
            {pageCards.map((node, slideIndex) => (
              <div
                key={node.slugPath}
                className="shrink-0 px-1.5"
                style={{ flexBasis: `${100 / visibleCount}%` }}
              >
                <div
                  data-home-services-slide="true"
                  data-home-services-card="true"
                  data-slide-index={slideIndex}
                  className="h-full"
                  style={
                    isSlideInRenderRange(slideIndex)
                      ? isSlideActive(slideIndex)
                        ? { opacity: 1, visibility: "visible", pointerEvents: "auto" }
                        : { opacity: 0, visibility: "visible", pointerEvents: "none" }
                      : { opacity: 0, visibility: "hidden", pointerEvents: "none" }
                  }
                >
                  <div
                    className="why-us-card relative z-10 flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"
                    style={{
                      // Fix artifacts on GPU compositing during translate animations.
                      transform: "translateZ(0)",
                      backfaceVisibility: "hidden",
                      contain: "layout paint",
                      // Keep card height stable without layout thrash from JS measurements.
                      minHeight:
                        visibleCount === 1
                          ? "clamp(520px, 140vw, 620px)"
                          : "clamp(520px, 55vw, 620px)",
                    }}
                  >
                    <div className="relative p-6 sm:p-8">
                      <div className="flex flex-col">
                        <div
                          data-home-services-image="true"
                          className="aspect-square w-full overflow-hidden rounded-2xl bg-slate-50 ring-1 ring-slate-200"
                        >
                          {node.preview?.trim() ? (
                            <img
                              src={node.preview}
                              alt={node.label}
                              className="h-full w-full object-contain p-3"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-center text-[12px] font-semibold text-slate-400">
                              Нет изображения
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1 pt-6 pr-0">
                          <h2 className="text-balance text-[22px] font-black leading-[1.15] tracking-tight text-[#496db3]">
                            {node.label}
                          </h2>
                          {node.description?.trim() ? (
                            <p className="mt-3 max-w-none whitespace-pre-wrap text-[14px] font-semibold leading-[1.65] text-[#496db3]">
                              {node.description}
                            </p>
                          ) : null}

                          {node.pages.length > 0 ? (
                            <>
                              <p className="mt-5 text-[12px] font-semibold leading-snug text-[#496db3]/70">
                                Выберите ниже интересующую вас услугу.
                              </p>
                              <ul
                                role="list"
                                className="mt-3 grid grid-cols-1 gap-y-3 text-[14px] font-semibold leading-[1.4] text-[#496db3]"
                              >
                                {node.pages.slice(0, 6).map((page) => (
                                  <li key={page.id} className="flex items-start gap-3">
                                    <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#496db3]" />
                                    <Link
                                      href={`/${page.slug}`}
                                      className="min-w-0 flex-1 transition-colors hover:text-[#e53935]"
                                    >
                                      {page.title}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            </>
                          ) : (
                            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[13px] font-semibold text-slate-500">
                              Скоро добавим услуги в этот раздел.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-y-0 right-0 hidden w-[50rem] translate-x-1/3 opacity-60 blur-3xl sm:block"
                    >
                      <div
                        style={{
                          clipPath:
                            "polygon(73.6% 51.7%, 91.7% 11.8%, 100% 46.4%, 97.4% 82.2%, 92.5% 84.9%, 75.7% 64%, 55.3% 47.5%, 46.5% 49.4%, 45% 62.9%, 50.3% 87.2%, 21.3% 64.1%, 0.1% 100%, 5.4% 51.1%, 21.4% 63.9%, 58.9% 0.2%, 73.6% 51.7%)",
                        }}
                        className="aspect-[1155/678] w-full bg-gradient-to-tr from-sky-300/30 to-indigo-300/20"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            const next = Math.min(maxStart, safeIndex + 1);
            if (!canNext) return;
            setIndex(next);
          }}
          aria-disabled={!canNext}
          className={`relative z-20 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-slate-100 text-xl leading-none text-slate-700 shadow-sm ${
            canNext ? "" : "opacity-40 cursor-not-allowed"
          }`}
          aria-label="Следующие услуги"
        >
          ›
        </button>
      </div>
    </div>
  );
}

