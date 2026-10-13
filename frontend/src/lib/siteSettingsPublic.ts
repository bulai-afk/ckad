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

export type LayoutSiteSettings = Pick<
  SiteSettings,
  "email" | "phone" | "address" | "social" | "requisites"
> & {
  topRibbonMessages?: string[];
  documents?: { name: string; html: string }[];
};

/** Контакты и имена документов без фото/Word-HTML — для шапки и подвала на всех страницах. */
export function slimLayoutSiteSettings(settings: unknown): LayoutSiteSettings | null {
  if (!settings || typeof settings !== "object") return null;
  const s = settings as Record<string, unknown>;
  const social = (s.social ?? {}) as SiteSettings["social"];
  const requisites = (s.requisites ?? {}) as SiteSettings["requisites"];
  const documents = Array.isArray(s.documents)
    ? s.documents
        .map((row) => {
          if (!row || typeof row !== "object") return null;
          const name = String((row as { name?: unknown }).name ?? "").trim();
          if (!name) return null;
          return { name, html: "" };
        })
        .filter((row): row is { name: string; html: string } => row !== null)
        .slice(0, 3)
    : [];
  return {
    email: typeof s.email === "string" ? s.email : "",
    phone: typeof s.phone === "string" ? s.phone : "",
    address: typeof s.address === "string" ? s.address : "",
    social: {
      vk: typeof social.vk === "string" ? social.vk : "",
      telegram: typeof social.telegram === "string" ? social.telegram : "",
      max: typeof social.max === "string" ? social.max : "",
      whatsapp: typeof social.whatsapp === "string" ? social.whatsapp : "",
    },
    requisites: {
      companyName: typeof requisites.companyName === "string" ? requisites.companyName : "",
      inn: typeof requisites.inn === "string" ? requisites.inn : "",
      kpp: typeof requisites.kpp === "string" ? requisites.kpp : "",
      ogrn: typeof requisites.ogrn === "string" ? requisites.ogrn : "",
    },
    topRibbonMessages: Array.isArray(s.topRibbonMessages)
      ? s.topRibbonMessages.filter((item): item is string => typeof item === "string")
      : [],
    documents,
  };
}

export async function fetchPublicSiteSettings(): Promise<SiteSettings | null> {
  const base = apiBaseUrl();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(`${base}/api/pages/site-settings`, {
      cache: "force-cache",
      next: { revalidate: 120 },
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
