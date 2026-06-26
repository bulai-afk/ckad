/** Константы публичного сайта — без server-only импортов (безопасно для client components). */

export const PUBLIC_SITE_NAME = "Центр каталогизации и анализа данных";

/** Публичный домен по умолчанию (из политики конфиденциальности сайта). */
export const DEFAULT_PUBLIC_SITE_ORIGIN = "https://центр-каталогизации.рф";

/** Превью по умолчанию для Open Graph и соцсетей. */
export const DEFAULT_OG_IMAGE_PATH = "/logo.png";

/** Корневые разделы сайта — keywords хабов попадают на главную. */
export const HOME_ROOT_SECTION_SLUGS = [
  "catalogization",
  "training-center",
  "other-services",
  "articles",
] as const;

export function toAbsolutePublicUrl(url: string, origin: string): string {
  if (!url) return "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return url;
  if (!origin) return url;
  return `${origin}${url.startsWith("/") ? url : `/${url}`}`;
}
