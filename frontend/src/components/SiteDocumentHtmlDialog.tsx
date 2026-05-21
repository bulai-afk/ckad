"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { apiBaseUrl } from "@/lib/apiBaseUrl";
import {
  normalizePolicyHtml,
  POLICY_HTML_DOCUMENT_CLASS,
  POLICY_HTML_DOCUMENT_LANG,
} from "@/lib/normalizePolicyHtml";
import {
  normalizeSiteDocumentsList,
  siteDocumentDisplayName,
  type SiteDocumentItem,
} from "@/lib/siteDocumentLink";

export type SiteDocumentHtmlDialogProps = {
  open: boolean;
  onClose: () => void;
  documentIndex: number | null;
  /** Если передан — не запрашиваем site-settings повторно. */
  documents?: SiteDocumentItem[];
};

export function SiteDocumentHtmlDialog({
  open,
  onClose,
  documentIndex,
  documents: documentsProp,
}: SiteDocumentHtmlDialogProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<SiteDocumentItem[]>(documentsProp ?? []);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (documentsProp) setDocuments(documentsProp);
  }, [documentsProp]);

  useEffect(() => {
    if (!open || documentsProp?.length) return;
    let cancelled = false;
    setLoading(true);
    void fetch(`${apiBaseUrl()}/api/pages/site-settings`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return;
        const payload = (await res.json()) as { settings?: { documents?: unknown } };
        if (cancelled) return;
        setDocuments(normalizeSiteDocumentsList(payload.settings?.documents));
      })
      .catch(() => {
        if (!cancelled) setDocuments([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, documentsProp]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || !mounted || documentIndex === null) return null;

  const doc = documents[documentIndex] ?? null;
  const title = doc ? siteDocumentDisplayName(doc.name) : "Документ";
  const html =
    doc && typeof window !== "undefined"
      ? normalizePolicyHtml(doc.html, window.location.origin)
      : doc?.html ?? "";

  return createPortal(
    <div
      className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-label={`Просмотр документа ${title}`}
      onClick={onClose}
    >
      <div
        className="flex h-[min(86vh,820px)] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-end px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Закрыть просмотр документа"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-auto bg-white p-5">
          {loading ? (
            <p className="text-sm text-slate-600">Загрузка документа…</p>
          ) : doc && html.trim() ? (
            <div
              lang={POLICY_HTML_DOCUMENT_LANG}
              className={POLICY_HTML_DOCUMENT_CLASS}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : (
            <p className="text-sm text-slate-600">
              Документ не найден. Загрузите HTML-файлы в разделе «Настройки сайта».
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
