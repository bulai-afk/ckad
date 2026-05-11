import { SectionServicesHubView } from "@/components/SectionServicesHubView";
import { getSectionServicesHubData } from "@/lib/sectionServicesHubData";

export const dynamic = "force-dynamic";

const DESCRIPTION_FALLBACK =
  "Обучение специалистов и руководителей: правила каталогизации, работа с номенклатурой в ГОЗ и практические разборы по нормативной базе.";

export default async function TrainingCenterSectionPage() {
  const data = await getSectionServicesHubData({
    rootSlug: "training-center",
    defaultRootTitle: "Учебный центр",
    treeRootLabel: "Учебный центр",
  });
  return (
    <SectionServicesHubView
      rootTitle={data.rootTitle}
      rootDescription={data.rootDescription}
      descriptionFallback={DESCRIPTION_FALLBACK}
      cards={data.cards}
    />
  );
}
