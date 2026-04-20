"use client";

import { useEffect, useMemo, useState } from "react";
import { apiBaseUrl } from "@/lib/apiBaseUrl";

type PartnerSlide = {
  id: string;
  image: string | null;
};

type HomePartnersCarouselProps = {
  slides: PartnerSlide[];
};

const partnerLogoCellClass = "mx-auto block min-w-0 h-auto w-full max-h-10 object-contain px-2 sm:max-h-12 sm:px-3";

export function HomePartnersCarousel({ slides }: HomePartnersCarouselProps) {
  const [runtimeSlides, setRuntimeSlides] = useState<PartnerSlide[]>(
    Array.isArray(slides) ? slides : [],
  );

  useEffect(() => {
    if (slides.length > 0) {
      setRuntimeSlides(slides);
      return;
    }
    void (async () => {
      try {
        const res = await fetch(`${apiBaseUrl()}/api/pages/partners`, {
          method: "GET",
          headers: { Accept: "application/json" },
        });
        if (!res.ok) return;
        const data = (await res.json()) as { slides?: PartnerSlide[] };
        if (Array.isArray(data.slides)) {
          setRuntimeSlides(data.slides);
        }
      } catch {
        /* keep empty */
      }
    })();
  }, [slides]);

  const normalized = useMemo(
    () =>
      runtimeSlides.filter(
        (s): s is PartnerSlide =>
          typeof s === "object" &&
          s !== null &&
          typeof s.id === "string" &&
          (typeof s.image === "string" || s.image === null),
      ),
    [runtimeSlides],
  );

  if (normalized.length === 0) {
    return null;
  }

  const gridClass =
    "mx-auto mt-10 grid w-full grid-cols-2 items-center justify-items-center gap-x-8 gap-y-10 sm:grid-cols-3 sm:gap-x-10 md:grid-cols-4";

  return (
    <section className="py-8 sm:py-10">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <h2 className="text-center text-lg/8 font-semibold text-gray-900">Наши партнеры</h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-sm leading-relaxed text-gray-600">
          Рядом с нами компании и организации, которым доверяют сложные проекты: вместе мы усиливаем экспертизу
          в каталогизации и анализе данных.
        </p>
        <div className={gridClass}>
          {normalized.map((slide, slideIndex) =>
            slide.image ? (
              <img
                key={slide.id}
                alt={`Партнёр ${slideIndex + 1}`}
                src={slide.image}
                width={158}
                height={48}
                className={partnerLogoCellClass}
                draggable={false}
              />
            ) : (
              <div
                key={slide.id}
                className="flex min-h-12 min-w-0 w-full items-center justify-center px-2 text-xs text-gray-400 sm:px-3"
              >
                Логотип
              </div>
            ),
          )}
        </div>
      </div>
    </section>
  );
}
