import {
  ClipboardDocumentCheckIcon,
  CurrencyDollarIcon,
  SparklesIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import type { BannerSlide } from "@/components/HomeBannersCarousel";
import { HomeBannersCarouselGate } from "@/components/HomeBannersCarouselGate";
import { HomeReviewsCarousel } from "@/components/HomeReviewsCarousel";
import { HomeServicesFolderCards } from "@/components/HomeServicesFolderCards";
import { HomeArticlesCarousel } from "@/components/HomeArticlesCarousel";
import { apiGet } from "@/lib/api";
import {
  normalizePageDisplayOrderMap,
  sortBySectionDisplayOrder,
} from "@/lib/pageDisplayOrder";
import {
  buildServicesTree,
  collectServiceCardsForHome,
  folderCardPropsFromServiceNode,
  isVisibleServicePage,
  normalizeSlug,
  type ServiceFolderMeta,
  type ServiceListItem,
  type ServiceTreeNode,
} from "@/lib/serviceTree";
import { apiBaseUrl } from "@/lib/apiBaseUrl";

export const dynamic = "force-dynamic";

type ReviewSlide = {
  id: string;
  image: string | null;
};

type ArticleListItem = {
  id: number;
  title: string;
  slug: string;
  status: "DRAFT" | "PUBLISHED" | string;
  description?: string | null;
  preview?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  articleKind?: "news" | "article";
};

const features = [
  {
    name: "Экспертная команда",
    description: "Сильная команда экспертов с многолетней практикой в каталогизации и анализе.",
    icon: UserGroupIcon,
  },
  {
    name: "Прозрачные условия",
    description: "Честные цены, скидки для постоянных клиентов и выгодные специальные предложения.",
    icon: CurrencyDollarIcon,
  },
  {
    name: "Индивидуальный подход",
    description: "Индивидуальный подход к задаче и решения в сложных нестандартных ситуациях.",
    icon: SparklesIcon,
  },
  {
    name: "Сопровождение согласования",
    description: "Пошаговое сопровождение согласования — от подготовки до финального утверждения.",
    icon: ClipboardDocumentCheckIcon,
  },
] as const;

function isVisibleArticlePage(p: ArticleListItem): boolean {
  if (String(p.status).toUpperCase() === "PUBLISHED") return true;
  return process.env.NODE_ENV === "development";
}

export default async function Home() {
  const base = apiBaseUrl();
  const fetchNoStoreJson = async <T,>(path: string, timeoutMs: number): Promise<T> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${base}${path}`, { cache: "no-store", signal: controller.signal });
      if (!res.ok) throw new Error(`GET ${path} failed with ${res.status}`);
      return (await res.json()) as T;
    } catch (e: unknown) {
      if (
        typeof e === "object" &&
        e !== null &&
        (e as { name?: string }).name === "AbortError"
      ) {
        throw new Error(`Request timed out after ${timeoutMs}ms`);
      }
      throw e;
    } finally {
      clearTimeout(timeoutId);
    }
  };
  const [reviewsRes, bannersRes, pagesRes, foldersRes, orderRes] = await Promise.allSettled([
    fetchNoStoreJson<{ slides?: ReviewSlide[] }>("/api/pages/reviews", 10_000),
    fetchNoStoreJson<{ slides?: BannerSlide[] }>("/api/pages/banners", 10_000),
    apiGet<ServiceListItem[]>("/api/pages"),
    apiGet<{ folders?: ServiceFolderMeta[] }>("/api/pages/folders"),
    apiGet<{ orderBySection?: unknown }>("/api/pages/display-order"),
  ]);

  const reviews =
    reviewsRes.status === "fulfilled" && Array.isArray(reviewsRes.value?.slides)
      ? reviewsRes.value.slides
      : [];
  const bannerSlides =
    bannersRes.status === "fulfilled" && Array.isArray(bannersRes.value?.slides)
      ? bannersRes.value.slides
      : [];
  const allPages = pagesRes.status === "fulfilled" && Array.isArray(pagesRes.value) ? pagesRes.value : [];
  const folders =
    foldersRes.status === "fulfilled" && Array.isArray(foldersRes.value?.folders)
      ? foldersRes.value.folders
      : [];
  const orderBySection =
    orderRes.status === "fulfilled"
      ? normalizePageDisplayOrderMap(orderRes.value?.orderBySection)
      : {};

  let homeServiceCards: ServiceTreeNode[] = [];
  let servicesRootFolderDescription: string | null = null;
  if (allPages.length > 0) {
    const folderMetaBySlug = new Map(folders.map((f) => [normalizeSlug(f.slug), f] as const));
    const catMeta = folderMetaBySlug.get("catalogization");
    const servicesMeta = folderMetaBySlug.get("services");
    const rootDesc = catMeta?.description?.trim() || servicesMeta?.description?.trim() || null;
    if (rootDesc) servicesRootFolderDescription = rootDesc;
    const catalogPages = allPages
      .filter((p) => isVisibleServicePage(p) && normalizeSlug(p.slug).startsWith("catalogization/"))
      .map((p) => ({ ...p, slug: normalizeSlug(p.slug) }))
      .sort((a, b) => a.title.localeCompare(b.title, "ru"));

    const tree = buildServicesTree(catalogPages, folderMetaBySlug, {
      rootSlug: "catalogization",
      rootLabel: "Каталогизация",
    });
    const unsortedCards = collectServiceCardsForHome(tree);
    homeServiceCards = sortBySectionDisplayOrder(
      unsortedCards,
      "catalogization",
      (node) => normalizeSlug(node.slugPath),
      orderBySection,
      (a, b) => {
        const ta = a.pages[0]?.title?.trim() || a.label;
        const tb = b.pages[0]?.title?.trim() || b.label;
        return ta.localeCompare(tb, "ru");
      },
    ).slice(0, 12);
  }

  let homeArticles: ArticleListItem[] = [];
  if (allPages.length > 0) {
    const byDateDesc = (allPages as ArticleListItem[])
      .filter((p) => isVisibleArticlePage(p) && normalizeSlug(p.slug).startsWith("articles/"))
      .map((p) => ({ ...p, slug: normalizeSlug(p.slug) }))
      .sort((a, b) => {
        const ad = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const bd = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return bd - ad;
      });
    homeArticles = sortBySectionDisplayOrder(
      byDateDesc,
      "articles",
      (item) => normalizeSlug(item.slug),
      orderBySection,
      (a, b) => {
        const ad = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const bd = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return bd - ad;
      },
    ).slice(0, 10);
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <HomeBannersCarouselGate slides={bannerSlides} />
      <section className="bg-transparent py-8 sm:py-10 about-template-fallback">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto mt-0 max-w-3xl text-center">
            <h2 className="about-template-fallback__eyebrow about-template-fallback__eyebrow--tight mb-0 text-base font-semibold text-[#b91c1c]">
              О нас
            </h2>
            <p className="about-template-fallback__title -mt-1.5 mt-0 text-balance text-pretty sm:-mt-2">
              Центр каталогизации и анализа данных
            </p>
            <p className="mt-6 text-pretty text-base leading-[1.4] font-medium text-slate-600">
              Помогаем заказчикам систематизировать сведения о продукции, вести номенклатуру в
              актуальном состоянии и проходить процедуры согласования без лишних срывов сроков.
            </p>
          </div>
          <div className="mt-8 max-w-none about-template-fallback__list-wrap">
            <dl className="grid max-w-none grid-cols-1 gap-x-8 gap-y-10 lg:grid-cols-2 lg:gap-y-16 about-template-fallback__grid">
              {features.map((feature) => (
                <div key={feature.name} className="about-template-fallback__item flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#496db3]/12 about-template-fallback__icon">
                    <feature.icon
                      aria-hidden="true"
                      className="h-6 w-6 shrink-0 text-[#496db3] about-template-fallback__icon-glyph"
                    />
                  </div>
                  <div className="min-w-0">
                    <dt className="text-base/7 font-semibold text-gray-900 about-template-fallback__dt">
                      {feature.name}
                    </dt>
                    {feature.description ? (
                      <dd className="mt-0 text-base/7 text-gray-600 about-template-fallback__dd">
                        {feature.description}
                      </dd>
                    ) : null}
                  </div>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className="bg-transparent py-8 sm:py-10 about-template-fallback">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto mt-0 max-w-3xl text-center">
            <h2 className="about-template-fallback__eyebrow about-template-fallback__eyebrow--tight mb-0 text-base font-semibold text-[#b91c1c]">
              Наши услуги
            </h2>
            <p className="about-template-fallback__title -mt-1.5 mt-0 text-balance text-pretty sm:-mt-2">
              Услуги по каталогизации
            </p>
            <p className="mt-6 text-pretty text-base leading-[1.4] font-medium text-slate-600">
              {servicesRootFolderDescription ?? (
                <>
                  Закрываем задачи «под ключ» в области каталогизации и анализа данных: от методики до
                  сопровождения согласований — чтобы вы получали понятный результат в срок и без лишних
                  рисков.
                </>
              )}
            </p>
          </div>
          <div className="mt-8 max-w-none">
            <HomeServicesFolderCards
              layout="featured"
              equalHeight
              syncHeightsToTallest
              alwaysShowPreview
              ctaLabel="Подробнее"
              gridClassName="services-home-grid"
              cards={homeServiceCards.map((n) => folderCardPropsFromServiceNode(n))}
            />
          </div>
        </div>
      </section>

      <HomeReviewsCarousel slides={reviews} />

      <HomeArticlesCarousel slides={homeArticles} />

    </div>
  );
}
