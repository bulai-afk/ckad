"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { apiGet } from "@/lib/api";
import {
  CALLBACK_FORM_LINK,
  buildSiteDocumentLink,
  normalizeSiteDocumentsList,
  parseSiteDocumentLinkIndex,
  siteDocumentDisplayName,
  type SiteDocumentItem,
} from "@/lib/siteDocumentLink";

export type BannerCoverLinkModalTarget = "primary" | "secondary" | "announcementSecondary";

type BannerCoverButtonLinkModalProps = {
  open: boolean;
  target: BannerCoverLinkModalTarget;
  labelValue: string;
  linkValue: string;
  onLabelChange: (value: string) => void;
  onLinkChange: (value: string) => void;
  onClose: () => void;
  onApply: () => void;
};

function linkModalLabelTitle(target: BannerCoverLinkModalTarget): string {
  if (target === "primary") return "Название кнопки";
  if (target === "secondary") return "Название кнопки";
  return "Название кнопки";
}

export function BannerCoverButtonLinkModal({
  open,
  target,
  labelValue,
  linkValue,
  onLabelChange,
  onLinkChange,
  onClose,
  onApply,
}: BannerCoverButtonLinkModalProps) {
  const labelInputRef = useRef<HTMLInputElement | null>(null);
  const [documents, setDocuments] = useState<SiteDocumentItem[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);

  useLayoutEffect(() => {
    if (!open) return;
    const id = window.requestAnimationFrame(() => {
      const el = labelInputRef.current;
      if (!el) return;
      el.focus();
      el.select();
    });
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setDocumentsLoading(true);
    void apiGet<{ settings?: { documents?: unknown } }>("/api/pages/site-settings")
      .then((data) => {
        if (cancelled) return;
        setDocuments(normalizeSiteDocumentsList(data?.settings?.documents));
      })
      .catch(() => {
        if (!cancelled) setDocuments([]);
      })
      .finally(() => {
        if (!cancelled) setDocumentsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  const handleEnter = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onApply();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[20000] flex items-center justify-center bg-slate-900/40 p-3 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Ссылка и название кнопки"
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-white p-4 shadow-xl ring-1 ring-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <span
          className="absolute right-2 top-2 inline-flex h-5 w-5 cursor-pointer items-center justify-center text-slate-500 transition-colors hover:text-[#496db3]"
          onClick={onClose}
          role="button"
          aria-label="Закрыть"
        >
          <XMarkIcon className="h-4 w-4 [stroke-width:2.2]" />
        </span>
        <div className="mt-4 grid grid-cols-1 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-slate-700">{linkModalLabelTitle(target)}</span>
            <input
              ref={labelInputRef}
              value={labelValue}
              onChange={(e) => onLabelChange(e.target.value)}
              onKeyDown={handleEnter}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#496db3] focus:ring-1 focus:ring-[#496db3]"
              placeholder="Текст на кнопке"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-slate-700">Ссылка кнопки</span>
            <input
              value={linkValue}
              onChange={(e) => onLinkChange(e.target.value)}
              onKeyDown={handleEnter}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#496db3] focus:ring-1 focus:ring-[#496db3]"
              placeholder="https://example.com, callback://open или document://0"
            />
          </label>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              className="inline-flex w-fit rounded-full border border-[#496db3]/30 bg-[#496db3]/5 px-3 py-1.5 text-xs font-semibold text-[#496db3] hover:bg-[#496db3]/10"
              onClick={() => onLinkChange(CALLBACK_FORM_LINK)}
            >
              Подключить форму обратной связи
            </button>
            <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-2.5">
              <p className="text-xs font-semibold text-slate-700">Документ из «Настройки сайта»</p>
              {documentsLoading ? (
                <p className="mt-1.5 text-xs text-slate-500">Загрузка списка…</p>
              ) : documents.length > 0 ? (
                <div className="mt-1.5 flex flex-col gap-1">
                  {documents.map((doc, index) => {
                    const link = buildSiteDocumentLink(index);
                    const selected = parseSiteDocumentLinkIndex(linkValue) === index;
                    return (
                      <button
                        key={`${doc.name}-${index}`}
                        type="button"
                        className={`inline-flex w-full rounded-md border px-2.5 py-1.5 text-left text-xs font-medium transition ${
                          selected
                            ? "border-[#496db3]/50 bg-[#496db3]/10 text-[#496db3]"
                            : "border-slate-200 bg-white text-slate-700 hover:border-[#496db3]/35 hover:bg-slate-50"
                        }`}
                        onClick={() => onLinkChange(link)}
                      >
                        {siteDocumentDisplayName(doc.name)}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-1.5 text-xs text-slate-500">
                  Нет загруженных HTML-документов. Добавьте их в «Настройки сайта» → Документы.
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
            onClick={onClose}
          >
            Отмена
          </button>
          <button
            type="button"
            className="inline-flex rounded-full bg-[#496db3] px-4 py-1.5 text-xs font-medium text-white hover:brightness-105"
            onClick={onApply}
          >
            Применить
          </button>
        </div>
      </div>
    </div>
  );
}
