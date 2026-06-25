import { apiBaseUrl } from "@/lib/apiBaseUrl";
import {
  buildMailtoHref,
  buildTelHref,
  normalizeSocialLinksForMetrika,
} from "@/lib/yandexMetrikaAutoGoals";

export type SiteSettings = {
  email: string;
  phone: string;
  address: string;
  social: {
    vk: string;
    telegram: string;
    max: string;
    whatsapp: string;
  };
  requisites: {
    companyName: string;
    inn: string;
    kpp: string;
    ogrn: string;
  };
  director?: {
    name: string;
    role: string;
    message: string;
    photo: string | null;
  };
  teamMembers?: {
    name: string;
    role: string;
    photo: string | null;
  }[];
};

export type ResolvedDirector = {
  name: string;
  role: string;
  message: string;
  photo: string | null;
};

export type ResolvedContactFields = {
  phone: string;
  phoneHref: string;
  email: string;
  address: string;
  reqCompany: string;
  reqInn: string;
  reqKpp: string;
  reqOgrn: string;
  director: ResolvedDirector;
  social: SiteSettings["social"];
};

export const DEFAULT_DIRECTOR: ResolvedDirector = {
  name: "Руководитель ЦКиАД",
  role: "Директор",
  message:
    "Мы строим решения, которые можно применять в ежедневной работе. Благодарю вас за доверие и интерес к нашим проектам.",
  photo: null,
};

export async function fetchPublicSiteSettings(): Promise<SiteSettings | null> {
  const base = apiBaseUrl();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(`${base}/api/pages/site-settings`, {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { settings?: SiteSettings };
    return data?.settings ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function resolveDirector(siteSettings: SiteSettings | null): ResolvedDirector {
  const legacyTeamMembers = Array.isArray(siteSettings?.teamMembers)
    ? siteSettings.teamMembers
        .filter((item): item is { name: string; role: string; photo: string | null } => {
          return (
            !!item &&
            typeof item.name === "string" &&
            typeof item.role === "string" &&
            (typeof item.photo === "string" || item.photo === null)
          );
        })
        .map((item) => ({
          name: item.name.trim(),
          role: item.role.trim(),
          photo: typeof item.photo === "string" && item.photo.trim() ? item.photo : null,
        }))
        .filter((item) => item.name || item.role)
    : [];

  const raw = siteSettings?.director;
  if (
    raw &&
    typeof raw.name === "string" &&
    typeof raw.role === "string" &&
    typeof raw.message === "string" &&
    (typeof raw.photo === "string" || raw.photo === null)
  ) {
    const name = raw.name.trim();
    const role = raw.role.trim();
    const message = raw.message.trim();
    const photo = typeof raw.photo === "string" && raw.photo.trim() ? raw.photo : null;
    if (name || role || message || photo) {
      return {
        name: name || DEFAULT_DIRECTOR.name,
        role: role || DEFAULT_DIRECTOR.role,
        message: message || DEFAULT_DIRECTOR.message,
        photo,
      };
    }
  }

  const legacy = legacyTeamMembers[0];
  if (legacy) {
    return {
      name: legacy.name || DEFAULT_DIRECTOR.name,
      role: legacy.role || DEFAULT_DIRECTOR.role,
      message: DEFAULT_DIRECTOR.message,
      photo: legacy.photo,
    };
  }

  return DEFAULT_DIRECTOR;
}

export function resolveContactFields(siteSettings: SiteSettings | null): ResolvedContactFields {
  const phone = (siteSettings?.phone || "").trim() || "+7 (495) 123-45-67";
  const phoneHref = buildTelHref(siteSettings?.phone || "");
  const email = (siteSettings?.email || "").trim() || "info@центр-каталогизации.рф";

  return {
    phone,
    phoneHref,
    email,
    address: (siteSettings?.address || "").trim() || "г. Москва, ул. Примерная, д. 15, офис 304",
    reqCompany:
      (siteSettings?.requisites?.companyName || "").trim() ||
      "ООО «Центр каталогизации и анализа данных»",
    reqInn: (siteSettings?.requisites?.inn || "").trim() || "0000000000",
    reqKpp: (siteSettings?.requisites?.kpp || "").trim() || "000000000",
    reqOgrn: (siteSettings?.requisites?.ogrn || "").trim() || "0000000000000",
    director: resolveDirector(siteSettings),
    social: normalizeSocialLinksForMetrika(siteSettings?.social),
  };
}

export { buildMailtoHref, buildTelHref };
