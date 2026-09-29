import type { MetadataRoute } from "next";
import { DEFAULT_PUBLIC_SITE_ORIGIN } from "@/lib/publicSiteConstants";

/** Sitemap и Host всегда на основном домене, без Host запроса и env-зеркала. */
const siteUrl = DEFAULT_PUBLIC_SITE_ORIGIN;

const DISALLOW_PATHS = ["/admin", "/api", "/services"];

/** Краулеры нейросетей — явный запрет на служебные разделы. */
const AI_CRAWLER_AGENTS = [
  "GPTBot",
  "ChatGPT-User",
  "Google-Extended",
  "anthropic-ai",
  "ClaudeBot",
  "Applebot-Extended",
  "CCBot",
  "Bytespider",
  "cohere-ai",
  "PerplexityBot",
  "Amazonbot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: DISALLOW_PATHS,
      },
      ...AI_CRAWLER_AGENTS.map((userAgent) => ({
        userAgent,
        disallow: DISALLOW_PATHS,
      })),
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
