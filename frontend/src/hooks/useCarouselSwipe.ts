import { useCallback, useRef } from "react";

const DEFAULT_THRESHOLD_PX = 50;

export type CarouselSwipeTouchHandlers = {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
};

/**
 * Горизонтальный свайп: влево → onNext, вправо → onPrev (как у нативных каруселей).
 */
export function useCarouselSwipe(
  onPrev: () => void,
  onNext: () => void,
  options?: { enabled?: boolean; thresholdPx?: number },
): CarouselSwipeTouchHandlers {
  const { enabled = true, thresholdPx = DEFAULT_THRESHOLD_PX } = options ?? {};
  const startXRef = useRef<number | null>(null);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled) return;
      startXRef.current = e.touches[0].clientX;
    },
    [enabled],
  );

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled || startXRef.current === null) return;
      const endX = e.changedTouches[0].clientX;
      const dx = endX - startXRef.current;
      startXRef.current = null;
      if (dx < -thresholdPx) onNext();
      else if (dx > thresholdPx) onPrev();
    },
    [enabled, onNext, onPrev, thresholdPx],
  );

  return { onTouchStart, onTouchEnd };
}
