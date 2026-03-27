/**
 * Механика карусели как в SAB-AUTO: сдвиг ленты через transform (не scrollLeft).
 * Смещение хранится в WeakMap — не попадает в сохранённый HTML.
 */

export const PAGE_WEB_CAROUSEL_GAP_PX = 8;

const translatePxByViewport = new WeakMap<HTMLElement, number>();

export function readCarouselTranslatePx(vp: HTMLElement): number {
  return translatePxByViewport.get(vp) ?? 0;
}

export function getCarouselVisibleSlides(vp: HTMLElement): number {
  const carousel = vp.closest(".page-web-carousel") as HTMLElement | null;
  const aspect = carousel?.getAttribute("data-carousel-aspect") || "horizontal";
  const isVerticalOrSquare =
    aspect === "vertical" || aspect === "square" || aspect === "a4";
  const winW =
    (typeof window !== "undefined" ? window.innerWidth : 0) ||
    vp.ownerDocument?.documentElement?.clientWidth ||
    vp.clientWidth ||
    0;
  if (isVerticalOrSquare) {
    if (winW < 768) return 2;
    if (winW < 1024) return 3;
    return 4;
  }
  if (winW < 768) return 1;
  if (winW < 1024) return 2;
  return 3;
}

export function getCarouselSlideWidthPx(innerWidthPx: number, visibleSlides: number): number {
  const visible = Math.max(1, Math.floor(visibleSlides));
  const totalGap = Math.max(0, visible - 1) * PAGE_WEB_CAROUSEL_GAP_PX;
  return Math.max(0, (innerWidthPx - totalGap) / visible);
}

function viewportInnerWidth(vp: HTMLElement): number {
  const cs = getComputedStyle(vp);
  const pl = parseFloat(cs.paddingLeft) || 0;
  const pr = parseFloat(cs.paddingRight) || 0;
  return Math.max(0, vp.clientWidth - pl - pr);
}

/** Ширина одной карточки (grid-колонка ≈ треть видимой области). */
function slidePxFromVp(vp: HTMLElement): number {
  const cssSlidePx = parseFloat(vp.style.getPropertyValue("--carousel-slide-px"));
  if (Number.isFinite(cssSlidePx) && cssSlidePx > 0) return cssSlidePx;
  const strip = vp.querySelector(":scope > .page-web-carousel-strip") as HTMLElement | null;
  const first = strip?.querySelector(".page-web-carousel-slide") as HTMLElement | null;
  if (first && first.offsetWidth > 0) return first.offsetWidth;
  const inner = viewportInnerWidth(vp);
  if (inner <= 0) return 0;
  return getCarouselSlideWidthPx(inner, getCarouselVisibleSlides(vp));
}

function stripTrackWidthPx(vp: HTMLElement): number {
  const strip = vp.querySelector(":scope > .page-web-carousel-strip") as HTMLElement | null;
  if (!strip) return 0;
  const w = strip.scrollWidth;
  if (w > 0) return w;
  const nSlides = strip.querySelectorAll(".page-web-carousel-slide").length;
  const sp = slidePxFromVp(vp);
  if (nSlides === 0 || sp <= 0) return 0;
  return nSlides * sp + Math.max(0, nSlides - 1) * PAGE_WEB_CAROUSEL_GAP_PX;
}

function maxTranslatePx(vp: HTMLElement): number {
  const inner = viewportInnerWidth(vp);
  const track = stripTrackWidthPx(vp);
  return Math.max(0, track - inner);
}

function syncCarouselArrowDisabledState(vp: HTMLElement, offsetPx: number, maxOffsetPx: number): void {
  const carousel = vp.closest(".page-web-carousel") as HTMLElement | null;
  if (!carousel) return;
  const prev = carousel.querySelector(".page-web-carousel-prev") as HTMLButtonElement | null;
  const next = carousel.querySelector(".page-web-carousel-next") as HTMLButtonElement | null;
  const prevDisabled = offsetPx <= 0.1;
  const nextDisabled = offsetPx >= maxOffsetPx - 0.1;
  if (prev) {
    prev.disabled = prevDisabled;
    prev.setAttribute("aria-disabled", prevDisabled ? "true" : "false");
  }
  if (next) {
    next.disabled = nextDisabled;
    next.setAttribute("aria-disabled", nextDisabled ? "true" : "false");
  }
}

