import type { Metadata } from "next";
import { buildSocialSharingFields, composeRussianMetaTitle } from "@/lib/hubFolderMetadata";

type Block = {
  type: string;
  data?: { text?: string; src?: string };
};

export type CmsPageMetaSource = {
  title: string;
  slug: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  keywords?: string | null;
  preview?: string | null;
  blocks: Block[];
};

function getBlockText(page: CmsPageMetaSource | null, type: string): string {
  if (!page) return "";
  const block = page.blocks.find((b) => b.type === type);
  if (!block) return "";
  return typeof block.data?.text === "string" ? block.data.text.trim() : "";
}

function getPreviewImage(page: CmsPageMetaSource | null): string {
  if (!page) return "";
  const previewBlock = page.blocks.find((b) => b.type === "preview");
  const fromBlock = typeof previewBlock?.data?.src === "string" ? previewBlock.data.src.trim() : "";
  const fromPage = typeof page.preview === "string" ? page.preview.trim() : "";
  const raw = fromBlock || fromPage;
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/")) return raw;
  return `/${raw.replace(/^\/+/, "")}`;
}

export async function buildMetadataFromCmsPage(
  page: CmsPageMetaSource,
  options?: { sectionFolderName?: string },
): Promise<Metadata> {
  const customSeoTitle = getBlockText(page, "seo_title") || (page.seoTitle || "").trim();
  const pageTitle = (page.title || "").trim();
  const sectionName = (options?.sectionFolderName || "").trim();
  const seoTitle =
    customSeoTitle || composeRussianMetaTitle(sectionName, pageTitle) || pageTitle;
  const seoDescription =
    getBlockText(page, "seo_description") ||
    (page.seoDescription || "").trim() ||
    getBlockText(page, "summary");
  const seoKeywords = getBlockText(page, "keywords") || (page.keywords || "").trim();
  const social = await buildSocialSharingFields({
    title: seoTitle,
    description: seoDescription || undefined,
    pathname: `/${page.slug.replace(/^\/+/, "")}`,
    imagePathOrUrl: getPreviewImage(page) || undefined,
  });

  return {
    title: seoTitle,
    description: seoDescription || undefined,
    keywords: seoKeywords || undefined,
    ...social,
  };
}
