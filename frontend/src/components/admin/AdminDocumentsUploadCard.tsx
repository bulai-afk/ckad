"use client";

import { EyeIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useCallback, useEffect, useId, useState } from "react";
import {
  normalizePolicyHtml,
  POLICY_HTML_DOCUMENT_CLASS,
  POLICY_HTML_DOCUMENT_LANG,
} from "@/lib/normalizePolicyHtml";

const ACCEPT = ".html,.htm,text/html,application/xhtml+xml";
const HTML_MAX_BYTES = 2 * 1024 * 1024;
const DEFAULT_MAX_FILES = 3;

function isHtmlFile(f: File): boolean {
  if (f.type === "text/html" || f.type === "application/xhtml+xml") return true;
  const lower = f.name.toLowerCase();
  return lower.endsWith(".html") || lower.endsWith(".htm");
}

export type AdminDocumentItem = {
  name: string;
  html: string;
};

type AdminDocumentsUploadCardProps = {
  documents: AdminDocumentItem[];
  onDocumentsChange: (next: AdminDocumentItem[]) => void;
  title?: string;
  maxFiles?: number;
};

export function AdminDocumentsUploadCard({
  documents,
  onDocumentsChange,
  title = "Документы",
  maxFiles = DEFAULT_MAX_FILES,
}: AdminDocumentsUploadCardProps) {
  const inputId = useId();
  const [dragOver, setDragOver] = useState(false);
  const [rejectMsg, setRejectMsg] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const reachedLimit = documents.length >= maxFiles;
  const previewDoc = previewIndex !== null ? documents[previewIndex] ?? null : null;

  useEffect(() => {
    if (previewIndex === null) return;
    if (previewIndex < documents.length) return;
    setPreviewIndex(null);
  }, [previewIndex, documents.length]);

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

  const mergeFiles = useCallback(
    async (list: FileList | File[]) => {
      setRejectMsg(null);
      const files = Array.from(list);
      const htmlFiles = files.filter(isHtmlFile);
      const skipped = files.length - htmlFiles.length;
      if (skipped > 0) {
        setRejectMsg(
          skipped === 1
            ? `«${files.find((f) => !isHtmlFile(f))?.name ?? "файл"}» не HTML — файл пропущен`
            : `Пропущено файлов не в формате HTML: ${skipped}`,
        );
      }
      if (htmlFiles.length === 0) return;

      const tooBig = htmlFiles.find((f) => f.size > HTML_MAX_BYTES);
      if (tooBig) {
        setRejectMsg(`Файл «${tooBig.name}» больше 2 МБ`);
        return;
      }
      if (documents.length >= maxFiles) {
        setRejectMsg(`Можно добавить максимум ${maxFiles} документа`);
        return;
      }

      const seen = new Set(documents.map((d) => d.name.toLowerCase()));
      const incomingUnique: File[] = [];
      for (const f of htmlFiles) {
        const key = f.name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        incomingUnique.push(f);
      }

      const freeSlots = Math.max(0, maxFiles - documents.length);
      const toAdd = incomingUnique.slice(0, freeSlots);
      if (incomingUnique.length > toAdd.length) {
        setRejectMsg(`Можно добавить максимум ${maxFiles} документа`);
      }

      if (toAdd.length === 0) return;

      const baseOrigin = typeof window !== "undefined" ? window.location.origin : "";
      const loaded = await Promise.all(
        toAdd.map(async (file) => {
          const raw = await file.text();
          return {
            name: file.name,
            html: normalizePolicyHtml(raw, baseOrigin),
          };
        }),
      );
      onDocumentsChange([...documents, ...loaded]);
    },
    [documents, maxFiles, onDocumentsChange],
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (list?.length) void mergeFiles(list);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (reachedLimit) {
      setRejectMsg(`Можно добавить максимум ${maxFiles} документа`);
      return;
    }
    if (e.dataTransfer.files?.length) void mergeFiles(e.dataTransfer.files);
  };

  const removeAt = (index: number) => {
    onDocumentsChange(documents.filter((_, i) => i !== index));
    setPreviewIndex((current) => {
      if (current === null) return null;
      if (current === index) return null;
      if (current > index) return current - 1;
      return current;
    });
  };

  const previewHtml =
    previewDoc && typeof window !== "undefined"
      ? normalizePolicyHtml(previewDoc.html, window.location.origin)
      : previewDoc?.html ?? "";

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-900/5">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>

      <label
        htmlFor={reachedLimit ? undefined : inputId}
        onClick={(e) => {
          if (!reachedLimit) return;
          e.preventDefault();
          setRejectMsg(`Можно добавить максимум ${maxFiles} документа`);
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`mt-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-3 py-4 text-center transition ${
          dragOver
            ? "border-[#496db3] bg-[#496db3]/5"
            : reachedLimit
              ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
              : "border-slate-200 bg-slate-50/80 hover:border-[#496db3]/40 hover:bg-slate-50"
        }`}
      >
        <span className="text-xs font-medium text-slate-600">Перетащите HTML сюда</span>
        <span className="mt-1 text-[11px] text-slate-400">или нажмите, чтобы выбрать файл</span>
      </label>

      <input
        id={inputId}
        type="file"
        accept={ACCEPT}
        multiple
        disabled={reachedLimit}
        className="sr-only"
        onChange={onInputChange}
      />

      {rejectMsg ? <p className="mt-2 text-[11px] font-medium text-red-600">{rejectMsg}</p> : null}

      {documents.length > 0 ? (
        <ul className="mt-3 max-h-28 space-y-1.5 overflow-y-auto text-left">
          {documents.map((doc, i) => (
            <li
              key={`${doc.name}-${i}`}
              className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2 py-1.5 text-[11px]"
            >
              <button
                type="button"
                onClick={() => setPreviewIndex(i)}
                className="flex min-w-0 items-center gap-1 truncate rounded p-0.5 text-left font-medium text-[#496db3] hover:bg-slate-200/70"
                title={`Открыть ${doc.name}`}
              >
                <EyeIcon className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 truncate">{doc.name}</span>
              </button>
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                aria-label={`Убрать ${doc.name}`}
              >
                <XMarkIcon className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-3 rounded-lg bg-slate-50 px-2.5 py-2 text-[11px] text-slate-600">
          Файлы пока не загружены.
        </div>
      )}

      {previewDoc ? (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
          aria-label={`Предпросмотр ${previewDoc.name}`}
          onClick={() => setPreviewIndex(null)}
        >
          <div
            className="flex h-[min(86vh,820px)] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-end px-4 py-3">
              <button
                type="button"
                onClick={() => setPreviewIndex(null)}
                className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Закрыть предпросмотр"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-white p-5">
              {previewHtml.trim() ? (
                <div
                  lang={POLICY_HTML_DOCUMENT_LANG}
                  className={POLICY_HTML_DOCUMENT_CLASS}
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              ) : (
                <p className="text-sm text-slate-600">Документ пустой.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
