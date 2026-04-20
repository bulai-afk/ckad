"use client";

import { EllipsisVerticalIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiGet, apiPut } from "@/lib/api";
import { useCarouselSwipe } from "@/hooks/useCarouselSwipe";

type ReviewSlide = {
  id: string;
  image: string | null;
};

const INITIAL_SLIDES: ReviewSlide[] = [
  { id: "1", image: null },
  { id: "2", image: null },
  { id: "3", image: null },
];

function isWebpDataUrl(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith("data:image/webp");
}

async function convertAnyImageToWebpDataUrl(
  source: File | string,
  options?: { maxWidth?: number; maxHeight?: number },
): Promise<string> {
  const sourceDataUrl =
    typeof source === "string"
      ? source
      : await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
          reader.onerror = () => resolve("");
          reader.readAsDataURL(source);
        });

  if (!sourceDataUrl) return "";

  const image = await new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = sourceDataUrl;
  });

  if (!image || !image.naturalWidth || !image.naturalHeight) return sourceDataUrl;

  // Keep images compact to avoid large payloads in admin saves.
  const maxWidth = options?.maxWidth ?? 1200;
  const maxHeight = options?.maxHeight ?? 1200;
  const widthScale = maxWidth > 0 ? maxWidth / image.naturalWidth : 1;
  const heightScale = maxHeight > 0 ? maxHeight / image.naturalHeight : 1;
  const scale = Math.min(1, widthScale, heightScale);
  const targetWidth = Math.max(1, Math.round(image.naturalWidth * scale));
  const targetHeight = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return sourceDataUrl;
  ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

  const blobDataUrl = await new Promise<string>((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (!blob || blob.type !== "image/webp") {
          resolve("");
          return;
        }
        const blobReader = new FileReader();
        blobReader.onload = () =>
          resolve(typeof blobReader.result === "string" ? blobReader.result : "");
        blobReader.onerror = () => resolve("");
        blobReader.readAsDataURL(blob);
      },
      "image/webp",
      0.72,
    );
  });
  if (blobDataUrl.startsWith("data:image/webp")) return blobDataUrl;

  try {
    const webp = canvas.toDataURL("image/webp", 0.72);
    return webp.startsWith("data:image/webp") ? webp : sourceDataUrl;
  } catch {
    return sourceDataUrl;
  }
}

async function normalizeSlidesToWebp(
  slides: ReviewSlide[],
  options?: { maxWidth?: number; maxHeight?: number },
): Promise<ReviewSlide[]> {
  return Promise.all(
    slides.map(async (slide) => {
      if (!slide.image || isWebpDataUrl(slide.image)) return slide;
      const converted = await convertAnyImageToWebpDataUrl(slide.image, options);
      return { ...slide, image: converted };
    }),
  );
}

