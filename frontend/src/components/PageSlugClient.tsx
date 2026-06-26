"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronRightIcon, HomeIcon } from "@heroicons/react/20/solid";
import { PublicCarouselViewportSync } from "@/components/PublicCarouselViewportSync";
import { HomeServicesFolderCards } from "@/components/HomeServicesFolderCards";
import { CallbackRequestModal } from "@/components/CallbackRequestModal";
import { SiteDocumentHtmlDialog } from "@/components/SiteDocumentHtmlDialog";
import {
  applyPublicWebCtaLinkTargets,
  handleBannerCtaClick,
  PUBLIC_WEB_CTA_LINK_SELECTOR,
  readWebCtaHref,
} from "@/lib/bannerCtaNavigation";
import { ensureCoverBgLayers } from "@/lib/pageShowRender";
import {
  getPublicPageClientCss,
  PUBLIC_PAGE_CONTENT_READY_ATTR,
} from "@/lib/publicPageClientCss";
import {
  clearTimelineTextareaInlineWidthsInRoot,
  layoutWebElementsV2TextareasInRoot,
} from "@/lib/webElementsTextareaLayout";
import { normalizeFeatureGridContentWrapInRoot } from "@/lib/featureGridContentWrap";
import { stripLegacyTimelineDomInRoot } from "@/lib/stripLegacyTimelineDom";
import {
  ensureWebAccordionFaqItemsInRoot,
  initWebAccordionFaqInRoot,
  normalizeWebAccordionFaqForPublish,
} from "@/lib/webAccordionFaq";
import { syncWebElementsFieldRowJustifyInRoot } from "@/lib/webElementsFieldRowJustify";
import type { ServiceTreeNode } from "@/lib/serviceTree";

type Block = {
  id: number;
  type: string;
  data: { text?: string };
};

export type PageData = {
  title: string;
  slug: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  keywords?: string | null;
  preview?: string | null;
  blocks: Block[];
};

type PageSlugClientProps = {
  slugParts: string[];
  page: PageData | null;
  serviceFolderHub: ServiceTreeNode | null;
};

