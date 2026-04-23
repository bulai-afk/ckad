import Link from "next/link";
import {
  ArticleTeaserCard,
  excerptFromArticleDescription,
  formatArticleDate,
} from "@/components/ArticleTeaserCard";
import { apiGet } from "@/lib/api";
import { apiPagesSlugRequestPath } from "@/lib/apiPagesSlugUrl";
import {
  normalizePageDisplayOrderMap,
  sortBySectionDisplayOrder,
} from "@/lib/pageDisplayOrder";
import { sanitizePublicAssetUrl } from "@/lib/publicAssetUrl";

export const dynamic = "force-dynamic";

type ArticleListItem = {
  id: number;
  title: string;
  slug: string;
  status: "DRAFT" | "PUBLISHED" | string;
  description?: string | null;
  preview?: string | null;
  createdAt?: string;
  updatedAt?: string | null;
  articleKind?: "news" | "article";
};

type PageBlock = {
  type: string;
  data?: { text?: string };
};

type PageBySlug = {
  slug: string;
  blocks: PageBlock[];
};

function normalizeSlug(s: string): string {
  return s
    .trim()
    .replace(/^\/+/u, "")
    .replace(/\/+$/u, "")
    .replace(/\/+/gu, "/")
    .toLowerCase();
}

function isVisibleArticlePage(p: ArticleListItem): boolean {
  if (String(p.status).toUpperCase() === "PUBLISHED") return true;
  return process.env.NODE_ENV === "development";
}

function extractFirstImageSrcFromHtml(html: string): string | null {
  const m = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
  if (!m) return null;
  const src = m[1]?.trim();
  if (!src) return null;
  return src;
}