export function ReviewsVerticalCarousel({
  title = "Отзывы и письма благодарности",
  apiPath = "/api/pages/reviews",
  aspect = "a4",
}: {
  title?: string;
  apiPath?: "/api/pages/reviews" | "/api/pages/partners";
  aspect?: "a4" | "square";
}) {
  const [slides, setSlides] = useState<ReviewSlide[]>(INITIAL_SLIDES);
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewportStart, setViewportStart] = useState(0);
  const [visibleCount, setVisibleCount] = useState(4);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveTone, setSaveTone] = useState<"success" | "error">("success");
  const actionsRef = useRef<HTMLDivElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const maxViewportStart = Math.max(0, slides.length - visibleCount);
  const canPrev = viewportStart > 0;
  const canNext = viewportStart < maxViewportStart;
  const activeSlide = useMemo(() => slides[activeIndex] ?? null, [slides, activeIndex]);
  const slidePaddingTop = aspect === "square" ? "100%" : "141.4214%";
  const isPartnersMode = apiPath === "/api/pages/partners";

  useEffect(() => {
    let isMounted = true;
    void apiGet<{ slides?: ReviewSlide[] }>(apiPath)
      .then((response) => {
        if (!isMounted) return;
        const loaded = Array.isArray(response?.slides)
          ? response.slides
              .filter((item): item is ReviewSlide => !!item && typeof item.id === "string")
              .map((item) => ({
                id: item.id,
                image: typeof item.image === "string" ? item.image : null,
              }))
          : [];
        if (loaded.length === 0) return;
        setSlides(loaded);
        setActiveIndex(0);
        setViewportStart(0);
      })
      .catch(() => {
        // keep defaults if API is unavailable
      });
    return () => {
      isMounted = false;
    };
  }, [apiPath]);

  useEffect(() => {
    if (!actionsOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (actionsRef.current?.contains(target)) return;
      setActionsOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [actionsOpen]);

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
      setVisibleCount(apiPath === "/api/pages/partners" ? 5 : 4);
    };
    updateVisibleCount();
    window.addEventListener("resize", updateVisibleCount);
    return () => window.removeEventListener("resize", updateVisibleCount);
  }, [apiPath]);

  function goPrev() {
    setViewportStart((prev) => (prev > 0 ? prev - 1 : prev));
  }

  function goNext() {
    setViewportStart((prev) => (prev < maxViewportStart ? prev + 1 : prev));
  }

  const reviewsCarouselSwipe = useCarouselSwipe(goPrev, goNext, {
    enabled: maxViewportStart > 0,
  });

  function addSlide() {
    setSlides((prev) => [...prev, { id: String(Date.now()), image: null }]);
  }

  function removeActiveSlide() {
    if (slides.length <= 1) return;
    setSlides((prev) => {
      const next = prev.filter((_, idx) => idx !== activeIndex);
      const nextActive = Math.max(0, Math.min(activeIndex, next.length - 1));
      setActiveIndex(nextActive);
      setViewportStart((prevStart) =>
        Math.max(0, Math.min(prevStart, Math.max(0, next.length - visibleCount))),
      );
      return next;
    });
  }

  function onUploadToActive(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0 || !activeSlide) return;

    const resizeOptions = isPartnersMode
      ? { maxWidth: 1200, maxHeight: Number.POSITIVE_INFINITY }
      : undefined;
    void Promise.all(files.map((f) => convertAnyImageToWebpDataUrl(f, resizeOptions))).then((images) => {
      const validImages = images.filter(Boolean);
      if (validImages.length === 0) return;

      setSlides((prev) => {
        const next = [...prev];
        const startIndex = Math.max(0, Math.min(activeIndex, next.length - 1));
        validImages.forEach((image, offset) => {
          const targetIndex = startIndex + offset;
          if (targetIndex < next.length) {
            next[targetIndex] = { ...next[targetIndex], image };
          } else {
            next.push({ id: String(Date.now() + offset), image });
          }
        });
        return next;
      });
    });
    event.currentTarget.value = "";
  }

  useEffect(() => {
    if (slides.length === 0) return;
    const clampedActive = Math.max(0, Math.min(activeIndex, slides.length - 1));
    if (clampedActive !== activeIndex) {
      setActiveIndex(clampedActive);
      return;
    }
    if (viewportStart > maxViewportStart) {
      setViewportStart(maxViewportStart);
    }
  }, [activeIndex, slides.length, viewportStart, maxViewportStart]);

  async function handleSave() {
    try {
      const resizeOptions = isPartnersMode
        ? { maxWidth: 1200, maxHeight: Number.POSITIVE_INFINITY }
        : undefined;
      const normalized = await normalizeSlidesToWebp(slides, resizeOptions);
      setSlides(normalized);
      const payload = {
        slides: normalized.map((s) => ({
          id: String(s.id),
          image: s.image,
        })),
      };
      await apiPut<{ ok: boolean; slides?: ReviewSlide[] }>(
        apiPath,
        payload,
        120_000,
      );
      setSaveTone("success");
      setSaveMessage("Сохранено");
      window.setTimeout(() => setSaveMessage(null), 1800);
    } catch (error) {
      setSaveTone("error");
      setSaveMessage("Не удалось сохранить");
      window.setTimeout(() => setSaveMessage(null), 2200);
    }
  }

  return (
    <section className="relative rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <div className="flex items-center gap-2">
          <div ref={actionsRef} className="relative z-20">
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-200 bg-white text-slate-700 transition-colors hover:border-[#496db3] hover:text-[#496db3]"
              onClick={() => setActionsOpen((v) => !v)}
              aria-label="Действия со слайдами"
              aria-expanded={actionsOpen}
            >
              <EllipsisVerticalIcon className="h-4 w-4" />
            </button>
            {actionsOpen ? (
              <div className="absolute right-0 top-full z-30 mt-2 w-64 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  className="w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100"
                  onClick={() => {
                    uploadInputRef.current?.click();
                    setActionsOpen(false);
                  }}
                >
                  Загрузить изображения
                </button>
                <button
                  type="button"
                  className="w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100"
                  onClick={() => {
                    addSlide();
                    setActionsOpen(false);
                  }}
                >
                  Добавить слайд
                </button>
                <button
                  type="button"
                  className="w-full px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50 disabled:opacity-40"
                  onClick={() => {
                    removeActiveSlide();
                    setActionsOpen(false);
                  }}
                  disabled={slides.length <= 1}
                >
                  Удалить активный слайд
                </button>
              </div>
            ) : null}
            <input
              ref={uploadInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={onUploadToActive}
            />
          </div>
          <button
            type="button"
            className="rounded-full bg-[#496db3] px-3 py-1.5 text-xs font-semibold text-white hover:brightness-105"
            onClick={handleSave}
          >
            Сохранить
          </button>
        </div>
      </div>

      {saveMessage ? (
        <div
          className={`fixed right-6 top-[4.5rem] z-50 flex items-center gap-2 rounded border px-3 py-1.5 text-xs font-medium shadow-md ${
            saveTone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
          role="status"
          aria-live="polite"
        >
          <span>{saveMessage}</span>
          <button
            type="button"
            onClick={() => setSaveMessage(null)}
            className={`-mr-1 rounded p-0.5 ${
              saveTone === "success"
                ? "text-emerald-600 hover:bg-emerald-100 hover:text-emerald-900"
                : "text-red-600 hover:bg-red-100 hover:text-red-900"
            }`}
            aria-label="Закрыть"
          >
            <XMarkIcon className="h-3 w-3 [stroke-width:2.2]" />
          </button>
        </div>
      ) : null}

      <div className="relative overflow-hidden rounded-xl bg-slate-100 p-4">
        <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={goPrev}
          disabled={!canPrev}
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-slate-100 text-2xl leading-none text-slate-700 shadow-sm disabled:opacity-40"
          aria-label="Предыдущий слайд"
        >
          ‹
        </button>

        <div
          className="w-full max-w-[980px] touch-pan-y overflow-hidden rounded-xl bg-slate-100 p-2"
          style={{ clipPath: "inset(0 5px 0 5px)" }}
          {...reviewsCarouselSwipe}
        >
          <div
            className="flex transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${viewportStart * (100 / visibleCount)}%)` }}
          >
            {slides.map((slide, idx) => {
              const isActive = idx === activeIndex;
              return (
                <div
                  key={slide.id}
                  className="shrink-0 px-1.5"
                  style={{ flexBasis: `${100 / visibleCount}%` }}
                >
                  <button
                    type="button"
                    className="w-full text-left"
                    onPointerDown={(e) => {
                      /* Иначе useCarouselSwipe на родителе делает setPointerCapture и ломает click по слайду */
                      e.stopPropagation();
                    }}
                    onClick={() => setActiveIndex(idx)}
                    aria-label={`Выбрать слайд ${idx + 1}`}
                  >
                    <div
                      className={`relative overflow-hidden rounded-lg border bg-white transition-all ${
                        isActive
                          ? "border-[#496db3] ring-2 ring-[#496db3]/35"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                      style={{ paddingTop: slidePaddingTop }}
                    >
                      {slide.image ? (
                        <img
                          src={slide.image}
                          alt=""
                          className={`absolute inset-0 h-full w-full ${
                            isPartnersMode ? "object-contain p-1.5" : "object-cover"
                          }`}
                        />
                      ) : (
                        <div className="absolute inset-0 flex h-full w-full items-center justify-center text-xs text-slate-500">
                          {isPartnersMode ? "Логотип партнера" : "Вертикальный слайд"}
                        </div>
                      )}
                    </div>
                  </button>
                </div>
              );
            })}
            {slides.length < visibleCount
              ? Array.from({ length: visibleCount - slides.length }).map((_, idx) => (
                  <div
                    key={`empty-${idx}`}
                    className="shrink-0 px-1.5"
                    style={{ flexBasis: `${100 / visibleCount}%` }}
                  >
                    <div
                      className="rounded-lg border border-dashed border-slate-200 bg-white/60"
                      style={{ paddingTop: slidePaddingTop }}
                    />
                  </div>
                ))
              : null}
          </div>
        </div>

        <button
          type="button"
          onClick={goNext}
          disabled={!canNext}
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-slate-100 text-2xl leading-none text-slate-700 shadow-sm disabled:opacity-40"
          aria-label="Следующий слайд"
        >
          ›
        </button>
        </div>
      </div>
    </section>
  );
}

