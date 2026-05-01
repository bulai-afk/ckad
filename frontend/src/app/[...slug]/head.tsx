import { headers } from "next/headers";
import { apiBaseUrl } from "@/lib/apiBaseUrl";

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
  if (/^https?:\/\//i.test(url)) return url;
  if (!origin) return url;
  return `${origin}${url.startsWith("/") ? url : `/${url}`}`;
}

function getSiteOrigin(): string {
  const h = headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "";
  const proto = h.get("x-forwarded-proto") || "https";
  if (!host) return "";
  return `${proto}://${host}`;
}

export default async function Head({
  params,
}: {
  params: { slug?: string[] };
}) {
  const slugParts = Array.isArray(params.slug) ? params.slug : [];
  if (slugParts.length === 0) return null;

  const path = slugParts.map((s) => encodeURIComponent(s)).join("/");
  const base = apiBaseUrl();

  let page: PageData | null = null;
  try {
    const res = await fetch(`${base}/api/pages/slug/${path}`, {
      cache: "force-cache",
      next: { revalidate: 300 },
    });
    if (res.ok) {
      page = (await res.json()) as PageData;
    }
  } catch {
    page = null;
  }
  if (!page) return null;

  const seoTitle = getBlockText(page, "seo_title") || (page.seoTitle || "").trim() || page.title;
  const seoDescription =
    getBlockText(page, "seo_description") ||
    (page.seoDescription || "").trim() ||
    getBlockText(page, "summary");
  const seoKeywords = getBlockText(page, "keywords") || (page.keywords || "").trim();
  const origin = getSiteOrigin();
  const canonicalPath = `/${page.slug.replace(/^\/+/, "")}`;
  const canonicalUrl = toAbsoluteUrl(canonicalPath, origin);
  const imageUrl = toAbsoluteUrl(getPreviewImage(page), origin);

  return (
    <>
      <title>{seoTitle}</title>
      {seoDescription ? <meta name="description" content={seoDescription} /> : null}
      {seoKeywords ? <meta name="keywords" content={seoKeywords} /> : null}
      {canonicalUrl ? <link rel="canonical" href={canonicalUrl} /> : null}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={seoTitle} />
      {seoDescription ? <meta property="og:description" content={seoDescription} /> : null}
      {canonicalUrl ? <meta property="og:url" content={canonicalUrl} /> : null}
      {imageUrl ? <meta property="og:image" content={imageUrl} /> : null}
      <meta name="twitter:card" content={imageUrl ? "summary_large_image" : "summary"} />
      <meta name="twitter:title" content={seoTitle} />
      {seoDescription ? <meta name="twitter:description" content={seoDescription} /> : null}
      {imageUrl ? <meta name="twitter:image" content={imageUrl} /> : null}
    </>
  );
}
