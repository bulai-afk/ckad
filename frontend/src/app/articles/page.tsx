import Link from "next/link";
import { ChevronRightIcon, HomeIcon } from "@heroicons/react/20/solid";
import { HomeServicesFolderCards } from "@/components/HomeServicesFolderCards";
import { apiGet } from "@/lib/api";
import { apiPagesSlugRequestPath } from "@/lib/apiPagesSlugUrl";
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

function formatDateLabel(iso?: string): { dateIso: string; dateLabel: string } {
  if (!iso) {
    return { dateIso: "2026-01-01", dateLabel: "Без даты" };
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return { dateIso: "2026-01-01", dateLabel: "Без даты" };
  }
  return {
    dateIso: d.toISOString().slice(0, 10),
    dateLabel: d.toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" }),
  };
}

async function getArticles(): Promise<
  {
    href: string;
    image: string;
    dateIso: string;
    dateLabel: string;
    title: string;
    excerpt: string;
  }[]
> {
  try {
    const pages = await apiGet<ArticleListItem[]>("/api/pages");
    const sourceArticles = pages
      .filter((p) => isVisibleArticlePage(p) && normalizeSlug(p.slug).startsWith("articles/"))
      .sort((a, b) => {
        const ad = new Date(a.createdAt || 0).getTime();
        const bd = new Date(b.createdAt || 0).getTime();
        return bd - ad;
      });

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

        const { dateIso, dateLabel } = formatDateLabel(p.createdAt);
        const rawThumb =
          (typeof p.preview === "string" && p.preview.trim()) || previewFromPage || "";
        const safeThumb = sanitizePublicAssetUrl(rawThumb);
        return {
          href: `/${slug}`,
          /** Пусто → HomeServicesFolderCards подставит лого, как у услуг (не stock-фото). */
          image: safeThumb,
          dateIso,
          dateLabel,
          title: p.title,
          excerpt:
            typeof p.description === "string" && p.description.trim()
              ? p.description.trim()
              : "Откройте материал, чтобы прочитать полную статью по теме каталогизации.",
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
    <div className="bg-slate-100 text-slate-900">
      <div className="px-4 py-10 sm:px-6 lg:px-10">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
        <section className="bg-transparent p-0 text-[#496db3]">
          <nav
            aria-label="Хлебные крошки"
            className="mb-5 flex flex-wrap items-center gap-1.5 text-sm text-slate-500"
          >
            <Link
              href="/"
              className="inline-flex items-center rounded p-1 hover:bg-slate-200 hover:text-slate-700"
              aria-label="Главная"
            >
              <HomeIcon className="h-4 w-4" />
            </Link>
            <ChevronRightIcon className="h-4 w-4 text-slate-400" />
            <span className="rounded px-1 py-0.5 text-slate-700">Статьи</span>
          </nav>

          <div
            className="mb-4 flex items-center justify-center text-[13px] font-semibold tracking-tight"
            style={{ fontSize: "clamp(10px, 1.2vw, 16px)" }}
          >
            <h1
              className="text-center uppercase text-[#496db3]"
              style={{
                fontSize: "230%",
                lineHeight: 1.1,
                fontWeight: 950,
                textShadow:
                  "0.35px 0 currentColor, -0.35px 0 currentColor, 0 0.35px currentColor, 0 -0.35px currentColor",
              }}
            >
              Статьи
            </h1>
          </div>

          <div className="mb-4" style={{ fontSize: "clamp(13px, 0.7vw, 14px)" }}>
            <p
              className="whitespace-pre-wrap text-center font-semibold text-[#496db3]"
              style={{ fontSize: "112%", lineHeight: 1.35 }}
            >
              Мы постоянно готовим для вас полезные материалы — практические заметки, разборы и советы, которые помогут в
              работе и сделают повседневные задачи понятнее.
            </p>
          </div>

          {posts.length > 0 ? (
            <div className="mt-4">
              <HomeServicesFolderCards
                equalHeight
                ctaLabel="Подробнее"
                limit={POSTS_PER_PAGE}
                cards={pagedPosts.map((p) => ({
                  slugPath: p.href.replace(/^\/+/u, ""),
                  label: p.title,
                  description: `${p.dateLabel}\n\n${p.excerpt}`,
                  preview: p.image,
                }))}
              />
              <style>{`
                .why-us-grid {
                  grid-template-columns: 1fr;
                  align-items: stretch;
                }
                @media (min-width: 768px) {
                  .why-us-grid {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                  }
                }
                @media (min-width: 1024px) {
                  .why-us-grid {
                    grid-template-columns: repeat(4, minmax(0, 1fr));
                  }
                }
              `}</style>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              Пока нет опубликованных статей в разделе `articles`.
            </div>
          )}

          {posts.length > 0 && totalPages > 1 ? (
            <nav className="mt-6 flex flex-wrap items-center justify-center gap-2" aria-label="Пагинация статей">
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
                href={pageSafe < totalPages ? `/articles?page=${pageSafe + 1}` : `/articles?page=${totalPages}`}
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
        </section>
        </div>
      </div>
    </div>
  );
}
