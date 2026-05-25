import { SectionServicesHubView } from "@/components/SectionServicesHubView";
import { getSectionServicesHubData } from "@/lib/sectionServicesHubData";

export const dynamic = "force-dynamic";

const DESCRIPTION_FALLBACK =
  "Дополнительные услуги и направления работы: описания, практические материалы и полезные рекомендации.";

export default async function OtherServicesPage() {
  const data = await getSectionServicesHubData({
    rootSlug: "other-services",
    defaultRootTitle: "Прочие услуги",
    treeRootLabel: "Прочие услуги",
  });
  return (
    <SectionServicesHubView
      rootTitle={data.rootTitle}
      rootDescription={data.rootDescription}
      descriptionFallback={DESCRIPTION_FALLBACK}
      cards={data.cards}
      hyphenateDescriptions
    />
  );
}
