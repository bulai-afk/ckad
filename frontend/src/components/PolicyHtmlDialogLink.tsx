"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { apiBaseUrl } from "@/lib/apiBaseUrl";

type SiteSettingsHtmlPayload = {
  settings?: {
    privacyPolicyHtml?: string;
    personalDataConsentHtml?: string;
  };
};

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

function absolutizeStylesheetHrefTag(tag: string, baseOrigin: string): string {
  if (!baseOrigin) return tag;
  return tag.replace(
    /\bhref\s*=\s*(['"])([^'"]+)\1/i,
    (_full, quote: string, href: string) => {
      const rawHref = String(href || "").trim();
      if (!rawHref) return _full;
      try {
        const absoluteHref = new URL(rawHref, baseOrigin).toString();
        return `href=${quote}${absoluteHref}${quote}`;
      } catch {
        return _full;
      }
    },
  );
}

function normalizePolicyHtml(html: string, baseOrigin: string): string {
  const raw = String(html || "").trim();
  if (!raw) return "";
  const bodyMatch = raw.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch?.[1]) {
    const headMatch = raw.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
    const head = headMatch?.[1] ?? "";
    const styleTags = head.match(/<style\b[^>]*>[\s\S]*?<\/style>/gi) ?? [];
    const stylesheetLinkTags = (head.match(/<link\b[^>]*>/gi) ?? [])
      .filter((tag) => /\brel\s*=\s*(['"])stylesheet\1/i.test(tag) || /\brel\s*=\s*stylesheet\b/i.test(tag))
      .map((tag) => absolutizeStylesheetHrefTag(tag, baseOrigin));
    return [...styleTags, ...stylesheetLinkTags, bodyMatch[1].trim()].join("\n");
  }
  return raw;
}

/** Общая реализация: загрузка HTML из site-settings и тот же портальный диалог, что у политики конфиденциальности. */
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
  const [loading, setLoading] = useState(true);
  const [html, setHtml] = useState("");
  const [open, setOpen] = useState(false);
  const hasContent = html.trim().length > 0;

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`${apiBaseUrl()}/api/pages/site-settings`, { cache: "no-store" });
        const data = (await res.json().catch(() => ({}))) as SiteSettingsHtmlPayload;
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
  }, [settingsHtmlKey]);

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
                  {hasContent ? (
                    <div
                      className="min-w-0 w-full max-w-full text-sm leading-relaxed text-slate-700 [overflow-wrap:anywhere] [&_*]:max-w-full [&_*]:[overflow-wrap:anywhere] [&_*]:!ml-0 [&_*]:!mr-0 [&_*]:!left-auto [&_*]:!right-auto [&_*]:!translate-x-0 [&_*]:!transform-none [&_*]:!indent-0"
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
