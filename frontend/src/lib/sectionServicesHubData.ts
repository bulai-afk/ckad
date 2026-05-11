import { apiGet } from "@/lib/api";
import {
  buildServicesTree,
  collectServiceCardsForHome,
  isVisibleServicePage,
  normalizeSlug,
  type ServiceFolderMeta,
  type ServiceListItem,
  type ServiceTreeNode,
} from "@/lib/serviceTree";
import {
  normalizePageDisplayOrderMap,
  sortBySectionDisplayOrder,
} from "@/lib/pageDisplayOrder";

export type SectionServicesHubData = {
  cards: ServiceTreeNode[];
  rootTitle: string;
  rootDescription: string | null;
};

export async function getSectionServicesHubData(options: {
  rootSlug: string;
  defaultRootTitle: string;
  treeRootLabel: string;
}): Promise<SectionServicesHubData> {
  const { rootSlug, defaultRootTitle, treeRootLabel } = options;
  const root = normalizeSlug(rootSlug);

  try {
    const [pages, foldersPayload] = await Promise.all([
      apiGet<ServiceListItem[]>("/api/pages"),
      apiGet<{ folders?: ServiceFolderMeta[] }>("/api/pages/folders"),
    ]);
    let orderBySection = {};
    try {
      const displayOrderPayload = await apiGet<{ orderBySection?: unknown }>(
        "/api/pages/display-order",
      );
      orderBySection = normalizePageDisplayOrderMap(displayOrderPayload?.orderBySection);
    } catch {
      orderBySection = {};
    }
    const folders = Array.isArray(foldersPayload?.folders) ? foldersPayload.folders : [];
    const folderMetaBySlug = new Map<string, ServiceFolderMeta>();
    for (const f of folders) {
      if (!f?.slug) continue;
      const key = normalizeSlug(f.slug);
      if (!key) continue;
      folderMetaBySlug.set(key, f);
    }
    const rootMeta = folderMetaBySlug.get(root);
    const rootTitle = rootMeta?.name?.trim() || defaultRootTitle;
    const rootDescription = rootMeta?.description?.trim() || null;

    const prefix = `${root}/`;
    const sourcePages = pages
      .filter((p) => isVisibleServicePage(p) && normalizeSlug(p.slug).startsWith(prefix))
      .map((p) => ({ ...p, slug: normalizeSlug(p.slug) }));
    const sourceOrderIndex = new Map<string, number>(
      sourcePages.map((p, idx) => [normalizeSlug(p.slug), idx] as const),
    );

    const tree = buildServicesTree(sourcePages, folderMetaBySlug, {
      rootSlug: root,
      rootLabel: treeRootLabel,
    });
    const sortedCards = sortBySectionDisplayOrder(
      collectServiceCardsForHome(tree),
      root,
      (node) => normalizeSlug(node.slugPath),
      orderBySection,
      (a, b) => {
        const ar = sourceOrderIndex.get(normalizeSlug(a.slugPath));
        const br = sourceOrderIndex.get(normalizeSlug(b.slugPath));
        if (ar !== undefined && br !== undefined) return ar - br;
        if (ar !== undefined) return -1;
        if (br !== undefined) return 1;
        const ta = a.pages[0]?.title?.trim() || a.label;
        const tb = b.pages[0]?.title?.trim() || b.label;
        return ta.localeCompare(tb, "ru");
      },
    );
    return { cards: sortedCards, rootTitle, rootDescription };
  } catch {
    return { cards: [], rootTitle: defaultRootTitle, rootDescription: null };
  }
}
