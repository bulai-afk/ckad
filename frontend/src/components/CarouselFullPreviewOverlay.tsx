"use client";

import { useEffect, useRef, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";

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
  const showArrows = mode !== "reviews";
  const showThumbs = mode === "reviews";
  const overlayPaddingClass = mode === "reviews" ? "p-2 sm:p-4" : "p-4";
  // Для отзывов хотим максимально широкую картинку.
  // Резервируем немного высоты под счётчик и мини-превью, но не «съедаем» всю область.
  const frameMaxH =
    mode === "reviews"
      ? "min(96vh, calc(100dvh - 2.5rem))"
      : "min(78vh, calc(100dvh - 7rem))";

  const frameWidthMode: PreviewFrameWidthMode = mode === "reviews" ? "full" : "computed";

  const swipeThresholdPx = 45;
  const startXRef = useRef<number | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const clearSwipe = () => {
    startXRef.current = null;
    pointerIdRef.current = null;
  };

  const onOverlayPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!enableSwipe) return;
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
      className={`fixed inset-0 flex items-center justify-center bg-slate-900/45 ${overlayPaddingClass} backdrop-blur-sm`}
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
        className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/40 bg-white/15 text-white hover:bg-white/25"
        aria-label="Закрыть полный просмотр"
      >
        ×
      </button>
      <div className="flex w-full min-w-0 max-w-full shrink flex-col items-center">
        {showArrows ? (
          <div className="relative w-full flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={onPrev}
              disabled={!canPrev}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-white/15 text-white disabled:opacity-30"
              aria-label="Предыдущий слайд"
            >
              ‹
            </button>
              <div className="flex min-w-0 flex-col items-center">
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
        <div className="flex min-w-0 flex-col items-center">
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
        )}

        {showThumbs ? (
          <div className="mt-4 w-full">
            <div
              className="flex w-full gap-2 overflow-x-auto px-1 pb-1"
              aria-label="Мини-превью карусели"
              role="list"
              style={{ scrollSnapType: "x proximity" }}
            >
              {session.slides.map((s, i) => {
                const isActive = i === session.index;
                return (
                  <button
                    key={i}
                    type="button"
                    role="listitem"
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
                    className={`shrink-0 rounded-lg border transition ${
                      isActive ? "border-white/70" : "border-white/20 hover:border-white/50"
                    }`}
                    aria-label={`Перейти к отзыву ${i + 1}`}
                    style={{
                      width: 56,
                      height: 40,
                      scrollSnapAlign: "center",
                      padding: 0,
                      overflow: "hidden",
                      background: "rgba(255,255,255,0.03)",
                    }}
                  >
                    {s.src ? (
                      // Миниатюра: показываем покрытием, без сохранения aspect — чтобы не было «высоких» миниатюр.
                      <img src={s.src} alt="" className="h-full w-full object-cover" draggable={false} />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-white/50">
                        {s.label}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
