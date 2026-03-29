import Link from "next/link";
import { ChevronRightIcon, HomeIcon } from "@heroicons/react/20/solid";
import { HomeServicesFolderCards } from "@/components/HomeServicesFolderCards";
import { apiGet } from "@/lib/api";
import {
  buildServicesTree,
  collectServiceCards,
  isVisibleServicePage,
  normalizeSlug,
  type ServiceFolderMeta,
  type ServiceListItem,
  type ServiceTreeNode,
} from "@/lib/serviceTree";

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
      .filter((f) => f.slug === "services" || f.slug.startsWith("services/"));
  } catch {
    return [];
  }
}

export default async function ServicesPage() {
  const services = await getServices();
  const folders = await getServiceFolders();
  const folderMetaBySlug = new Map(folders.map((f) => [f.slug, f] as const));
  const rootMeta = folderMetaBySlug.get("services");
  const servicesRootFolderDescription = rootMeta?.description?.trim() || null;

  const tree = buildServicesTree(services, folderMetaBySlug);
  const collected: ServiceTreeNode[] = [];
  collectServiceCards(tree, collected);

  const cards = collected.map((n) => ({
    slugPath: n.slugPath,
    label: n.label,
    description: n.description?.trim() || undefined,
    preview: n.preview,
  }));

  return (
    <div className="bg-slate-100 text-slate-900">
      <div className="px-4 py-10 sm:px-6 lg:px-10">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
          <section className="bg-transparent p-0">
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
                Наши услуги
              </h1>
            </div>

            <div className="mb-4" style={{ fontSize: "clamp(13px, 0.7vw, 14px)" }}>
              <p
                className="whitespace-pre-wrap text-center font-semibold text-[#496db3]"
                style={{ fontSize: "112%", lineHeight: 1.35 }}
              >
                {servicesRootFolderDescription ?? (
                  <>
                    Закрываем задачи «под ключ» в области классификации и анализа данных: от методики и
                    каталогизации до сопровождения согласований — чтобы вы получали понятный результат в
                    срок и без лишних рисков.
                  </>
                )}
              </p>
            </div>

            <div className="mt-4">
              <HomeServicesFolderCards equalHeight cards={cards} limit={200} />
            </div>

            <style>{`
              .why-us-grid {
                grid-template-columns: 1fr;
                align-items: stretch;
              }
              @media (min-width: 768px) {
                .why-us-grid {
                  grid-template-columns: repeat(2, minmax(0, 1fr));
                }
              }
              @media (min-width: 1024px) {
                .why-us-grid {
                  grid-template-columns: repeat(4, minmax(0, 1fr));
                }
              }
            `}</style>
          </section>
        </div>
      </div>
    </div>
  );
}
