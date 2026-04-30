"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { apiBaseUrl } from "@/lib/apiBaseUrl";

type SiteSettingsPrivacyPayload = {
  settings?: {
    privacyPolicyHtml?: string;
  };
};

type PrivacyPolicyDialogLinkProps = {
  className?: string;
  text?: string;
};

function normalizePolicyHtml(html: string): string {
  const raw = String(html || "").trim();
  if (!raw) return "";
  const bodyMatch = raw.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch?.[1]) return bodyMatch[1].trim();
  return raw;
}

export function PrivacyPolicyDialogLink({
  className,
  text = "политикой конфиденциальности",
}: PrivacyPolicyDialogLinkProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [html, setHtml] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`${apiBaseUrl()}/api/pages/site-settings`, { cache: "no-store" });
        const data = (await res.json().catch(() => ({}))) as SiteSettingsPrivacyPayload;
        const policyHtml = typeof data?.settings?.privacyPolicyHtml === "string"
          ? data.settings.privacyPolicyHtml.trim()
          : "";
        if (cancelled) return;
        setHtml(normalizePolicyHtml(policyHtml));
      } catch {
        if (!cancelled) setHtml("");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  if (loading) {
    return <span className={className}>{text}</span>;
  }

  if (!html) {
    return <span className={className}>{text}</span>;
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {text}
      </button>
      {open && mounted
        ? createPortal(
        <div
          className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
          aria-label="Политика конфиденциальности"
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
                aria-label="Закрыть окно политики"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-white p-5">
              <div
                className="min-w-0 w-full max-w-full text-sm leading-relaxed text-slate-700 [overflow-wrap:anywhere] [&_*]:max-w-full [&_*]:[overflow-wrap:anywhere] [&_*]:!ml-0 [&_*]:!mr-0 [&_*]:!left-auto [&_*]:!right-auto [&_*]:!translate-x-0 [&_*]:!transform-none [&_*]:!indent-0"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </div>
          </div>
        </div>
        ,
        document.body,
      )
        : null}
    </>
  );
}
