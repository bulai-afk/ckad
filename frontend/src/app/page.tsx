import Link from "next/link";
import type { BannerSlide } from "@/components/HomeBannersCarousel";
import { HomeMainStack } from "@/components/HomeMainStack";
import { HomeReviewsCarousel } from "@/components/HomeReviewsCarousel";
import { HomeServicesFolderCards } from "@/components/HomeServicesFolderCards";
import { HomeArticlesCarousel } from "@/components/HomeArticlesCarousel";
import { HomePartnersCarousel } from "@/components/HomePartnersCarousel";
import { apiGet } from "@/lib/api";
import {
  buildServicesTree,
  collectServiceCards,
  folderCardPropsFromServiceNode,
  isVisibleServicePage,
  normalizeSlug,
  type ServiceFolderMeta,
  type ServiceListItem,
  type ServiceTreeNode,
} from "@/lib/serviceTree";
import { apiBaseUrl } from "@/lib/apiBaseUrl";

export const dynamic = "force-dynamic";
import {
  AcademicCapIcon,
  SparklesIcon,
  ClipboardDocumentCheckIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline";

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
};

function isVisibleArticlePage(p: ArticleListItem): boolean {
  if (String(p.status).toUpperCase() === "PUBLISHED") return true;
  return process.env.NODE_ENV === "development";
}

