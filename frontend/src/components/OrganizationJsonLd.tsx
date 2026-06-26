import { JsonLd } from "@/components/JsonLd";
import { getPublicSiteOrigin } from "@/lib/hubFolderMetadata";
import { buildOrganizationJsonLd } from "@/lib/jsonLd/organization";
import type { SiteSettings } from "@/lib/siteSettingsPublic";

type Props = {
  siteSettings: SiteSettings | null;
};

/** Шаг 1: Organization на всех публичных страницах. Данные — `/api/pages/site-settings`. */
export async function OrganizationJsonLd({ siteSettings }: Props) {
  const origin = await getPublicSiteOrigin();
  return <JsonLd data={buildOrganizationJsonLd(siteSettings, origin)} />;
}
