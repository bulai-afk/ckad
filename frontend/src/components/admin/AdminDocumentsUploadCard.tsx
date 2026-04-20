"use client";

import { DocumentArrowUpIcon, EyeIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useCallback, useEffect, useId, useRef, useState } from "react";

const ACCEPT = ".pdf,application/pdf";

const MAX_BYTES = 20 * 1024 * 1024;
const MAX_FILES = 3;
const PDF_WORKER_SRC = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

function isPdfFile(f: File): boolean {
  if (f.type === "application/pdf") return true;
  return f.name.toLowerCase().endsWith(".pdf");
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} Б`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} КБ`;
  return `${(n / (1024 * 1024)).toFixed(1)} МБ`;
}

function filenameWithoutExtension(name: string): string {
  return name.replace(/\.[^/.]+$/, "");
}

function readPdfAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Не удалось прочитать файл"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Ошибка чтения файла"));
    reader.readAsDataURL(file);
  });
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(",");
  const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export type AdminDocumentItem = {
  name: string;
  size: number;
  dataUrl: string;
};

type AdminDocumentsUploadCardProps = {
  documents: AdminDocumentItem[];
  onDocumentsChange: (next: AdminDocumentItem[]) => void;
};

export function AdminDocumentsUploadCard({
  documents,
  onDocumentsChange,
}: AdminDocumentsUploadCardProps) {
  const inputId = useId();
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const previewViewportRef = useRef<HTMLDivElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [rejectMsg, setRejectMsg] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [pdfLoadState, setPdfLoadState] = useState<"idle" | "loading" | "error" | "ready">("idle");
  const [pageCount, setPageCount] = useState(0);
  const reachedLimit = documents.length >= MAX_FILES;
  const previewFile = previewIndex !== null ? documents[previewIndex] ?? null : null;

  useEffect(() => {
    if (previewIndex === null) return;
    if (previewIndex < documents.length) return;
    setPreviewIndex(null);
  }, [previewIndex, documents.length]);

  useEffect(() => {
    if (!previewFile) return;
    let disposed = false;
    let loadingTask: { promise: Promise<unknown>; destroy?: () => Promise<void> } | null = null;
    let loadedPdf: {
      numPages: number;
      destroy?: () => Promise<void>;
      getPage: (num: number) => Promise<{
        getViewport: (params: { scale: number }) => { width: number; height: number };
        render: (params: {
          canvasContext: CanvasRenderingContext2D;
          viewport: { width: number; height: number };
        }) => { promise: Promise<unknown> };
      }>;
    } | null = null;

    const renderPdf = async () => {
      try {
        setPdfLoadState("loading");
        const pdfjs = await import("pdfjs-dist/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;
        const data = dataUrlToUint8Array(previewFile.dataUrl);
        loadingTask = pdfjs.getDocument({
          data,
        });
        loadedPdf = (await loadingTask.promise) as NonNullable<typeof loadedPdf>;
        if (disposed || !loadedPdf) return;

        const nextPageCount = Number(loadedPdf.numPages || 0);
        canvasRefs.current = [];
        setPageCount(nextPageCount);
        setPdfLoadState("ready");

        await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
        await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
        if (disposed) return;

        const hostWidth = previewViewportRef.current?.clientWidth ?? window.innerWidth;
        const targetWidth = Math.max(320, Math.min(980, Math.floor(hostWidth - 24)));

        for (let pageNum = 1; pageNum <= nextPageCount; pageNum += 1) {
          if (disposed) break;
          const page = await loadedPdf.getPage(pageNum);
          const baseViewport = page.getViewport({ scale: 1 });
          const scale = targetWidth / baseViewport.width;
          const viewport = page.getViewport({ scale });
          const canvas = canvasRefs.current[pageNum - 1];
          if (!canvas) continue;
          const context = canvas.getContext("2d", { alpha: false });
          if (!context) continue;
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          await page.render({ canvasContext: context, viewport }).promise;
        }
      } catch (error) {
        console.error("[PDF_RENDER_ERROR]", error);
        if (!disposed) setPdfLoadState("error");
      }
    };

    void renderPdf();

    return () => {
      disposed = true;
      setPdfLoadState("idle");
      setPageCount(0);
      void loadingTask?.destroy?.();
      void loadedPdf?.destroy?.();
    };
  }, [previewFile]);

  useEffect(() => {
    if (previewIndex === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPreviewIndex(null);
      }
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [previewIndex]);

  const mergeFiles = useCallback(async (incoming: FileList | File[]) => {
    setRejectMsg(null);
    const next = [...incoming].filter((f) => f.size > 0);
    if (next.length === 0) return;

    const pdfs = next.filter(isPdfFile);
    const skipped = next.filter((f) => !isPdfFile(f));
    if (skipped.length > 0) {
      setRejectMsg(
        skipped.length === 1
          ? `«${skipped[0].name}» не PDF — файл пропущен`
          : `Пропущено файлов не в формате PDF: ${skipped.length}`,
      );
    }
    if (pdfs.length === 0) return;

    const tooBig = pdfs.find((f) => f.size > MAX_BYTES);
    if (tooBig) {
      setRejectMsg(`Файл «${tooBig.name}» больше 20 МБ`);
      return;
    }
    if (documents.length >= MAX_FILES) {
      setRejectMsg(`Можно добавить максимум ${MAX_FILES} документа`);
      return;
    }

    const seen = new Set(documents.map((p) => `${p.name}:${p.size}`));
    const incomingUnique: File[] = [];
    const incomingSeen = new Set<string>();

    for (const f of pdfs) {
      const key = `${f.name}:${f.size}`;
      if (incomingSeen.has(key)) continue;
      incomingSeen.add(key);
      if (seen.has(key)) continue;
      incomingUnique.push(f);
    }

    const freeSlots = Math.max(0, MAX_FILES - documents.length);
    const toAdd = incomingUnique.slice(0, freeSlots);
    if (incomingUnique.length > toAdd.length) {
      setRejectMsg(`Можно добавить максимум ${MAX_FILES} документа`);
    }

    if (toAdd.length > 0) {
      const loaded = await Promise.all(
        toAdd.map(async (file) => ({
          name: file.name,
          size: file.size,
          dataUrl: await readPdfAsDataUrl(file),
        })),
      );
      onDocumentsChange([...documents, ...loaded]);
    }
  }, [documents, onDocumentsChange]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (list?.length) void mergeFiles(list);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (reachedLimit) {
      setRejectMsg(`Можно добавить максимум ${MAX_FILES} документа`);
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

  return (
    <div className="w-full max-w-[17rem] rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-900/5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#496db3]/10 text-[#496db3]">
          <DocumentArrowUpIcon className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-slate-900">Документы</h2>
          <p className="mt-0.5 text-xs leading-snug text-slate-500">
            Только PDF — до 20 МБ за файл, максимум 3
          </p>
        </div>
      </div>

      <label
        htmlFor={reachedLimit ? undefined : inputId}
        onClick={(e) => {
          if (!reachedLimit) return;
          e.preventDefault();
          setRejectMsg(`Можно добавить максимум ${MAX_FILES} документа`);
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
        <span className="text-xs font-medium text-slate-600">Перетащите сюда</span>
        <span className="mt-1 text-[11px] text-slate-400">или нажмите, чтобы выбрать</span>
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
          {documents.map((f, i) => (
            <li
              key={`${f.name}-${f.size}-${i}`}
              className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2 py-1.5 text-[11px]"
            >
              <button
                type="button"
                onClick={() => {
                  setPreviewIndex(i);
                }}
                className="flex min-w-0 items-center gap-1 truncate rounded p-0.5 text-left font-medium text-[#496db3] hover:bg-slate-200/70"
                title={`Открыть ${f.name}`}
              >
                <EyeIcon className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 truncate">{f.name}</span>
              </button>
              <span className="shrink-0 tabular-nums text-slate-400">{formatBytes(f.size)}</span>
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                aria-label={`Убрать ${f.name}`}
              >
                <XMarkIcon className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {previewFile ? (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
          aria-label={`Просмотр документа ${previewFile.name}`}
          onClick={() => {
            setPreviewIndex(null);
          }}
        >
          <div
            className="flex h-[min(86vh,820px)] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3">
              <div className="min-w-0 pr-3">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {filenameWithoutExtension(previewFile.name)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPreviewIndex(null);
                }}
                className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Закрыть просмотр документа"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div ref={previewViewportRef} className="flex-1 overflow-y-auto bg-white p-3">
              {pdfLoadState === "loading" ? (
                <p className="py-10 text-center text-sm text-slate-500">Загрузка документа...</p>
              ) : null}
              {pdfLoadState === "error" ? (
                <p className="py-10 text-center text-sm text-red-600">Не удалось отобразить PDF.</p>
              ) : null}
              {pdfLoadState === "ready" && pageCount > 0 ? (
                <div className="mx-auto flex w-full max-w-[980px] flex-col gap-3">
                  {Array.from({ length: pageCount }, (_, idx) => (
                    <canvas
                      key={idx + 1}
                      ref={(node) => {
                        canvasRefs.current[idx] = node;
                      }}
                      className="w-full bg-white"
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
