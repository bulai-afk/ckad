import { useLayoutEffect, useState } from "react";

/**
 * Сколько карточек в ряд в горизонтальной карусели.
 * Брейкпоинты как у Tailwind: sm 640px, lg 1024px.
 *
 * Новости (`articles`): **1 / 2 / 3** (узкий / средний / широкий).
 * Отзывы и партнёры: **2 / 4 / 6**.
 *
 * Начальное состояние **2** без чтения window — SSR и первый клиентский кадр совпадают;
 * фактическое число ставит useLayoutEffect (до первого paint).
 */
function computeFromWidth(kind: "reviews" | "articles" | "partners", w: number): number {
  if (kind === "articles") {
    return w < 640 ? 1 : w < 1024 ? 2 : 3;
  }
  return w < 640 ? 2 : w < 1024 ? 4 : 6;
}

const INITIAL_VISIBLE = 2;

export function useCarouselVisibleCount(kind: "reviews" | "articles" | "partners"): number {
  const [n, setN] = useState(INITIAL_VISIBLE);

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
