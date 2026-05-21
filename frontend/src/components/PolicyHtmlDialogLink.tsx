"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { apiBaseUrl } from "@/lib/apiBaseUrl";
import { normalizePolicyHtml, POLICY_HTML_DOCUMENT_CLASS } from "@/lib/normalizePolicyHtml";

type SiteSettingsHtmlPayload = {
  settings?: {
    privacyPolicyHtml?: string;
    personalDataConsentHtml?: string;
  };
};

let siteSettingsHtmlCache: SiteSettingsHtmlPayload | null = null;
let siteSettingsHtmlInflight: Promise<SiteSettingsHtmlPayload> | null = null;

/** Сбросить кэш после сохранения настроек в админке. */
export function invalidateSiteSettingsHtmlCache(): void {
  siteSettingsHtmlCache = null;
  siteSettingsHtmlInflight = null;
}

async function getSiteSettingsHtmlPayload(force = false): Promise<SiteSettingsHtmlPayload> {
  if (!force && siteSettingsHtmlCache) return siteSettingsHtmlCache;
  if (!force && siteSettingsHtmlInflight) return siteSettingsHtmlInflight;
  siteSettingsHtmlInflight = (async () => {
    const res = await fetch(`${apiBaseUrl()}/api/pages/site-settings`, { cache: "no-store" });
    if (!res.ok) throw new Error(`site-settings ${res.status}`);
    const data = (await res.json().catch(() => ({}))) as SiteSettingsHtmlPayload;
    siteSettingsHtmlCache = data;
    return data;
  })()
    .catch(() => ({}) as SiteSettingsHtmlPayload)
    .finally(() => {
      siteSettingsHtmlInflight = null;
    });
  return siteSettingsHtmlInflight;
}

const inlineDocLinkButtonClass =
  "inline max-w-full cursor-pointer select-none border-0 bg-transparent p-0 text-left font-inherit align-baseline text-inherit shadow-none outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#496db3] disabled:cursor-wait";

export type PolicyHtmlDialogLinkProps = {
  className?: string;
  text?: string;
  settingsHtmlKey: "privacyPolicyHtml" | "personalDataConsentHtml";
  dialogAriaLabel: string;
  closeButtonAriaLabel: string;
  defaultText: string;
  /** Текст в модальном окне, если HTML документа в настройках пустой. */
  emptyDocumentMessage: string;
};

/** Общая реализация: загрузка HTML из site-settings и тот же портальный диалог для политики и согласия. */
export function PolicyHtmlDialogLink({
  className,
  text,
  settingsHtmlKey,
  dialogAriaLabel,
  closeButtonAriaLabel,
  defaultText,
  emptyDocumentMessage,
}: PolicyHtmlDialogLinkProps) {
  const displayText = text ?? defaultText;
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [html, setHtml] = useState("");
  const [open, setOpen] = useState(false);
  const hasContent = html.trim().length > 0;

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const data = await getSiteSettingsHtmlPayload(true);
        const raw = data?.settings?.[settingsHtmlKey];
        const policyHtml = typeof raw === "string" ? raw.trim() : "";
        if (cancelled) return;
        const baseOrigin = typeof window !== "undefined" ? window.location.origin : "";
        setHtml(normalizePolicyHtml(policyHtml, baseOrigin));
      } catch {
        if (!cancelled) setHtml("");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, settingsHtmlKey]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const triggerClass = [inlineDocLinkButtonClass, className].filter(Boolean).join(" ");

  return (
    <>
      <button
        type="button"
        disabled={loading}
        className={triggerClass}
        aria-busy={loading || undefined}
        onClick={() => setOpen(true)}
      >
        {displayText}
      </button>
      {open && mounted
        ? createPortal(
            <div
              className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-[1px]"
              role="dialog"
              aria-modal="true"
              aria-label={dialogAriaLabel}
              onClick={() => setOpen(false)}
            >
              <div
                className="flex h-[min(86vh,820px)] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-end px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                    aria-label={closeButtonAriaLabel}
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex-1 overflow-auto bg-white p-5">
                  {loading ? (
                    <p className="text-sm leading-relaxed text-slate-600">Загрузка документа…</p>
                  ) : hasContent ? (
                    <div
                      className={POLICY_HTML_DOCUMENT_CLASS}
                      dangerouslySetInnerHTML={{ __html: html }}
                    />
                  ) : (
                    <p className="text-sm leading-relaxed text-slate-600">{emptyDocumentMessage}</p>
                  )}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