export function PageSlugClient({ slugParts, page, serviceFolderHub }: PageSlugClientProps) {
  const contentRootRef = useRef<HTMLElement | null>(null);
  const [callbackModalOpen, setCallbackModalOpen] = useState(false);
  const [documentDialogIndex, setDocumentDialogIndex] = useState<number | null>(null);
  const publicPageCss = useMemo(() => getPublicPageClientCss(), []);

  useEffect(() => {
    if (!page) return;
    const root = contentRootRef.current;
    if (!root) return;
    ensureCoverBgLayers(root);
  }, [page]);

  /** До отрисовки: readonly, rows=1 (убирает UA-высоту по rows из HTML), затем layout textarea — иначе один кадр с лишним зазором под заголовком. */
  useLayoutEffect(() => {
    if (!page) return;
    const root = contentRootRef.current;
    if (!root) return;
    stripLegacyTimelineDomInRoot(root);
    normalizeFeatureGridContentWrapInRoot(root);
    const lockPublicWebBlockFields = () => {
      root.querySelectorAll("[contenteditable]").forEach((node) => {
        if (node instanceof HTMLElement && node.getAttribute("contenteditable") !== "false") {
          node.setAttribute("contenteditable", "false");
        }
      });
      root
        .querySelectorAll(
          ".page-web-text-block-subtitle-input, .page-web-text-block-title-input, .page-web-text-block-lead-input, .page-web-elements-announcement-input, .page-web-elements-title-input, .page-web-elements-title2-input, .page-web-elements-subtitle-input, .page-web-elements-description-input, .page-web-accordion-question-input, .page-web-accordion-answer-input",
        )
        .forEach((node) => {
          if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) {
            node.readOnly = true;
            node.setAttribute("readonly", "");
            node.setAttribute("tabindex", "-1");
            node.removeAttribute("placeholder");
          }
          if (node instanceof HTMLTextAreaElement) {
            node.setAttribute("rows", "1");
          }
        });
      root.querySelectorAll("textarea[placeholder], input[placeholder]").forEach((node) => {
        if (node instanceof HTMLTextAreaElement || node instanceof HTMLInputElement) {
          node.removeAttribute("placeholder");
        }
      });
    };

    lockPublicWebBlockFields();
    ensureWebAccordionFaqItemsInRoot(root);
    normalizeWebAccordionFaqForPublish(root);
    lockPublicWebBlockFields();
    applyPublicWebCtaLinkTargets(root);
    const teardownAccordion = initWebAccordionFaqInRoot(root);

    const layout = () => {
      clearTimelineTextareaInlineWidthsInRoot(root);
      syncWebElementsFieldRowJustifyInRoot(root);
      layoutWebElementsV2TextareasInRoot(root);
      clearTimelineTextareaInlineWidthsInRoot(root);
      ensureCoverBgLayers(root);
    };
    layout();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(layout) : null;
    ro?.observe(root);
    window.addEventListener("resize", layout);
    void document.fonts?.ready?.then(layout);
    root.setAttribute(PUBLIC_PAGE_CONTENT_READY_ATTR, "1");
    return () => {
      root.removeAttribute(PUBLIC_PAGE_CONTENT_READY_ATTR);
      teardownAccordion();
      ro?.disconnect();
      window.removeEventListener("resize", layout);
    };
  }, [page]);

  if (!page && serviceFolderHub) {
    const sectionDescription =
      serviceFolderHub.description?.trim() ||
      "Закрываем задачи «под ключ» в области каталогизации и анализа данных: от методики до сопровождения согласований — чтобы вы получали понятный результат в срок и без лишних рисков.";

    return (
      <div className="bg-slate-100 text-slate-900">
        <div className="px-4 py-6 sm:px-6 lg:px-10">
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
                  href="/catalogization"
                  className="rounded px-1 py-0.5 text-slate-600 hover:bg-slate-200 hover:text-slate-800"
                >
                  Каталогизация
                </Link>
                <ChevronRightIcon className="h-4 w-4 text-slate-400" />
                <span className="rounded px-1 py-0.5 text-slate-700">{serviceFolderHub.label}</span>
              </nav>
              <div className="mb-4" style={{ fontSize: "clamp(13px, 0.7vw, 14px)" }}>
                <p className="whitespace-pre-wrap text-center font-semibold text-[#496db3]" style={{ fontSize: "112%", lineHeight: 1.35 }}>
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
            </section>
          </div>
        </div>
      </div>
    );
  }

  if (!page) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto w-full pb-6 pt-0">
        <section>
          <PublicCarouselViewportSync />
          <style>{publicPageCss}</style>
          <main
            ref={contentRootRef}
            className="page-editor goz-full-width w-full service-page-content-root"
            onClick={(e) => {
              const target = e.target as HTMLElement;
              const link = target.closest?.(PUBLIC_WEB_CTA_LINK_SELECTOR) as HTMLAnchorElement | null;
              if (!link) return;
              handleBannerCtaClick(e, readWebCtaHref(link), {
                onPrimaryClick: () => setCallbackModalOpen(true),
                onDocumentClick: (index) => setDocumentDialogIndex(index),
              });
            }}
          >
            {page.blocks.map((block) => {
              if (
                ["summary", "preview", "keywords", "seo_title", "seo_description", "article_kind"].includes(
                  block.type,
                )
              ) {
                return null;
              }
              if (block.type === "text") {
                const html = typeof block.data.text === "string" ? block.data.text : "";
                return (
                  <div
                    key={block.id}
                    className="page-content text-[12px] text-slate-800"
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
              <p className="text-sm text-slate-500">У этой страницы пока нет контента.</p>
            )}
          </main>
          <CallbackRequestModal
            open={callbackModalOpen}
            onClose={() => setCallbackModalOpen(false)}
            sourceMessage="Заявка из кнопки обложки страницы."
          />
          <SiteDocumentHtmlDialog
            open={documentDialogIndex !== null}
            onClose={() => setDocumentDialogIndex(null)}
            documentIndex={documentDialogIndex}
          />
        </section>
      </div>
    </div>
  );
}

