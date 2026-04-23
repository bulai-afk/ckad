"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactElement } from "react";
import {
  normalizePageDisplayOrderMap,
  sortBySectionDisplayOrder,
  type PageDisplayOrderMap,
} from "@/lib/pageDisplayOrder";

const CATALOG_ROOT = "catalogization";
const TRAINING_ROOT = "training-center";

const FALLBACK_CATALOG_LINKS = [
  { href: "#", label: "Систематизация данных" },
  { href: "#", label: "Паспортизация объектов" },
  { href: "#", label: "Архив и реестры" },
] as const;

const FALLBACK_TRAINING_LINKS = [
  { href: "#", label: "Курсы и программы" },
  { href: "#", label: "Расписание" },
  { href: "#", label: "Сертификация" },
] as const;

function normalizeSlugPath(slug: string): string {
  return slug
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .toLowerCase();
}

function buildFooterSectionLinks(
  pages: { title: string; slug: string; status?: string }[],
  rootSlug: string,
  orderBySection: PageDisplayOrderMap,
): { href: string; label: string }[] {
  const root = normalizeSlugPath(rootSlug);
  const seen = new Set<string>();
  const links: { href: string; label: string; slugPath: string; sourceIndex: number }[] = [];

  for (let sourceIndex = 0; sourceIndex < pages.length; sourceIndex += 1) {
    const p = pages[sourceIndex];
    const normalizedSlug = normalizeSlugPath(String(p.slug || ""));
    if (!normalizedSlug.startsWith(`${root}/`)) continue;
    if (String(p.status).toUpperCase() !== "PUBLISHED") continue;
    const key = normalizedSlug.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    links.push({
      href: `/${normalizedSlug}`,
      label: String(p.title || "").trim() || normalizedSlug.split("/").pop() || "Страница",
      slugPath: normalizedSlug,
      sourceIndex,
    });
  }

  const sorted = sortBySectionDisplayOrder(
    links,
    root,
    (item) => item.slugPath,
    orderBySection,
    (a, b) => a.sourceIndex - b.sourceIndex,
  );
  return sorted.map(({ href, label }) => ({ href, label }));
}

const footerLinkClass =
  "text-sm leading-snug text-gray-600 transition hover:text-gray-900 min-h-10 inline-flex items-center rounded-md py-0.5 sm:min-h-0 sm:py-0";
const PDF_WORKER_SRC = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

type SiteSettings = {
  email: string;
  phone: string;
  address: string;
  social: {
    vk: string;
    telegram: string;
    max: string;
    whatsapp: string;
  };
  requisites: {
    companyName: string;
    inn: string;
    kpp: string;
    ogrn: string;
  };
  documents?: {
    name: string;
    size: number;
    dataUrl: string;
  }[];
};

type FooterPageRow = {
  id?: number;
  title: string;
  slug: string;
  status?: string;
};

const colHeadingClass = "text-sm font-semibold leading-tight text-gray-900";

type SocialDef = {
  key: keyof SiteSettings["social"];
  label: string;
  svg: ReactElement;
  externalSvgSrc?: string;
};
const SOCIAL_DEFS: SocialDef[] = [
  {
    key: "vk",
    label: "ВКонтакте",
    svg: (
      <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.392 0 15.684 0zm3.692 17.229h-1.743c-.66 0-.864-.525-2.05-1.727-1.033-1-1.49-1.135-1.744-1.135-.356 0-.458.102-.458.593v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C4.624 10.857 4 8.657 4 8.086c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.678.863 2.455 2.303 4.607 2.896 4.607.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.203.17-.407.44-.407h2.744c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.135.813-.542 1.253-1.406 2.151-3.574 2.151-3.574.119-.254.322-.491.763-.491h1.744c.525 0 .644.27.525.643-.203.813-1.338 2.658-2.337 3.912-.186.237-.254.373 0 .678.186.237.797.779 1.016 1.253.305.678.508 1.186.186 1.27z" />
    ),
  },
  {
    key: "telegram",
    label: "Telegram",
    svg: (
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    ),
  },
  {
    key: "max",
    label: "Max",
    externalSvgSrc: "/max-logo-indigo.svg",
    svg: <path d="M6 18V6h3l3 5 3-5h3v12h-2V9l-4 7-4-7v9H6z" />,
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    svg: (
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    ),
  },
];

