"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { PublicCarouselViewportSync } from "@/components/PublicCarouselViewportSync";
import { PublicFolderBreadcrumbLabel } from "@/components/PublicFolderBreadcrumbLabel";
import { HomeServicesFolderCards } from "@/components/HomeServicesFolderCards";
import { apiGet } from "@/lib/api";
import { apiBaseUrl } from "@/lib/apiBaseUrl";
import {
  buildServicesTree,
  findServiceTreeNode,
  isVisibleServicePage,
  normalizeSlug,
  type ServiceFolderMeta,
  type ServiceListItem,
  type ServiceTreeNode,
} from "@/lib/serviceTree";
import Link from "next/link";
import { ChevronRightIcon, HomeIcon } from "@heroicons/react/20/solid";

const PUBLIC_LIST_MARKER_SVG = {
  disc: encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="white"><circle cx="10" cy="10" r="3.5"/></svg>'),
  circle: encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="white" stroke-width="2"><circle cx="10" cy="10" r="3.5"/></svg>'),
  square: encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="white"><path d="M5.25 3A2.25 2.25 0 0 0 3 5.25v9.5A2.25 2.25 0 0 0 5.25 17h9.5A2.25 2.25 0 0 0 17 14.75v-9.5A2.25 2.25 0 0 0 14.75 3h-9.5Z"/></svg>'),
  check: encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="white"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd"/></svg>'),
  "check-circle": encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="white"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clip-rule="evenodd"/></svg>'),
  dash: encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="white"><path fill-rule="evenodd" d="M4 10a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H4.75A.75.75 0 0 1 4 10Z" clip-rule="evenodd"/></svg>'),
  arrow: encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="white"><path fill-rule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"/></svg>'),
  "arrow-right": encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="white"><path fill-rule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clip-rule="evenodd"/></svg>'),
  star: encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="white"><path fill-rule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z" clip-rule="evenodd"/></svg>'),
  heart: encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="white"><path d="m9.653 16.915-.005-.003-.019-.01a20.759 20.759 0 0 1-1.162-.682 22.045 22.045 0 0 1-2.582-1.9C4.045 12.733 2 10.352 2 7.5a4.5 4.5 0 0 1 8-2.828A4.5 4.5 0 0 1 18 7.5c0 2.852-2.044 5.233-3.885 6.82a22.049 22.049 0 0 1-3.744 2.582l-.019.01-.005.003h-.002a.739.739 0 0 1-.69.001l-.002-.001Z"/></svg>'),
  bolt: encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="white"><path d="M11.983 1.907a.75.75 0 0 0-1.292-.657l-8.5 9.5A.75.75 0 0 0 2.75 12h6.572l-1.305 6.093a.75.75 0 0 0 1.292.657l8.5-9.5A.75.75 0 0 0 17.25 8h-6.572l1.305-6.093Z"/></svg>'),
} as const;

const PUBLIC_LIST_COLORS = [
  { value: "black", hex: "#000000" },
  { value: "slate", hex: "#64748b" },
  { value: "gray", hex: "#6b7280" },
  { value: "zinc", hex: "#71717a" },
  { value: "red", hex: "#ef4444" },
  { value: "orange", hex: "#f97316" },
  { value: "amber", hex: "#f59e0b" },
  { value: "yellow", hex: "#eab308" },
  { value: "lime", hex: "#84cc16" },
  { value: "green", hex: "#22c55e" },
  { value: "emerald", hex: "#10b981" },
  { value: "teal", hex: "#14b8a6" },
  { value: "cyan", hex: "#06b6d4" },
  { value: "sky", hex: "#0ea5e9" },
  { value: "blue", hex: "#3b82f6" },
  { value: "indigo", hex: "#6366f1" },
  { value: "violet", hex: "#8b5cf6" },
  { value: "purple", hex: "#a855f7" },
  { value: "fuchsia", hex: "#d946ef" },
  { value: "pink", hex: "#ec4899" },
  { value: "rose", hex: "#f43f5e" },
] as const;

type Block = {
  id: number;
  type: string;
  data: { text?: string };
};

type PageData = {
  title: string;
  slug: string;
  blocks: Block[];
};

const PAGE_CACHE_KEY_PREFIX = "public_page_cache_v1:";
const CALLBACK_FORM_LINK = "callback://open";

