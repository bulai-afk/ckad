import { apiGet } from "@/lib/api";
import Link from "next/link";
import { CheckCircleIcon, ChevronRightIcon, HomeIcon } from "@heroicons/react/20/solid";

type ServiceListItem = {
  id: number;
  title: string;
  slug: string;
  status: "DRAFT" | "PUBLISHED" | string;
  description?: string | null;
  preview?: string | null;
};

type ServiceTreeNode = {
  slugPath: string;
  label: string;
  description?: string;
  preview?: string;
  pages: ServiceListItem[];
  children: ServiceTreeNode[];
  /** true when this node exists as a configured folder (even if it contains no pages). */
  isMetaFolder?: boolean;
};

type ServiceFolderMeta = {
  name: string;
  slug: string;
  description?: string;
  preview?: string;
};

function normalizeSlug(s: string): string {
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

function isVisibleServicePage(p: ServiceListItem): boolean {
  if (String(p.status).toUpperCase() === "PUBLISHED") return true;
  return process.env.NODE_ENV === "development";
}

function buildServicesTree(
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
      parentPath && nodeBySlugPath.get(parentPath)
        ? nodeBySlugPath.get(parentPath)!
        : root;

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

  // 1) Build folder nodes from backend settings (even when there are no pages).
  for (const [metaSlug, meta] of folderMetaBySlug.entries()) {
    const slug = normalizeSlug(metaSlug);
    if (!slug.startsWith("services/")) continue;
    const parts = slug.split("/").filter(Boolean); // ["services", ...]
    if (parts.length < 2) continue;

    for (let i = 1; i < parts.length; i += 1) {
      const prefix = parts.slice(0, i + 1).join("/");
      ensureNode(prefix, parts[i]);
    }

    // Ensure the leaf node has meta fields (label/description/preview/isMetaFolder).
    const leaf = nodeBySlugPath.get(slug);
    if (leaf) {
      leaf.label = meta?.name?.trim() || leaf.label;
      leaf.description = meta?.description?.trim() || "";
      leaf.preview = meta?.preview?.trim() || "";
      leaf.isMetaFolder = true;
    }
  }

  // 2) Attach pages from DB to the closest folder parent (all segments except the last).
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

  const sortNode = (node: ServiceTreeNode) => {
    node.pages.sort((a, b) => a.title.localeCompare(b.title, "ru"));
    node.children.sort((a, b) => a.label.localeCompare(b.label, "ru"));
    node.children.forEach(sortNode);
  };
  sortNode(root);

  return root;
}

function ServicesTreeView({ node, depth = 0 }: { node: ServiceTreeNode; depth?: number }) {
  const hasContent = node.pages.length > 0 || node.children.length > 0 || Boolean(node.isMetaFolder);
  if (!hasContent) return null;

  return (
    <div className={depth === 0 ? "space-y-3" : "space-y-2"}>
      {depth > 0 ? (
        <div className="relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="relative p-6 sm:p-8">
            <div className="service-row-grid items-stretch">
              <div className="min-w-0">
                <div className="aspect-square w-full overflow-hidden rounded-2xl bg-slate-50 ring-1 ring-slate-200">
                  {node.preview?.trim() ? (
                    <img
                      src={node.preview}
                      alt={node.label}
                      className="h-full w-full object-contain p-3"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-center text-[12px] font-semibold text-slate-400">
                      Нет изображения
                    </div>
                  )}
                </div>
              </div>

              <div className="min-w-0 flex-1 pr-4 lg:pr-10">
                <h2 className="text-balance text-[22px] font-black leading-[1.15] tracking-tight text-[#496db3]">
                  {node.label}
                </h2>
                {node.description?.trim() ? (
                  <p className="mt-3 max-w-none text-[14px] font-semibold leading-[1.65] text-[#496db3] whitespace-pre-wrap">
                    {node.description}
                  </p>
                ) : null}

                {node.pages.length > 0 ? (
                  <>
                    <p className="mt-5 text-[12px] font-semibold leading-snug text-[#496db3]/70">
                      Выберите ниже интересующую вас услугу.
                    </p>
                    <ul
                      role="list"
                      className="mt-3 grid grid-cols-1 gap-x-10 gap-y-3 text-[14px] font-semibold leading-[1.4] text-[#496db3] sm:grid-cols-2"
                    >
                      {node.pages.map((page) => (
                        <li key={page.id} className="flex items-start gap-3">
                          <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#496db3]" />
                          <Link href={`/${page.slug}`} className="min-w-0 flex-1 transition-colors hover:text-[#e53935]">
                            {page.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[13px] font-semibold text-slate-500">
                    Скоро добавим услуги в этот раздел.
                  </div>
                )}

                {null}
              </div>
            </div>
          </div>

          <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 hidden w-[50rem] translate-x-1/3 opacity-60 blur-3xl sm:block">
            <div
              style={{
                clipPath:
                  "polygon(73.6% 51.7%, 91.7% 11.8%, 100% 46.4%, 97.4% 82.2%, 92.5% 84.9%, 75.7% 64%, 55.3% 47.5%, 46.5% 49.4%, 45% 62.9%, 50.3% 87.2%, 21.3% 64.1%, 0.1% 100%, 5.4% 51.1%, 21.4% 63.9%, 58.9% 0.2%, 73.6% 51.7%)",
              }}
              className="aspect-[1155/678] w-full bg-gradient-to-tr from-sky-300/30 to-indigo-300/20"
            />
          </div>
        </div>
      ) : (
        node.pages.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {node.pages.map((page) => {
              return (
                <div
                  key={page.id}
                  className="p-3"
                >
                  <Link
                    href={`/${page.slug}`}
                    className="flex items-center justify-between gap-3 transition hover:text-[#496db3]"
                  >
                    {page.preview?.trim() ? (
                      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-md bg-white">
                        <img
                          src={page.preview}
                          alt={page.title}
                          className="h-full w-full object-contain"
                        />
                      </div>
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <p className="min-h-0 flex-1 text-balance font-semibold text-[#496db3]" style={{ fontSize: "105%", lineHeight: 1.25 }}>
                        {page.title}
                      </p>
                      {page.description?.trim() ? (
                        <p className="mt-1 line-clamp-2 text-[10px] font-semibold leading-[1.25] text-[#496db3]">
                          {page.description}
                        </p>
                      ) : null}
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )
      )}

      {node.children.length > 0 ? (
        <div className={depth === 0 ? "space-y-4" : "pl-3 space-y-3"}>
          {node.children.map((child) => (
            <ServicesTreeView key={child.slugPath} node={child} depth={depth + 1} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

async function getServices(): Promise<ServiceListItem[]> {
  try {
    const pages = await apiGet<ServiceListItem[]>("/api/pages");
    return pages
      .filter((p) => isVisibleServicePage(p) && normalizeSlug(p.slug).startsWith("services/"))
      .map((p) => ({ ...p, slug: normalizeSlug(p.slug) }))
      .sort((a, b) => a.title.localeCompare(b.title, "ru"));
  } catch {
    return [];
  }
}

async function getServiceFolders(): Promise<ServiceFolderMeta[]> {
  try {
    const data = await apiGet<{ folders?: ServiceFolderMeta[] }>("/api/pages/folders");
    const folders = Array.isArray(data?.folders) ? data.folders : [];
    return folders
      .filter((f) => typeof f?.name === "string" && typeof f?.slug === "string")
      .map((f) => ({
        name: String(f.name || "").trim(),
        slug: normalizeSlug(String(f.slug || "")),
        description: typeof f.description === "string" ? f.description : "",
        preview: typeof f.preview === "string" ? f.preview : "",
      }))
      .filter((f) => f.slug.startsWith("services/"));
  } catch {
    return [];
  }
}

export default async function ServicesPage() {
  const services = await getServices();
  const folders = await getServiceFolders();
  const folderMetaBySlug = new Map(folders.map((f) => [f.slug, f] as const));
  const tree = buildServicesTree(services, folderMetaBySlug);
  const hasAnyItems = tree.pages.length > 0 || tree.children.length > 0;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="px-4 py-5 sm:px-6 sm:py-6 lg:px-10">
        <section className="mx-auto w-full max-w-[1200px] px-6 pb-10 pt-2 text-[#496db3] sm:px-8 sm:pb-12 sm:pt-3 lg:px-12">
          <nav
            aria-label="Хлебные крошки"
            className="mb-5 flex flex-wrap items-center gap-1.5 text-sm text-slate-500"
          >
            <Link
              href="/"
              className="inline-flex items-center rounded p-1 hover:bg-slate-200 hover:text-slate-700"
              aria-label="Главная"
            >
              <HomeIcon className="h-4 w-4" />
            </Link>
            <ChevronRightIcon className="h-4 w-4 text-slate-400" />
            <span className="rounded px-1 py-0.5 text-slate-700">Услуги</span>
          </nav>

          <div
            className="mb-4 flex items-center justify-center text-[13px] font-semibold tracking-tight"
            style={{ fontSize: "clamp(10px, 1.2vw, 16px)" }}
          >
            <h1
              className="text-center uppercase text-[#496db3]"
              style={{
                fontSize: "230%",
                lineHeight: 1.1,
                fontWeight: 950,
                textShadow:
                  "0.35px 0 currentColor, -0.35px 0 currentColor, 0 0.35px currentColor, 0 -0.35px currentColor",
              }}
            >
              Услуги
            </h1>
          </div>

          <p className="mb-5 text-center font-semibold text-[#496db3]" style={{ fontSize: "clamp(13px, 0.7vw, 14px)" }}>
            Выберите раздел или страницу услуги, чтобы открыть подробное описание.
          </p>

          {hasAnyItems ? (
            <div className="p-0">
              <ServicesTreeView node={tree} />
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              Пока нет опубликованных услуг в разделе `services`.
            </div>
          )}

          {null}

          <style>{`
            .services-folder-grid {
              display: grid;
              grid-template-columns: minmax(0, 1fr);
              grid-auto-rows: 1fr;
              align-items: stretch;
              gap: 0.75rem;
              margin-top: 0.25rem;
            }
            .service-row-grid {
              display: grid;
              grid-template-columns: minmax(0, 1fr);
              gap: 2rem;
            }
            @media (min-width: 900px) {
              .service-row-grid {
                grid-template-columns: 3fr 7fr;
                align-items: stretch;
              }
            }
            @media (min-width: 700px) {
              .services-folder-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
              }
            }
            @media (min-width: 900px) {
              .services-folder-grid {
                grid-template-columns: repeat(4, minmax(0, 1fr));
              }
            }
          `}</style>
        </section>
      </div>
    </div>
  );
}

