import { SectionServicesHubView } from "@/components/SectionServicesHubView";
import { HubSectionJsonLd } from "@/components/HubSectionJsonLd";
import { generateHubFolderMetadata } from "@/lib/hubFolderMetadata";
import { getSectionServicesHubData } from "@/lib/sectionServicesHubData";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return generateHubFolderMetadata("training-center", "Учебный центр");
}

const DESCRIPTION_FALLBACK =
  "Обучение специалистов и руководителей: правила каталогизации, работа с номенклатурой в ГОЗ и практические разборы по нормативной базе.";

export default async function TrainingCenterSectionPage() {
  const data = await getSectionServicesHubData({
    rootSlug: "training-center",
    defaultRootTitle: "Учебный центр",
    treeRootLabel: "Учебный центр",
  });
  return (
    <>
      <HubSectionJsonLd slug="training-center" title={data.rootTitle} />
      <SectionServicesHubView
      rootTitle={data.rootTitle}
      rootDescription={data.rootDescription}
      descriptionFallback={DESCRIPTION_FALLBACK}
      cards={data.cards}
    />
    </>
  );
}
