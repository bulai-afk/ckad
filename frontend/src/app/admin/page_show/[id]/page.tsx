"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ApiRequestError, apiGet, isPageByIdApiPath } from "@/lib/api";
import { adminPageIdFromParams } from "@/lib/adminPageIdFromParams";
import { getSharedWebBlocksCss } from "@/lib/sharedWebBlocksCss";
import { ensureCoverBgLayers, getPageShowRenderCss, getPricingTiersRenderCss, getTimelineRenderCss, getWorkPricingRenderCss } from "@/lib/pageShowRender";

type Block = {
  id: number;
  type: string;
  data?: { text?: string };
};

type PageDetails = {
  id: number;
  title: string;
  slug: string;
  blocks: Block[];
};

const PREVIEW_BASE_WIDTH = 1120;

export default function AdminPageShowPreview() {
  const params = useParams<{ id?: string | string[] }>();
  const pageId = useMemo(() => adminPageIdFromParams(params ?? null), [params]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageMissingInDb, setPageMissingInDb] = useState(false);
  const [page, setPage] = useState<PageDetails | null>(null);
  const [previewScale, setPreviewScale] = useState(1);
  const [previewScaledHeight, setPreviewScaledHeight] = useState<number | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const previewViewportRef = useRef<HTMLDivElement | null>(null);
  const previewCanvasRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!Number.isFinite(pageId)) {
      setError("Некорректный ID страницы");
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        setError(null);
        setPageMissingInDb(false);
        const data = await apiGet<PageDetails>(`/api/pages/${pageId}`, 120_000);
        if (cancelled) return;
        setPage(data);
      } catch (e) {
        if (cancelled) return;
        console.error("[page_show] load failed", e);
        const notFound =
          e instanceof ApiRequestError &&
          e.status === 404 &&
          isPageByIdApiPath(`/api/pages/${pageId}`);
        if (notFound) {
          setPageMissingInDb(true);
          setError(
            `Страницы с id «${pageId}» в базе нет. Откройте предпросмотр из списка «Страницы» или из редактора существующей страницы.`,
          );
        } else {
          setError(
            e instanceof Error && e.message.trim()
              ? e.message
              : "Не удалось загрузить страницу предпросмотра",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pageId]);

  const textHtml = useMemo(() => {
    const blocks = page?.blocks;
    const block = Array.isArray(blocks) ? blocks.find((b) => b.type === "text") : undefined;
    return typeof block?.data?.text === "string" ? block.data.text : "";
  }, [page]);

  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;
    ensureCoverBgLayers(root);
  }, [textHtml, previewScale]);

  useEffect(() => {
    const viewport = previewViewportRef.current;
    const canvas = previewCanvasRef.current;
    if (!viewport || !canvas) return;

    const recalc = () => {
      const vw = Math.max(1, viewport.clientWidth);
      const nextScale = vw / PREVIEW_BASE_WIDTH;
      const baseHeight = Math.max(canvas.scrollHeight, canvas.offsetHeight, 1);
      setPreviewScale(nextScale);
      setPreviewScaledHeight(baseHeight * nextScale);
    };

    recalc();
    const observer = new ResizeObserver(recalc);
    observer.observe(viewport);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [textHtml, loading, error]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="w-full py-4">
        <div className="mb-3 flex items-center justify-between gap-3 px-4 sm:px-6">
            <h1 className="text-sm font-semibold text-slate-900">
              {page?.title || "Предпросмотр страницы"}
            </h1>
            <div className="flex items-center gap-2">
              {page?.slug ? (
                <a
                  href={`/${page.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Открыть публичную версию
                </a>
              ) : null}
              <Link
                href={Number.isFinite(pageId) ? `/admin/page_editor/${pageId}` : "/admin/page_editor"}
                className="inline-flex items-center rounded-full bg-[#496db3] px-4 py-1.5 text-xs font-medium text-white hover:brightness-105"
              >
                Вернуться в редактор
              </Link>
            </div>
          </div>
        <div className="bg-transparent">
          {loading ? <p className="px-4 text-sm text-slate-500 sm:px-6">Загрузка…</p> : null}
          {!loading && error ? (
            <div className="space-y-2 px-4 text-sm text-red-600 sm:px-6">
              <p>{error}</p>
              {pageMissingInDb ? (
                <p>
                  <Link
                    href="/admin/page"
                    className="font-medium text-[#496db3] underline decoration-[#496db3]/40 underline-offset-2 hover:decoration-[#496db3]"
                  >
                    Перейти к списку страниц
                  </Link>
                </p>
              ) : null}
            </div>
          ) : null}
          {!loading && !error ? (
            <div ref={previewViewportRef} className="w-full overflow-hidden">
              <div
                style={{
                  height: previewScaledHeight !== null ? `${previewScaledHeight}px` : undefined,
                }}
              >
                <main
                  ref={previewCanvasRef}
                  className="page-editor text-[12px]"
                  style={{
                    width: `${PREVIEW_BASE_WIDTH}px`,
                    transform: `scale(${previewScale})`,
                    transformOrigin: "top left",
                  }}
                >
                  <div
                    ref={contentRef}
                    className="page-content"
                    dangerouslySetInnerHTML={{ __html: textHtml }}
                  />
                </main>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <style>{`
        .page-editor .page-content { padding: 0 1rem 1rem; box-sizing: border-box; }
        ${getSharedWebBlocksCss(".page-editor .page-content")}
        ${getTimelineRenderCss(".page-editor .page-content")}
        ${getPageShowRenderCss(".page-editor .page-content")}
        .page-editor,
        .page-editor .page-content {
          background: transparent !important;
        }
        .page-editor .page-content .page-web-text-media-col,
        .page-editor .page-content .page-web-text-media-col--text,
        .page-editor .page-content .page-web-text-block:not([data-text-block-variant="feature-grid"]):not([data-text-block-variant="work-pricing"]):not([data-text-block-variant="pricing-tiers"]) {
          background: #fff !important;
          border-color: rgba(226, 232, 240, 0.6) !important;
        }
        .page-editor .page-content .page-web-feature-grid-image {
          border: none !important;
        }
        ${getWorkPricingRenderCss(".page-editor .page-content")}
        ${getPricingTiersRenderCss(".page-editor .page-content")}
      `}</style>
    </div>
  );
}

