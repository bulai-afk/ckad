import { JsonLd } from "@/components/JsonLd";
import { apiBaseUrl } from "@/lib/apiBaseUrl";
import { apiPagesSlugDataCacheTag } from "@/lib/apiPagesSlugUrl";
import {
  getCmsArticleKind,
  getCmsBlockText,
  getCmsPreviewImage,
  type CmsPageMetaSource,
} from "@/lib/cmsPageMetadata";
import { composeRussianMetaTitle, fetchFolderMetaMap, getPublicSiteOrigin } from "@/lib/hubFolderMetadata";
import { buildArticleJsonLd } from "@/lib/jsonLd/article";
import { buildBreadcrumbListJsonLd, buildBreadcrumbsForSlug } from "@/lib/jsonLd/breadcrumb";
import { normalizeSlug, type ServiceFolderMeta } from "@/lib/serviceTree";

type Props = {
  slugParts: string[];
};

async function fetchPageBySlug(slugParts: string[]): Promise<CmsPageMetaSource | null> {
  if (slugParts.length === 0) return null;
  const path = slugParts.map((s) => encodeURIComponent(s)).join("/");
  const base = apiBaseUrl();
  try {
    const res = await fetch(`${base}/api/pages/slug/${path}`, {
      cache: "force-cache",
      next: { revalidate: 300, tags: [apiPagesSlugDataCacheTag(slugParts)] },
    });
    if (!res.ok) return null;
    return (await res.json()) as CmsPageMetaSource;
  } catch {
    return null;
  }
}

function jsonLdForPage(
  page: CmsPageMetaSource,
  folderMap: Map<string, ServiceFolderMeta>,
  origin: string,
): Record<string, unknown>[] {
  const scripts: Record<string, unknown>[] = [];
  const slug = normalizeSlug(page.slug);
  const sectionName = folderMap.get(slug.split("/")[0] || "")?.name?.trim() || "";
  const pageTitle = (page.title || "").trim();
  const headline =
    getCmsBlockText(page, "seo_title") ||
    composeRussianMetaTitle(sectionName, pageTitle) ||
    pageTitle;

  const crumbs = buildBreadcrumbsForSlug(slug, pageTitle, folderMap);
  const breadcrumb = buildBreadcrumbListJsonLd(origin, crumbs);
  if (breadcrumb) scripts.push(breadcrumb);

  if (slug.startsWith("articles/")) {
    const description =
      getCmsBlockText(page, "seo_description") ||
      (page.seoDescription || "").trim() ||
      getCmsBlockText(page, "summary");
    scripts.push(
      buildArticleJsonLd({
        origin,
        slug,
        headline,
        description: description || undefined,
        imagePathOrUrl: getCmsPreviewImage(page) || undefined,
        datePublished: page.createdAt,
        dateModified: page.updatedAt ?? page.createdAt,
        articleKind: getCmsArticleKind(page),
      }),
    );
  }

  return scripts;
}

function jsonLdForFolder(
  folder: ServiceFolderMeta,
  slugPath: string,
  folderMap: Map<string, ServiceFolderMeta>,
  origin: string,
): Record<string, unknown>[] {
  const scripts: Record<string, unknown>[] = [];
  const slug = normalizeSlug(slugPath);
  const title = folder.name?.trim() || slug;
  const crumbs = buildBreadcrumbsForSlug(slug, title, folderMap);
  const breadcrumb = buildBreadcrumbListJsonLd(origin, crumbs);
  if (breadcrumb) scripts.push(breadcrumb);
  return scripts;
}

/**
 * Шаг 2–3: BreadcrumbList + Article для CMS-страниц `[...slug]`.
 * Данные страницы — `/api/pages/slug/...`, разделы — `/api/pages/folders`.
 */
export async function CmsSlugJsonLd({ slugParts }: Props) {
  const [page, folderMap, origin] = await Promise.all([
    fetchPageBySlug(slugParts),
    fetchFolderMetaMap(),
    getPublicSiteOrigin(),
  ]);

  let scripts: Record<string, unknown>[] = [];

  if (page) {
    scripts = jsonLdForPage(page, folderMap, origin);
  } else {
    const slugPath = slugParts.join("/");
    const folder = folderMap.get(normalizeSlug(slugPath));
    if (folder) {
      scripts = jsonLdForFolder(folder, slugPath, folderMap, origin);
    }
  }

  if (scripts.length === 0) return null;
  return <JsonLd data={scripts} />;
}
