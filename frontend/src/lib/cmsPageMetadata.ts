import type { Metadata } from "next";
import { buildSocialSharingFields, composeRussianMetaTitle } from "@/lib/hubFolderMetadata";
import { normalizeSlug } from "@/lib/serviceTree";

type Block = {
  type: string;
  data?: { text?: string; src?: string; kind?: string };
};

export type CmsPageMetaSource = {
  title: string;
  slug: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  keywords?: string | null;
  preview?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  blocks: Block[];
};

export function getCmsBlockText(page: CmsPageMetaSource | null, type: string): string {
  if (!page) return "";
  const block = page.blocks.find((b) => b.type === type);
  if (!block) return "";
  return typeof block.data?.text === "string" ? block.data.text.trim() : "";
}

export function getCmsBlockKind(page: CmsPageMetaSource | null, type: string): string {
  if (!page) return "";
  const block = page.blocks.find((b) => b.type === type);
  if (!block) return "";
  return typeof block.data?.kind === "string" ? block.data.kind.trim() : "";
}

export function getCmsPreviewImage(page: CmsPageMetaSource | null): string {
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

export function getCmsArticleKind(page: CmsPageMetaSource): "news" | "article" {
  const kind = getCmsBlockKind(page, "article_kind");
  if (kind === "article") return "article";
  const slug = normalizeSlug(page.slug);
  if (slug === "articles" || slug.startsWith("articles/")) return "news";
  return "news";
}

export async function buildMetadataFromCmsPage(
  page: CmsPageMetaSource,
  options?: { sectionFolderName?: string },
): Promise<Metadata> {
  const customSeoTitle = getCmsBlockText(page, "seo_title") || (page.seoTitle || "").trim();
  const pageTitle = (page.title || "").trim();
  const sectionName = (options?.sectionFolderName || "").trim();
  const seoTitle =
    customSeoTitle || composeRussianMetaTitle(sectionName, pageTitle) || pageTitle;
  const seoDescription =
    getCmsBlockText(page, "seo_description") ||
    (page.seoDescription || "").trim() ||
    getCmsBlockText(page, "summary");
  const seoKeywords = getCmsBlockText(page, "keywords") || (page.keywords || "").trim();
  const slug = normalizeSlug(page.slug);
  const isArticle = slug.startsWith("articles/");

  const social = await buildSocialSharingFields({
    title: seoTitle,
    description: seoDescription || undefined,
    pathname: `/${page.slug.replace(/^\/+/, "")}`,
    imagePathOrUrl: getCmsPreviewImage(page) || undefined,
  });

  if (isArticle) {
    social.openGraph = {
      ...social.openGraph,
      type: "article",
    };
  }

  return {
    title: seoTitle,
    description: seoDescription || undefined,
    keywords: seoKeywords || undefined,
    ...social,
  };
}