function slugSegmentsFromNormalized(normalizedSlug: string): string[] {
  if (!normalizedSlug) return [];
  try {
    return decodeURIComponent(normalizedSlug).split("/").filter(Boolean);
  } catch {
    return normalizedSlug.split("/").filter(Boolean);
  }
}

export default function Page() {
  const params = useParams<{ slug?: string[] | string }>();
  const slugParts = useMemo(() => {
    const raw = params?.slug;
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string") return raw.split("/").filter(Boolean);
    return [];
  }, [params]);

  const normalizedSlug = useMemo(
    () => encodeURIComponent(slugParts.join("/")),
    [slugParts],
  );
  const [page, setPage] = useState<PageData | null>(null);
  /** Нет CMS-страницы по slug, но есть папка в /api/pages/folders — показываем тот же хаб, что на /services */
  const [serviceFolderHub, setServiceFolderHub] = useState<ServiceTreeNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [callbackModalOpen, setCallbackModalOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorText, setErrorText] = useState("");
  const folderSlug = slugParts.length > 1 ? slugParts[0] : null;
  const folderTitle = folderSlug
    ? decodeURIComponent(folderSlug)
        .replace(/-/g, " ")
        .replace(/^\p{L}/u, (ch) => ch.toUpperCase())
    : null;

  useEffect(() => {
    if (!normalizedSlug) {
      setPage(null);
      setServiceFolderHub(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const cacheKey = `${PAGE_CACHE_KEY_PREFIX}${normalizedSlug}`;

    void (async () => {
      setLoading(true);
      setServiceFolderHub(null);
      setPage(null);

      try {
        try {
          const raw = window.localStorage.getItem(cacheKey);
          if (raw) {
            const parsed = JSON.parse(raw) as PageData;
            if (!cancelled && parsed?.slug) {
              setPage(parsed);
              return;
            }
          }
        } catch {
          // fetch fresh
        }

        try {
          const data = await apiGet<PageData>(`/api/pages/slug/${normalizedSlug}`);
          if (!cancelled) {
            setPage(data);
            try {
              window.localStorage.setItem(cacheKey, JSON.stringify(data));
            } catch {
              // ignore cache write failures
            }
          }
        } catch {
          if (!cancelled) {
            setPage(null);
            const pathSegments = slugSegmentsFromNormalized(normalizedSlug);
            const path = pathSegments.join("/");
            if (pathSegments[0] === "services" && pathSegments.length >= 2) {
              try {
                const [pages, foldersPayload] = await Promise.all([
                  apiGet<ServiceListItem[]>("/api/pages", 20000),
                  apiGet<{ folders?: ServiceFolderMeta[] }>("/api/pages/folders", 20000),
                ]);
                if (cancelled) return;
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
                if (
                  node &&
                  (node.isMetaFolder || node.pages.length > 0 || node.children.length > 0)
                ) {
                  setServiceFolderHub(node);
                }
              } catch {
                // остаётся «не найдено»
              }
            }
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [normalizedSlug]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-900">
        <p className="text-sm text-slate-500">Загрузка страницы...</p>
      </div>
    );
  }

  if (!page && serviceFolderHub) {
    const sectionDescription =
      serviceFolderHub.description?.trim() ||
      "Закрываем задачи «под ключ» в области классификации и анализа данных: от методики и каталогизации до сопровождения согласований — чтобы вы получали понятный результат в срок и без лишних рисков.";

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
                <Link
                  href="/services"
                  className="rounded px-1 py-0.5 text-slate-600 hover:bg-slate-200 hover:text-slate-800"
                >
                  Услуги
                </Link>
                <ChevronRightIcon className="h-4 w-4 text-slate-400" />
                <span className="rounded px-1 py-0.5 text-slate-700">{serviceFolderHub.label}</span>
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
                  {serviceFolderHub.label}
                </h1>
              </div>

              <div className="mb-4" style={{ fontSize: "clamp(13px, 0.7vw, 14px)" }}>
                <p
                  className="whitespace-pre-wrap text-center font-semibold text-[#496db3]"
                  style={{ fontSize: "112%", lineHeight: 1.35 }}
                >
                  {sectionDescription}
                </p>
              </div>

              <div className="mt-4">
                <HomeServicesFolderCards
                  equalHeight
                  ctaLabel="Перейти в услугу"
                  limit={200}
                  cards={[
                    ...serviceFolderHub.children.map((c) => ({
                      slugPath: c.slugPath,
                      label: c.label,
                      description: c.description?.trim() || undefined,
                      preview: c.preview,
                    })),
                    ...serviceFolderHub.pages.map((p) => ({
                      slugPath: p.slug,
                      label: p.title,
                      description: (typeof p.description === "string" && p.description.trim()) || undefined,
                      preview: p.preview ?? undefined,
                    })),
                  ]}
                />
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

  if (!page) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-900">
        <p className="text-sm text-slate-500">
          Страница не найдена или не опубликована.
        </p>
      </div>
    );
  }

  async function submitCallbackForm(e: React.FormEvent) {
    e.preventDefault();
    setErrorText("");
    setStatus("sending");
    try {
      const name = `${firstName} ${lastName}`.trim();
      const message = "Заявка из кнопки обложки страницы.";
      const res = await fetch(`${apiBaseUrl()}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email, message }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean };
      if (!res.ok || !data.ok) {
        setStatus("error");
        setErrorText("Не удалось отправить заявку. Проверьте данные и попробуйте снова.");
        return;
      }
      setStatus("success");
      setFirstName("");
      setLastName("");
      setPhone("");
      setEmail("");
      window.setTimeout(() => {
        setCallbackModalOpen(false);
        setStatus("idle");
      }, 900);
    } catch {
      setStatus("error");
      setErrorText("Нет связи с сервером. Попробуйте позже.");
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
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
          {folderSlug ? (
            <>
              <Link
                href={`/${folderSlug}`}
                className="rounded px-1 py-0.5 text-slate-600 hover:bg-slate-200 hover:text-slate-800"
              >
                <PublicFolderBreadcrumbLabel
                  folderSlug={folderSlug}
                  fallbackTitle={folderTitle ?? ""}
                />
              </Link>
              <ChevronRightIcon className="h-4 w-4 text-slate-400" />
            </>
          ) : null}
          <span className="rounded px-1 py-0.5 text-slate-700">{page.title}</span>
        </nav>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <PublicCarouselViewportSync />

          <main
            className="space-y-4"
            onClick={(e) => {
              const target = e.target as HTMLElement;
              const link = target.closest?.("a.page-web-cover-el-button") as HTMLAnchorElement | null;
              if (!link) return;
              const href = (link.getAttribute("href") || "").trim();
              if (href !== CALLBACK_FORM_LINK) return;
              e.preventDefault();
              setCallbackModalOpen(true);
            }}
          >
          {page.blocks.map((block) => {
            if (block.type === "summary") {
              return null;
            }
            if (block.type === "text") {
              const html = typeof block.data.text === "string" ? block.data.text : "";
              const isArticlesSection = slugParts[0] === "articles";
              return (
                <div
                  key={block.id}
                  className={
                    isArticlesSection
                      ? "article-page-content page-content"
                      : "page-content text-base leading-relaxed text-slate-800"
                  }
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              );
            }

            return (
              <div
                key={block.id}
                className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-500"
              >
                Неподдерживаемый тип блока: {block.type}
              </div>
            );
          })}
          {page.blocks.length === 0 && (
            <p className="text-sm text-slate-500">
              У этой страницы пока нет контента.
            </p>
          )}
          </main>
          {callbackModalOpen ? (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4">
              <button
                type="button"
                className="absolute inset-0 z-0 bg-transparent"
                style={{ backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
                aria-label="Закрыть окно обратной связи"
                onClick={() => setCallbackModalOpen(false)}
              />
              <div className="relative z-10 w-[min(88vw,460px)] max-h-[92dvh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex-1 text-center">
                    <h3 className="text-lg font-black uppercase tracking-tight text-[#496db3]">
                      Обратный звонок
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCallbackModalOpen(false)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                    aria-label="Закрыть"
                  >
                    ×
                  </button>
                </div>
                <p className="mb-4 text-[14px] font-semibold leading-[1.55] text-[#496db3]">
                  Оставьте вашу заявку и наши специалисты свяжутся с вами.
                </p>
                <form className="flex flex-col gap-3" onSubmit={submitCallbackForm}>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Имя *"
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[14px] font-semibold text-[#496db3] outline-none transition placeholder:text-[#496db3]/55 focus:border-[#496db3] focus:ring-2 focus:ring-[#496db3]/25"
                    required
                  />
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Фамилия"
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[14px] font-semibold text-[#496db3] outline-none transition placeholder:text-[#496db3]/55 focus:border-[#496db3] focus:ring-2 focus:ring-[#496db3]/25"
                  />
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Телефон"
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[14px] font-semibold text-[#496db3] outline-none transition placeholder:text-[#496db3]/55 focus:border-[#496db3] focus:ring-2 focus:ring-[#496db3]/25"
                  />
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="E-mail"
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[14px] font-semibold text-[#496db3] outline-none transition placeholder:text-[#496db3]/55 focus:border-[#496db3] focus:ring-2 focus:ring-[#496db3]/25"
                  />
                  {status === "success" ? (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-[14px] font-semibold text-emerald-800">
                      Спасибо! Заявка отправлена.
                    </div>
                  ) : null}
                  {status === "error" && errorText ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[14px] font-semibold text-red-800">
                      {errorText}
                    </div>
                  ) : null}
                  <button
                    type="submit"
                    disabled={status === "sending"}
                    className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#496db3] px-5 py-3 text-[14px] font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {status === "sending" ? "Отправляем..." : "Отправить заявку"}
                  </button>
                </form>
              </div>
            </div>
          ) : null}
          <style>{`
          .page-content img { max-width: 100%; height: auto; }
          .page-content table { width: 100%; border-collapse: collapse; margin: 0.75rem 0; }
          .page-content td, .page-content th { border: 1px solid #cbd5e1; padding: 0.5rem; vertical-align: top; }
          .page-content .page-editor-table { width: 100%; border-collapse: collapse; margin: 0.75rem 0; max-width: 100%; }
          .page-content .page-editor-table td,
          .page-content .page-editor-table th { border: 1px solid #cbd5e1; padding: 0.5rem; vertical-align: top; }
          .page-content ul { margin: 0.5rem 0; padding-left: 1.25rem; list-style: disc outside; --list-marker-color: #000000; }
          ${PUBLIC_LIST_COLORS.map((c) => `.page-content ul[data-list-color="${c.value}"] { --list-marker-color: ${c.hex}; }`).join("\n")}
          .page-content ul[data-list-style] { list-style: none; padding-left: 1.5em; }
          .page-content ul[data-list-style] li::before { content: ""; display: inline-block; width: 1em; height: 1em; margin-right: 0.35em; margin-left: -1.5em; vertical-align: -0.15em; background-color: var(--list-marker-color); -webkit-mask-size: contain; mask-size: contain; -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat; -webkit-mask-position: center; mask-position: center; }
          .page-content ul[data-list-style="disc"] li::before { -webkit-mask-image: url("data:image/svg+xml,${PUBLIC_LIST_MARKER_SVG.disc}"); mask-image: url("data:image/svg+xml,${PUBLIC_LIST_MARKER_SVG.disc}"); }
          .page-content ul[data-list-style="circle"] li::before { -webkit-mask-image: url("data:image/svg+xml,${PUBLIC_LIST_MARKER_SVG.circle}"); mask-image: url("data:image/svg+xml,${PUBLIC_LIST_MARKER_SVG.circle}"); }
          .page-content ul[data-list-style="square"] li::before { -webkit-mask-image: url("data:image/svg+xml,${PUBLIC_LIST_MARKER_SVG.square}"); mask-image: url("data:image/svg+xml,${PUBLIC_LIST_MARKER_SVG.square}"); }
          .page-content ul[data-list-style="check"] li::before { -webkit-mask-image: url("data:image/svg+xml,${PUBLIC_LIST_MARKER_SVG.check}"); mask-image: url("data:image/svg+xml,${PUBLIC_LIST_MARKER_SVG.check}"); }
          .page-content ul[data-list-style="check-circle"] li::before { -webkit-mask-image: url("data:image/svg+xml,${PUBLIC_LIST_MARKER_SVG["check-circle"]}"); mask-image: url("data:image/svg+xml,${PUBLIC_LIST_MARKER_SVG["check-circle"]}"); }
          .page-content ul[data-list-style="dash"] li::before { -webkit-mask-image: url("data:image/svg+xml,${PUBLIC_LIST_MARKER_SVG.dash}"); mask-image: url("data:image/svg+xml,${PUBLIC_LIST_MARKER_SVG.dash}"); }
          .page-content ul[data-list-style="arrow"] li::before { -webkit-mask-image: url("data:image/svg+xml,${PUBLIC_LIST_MARKER_SVG.arrow}"); mask-image: url("data:image/svg+xml,${PUBLIC_LIST_MARKER_SVG.arrow}"); }
          .page-content ul[data-list-style="arrow-right"] li::before { -webkit-mask-image: url("data:image/svg+xml,${PUBLIC_LIST_MARKER_SVG["arrow-right"]}"); mask-image: url("data:image/svg+xml,${PUBLIC_LIST_MARKER_SVG["arrow-right"]}"); }
          .page-content ul[data-list-style="star"] li::before { -webkit-mask-image: url("data:image/svg+xml,${PUBLIC_LIST_MARKER_SVG.star}"); mask-image: url("data:image/svg+xml,${PUBLIC_LIST_MARKER_SVG.star}"); }
          .page-content ul[data-list-style="heart"] li::before { -webkit-mask-image: url("data:image/svg+xml,${PUBLIC_LIST_MARKER_SVG.heart}"); mask-image: url("data:image/svg+xml,${PUBLIC_LIST_MARKER_SVG.heart}"); }
          .page-content ul[data-list-style="bolt"] li::before { -webkit-mask-image: url("data:image/svg+xml,${PUBLIC_LIST_MARKER_SVG.bolt}"); mask-image: url("data:image/svg+xml,${PUBLIC_LIST_MARKER_SVG.bolt}"); }
          .page-content ul[data-list-style="none"] li::before { content: none; }
          .page-content ol { list-style: none; padding-left: 0; margin: 0.35rem 0; --list-marker-color: #000000; }
          ${PUBLIC_LIST_COLORS.map((c) => `.page-content ol[data-list-color="${c.value}"] { --list-marker-color: ${c.hex}; }`).join("\n")}
          .page-content ol > li { position: relative; list-style: none; padding-left: 2.75em; margin: 0.12em 0; min-height: 1.35em; box-sizing: border-box; }
          .page-content ol > li::before { position: absolute; left: 0; top: 0; width: 2.35em; text-align: right; padding-right: 0.45em; box-sizing: border-box; content: attr(data-list-num); color: var(--marker-color, var(--list-marker-color)); line-height: inherit; pointer-events: none; }
          .page-content ol > li[data-marker-bold]::before { font-weight: bold; }
          .page-content li { margin: 0.15rem 0; }
          .page-content p { margin: 0.5rem 0; }
          .page-content .page-web-cover { display: flex; flex-direction: column; width: 100%; max-width: 100%; margin: 1.25rem 0; padding: 1.25rem 1.5rem; border-radius: 12px; background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 45%, #f8fafc 100%); border: 1px solid #cbd5e1; box-sizing: border-box; overflow: hidden; }
          .page-content .page-web-cover.page-web-cover-has-bg { background-color: #e2e8f0; }
          .page-content .page-web-cover[data-cover-aspect="16-9"],
          .page-content .page-web-cover:not([data-cover-aspect]) { aspect-ratio: 16 / 9; }
          .page-content .page-web-cover[data-cover-aspect="4-3"] { aspect-ratio: 4 / 3; }
          .page-content .page-web-cover[data-cover-aspect="21-9"] { aspect-ratio: 21 / 9; }
          .page-content .page-web-cover[data-cover-aspect="1-1"] { aspect-ratio: 1 / 1; }
          .page-content .page-web-cover[data-cover-aspect="1-8"] { aspect-ratio: 2 / 1; }
          .page-content .page-web-cover[data-cover-aspect="1-4"] { aspect-ratio: 4 / 1; }
          .page-content .page-web-cover[data-cover-aspect="3-1"] { aspect-ratio: 3 / 1; }
          .page-content .page-web-cover[data-cover-aspect="8-1"] { aspect-ratio: 8 / 1; }
          .page-content .page-web-cover-inner { flex: 1; min-height: 0; max-width: 100%; width: 100%; display: flex; flex-direction: column; padding-left: 2.25rem; padding-right: 1rem; box-sizing: border-box; }
          .page-content .page-web-cover[data-cover-halign="left"] .page-web-cover-inner,
          .page-content .page-web-cover:not([data-cover-halign]) .page-web-cover-inner { align-items: flex-start; text-align: left; }
          .page-content .page-web-cover[data-cover-halign="center"] .page-web-cover-inner { align-items: center; text-align: center; }
          .page-content .page-web-cover[data-cover-halign="right"] .page-web-cover-inner { align-items: flex-end; text-align: right; }
          .page-content .page-web-cover[data-cover-valign="top"] .page-web-cover-inner,
          .page-content .page-web-cover:not([data-cover-valign]) .page-web-cover-inner { justify-content: flex-start; }
          .page-content .page-web-cover[data-cover-valign="middle"] .page-web-cover-inner { justify-content: center; }
          .page-content .page-web-cover[data-cover-valign="bottom"] .page-web-cover-inner { justify-content: flex-end; }
          .page-content .page-web-cover-el-title { margin: 0 0 0.35rem; font-size: clamp(1.25rem, 3vw, 1.75rem); font-weight: 700; color: #0f172a; line-height: 1.2; }
          .page-content .page-web-cover-el-subtitle { margin: 0 0 0.75rem; font-size: 0.95rem; color: #475569; line-height: 1.45; max-width: 36rem; }
          .page-content .page-web-cover-el-button-wrap { margin: 0; }
          .page-content .page-web-cover-el-button { display: inline-flex; align-items: center; justify-content: center; padding: 0.45rem 1rem; font-size: 0.875rem; font-weight: 600; color: #fff; background: #496db3; border-radius: 9999px; text-decoration: none; cursor: pointer; box-sizing: border-box; }
          .page-content .page-web-cover-el-button:hover { filter: brightness(1.05); }
          .page-content .page-web-timeline { --timeline-dot-size: 0.8rem; --timeline-line-size: 2px; --timeline-term-gap: 1.35rem; --timeline-gap: 1rem; position: relative; width: 100%; margin: 1.25rem 0; padding-top: var(--timeline-term-gap); display: grid; grid-template-columns: repeat(var(--timeline-cols, 3), minmax(0, 1fr)); gap: var(--timeline-gap); box-sizing: border-box; }
          .page-content .page-web-timeline-item { position: relative; min-height: 1.5rem; padding-top: calc(var(--timeline-dot-size) + 0.35rem); }
          .page-content .page-web-timeline-item::before { content: none; }
          .page-content .page-web-timeline-item ~ .page-web-timeline-item::before { content: ""; position: absolute; top: calc(var(--timeline-dot-size) / 2 - var(--timeline-line-size) / 2); left: calc(-50% - var(--timeline-gap)); width: calc(100% + var(--timeline-gap)); height: var(--timeline-line-size); background: #cbd5e1; pointer-events: none; z-index: 1; }
          .page-content .page-web-timeline-term { position: absolute; left: calc(0px - (var(--timeline-gap) / 2)); top: calc((var(--timeline-dot-size) / 2) - var(--timeline-term-gap)); transform: translateX(-50%); margin: 0; padding: 0 0.45rem; font-size: 0.78rem; font-weight: 600; color: #64748b; line-height: 1.25; white-space: nowrap; background: #fff; }
          .page-content .page-web-timeline-dot { position: absolute; left: 50%; top: 0; transform: translateX(-50%); width: var(--timeline-dot-size); height: var(--timeline-dot-size); border-radius: 9999px; background: #496db3; box-shadow: 0 0 0 3px #e2e8f0; z-index: 2; }
          .page-content .page-web-timeline-content { display: flex; flex-direction: column; align-items: center; gap: 0.2rem; padding-left: 0; text-align: center; }
          .page-content .page-web-timeline-title { margin: 0; font-size: 1rem; font-weight: 700; color: #0f172a; line-height: 1.35; text-align: center; }
          .page-content .page-web-timeline-text { margin: 0; font-size: 0.95rem; color: #475569; line-height: 1.55; text-align: center; }
          @media (max-width: 767px) {
            .page-content .page-web-timeline { grid-template-columns: 1fr; --timeline-gap: 1rem; }
            .page-content .page-web-timeline-item { min-height: 0; padding-top: 0; padding-left: 1.5rem; }
            .page-content .page-web-timeline-item::before { content: none; }
            .page-content .page-web-timeline-item ~ .page-web-timeline-item::before { content: none; }
            .page-content .page-web-timeline-item:not(:last-of-type)::before { content: ""; position: absolute; left: calc(var(--timeline-dot-size) / 2 - var(--timeline-line-size) / 2); top: calc(0.2rem + (var(--timeline-dot-size) / 2) - (var(--timeline-line-size) / 2)); width: var(--timeline-line-size); height: calc(100% + var(--timeline-gap)); background: #cbd5e1; pointer-events: none; z-index: 1; }
            .page-content .page-web-timeline-dot { left: 0; top: 0.2rem; transform: none; }
            .page-content .page-web-timeline-term { position: static; transform: none; margin: 0 0 0.35rem; padding: 0; background: transparent; text-align: left; }
            .page-content .page-web-timeline-content { align-items: flex-start; text-align: left; }
            .page-content .page-web-timeline-title,
            .page-content .page-web-timeline-text { text-align: left; }
          }
          .page-content .page-web-carousel { position: relative; width: 100%; max-width: 100%; margin: 1.25rem 0; box-sizing: border-box; display: flex; flex-direction: row; flex-wrap: nowrap; align-items: center; gap: 10px; background: transparent; border: none; overflow: visible; }
          .page-content .page-web-carousel-arrow { position: relative; flex-shrink: 0; z-index: 2; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 9999px; border: 1px solid #cbd5e1; background: #fff; color: #334155; font-size: 1.25rem; line-height: 1; cursor: pointer; padding: 0; box-shadow: 0 1px 4px rgba(15,23,42,0.08); }
          .page-content .page-web-carousel-arrow:hover { background: #f8fafc; color: #0f172a; }
          .page-content .page-web-carousel-arrow:disabled { opacity: 0.45; cursor: not-allowed; background: #f8fafc; color: #94a3b8; border-color: #e2e8f0; box-shadow: none; }
          .page-content .page-web-carousel-prev { order: 1; }
          .page-content .page-web-carousel-next { order: 3; }
          .page-content .page-web-carousel-viewport { order: 2; position: relative; z-index: 0; flex: 1 1 0; min-width: 0; width: 100%; max-width: 100%; margin: 0; box-sizing: border-box; border-radius: 8px; background: transparent; min-height: 180px; scrollbar-width: thin; scrollbar-color: rgba(100, 116, 139, 0.45) transparent; display: grid; grid-auto-flow: column; grid-auto-columns: calc((100% - 16px) / 3); gap: 8px; overflow-x: auto; overflow-y: visible; }
          .page-content .page-web-carousel-viewport:not(:has(.page-web-carousel-strip)) { scroll-snap-type: x mandatory; scroll-snap-stop: always; -webkit-overflow-scrolling: touch; }
          .page-content .page-web-carousel-viewport:has(.page-web-carousel-strip) { display: block; padding: 14px 0; container-type: inline-size; container-name: web-carousel-vp; overflow-x: hidden; overflow-y: visible; -webkit-overflow-scrolling: touch; scrollbar-width: thin; scrollbar-color: rgba(100, 116, 139, 0.45) transparent; scroll-snap-type: none; }
          .page-content .page-web-carousel-strip { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, var(--carousel-slide-px, calc((max(0px, var(--carousel-inner-px, 100cqi)) - 16px) / 3))); align-items: stretch; gap: 8px; width: max-content; min-width: 100%; box-sizing: border-box; min-height: 0; }
          .page-content .page-web-carousel[data-carousel-aspect="vertical"] .page-web-carousel-viewport,
          .page-content .page-web-carousel[data-carousel-aspect="square"] .page-web-carousel-viewport,
          .page-content .page-web-carousel[data-carousel-aspect="a4"] .page-web-carousel-viewport { grid-auto-columns: calc((100% - 24px) / 4); }
          .page-content .page-web-carousel[data-carousel-aspect="vertical"] .page-web-carousel-strip,
          .page-content .page-web-carousel[data-carousel-aspect="square"] .page-web-carousel-strip,
          .page-content .page-web-carousel[data-carousel-aspect="a4"] .page-web-carousel-strip { grid-auto-columns: minmax(0, var(--carousel-slide-px, calc((max(0px, var(--carousel-inner-px, 100cqi)) - 24px) / 4))); }
          @media (max-width: 1023px) {
            .page-content .page-web-carousel-viewport { grid-auto-columns: calc((100% - 8px) / 2); }
            .page-content .page-web-carousel-strip { grid-auto-columns: minmax(0, var(--carousel-slide-px, calc((max(0px, var(--carousel-inner-px, 100cqi)) - 8px) / 2))); }
            .page-content .page-web-carousel[data-carousel-aspect="vertical"] .page-web-carousel-viewport,
            .page-content .page-web-carousel[data-carousel-aspect="square"] .page-web-carousel-viewport,
            .page-content .page-web-carousel[data-carousel-aspect="a4"] .page-web-carousel-viewport { grid-auto-columns: calc((100% - 16px) / 3); }
            .page-content .page-web-carousel[data-carousel-aspect="vertical"] .page-web-carousel-strip,
            .page-content .page-web-carousel[data-carousel-aspect="square"] .page-web-carousel-strip,
            .page-content .page-web-carousel[data-carousel-aspect="a4"] .page-web-carousel-strip { grid-auto-columns: minmax(0, var(--carousel-slide-px, calc((max(0px, var(--carousel-inner-px, 100cqi)) - 16px) / 3))); }
          }
          @media (max-width: 767px) {
            .page-content .page-web-carousel-viewport { grid-auto-columns: 100%; }
            .page-content .page-web-carousel-strip { grid-auto-columns: minmax(0, var(--carousel-slide-px, max(0px, var(--carousel-inner-px, 100cqi)))); }
            .page-content .page-web-carousel[data-carousel-aspect="vertical"] .page-web-carousel-viewport,
            .page-content .page-web-carousel[data-carousel-aspect="square"] .page-web-carousel-viewport,
            .page-content .page-web-carousel[data-carousel-aspect="a4"] .page-web-carousel-viewport { grid-auto-columns: calc((100% - 8px) / 2); }
            .page-content .page-web-carousel[data-carousel-aspect="vertical"] .page-web-carousel-strip,
            .page-content .page-web-carousel[data-carousel-aspect="square"] .page-web-carousel-strip,
            .page-content .page-web-carousel[data-carousel-aspect="a4"] .page-web-carousel-strip { grid-auto-columns: minmax(0, var(--carousel-slide-px, calc((max(0px, var(--carousel-inner-px, 100cqi)) - 8px) / 2))); }
          }
          .page-content .page-web-carousel-slide { position: relative; z-index: 2; box-sizing: border-box; padding: 0; }
          .page-content .page-web-carousel-viewport:not(:has(.page-web-carousel-strip)) .page-web-carousel-slide { min-width: 0; scroll-snap-align: start; scroll-snap-stop: always; width: auto; max-width: none; }
          .page-content .page-web-carousel-strip .page-web-carousel-slide { min-width: 0; width: 100%; max-width: none; scroll-snap-align: start; scroll-snap-stop: always; }
          .page-content .page-web-carousel-slide-inner { position: relative; z-index: 3; width: 100%; aspect-ratio: 16 / 9; min-height: 0; border-radius: 6px; overflow: hidden; background: #e2e8f0; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 2px rgba(15,23,42,0.06), 0 4px 12px rgba(15,23,42,0.08), 0 0 0 1px rgba(15,23,42,0.06); }
          .page-content .page-web-carousel[data-carousel-aspect="vertical"] .page-web-carousel-slide-inner { aspect-ratio: 9 / 16; }
          .page-content .page-web-carousel[data-carousel-aspect="square"] .page-web-carousel-slide-inner { aspect-ratio: 1 / 1; }
          .page-content .page-web-carousel[data-carousel-aspect="a4"] .page-web-carousel-slide-inner { aspect-ratio: 210 / 297; }
          .page-content .page-web-carousel-slide-inner:has(.page-web-carousel-img) { background: transparent; }
          .page-content .page-web-carousel-placeholder { position: relative; z-index: 0; padding: 1rem; text-align: center; font-size: 14px; color: #64748b; }
          .page-content .page-web-carousel-slide-inner:has(.page-web-carousel-img) .page-web-carousel-placeholder { display: none; }
          .page-content .page-web-carousel-img { position: absolute; inset: 0; z-index: 1; display: block; width: 100%; height: 100%; object-fit: cover; object-position: center; margin: 0; border-radius: 6px; }
          .page-content .page-web-carousel-viewport::-webkit-scrollbar { height: 5px; width: 5px; }
          .page-content .page-web-carousel-viewport::-webkit-scrollbar-track { background: transparent; }
          .page-content .page-web-carousel-viewport::-webkit-scrollbar-thumb { background-color: rgba(100, 116, 139, 0.35); border-radius: 999px; }
          .page-content .page-web-carousel-viewport::-webkit-scrollbar-thumb:hover { background-color: rgba(71, 85, 105, 0.5); }
          `}</style>
        </section>
      </div>
    </div>
  );
}
