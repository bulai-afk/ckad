import { HomeServicesFolderCards } from "@/components/HomeServicesFolderCards";
import {
  folderCardPropsFromServiceNode,
  type ServiceTreeNode,
} from "@/lib/serviceTree";

type Props = {
  rootTitle: string;
  rootDescription: string | null;
  descriptionFallback: string;
  cards: ServiceTreeNode[];
  /** Автоперенос и выравнивание по ширине в описаниях карточек. */
  hyphenateDescriptions?: boolean;
};

export function SectionServicesHubView({
  rootTitle,
  rootDescription,
  descriptionFallback,
  cards,
  hyphenateDescriptions = false,
}: Props) {
  return (
    <div
      className={`min-h-screen bg-slate-100 text-slate-900${hyphenateDescriptions ? " section-services-hub-hyphens" : ""}`}
      lang={hyphenateDescriptions ? "ru" : undefined}
    >
      <div className="mx-auto max-w-7xl px-6 py-8 sm:py-10 lg:px-8">
        <section className="bg-transparent py-0 about-template-fallback">
          <div className="mx-auto mt-0 max-w-3xl text-center">
            <p className="about-template-fallback__eyebrow about-template-fallback__eyebrow--tight mb-0 text-base font-semibold text-[#b91c1c]">
              Наши услуги
            </p>
            <h1 className="about-template-fallback__title -mt-1.5 mt-0 text-balance text-pretty sm:-mt-2">
              {rootTitle}
            </h1>
            <p className="mt-6 text-pretty text-base leading-[1.4] font-medium text-slate-600">
              {rootDescription ?? descriptionFallback}
            </p>
          </div>

          <div className="mt-8 max-w-none">
            <HomeServicesFolderCards
              layout="featured"
              featuredPanelVariant="section-hub"
              equalHeight
              alwaysShowPreview
              hyphenateDescriptions={hyphenateDescriptions}
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
