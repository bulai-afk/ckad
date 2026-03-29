import { useLayoutEffect, useState } from "react";

/**
 * Сколько карточек в ряд в горизонтальной карусели.
 * Брейкпоинты как у Tailwind: sm 640px, lg 1024px.
 *
 * На SSR нет window — подставляем значение ближе к типичному десктопу (6 / 4),
 * чтобы при обновлении страницы не мигала сетка «2 карточки → норма».
 * После гидрации useLayoutEffect сразу выставляет фактическую ширину (в т.ч. мобильный «2»).
 */
function computeFromWidth(kind: "reviews" | "articles" | "partners", w: number): number {
  if (kind === "articles") return w < 640 ? 2 : 4;
  return w < 640 ? 2 : w < 1024 ? 4 : 6;
}

function initialCount(kind: "reviews" | "articles" | "partners"): number {
  if (typeof window !== "undefined") {
    return computeFromWidth(kind, window.innerWidth);
  }
  if (kind === "articles") return 4;
  return 6;
}

export function useCarouselVisibleCount(kind: "reviews" | "articles" | "partners"): number {
  const [n, setN] = useState(() => initialCount(kind));

  useLayoutEffect(() => {
    const apply = () => {
      setN(computeFromWidth(kind, window.innerWidth));
    };

    apply();

    const mqSm = window.matchMedia("(max-width: 639px)");
    const mqMd = window.matchMedia("(min-width: 640px) and (max-width: 1023px)");
    const mqLg = window.matchMedia("(min-width: 1024px)");

    const onChange = () => apply();
    mqSm.addEventListener("change", onChange);
    mqMd.addEventListener("change", onChange);
    mqLg.addEventListener("change", onChange);
    window.addEventListener("resize", onChange);

    return () => {
      mqSm.removeEventListener("change", onChange);
      mqMd.removeEventListener("change", onChange);
      mqLg.removeEventListener("change", onChange);
      window.removeEventListener("resize", onChange);
    };
  }, [kind]);

  return n;
}
