/** Подсказки и дефолтный контент баннера — как `.page-web-cover` в редакторе страниц. */

export const BANNER_COVER_FIELD_PLACEHOLDERS = {
  title: "Заголовок баннера",
  description: "Короткое описание",
  announcement: "Анонс",
} as const;

/** Начальное содержимое нового баннера (getWebElementHtml cover). */
export const BANNER_COVER_DEFAULT_CONTENT = {
  title: "Надежное решение для вашего проекта",
  description:
    "Короткое описание услуги: основные преимущества, сроки и ожидаемый результат для клиента.",
  announcement: "Анонс: мы запустили новый этап проекта.",
  button: "Кнопка",
  buttonSecondary: "Дополнительно",
  announcementLearnMore: "Подробнее",
} as const;

/** При включении элемента через меню «Элементы» (insertCoverBlockElement). */
export const BANNER_COVER_INSERT_DEFAULTS = {
  title: "Заголовок",
  subtitle: "Подзаголовок",
  announcement: BANNER_COVER_DEFAULT_CONTENT.announcement,
  button: BANNER_COVER_DEFAULT_CONTENT.button,
} as const;

function stripLearnMoreArrow(value: string): string {
  return value.replace(/\s*[→➝➡➜]+\s*$/u, "").trim();
}

export function normalizeBannerCoverAnnouncementLearnMore(value: unknown): string {
  if (typeof value !== "string") return BANNER_COVER_DEFAULT_CONTENT.announcementLearnMore;
  const cleaned = stripLearnMoreArrow(value);
  return cleaned.length > 0 ? cleaned : BANNER_COVER_DEFAULT_CONTENT.announcementLearnMore;
}

export function normalizeBannerCoverButtonSecondary(value: unknown): string {
  if (typeof value !== "string") return BANNER_COVER_DEFAULT_CONTENT.buttonSecondary;
  const cleaned = stripLearnMoreArrow(value);
  return cleaned.length > 0 ? cleaned : BANNER_COVER_DEFAULT_CONTENT.buttonSecondary;
}

export function normalizeBannerCoverAnnouncementText(value: unknown): string {
  if (typeof value !== "string") return BANNER_COVER_DEFAULT_CONTENT.announcement;
  const cleaned = value.trim();
  return cleaned.length > 0 ? cleaned : BANNER_COVER_DEFAULT_CONTENT.announcement;
}
