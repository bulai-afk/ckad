import { useLayoutEffect, useState } from "react";

/**
 * Сколько карточек в ряд в горизонтальной карусели.
 * Дефолт 2 — мобильный first (до первого layout не остаётся «1 карточка»).
 * Брейкпоинты как у Tailwind: sm 640px, lg 1024px.
 */
export function useCarouselVisibleCount(kind: "reviews" | "articles" | "partners"): number {
  const [n, setN] = useState(2);

  useLayoutEffect(() => {
    const apply = () => {
      const w = window.innerWidth;
      if (kind === "articles") {
        setN(w < 640 ? 2 : 4);
        return;
      }
      setN(w < 640 ? 2 : w < 1024 ? 4 : 6);
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
