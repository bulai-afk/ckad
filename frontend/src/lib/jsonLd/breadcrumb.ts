import { toAbsolutePublicUrl } from "@/lib/publicSiteConstants";
import { normalizeSlug, type ServiceFolderMeta } from "@/lib/serviceTree";

export type BreadcrumbCrumb = {
  name: string;
  pathname: string;
};

/**
 * Цепочка для BreadcrumbList.
 * Имена разделов — из `backend/data/folders.json` (API `/api/pages/folders`).
 * Заголовок страницы — из CMS (`page.title` или `folder.name`).
 */
export function buildBreadcrumbsForSlug(
  slug: string,
  pageTitle: string,
  folderMap: Map<string, ServiceFolderMeta>,
): BreadcrumbCrumb[] {
  const normalized = normalizeSlug(slug);
  const segments = normalized.split("/").filter(Boolean);
  if (segments.length === 0) return [];

  const crumbs: BreadcrumbCrumb[] = [{ name: "Главная", pathname: "/" }];

  const root = segments[0];
  const rootName = folderMap.get(root)?.name?.trim() || root;
  crumbs.push({ name: rootName, pathname: `/${root}` });

  if (segments.length >= 2) {
    const title = pageTitle.trim() || segments[segments.length - 1];
    crumbs.push({ name: title, pathname: `/${normalized}` });
  }

  return crumbs;
}

/** BreadcrumbList — только JSON-LD, без визуальных крошек на сайте. */
export function buildBreadcrumbListJsonLd(
  origin: string,
  crumbs: BreadcrumbCrumb[],
): Record<string, unknown> | null {
  if (crumbs.length < 2) return null;

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: toAbsolutePublicUrl(crumb.pathname, origin),
    })),
  };
}
