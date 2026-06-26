import { SectionServicesHubView } from "@/components/SectionServicesHubView";
import { HubSectionJsonLd } from "@/components/HubSectionJsonLd";
import { generateHubFolderMetadata } from "@/lib/hubFolderMetadata";
import { getSectionServicesHubData } from "@/lib/sectionServicesHubData";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return generateHubFolderMetadata("catalogization", "Каталогизация");
}

const DESCRIPTION_FALLBACK =
  "Каталогизация предметов снабжения: номенклатура, карточки, согласования с контрольными органами и сопровождение на всех этапах.";

export default async function CatalogizationSectionPage() {
  const data = await getSectionServicesHubData({
    rootSlug: "catalogization",
    defaultRootTitle: "Каталогизация",
    treeRootLabel: "Каталогизация",
  });
  return (
    <>
      <HubSectionJsonLd slug="catalogization" title={data.rootTitle} />
      <SectionServicesHubView
      rootTitle={data.rootTitle}
      rootDescription={data.rootDescription}
      descriptionFallback={DESCRIPTION_FALLBACK}
      cards={data.cards}
    />
    </>
  );
}
