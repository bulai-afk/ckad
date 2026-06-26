import {
  DEFAULT_OG_IMAGE_PATH,
  PUBLIC_SITE_NAME,
  toAbsolutePublicUrl,
} from "@/lib/publicSiteConstants";
import type { SiteSettings } from "@/lib/siteSettingsPublic";
import { resolveContactFields } from "@/lib/siteSettingsPublic";

/**
 * Organization — данные из CMS «Настройки сайта» (`backend/data/siteSettings.json` → API `/api/pages/site-settings`).
 */
export function buildOrganizationJsonLd(
  siteSettings: SiteSettings | null,
  origin: string,
): Record<string, unknown> {
  const contacts = resolveContactFields(siteSettings);
  const logoUrl = toAbsolutePublicUrl(DEFAULT_OG_IMAGE_PATH, origin);
  const sameAs = [
    siteSettings?.social?.vk,
    siteSettings?.social?.telegram,
    siteSettings?.social?.max,
    siteSettings?.social?.whatsapp,
  ]
    .map((url) => (typeof url === "string" ? url.trim() : ""))
    .filter(Boolean);

  const org: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: contacts.reqCompany || PUBLIC_SITE_NAME,
    url: origin,
    logo: logoUrl,
    telephone: contacts.phone,
    email: contacts.email,
  };

  if (contacts.address) {
    org.address = {
      "@type": "PostalAddress",
      streetAddress: contacts.address,
      addressCountry: "RU",
    };
  }

  if (sameAs.length > 0) {
    org.sameAs = sameAs;
  }

  return org;
}
