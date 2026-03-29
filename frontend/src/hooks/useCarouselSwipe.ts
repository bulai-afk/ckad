import { useCallback, useRef } from "react";

const DEFAULT_THRESHOLD_PX = 45;

export type CarouselSwipeHandlers = {
  onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerCancel: (e: React.PointerEvent<HTMLElement>) => void;
  onLostPointerCapture: (e: React.PointerEvent<HTMLElement>) => void;
};

/**
 * Горизонтальный свайп: влево → onNext, вправо → onPrev.
 * Pointer Events + setPointerCapture — стабильнее на мобильных, чем только touch
 * (жест не «теряется» при выходе пальца за границу и при конфликте со скроллом).
 */
export function useCarouselSwipe(
  onPrev: () => void,
  onNext: () => void,
  options?: { enabled?: boolean; thresholdPx?: number },
): CarouselSwipeHandlers {
  const { enabled = true, thresholdPx = DEFAULT_THRESHOLD_PX } = options ?? {};
  const startXRef = useRef<number | null>(null);
  const pointerIdRef = useRef<number | null>(null);

  const clear = useCallback(() => {
    startXRef.current = null;
    pointerIdRef.current = null;
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!enabled) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      pointerIdRef.current = e.pointerId;
      startXRef.current = e.clientX;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    },
    [enabled],
  );

  const finishSwipe = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!enabled || pointerIdRef.current !== e.pointerId || startXRef.current === null) {
        clear();
        return;
      }
      const dx = e.clientX - startXRef.current;
      clear();
      if (dx < -thresholdPx) onNext();
      else if (dx > thresholdPx) onPrev();
    },
    [enabled, onNext, onPrev, thresholdPx, clear],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      finishSwipe(e);
    },
    [finishSwipe],
  );

  const onPointerCancel = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (pointerIdRef.current === e.pointerId) clear();
    },
    [clear],
  );

  const onLostPointerCapture = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (pointerIdRef.current === e.pointerId) clear();
    },
    [clear],
  );

  return {
    onPointerDown,
    onPointerUp,
    onPointerCancel,
    onLostPointerCapture,
  };
}
