import type { Metadata } from "next";
import { headers } from "next/headers";
import { apiBaseUrl } from "@/lib/apiBaseUrl";
import {
  joinKeywordsWithinLimit,
  mergeUniqueKeywords,
  parseCommaSeparatedKeywords,
} from "@/lib/keywordsField";
import { normalizeSlug, type ServiceFolderMeta } from "@/lib/serviceTree";

/** Корневые разделы сайта — keywords хабов попадают на главную. */
export const HOME_ROOT_SECTION_SLUGS = [
  "catalogization",
  "training-center",
  "other-services",
  "articles",
] as const;

export const FOLDERS_METADATA_REVALIDATE = 300;

/** Публичный домен по умолчанию (из политики конфиденциальности сайта). */
export const DEFAULT_PUBLIC_SITE_ORIGIN = "https://центр-каталогизации.рф";

export const PUBLIC_SITE_NAME = "Центр каталогизации и анализа данных";

/** Превью по умолчанию для Telegram, WhatsApp, VK и др. (абсолютный URL собирается в рантайме). */
export const DEFAULT_OG_IMAGE_PATH = "/logo.png";

export async function buildSocialSharingFields(options: {
  title: string;
  description?: string;
  pathname: string;
  imagePathOrUrl?: string;
}): Promise<{
  alternates?: Metadata["alternates"];
  openGraph: NonNullable<Metadata["openGraph"]>;
  twitter: NonNullable<Metadata["twitter"]>;
}> {
  const origin = await getPublicSiteOrigin();
  const pathname = options.pathname.startsWith("/") ? options.pathname : `/${options.pathname}`;
  const canonicalUrl = toAbsolutePublicUrl(pathname, origin);
  const rawImage = (options.imagePathOrUrl || "").trim() || DEFAULT_OG_IMAGE_PATH;
  const imageUrl = toAbsolutePublicUrl(rawImage, origin);
  const description = options.description?.trim() || undefined;

  return {
    alternates: canonicalUrl ? { canonical: canonicalUrl } : undefined,
    openGraph: {
      type: "website",
      siteName: PUBLIC_SITE_NAME,
      locale: "ru_RU",
      title: options.title,
      description,
      url: canonicalUrl || undefined,
      images: [{ url: imageUrl, alt: options.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: options.title,
      description,
      images: [imageUrl],
    },
  };
}

export function composeRussianMetaTitle(sectionName: string, pageTitle: string): string {
  const section = sectionName.trim();
  const page = pageTitle.trim();
  if (section && page && section.localeCompare(page, "ru") !== 0) {
    return `${section} — ${page}`;
  }
  return page || section;
}

export async function getPublicSiteOrigin(): Promise<string> {
  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "") ||
    process.env.SITE_URL?.trim().replace(/\/+$/, "") ||
    "";
  if (fromEnv) return fromEnv;

  try {
    const headerStore = await headers();
    const host = headerStore.get("x-forwarded-host") || headerStore.get("host");
    const proto = (headerStore.get("x-forwarded-proto") || "https").split(",")[0]?.trim();
    if (host) {
      return `${proto || "https"}://${host}`.replace(/\/+$/, "");
    }
  } catch {
    // headers() недоступен вне запроса
  }

  return DEFAULT_PUBLIC_SITE_ORIGIN;
}

export function toAbsolutePublicUrl(url: string, origin: string): string {
  if (!url) return "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return url;
  if (!origin) return url;
  return `${origin}${url.startsWith("/") ? url : `/${url}`}`;
}

export async function fetchFolderMetaMap(): Promise<Map<string, ServiceFolderMeta>> {
  const base = apiBaseUrl();
  try {
    const res = await fetch(`${base}/api/pages/folders`, {
      cache: "force-cache",
      next: { revalidate: FOLDERS_METADATA_REVALIDATE },
    });
    if (!res.ok) return new Map();
    const data = (await res.json()) as { folders?: ServiceFolderMeta[] };
    const folders = Array.isArray(data.folders) ? data.folders : [];
    const map = new Map<string, ServiceFolderMeta>();
    for (const folder of folders) {
      const key = normalizeSlug(String(folder.slug || ""));
      if (!key) continue;
      map.set(key, folder);
    }
    return map;
  } catch {
    return new Map();
  }
}

export async function fetchFolderMetaBySlug(slug: string): Promise<ServiceFolderMeta | null> {
  const key = normalizeSlug(slug);
  if (!key) return null;
  const map = await fetchFolderMetaMap();
  return map.get(key) ?? null;
}

/** Keywords из настроек корневых разделов (для meta главной). */
export function mergeRootSectionKeywords(
  folderMap: Map<string, ServiceFolderMeta>,
  slugs: readonly string[] = HOME_ROOT_SECTION_SLUGS,
): string {
  const lists = slugs.map((slug) => {
    const keywords = folderMap.get(normalizeSlug(slug))?.keywords?.trim() || "";
    return parseCommaSeparatedKeywords(keywords);
  });
  return joinKeywordsWithinLimit(mergeUniqueKeywords(...lists));
}

/** Название корневого раздела (Каталогизация, Услуги, …) из модалки «Настройки раздела». */
export function getRootSectionFolderName(
  slug: string,
  folders: Map<string, ServiceFolderMeta>,
): string {
  const root = normalizeSlug(slug).split("/")[0] || "";
  return folders.get(root)?.name?.trim() || "";
}

/** Название папки по slug; для вложенных хабов — своё имя, иначе корень раздела. */
export function getFolderDisplayName(
  slug: string,
  folders: Map<string, ServiceFolderMeta>,
): string {
  const key = normalizeSlug(slug);
  const exact = folders.get(key)?.name?.trim();
  if (exact) return exact;
  return getRootSectionFolderName(slug, folders);
}

export async function buildMetadataFromFolderMeta(
  folder: ServiceFolderMeta,
  options?: { canonicalSlug?: string; fallbackTitle?: string; sectionFolderName?: string },
): Promise<Metadata> {
  const canonicalSlug = normalizeSlug(options?.canonicalSlug ?? folder.slug);
  const folderName = folder.name?.trim() || options?.fallbackTitle?.trim() || "";
  const sectionName = (options?.sectionFolderName || "").trim();
  const title = composeRussianMetaTitle(sectionName, folderName) || folderName;
  const description = folder.description?.trim() || undefined;
  const keywords = folder.keywords?.trim() || undefined;
  if (!title && !description && !keywords) return {};

  const social = await buildSocialSharingFields({
    title: title || PUBLIC_SITE_NAME,
    description,
    pathname: canonicalSlug ? `/${canonicalSlug}` : "/",
    imagePathOrUrl: String(folder.preview || "").trim() || undefined,
  });

  return {
    title: title || undefined,
    description,
    keywords,
    ...social,
  };
}

export async function generateHubFolderMetadata(
  slug: string,
  fallbackTitle?: string,
): Promise<Metadata> {
  const folderMap = await fetchFolderMetaMap();
  const folder = folderMap.get(normalizeSlug(slug));
  if (!folder) return {};
  const sectionFolderName = getRootSectionFolderName(slug, folderMap);
  return buildMetadataFromFolderMeta(folder, {
    canonicalSlug: slug,
    fallbackTitle,
    sectionFolderName,
  });
}
