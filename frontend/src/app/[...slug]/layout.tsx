import type { Metadata } from "next";
import { apiBaseUrl } from "@/lib/apiBaseUrl";
import { apiPagesSlugDataCacheTag } from "@/lib/apiPagesSlugUrl";

export const revalidate = 300;

type Block = {
  type: string;
  data?: { text?: string; src?: string };
};

type PageData = {
  title: string;
  slug: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  keywords?: string | null;
  preview?: string | null;
  blocks: Block[];
};

function getBlockText(page: PageData | null, type: string): string {
  if (!page) return "";
  const block = page.blocks.find((b) => b.type === type);
  if (!block) return "";
  return typeof block.data?.text === "string" ? block.data.text.trim() : "";
}

function getPreviewImage(page: PageData | null): string {
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

function toAbsoluteUrl(url: string, origin: string): string {
  if (!url) return "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return url;
  if (!origin) return url;
  return `${origin}${url.startsWith("/") ? url : `/${url}`}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const slugParts = Array.isArray(resolvedParams.slug) ? resolvedParams.slug : [];
  if (slugParts.length === 0) return {};

  const path = slugParts.map((s) => encodeURIComponent(s)).join("/");
  const base = apiBaseUrl();

  let page: PageData | null = null;
  try {
    const res = await fetch(`${base}/api/pages/slug/${path}`, {
      cache: "force-cache",
      next: { revalidate: 300, tags: [apiPagesSlugDataCacheTag(slugParts)] },
    });
    if (res.ok) {
      page = (await res.json()) as PageData;
    }
  } catch {
    page = null;
  }
  if (!page) return {};

  const seoTitle = getBlockText(page, "seo_title") || (page.seoTitle || "").trim() || page.title;
  const seoDescription =
    getBlockText(page, "seo_description") ||
    (page.seoDescription || "").trim() ||
    getBlockText(page, "summary");
  const seoKeywords = getBlockText(page, "keywords") || (page.keywords || "").trim();
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "") ||
    process.env.SITE_URL?.trim().replace(/\/+$/, "") ||
    "";
  const canonicalPath = `/${page.slug.replace(/^\/+/, "")}`;
  const canonicalUrl = toAbsoluteUrl(canonicalPath, origin);
  const imageUrl = toAbsoluteUrl(getPreviewImage(page), origin);

  return {
    title: seoTitle,
    description: seoDescription || undefined,
    keywords: seoKeywords || undefined,
    alternates: canonicalUrl
      ? {
          canonical: canonicalUrl,
        }
      : undefined,
    openGraph: {
      type: "website",
      title: seoTitle,
      description: seoDescription || undefined,
      url: canonicalUrl || undefined,
      images: imageUrl ? [{ url: imageUrl }] : undefined,
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title: seoTitle,
      description: seoDescription || undefined,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

export default function SlugLayout({ children }: { children: React.ReactNode }) {
  return children;
}
