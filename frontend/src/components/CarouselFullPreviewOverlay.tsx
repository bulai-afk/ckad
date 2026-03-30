"use client";

import { useEffect, useRef, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { useCarouselVisibleCount } from "@/hooks/useCarouselVisibleCount";

export type CarouselPreviewSlide = {
  src: string | null;
  label: string;
};

export type CarouselPreviewSessionState = {
  slides: CarouselPreviewSlide[];
  index: number;
  aspect: "vertical" | "horizontal" | "square" | "a4";
  /** Подстановка в CSS `aspect-ratio` вместо вычисления из `aspect`. */
  aspectRatioCss?: string;
};

function resolveAspectRatioCss(session: CarouselPreviewSessionState): string {
  if (session.aspectRatioCss?.trim()) return session.aspectRatioCss.trim();
  if (session.aspect === "a4") return "210 / 297";
  if (session.aspect === "vertical") return "9 / 16";
  if (session.aspect === "square") return "1 / 1";
  return "16 / 9";
}

type PreviewFrameWidthMode = "computed" | "full";

/**
 * Размер кадра.
 * - computed: пытаемся вычислить ширину из maxHeight и aspect-ratio (старое поведение).
 * - full: для отзывов на мобилке хотим ширину почти 100% — поэтому ставим width: 100%.
 */
function previewFrameStyle(
  aspectCss: string,
  maxH: string,
  widthMode: PreviewFrameWidthMode,
): CSSProperties {
  const trimmed = aspectCss.replace(/\s+/g, " ").trim();
  const m = trimmed.match(/^([\d.]+)\s*\/\s*([\d.]+)$/);
  if (!m) {
    return {
      aspectRatio: trimmed,
      maxHeight: maxH,
      width: widthMode === "full" ? "100%" : undefined,
      maxWidth: "100%",
      marginLeft: "auto",
      marginRight: "auto",
    };
  }
  const aw = parseFloat(m[1]);
  const ah = parseFloat(m[2]);
  if (!Number.isFinite(aw) || !Number.isFinite(ah) || aw <= 0 || ah <= 0) {
    return {
      aspectRatio: trimmed,
      maxHeight: maxH,
      width: widthMode === "full" ? "100%" : undefined,
      maxWidth: "100%",
      marginLeft: "auto",
      marginRight: "auto",
    };
  }
  if (widthMode === "full") {
    return {
      // В режиме reviews хотим максимально широкую картинку.
      // Поэтому не полагаемся на aspect-ratio (он может принудительно уменьшать ширину при max-height),
      // а задаём фиксированную высоту, а ширина остаётся 100% (object-fit: cover подрежет).
      height: maxH,
      width: "100%",
      maxWidth: "100%",
      marginLeft: "auto",
      marginRight: "auto",
    };
  }

  return {
    aspectRatio: `${aw} / ${ah}`,
    maxHeight: maxH,
    width: `min(100%, calc((${maxH}) * ${aw} / ${ah}))`,
    maxWidth: "100%",
    marginLeft: "auto",
    marginRight: "auto",
  };
}

/**
 * Полноэкранный просмотр слайдов карусели — тот же UI, что «Полный просмотр» в редакторе страниц.
 */
export function CarouselFullPreviewOverlay({
  session,
  onClose,
  onPrev,
  onNext,
  onSelectIndex,
  mode = "default",
}: {
  session: CarouselPreviewSessionState;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  /** Точный переход по индексу (нужно для мини-превью). */
  onSelectIndex?: (index: number) => void;
  /** Набор UI-поведения. */
  mode?: "default" | "reviews";
}) {
  const current = session.slides[session.index] ?? null;
  const canPrev = session.index > 0;
  const canNext = session.index < session.slides.length - 1;
  const aspect = resolveAspectRatioCss(session);
  const enableSwipe = mode === "reviews";
  // Для отзывов стрелки не нужны: листаем свайпом и переключаемся мини-превью.
  const showArrows = mode !== "reviews";
  const showThumbs = mode === "reviews";
  const mainAlignClass = mode === "reviews" ? "items-stretch" : "items-center";
  const overlayPaddingClass = mode === "reviews" ? "p-2 sm:p-4" : "p-4";

  // Мини-превью снизу:
  // На mobile хотим показывать больше карточек (4), а не 2.
  // Основную карусель страницы не трогаем (она использует useCarouselVisibleCount("reviews")).
  const reviewsVisibleCount = useCarouselVisibleCount("reviews");
  const thumbsVisibleCount =
    typeof window === "undefined"
      ? reviewsVisibleCount
      : window.innerWidth < 640
        ? 4
        : window.innerWidth >= 1024
          ? 12
          : reviewsVisibleCount;
  const thumbsMaxStart = Math.max(0, session.slides.length - thumbsVisibleCount);
  const thumbsSafeIndex = Math.max(0, Math.min(session.index, thumbsMaxStart));
  const thumbsDotCount = thumbsMaxStart + 1;

  // Для отзывов хотим максимально широкую картинку.
  // Резервируем немного высоты под счётчик и мини-превью, но не «съедаем» всю область.
  const frameMaxH =
    mode === "reviews"
      ? "min(64dvh, calc(100dvh - 18rem))"
      : "min(78vh, calc(100dvh - 7rem))";

  // Возвращаем расчёт по aspect-ratio: иначе фиксированная высота + width:100% сильнее обрезает по краям.
  // Для отзывов хотим более «полноэкранный» кадр по ширине.
  // Используем `object-contain` ниже, чтобы не ломать пропорции и не было сильной обрезки.
  // Делаем большой кадр с теми же пропорциями, что и мини-превью (A4: 210/297),
  // поэтому всегда используем computed (aspect-ratio), а не widthMode="full".
  const frameWidthMode: PreviewFrameWidthMode = "computed";

  const swipeThresholdPx = 45;
  const startXRef = useRef<number | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const clearSwipe = () => {
    startXRef.current = null;
    pointerIdRef.current = null;
  };

  // Свайп по мини-превью: листаем отзывы прямо в нижней карусели.
  const thumbSwipeThresholdPx = 45;
  const thumbStartXRef = useRef<number | null>(null);
  const thumbPointerIdRef = useRef<number | null>(null);

  const clearThumbSwipe = () => {
    thumbStartXRef.current = null;
    thumbPointerIdRef.current = null;
  };

  const onThumbPointerDownCapture = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!enableSwipe) return;
    // На десктопе клики по мини-превью должны выбирать слайд,
    // поэтому свайп по мини-превью отключаем для mouse.
    if (e.pointerType === "mouse") return;
    // Отрезаем верхний swipe по основному изображению.
    e.stopPropagation();
    thumbPointerIdRef.current = e.pointerId;
    thumbStartXRef.current = e.clientX;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onThumbPointerUpCapture = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!enableSwipe) return;
    if (e.pointerType === "mouse") return;
    if (thumbPointerIdRef.current !== e.pointerId || thumbStartXRef.current === null) return;
    e.stopPropagation();
    const dx = e.clientX - thumbStartXRef.current;
    clearThumbSwipe();
    if (dx < -thumbSwipeThresholdPx) onNext();
    else if (dx > thumbSwipeThresholdPx) onPrev();
  };

  const onOverlayPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!enableSwipe) return;
    const target = e.target as HTMLElement | null;
    // Не начинаем свайп при клике по управлению (крестик/кнопки/ссылки).
    if (target?.closest?.("button")) return;
    if (target?.closest?.('a[href]')) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    pointerIdRef.current = e.pointerId;
    startXRef.current = e.clientX;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onOverlayPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!enableSwipe) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest?.("button")) return;
    if (target?.closest?.('a[href]')) return;
    if (pointerIdRef.current !== e.pointerId || startXRef.current === null) return;
    const dx = e.clientX - startXRef.current;
    clearSwipe();
    if (dx < -swipeThresholdPx) onNext();
    else if (dx > swipeThresholdPx) onPrev();
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (canPrev) onPrev();
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        if (canNext) onNext();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, onPrev, onNext, canPrev, canNext]);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyPaddingRight = body.style.paddingRight;
    const scrollbarW = window.innerWidth - html.clientWidth;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    if (scrollbarW > 0) {
      body.style.paddingRight = `${scrollbarW}px`;
    }
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.paddingRight = prevBodyPaddingRight;
    };
  }, []);

  return (
    <div
      onPointerDown={onOverlayPointerDown}
      onPointerUp={onOverlayPointerUp}
      onPointerCancel={() => {
        if (!enableSwipe) return;
        clearSwipe();
      }}
      onLostPointerCapture={() => {
        if (!enableSwipe) return;
        clearSwipe();
      }}
      className={`fixed inset-0 flex ${
        mode === "reviews" ? "items-start justify-center overflow-y-auto" : "items-center justify-center"
      } bg-slate-900/45 ${overlayPaddingClass} backdrop-blur-sm`}
      style={{
        zIndex: 2147483647,
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Полный просмотр"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/40 bg-white/15 text-white hover:bg-white/25"
        aria-label="Закрыть полный просмотр"
      >
        ×
      </button>
      <div
        className={`flex w-full min-w-0 max-w-full shrink flex-col ${mainAlignClass} ${
          mode === "reviews" ? "pt-[4.5rem] md:pt-[2.5rem] pb-2" : ""
        }`}
      >
        {showArrows ? (
          <div className="relative inline-flex max-w-full flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={onPrev}
              disabled={!canPrev}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-white/15 text-white disabled:opacity-30"
              aria-label="Предыдущий слайд"
            >
              ‹
            </button>
              <div
                className="flex min-w-0 flex-col items-center"
              >
              <div
                className="relative overflow-hidden rounded-xl bg-slate-900/80 shadow-2xl"
                style={previewFrameStyle(aspect, frameMaxH, frameWidthMode)}
              >
                {current?.src ? (
                  <img
                    src={current.src}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-300">
                    {current?.label || "Слайд"}
                  </div>
                )}
              </div>
              <div className="mt-2 text-center text-xs text-white/80">
                {Math.min(session.index + 1, session.slides.length)} / {session.slides.length}
              </div>
            </div>
            <button
              type="button"
              onClick={onNext}
              disabled={!canNext}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-white/15 text-white disabled:opacity-30"
              aria-label="Следующий слайд"
            >
              ›
            </button>
          </div>
        ) : (
          <div
            className={`flex min-w-0 flex-col ${mode === "reviews" ? "items-stretch" : "items-center"}`}
          >
        <div
          className={`relative overflow-hidden rounded-xl shadow-2xl ${
            mode === "reviews" ? "bg-transparent" : "bg-slate-900/80"
          }`}
          style={previewFrameStyle(aspect, frameMaxH, frameWidthMode)}
        >
          {current?.src ? (
            <img
              src={current.src}
              alt=""
              className={`absolute inset-0 h-full w-full ${mode === "reviews" ? "object-contain" : "object-cover"}`}
              draggable={false}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-300">
              {current?.label || "Слайд"}
            </div>
          )}
        </div>
        <div className="mt-2 text-center text-xs text-white/80">
          {Math.min(session.index + 1, session.slides.length)} / {session.slides.length}
        </div>
          </div>
        )}

        {showThumbs ? (
          <div className={`${mode === "reviews" ? "mt-2 pb-1" : "mt-4"} w-full`}>
            <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-2">
              <div
                onPointerDownCapture={onThumbPointerDownCapture}
                onPointerUpCapture={onThumbPointerUpCapture}
                onPointerCancel={() => {
                  if (!enableSwipe) return;
                  clearThumbSwipe();
                }}
                onLostPointerCapture={() => {
                  if (!enableSwipe) return;
                  clearThumbSwipe();
                }}
                className="flex w-full min-w-0 items-stretch transition-transform duration-300 ease-out"
                style={{
                  transform: `translateX(-${thumbsSafeIndex * (100 / thumbsVisibleCount)}%)`,
                }}
              >
                {session.slides.map((s, i) => {
                  const isActive = i === session.index;
                  return (
                    <div
                      key={i}
                      className="box-border flex min-h-0 shrink-0 self-stretch px-1.5"
                      style={{
                        flex: `0 0 calc(100% / ${thumbsVisibleCount})`,
                        minWidth: 0,
                      }}
                    >
                      <button
                        type="button"
                        className="w-full text-left"
                        onPointerDown={(e) => {
                          // Иначе свайп-обработчик сверху может сработать.
                          e.stopPropagation();
                        }}
                        onClick={() => {
                          if (onSelectIndex) {
                            onSelectIndex(i);
                          } else if (i < session.index) {
                            onPrev();
                          } else if (i > session.index) {
                            onNext();
                          }
                        }}
                        aria-label={`Перейти к отзыву ${i + 1}`}
                      >
                        <div
                          className={`relative overflow-hidden rounded-lg border transition ${
                            isActive
                              ? "border-[#496db3] bg-[#496db3]/10 ring-2 ring-[#496db3]/45 shadow-[0_0_14px_rgba(73,109,179,0.25)]"
                              : "border-slate-200/70 hover:border-slate-200"
                          }`}
                          style={{ paddingTop: "141.4214%" }}
                        >
                          {s.src ? (
                            <img
                              src={s.src}
                              alt=""
                              className="absolute inset-0 h-full w-full object-cover"
                              draggable={false}
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-500">
                              {s.label}
                            </div>
                          )}
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
            {thumbsDotCount > 1 ? (
              <div
                className={`${mode === "reviews" ? "mt-2" : "mt-3"} flex items-center justify-center gap-2`}
                role="tablist"
                aria-label="Переключение мини-превью"
              >
                {Array.from({ length: thumbsDotCount }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    role="tab"
                    aria-selected={i === thumbsSafeIndex}
                    aria-label={`Слайд ${i + 1} из ${thumbsDotCount}`}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => onSelectIndex?.(i)}
                    className={`h-2.5 w-2.5 rounded-full border transition ${
                      i === thumbsSafeIndex
                        ? "border-[#496db3] bg-[#496db3] shadow-[0_0_0_2px_rgba(73,109,179,0.25)]"
                        : "border-[#496db3]/55 bg-white/5 hover:border-[#496db3] hover:bg-[#496db3]/10"
                    }`}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
