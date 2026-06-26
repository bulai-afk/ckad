import { JsonLd } from "@/components/JsonLd";
import { fetchFolderMetaMap, getPublicSiteOrigin } from "@/lib/hubFolderMetadata";
import { buildBreadcrumbListJsonLd, buildBreadcrumbsForSlug } from "@/lib/jsonLd/breadcrumb";

type Props = {
  /** Slug раздела из `folders.json`, напр. `catalogization`. */
  slug: string;
  /** Название раздела — `folder.name` из CMS; если пусто, берётся из folders API. */
  title?: string;
};

/** Шаг 2: BreadcrumbList для хабов разделов (без визуальных крошек). */
export async function HubSectionJsonLd({ slug, title }: Props) {
  const [origin, folderMap] = await Promise.all([getPublicSiteOrigin(), fetchFolderMetaMap()]);
  const folderTitle =
    title?.trim() || folderMap.get(slug.trim().replace(/^\/+|\/+$/g, ""))?.name?.trim() || slug;
  const crumbs = buildBreadcrumbsForSlug(slug, folderTitle, folderMap);
  const data = buildBreadcrumbListJsonLd(origin, crumbs);
  if (!data) return null;
  return <JsonLd data={data} />;
}
