/** Пресеты баннера — те же id/подписи, что в редакторе страниц (`.page-web-cover`). */

export const COVER_TYPE_PRESETS = [
  { id: "hero", label: "Банер с градиентом" },
  { id: "image", label: "Текст на фоне изображения" },
  { id: "split", label: "Изображение справа + градиент" },
] as const;

export type CoverTypePresetId = (typeof COVER_TYPE_PRESETS)[number]["id"];

export const COVER_ASPECT_PRESETS = [
  { id: "1-8", label: "2∶1", arW: 2, arH: 1 },
  { id: "1-4", label: "4∶1", arW: 4, arH: 1 },
  { id: "6-1", label: "6∶1", arW: 6, arH: 1 },
] as const;

export type CoverAspectPresetId = (typeof COVER_ASPECT_PRESETS)[number]["id"];

/** Как на публичных страницах клиента (`pageShowRender` @media max-width 1205px). */
export const BANNER_COVER_MOBILE_MAX_WIDTH_PX = 1205;

/** Полные строки классов — иначе Tailwind JIT не подхватывает динамические `min-[1206px]:${aspect}`. */
const COVER_CAROUSEL_HOME_1_8 =
  "w-full min-h-px max-[1205px]:h-auto min-[1206px]:aspect-[2/1]";
const COVER_CAROUSEL_HOME_1_4 =
  "w-full min-h-px max-[1205px]:h-auto min-[1206px]:aspect-[4/1]";
const COVER_CAROUSEL_HOME_6_1 =
  "w-full min-h-px max-[1205px]:h-auto min-[1206px]:aspect-[6/1]";
const COVER_CAROUSEL_ADMIN_1_8 = "w-full min-h-px aspect-[2/1]";
const COVER_CAROUSEL_ADMIN_1_4 = "w-full min-h-px aspect-[4/1]";
const COVER_CAROUSEL_ADMIN_6_1 = "w-full min-h-px aspect-[6/1]";

/** Классы высоты/пропорций карусели баннеров (общие для всех слайдов). */
export function getCoverAspectCarouselClassName(
  aspect: CoverAspectPresetId,
  variant: "home" | "admin" = "admin",
): string {
  if (variant === "home") {
    switch (aspect) {
      case "1-4":
        return COVER_CAROUSEL_HOME_1_4;
      case "6-1":
        return COVER_CAROUSEL_HOME_6_1;
      case "1-8":
      default:
        return COVER_CAROUSEL_HOME_1_8;
    }
  }
  switch (aspect) {
    case "1-4":
      return COVER_CAROUSEL_ADMIN_1_4;
    case "6-1":
      return COVER_CAROUSEL_ADMIN_6_1;
    case "1-8":
    default:
      return COVER_CAROUSEL_ADMIN_1_8;
  }
}

export type CoverInsertBlockKind = "title" | "subtitle" | "button" | "announcement";

export function getCoverAspectPreviewSvg(arW: number, arH: number): string {
  const pad = 10;
  const box = 100 - pad * 2;
  const r = arW / arH;
  let rw: number;
  let rh: number;
  let rx: number;
  let ry: number;
  if (r >= 1) {
    rw = box;
    rh = box / r;
    rx = pad;
    ry = pad + (box - rh) / 2;
  } else {
    rh = box;
    rw = box * r;
    ry = pad;
    rx = pad + (box - rw) / 2;
  }
  return (
    '<svg class="page-web-cover-menu-aspect-svg" viewBox="0 0 100 100" width="28" height="28" aria-hidden="true">' +
    '<rect x="' +
    rx.toFixed(2) +
    '" y="' +
    ry.toFixed(2) +
    '" width="' +
    rw.toFixed(2) +
    '" height="' +
    rh.toFixed(2) +
    '" rx="3" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5"/>' +
    "</svg>"
  );
}

export const PAGE_EDITOR_FOCUS_TARGET_ATTR = "data-editor-focus-target";
