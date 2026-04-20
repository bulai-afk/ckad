import { HomeServicesFolderCards } from "@/components/HomeServicesFolderCards";
import { apiGet } from "@/lib/api";
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

export const dynamic = "force-dynamic";

async function getOtherServicesCards(): Promise<{
  cards: ServiceTreeNode[];
  rootDescription: string | null;
}> {
  try {
    const [pages, foldersPayload] = await Promise.all([
      apiGet<ServiceListItem[]>("/api/pages"),
      apiGet<{ folders?: ServiceFolderMeta[] }>("/api/pages/folders"),
    ]);
    const folders = Array.isArray(foldersPayload?.folders) ? foldersPayload.folders : [];
    const folderMetaBySlug = new Map(folders.map((f) => [normalizeSlug(f.slug), f] as const));
    const rootMeta = folderMetaBySlug.get("other-services");
    const rootDescription = rootMeta?.description?.trim() || null;

    const sourcePages = pages
      .filter((p) => isVisibleServicePage(p) && normalizeSlug(p.slug).startsWith("other-services/"))
      .map((p) => ({ ...p, slug: normalizeSlug(p.slug) }))
      .sort((a, b) => a.title.localeCompare(b.title, "ru"));

    const tree = buildServicesTree(sourcePages, folderMetaBySlug, {
      rootSlug: "other-services",
      rootLabel: "Прочие услуги",
    });
    return { cards: collectServiceCardsForHome(tree), rootDescription };
  } catch {
    return { cards: [], rootDescription: null };
  }
}

export default async function OtherServicesPage() {
  const { cards, rootDescription } = await getOtherServicesCards();
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-7xl px-6 py-8 sm:py-10 lg:px-8">
        <section className="bg-transparent py-0 about-template-fallback">
          <div className="mx-auto mt-0 max-w-3xl text-center">
            <h1 className="about-template-fallback__eyebrow about-template-fallback__eyebrow--tight mb-0 text-base font-semibold text-[#b91c1c]">
              Прочие услуги
            </h1>
            <p className="about-template-fallback__title -mt-1.5 mt-0 text-balance text-pretty sm:-mt-2">
              Дополнительные направления
            </p>
            <p className="mt-6 text-pretty text-sm font-medium text-slate-600 sm:text-base">
              {rootDescription ??
                "Дополнительные услуги и направления работы: описания, практические материалы и полезные рекомендации."}
            </p>
          </div>

          <div className="mt-8 max-w-none">
            <HomeServicesFolderCards
              layout="featured"
              equalHeight
              alwaysShowPreview
              ctaLabel="Подробнее"
              gridClassName="services-home-grid"
              cards={cards.map((node) => folderCardPropsFromServiceNode(node))}
              limit={999}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