function FooterBrandLink() {
  return (
    <Link
      href="/"
      className="-m-1 inline-block max-w-full p-1 text-gray-900 transition hover:opacity-90"
    >
      <span className="sr-only">Центр каталогизации и анализа данных — на главную</span>
      <img
        src="/logo.svg"
        alt=""
        className="h-7 w-auto max-w-full object-contain"
      />
    </Link>
  );
}

function FooterSocialList({
  items,
}: {
  items: { href: string; label: string; svg: ReactElement; externalSvgSrc?: string }[];
}) {
  if (items.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-x-2 gap-y-1" aria-label="Социальные сети">
      {items.map((item) => (
        <li key={item.label}>
          <a
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={item.label}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
          >
            {item.externalSvgSrc ? (
              <img src={item.externalSvgSrc} alt="" aria-hidden className="h-5 w-5 object-contain" />
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="currentColor" aria-hidden>
                {item.svg}
              </svg>
            )}
          </a>
        </li>
      ))}
    </ul>
  );
}

function toNavItems<const T extends readonly { href: string; label: string }[]>(arr: T): { href: string; label: string }[] {
  return arr.map((x) => ({ href: x.href, label: x.label }));
}

function filenameWithoutExtension(name: string): string {
  return name.replace(/\.[^/.]+$/, "");
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(",");
  const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function SiteFooter({ siteSettings }: { siteSettings?: SiteSettings | null }) {
  const pathname = usePathname();
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const previewViewportRef = useRef<HTMLDivElement>(null);
  const [catalogItems, setCatalogItems] = useState<{ href: string; label: string }[]>(() =>
    toNavItems(FALLBACK_CATALOG_LINKS),
  );
  const [trainingItems, setTrainingItems] = useState<{ href: string; label: string }[]>(() =>
    toNavItems(FALLBACK_TRAINING_LINKS),
  );
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [pdfLoadState, setPdfLoadState] = useState<"idle" | "loading" | "error" | "ready">("idle");
  const [pageCount, setPageCount] = useState(0);

  const hidden = useMemo(() => pathname?.startsWith("/admin"), [pathname]);

  useEffect(() => {
    if (hidden) return;
    let cancelled = false;

    void Promise.all([
      fetch("/api/pages", { cache: "no-store" }),
      fetch("/api/pages/display-order", { cache: "no-store" }),
    ])
      .then(async (res) => {
        const [pagesRes, orderRes] = res;
        if (!pagesRes.ok) throw new Error("pages_fetch_failed");
        const rows = (await pagesRes.json()) as FooterPageRow[];
        if (!Array.isArray(rows)) throw new Error("pages_invalid_payload");
        const orderPayload = orderRes.ok
          ? ((await orderRes.json()) as { orderBySection?: unknown })
          : {};
        const orderBySection = normalizePageDisplayOrderMap(orderPayload?.orderBySection);

        const pageRows = rows.filter((row) => typeof row?.slug === "string" && row.slug.trim() !== "");
        const catalogLinks = buildFooterSectionLinks(pageRows, CATALOG_ROOT, orderBySection);
        const trainingLinks = buildFooterSectionLinks(pageRows, TRAINING_ROOT, orderBySection);

        if (cancelled) return;
        if (catalogLinks.length > 0) {
          setCatalogItems(catalogLinks);
        }
        if (trainingLinks.length > 0) {
          setTrainingItems(trainingLinks);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setCatalogItems(toNavItems(FALLBACK_CATALOG_LINKS));
        setTrainingItems(toNavItems(FALLBACK_TRAINING_LINKS));
      });

    return () => {
      cancelled = true;
    };
  }, [hidden]);

  const year = new Date().getFullYear();
  const email = (siteSettings?.email || "").trim() || "info@центр-каталогизации.рф";
  const mailtoHref = `mailto:${email}`;
  const phoneLabel = (siteSettings?.phone || "").trim() || "+7 (495) 123-45-67";
  const phoneHref = (() => {
    const raw = (siteSettings?.phone || "").trim();
    const digits = raw.replace(/[^\d+]/g, "");
    return digits ? `tel:${digits}` : "tel:+74951234567";
  })();
  const address =
    (siteSettings?.address || "").trim() || "г. Москва, набережная примерная, д. 1";
  const reqCompany =
    (siteSettings?.requisites?.companyName || "").trim() ||
    "ООО «Центр каталогизации и анализа данных»";
  const reqInn = (siteSettings?.requisites?.inn || "").trim() || "0000000000";
  const reqKpp = (siteSettings?.requisites?.kpp || "").trim() || "000000000";
  const reqOgrn = (siteSettings?.requisites?.ogrn || "").trim() || "0000000000000";

  const socialItems = SOCIAL_DEFS.map((d) => ({
    href: String(siteSettings?.social?.[d.key] ?? "").trim(),
    label: d.label,
    svg: d.svg,
    externalSvgSrc: d.externalSvgSrc,
  })).filter((i) => i.href);

  const footerDocuments = (siteSettings?.documents ?? [])
    .filter((doc) => typeof doc?.name === "string" && /^data:application\/pdf;base64,/i.test(String(doc?.dataUrl ?? "")))
    .slice(0, 3);
  const previewFile = previewIndex !== null ? footerDocuments[previewIndex] ?? null : null;

  useEffect(() => {
    if (previewIndex === null) return;
    if (previewIndex < footerDocuments.length) return;
    setPreviewIndex(null);
  }, [previewIndex, footerDocuments.length]);

  useEffect(() => {
    if (!previewFile) return;
    let disposed = false;
    let loadingTask: { promise: Promise<unknown>; destroy?: () => Promise<void> } | null = null;
    let loadedPdf: {
      numPages: number;
      destroy?: () => Promise<void>;
      getPage: (num: number) => Promise<{
        getViewport: (params: { scale: number }) => { width: number; height: number };
        render: (params: {
          canvasContext: CanvasRenderingContext2D;
          viewport: { width: number; height: number };
        }) => { promise: Promise<unknown> };
      }>;
    } | null = null;

    const renderPdf = async () => {
      try {
        setPdfLoadState("loading");
        const pdfjs = await import("pdfjs-dist/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;
        const data = dataUrlToUint8Array(previewFile.dataUrl);
        loadingTask = pdfjs.getDocument({ data });
        loadedPdf = (await loadingTask.promise) as NonNullable<typeof loadedPdf>;
        if (disposed || !loadedPdf) return;

        const nextPageCount = Number(loadedPdf.numPages || 0);
        canvasRefs.current = [];
        setPageCount(nextPageCount);
        setPdfLoadState("ready");

        await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
        await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
        if (disposed) return;

        const hostWidth = previewViewportRef.current?.clientWidth ?? window.innerWidth;
        const targetWidth = Math.max(320, Math.min(980, Math.floor(hostWidth - 24)));

        for (let pageNum = 1; pageNum <= nextPageCount; pageNum += 1) {
          if (disposed) break;
          const page = await loadedPdf.getPage(pageNum);
          const baseViewport = page.getViewport({ scale: 1 });
          const scale = targetWidth / baseViewport.width;
          const viewport = page.getViewport({ scale });
          const canvas = canvasRefs.current[pageNum - 1];
          if (!canvas) continue;
          const context = canvas.getContext("2d", { alpha: false });
          if (!context) continue;
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          await page.render({ canvasContext: context, viewport }).promise;
        }
      } catch {
        if (!disposed) setPdfLoadState("error");
      }
    };

    void renderPdf();

    return () => {
      disposed = true;
      setPdfLoadState("idle");
      setPageCount(0);
      void loadingTask?.destroy?.();
      void loadedPdf?.destroy?.();
    };
  }, [previewFile]);

  useEffect(() => {
    if (previewIndex === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewIndex(null);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [previewIndex]);

  if (hidden) return null;

  return (
    <footer className="mt-auto w-full shrink-0 border-t border-gray-900/10 bg-white pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-7xl px-6 py-4 sm:py-8 lg:px-8">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-6 lg:grid-cols-4 lg:gap-6">
          <div className="min-w-0 text-center sm:text-left">
            <FooterBrandLink />
            <div className="mt-2 sm:mt-3">
              <p className={`hidden sm:block ${colHeadingClass}`}>Документы</p>
              <ul className="mt-1.5 space-y-0.5" role="list">
                {footerDocuments.map((doc, i) => (
                  <li key={`${doc.name}-${doc.size}`}>
                    <button
                      type="button"
                      onClick={() => setPreviewIndex(i)}
                      className={`${footerLinkClass} cursor-pointer border-0 bg-transparent p-0 text-left`}
                    >
                      {filenameWithoutExtension(doc.name)}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="hidden min-w-0 text-center sm:block sm:text-left">
            <p className={colHeadingClass}>Каталогизация</p>
            <ul className="mt-1.5 space-y-0.5" role="list" aria-label="Разделы каталогизации в подвале">
              {catalogItems.map((item) => (
                <li key={`${item.href}-${item.label}`}>
                  {item.href.startsWith("/") ? (
                    <Link href={item.href} className={footerLinkClass}>
                      {item.label}
                    </Link>
                  ) : (
                    <a href={item.href} className={footerLinkClass}>
                      {item.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="hidden min-w-0 text-center sm:block sm:text-left">
            <p className={colHeadingClass}>Учебный центр</p>
            <ul className="mt-1.5 space-y-0.5" role="list" aria-label="Разделы учебного центра в подвале">
              {trainingItems.map((item) => (
                <li key={`${item.href}-${item.label}`}>
                  {item.href.startsWith("/") ? (
                    <Link href={item.href} className={footerLinkClass}>
                      {item.label}
                    </Link>
                  ) : (
                    <a href={item.href} className={footerLinkClass}>
                      {item.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="min-w-0 text-center sm:text-left">
            <p className={colHeadingClass}>Контакты</p>
            <div className="mt-1 flex flex-col items-center gap-1.5 sm:mt-1.5 sm:items-start">
              <a
                href={phoneHref}
                className="text-sm font-semibold leading-tight text-gray-900 transition hover:text-[#496db3]"
              >
                {phoneLabel}
              </a>
              <a
                href={mailtoHref}
                className="text-sm font-semibold leading-tight text-gray-900 transition hover:text-[#496db3]"
              >
                {email}
              </a>
              <p className="max-w-xs text-sm leading-snug text-gray-600">{address}</p>
              <Link href="/about" className={`${footerLinkClass} !hidden min-h-0 py-0 font-semibold sm:!inline-flex`}>
                О компании
              </Link>
              <FooterSocialList items={socialItems} />
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-900/10 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 py-2.5 lg:px-8">
          <p className="text-center text-xs leading-snug text-gray-500">
            © {year} {reqCompany} · ИНН {reqInn} · КПП {reqKpp} · ОГРН {reqOgrn}
          </p>
        </div>
      </div>

      {previewFile ? (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
          aria-label={`Просмотр документа ${previewFile.name}`}
          onClick={() => setPreviewIndex(null)}
        >
          <div
            className="flex h-[min(86vh,820px)] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3">
              <div className="min-w-0 pr-3">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {filenameWithoutExtension(previewFile.name)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewIndex(null)}
                className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Закрыть просмотр документа"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div ref={previewViewportRef} className="flex-1 overflow-y-auto bg-white p-3">
              {pdfLoadState === "loading" ? (
                <p className="py-10 text-center text-sm text-slate-500">Загрузка документа...</p>
              ) : null}
              {pdfLoadState === "error" ? (
                <p className="py-10 text-center text-sm text-red-600">Не удалось отобразить PDF.</p>
              ) : null}
              {pdfLoadState === "ready" && pageCount > 0 ? (
                <div className="mx-auto flex w-full max-w-[980px] flex-col gap-3">
                  {Array.from({ length: pageCount }, (_, idx) => (
                    <canvas
                      key={idx + 1}
                      ref={(node) => {
                        canvasRefs.current[idx] = node;
                      }}
                      className="w-full bg-white"
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </footer>
  );
}
