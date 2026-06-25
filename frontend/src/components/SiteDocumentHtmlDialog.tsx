"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { apiBaseUrl } from "@/lib/apiBaseUrl";
import {
  normalizePolicyHtml,
  POLICY_HTML_DOCUMENT_CLASS,
  POLICY_HTML_DOCUMENT_LANG,
  POLICY_HTML_DIALOG_BODY_CLASS,
  POLICY_HTML_DIALOG_SHELL_CLASS,
} from "@/lib/normalizePolicyHtml";
import {
  normalizeSiteDocumentsList,
  siteDocumentDisplayName,
  type SiteDocumentItem,
} from "@/lib/siteDocumentLink";

export type SiteDocumentHtmlDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Индекс в settings.documents (футер). */
  documentIndex?: number | null;
  /** Прямой HTML — политика, согласие и т.п. (вместо documentIndex). */
  html?: string;
  title?: string;
  emptyMessage?: string;
  loading?: boolean;
  closeButtonAriaLabel?: string;
  /** Если передан — не запрашиваем site-settings повторно. */
  documents?: SiteDocumentItem[];
};

export function SiteDocumentHtmlDialog({
  open,
  onClose,
  documentIndex = null,
  html: htmlProp,
  title: titleProp,
  emptyMessage = "Документ не найден. Загрузите HTML-файлы в разделе «Настройки сайта».",
  loading: loadingProp = false,
  closeButtonAriaLabel = "Закрыть просмотр документа",
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

  const usesDocumentsList = documentIndex !== null && htmlProp === undefined;

  useEffect(() => {
    if (!open || !usesDocumentsList || documentsProp?.length) return;
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
  }, [open, documentsProp, usesDocumentsList]);

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

  if (!open || !mounted) return null;

  const doc = usesDocumentsList && documentIndex !== null ? documents[documentIndex] ?? null : null;
  const title = titleProp ?? (doc ? siteDocumentDisplayName(doc.name) : "Документ");
  const rawHtml = htmlProp ?? doc?.html ?? "";
  const html =
    rawHtml && typeof window !== "undefined"
      ? normalizePolicyHtml(rawHtml, window.location.origin)
      : rawHtml;
  const hasContent = html.trim().length > 0;

  return createPortal(
    <div
      className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-label={`Просмотр документа ${title}`}
      onClick={onClose}
    >
      <div
        className={POLICY_HTML_DIALOG_SHELL_CLASS}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-end px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label={closeButtonAriaLabel}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div className={POLICY_HTML_DIALOG_BODY_CLASS}>
          {(loadingProp || (loading && usesDocumentsList)) ? (
            <p className="text-sm text-slate-600">Загрузка документа…</p>
          ) : hasContent ? (
            <div
              lang={POLICY_HTML_DOCUMENT_LANG}
              className={POLICY_HTML_DOCUMENT_CLASS}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : (
            <p className="text-sm text-slate-600">{emptyMessage}</p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
