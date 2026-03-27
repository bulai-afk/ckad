/**
 * Горизонталь: отдельно для заголовка / подзаголовка / кнопки (titleAlign и т.д.).
 * Вертикаль: одна на весь текстовый блок (verticalAlign) — как в оригинале.
 * Зона текста: вся ширина банера или левая/правая половина (textBand).
 */

export type BannerHAlign = "left" | "center" | "right";

/** Где размещается колонка с текстом по горизонтали. */
export type BannerTextBand = "full" | "left" | "right";

export function parseBannerTextBand(v: unknown): BannerTextBand {
  if (typeof v !== "string") return "full";
  const t = v.trim().toLowerCase();
  if (t === "left" || t === "right") return t;
  if (t === "full") return "full";
  return "full";
}

export function bannerVerticalJustifyContent(
  verticalAlign: "top" | "middle" | "bottom" | undefined,
): "flex-start" | "center" | "flex-end" {
  if (verticalAlign === "top") return "flex-start";
  if (verticalAlign === "bottom") return "flex-end";
  return "center";
}

export function bannerHToAlignSelf(h: BannerHAlign): "flex-start" | "center" | "flex-end" {
  if (h === "left") return "flex-start";
  if (h === "right") return "flex-end";
  return "center";
}

export function resolveTitleHAlign(s: {
  align: BannerHAlign;
  titleAlign?: BannerHAlign;
}): BannerHAlign {
  return s.titleAlign ?? s.align;
}

export function resolveSubtitleHAlign(s: {
  align: BannerHAlign;
  subtitleAlign?: BannerHAlign;
}): BannerHAlign {
  return s.subtitleAlign ?? s.align;
}

export function resolveButtonHAlign(s: {
  align: BannerHAlign;
  buttonAlign?: BannerHAlign;
}): BannerHAlign {
  return s.buttonAlign ?? s.align;
}

/**
 * Межстрочный интервал из API/JSON: только число, иначе дефолт.
 * Строки ("1", "1,2") и пропуски поля иначе давали расхождение главная ↔ редактор.
 */
export function normalizeBannerLineHeight(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) {
    return Math.min(3, Math.max(0.5, v));
  }
  if (typeof v === "string") {
    const n = parseFloat(v.trim().replace(",", "."));
    if (Number.isFinite(n)) return Math.min(3, Math.max(0.5, n));
  }
  return 1.2;
}

/** Как на главной: при переносах строк не даём line-height «схлопнуть» заголовок. */
export function resolveBannerTitleLineHeight(
  title: string,
  lineHeight: number | undefined,
  preserveBannerTitleLineBreaks: boolean,
): number {
  const lh = normalizeBannerLineHeight(lineHeight);
  const multiline = /\r|\n/.test(title);
  if (preserveBannerTitleLineBreaks && multiline && lh < 1.12) {
    return Math.max(lh, 1.2);
  }
  return lh;
}
