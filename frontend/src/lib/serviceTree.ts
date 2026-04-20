import { sanitizePublicAssetUrl } from "@/lib/publicAssetUrl";

export type ServiceListItem = {
  id: number;
  title: string;
  slug: string;
  status: "DRAFT" | "PUBLISHED" | string;
  description?: string | null;
  preview?: string | null;
  /** Из списка страниц `/api/pages` — блоки SEO в настройках страницы */
  seoTitle?: string | null;
  seoDescription?: string | null;
};

export type ServiceTreeNode = {
  slugPath: string;
  label: string;
  description?: string;
  preview?: string;
  pages: ServiceListItem[];
  children: ServiceTreeNode[];
  /** true when this node exists as a configured folder (even if it contains no pages). */
  isMetaFolder?: boolean;
};

export type ServiceFolderMeta = {
  name: string;
  slug: string;
  description?: string;
  preview?: string;
};

export function normalizeSlug(s: string): string {
  return s
    .trim()
    .replace(/^\/+/u, "")
    .replace(/\/+$/u, "")
    .replace(/\/+/gu, "/")
    .toLowerCase();
}

function humanizeSegment(seg: string): string {
  if (!seg) return seg;
  const t = seg.replace(/-/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function isVisibleServicePage(p: ServiceListItem): boolean {
  if (String(p.status).toUpperCase() === "PUBLISHED") return true;
  return process.env.NODE_ENV === "development";
}

export type BuildServicesTreeOptions = {
  /** Корневой сегмент URL (например `services` или `catalogization`). */
  rootSlug?: string;
  /** Подпись корневого узла в дереве. */
  rootLabel?: string;
};

export function buildServicesTree(
  items: ServiceListItem[],
  folderMetaBySlug: Map<string, ServiceFolderMeta>,
  options?: BuildServicesTreeOptions,
): ServiceTreeNode {
  const rootSlug = (options?.rootSlug ?? "services").trim().toLowerCase();
  const rootLabel = options?.rootLabel?.trim() || "Услуги";

  const root: ServiceTreeNode = {
    slugPath: rootSlug,
    label: rootLabel,
    pages: [],
    children: [],
    isMetaFolder: false,
  };

  const nodeBySlugPath = new Map<string, ServiceTreeNode>([[rootSlug, root]]);

  const ensureNode = (slugPath: string, segment: string): ServiceTreeNode => {
    const existing = nodeBySlugPath.get(slugPath);
    if (existing) return existing;

    const parentPath = slugPath.split("/").filter(Boolean).slice(0, -1).join("/");
    const parent =
      parentPath && nodeBySlugPath.get(parentPath) ? nodeBySlugPath.get(parentPath)! : root;

    const meta = folderMetaBySlug.get(slugPath);
    const node: ServiceTreeNode = {
      slugPath,
      label: meta?.name?.trim() || humanizeSegment(segment),
      description: meta?.description?.trim() || "",
      preview: meta?.preview?.trim() || "",
      pages: [],
      children: [],
      isMetaFolder: Boolean(meta),
    };

    parent.children.push(node);
    nodeBySlugPath.set(slugPath, node);
    return node;
  };

  for (const [metaSlug, meta] of folderMetaBySlug.entries()) {
    const slug = normalizeSlug(metaSlug);
    if (!slug.startsWith(`${rootSlug}/`)) continue;
    const parts = slug.split("/").filter(Boolean);
    if (parts.length < 2) continue;

    for (let i = 1; i < parts.length; i += 1) {
      const prefix = parts.slice(0, i + 1).join("/");
      ensureNode(prefix, parts[i]);
    }

    const leaf = nodeBySlugPath.get(slug);
    if (leaf) {
      leaf.label = meta?.name?.trim() || leaf.label;
      leaf.description = meta?.description?.trim() || "";
      leaf.preview = meta?.preview?.trim() || "";
      leaf.isMetaFolder = true;
    }
  }

  for (const item of items) {
    const slug = normalizeSlug(item.slug);
    if (!slug.startsWith(`${rootSlug}/`)) continue;
    const parts = slug.split("/").filter(Boolean);
    if (parts.length < 2) continue;

    const folderPath = parts.slice(0, -1).join("/");
    const leafSegment = parts[parts.length - 2] ?? "";

    if (folderPath === rootSlug) {
      root.pages.push({ ...item, slug });
      continue;
    }

    const folderNode = nodeBySlugPath.get(folderPath) ?? ensureNode(folderPath, leafSegment);
    folderNode.pages.push({ ...item, slug });
  }

  /** Все страницы в этой папке и во вложенных (для сортировки «сначала разделы с большим объёмом»). */
  function countPagesInSubtree(node: ServiceTreeNode): number {
    let c = node.pages.length;
    for (const ch of node.children) {
      c += countPagesInSubtree(ch);
    }
    return c;
  }

  const sortNode = (n: ServiceTreeNode) => {
    n.pages.sort((a, b) => a.title.localeCompare(b.title, "ru"));
    n.children.sort((a, b) => {
      const da = countPagesInSubtree(a);
      const db = countPagesInSubtree(b);
      if (db !== da) return db - da;
      return a.label.localeCompare(b.label, "ru");
    });
    n.children.forEach(sortNode);
  };
  sortNode(root);

  return root;
}

/** Найти узел по полному пути вида `services/foo/bar` */
export function findServiceTreeNode(root: ServiceTreeNode, slugPath: string): ServiceTreeNode | null {
  const target = normalizeSlug(slugPath);
  function walk(n: ServiceTreeNode): ServiceTreeNode | null {
    if (normalizeSlug(n.slugPath) === target) return n;
    for (const c of n.children) {
      const found = walk(c);
      if (found) return found;
    }
    return null;
  }
  return walk(root);
}

/** Все папки услуг с контентом или из настроек (обход в глубину, как на главной). */
export function collectServiceCards(node: ServiceTreeNode, out: ServiceTreeNode[]): void {
  for (const child of node.children) {
    if (child.pages.length > 0 || child.isMetaFolder) out.push(child);
    collectServiceCards(child, out);
  }
}

/**
 * Карточки для главной: вложенные папки (как collectServiceCards) плюс страницы, лежащие прямо на корне
 * (`catalogization/foo` в root.pages), чтобы совпадало с вкладкой «Каталогизация» в админке.
 */
export function collectServiceCardsForHome(root: ServiceTreeNode): ServiceTreeNode[] {
  const out: ServiceTreeNode[] = [];
  const seen = new Set<string>();

  for (const p of root.pages) {
    const slug = normalizeSlug(p.slug);
    const node: ServiceTreeNode = {
      slugPath: slug,
      label: p.title?.trim() || slug,
      description: (p.description ?? "").trim(),
      preview: "",
      pages: [{ ...p, slug }],
      children: [],
      isMetaFolder: false,
    };
    out.push(node);
    seen.add(slug);
  }

  const nested: ServiceTreeNode[] = [];
  collectServiceCards(root, nested);
  for (const n of nested) {
    if (seen.has(n.slugPath)) continue;
    seen.add(n.slugPath);
    out.push(n);
  }

  out.sort((a, b) => {
    const ta =
      a.pages[0]?.title?.trim() || a.pages[0]?.seoTitle?.trim() || a.label;
    const tb =
      b.pages[0]?.title?.trim() || b.pages[0]?.seoTitle?.trim() || b.label;
    return ta.localeCompare(tb, "ru");
  });
  return out;
}

export type ServiceFolderCardProps = {
  slugPath: string;
  label: string;
  description?: string;
  preview?: string;
};

/**
 * Поля для карточки раздела на главной и в /services:
 * **Название и описание** — из данных страницы в `/api/pages` (заголовок, краткое описание / summary,
 * при пустом описании — `seoDescription` из настроек страницы).
 * Превью фона — только из настроек папки в `/api/pages/folders`, если папка заведена (`isMetaFolder`)
 * и задано превью; иначе лого (см. HomeServicesFolderCards).
 */
export function folderCardPropsFromServiceNode(node: ServiceTreeNode): ServiceFolderCardProps {
  const first = node.pages[0];
  const folderPreview = node.preview?.trim() ?? "";
  const pageTitle =
    first?.title?.trim() || first?.seoTitle?.trim() || "";
  const pageDesc = first?.description?.trim() ?? "";
  const pageSeoDesc = first?.seoDescription?.trim() ?? "";

  const description = (pageDesc || pageSeoDesc) || undefined;
  const fromSettings =
    node.isMetaFolder === true ? sanitizePublicAssetUrl(folderPreview) : "";
  const preview = fromSettings || undefined;

  const label = pageTitle || node.label?.trim() || node.slugPath;

  return {
    slugPath: node.slugPath,
    label,
    description,
    preview,
  };
}
