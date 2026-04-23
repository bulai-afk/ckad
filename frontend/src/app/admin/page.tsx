"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";
import {
  NAV_FOLDERS_COOKIE_NAME,
  serializeNavFoldersCookie,
} from "@/lib/navFoldersCookie";
import {
  normalizePageDisplayOrderMap,
  sortBySectionDisplayOrder,
  type PageDisplayOrderMap,
} from "@/lib/pageDisplayOrder";
import { AdminSidebar } from "@/components/admin/Sidebar";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import {
  ArrowUpCircleIcon,
  Bars3Icon,
  PlusSmallIcon,
  Squares2X2Icon,
  FolderIcon,
  DocumentTextIcon,
  DocumentPlusIcon,
  EllipsisVerticalIcon,
  XMarkIcon,
  Cog6ToothIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

function slugifyLatin(input: string): string {
  const map: Record<string, string> = {
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    е: "e",
    ё: "e",
    ж: "zh",
    з: "z",
    и: "i",
    й: "y",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "h",
    ц: "ts",
    ч: "ch",
    ш: "sh",
    щ: "sch",
    ъ: "",
    ы: "y",
    ь: "",
    э: "e",
    ю: "yu",
    я: "ya",
  };

  const normalized = input
    .trim()
    .toLowerCase()
    .split("")
    .map((ch) => {
      if (map[ch]) return map[ch];
      return ch;
    })
    .join("");

  return normalized
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Путь slug в одном виде (нижний регистр, слеши). Иначе папка из страницы и из списка customFolders не совпадает — «Удалить» не показывается. */
function normalizeUrlSlugPath(slug: string): string {
  return slug
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .toLowerCase();
}

function capitalizeFirst(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function isArticlesSectionPageSlug(slug: string): boolean {
  const s = normalizeUrlSlugPath(slug);
  return s === "articles" || s.startsWith("articles/");
}

function humanizeFolderSlugSegment(seg: string): string {
  const normalized = seg.trim().toLowerCase();
  if (normalized === "services") return "Услуги";
  if (normalized === "articles") return "Новости";
  return capitalizeFirst(seg.replace(/-/g, " "));
}

async function fileToWebpDataUrl(file: File, quality = 0.6): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Не удалось загрузить изображение"));
      el.src = objectUrl;
    });

    const maxSide = 160;
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const outW = Math.max(1, Math.round(img.width * scale));
    const outH = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas недоступен");
    // На всякий случай гарантируем прозрачный фон (важно для png с альфой).
    ctx.clearRect(0, 0, outW, outH);
    ctx.drawImage(img, 0, 0, outW, outH);

    const webp = canvas.toDataURL("image/webp", quality);
    if (webp.startsWith("data:image/webp")) return webp;

    // PNG поддерживает прозрачность — это важно для "картинок без фона".
    const png = canvas.toDataURL("image/png");
    if (png.startsWith("data:image/png")) return png;

    throw new Error("Не удалось создать data URL изображения");
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function getFolderPathFromPageSlug(slug: string): string {
  const s = normalizeUrlSlugPath(slug);
  if (!s) return "__root";
  const idx = s.lastIndexOf("/");
  return idx >= 0 ? s.slice(0, idx) : "__root";
}

function getPageLeafSlug(slug: string): string {
  const s = normalizeUrlSlugPath(slug);
  const idx = s.lastIndexOf("/");
  return idx >= 0 ? s.slice(idx + 1) : s;
}

function getFolderParentPath(folderSlug: string): string {
  const s = normalizeUrlSlugPath(folderSlug);
  if (!s) return "__root";
  const idx = s.lastIndexOf("/");
  return idx >= 0 ? s.slice(0, idx) : "__root";
}

function getFolderAncestors(folderSlug: string): string[] {
  const s = normalizeUrlSlugPath(folderSlug);
  if (!s) return [];
  const parts = s.split("/").filter(Boolean);
  const out: string[] = [];
  for (let i = 0; i < parts.length; i += 1) {
    out.push(parts.slice(0, i + 1).join("/"));
  }
  return out;
}

type PageSummary = {
  id: number;
  title: string;
  slug: string;
  status: "DRAFT" | "PUBLISHED";
  createdAt?: string | Date;
  description?: string | null;
  preview?: string | null;
  keywords?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  /** Раздел «Новости»: новость или статья (блок article_kind на бэкенде). */
  articleKind?: "news" | "article";
};

type Block = {
  type: string;
  data: { text?: string };
};

type CustomFolder = {
  name: string;
  slug: string;
  description?: string;
  showInNavbar?: boolean;
  preview?: string;
};

const FOLDER_PREVIEW_DEBUG = false;
type AdminSectionTab = "catalog" | "study" | "other" | "articles";
type AdminSectionConfig = { id: AdminSectionTab; label: string; rootSlug: string };

const ADMIN_SECTION_TABS: AdminSectionConfig[] = [
  { id: "catalog", label: "Каталогизация", rootSlug: "catalogization" },
  { id: "study", label: "Учебный центр", rootSlug: "training-center" },
  { id: "other", label: "Прочие услуги", rootSlug: "other-services" },
  { id: "articles", label: "Новости", rootSlug: "articles" },
];

const PAGE_TITLE_MAX = 60;
const PAGE_DESCRIPTION_MAX = 160;
const PAGE_KEYWORDS_MAX = 400;

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminSectionTab>("catalog");
  const [pagesViewMode, setPagesViewMode] = useState<"grid" | "list">("grid");
  const [pages, setPages] = useState<PageSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [text, setText] = useState("");
  const [keywords, setKeywords] = useState("");
  const [pagePreview, setPagePreview] = useState("");
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [customFolders, setCustomFolders] = useState<CustomFolder[]>([]);
  const [isCustomFoldersLoaded, setIsCustomFoldersLoaded] =
    useState(false);
  const [isAddFolderModalOpen, setIsAddFolderModalOpen] =
    useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderSlug, setNewFolderSlug] = useState("");
  const [newFolderDescription, setNewFolderDescription] = useState("");
  const [newFolderPreview, setNewFolderPreview] = useState("");
  const [addFolderParentSlug, setAddFolderParentSlug] = useState<string>("__root");
  const [folderModalError, setFolderModalError] = useState<string | null>(
    null,
  );
  const [isAddPageModalOpen, setIsAddPageModalOpen] = useState(false);
  const [editingPageId, setEditingPageId] = useState<number | null>(null);
  const [pageToDelete, setPageToDelete] = useState<PageSummary | null>(null);
  const [isDeletingPage, setIsDeletingPage] = useState(false);
  const [publishingPageId, setPublishingPageId] = useState<number | null>(null);
  const [articleKindSavingId, setArticleKindSavingId] = useState<number | null>(null);
  const [isPageSlugEdited, setIsPageSlugEdited] =
    useState<boolean>(false);
  const [isEditFolderModalOpen, setIsEditFolderModalOpen] =
    useState(false);
  const [openPageMenuId, setOpenPageMenuId] = useState<number | null>(null);
  const [openFolderMenuSlug, setOpenFolderMenuSlug] = useState<string | null>(null);
  const [draggedPageId, setDraggedPageId] = useState<number | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [pendingDragPageId, setPendingDragPageId] = useState<number | null>(
    null,
  );
  const [draggedFolderSlug, setDraggedFolderSlug] = useState<string | null>(null);
  const [folderDragOverSlug, setFolderDragOverSlug] = useState<string | null>(null);
  const [pageOrderBySection, setPageOrderBySection] = useState<PageDisplayOrderMap>({});
  const [dragOrderPageId, setDragOrderPageId] = useState<number | null>(null);
  const [dragOrderOverPageId, setDragOrderOverPageId] = useState<number | null>(null);
  const [editFolderOldSlug, setEditFolderOldSlug] = useState<string>("");
  const [editFolderSlug, setEditFolderSlug] = useState<string>("");
  const [editFolderParentSlug, setEditFolderParentSlug] = useState<string>("__root");
  const [editFolderName, setEditFolderName] = useState<string>("");
  const [editFolderDescription, setEditFolderDescription] = useState<string>("");
  const [editFolderShowInNavbar, setEditFolderShowInNavbar] =
    useState<boolean>(false);
  const [editFolderPreview, setEditFolderPreview] = useState<string>("");
  const [editFolderModalError, setEditFolderModalError] =
    useState<string | null>(null);

  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const pagePreviewInputRef = useRef<HTMLInputElement | null>(null);
  const editFolderNameInputRef = useRef<HTMLInputElement | null>(null);
  const dragPreviewRef = useRef<HTMLElement | null>(null);
  const dragSourceRef = useRef<HTMLElement | null>(null);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 16, y: 16 });
  const suppressClickRef = useRef(false);
  /** После GET папок не делаем немедленный PUT — иначе каждое открытие /admin бьёт в запись и при EACCES на сервере даёт 500. */
  const omitNextFoldersPersistRef = useRef(false);

  async function loadPages() {
    try {
      setLoading(true);
      setError(null);
      const [data, orderPayload] = await Promise.all([
        apiGet<PageSummary[]>("/api/pages"),
        apiGet<{ orderBySection?: unknown }>("/api/pages/display-order").catch(
          () => ({ orderBySection: undefined }),
        ),
      ]);
      setPages(data);
      if (orderPayload && typeof orderPayload === "object") {
        setPageOrderBySection(normalizePageDisplayOrderMap(orderPayload.orderBySection));
      }
    } catch (e) {
      setError("Не удалось загрузить страницы");
      // eslint-disable-next-line no-console
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPages();
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const data = await apiGet<{ folders?: CustomFolder[] }>("/api/pages/folders");
        const loadedRaw = (Array.isArray(data?.folders) ? data.folders : [])
          .filter((f) => typeof f?.name === "string" && typeof f?.slug === "string")
          .map((f) => ({
            name: String(f.name || "").trim(),
            slug: normalizeUrlSlugPath(String(f.slug || "").trim()),
            description: typeof f.description === "string" ? f.description : "",
            showInNavbar: Boolean(f.showInNavbar),
            preview: typeof f.preview === "string" ? f.preview : "",
          }))
          .filter((f) => f.name && f.slug);
        const seen = new Map<string, (typeof loadedRaw)[0]>();
        for (const f of loadedRaw) {
          if (!seen.has(f.slug)) seen.set(f.slug, f);
        }
        const loaded = Array.from(seen.values());
        omitNextFoldersPersistRef.current = true;
        setCustomFolders(loaded);
    } catch {
        omitNextFoldersPersistRef.current = true;
        setCustomFolders([]);
    } finally {
      setIsCustomFoldersLoaded(true);
    }
    })();
  }, []);

  useEffect(() => {
    if (!isCustomFoldersLoaded) return;
    if (FOLDER_PREVIEW_DEBUG) {
      // eslint-disable-next-line no-console
      console.log(
        "[FOLDER_PREVIEW_DEBUG] persisting customFolders",
        customFolders.map((f) => ({
          slug: f.slug,
          previewLen: typeof f.preview === "string" ? f.preview.length : 0,
        })),
      );
    }
    document.cookie = `${NAV_FOLDERS_COOKIE_NAME}=${serializeNavFoldersCookie(customFolders)}; Path=/; Max-Age=31536000; SameSite=Lax`;
    if (omitNextFoldersPersistRef.current) {
      omitNextFoldersPersistRef.current = false;
      return;
    }
    void apiPut("/api/pages/folders", { folders: customFolders }).catch(() => {
      setError("Не удалось сохранить папки на сервере.");
    });
  }, [customFolders, isCustomFoldersLoaded]);

  useEffect(() => {
    if (openPageMenuId === null) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (target?.closest("[data-page-menu-root='true']")) return;
      setOpenPageMenuId(null);
    };

    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [openPageMenuId]);

  useEffect(() => {
    if (openFolderMenuSlug === null) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (target?.closest("[data-folder-menu-root='true']")) return;
      setOpenFolderMenuSlug(null);
    };

    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [openFolderMenuSlug]);

  useEffect(() => {
    const resetFolderDrag = () => {
      setDraggedFolderSlug(null);
      setFolderDragOverSlug(null);
    };
    window.addEventListener("dragend", resetFolderDrag);
    window.addEventListener("drop", resetFolderDrag);
    return () => {
      window.removeEventListener("dragend", resetFolderDrag);
      window.removeEventListener("drop", resetFolderDrag);
    };
  }, []);

  useEffect(() => {
    if (pendingDragPageId === null) return;

    const onPointerMove = (event: PointerEvent) => {
      if (draggedPageId === null) {
        const dx = event.clientX - dragStartRef.current.x;
        const dy = event.clientY - dragStartRef.current.y;
        const movedEnough = Math.hypot(dx, dy) > 6;
        if (!movedEnough || !dragSourceRef.current) return;

        const source = dragSourceRef.current;
        const rect = source.getBoundingClientRect();
        const computed = window.getComputedStyle(source);
        const clone = source.cloneNode(true) as HTMLElement;
        clone.style.position = "fixed";
        clone.style.top = "0";
        clone.style.left = "0";
        clone.style.width = `${rect.width}px`;
        clone.style.height = `${rect.height}px`;
        clone.style.boxSizing = "border-box";
        clone.style.border = computed.border;
        clone.style.borderRadius = computed.borderRadius;
        clone.style.background = computed.backgroundColor;
        clone.style.boxShadow = computed.boxShadow;
        clone.style.margin = "0";
        clone.style.opacity = "1";
        clone.style.filter = "none";
        clone.style.pointerEvents = "none";
        clone.style.zIndex = "9999";
        document.body.appendChild(clone);
        dragPreviewRef.current = clone;
        dragOffsetRef.current = {
          x: Math.max(0, dragStartRef.current.x - rect.left),
          y: Math.max(0, dragStartRef.current.y - rect.top),
        };
        setDraggedPageId(pendingDragPageId);
        suppressClickRef.current = true;
      }

      if (!dragPreviewRef.current) return;
      dragPreviewRef.current.style.transform = `translate(${event.clientX - dragOffsetRef.current.x}px, ${event.clientY - dragOffsetRef.current.y}px)`;

      const target = document.elementFromPoint(event.clientX, event.clientY);
      const dropEl = target?.closest("[data-folder-drop]") as HTMLElement | null;
      setDragOverFolder(dropEl?.dataset.folderDrop ?? null);
    };

    const onPointerUp = () => {
      if (draggedPageId !== null && dragOverFolder) {
        void handleDropToFolder(dragOverFolder);
      } else {
        setDraggedPageId(null);
        setDragOverFolder(null);
      }
      setPendingDragPageId(null);
      dragSourceRef.current = null;
      if (dragPreviewRef.current) {
        dragPreviewRef.current.remove();
        dragPreviewRef.current = null;
      }
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [pendingDragPageId, draggedPageId, dragOverFolder]);

  async function handleCreate() {
    if (!title || !slug) return;

    const fullSlug =
      currentFolder && currentFolder !== "__root"
        ? `${currentFolder}/${slug}`
        : slug;

    try {
      setError(null);
      const articlesKindPayload =
        activeTab === "articles"
          ? {
              articleKind:
                (editingPageId
                  ? pages.find((x) => x.id === editingPageId)?.articleKind
                  : undefined) ?? "news",
            }
          : {};

      if (editingPageId) {
        await apiPut(`/api/pages/${editingPageId}`, {
          title: title.trim().slice(0, PAGE_TITLE_MAX),
          slug: fullSlug,
          description: text.trim().slice(0, PAGE_DESCRIPTION_MAX),
          keywords: keywords.trim().slice(0, PAGE_KEYWORDS_MAX),
          seoTitle: title.trim().slice(0, PAGE_TITLE_MAX),
          seoDescription: text.trim().slice(0, PAGE_DESCRIPTION_MAX),
          preview: pagePreview.trim(),
          ...articlesKindPayload,
        });
      } else {
      await apiPost("/api/pages", {
        title: title.trim().slice(0, PAGE_TITLE_MAX),
          slug: fullSlug,
        status: "DRAFT",
        description: text.trim().slice(0, PAGE_DESCRIPTION_MAX),
        keywords: keywords.trim().slice(0, PAGE_KEYWORDS_MAX),
        seoTitle: title.trim().slice(0, PAGE_TITLE_MAX),
        seoDescription: text.trim().slice(0, PAGE_DESCRIPTION_MAX),
        preview: pagePreview.trim(),
        ...articlesKindPayload,
      });
      }
      setTitle("");
      setSlug("");
      setText("");
      setKeywords("");
      setPagePreview("");
      setEditingPageId(null);
      setIsAddPageModalOpen(false);
      await loadPages();
    } catch (e) {
      setError(
        editingPageId
          ? "Ошибка при редактировании страницы"
          : "Ошибка при создании страницы",
      );
      // eslint-disable-next-line no-console
      console.error(e);
    }
  }

  function openDeletePageModal(page: PageSummary) {
    setOpenPageMenuId(null);
    setPageToDelete(page);
  }

  async function confirmDeletePage() {
    if (!pageToDelete) return;
    const target = pageToDelete;

    try {
      setIsDeletingPage(true);
      setError(null);
      setOpenPageMenuId(null);
      setPageToDelete(null);
      await apiDelete(`/api/pages/${target.id}`);
      await loadPages();
    } catch {
      setError("Ошибка при удалении страницы");
      await loadPages().catch(() => {
        // Игнорируем вторичную ошибку — сообщение уже показано.
      });
    } finally {
      setIsDeletingPage(false);
      setPageToDelete(null);
    }
  }

  async function handleArticleKindChange(page: PageSummary, next: "news" | "article") {
    const current = page.articleKind ?? "news";
    if (current === next) return;
    try {
      setArticleKindSavingId(page.id);
      setError(null);
      await apiPut(`/api/pages/${page.id}`, {
        title: page.title,
        slug: page.slug,
        description: page.description ?? "",
        preview: page.preview ?? "",
        articleKind: next,
      });
      await loadPages();
    } catch {
      setError("Не удалось сохранить тип материала");
    } finally {
      setArticleKindSavingId(null);
    }
  }

  async function handleTogglePagePublished(page: PageSummary) {
    const nextStatus = page.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    try {
      setPublishingPageId(page.id);
      setError(null);
      await apiPut(`/api/pages/${page.id}`, {
        title: page.title,
        slug: page.slug,
        status: nextStatus,
        description: page.description ?? "",
        preview: page.preview ?? "",
        ...(isArticlesSectionPageSlug(page.slug)
          ? { articleKind: page.articleKind ?? "news" }
          : {}),
      });
      await loadPages();
    } catch {
      setError("Не удалось изменить статус публикации");
    } finally {
      setPublishingPageId(null);
    }
  }

  async function handleDropToFolder(targetFolder: string) {
    if (draggedPageId === null) return;
    const page = pages.find((p) => p.id === draggedPageId);
    if (!page) return;

    const currentPageFolder = getFolderPathFromPageSlug(page.slug);
    const pageTail = getPageLeafSlug(page.slug);
    const targetSlug =
      targetFolder === "__root" ? pageTail : `${targetFolder}/${pageTail}`;

    if (currentPageFolder === targetFolder) {
      setDraggedPageId(null);
      setDragOverFolder(null);
      return;
    }

    try {
      setError(null);
      await apiPut(`/api/pages/${page.id}`, {
        title: page.title,
        slug: targetSlug,
        description: page.description ?? "",
        ...(isArticlesSectionPageSlug(targetSlug) || isArticlesSectionPageSlug(page.slug)
          ? { articleKind: page.articleKind ?? "news" }
          : {}),
      });
      setCurrentFolder(targetFolder);
      await loadPages();
    } catch {
      setError("Ошибка при переносе страницы");
    } finally {
      setDraggedPageId(null);
      setDragOverFolder(null);
    }
  }

  async function handleMoveFolderIntoFolder(sourceFolder: string, targetFolder: string) {
    const source = normalizeUrlSlugPath(sourceFolder.trim());
    const target =
      targetFolder.trim() === "__root" ? "__root" : normalizeUrlSlugPath(targetFolder.trim());
    if (!source || source === "__root") return;
    if (source === target) return;
    if (target !== "__root" && target.startsWith(`${source}/`)) return;

    const sourceLeaf = source.split("/").pop() || source;
    const newSlug = normalizeUrlSlugPath(
      target === "__root" ? sourceLeaf : `${target}/${sourceLeaf}`,
    );
    if (!newSlug || newSlug === source) return;

    const movingPages = pages.filter((p) => {
      const ps = normalizeUrlSlugPath(p.slug);
      return ps === source || ps.startsWith(`${source}/`);
    });
    const movingPageIds = new Set(movingPages.map((p) => p.id));
    const occupied = new Set(
      pages
        .filter((p) => !movingPageIds.has(p.id))
        .map((p) => p.slug),
    );

    for (const page of movingPages) {
      const ps = normalizeUrlSlugPath(page.slug);
      const nextSlug =
        ps === source ? newSlug : `${newSlug}${ps.slice(source.length)}`;
      if (occupied.has(nextSlug)) {
        setError(`Нельзя переместить папку: slug "${nextSlug}" уже используется`);
        return;
      }
    }

    setError(null);
    const prevCustomFolders = customFolders;
    const prevCurrentFolder = currentFolder;

    const mappedCustomFolders = customFolders.map((f) => {
      const fs = normalizeUrlSlugPath(f.slug);
      if (fs === source) return { ...f, slug: newSlug };
      if (fs.startsWith(`${source}/`)) {
        return { ...f, slug: `${newSlug}${fs.slice(source.length)}` };
      }
      return f;
    });
    setCustomFolders(mappedCustomFolders);
    setCurrentFolder((prev) => {
      if (!prev) return prev;
      const p = normalizeUrlSlugPath(prev);
      if (p === source) return newSlug;
      if (p.startsWith(`${source}/`)) return `${newSlug}${p.slice(source.length)}`;
      return prev;
    });

    try {
      await apiPut("/api/pages/folder-rename", {
        oldSlug: source,
        newSlug,
      });
      await loadPages();
    } catch (e) {
      setCustomFolders(prevCustomFolders);
      setCurrentFolder(prevCurrentFolder);
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(
        msg.includes("409")
          ? "Нельзя переместить папку: конфликт служебных адресов"
          : `Ошибка при переносе папки: ${msg}`,
      );
    }
  }

  async function saveSectionDisplayOrder(sectionSlug: string, orderedSlugs: string[]) {
    const normalizedSection = normalizeUrlSlugPath(sectionSlug);
    const normalizedSlugs = orderedSlugs
      .map((s) => normalizeUrlSlugPath(s))
      .filter((s) => s && (s === normalizedSection || s.startsWith(`${normalizedSection}/`)));
    setPageOrderBySection((prev) => ({
      ...prev,
      [normalizedSection]: normalizedSlugs,
    }));
    try {
      const payload = await apiPut<{ orderBySection?: unknown }>("/api/pages/display-order", {
        section: normalizedSection,
        slugs: normalizedSlugs,
      });
      if (payload && typeof payload === "object") {
        setPageOrderBySection(normalizePageDisplayOrderMap(payload.orderBySection));
      }
    } catch {
      setError("Не удалось сохранить порядок карточек.");
      void (async () => {
        try {
          const payload = await apiGet<{ orderBySection?: unknown }>("/api/pages/display-order");
          setPageOrderBySection(normalizePageDisplayOrderMap(payload?.orderBySection));
        } catch {
          // no-op
        }
      })();
    }
  }

  const activeTabConfig =
    ADMIN_SECTION_TABS.find((t) => t.id === activeTab) ?? ADMIN_SECTION_TABS[0];
  const currentSectionRoot = activeTabConfig.rootSlug;

  const sectionPages = pages.filter((p) => {
    const s = normalizeUrlSlugPath(p.slug);
    return s === currentSectionRoot || s.startsWith(`${currentSectionRoot}/`);
  });

  const currentFolderKey = currentSectionRoot;
  const parentFolderForQuickDrop: string | null = null;
  const childFolders: string[] = [];
  const visiblePages = sortBySectionDisplayOrder(
    sectionPages,
    currentSectionRoot,
    (page) => normalizeUrlSlugPath(page.slug),
    pageOrderBySection,
    (a, b) => b.id - a.id,
  );

  useEffect(() => {
    setCurrentFolder(currentSectionRoot);
  }, [currentSectionRoot]);

  function openAddFolderModal(parentSlug?: string) {
    setFolderModalError(null);
    setNewFolderName("");
    setNewFolderSlug("");
    setNewFolderDescription("");
    setNewFolderPreview("");
    const targetParent =
      parentSlug && parentSlug !== "__root"
        ? parentSlug
        : currentFolder && currentFolder !== "__root"
          ? currentFolder
          : "__root";
    setAddFolderParentSlug(targetParent);
    setIsAddFolderModalOpen(true);
  }

  function confirmAddFolder() {
    const name = newFolderName.trim();
    if (!name) {
      setFolderModalError("Введите название папки");
      return;
    }

    if (name.includes("/")) {
      setFolderModalError("Название папки не должно содержать '/'.");
      return;
    }

    const leafSlug = slugifyLatin(newFolderSlug.trim() || name);
    if (!leafSlug) {
      setFolderModalError("Некорректное название папки");
      return;
    }
    const folderSlug =
      addFolderParentSlug && addFolderParentSlug !== "__root"
        ? `${normalizeUrlSlugPath(addFolderParentSlug)}/${leafSlug}`
        : leafSlug;

    setCustomFolders((prev) => {
      const existing = prev.find((f) => normalizeUrlSlugPath(f.slug) === normalizeUrlSlugPath(folderSlug));
      if (existing) {
        return prev.map((f) =>
          normalizeUrlSlugPath(f.slug) === normalizeUrlSlugPath(folderSlug)
            ? {
                ...f,
                name,
                description: newFolderDescription.trim(),
                preview: newFolderPreview.trim(),
              }
            : f,
        );
      }

      return [
        ...prev,
        {
          name,
          slug: normalizeUrlSlugPath(folderSlug),
          description: newFolderDescription.trim(),
          preview: newFolderPreview.trim(),
        },
      ];
    });
    setCurrentFolder(normalizeUrlSlugPath(folderSlug));
    setIsAddFolderModalOpen(false);
    setFolderModalError(null);
    setNewFolderName("");
    setNewFolderSlug("");
    setNewFolderDescription("");
    setNewFolderPreview("");
  }

  async function handlePickNewFolderPreviewFile(file: File | null) {
    if (!file) return;
    try {
      const webpDataUrl = await fileToWebpDataUrl(file);
      if (FOLDER_PREVIEW_DEBUG) {
        // eslint-disable-next-line no-console
        console.log(
          "[FOLDER_PREVIEW_DEBUG] picked new folder preview",
          { slug: newFolderSlug, len: webpDataUrl.length },
        );
      }
      setNewFolderPreview(webpDataUrl);
      setFolderModalError(null);
    } catch {
      setFolderModalError("Не удалось обработать файл превью. Попробуйте другое изображение.");
    }
  }

  async function handlePickEditFolderPreviewFile(file: File | null) {
    if (!file || !editFolderOldSlug) return;
    try {
      const webpDataUrl = await fileToWebpDataUrl(file);
      if (FOLDER_PREVIEW_DEBUG) {
        // eslint-disable-next-line no-console
        console.log(
          "[FOLDER_PREVIEW_DEBUG] picked edit folder preview",
          { slug: editFolderOldSlug, len: webpDataUrl.length },
        );
      }
      setEditFolderPreview(webpDataUrl);
      const oldN = normalizeUrlSlugPath(editFolderOldSlug);
      setCustomFolders((prev) =>
        prev.some((f) => normalizeUrlSlugPath(f.slug) === oldN)
          ? prev.map((f) =>
              normalizeUrlSlugPath(f.slug) === oldN ? { ...f, preview: webpDataUrl } : f,
            )
          : [
              ...prev,
              {
                name: editFolderName.trim() || oldN.split("/").pop() || oldN,
                slug: oldN,
                showInNavbar: editFolderShowInNavbar,
                preview: webpDataUrl,
              },
            ],
      );
      setEditFolderModalError(null);
    } catch {
      setEditFolderModalError("Не удалось обработать файл превью. Попробуйте другое изображение.");
    }
  }

  function handleDeleteFolder(folderSlug: string) {
    const n = normalizeUrlSlugPath(folderSlug);
    setCustomFolders((prev) =>
      prev.filter(
        (f) =>
          normalizeUrlSlugPath(f.slug) !== n &&
          !normalizeUrlSlugPath(f.slug).startsWith(`${n}/`),
      ),
    );
    setCurrentFolder((prev) => {
      if (!prev || prev === "__root") return prev;
      const p = normalizeUrlSlugPath(prev);
      return p === n || p.startsWith(`${n}/`) ? "__root" : prev;
    });
  }

  function openEditFolderModal(folderSlug: string) {
    const n = normalizeUrlSlugPath(folderSlug);
    const entry = customFolders.find((f) => normalizeUrlSlugPath(f.slug) === n);
    const parentPath = getFolderParentPath(n);
    const leafSlug = n.split("/").pop() || n;
    setEditFolderOldSlug(n);
    setEditFolderParentSlug(parentPath);
    setEditFolderSlug(leafSlug);
    setEditFolderName(entry?.name ?? humanizeFolderSlugSegment(leafSlug));
    setEditFolderDescription(entry?.description ?? "");
    setEditFolderShowInNavbar(Boolean(entry?.showInNavbar));
    setEditFolderPreview(entry?.preview ?? "");
    setEditFolderModalError(null);
    setIsEditFolderModalOpen(true);

    window.setTimeout(() => {
      editFolderNameInputRef.current?.focus();
    }, 0);
  }

  function confirmEditFolder() {
    void (async () => {
      const newName = editFolderName.trim();
      if (!newName) {
        setEditFolderModalError("Введите название папки");
        return;
      }
      if (newName.includes("/")) {
        setEditFolderModalError(
          "Название папки не должно содержать '/'.",
        );
        return;
      }

      const newLeaf = slugifyLatin(editFolderSlug.trim());
      const oldSlug = normalizeUrlSlugPath(editFolderOldSlug);
      const parentSlug =
        editFolderParentSlug && editFolderParentSlug !== "__root"
          ? normalizeUrlSlugPath(editFolderParentSlug)
          : "";
      const newSlug = normalizeUrlSlugPath(parentSlug ? `${parentSlug}/${newLeaf}` : newLeaf);

      if (!newLeaf) {
        setEditFolderModalError("Некорректный служебный адрес папки");
        return;
      }

      if (!oldSlug) {
        setEditFolderModalError("Нельзя изменить служебный адрес");
        return;
      }

      // Optimistic UI update:
      // even if backend is temporarily unavailable, the folder list should reflect the change.
      setCustomFolders((prev) => {
        const hasExactCollision = prev.some(
          (f) =>
            normalizeUrlSlugPath(f.slug) === newSlug && normalizeUrlSlugPath(f.slug) !== oldSlug,
        );
        const oldEntry = prev.find((f) => normalizeUrlSlugPath(f.slug) === oldSlug);
        const nextPreview = editFolderPreview.trim();
        const mapped = prev.map((f) => {
          const fs = normalizeUrlSlugPath(f.slug);
          if (fs === oldSlug) {
            return {
              ...f,
              slug: newSlug,
              name: newName,
              description: editFolderDescription.trim(),
              showInNavbar: editFolderShowInNavbar,
              preview: nextPreview,
            };
          }
          if (fs.startsWith(`${oldSlug}/`)) {
            return { ...f, slug: `${newSlug}${fs.slice(oldSlug.length)}` };
          }
          return f;
        });
        const withUpsert = oldEntry
          ? mapped
          : [
              ...mapped,
              {
                name: newName,
                slug: newSlug,
                description: editFolderDescription.trim(),
                showInNavbar: editFolderShowInNavbar,
                preview: nextPreview || "",
              },
            ];
        if (FOLDER_PREVIEW_DEBUG) {
          const debugPayload = withUpsert.map((f) => ({
            slug: f.slug,
            previewLen: typeof f.preview === "string" ? f.preview.length : 0,
          }));
          // eslint-disable-next-line no-console
          console.log("[FOLDER_PREVIEW_DEBUG] confirmEditFolder next state", debugPayload);
        }
        if (hasExactCollision) {
          return withUpsert.filter((f) => normalizeUrlSlugPath(f.slug) !== oldSlug);
        }
        return withUpsert;
      });

      setCurrentFolder((prev) => {
        if (!prev) return prev;
        const p = normalizeUrlSlugPath(prev);
        if (p === oldSlug) return newSlug;
        if (p.startsWith(`${oldSlug}/`)) return `${newSlug}${p.slice(oldSlug.length)}`;
        return prev;
      });

      try {
        if (newSlug !== oldSlug) {
          await apiPut("/api/pages/folder-rename", {
            oldSlug,
            newSlug,
          });
        }

        await loadPages();

        setIsEditFolderModalOpen(false);
        setEditFolderModalError(null);
        setEditFolderSlug("");
        setEditFolderOldSlug("");
        setEditFolderParentSlug("__root");
        setEditFolderName("");
        setEditFolderDescription("");
        setEditFolderShowInNavbar(false);
        setEditFolderPreview("");
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "Unknown error";
        setEditFolderModalError(
          msg.includes("409")
            ? "Служебный адрес уже используется"
            : `Ошибка при переименовании папки: ${msg}`,
        );
      }
    })();
  }

  function openAddPageModal() {
    const targetFolder =
      currentFolder && currentFolder !== "__root" ? currentFolder : "__root";
    setCurrentFolder(targetFolder);
    setError(null);
    setEditingPageId(null);
    setTitle("");
    setSlug("");
    setText("");
    setKeywords("");
    setPagePreview("");
    setIsPageSlugEdited(false);
    setIsAddPageModalOpen(true);
    // После открытия модалки фокусим на заголовок
    window.setTimeout(() => {
      titleInputRef.current?.focus();
    }, 0);
  }

  function openAddPageModalInFolder(folderSlug: string) {
    setCurrentFolder(folderSlug);
    setError(null);
    setEditingPageId(null);
    setTitle("");
    setSlug("");
    setText("");
    setKeywords("");
    setPagePreview("");
    setIsPageSlugEdited(false);
    setIsAddPageModalOpen(true);
    // После открытия модалки фокусим на заголовок
    window.setTimeout(() => {
      titleInputRef.current?.focus();
    }, 0);
  }

  function openEditPageModal(page: PageSummary) {
    const shortSlug =
      currentFolder && currentFolder !== "__root"
        ? page.slug.startsWith(`${currentFolder}/`)
          ? page.slug.slice(currentFolder.length + 1)
          : page.slug
        : page.slug;

    setError(null);
    setEditingPageId(page.id);
    setTitle(page.title || "");
    setSlug(shortSlug);
    setText(page.description ?? "");
    setKeywords(page.keywords ?? "");
    setPagePreview(page.preview ?? "");
    setIsPageSlugEdited(true);
    setOpenPageMenuId(null);
    setIsAddPageModalOpen(true);

    window.setTimeout(() => {
      titleInputRef.current?.focus();
    }, 0);
  }

  function getFolderDisplayName(folderSlug: string): string {
    const n = normalizeUrlSlugPath(folderSlug);
    const entry = customFolders.find((f) => normalizeUrlSlugPath(f.slug) === n);
    const fallback = n.split("/").pop() || n;
    return entry?.name ?? humanizeFolderSlugSegment(fallback);
  }

  function formatPageDate(value: string | Date | undefined): string {
    if (!value) return "Без даты";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "Без даты";
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(d);
  }

  function parseKeywords(rawKeywords: string | null | undefined): string[] {
    if (!rawKeywords) return [];
    const words = rawKeywords
      .split(",")
      .map((w) => w.trim().toLowerCase())
      .filter((w) => w.length > 0);
    return Array.from(new Set(words)).slice(0, 12);
  }

  const draftKeywords = parseKeywords(keywords);

  return (
    <div className="min-h-screen bg-white">
      <div className="flex min-h-screen">
          <AdminSidebar />

        <div className="flex min-h-0 flex-1 flex-col lg:ml-64 h-screen overflow-hidden">
          <AdminTopBar />

          <main className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-6 lg:px-10">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {ADMIN_SECTION_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.id);
                    }}
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      activeTab === tab.id
                        ? "border-[#496db3] bg-[#496db3] text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:border-[#496db3]/40 hover:text-[#496db3]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() =>
                  setPagesViewMode((prev) => (prev === "grid" ? "list" : "grid"))
                }
                className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition ${
                  pagesViewMode === "grid"
                    ? "border-[#496db3]/40 bg-[#496db3]/10 text-[#496db3]"
                    : "border-slate-200 bg-white text-slate-600 hover:border-[#496db3]/40 hover:text-[#496db3]"
                }`}
                title={
                  pagesViewMode === "grid"
                    ? "Переключить на список"
                    : "Переключить на плитку"
                }
                aria-label={
                  pagesViewMode === "grid"
                    ? "Переключить на список"
                    : "Переключить на плитку"
                }
              >
                {pagesViewMode === "grid" ? (
                  <Squares2X2Icon className="h-4 w-4 [stroke-width:2.1]" />
                ) : (
                  <Bars3Icon className="h-4 w-4 [stroke-width:2.1]" />
                )}
              </button>
            </div>

            <div className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-200 bg-white p-6">

              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <h2 className="truncate text-sm font-semibold text-slate-900">
                    {activeTabConfig.label}
                    </h2>
                  <div className="mt-1 text-xs text-slate-500">{currentSectionRoot}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                    onClick={() => openAddPageModalInFolder(currentSectionRoot)}
                    className="inline-flex items-center gap-1 rounded-full border border-[#496db3]/30 bg-white px-3 py-1 text-xs font-medium text-[#496db3] hover:bg-[#496db3]/10"
                  >
                    <DocumentPlusIcon className="h-4 w-4 [stroke-width:2.2]" />
                    Страница
                  </button>
                </div>
              </div>

              <div className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded-xl border border-slate-200 bg-slate-50/40">
                {childFolders.length > 0 || (draggedPageId !== null && parentFolderForQuickDrop !== null) ? (
                  <div
                    className="grid gap-2 p-3"
                    style={{ gridTemplateColumns: "repeat(auto-fit, minmax(120px, max-content))" }}
                  >
                    {draggedPageId !== null && parentFolderForQuickDrop !== null ? (
                      <div
                        className="group relative w-full min-w-[120px] max-w-[220px] rounded-lg border border-dashed border-[#496db3]/60 bg-white p-2 text-[#496db3]"
                        data-folder-drop={parentFolderForQuickDrop}
                      >
                        <div className="mb-1 flex items-center justify-center">
                          <ArrowUpCircleIcon className="h-7 w-7 shrink-0" />
                        </div>
                        <p className="text-center text-xs font-medium leading-snug break-words">
                          {parentFolderForQuickDrop === "__root"
                            ? "Рабочая область"
                            : getFolderDisplayName(parentFolderForQuickDrop)}
                        </p>
                      </div>
                    ) : null}
                    {childFolders.map((folder) => {
                      const hasCustomEntry = customFolders.some(
                        (f) => normalizeUrlSlugPath(f.slug) === normalizeUrlSlugPath(folder),
                      );
                          return (
                        <div
                          key={folder}
                          className={`group relative w-full min-w-[120px] max-w-[220px] rounded-lg border border-slate-200 bg-white p-2 ${
                            folderDragOverSlug === folder || dragOverFolder === folder
                              ? "ring-1 ring-[#496db3] bg-[#496db3]/10"
                              : "hover:border-[#496db3]/40"
                          }`}
                          data-folder-drop={folder}
                          onDragOver={(e) => {
                            if (draggedFolderSlug) {
                              if (
                                draggedFolderSlug === folder ||
                                folder.startsWith(`${draggedFolderSlug}/`)
                              ) {
                                return;
                              }
                              e.preventDefault();
                              setFolderDragOverSlug((prev) => (prev === folder ? prev : folder));
                              return;
                            }
                            if (draggedPageId !== null) {
                              e.preventDefault();
                              setDragOverFolder((prev) => (prev === folder ? prev : folder));
                            }
                          }}
                          onDragLeave={() => {
                            // Не сбрасываем цель на каждом dragleave: браузер часто шлёт его при движении
                            // внутри карточки, из-за этого drop иногда "теряется".
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            if (draggedFolderSlug) {
                              const src = draggedFolderSlug;
                              setDraggedFolderSlug(null);
                              setFolderDragOverSlug(null);
                              void handleMoveFolderIntoFolder(src, folder);
                              return;
                            }
                            if (draggedPageId !== null) {
                              setDragOverFolder(null);
                              void handleDropToFolder(folder);
                            }
                          }}
                        >
                          <div className="absolute right-1 top-1 z-10">
                            <div className="relative shrink-0" data-folder-menu-root="true">
                            <button
                              type="button"
                                className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                aria-label="Открыть меню папки"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setOpenFolderMenuSlug((prev) => (prev === folder ? null : folder));
                                }}
                              >
                                <EllipsisVerticalIcon className="h-4 w-4" />
                              </button>
                              {openFolderMenuSlug === folder && (
                                <div className="absolute right-0 top-full z-30 mt-1 min-w-[130px] rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                                  <button
                                    type="button"
                                    className="mb-0.5 flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
                                  onClick={(e) => {
                                      e.preventDefault();
                                    e.stopPropagation();
                                      setOpenFolderMenuSlug(null);
                                    openEditFolderModal(folder);
                                  }}
                                  >
                                    <Cog6ToothIcon className="h-3.5 w-3.5 shrink-0 [stroke-width:2.2]" />
                                    Настройки
                                  </button>
                                  {hasCustomEntry ? (
                                    <button
                                      type="button"
                                      className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left text-xs text-red-600 hover:bg-red-50"
                                    onClick={(e) => {
                                        e.preventDefault();
                                      e.stopPropagation();
                                        setOpenFolderMenuSlug(null);
                                      handleDeleteFolder(folder);
                                    }}
                                    >
                                      <TrashIcon className="h-3.5 w-3.5 shrink-0 [stroke-width:2.2]" />
                                      Удалить
                            </button>
                                  ) : null}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="mb-1 flex items-center justify-center">
                    <button
                      type="button"
                              className="inline-flex items-center justify-center"
                              onClick={() => setCurrentFolder(folder)}
                              draggable
                              onDragStart={(e) => {
                                setDraggedFolderSlug(folder);
                                setFolderDragOverSlug(null);
                                e.dataTransfer.effectAllowed = "move";
                                e.dataTransfer.setData("text/plain", folder);
                              }}
                              onDragEnd={() => {
                                setDraggedFolderSlug(null);
                                setFolderDragOverSlug(null);
                              }}
                            >
                              <FolderIcon className="h-7 w-7 shrink-0 text-slate-400" />
                    </button>
                  </div>
                          <button
                            type="button"
                            className="w-full min-w-0 text-center"
                            onClick={() => setCurrentFolder(folder)}
                          >
                            <p className="text-xs font-medium leading-snug text-slate-800 break-words">
                              {getFolderDisplayName(folder)}
                            </p>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                {visiblePages.length > 0 ? (
                  <div
                    className={`grid p-4 ${
                      pagesViewMode === "grid"
                        ? "grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
                        : "grid-cols-1 gap-2"
                    }`}
                  >
                    {visiblePages.map((p, index) => (
                        <div
                          key={p.id}
                          draggable
                          onDragStart={(e) => {
                            setDragOrderPageId(p.id);
                            setDragOrderOverPageId(p.id);
                            e.dataTransfer.effectAllowed = "move";
                            e.dataTransfer.setData("text/plain", String(p.id));
                          }}
                          onDragOver={(e) => {
                            if (dragOrderPageId === null || dragOrderPageId === p.id) return;
                            e.preventDefault();
                            if (dragOrderOverPageId !== p.id) {
                              setDragOrderOverPageId(p.id);
                            }
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            if (dragOrderPageId === null || dragOrderPageId === p.id) return;
                            const ids = visiblePages.map((item) => item.id);
                            const from = ids.indexOf(dragOrderPageId);
                            const to = ids.indexOf(p.id);
                            if (from < 0 || to < 0 || from === to) return;
                            const moved = [...visiblePages];
                            const [draggedItem] = moved.splice(from, 1);
                            moved.splice(to, 0, draggedItem);
                            void saveSectionDisplayOrder(
                              currentSectionRoot,
                              moved.map((item) => item.slug),
                            );
                          }}
                          onDragEnd={() => {
                            setDragOrderPageId(null);
                            setDragOrderOverPageId(null);
                          }}
                        className={`group relative flex w-full rounded-xl border border-slate-200 bg-white transition hover:border-[#496db3]/40 hover:shadow-sm ${
                          pagesViewMode === "grid"
                            ? "min-h-[210px] flex-col p-4"
                            : "min-h-0 flex-col p-2"
                        } ${dragOrderOverPageId === p.id && dragOrderPageId !== p.id ? "border-[#496db3]" : ""}`}
                              onClick={(e) => {
                          const target = e.target as Element | null;
                          if (target?.closest("[data-page-menu-root='true']")) return;
                          if (suppressClickRef.current) {
                                e.preventDefault();
                                e.stopPropagation();
                            return;
                          }
                          router.push(`/admin/page_editor/${p.id}`);
                        }}
                      >
                        <div className={`flex w-full min-w-0 flex-1 ${pagesViewMode === "grid" ? "flex-col" : "flex-row gap-3"}`}>
                          <div
                            className={`relative overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200 ${
                              pagesViewMode === "grid"
                                ? "mb-3 aspect-[2/1] w-full"
                                : "h-16 w-24 shrink-0"
                            }`}
                          >
                            <div
                              className="absolute right-2 top-2 z-20 inline-flex min-w-6 items-center justify-center rounded-full bg-[#496db3]/95 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white shadow-sm ring-1 ring-white/80"
                              aria-label={`Позиция ${index + 1}`}
                              title={`Позиция ${index + 1}`}
                            >
                              {index + 1}
                            </div>
                            {p.preview ? (
                              <img
                                src={p.preview}
                                alt={p.title || "Превью страницы"}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs font-medium text-slate-400">
                                Без превью
                              </div>
                            )}
                            {activeTab === "articles" && pagesViewMode === "grid" ? (
                              <div
                                className="absolute left-2 top-2 z-20 flex max-w-[calc(100%-1rem)] rounded-full bg-white/95 p-0.5 shadow-sm ring-1 ring-slate-200/90"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                                onPointerDown={(e) => e.stopPropagation()}
                                role="group"
                                aria-label="Тип материала"
                              >
                                <button
                                  type="button"
                                  disabled={articleKindSavingId === p.id}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    void handleArticleKindChange(p, "news");
                                  }}
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition ${
                                    (p.articleKind ?? "news") === "news"
                                      ? "bg-[#496db3] text-white"
                                      : "text-slate-600 hover:bg-slate-100"
                                  } ${articleKindSavingId === p.id ? "opacity-60" : ""}`}
                                >
                                  Новость
                                </button>
                                <button
                                  type="button"
                                  disabled={articleKindSavingId === p.id}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    void handleArticleKindChange(p, "article");
                                  }}
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition ${
                                    p.articleKind === "article"
                                      ? "bg-[#496db3] text-white"
                                      : "text-slate-600 hover:bg-slate-100"
                                  } ${articleKindSavingId === p.id ? "opacity-60" : ""}`}
                                >
                                  Статья
                                </button>
                              </div>
                            ) : null}
                          </div>
                          <div className="flex min-w-0 flex-1 flex-col">
                          <div className={`flex justify-between gap-x-2 ${pagesViewMode === "grid" ? "items-start text-xs" : "items-center text-[11px]"}`}>
                            <span className="text-slate-400">{formatPageDate(p.createdAt)}</span>
                            <div className="flex items-center gap-x-1.5">
                              {activeTab === "articles" && pagesViewMode === "list" ? (
                                <div
                                  className="z-10 flex rounded-full bg-white/95 p-0.5 shadow-sm ring-1 ring-slate-200/90"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                  onPointerDown={(e) => e.stopPropagation()}
                                  role="group"
                                  aria-label="Тип материала"
                                >
                                  <button
                                    type="button"
                                    disabled={articleKindSavingId === p.id}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      void handleArticleKindChange(p, "news");
                                    }}
                                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold transition ${
                                      (p.articleKind ?? "news") === "news"
                                        ? "bg-[#496db3] text-white"
                                        : "text-slate-600 hover:bg-slate-100"
                                    } ${articleKindSavingId === p.id ? "opacity-60" : ""}`}
                                  >
                                    Новость
                                  </button>
                                  <button
                                    type="button"
                                    disabled={articleKindSavingId === p.id}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      void handleArticleKindChange(p, "article");
                                    }}
                                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold transition ${
                                      p.articleKind === "article"
                                        ? "bg-[#496db3] text-white"
                                        : "text-slate-600 hover:bg-slate-100"
                                    } ${articleKindSavingId === p.id ? "opacity-60" : ""}`}
                                  >
                                    Статья
                                  </button>
                                </div>
                              ) : null}
                              <button
                                type="button"
                                aria-label={
                                  p.status === "PUBLISHED"
                                    ? "Снять с публикации"
                                    : "Опубликовать страницу"
                                }
                                disabled={publishingPageId === p.id}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  void handleTogglePagePublished(p);
                                }}
                                className={`relative z-10 inline-flex items-center rounded-full font-medium transition ${
                                  pagesViewMode === "grid" ? "gap-2 px-2.5 py-1" : "gap-1 px-2 py-0.5"
                                } ${
                                  p.status === "PUBLISHED"
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-slate-100 text-slate-600"
                                } ${
                                  publishingPageId === p.id
                                    ? "opacity-60 cursor-not-allowed"
                                    : "hover:brightness-95"
                                }`}
                              >
                                <span>{p.status === "PUBLISHED" ? "Опубликовано" : "Черновик"}</span>
                                <span
                                  className={`inline-flex items-center rounded-full border transition ${
                                    pagesViewMode === "grid" ? "h-5 w-9" : "h-4 w-7"
                                  } ${
                                    p.status === "PUBLISHED"
                                      ? "border-emerald-300 bg-emerald-100"
                                      : "border-slate-300 bg-slate-100"
                                  }`}
                                >
                                  <span
                                    className={`ml-0.5 inline-block rounded-full bg-white shadow-sm transition-transform ${
                                      pagesViewMode === "grid" ? "h-3.5 w-3.5" : "h-2.5 w-2.5"
                                    } ${
                                      p.status === "PUBLISHED"
                                        ? pagesViewMode === "grid"
                                          ? "translate-x-4"
                                          : "translate-x-3"
                                        : "translate-x-0"
                                    }`}
                                  />
                                </span>
                              </button>
                            <div className="relative shrink-0" data-page-menu-root="true">
                              <button
                                type="button"
                              className={`inline-flex items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-700 ${
                                pagesViewMode === "grid" ? "h-6 w-6" : "h-5 w-5"
                              }`}
                                aria-label="Открыть меню страницы"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                setOpenPageMenuId((prev) => (prev === p.id ? null : p.id));
                                }}
                              >
                              <EllipsisVerticalIcon className="h-4 w-4" />
                              </button>
                              {openPageMenuId === p.id && (
                              <div className="absolute right-0 top-full z-30 mt-1 min-w-[130px] rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                                <button
                                  type="button"
                                  className="mb-0.5 flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setOpenPageMenuId(null);
                                    window.open(`/${p.slug}`, "_blank", "noopener,noreferrer");
                                  }}
                                >
                                  <DocumentTextIcon className="h-3.5 w-3.5 shrink-0 [stroke-width:2.2]" />
                                  Посмотреть
                                </button>
                                  <button
                                    type="button"
                                  className="mb-0.5 flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                    setOpenPageMenuId(null);
                                      openEditPageModal(p);
                                    }}
                                  >
                                  <Cog6ToothIcon className="h-3.5 w-3.5 shrink-0 [stroke-width:2.2]" />
                                  Настройки
                                  </button>
                                  <button
                                    type="button"
                                  className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left text-xs text-red-600 hover:bg-red-50"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                    setOpenPageMenuId(null);
                                      openDeletePageModal(p);
                                    }}
                                  >
                                  <TrashIcon className="h-3.5 w-3.5 shrink-0 [stroke-width:2.2]" />
                                    Удалить
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                          <div className="group relative grow">
                            <h3 className={`${pagesViewMode === "grid" ? "mt-3 text-base/6" : "mt-0 text-sm leading-5"} font-semibold text-slate-900 group-hover:text-[#496db3]`}>
                              <span className="absolute inset-0" />
                            {p.title || "(без названия)"}
                            </h3>
                            <p className={`${pagesViewMode === "grid" ? "mt-3 line-clamp-3 text-sm/6" : "mt-0.5 line-clamp-2 text-xs leading-5"} text-slate-500`}>
                              {(p.description || "").trim() || "Описание страницы пока не заполнено."}
                            </p>
                            {pagesViewMode === "grid" && parseKeywords(p.keywords).length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-1.5">
                                {parseKeywords(p.keywords).map((keyword) => (
                                  <span
                                    key={`${p.id}-${keyword}`}
                                    className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                                  >
                                    {keyword}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {!loading && visiblePages.length === 0 && (
                  <div className="px-4 py-8 text-center text-xs text-slate-400">
                    Пока нет страниц в разделе. Создайте первую страницу.
                      </div>
                    )}
                  </div>
            </div>
          </main>
        </div>
      </div>
      {isAddFolderModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-3 backdrop-blur-sm"
          onClick={() => setIsAddFolderModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Добавить папку"
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl ring-1 ring-slate-200 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start pr-10">
              <div />
              <span
                className="absolute right-2 top-2 inline-flex h-5 w-5 cursor-pointer items-center justify-center text-slate-500 transition-colors hover:text-[#496db3]"
                onClick={() => setIsAddFolderModalOpen(false)}
                role="button"
                aria-label="Закрыть"
              >
                <XMarkIcon className="h-4 w-4 [stroke-width:2.2]" />
              </span>
            </div>

            <label className="mt-2 flex flex-col gap-1 text-sm">
              <span className="font-semibold text-slate-700">
                Введите название папки
              </span>
              <input
                value={newFolderName}
                onChange={(e) => {
                  const v = e.target.value;
                  setNewFolderName(v);
                  setNewFolderSlug(slugifyLatin(v));
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    confirmAddFolder();
                  }
                }}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#496db3] focus:ring-1 focus:ring-[#496db3] focus:ring-offset-0 transition-colors"
                placeholder="Например: Новости"
              />
            </label>

            <div className="mt-4 flex flex-col gap-1 text-sm">
              <span className="font-semibold text-slate-700">
                Фото папки
              </span>
              <div className="mt-1 flex flex-col items-start gap-2">
                <label className="inline-flex w-fit cursor-pointer flex-col items-start gap-1">
                  <span className="text-[11px] font-medium text-slate-500">Мини-превью (нажмите для загрузки)</span>
                  <div className="h-48 w-48 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 shadow-sm">
                    {newFolderPreview.trim() ? (
                      <img
                        src={newFolderPreview}
                        alt="Превью папки"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center px-2 text-center text-[10px] font-medium leading-tight text-slate-400">
                        Выбрать изображение
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      void handlePickNewFolderPreviewFile(file);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
                {newFolderPreview.trim() ? (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-medium text-red-700 transition-colors hover:bg-red-100"
                    onClick={() => setNewFolderPreview("")}
                  >
                    <TrashIcon className="h-3.5 w-3.5 shrink-0 [stroke-width:2]" />
                    Удалить превью
                  </button>
                ) : null}
              </div>
            </div>

            <label className="mt-4 flex flex-col gap-1 text-sm">
              <span className="font-semibold text-slate-700">
                Описание папки
              </span>
              <textarea
                value={newFolderDescription}
                onChange={(e) => setNewFolderDescription(e.target.value)}
                rows={3}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#496db3] focus:ring-1 focus:ring-[#496db3] focus:ring-offset-0 transition-colors"
                placeholder="Краткое описание раздела"
              />
            </label>

            <label className="mt-4 flex flex-col gap-1 text-sm">
              <span className="font-semibold text-slate-700">
                Служебный адрес папки
              </span>
              <div className="flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus-within:border-[#496db3] focus-within:ring-1 focus-within:ring-[#496db3] focus-within:ring-offset-0 transition-colors">
                {addFolderParentSlug && addFolderParentSlug !== "__root" && (
                  <span className="shrink-0 text-slate-400">{addFolderParentSlug}/</span>
                )}
              <input
                value={newFolderSlug}
                  onChange={(e) => setNewFolderSlug(slugifyLatin(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    confirmAddFolder();
                  }
                }}
                  className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-slate-400"
                placeholder="Например: novosti"
              />
              </div>
              {addFolderParentSlug && addFolderParentSlug !== "__root" && (
                <span className="text-[11px] text-slate-400">
                  Папка будет создана внутри: {addFolderParentSlug}
                </span>
              )}
            </label>

            {folderModalError && (
              <div className="mt-2 text-xs text-red-600">
                {folderModalError}
              </div>
            )}

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs text-slate-700 transition-colors hover:bg-slate-50"
                onClick={() => setIsAddFolderModalOpen(false)}
              >
                Отмена
              </button>
              <button
                type="button"
                className="inline-flex items-center rounded-full bg-[#496db3] px-4 py-1.5 text-xs font-medium text-white hover:brightness-105 disabled:opacity-60"
                onClick={confirmAddFolder}
                disabled={!newFolderName.trim()}
              >
                Создать
              </button>
            </div>
          </div>
        </div>
      )}
      {isEditFolderModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-3 backdrop-blur-sm"
          onClick={() => setIsEditFolderModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Редактировать папку"
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl ring-1 ring-slate-200 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start pr-10">
              <div />
              <span
                className="absolute right-2 top-2 inline-flex h-5 w-5 cursor-pointer items-center justify-center text-slate-500 transition-colors hover:text-[#496db3]"
                onClick={() => setIsEditFolderModalOpen(false)}
                role="button"
                aria-label="Закрыть"
              >
                <XMarkIcon className="h-4 w-4 [stroke-width:2.2]" />
              </span>
            </div>

            <div className="h-0" />

            <label className="mt-4 flex flex-col gap-1 text-sm">
              <span className="font-semibold text-slate-700">
                Введите название папки
              </span>
              <input
                value={editFolderName}
                onChange={(e) => setEditFolderName(e.target.value)}
                ref={editFolderNameInputRef}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    confirmEditFolder();
                  }
                }}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#496db3] focus:ring-1 focus:ring-[#496db3] focus:ring-offset-0 transition-colors"
                placeholder="Например: Новости"
              />
            </label>

            <label className="mt-4 flex flex-col gap-1 text-sm">
              <span className="font-semibold text-slate-700">
                Описание папки
              </span>
              <textarea
                value={editFolderDescription}
                onChange={(e) => setEditFolderDescription(e.target.value)}
                rows={3}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#496db3] focus:ring-1 focus:ring-[#496db3] focus:ring-offset-0 transition-colors"
                placeholder="Краткое описание раздела"
              />
            </label>

            <label className="mt-4 flex flex-col gap-1 text-sm">
              <span className="font-semibold text-slate-700">
                Служебный адрес папки
              </span>
              <div className="flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus-within:border-[#496db3] focus-within:ring-1 focus-within:ring-[#496db3] transition-colors">
                {editFolderParentSlug && editFolderParentSlug !== "__root" && (
                  <span className="shrink-0 text-slate-400">{editFolderParentSlug}/</span>
                )}
              <input
                value={editFolderSlug}
                onChange={(e) => setEditFolderSlug(slugifyLatin(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void confirmEditFolder();
                  }
                }}
                  className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-slate-400"
                />
              </div>
            </label>

            <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
              <span className="font-semibold text-slate-700">
                Фото папки
              </span>
              <div className="flex flex-col items-end gap-2">
                <label className="inline-flex w-fit cursor-pointer flex-col items-start gap-1">
                  <span className="text-[11px] font-medium text-slate-500">Мини-превью (нажмите для загрузки)</span>
                  <div className="h-48 w-48 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 shadow-sm">
                    {editFolderPreview.trim() ? (
                      <img
                        src={editFolderPreview}
                        alt="Превью папки"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center px-2 text-center text-[10px] font-medium leading-tight text-slate-400">
                        Выбрать изображение
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      void handlePickEditFolderPreviewFile(file);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
                {editFolderPreview.trim() ? (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-medium text-red-700 transition-colors hover:bg-red-100"
                    onClick={() => setEditFolderPreview("")}
                  >
                    <TrashIcon className="h-3.5 w-3.5 shrink-0 [stroke-width:2]" />
                    Удалить превью
                  </button>
                ) : null}
              </div>
            </div>

            <label className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
              <span className="font-semibold text-slate-700">
                Показывать папку в navbar
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={editFolderShowInNavbar}
                onClick={() => setEditFolderShowInNavbar((v) => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  editFolderShowInNavbar ? "bg-[#496db3]" : "bg-slate-300"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    editFolderShowInNavbar ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </button>
            </label>

            {editFolderModalError && (
              <div className="mt-2 text-xs text-red-600">
                {editFolderModalError}
              </div>
            )}

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs text-slate-700 transition-colors hover:bg-slate-50"
                onClick={() => setIsEditFolderModalOpen(false)}
              >
                Отмена
              </button>
              <button
                type="button"
                className="inline-flex items-center rounded-full bg-[#496db3] px-4 py-1.5 text-xs font-medium text-white hover:brightness-105 disabled:opacity-60"
                onClick={() => void confirmEditFolder()}
                disabled={!editFolderName.trim() || !slugifyLatin(editFolderSlug).trim()}
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
      {pageToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-3 backdrop-blur-sm"
          onClick={() => {
            if (isDeletingPage) return;
            setPageToDelete(null);
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Подтверждение удаления страницы"
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl ring-1 ring-slate-200 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start pr-10">
              <div />
              <span
                className="absolute right-2 top-2 inline-flex h-5 w-5 cursor-pointer items-center justify-center text-slate-500 transition-colors hover:text-[#496db3]"
                onClick={() => {
                  if (isDeletingPage) return;
                  setPageToDelete(null);
                }}
                role="button"
                aria-label="Закрыть"
              >
                <XMarkIcon className="h-4 w-4 [stroke-width:2.2]" />
              </span>
                </div>

            <div className="mt-2 flex flex-col gap-1 text-sm">
              <span className="font-semibold text-slate-700">
                Удалить страницу?
                  </span>
                  <span className="text-xs text-slate-500">
                {pageToDelete.title || "(без названия)"}
              </span>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                onClick={() => setPageToDelete(null)}
                disabled={isDeletingPage}
              >
                Отмена
              </button>
              <button
                type="button"
                className="inline-flex items-center rounded-full bg-red-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
                onClick={() => void confirmDeletePage()}
                disabled={isDeletingPage}
              >
                {isDeletingPage ? "Удаление…" : "Удалить"}
              </button>
            </div>
          </div>
        </div>
      )}
      {isAddPageModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-3 backdrop-blur-sm"
          onClick={() => setIsAddPageModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={editingPageId ? "Редактировать страницу" : "Создать страницу"}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl ring-1 ring-slate-200 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start pr-10">
              <div />
              <span
                className="absolute right-2 top-2 inline-flex h-5 w-5 cursor-pointer items-center justify-center text-slate-500 transition-colors hover:text-[#496db3]"
                onClick={() => setIsAddPageModalOpen(false)}
                role="button"
                aria-label="Закрыть"
              >
                <XMarkIcon className="h-4 w-4 [stroke-width:2.2]" />
              </span>
            </div>

            <div className="h-0" />

            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-slate-200 bg-white p-2">
                <label className="block cursor-pointer">
                  <div className="relative aspect-[2/1] w-full overflow-hidden rounded-lg bg-slate-50 ring-1 ring-slate-200">
                    {pagePreview.trim() ? (
                      <img
                        src={pagePreview}
                        alt="Превью страницы"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-2 text-center">
                        <span className="text-xs font-medium text-slate-500">Выбрать изображение</span>
                        <span className="text-[11px] text-slate-400">Рекомендация: превью страницы 2:1</span>
                      </div>
                    )}
                  </div>
                  <input
                    ref={pagePreviewInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const input = e.currentTarget;
                      const f = e.target.files?.[0];
                      if (!f) return;
                      try {
                        const webpDataUrl = await fileToWebpDataUrl(f);
                        setPagePreview(webpDataUrl);
                        setError(null);
                      } catch {
                        setError("Не удалось обработать файл превью. Попробуйте другое изображение.");
                      } finally {
                        input.value = "";
                      }
                    }}
                  />
                </label>
                {pagePreview.trim() ? (
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-medium text-red-700 transition-colors hover:bg-red-100"
                      onClick={() => setPagePreview("")}
                    >
                      <TrashIcon className="h-3.5 w-3.5 shrink-0 [stroke-width:2]" />
                      Удалить превью
                    </button>
                  </div>
                ) : null}
              </div>

              <label className="flex flex-col gap-1 text-sm">
                <span className="font-semibold text-slate-700">
                  Введите название страницы
                </span>
                <input
                  value={title}
                      onChange={(e) => {
                        const v = e.target.value.slice(0, PAGE_TITLE_MAX);
                        setTitle(v);
                        if (!isPageSlugEdited) {
                          setSlug(slugifyLatin(v));
                        }
                      }}
                  ref={titleInputRef}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleCreate();
                    }
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#496db3] focus:ring-1 focus:ring-[#496db3]"
                  placeholder="Например: О центре"
                />
                <span className="text-[11px] text-slate-400">{title.length}/{PAGE_TITLE_MAX}</span>
              </label>

              <label className="flex flex-col gap-1 text-sm">
                <span className="font-semibold text-slate-700">
                  Введите короткое описание страницы
                </span>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value.slice(0, PAGE_DESCRIPTION_MAX))}
                  rows={3}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#496db3] focus:ring-1 focus:ring-[#496db3]"
                  placeholder="Описание страницы для быстрого просмотра…"
                />
                <span className="text-[11px] text-slate-400">{text.length}/{PAGE_DESCRIPTION_MAX}</span>
              </label>

              <label className="flex flex-col gap-1 text-sm">
                <span className="font-semibold text-slate-700">
                  Введите ключевые слова через запятую
                </span>
                <textarea
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value.slice(0, PAGE_KEYWORDS_MAX))}
                  rows={2}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#496db3] focus:ring-1 focus:ring-[#496db3]"
                  placeholder="каталогизация, обучение, гоз, сертификация"
                />
                <span className="text-[11px] text-slate-400">{keywords.length}/{PAGE_KEYWORDS_MAX}</span>
                {draftKeywords.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {draftKeywords.map((keyword) => (
                      <span
                        key={`draft-${keyword}`}
                        className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                )}
              </label>

              <label className="flex flex-col gap-1 text-sm">
                <span className="font-semibold text-slate-700">
                  Введите служебный адрес страницы
                </span>
                <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm focus-within:border-[#496db3] focus-within:ring-1 focus-within:ring-[#496db3]">
                  {currentFolder && currentFolder !== "__root" && (
                    <span className="truncate text-slate-400">
                      {currentFolder}/
                  </span>
                  )}
                  <input
                    value={slug}
                    onChange={(e) => {
                      setIsPageSlugEdited(true);
                      setSlug(slugifyLatin(e.target.value));
                    }}
                    className="min-w-0 flex-1 border-none bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                    placeholder="about"
                  />
                </div>
              </label>
              </div>

            {error && <div className="mt-2 text-xs text-red-600">{error}</div>}

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                onClick={() => setIsAddPageModalOpen(false)}
              >
                Отмена
              </button>
              <button
                type="button"
                className="inline-flex items-center rounded-full bg-[#496db3] px-4 py-1.5 text-xs font-medium text-white hover:brightness-105 disabled:opacity-60"
                onClick={() => void handleCreate()}
                disabled={loading || !title || !slug}
              >
                {loading
                  ? editingPageId
                    ? "Сохранение…"
                    : "Создание…"
                  : editingPageId
                    ? "Сохранить"
                    : "Создать страницу"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

