import { useLayoutEffect, useState } from "react";

/**
 * Сколько карточек в ряд в горизонтальной карусели.
 * Брейкпоинты как у Tailwind: sm 640px, lg 1024px.
 *
 * Новости (`articles`): **1 / 2 / 3** (узкий / средний / широкий).
 * Отзывы: **2 / 4 / 6**. Партнёры (логотипы): **3 / 4 / 6** — на мобилке три в ряд.
 *
 * Начальное значение без `window` подобрано под тип карусели, чтобы реже мигать до layout;
 * точное число ставит `useLayoutEffect` (до первого paint).
 */
function computeFromWidth(kind: "reviews" | "articles" | "partners", w: number): number {
  if (kind === "articles") {
    return w < 640 ? 1 : w < 1024 ? 2 : 3;
  }
  if (kind === "partners") {
    return w < 640 ? 3 : w < 1024 ? 4 : 6;
  }
  return w < 640 ? 2 : w < 1024 ? 4 : 6;
}

function initialVisibleCount(kind: "reviews" | "articles" | "partners"): number {
  if (kind === "articles") return 1;
  if (kind === "partners") return 3;
  return 2;
}

export function useCarouselVisibleCount(kind: "reviews" | "articles" | "partners"): number {
  const [n, setN] = useState(() => initialVisibleCount(kind));

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
