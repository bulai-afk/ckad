import { normalizeSlug } from "@/lib/serviceTree";

/** Подписи корневых разделов по умолчанию (если в настройках раздела имя не задано). */
export const DEFAULT_ROOT_SECTION_LABELS: Record<string, string> = {
  catalogization: "Каталогизация",
  "training-center": "Учебный центр",
  "other-services": "Прочие услуги",
  articles: "Новости",
  services: "Услуги",
  about: "О компании",
};

export type RootSectionFolderLike = { slug: string; name?: string | null };

function rootSlugKey(slug: string): string {
  return normalizeSlug(slug).split("/")[0] || "";
}

/** Название корневого раздела из модалки «Настройки раздела» с запасным вариантом. */
export function resolveRootSectionLabel(
  rootSlug: string,
  folders?: Iterable<RootSectionFolderLike> | null,
  explicitFallback?: string,
): string {
  const key = rootSlugKey(rootSlug);
  if (!key) return explicitFallback?.trim() || "";

  if (folders) {
    for (const folder of folders) {
      if (rootSlugKey(folder.slug) === key) {
        const name = typeof folder.name === "string" ? folder.name.trim() : "";
        if (name) return name;
      }
      if (normalizeSlug(folder.slug) === key) {
        const name = typeof folder.name === "string" ? folder.name.trim() : "";
        if (name) return name;
      }
    }
  }

  const fallback = explicitFallback?.trim();
  if (fallback) return fallback;
  return DEFAULT_ROOT_SECTION_LABELS[key] || "";
}

export function buildRootSectionLabelMap(
  folders: Iterable<RootSectionFolderLike>,
): Record<string, string> {
  const map: Record<string, string> = { ...DEFAULT_ROOT_SECTION_LABELS };
  for (const folder of folders) {
    const key = rootSlugKey(folder.slug);
    const name = typeof folder.name === "string" ? folder.name.trim() : "";
    if (key && name) map[key] = name;
  }
  return map;
}
