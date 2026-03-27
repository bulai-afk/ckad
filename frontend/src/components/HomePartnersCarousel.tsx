"use client";

import { useEffect, useMemo, useState } from "react";

type PartnerSlide = {
  id: string;
  image: string | null;
};

type HomePartnersCarouselProps = {
  slides: PartnerSlide[];
};

export function HomePartnersCarousel({ slides }: HomePartnersCarouselProps) {
  const [runtimeSlides, setRuntimeSlides] = useState<PartnerSlide[]>(
    Array.isArray(slides) ? slides : [],
  );
  const [index, setIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(4);

  useEffect(() => {
    if (slides.length > 0) {
      setRuntimeSlides(slides);
      return;
    }
    void (async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
        const res = await fetch(`${apiUrl}/api/pages/partners`, {
          method: "GET",
          headers: { Accept: "application/json" },
        });
        if (!res.ok) return;
        const data = (await res.json()) as { slides?: PartnerSlide[] };
        if (Array.isArray(data.slides)) {
          setRuntimeSlides(data.slides);
        }
      } catch {
        // keep empty state
      }
    })();
  }, [slides]);

  useEffect(() => {
    const updateVisibleCount = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setVisibleCount(2);
        return;
      }
      if (width < 1024) {
        setVisibleCount(3);
        return;
      }
      setVisibleCount(5);
    };
    updateVisibleCount();
    window.addEventListener("resize", updateVisibleCount);
    return () => window.removeEventListener("resize", updateVisibleCount);
  }, []);

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

  const maxStart = Math.max(0, normalized.length - visibleCount);
  const safeIndex = Math.max(0, Math.min(index, maxStart));
  const canPrev = safeIndex > 0;
  const canNext = safeIndex < maxStart;

  useEffect(() => {
    if (index !== safeIndex) {
      setIndex(safeIndex);
    }
  }, [index, safeIndex]);

  if (normalized.length === 0) {
    return null;
  }

  return (
    <section className="bg-transparent p-0">
      <div
        className="mb-4 flex items-center justify-center text-[13px] font-semibold tracking-tight"
        style={{ fontSize: "clamp(10px, 1.2vw, 16px)" }}
      >
        <h2
          className="text-center uppercase text-[#496db3]"
          style={{
            fontSize: "230%",
            lineHeight: 1.1,
            fontWeight: 950,
            textShadow:
              "0.35px 0 currentColor, -0.35px 0 currentColor, 0 0.35px currentColor, 0 -0.35px currentColor",
          }}
        >
          Наши партнеры
        </h2>
      </div>

      <div className="relative overflow-hidden rounded-xl bg-slate-100 p-3">
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setIndex((prev) => (prev > 0 ? prev - 1 : prev))}
            disabled={!canPrev}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-slate-100 text-xl leading-none text-slate-700 shadow-sm disabled:opacity-40"
            aria-label="Предыдущие партнеры"
          >
            ‹
          </button>

          <div
            className="w-full overflow-hidden rounded-xl bg-slate-100 p-2"
            style={{ clipPath: "inset(0 5px 0 5px)" }}
          >
            <div
              className="flex transition-transform duration-300 ease-out"
              style={{ transform: `translateX(-${safeIndex * (100 / visibleCount)}%)` }}
            >
              {normalized.map((slide, slideIndex) => (
                <div
                  key={slide.id}
                  className="shrink-0 px-1.5"
                  style={{ flexBasis: `${100 / visibleCount}%` }}
                >
                  <div
                    className="relative overflow-hidden rounded-lg border border-slate-200 bg-white"
                    style={{ paddingTop: "100%" }}
                  >
                    <div
                      className="absolute inset-0 block h-full w-full"
                      aria-label={`Партнер ${slideIndex + 1} из ${normalized.length}`}
                      role="img"
                    >
                      {slide.image ? (
                        <img
                          src={slide.image}
                          alt={`Партнер ${slideIndex + 1}`}
                          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                          draggable={false}
                        />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center text-xs text-slate-500">
                          Слайд партнера
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIndex((prev) => (prev < maxStart ? prev + 1 : prev))}
            disabled={!canNext}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-slate-100 text-xl leading-none text-slate-700 shadow-sm disabled:opacity-40"
            aria-label="Следующие партнеры"
          >
            ›
          </button>
        </div>
      </div>

    </section>
  );
}
