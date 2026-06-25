import type { MetadataRoute } from "next";
import { apiBaseUrl } from "@/lib/apiBaseUrl";
import { DEFAULT_PUBLIC_SITE_ORIGIN } from "@/lib/hubFolderMetadata";
import {
  buildServicesTree,
  normalizeSlug,
  type ServiceFolderMeta,
  type ServiceListItem,
} from "@/lib/serviceTree";

export const revalidate = 300;

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "") ||
  process.env.SITE_URL?.trim().replace(/\/+$/, "") ||
  DEFAULT_PUBLIC_SITE_ORIGIN;

/** Публичные маршруты с отдельными page.tsx. */
const STATIC_PUBLIC_ROUTES: {
  path: string;
  priority: number;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
}[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/about", priority: 0.8, changeFrequency: "monthly" },
  { path: "/articles", priority: 0.9, changeFrequency: "daily" },
  { path: "/catalogization", priority: 0.9, changeFrequency: "weekly" },
  { path: "/contacts", priority: 0.7, changeFrequency: "monthly" },
  { path: "/other-services", priority: 0.9, changeFrequency: "weekly" },
  { path: "/services", priority: 0.9, changeFrequency: "weekly" },
  { path: "/training-center", priority: 0.9, changeFrequency: "weekly" },
];

type SitemapPage = ServiceListItem & {
  createdAt?: string | null;
  updatedAt?: string | null;
};

type SitemapEntry = MetadataRoute.Sitemap[number];

function toSitemapUrl(path: string): string {
  if (path === "/") return `${siteUrl}/`;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${siteUrl}${normalized}`;
}

function parseDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function entry(
  path: string,
  options?: {
    lastModified?: Date;
    priority?: number;
    changeFrequency?: SitemapEntry["changeFrequency"];
  },
): SitemapEntry {
  return {
    url: toSitemapUrl(path),
    lastModified: options?.lastModified,
    changeFrequency: options?.changeFrequency ?? "monthly",
    priority: options?.priority ?? 0.6,
  };
}

async function fetchPublishedPages(): Promise<SitemapPage[]> {
  const base = apiBaseUrl();
  try {
    const res = await fetch(`${base}/api/pages`, {
      cache: "force-cache",
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as SitemapPage[];
    if (!Array.isArray(data)) return [];
    return data.filter((p) => String(p.status).toUpperCase() === "PUBLISHED");
  } catch {
    return [];
  }
}

async function fetchFolders(): Promise<ServiceFolderMeta[]> {
  const base = apiBaseUrl();
  try {
    const res = await fetch(`${base}/api/pages/folders`, {
      cache: "force-cache",
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { folders?: ServiceFolderMeta[] };
    return Array.isArray(data.folders) ? data.folders : [];
  } catch {
    return [];
  }
}

/** Хабы вложенных папок раздела «Услуги» (маршрут [...slug], без отдельной CMS-страницы). */
function collectServiceFolderHubPaths(pages: SitemapPage[], folders: ServiceFolderMeta[]): string[] {
  const folderMetaBySlug = new Map<string, ServiceFolderMeta>();
  for (const f of folders) {
    const key = normalizeSlug(String(f.slug || ""));
    if (!key || (key !== "services" && !key.startsWith("services/"))) continue;
    folderMetaBySlug.set(key, f);
  }

  const servicePages = pages
    .filter((p) => normalizeSlug(p.slug).startsWith("services/"))
    .map((p) => ({ ...p, slug: normalizeSlug(p.slug) }));

  const tree = buildServicesTree(servicePages, folderMetaBySlug);
  const hubs: string[] = [];

  const walk = (node: ReturnType<typeof buildServicesTree>) => {
    if (
      node.slugPath !== "services" &&
      (node.isMetaFolder || node.pages.length > 0 || node.children.length > 0)
    ) {
      hubs.push(`/${node.slugPath}`);
    }
    for (const child of node.children) walk(child);
  };

  walk(tree);
  return hubs;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [pages, folders] = await Promise.all([fetchPublishedPages(), fetchFolders()]);
  const byUrl = new Map<string, SitemapEntry>();

  for (const route of STATIC_PUBLIC_ROUTES) {
    byUrl.set(toSitemapUrl(route.path), entry(route.path, {
      priority: route.priority,
      changeFrequency: route.changeFrequency,
    }));
  }

  for (const p of pages) {
    const slug = normalizeSlug(String(p.slug || ""));
    if (!slug || slug.startsWith("admin")) continue;
    const path = `/${slug}`;
    const lastModified = parseDate(p.updatedAt) ?? parseDate(p.createdAt);
    const isArticle = slug === "articles" || slug.startsWith("articles/");
    byUrl.set(toSitemapUrl(path), entry(path, {
      lastModified,
      priority: isArticle ? 0.7 : 0.65,
      changeFrequency: isArticle ? "weekly" : "monthly",
    }));
  }

  for (const hubPath of collectServiceFolderHubPaths(pages, folders)) {
    if (!byUrl.has(toSitemapUrl(hubPath))) {
      byUrl.set(toSitemapUrl(hubPath), entry(hubPath, { priority: 0.75, changeFrequency: "weekly" }));
    }
  }

  return Array.from(byUrl.values());
}
