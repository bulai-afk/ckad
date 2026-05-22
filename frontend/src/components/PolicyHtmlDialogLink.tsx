"use client";

import { useEffect, useState } from "react";
import { SiteDocumentHtmlDialog } from "@/components/SiteDocumentHtmlDialog";
import { apiBaseUrl } from "@/lib/apiBaseUrl";
import { normalizePolicyHtml } from "@/lib/normalizePolicyHtml";

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
  emptyDocumentMessage: string;
};

/** Ссылка на политику / согласие — тот же диалог просмотра, что у документов в футере. */
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
  const [loading, setLoading] = useState(false);
  const [html, setHtml] = useState("");
  const [open, setOpen] = useState(false);

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
      <SiteDocumentHtmlDialog
        open={open}
        onClose={() => setOpen(false)}
        html={html}
        loading={loading}
        title={dialogAriaLabel}
        closeButtonAriaLabel={closeButtonAriaLabel}
        emptyMessage={emptyDocumentMessage}
      />
    </>
  );
}
