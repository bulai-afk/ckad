import { sanitizePublicAssetUrl } from "@/lib/publicAssetUrl";

export type ServiceListItem = {
  id: number;
  title: string;
  slug: string;
  status: "DRAFT" | "PUBLISHED" | string;
  description?: string | null;
  preview?: string | null;
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

export function buildServicesTree(
  items: ServiceListItem[],
  folderMetaBySlug: Map<string, ServiceFolderMeta>,
): ServiceTreeNode {
  const root: ServiceTreeNode = {
    slugPath: "services",
    label: "Услуги",
    pages: [],
    children: [],
    isMetaFolder: false,
  };

  const nodeBySlugPath = new Map<string, ServiceTreeNode>([["services", root]]);

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
    if (!slug.startsWith("services/")) continue;
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
    if (!slug.startsWith("services/")) continue;
    const parts = slug.split("/").filter(Boolean);
    if (parts.length < 2) continue;

    const folderPath = parts.slice(0, -1).join("/");
    const leafSegment = parts[parts.length - 2] ?? "";

    if (folderPath === "services") {
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

export type ServiceFolderCardProps = {
  slugPath: string;
  label: string;
  description?: string;
  preview?: string;
};

/**
 * Поля для карточки раздела на главной и в /services:
 * приоритет — метаданные папки из `/api/pages/folders` (файл `folders.json` на бэкенде);
 * если описание папки пусто — подставляем описание страницы раздела.
 *
 * Превью фона — **только** если папка явно заведена в настройках (`isMetaFolder`) и в поле превью
 * непустое значение после санитизации. Иначе лого (см. HomeServicesFolderCards).
 * Узлы только из страниц без записи в folders — никогда не получают «чужое» превью в поле `node.preview`.
 */
export function folderCardPropsFromServiceNode(node: ServiceTreeNode): ServiceFolderCardProps {
  const first = node.pages[0];
  const folderDesc = node.description?.trim() ?? "";
  const folderPreview = node.preview?.trim() ?? "";
  const pageDesc = first?.description?.trim() ?? "";

  const description = (folderDesc || pageDesc) || undefined;
  const fromSettings =
    node.isMetaFolder === true ? sanitizePublicAssetUrl(folderPreview) : "";
  const preview = fromSettings || undefined;

  let label: string;
  if (node.isMetaFolder) {
    label = node.label?.trim() || node.slugPath;
  } else if (node.pages.length === 1 && first?.title?.trim()) {
    label = first.title.trim();
  } else {
    label = node.label?.trim() || node.slugPath;
  }

  return {
    slugPath: node.slugPath,
    label,
    description,
    preview,
  };
}
