import type { Metadata } from "next";
import {
  ClipboardDocumentCheckIcon,
  CurrencyDollarIcon,
  SparklesIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import type { BannerSlide } from "@/components/HomeBannersCarousel";
import { HomeBannersCarouselGate } from "@/components/HomeBannersCarouselGate";
import { HomeReviewsCarousel } from "@/components/HomeReviewsCarousel";
import type { HomeServicesFolderCard } from "@/components/HomeServicesFolderCards";
import { HomeServicesFolderCards } from "@/components/HomeServicesFolderCards";
import { HomeArticlesCarousel } from "@/components/HomeArticlesCarousel";
import { normalizeSlug, type ServiceFolderMeta } from "@/lib/serviceTree";
import { apiBaseUrl } from "@/lib/apiBaseUrl";
import { fetchFolderMetaMap, mergeRootSectionKeywords } from "@/lib/hubFolderMetadata";
import { buildStaticPageMetadata } from "@/lib/staticPageMetadata";

const HOME_TITLE = "Центр каталогизации и анализа данных";
const HOME_SERVICES_INTRO =
  "Помогаем участникам ГОЗ выполнять требования государственных контрактов в части каталогизации, применения продукции иностранного производства, разработки электронной конструкторской документации, поиска взаимозаменяемых аналогов и другие.";

export async function generateMetadata(): Promise<Metadata> {
  const folderMap = await fetchFolderMetaMap();
  const keywords = mergeRootSectionKeywords(folderMap);
  return buildStaticPageMetadata({
    title: HOME_TITLE,
    description: HOME_SERVICES_INTRO,
    pathname: "/",
    keywords: keywords || undefined,
  });
}

export const revalidate = 120;

function homeServiceCategoryCard(
  folderMetaBySlug: Map<string, ServiceFolderMeta>,
  slug: string,
  fallbackLabel: string,
): HomeServicesFolderCard {
  const s = normalizeSlug(slug);
  const meta = folderMetaBySlug.get(s);
  return {
    slugPath: s,
    label: meta?.name?.trim() || fallbackLabel,
    description: meta?.description?.trim() || undefined,
    preview: meta?.preview?.trim() || undefined,
  };
}

const features = [
  {
    name: "Команда профессионалов",
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

export default async function Home() {
  const base = apiBaseUrl();
  const fetchJson = async <T,>(
    path: string,
    timeoutMs: number,
    useDataCache = true,
  ): Promise<T> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(
        `${base}${path}`,
        useDataCache
          ? { cache: "force-cache", next: { revalidate: 120 }, signal: controller.signal }
          : { cache: "no-store", signal: controller.signal },
      );
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
  type BannersPayload = { coverAspect?: string; slides?: BannerSlide[] };

  const [foldersRes, bannersRes] = await Promise.allSettled([
    /* Превью папок — файлы в uploads, не data URL; кэш 120 c — быстрее главная, обновление с задержкой до 2 мин. */
    fetchJson<{ folders?: ServiceFolderMeta[] }>("/api/pages/folders", 10_000, true),
    fetchJson<BannersPayload>("/api/pages/banners", 10_000, true),
  ]);

  const folders =
    foldersRes.status === "fulfilled" && Array.isArray(foldersRes.value?.folders)
      ? foldersRes.value.folders
      : [];
  const homeBannersPayload =
    bannersRes.status === "fulfilled" ? bannersRes.value : null;
  const homeBanners = Array.isArray(homeBannersPayload?.slides)
    ? homeBannersPayload.slides
    : [];
  const homeBannersCoverAspect =
    homeBannersPayload?.coverAspect === "1-4" ||
    homeBannersPayload?.coverAspect === "6-1"
      ? homeBannersPayload.coverAspect
      : "1-8";

  const folderMetaBySlug = new Map<string, ServiceFolderMeta>();
  for (const f of folders) {
    if (!f?.slug || !String(f.name || "").trim()) continue;
    const key = normalizeSlug(f.slug);
    if (!key) continue;
    folderMetaBySlug.set(key, f);
  }

  const catalogCard = homeServiceCategoryCard(folderMetaBySlug, "catalogization", "Каталогизация");
  const sideCategoryCards: HomeServicesFolderCard[] = [
    homeServiceCategoryCard(folderMetaBySlug, "training-center", "Учебный центр"),
    homeServiceCategoryCard(folderMetaBySlug, "other-services", "Прочие услуги"),
  ];

  return (
    <div className="home-page min-h-screen bg-slate-100 text-slate-900" lang="ru">
      <HomeBannersCarouselGate slides={homeBanners} coverAspect={homeBannersCoverAspect} />
      <section className="bg-transparent py-6 sm:py-10 about-template-fallback">
        <div className="home-section-intro">
          <p className="about-template-fallback__eyebrow about-template-fallback__eyebrow--tight mb-0 text-base font-semibold text-[#b91c1c]">
            Наши услуги
          </p>
          <h2 className="about-template-fallback__title -mt-1.5 mt-0 text-balance text-pretty sm:-mt-2">
            Каталогизация, обучение и сопровождение в ГОЗ
          </h2>
          <p className="home-section-intro__lead text-pretty">
            {HOME_SERVICES_INTRO}
          </p>
        </div>
        <div className="mx-auto max-w-7xl home-section-inline-padding">
          <div className="mt-6 max-w-none sm:mt-8">
            <div className="services-home-categories-shell">
              <div className="services-home-categories-shell__main">
                <HomeServicesFolderCards
                  layout="featured"
                  equalHeight
                  syncHeightsToTallest={false}
                  featuredPanelVariant="home"
                  alwaysShowPreview
                  hyphenateDescriptions
                  ctaLabel="Подробнее"
                  gridClassName="services-home-categories-main-grid"
                  cards={[catalogCard]}
                  limit={1}
                />
              </div>
              <div className="services-home-categories-shell__side">
                <HomeServicesFolderCards
                  layout="featured"
                  syncHeightsToTallest={false}
                  featuredPanelVariant="section-hub"
                  alwaysShowPreview
                  hyphenateDescriptions
                  ctaLabel="Подробнее"
                  gridClassName="services-home-categories-side-grid"
                  cards={sideCategoryCards}
                  limit={2}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-transparent py-8 sm:py-10 about-template-fallback">
        <div className="home-section-intro">
          <p className="about-template-fallback__eyebrow about-template-fallback__eyebrow--tight mb-0 text-base font-semibold text-[#b91c1c]">
            О нас
          </p>
          <h1 className="about-template-fallback__title -mt-1.5 mt-0 text-balance text-pretty sm:-mt-2">
            {HOME_TITLE}
          </h1>
          <p className="home-section-intro__lead text-pretty">
            Мы команда профессионалов с многолетним опытом поддержки организаций промышленности в
            ГОЗ. Сотрудники нашей компании имеют ученые степени и обладают колоссальным опытом
            работы в органах государственного управления (Минпромторг России, Минобороны России и
            др.), научно-исследовательских организациях, Центрах каталогизации, организациях
            промышленности. Накопленные знания и умение работать с государственными организациями
            обеспечивают оперативное выполнение задач любой сложности.
          </p>
        </div>
        <div className="mx-auto max-w-7xl home-section-inline-padding">
          <div className="mt-8 max-w-none about-template-fallback__list-wrap">
            <ul className="grid max-w-none grid-cols-1 gap-x-8 gap-y-10 lg:grid-cols-2 lg:gap-y-16 about-template-fallback__grid">
              {features.map((feature) => (
                <li key={feature.name} className="about-template-fallback__item flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#496db3]/12 about-template-fallback__icon">
                    <feature.icon
                      aria-hidden="true"
                      className="h-6 w-6 shrink-0 text-[#496db3] about-template-fallback__icon-glyph"
                    />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base/7 font-semibold text-gray-900 about-template-fallback__dt">
                      {feature.name}
                    </h3>
                    {feature.description ? (
                      <p className="mt-0 text-base/7 text-gray-600 about-template-fallback__dd">
                        {feature.description}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <HomeReviewsCarousel slides={[]} />

      <HomeArticlesCarousel slides={[]} />

    </div>
  );
}