function extractCoverBackgroundDataUrlFromHtml(html: string): string | null {
  // Ищем первый блок обложки и его inline background с url(...)
  // Пример из редактора: <div class="page-web-cover" ... style="background: url(&quot;data:...&quot;) ...">
  const coverIdx = html.search(/page-web-cover/iu);
  const slice = coverIdx >= 0 ? html.slice(coverIdx, coverIdx + 8000) : html;
  const styleMatch = slice.match(/style=["'][^"']*background[^"']*["']/iu);
  const style = styleMatch?.[0] ?? "";

  // 1) data:image/... в url("...") (включая html entities)
  const urlMatch =
    style.match(/url\(\s*["']([^"']+)["']\s*\)/iu) ||
    style.match(/url\(\s*&quot;([^&]+)&quot;\s*\)/iu);
  if (!urlMatch) return null;
  const raw = String(urlMatch[1] || "").trim();
  if (!raw) return null;
  const unescaped = raw.replace(/&amp;/g, "&").replace(/&quot;/g, '"');
  return unescaped;
}

async function getArticles(): Promise<
  {
    href: string;
    previewUrl: string;
    dateTime: string;
    dateLabel: string;
    title: string;
    excerpt: string;
    articleKind?: "news" | "article";
  }[]
> {
  try {
    const pages = await apiGet<ArticleListItem[]>("/api/pages");
    let orderBySection = {};
    try {
      const displayOrderPayload = await apiGet<{ orderBySection?: unknown }>("/api/pages/display-order");
      orderBySection = normalizePageDisplayOrderMap(displayOrderPayload?.orderBySection);
    } catch {
      orderBySection = {};
    }
    const byDateDesc = pages
      .filter((p) => isVisibleArticlePage(p) && normalizeSlug(p.slug).startsWith("articles/"))
      .sort((a, b) => {
        const ad = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const bd = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return bd - ad;
      });
    const sourceArticles = sortBySectionDisplayOrder(
      byDateDesc,
      "articles",
      (item) => normalizeSlug(item.slug),
      orderBySection,
      (a, b) => {
        const ad = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const bd = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return bd - ad;
      },
    );

    const pageBySlug = await Promise.all(
      sourceArticles.map(async (p) => {
        const slug = normalizeSlug(p.slug);
        try {
          const full = await apiGet<PageBySlug>(apiPagesSlugRequestPath(slug));
          return [slug, full] as const;
        } catch {
          return [slug, null] as const;
        }
      }),
    );

    const pageMap = new Map(pageBySlug);

    const articles = sourceArticles.map((p) => {
        const slug = normalizeSlug(p.slug);
        const full = pageMap.get(slug);
        const textBlocks = Array.isArray(full?.blocks) ? full!.blocks.filter((b) => b.type === "text") : [];
        let previewFromPage = "";
        for (const b of textBlocks) {
          const html = typeof b.data?.text === "string" ? b.data.text : "";
          const src =
            html ? extractCoverBackgroundDataUrlFromHtml(html) || extractFirstImageSrcFromHtml(html) : null;
          if (src) {
            previewFromPage = src;
            break;
          }
        }

        const { dateTime, label: dateLabel } = formatArticleDate(p.updatedAt ?? p.createdAt);
        const rawThumb =
          (typeof p.preview === "string" && p.preview.trim()) || previewFromPage || "";
        const safeThumb = sanitizePublicAssetUrl(rawThumb);
        return {
          href: `/${slug}`,
          previewUrl: safeThumb,
          dateTime,
          dateLabel,
          title: p.title,
          excerpt: excerptFromArticleDescription(p.description),
          articleKind: p.articleKind,
        };
      });
    return articles;
  } catch {
    return [];
  }
}

type ArticlesPageProps = {
  searchParams?:
    | { page?: string | string[] }
    | Promise<{ page?: string | string[] }>;
};

export default async function ArticlesPage({ searchParams }: ArticlesPageProps) {
  const posts = await getArticles();
  const POSTS_PER_PAGE = 12;

  const resolvedSearchParams = (await searchParams) ?? {};
  const pageRaw = Array.isArray(resolvedSearchParams.page)
    ? resolvedSearchParams.page[0]
    : resolvedSearchParams.page;
  const currentPage = Number(pageRaw || "1");
  const totalPages = Math.max(1, Math.ceil(posts.length / POSTS_PER_PAGE));
  const pageSafe = Number.isFinite(currentPage)
    ? Math.min(Math.max(Math.trunc(currentPage), 1), totalPages)
    : 1;
  const pagedPosts = posts.slice((pageSafe - 1) * POSTS_PER_PAGE, pageSafe * POSTS_PER_PAGE);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-7xl px-6 py-8 sm:py-10 lg:px-8">
        <section className="bg-transparent py-0 about-template-fallback">
          <div className="mx-auto mt-0 max-w-3xl text-center">
            <h1 className="about-template-fallback__eyebrow about-template-fallback__eyebrow--tight mb-0 text-base font-semibold text-[#b91c1c]">
              Новости
            </h1>
            <p className="about-template-fallback__title -mt-1.5 mt-0 text-balance text-pretty sm:-mt-2">
              Актуальная информация
            </p>
            <p className="mt-6 text-pretty text-sm font-medium text-slate-600 sm:text-base">
              Полезные материалы по каталогизации и анализу данных — советы и разборы кейсов, которые помогут быстрее
              пройти согласования и избежать ошибок.
            </p>
          </div>

          {posts.length > 0 ? (
            <>
              <div className="mt-10 max-w-none">
                <ul className="grid list-none grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-10">
                  {pagedPosts.map((p) => (
                    <li key={p.href} className="min-w-0">
                      <ArticleTeaserCard
                        href={p.href}
                        previewUrl={p.previewUrl}
                        dateTime={p.dateTime}
                        dateLabel={p.dateLabel}
                        title={p.title}
                        excerpt={p.excerpt}
                        articleKind={p.articleKind}
                      />
                    </li>
                  ))}
                </ul>
              </div>

              {totalPages > 1 ? (
                <nav
                  className="mt-12 flex flex-wrap items-center justify-center gap-2"
                  aria-label="Пагинация новостей"
                >
                  <Link
                    href={pageSafe > 1 ? `/articles?page=${pageSafe - 1}` : "/articles?page=1"}
                    aria-disabled={pageSafe <= 1}
                    className={`inline-flex items-center rounded-full px-4 py-2 text-[13px] font-semibold transition ${
                      pageSafe <= 1
                        ? "cursor-not-allowed bg-slate-200 text-slate-400"
                        : "bg-[#496db3] text-white hover:bg-[#3f5f9d]"
                    }`}
                  >
                    Назад
                  </Link>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                    <Link
                      key={n}
                      href={n === 1 ? "/articles" : `/articles?page=${n}`}
                      className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-semibold transition ${
                        n === pageSafe
                          ? "bg-[#496db3] text-white"
                          : "bg-white text-[#496db3] ring-1 ring-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {n}
                    </Link>
                  ))}

                  <Link
                    href={
                      pageSafe < totalPages ? `/articles?page=${pageSafe + 1}` : `/articles?page=${totalPages}`
                    }
                    aria-disabled={pageSafe >= totalPages}
                    className={`inline-flex items-center rounded-full px-4 py-2 text-[13px] font-semibold transition ${
                      pageSafe >= totalPages
                        ? "cursor-not-allowed bg-slate-200 text-slate-400"
                        : "bg-[#496db3] text-white hover:bg-[#3f5f9d]"
                    }`}
                  >
                    Вперёд
                  </Link>
                </nav>
              ) : null}
            </>
          ) : (
            <div className="mx-auto mt-10 max-w-xl rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-600">
              Пока нет опубликованных материалов в разделе новостей.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
