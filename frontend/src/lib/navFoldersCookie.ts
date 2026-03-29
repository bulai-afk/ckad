/** Cookie для папок в навбаре: SSR и клиент получают один состав после загрузки из API */

export const NAV_FOLDERS_COOKIE_NAME = "ckad_nav_folders_v1";

export type FolderNavItem = { href: string; label: string };

type StoredFolder = { name: string; slug: string; showInNavbar?: boolean };

/** Для document.cookie (encodeURIComponent) */
export function serializeNavFoldersCookie(folders: StoredFolder[]): string {
  const minimal = folders
    .filter((f) => Boolean(f.showInNavbar) && typeof f.slug === "string" && typeof f.name === "string")
    .map((f) => ({ name: f.name, slug: f.slug }));
  return encodeURIComponent(JSON.stringify(minimal));
}

function parseNavFoldersJson(json: string): FolderNavItem[] {
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) return [];
    const items = parsed
      .filter((f): f is { name: string; slug: string } => {
        if (typeof f !== "object" || f === null) return false;
        const o = f as Record<string, unknown>;
        return typeof o.name === "string" && typeof o.slug === "string";
      })
      .map((f) => ({ href: `/${f.slug}`, label: f.name }));
    const seen = new Set<string>();
    return items.filter((item) => {
      const k = item.href.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  } catch {
    return [];
  }
}

/** Значение из cookies().get(...).value или из document (может быть с encodeURIComponent) */
export function parseNavFoldersCookie(cookieValue: string | undefined): FolderNavItem[] {
  if (!cookieValue?.trim()) return [];
  const direct = parseNavFoldersJson(cookieValue);
  if (direct.length > 0 || cookieValue.trim().startsWith("[")) return direct;
  try {
    return parseNavFoldersJson(decodeURIComponent(cookieValue));
  } catch {
    return [];
  }
}
