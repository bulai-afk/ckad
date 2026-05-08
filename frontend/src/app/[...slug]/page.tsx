import type { Metadata } from "next";
import { apiGet } from "@/lib/api";
import { apiPagesSlugRequestPath } from "@/lib/apiPagesSlugUrl";
import {
  buildServicesTree,
  findServiceTreeNode,
  isVisibleServicePage,
  normalizeSlug,
  type ServiceFolderMeta,
  type ServiceListItem,
  type ServiceTreeNode,
} from "@/lib/serviceTree";
import {
  PageSlugClient,
  type PageData,
} from "@/components/PageSlugClient";

type RouteParams = { slug?: string[] | string };
type PageProps = { params: RouteParams | Promise<RouteParams> };

function getBlockText(page: PageData | null, type: string): string {
  if (!page) return "";
  const block = page.blocks.find((b) => b.type === type);
  if (!block) return "";
  return typeof block.data?.text === "string" ? block.data.text.trim() : "";
}

function getPreviewImage(page: PageData | null): string {
  if (!page) return "";
  const previewBlock = page.blocks.find((b) => b.type === "preview");
  const fromBlock =
    previewBlock && typeof (previewBlock.data as { src?: unknown })?.src === "string"
      ? String((previewBlock.data as { src?: string }).src).trim()
      : "";
  const fromPage = typeof page.preview === "string" ? page.preview.trim() : "";
  const raw = fromBlock || fromPage;
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/")) return raw;
  return `/${raw.replace(/^\/+/, "")}`;
}

function normalizeSlugParts(raw: RouteParams["slug"]): string[] {
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === "string") return raw.split("/").filter(Boolean);
  return [];
}

async function resolvePageBySlug(slugParts: string[]): Promise<PageData | null> {
  if (slugParts.length === 0) return null;
  try {
    return await apiGet<PageData>(apiPagesSlugRequestPath(slugParts), 20_000);
  } catch {
    return null;
  }
}

async function resolveServiceFolderHub(slugParts: string[]): Promise<ServiceTreeNode | null> {
  if (slugParts[0] !== "services" || slugParts.length < 2) return null;
  const path = slugParts.join("/");
  try {
    const [pages, foldersPayload] = await Promise.all([
      apiGet<ServiceListItem[]>("/api/pages", 20_000),
      apiGet<{ folders?: ServiceFolderMeta[] }>("/api/pages/folders", 20_000),
    ]);
    const folders = Array.isArray(foldersPayload?.folders) ? foldersPayload.folders : [];
    const folderMetaBySlug = new Map(
      folders
        .filter((f) => typeof f?.name === "string" && typeof f?.slug === "string")
        .map((f) => ({
          name: String(f.name || "").trim(),
          slug: normalizeSlug(String(f.slug || "")),
          description: typeof f.description === "string" ? f.description : "",
          preview: typeof f.preview === "string" ? f.preview : "",
        }))
        .filter((f) => f.slug === "services" || f.slug.startsWith("services/"))
        .map((f) => [f.slug, f] as const),
    );
    const servicePages = pages
      .filter((p) => isVisibleServicePage(p) && normalizeSlug(p.slug).startsWith("services/"))
      .map((p) => ({ ...p, slug: normalizeSlug(p.slug) }));
    const tree = buildServicesTree(servicePages, folderMetaBySlug);
    const node = findServiceTreeNode(tree, path);
    if (!node) return null;
    return node.isMetaFolder || node.pages.length > 0 || node.children.length > 0 ? node : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await Promise.resolve(params);
  const slugParts = normalizeSlugParts(resolvedParams.slug);
  const page = await resolvePageBySlug(slugParts);
  if (!page) return {};

  const seoTitle =
    getBlockText(page, "seo_title") ||
    (typeof page.seoTitle === "string" ? page.seoTitle.trim() : "") ||
    page.title;
  const seoDescription =
    getBlockText(page, "seo_description") ||
    (typeof page.seoDescription === "string" ? page.seoDescription.trim() : "") ||
    getBlockText(page, "summary");
  const seoKeywords =
    getBlockText(page, "keywords") ||
    (typeof page.keywords === "string" ? page.keywords.trim() : "");
  const seoImage = getPreviewImage(page);

  return {
    title: seoTitle || page.title,
    description: seoDescription || undefined,
    keywords: seoKeywords || undefined,
    openGraph: {
      title: seoTitle || page.title,
      description: seoDescription || undefined,
      images: seoImage ? [seoImage] : undefined,
      type: "website",
    },
    twitter: {
      card: seoImage ? "summary_large_image" : "summary",
      title: seoTitle || page.title,
      description: seoDescription || undefined,
      images: seoImage ? [seoImage] : undefined,
    },
  };
}

export default async function Page({ params }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const slugParts = normalizeSlugParts(resolvedParams.slug);
  const page = await resolvePageBySlug(slugParts);
  const serviceFolderHub = page ? null : await resolveServiceFolderHub(slugParts);

  return (
    <PageSlugClient
      slugParts={slugParts}
      page={page}
      serviceFolderHub={serviceFolderHub}
    />
  );
}