/** Левый край слайда в координатах ленты (устойчиво к `position: relative` у активного слайда). */
function slideLeftRelativeToStrip(strip: HTMLElement, slide: HTMLElement): number {
  const sr = strip.getBoundingClientRect();
  const sl = slide.getBoundingClientRect();
  return sl.left - sr.left;
}

/** Шаг в px на один слайд (ширина колонки + gap). */
export function getCarouselSlideStepPx(vp: HTMLElement): number {
  const strip = vp.querySelector(":scope > .page-web-carousel-strip") as HTMLElement | null;
  const slides = strip?.querySelectorAll(".page-web-carousel-slide");
  if (strip && slides && slides.length >= 2) {
    const d =
      slideLeftRelativeToStrip(strip, slides[1] as HTMLElement) -
      slideLeftRelativeToStrip(strip, slides[0] as HTMLElement);
    if (d > 1) return d;
  }
  const sp = slidePxFromVp(vp);
  if (sp > 0) return sp + PAGE_WEB_CAROUSEL_GAP_PX;
  const inner = viewportInnerWidth(vp);
  if (inner > 0) return getCarouselSlideWidthPx(inner, getCarouselVisibleSlides(vp)) + PAGE_WEB_CAROUSEL_GAP_PX;
  return PAGE_WEB_CAROUSEL_GAP_PX + 1;
}

/**
 * Применить translateX к .page-web-carousel-strip; scrollLeft сбрасываем.
 * Вне окна видимости скрывает сам viewport (overflow hidden), без скрытия карточек по атрибутам.
 */
export function applyCarouselStripTranslate(vp: HTMLElement, offsetPx: number, animate = true): void {
  const strip = vp.querySelector(":scope > .page-web-carousel-strip") as HTMLElement | null;
  if (!strip) return;
  const maxO = maxTranslatePx(vp);
  const x = Math.min(Math.max(0, offsetPx), maxO);
  translatePxByViewport.set(vp, x);
  vp.scrollLeft = 0;
  vp.style.overflowX = "hidden";
  /* scroll-snap + transform дают смещение/рваньё в некоторых движках */
  vp.style.scrollSnapType = "none";
  strip.style.transition = animate
    ? "transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)"
    : "none";
  strip.style.transform = `translate3d(${-x}px, 0, 0)`;
  syncCarouselArrowDisabledState(vp, x, maxO);
}

export function shiftCarouselStripBySlide(vp: HTMLElement, direction: -1 | 1): void {
  applyCarouselStripTranslate(vp, readCarouselTranslatePx(vp) + direction * getCarouselSlideStepPx(vp));
}

/** Левый край окна совпадает со слайдом с индексом startIdx (0-based). */
export function alignCarouselStripToStartSlideIndex(vp: HTMLElement, startIdx: number): void {
  const strip = vp.querySelector(":scope > .page-web-carousel-strip") as HTMLElement | null;
  if (!strip) return;
  const slides = strip.querySelectorAll(".page-web-carousel-slide");
  if (slides.length === 0) return;
  const i = Math.max(0, Math.min(Math.floor(startIdx), slides.length - 1));
  const slideEl = slides[i] as HTMLElement;
  const x = slideLeftRelativeToStrip(strip, slideEl);
  applyCarouselStripTranslate(vp, x);
}

/** После sync размеров — пересчитать clamp текущего смещения без анимации. */
export function refreshCarouselStripTranslateAfterLayout(vp: HTMLElement): void {
  applyCarouselStripTranslate(vp, readCarouselTranslatePx(vp), false);
}
