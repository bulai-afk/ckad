import { apiBaseUrl } from "@/lib/apiBaseUrl";
import { apiGet } from "@/lib/api";
import {
  buildServicesTree,
  findServiceTreeNode,
  isVisibleServicePage,
  normalizeSlug,
  type ServiceFolderMeta,
  type ServiceListItem,
  type ServiceTreeNode,
} from "@/lib/serviceTree";
import {
  PageSlugClient,
  type PageData,
} from "@/components/PageSlugClient";

type RouteParams = { slug?: string[] | string };
type PageProps = { params: RouteParams | Promise<RouteParams> };

function normalizeSlugParts(raw: RouteParams["slug"]): string[] {
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === "string") return raw.split("/").filter(Boolean);
  return [];
}

async function resolvePageBySlug(slugParts: string[]): Promise<PageData | null> {
  if (slugParts.length === 0) return null;
  const path = slugParts.map((s) => encodeURIComponent(s)).join("/");
  const base = apiBaseUrl();
  try {
    const res = await fetch(`${base}/api/pages/slug/${path}`, {
      cache: "force-cache",
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return (await res.json()) as PageData;
  } catch {
    return null;
  }
}

async function resolveServiceFolderHub(slugParts: string[]): Promise<ServiceTreeNode | null> {
  if (slugParts[0] !== "services" || slugParts.length < 2) return null;
  const path = slugParts.join("/");
  try {
    const [pages, foldersPayload] = await Promise.all([
      apiGet<ServiceListItem[]>("/api/pages", 20_000),
      apiGet<{ folders?: ServiceFolderMeta[] }>("/api/pages/folders", 20_000),
    ]);
    const folders = Array.isArray(foldersPayload?.folders) ? foldersPayload.folders : [];
    const folderMetaBySlug = new Map(
      folders
        .filter((f) => typeof f?.name === "string" && typeof f?.slug === "string")
        .map((f) => ({
          name: String(f.name || "").trim(),
          slug: normalizeSlug(String(f.slug || "")),
          description: typeof f.description === "string" ? f.description : "",
          preview: typeof f.preview === "string" ? f.preview : "",
        }))
        .filter((f) => f.slug === "services" || f.slug.startsWith("services/"))
        .map((f) => [f.slug, f] as const),
    );
    const servicePages = pages
      .filter((p) => isVisibleServicePage(p) && normalizeSlug(p.slug).startsWith("services/"))
      .map((p) => ({ ...p, slug: normalizeSlug(p.slug) }));
    const tree = buildServicesTree(servicePages, folderMetaBySlug);
    const node = findServiceTreeNode(tree, path);
    if (!node) return null;
    return node.isMetaFolder || node.pages.length > 0 || node.children.length > 0 ? node : null;
  } catch {
    return null;
  }
}

export default async function Page({ params }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const slugParts = normalizeSlugParts(resolvedParams.slug);
  const page = await resolvePageBySlug(slugParts);
  const serviceFolderHub = page ? null : await resolveServiceFolderHub(slugParts);

  return (
    <PageSlugClient
      slugParts={slugParts}
      page={page}
      serviceFolderHub={serviceFolderHub}
    />
  );
}
