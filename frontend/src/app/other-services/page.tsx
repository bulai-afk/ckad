import { SectionServicesHubView } from "@/components/SectionServicesHubView";
import { HubSectionJsonLd } from "@/components/HubSectionJsonLd";
import { generateHubFolderMetadata } from "@/lib/hubFolderMetadata";
import { getSectionServicesHubData } from "@/lib/sectionServicesHubData";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return generateHubFolderMetadata("other-services", "Прочие услуги");
}

const DESCRIPTION_FALLBACK =
  "Дополнительные услуги и направления работы: описания, практические материалы и полезные рекомендации.";

export default async function OtherServicesPage() {
  const data = await getSectionServicesHubData({
    rootSlug: "other-services",
    defaultRootTitle: "Прочие услуги",
    treeRootLabel: "Прочие услуги",
  });
  return (
    <>
      <HubSectionJsonLd slug="other-services" title={data.rootTitle} />
      <SectionServicesHubView
      rootTitle={data.rootTitle}
      rootDescription={data.rootDescription}
      descriptionFallback={DESCRIPTION_FALLBACK}
      cards={data.cards}
      hyphenateDescriptions
    />
    </>
  );
}
