import type { Metadata } from "next";
import { apiBaseUrl } from "@/lib/apiBaseUrl";
import { apiPagesSlugDataCacheTag } from "@/lib/apiPagesSlugUrl";
import { buildMetadataFromCmsPage, type CmsPageMetaSource } from "@/lib/cmsPageMetadata";
import { normalizeSlug } from "@/lib/serviceTree";
import {
  buildMetadataFromFolderMeta,
  fetchFolderMetaMap,
  getRootSectionFolderName,
} from "@/lib/hubFolderMetadata";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const slugParts = Array.isArray(resolvedParams.slug) ? resolvedParams.slug : [];
  if (slugParts.length === 0) return {};

  const slugPath = slugParts.join("/");
  const path = slugParts.map((s) => encodeURIComponent(s)).join("/");
  const base = apiBaseUrl();

  let page: CmsPageMetaSource | null = null;
  try {
    const res = await fetch(`${base}/api/pages/slug/${path}`, {
      cache: "force-cache",
      next: { revalidate: 300, tags: [apiPagesSlugDataCacheTag(slugParts)] },
    });
    if (res.ok) {
      page = (await res.json()) as CmsPageMetaSource;
    }
  } catch {
    page = null;
  }

  const folderMap = await fetchFolderMetaMap();

  if (page) {
    const sectionFolderName = getRootSectionFolderName(page.slug, folderMap);
    return buildMetadataFromCmsPage(page, { sectionFolderName });
  }

  const folder = folderMap.get(normalizeSlug(slugPath));
  if (folder) {
    const sectionFolderName = getRootSectionFolderName(slugPath, folderMap);
    return buildMetadataFromFolderMeta(folder, { canonicalSlug: slugPath, sectionFolderName });
  }

  return {};
}

export default function SlugLayout({ children }: { children: React.ReactNode }) {
  return children;
}
