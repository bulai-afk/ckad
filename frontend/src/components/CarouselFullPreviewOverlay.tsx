"use client";

import { useEffect, type CSSProperties } from "react";

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

/** Размер кадра от высоты viewport: max-height + ширина из aspect-ratio (не от max-width контейнера). */
function previewFrameStyle(aspectCss: string): CSSProperties {
  const maxH = "min(78vh, calc(100dvh - 7rem))";
  const trimmed = aspectCss.replace(/\s+/g, " ").trim();
  const m = trimmed.match(/^([\d.]+)\s*\/\s*([\d.]+)$/);
  if (!m) {
    return {
      aspectRatio: trimmed,
      maxHeight: maxH,
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
}: {
  session: CarouselPreviewSessionState;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const current = session.slides[session.index] ?? null;
  const canPrev = session.index > 0;
  const canNext = session.index < session.slides.length - 1;
  const aspect = resolveAspectRatioCss(session);

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
      className="fixed inset-0 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm"
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
      <button
        type="button"
        onClick={onPrev}
        disabled={!canPrev}
        className="mr-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-white/15 text-white disabled:opacity-30"
        aria-label="Предыдущий слайд"
      >
        ‹
      </button>
      <div className="flex w-full min-w-0 max-w-full shrink flex-col items-center">
        <div
          className="relative overflow-hidden rounded-xl bg-slate-900/80 shadow-2xl"
          style={previewFrameStyle(aspect)}
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
        className="ml-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-white/15 text-white disabled:opacity-30"
        aria-label="Следующий слайд"
      >
        ›
      </button>
    </div>
  );
}
