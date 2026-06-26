import {
  DEFAULT_OG_IMAGE_PATH,
  PUBLIC_SITE_NAME,
  toAbsolutePublicUrl,
} from "@/lib/publicSiteConstants";

/**
 * Article / NewsArticle для `/articles/*`.
 * Тексты — блоки CMS: seo_title, seo_description, preview, article_kind.
 * Даты — поля страницы в БД: createdAt, updatedAt (API `/api/pages/slug/...`).
 */
export function buildArticleJsonLd(options: {
  origin: string;
  slug: string;
  headline: string;
  description?: string;
  imagePathOrUrl?: string;
  datePublished?: string | null;
  dateModified?: string | null;
  articleKind?: "news" | "article";
}): Record<string, unknown> {
  const slug = options.slug.replace(/^\/+/, "");
  const pageUrl = toAbsolutePublicUrl(`/${slug}`, options.origin);
  const imageRaw = (options.imagePathOrUrl || "").trim() || DEFAULT_OG_IMAGE_PATH;
  const imageUrl = toAbsolutePublicUrl(imageRaw, options.origin);
  const logoUrl = toAbsolutePublicUrl(DEFAULT_OG_IMAGE_PATH, options.origin);

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": options.articleKind === "article" ? "Article" : "NewsArticle",
    headline: options.headline,
    url: pageUrl,
    mainEntityOfPage: pageUrl,
    inLanguage: "ru-RU",
    publisher: {
      "@type": "Organization",
      name: PUBLIC_SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: logoUrl,
      },
    },
  };

  const description = options.description?.trim();
  if (description) schema.description = description;

  if (imageUrl) {
    schema.image = [imageUrl];
  }

  const published = options.datePublished?.trim();
  if (published) schema.datePublished = published;

  const modified = options.dateModified?.trim();
  if (modified) schema.dateModified = modified;

  return schema;
}
