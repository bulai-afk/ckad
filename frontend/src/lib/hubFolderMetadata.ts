import type { Metadata } from "next";
import { apiBaseUrl } from "@/lib/apiBaseUrl";
import {
  mergeUniqueKeywords,
  parseCommaSeparatedKeywords,
} from "@/lib/keywordsField";
import { canonicalPublicOrigin } from "@/lib/publicSiteHosts";
import {
  DEFAULT_OG_IMAGE_PATH,
  DEFAULT_PUBLIC_SITE_ORIGIN,
  HOME_ROOT_SECTION_SLUGS,
  PUBLIC_SITE_NAME,
  toAbsolutePublicUrl,
} from "@/lib/publicSiteConstants";
import { normalizeSlug, type ServiceFolderMeta } from "@/lib/serviceTree";

export {
  DEFAULT_OG_IMAGE_PATH,
  DEFAULT_PUBLIC_SITE_ORIGIN,
  HOME_ROOT_SECTION_SLUGS,
  PUBLIC_SITE_NAME,
  toAbsolutePublicUrl,
};

export const FOLDERS_METADATA_REVALIDATE = 300;

export async function buildSocialSharingFields(options: {
  title: string;
  description?: string;
  /** Путь страницы для вызывающего кода. canonical и og:url рисует PublicCanonicalTags. */
  pathname: string;
  imagePathOrUrl?: string;
}): Promise<{
  openGraph: NonNullable<Metadata["openGraph"]>;
  twitter: NonNullable<Metadata["twitter"]>;
}> {
  const origin = canonicalPublicOrigin();
  const rawImage = (options.imagePathOrUrl || "").trim() || DEFAULT_OG_IMAGE_PATH;
  const imageUrl = toAbsolutePublicUrl(rawImage, origin);
  const description = options.description?.trim() || undefined;

  return {
    openGraph: {
      type: "website",
      siteName: PUBLIC_SITE_NAME,
      locale: "ru_RU",
      title: options.title,
      description,
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

/**
 * Origin для canonical, og:url и JSON-LD.
 * Всегда основной домен, даже если запрос пришёл на зеркало или в punycode.
 */
export async function getPublicSiteOrigin(): Promise<string> {
  return canonicalPublicOrigin();
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

/** Keywords из настроек корневых разделов (для meta главной, без лимита длины). */
export function mergeRootSectionKeywords(
  folderMap: Map<string, ServiceFolderMeta>,
  slugs: readonly string[] = HOME_ROOT_SECTION_SLUGS,
): string {
  const lists = slugs.map((slug) => {
    const keywords = folderMap.get(normalizeSlug(slug))?.keywords?.trim() || "";
    return parseCommaSeparatedKeywords(keywords);
  });
  return mergeUniqueKeywords(...lists).join(", ");
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
  const customSeoTitle = (folder.seoTitle || "").trim();
  const title =
    customSeoTitle || composeRussianMetaTitle(sectionName, folderName) || folderName;
  const description =
    (folder.seoDescription || "").trim() || folder.description?.trim() || undefined;
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
