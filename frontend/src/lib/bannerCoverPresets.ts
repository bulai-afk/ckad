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

/** Классы высоты/пропорций карусели баннеров (общие для всех слайдов). */
export function getCoverAspectCarouselClassName(aspect: CoverAspectPresetId): string {
  switch (aspect) {
    case "1-4":
      return "aspect-[4/1] w-full";
    case "6-1":
      return "aspect-[6/1] w-full";
    case "1-8":
    default:
      return "h-[100vw] sm:h-[50vw]";
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