export default async function Home() {
  let reviews: ReviewSlide[] = [];
  let bannerSlides: BannerSlide[] = [];
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
  try {
    const data = await fetchNoStoreJson<{ slides?: ReviewSlide[] }>("/api/pages/reviews", 10_000);
    reviews = Array.isArray(data.slides) ? data.slides : [];
  } catch {
    // keep empty; reviews block has fallback fetch too
  }
  try {
    const data = await fetchNoStoreJson<{ slides?: BannerSlide[] }>("/api/pages/banners", 10_000);
    bannerSlides = Array.isArray(data.slides) ? data.slides : [];
  } catch {
    // пустой массив — карусель покажет запасной блок
  }

  let homeServiceCards: ServiceTreeNode[] = [];
  let servicesRootFolderDescription: string | null = null;
  try {
    const [pages, foldersPayload] = await Promise.all([
      apiGet<ServiceListItem[]>("/api/pages"),
      apiGet<{ folders?: ServiceFolderMeta[] }>("/api/pages/folders"),
    ]);
    const folders = Array.isArray(foldersPayload?.folders) ? foldersPayload.folders : [];
    const folderMetaBySlug = new Map(folders.map((f) => [normalizeSlug(f.slug), f] as const));
    const rootMeta = folderMetaBySlug.get("services");
    const rootDesc = rootMeta?.description?.trim();
    if (rootDesc) servicesRootFolderDescription = rootDesc;
    const servicesPages = pages
      .filter((p) => isVisibleServicePage(p) && normalizeSlug(p.slug).startsWith("services/"))
      .map((p) => ({ ...p, slug: normalizeSlug(p.slug) }))
      .sort((a, b) => a.title.localeCompare(b.title, "ru"));

    const tree = buildServicesTree(servicesPages, folderMetaBySlug);
    const collected: ServiceTreeNode[] = [];
    collectServiceCards(tree, collected);
    homeServiceCards = collected.slice(0, 12);
  } catch {
    homeServiceCards = [];
  }

  let homeArticles: ArticleListItem[] = [];
  try {
    const pages = await apiGet<ArticleListItem[]>("/api/pages");
    homeArticles = pages
      .filter((p) => isVisibleArticlePage(p) && normalizeSlug(p.slug).startsWith("articles/"))
      .map((p) => ({ ...p, slug: normalizeSlug(p.slug) }))
      .sort((a, b) => {
        const ad = new Date(a.createdAt || 0).getTime();
        const bd = new Date(b.createdAt || 0).getTime();
        return bd - ad;
      })
      .slice(0, 12);
  } catch {
    homeArticles = [];
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="px-4 py-10 sm:px-6 lg:px-10">
        <HomeMainStack bannerSlides={bannerSlides}>
          <section
            className="why-us-card rounded-xl border border-[#496db3]/45 bg-slate-50 p-6 sm:p-8 text-[#496db3]"
            aria-labelledby="about-company-heading"
          >
            <div className="about-us-inner">
              <div className="min-w-0">
                <div
                  className="mb-4 flex justify-center text-[13px] font-semibold tracking-tight"
                  style={{ fontSize: "clamp(10px, 1.2vw, 16px)" }}
                >
                  <h2
                    id="about-company-heading"
                    className="text-center uppercase text-[#496db3]"
                    style={{
                      fontSize: "230%",
                      lineHeight: 1.1,
                      fontWeight: 950,
                      textShadow:
                        "0.35px 0 currentColor, -0.35px 0 currentColor, 0 0.35px currentColor, 0 -0.35px currentColor",
                    }}
                  >
                    О нас
                  </h2>
                </div>
                <div
                  className="space-y-4 text-left font-semibold text-[#496db3]"
                  style={{ fontSize: "clamp(13px, 0.7vw, 14px)" }}
                >
                  <p style={{ fontSize: "112%", lineHeight: 1.35 }}>
                    <strong>Центр каталогизации и анализа данных</strong> — команда, которая помогает
                    заказчикам систематизировать сведения о продукции, вести номенклатуру в актуальном
                    состоянии и проходить процедуры согласования без лишних срывов сроков.
                  </p>
                  <p style={{ fontSize: "112%", lineHeight: 1.35 }}>
                    Мы сопровождаем проекты от подготовки карточек и классификации до взаимодействия с
                    контрольными органами: консультируем, дорабатываем материалы и держим процесс под
                    контролем на каждом этапе.
                  </p>
                  <p style={{ fontSize: "112%", lineHeight: 1.35 }}>
                    Наша цель — надёжная база данных для вашего бизнеса и предсказуемый результат при
                    работе с реестрами и требованиями к каталогизации.
                  </p>
                </div>
              </div>
              <div className="about-us-inner__logo flex shrink-0">
                <img
                  src="/logo_1.svg"
                  alt="Логотип Центра каталогизации и анализа данных"
                  className="h-28 w-28 shrink-0 object-contain object-center md:h-40 md:w-40 lg:h-48 lg:w-56 [filter:drop-shadow(0_2px_6px_rgba(0,0,0,0.08))]"
                  width={224}
                  height={190}
                />
              </div>
            </div>
          </section>

          <section className="bg-transparent p-0">
            <div
              className="mb-4 flex items-center justify-center text-[13px] font-semibold tracking-tight"
              style={{ fontSize: "clamp(10px, 1.2vw, 16px)" }}
            >
              <h2
                className="text-center uppercase text-[#496db3]"
                style={{
                  fontSize: "230%",
                  lineHeight: 1.1,
                  fontWeight: 950,
                  textShadow:
                    "0.35px 0 currentColor, -0.35px 0 currentColor, 0 0.35px currentColor, 0 -0.35px currentColor",
                }}
              >
                Преимущества работы с нами
              </h2>
            </div>
            <div className="mb-4" style={{ fontSize: "clamp(13px, 0.7vw, 14px)" }}>
              <p
                className="text-center font-semibold text-[#496db3]"
                style={{ fontSize: "112%", lineHeight: 1.35 }}
              >
                Мы искренне дорожим вашим доверием и ценим каждого клиента: вкладываемся в качество,
                ищем оптимальные решения и остаёмся рядом от первой консультации до финального
                согласования. Для постоянных партнёров — честные цены, система скидок и особые условия.
            </p>
          </div>
            <div
              className="why-us-grid grid gap-3"
              style={{ fontSize: "clamp(13px, 0.7vw, 14px)" }}
            >
              <article className="why-us-card flex h-full min-h-0 flex-col rounded-xl border border-slate-200/80 bg-slate-50 p-4 text-[#496db3]">
                <div className="flex min-h-0 flex-1 items-center gap-3">
                  <AcademicCapIcon className="h-8 w-8 shrink-0 text-[#496db3]" />
                  <p className="font-semibold text-[#496db3]" style={{ fontSize: "112%", lineHeight: 1.35 }}>
                    Сильная команда экспертов с многолетней практикой в каталогизации и анализе.
                  </p>
                </div>
              </article>
              <article className="why-us-card rounded-xl border border-slate-200/80 bg-slate-50 p-4 text-[#496db3]">
                <div className="flex items-center gap-3">
                  <CurrencyDollarIcon className="h-8 w-8 shrink-0 text-[#496db3]" />
                  <p className="font-semibold text-[#496db3]" style={{ fontSize: "112%", lineHeight: 1.35 }}>
                    Честные цены, скидки для постоянных клиентов и выгодные специальные предложения.
                  </p>
                </div>
              </article>
              <article className="why-us-card flex h-full min-h-0 flex-col rounded-xl border border-slate-200/80 bg-slate-50 p-4 text-[#496db3]">
                <div className="flex min-h-0 flex-1 items-center gap-3">
                  <SparklesIcon className="h-8 w-8 shrink-0 text-[#496db3]" />
                  <p className="font-semibold text-[#496db3]" style={{ fontSize: "112%", lineHeight: 1.35 }}>
                    Индивидуальный подход к задаче и решения в сложных нестандартных ситуациях.
                  </p>
                </div>
              </article>
              <article className="why-us-card flex h-full min-h-0 flex-col rounded-xl border border-slate-200/80 bg-slate-50 p-4 text-[#496db3]">
                <div className="flex min-h-0 flex-1 items-center gap-3">
                  <ClipboardDocumentCheckIcon className="h-8 w-8 shrink-0 text-[#496db3]" />
                  <p className="font-semibold text-[#496db3]" style={{ fontSize: "112%", lineHeight: 1.35 }}>
                    Пошаговое сопровождение согласования — от подготовки до финального утверждения.
                  </p>
                </div>
              </article>
            </div>
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
              .why-us-card {
                box-shadow:
                  0 6px 24px rgba(73, 109, 179, 0.18),
                  0 0 32px rgba(73, 109, 179, 0.14),
                  0 0 64px rgba(73, 109, 179, 0.09);
              }
              .about-us-inner {
                display: grid;
                grid-template-columns: minmax(0, 1fr);
                gap: 1.5rem;
                align-items: start;
              }
              .about-us-inner__logo {
                justify-content: center;
                width: 100%;
                padding-top: 0.5rem;
              }
              @media (min-width: 768px) {
                .about-us-inner {
                  grid-template-columns: minmax(0, 1fr) auto;
                  gap: 2.5rem;
                }
                .about-us-inner > :first-child {
                  padding-right: 0.5rem;
                }
                .about-us-inner__logo {
                  justify-content: flex-end;
                  width: auto;
                  justify-self: end;
                  padding-top: 0.25rem;
                }
              }
              @media (min-width: 1024px) {
                .about-us-inner {
                  gap: 3rem;
                }
                .about-us-inner > :first-child {
                  padding-right: 1rem;
                }
              }
              .services-home-grid {
                display: grid;
                gap: 0.75rem;
                grid-template-columns: 1fr;
              }
              @media (min-width: 768px) {
                .services-home-grid {
                  grid-template-columns: repeat(3, minmax(0, 1fr));
                }
              }
              @media (min-width: 1024px) {
                .services-home-grid {
                  grid-template-columns: repeat(4, minmax(0, 1fr));
                }
              }
              .services-home-card {
                position: relative;
                overflow: hidden;
                isolation: isolate;
              }
              .services-home-card::before {
                content: "";
                position: absolute;
                inset: 0;
                z-index: 0;
                background-image: url("/logo_1.svg");
                background-repeat: no-repeat;
                background-position: center;
                background-size: min(78%, 9rem) auto;
                opacity: 0;
                transition: opacity 0.35s ease;
                pointer-events: none;
              }
              .services-home-card:hover::before,
              .services-home-card:focus-within::before {
                opacity: 0.16;
              }
              .services-home-card > * {
                position: relative;
                z-index: 1;
              }
            `}</style>
          </section>

          <section className="bg-transparent p-0">
            <div
              className="mb-4 flex items-center justify-center text-[13px] font-semibold tracking-tight"
              style={{ fontSize: "clamp(10px, 1.2vw, 16px)" }}
            >
              <h2
                className="text-center uppercase text-[#496db3]"
                style={{
                  fontSize: "230%",
                  lineHeight: 1.1,
                  fontWeight: 950,
                  textShadow:
                    "0.35px 0 currentColor, -0.35px 0 currentColor, 0 0.35px currentColor, 0 -0.35px currentColor",
                }}
              >
                Наши услуги
          </h2>
            </div>
            <div className="mb-4" style={{ fontSize: "clamp(13px, 0.7vw, 14px)" }}>
              <p
                className="whitespace-pre-wrap text-center font-semibold text-[#496db3]"
                style={{ fontSize: "112%", lineHeight: 1.35 }}
              >
                {servicesRootFolderDescription ?? (
                  <>
                    Закрываем задачи «под ключ» в области классификации и анализа данных: от методики и
                    каталогизации до сопровождения согласований — чтобы вы получали понятный результат в
                    срок и без лишних рисков.
                  </>
                )}
              </p>
            </div>
            <div className="mt-4">
              <HomeServicesFolderCards
                equalHeight
                gridClassName="services-home-grid"
                cards={homeServiceCards.map((n) => folderCardPropsFromServiceNode(n))}
              />
            </div>
          </section>

          <HomeReviewsCarousel slides={reviews} />

          <HomeArticlesCarousel slides={homeArticles} />

          <HomePartnersCarousel slides={[]} />
        </HomeMainStack>
      </div>
    </div>
  );
}
