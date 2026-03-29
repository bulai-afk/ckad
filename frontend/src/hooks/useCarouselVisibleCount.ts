import { useLayoutEffect, useState } from "react";

/**
 * Сколько карточек в ряд в горизонтальной карусели.
 * Брейкпоинты как у Tailwind: sm 640px, lg 1024px.
 *
 * На SSR нет window: дефолт **2** (узкий ряд). Иначе HTML рисуется как «6 карточек»,
 * на телефоне после гидрации мелькает десктоп, потом useLayoutEffect ставит 2.
 * На десктопе после гидрации сразу подстраивается до 4/6 (до первого paint через useLayoutEffect).
 */
function computeFromWidth(kind: "reviews" | "articles" | "partners", w: number): number {
  if (kind === "articles") return w < 640 ? 2 : 4;
  return w < 640 ? 2 : w < 1024 ? 4 : 6;
}

const SSR_FALLBACK_VISIBLE = 2;

function initialCount(kind: "reviews" | "articles" | "partners"): number {
  if (typeof window !== "undefined") {
    return computeFromWidth(kind, window.innerWidth);
  }
  return SSR_FALLBACK_VISIBLE;
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
