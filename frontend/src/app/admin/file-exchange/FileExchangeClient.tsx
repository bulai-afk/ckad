"use client";

import { useId, useMemo, useState } from "react";
import {
  ArrowDownTrayIcon,
  ClipboardDocumentIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { apiBaseUrl } from "@/lib/apiBaseUrl";
import type { FileExchangeRow } from "./types";

const MAX_FILE_BYTES = 50 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 Б";
  const units = ["Б", "КБ", "МБ", "ГБ"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const rounded = value >= 10 || unitIndex === 0 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${units[unitIndex]}`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseUploadError(text: string): string {
  let detail = "Не удалось загрузить файл";
  try {
    const j = JSON.parse(text) as { error?: string };
    if (j.error === "file_too_large") detail = "Файл слишком большой (максимум 50 МБ)";
    else if (j.error) detail = j.error;
  } catch {
    /* keep default */
  }
  return detail;
}

type FileExchangeClientProps = {
  initialFiles: FileExchangeRow[];
};

export function FileExchangeClient({ initialFiles }: FileExchangeClientProps) {
  const inputId = useId();
  const [rows, setRows] = useState<FileExchangeRow[]>(initialFiles);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [description, setDescription] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const allChecked = rows.length > 0 && rows.every((r) => selectedIds.includes(r.id));

  const absoluteDownloadUrl = (downloadUrl: string) => {
    if (typeof window === "undefined") return downloadUrl;
    if (downloadUrl.startsWith("http://") || downloadUrl.startsWith("https://")) {
      return downloadUrl;
    }
    return `${window.location.origin}${downloadUrl}`;
  };

  const sortedRows = useMemo(
    () =>
      [...rows].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [rows],
  );

  async function uploadFiles(list: FileList | File[]) {
    const files = Array.from(list);
    if (files.length === 0 || uploading) return;

    const tooBig = files.find((f) => f.size > MAX_FILE_BYTES);
    if (tooBig) {
      setMsg(`Файл «${tooBig.name}» больше 50 МБ`);
      return;
    }

    setUploading(true);
    setMsg(null);
    try {
      const uploaded: FileExchangeRow[] = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        if (description.trim()) {
          formData.append("description", description.trim());
        }
        const res = await fetch(`${apiBaseUrl()}/api/file-exchange`, {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          setMsg(`${file.name}: ${parseUploadError(text)}`);
          break;
        }
        const data = (await res.json()) as { file?: FileExchangeRow };
        if (data.file) uploaded.push(data.file);
      }
      if (uploaded.length > 0) {
        setRows((prev) => [...uploaded, ...prev]);
        setDescription("");
        setMsg(
          uploaded.length === 1
            ? `Файл «${uploaded[0].originalName}» загружен`
            : `Загружено файлов: ${uploaded.length}`,
        );
      }
    } catch {
      setMsg("Ошибка при загрузке файла");
    } finally {
      setUploading(false);
    }
  }

  async function deleteSelected() {
    if (selectedIds.length === 0 || deleting) return;
    setDeleting(true);
    setMsg(null);
    try {
      const res = await fetch(`${apiBaseUrl()}/api/file-exchange`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (!res.ok) {
        setMsg("Не удалось удалить выбранные файлы");
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { files?: FileExchangeRow[] };
      setRows(Array.isArray(data?.files) ? data.files : []);
      setSelectedIds([]);
      setMsg("Выбранные файлы удалены");
    } finally {
      setDeleting(false);
    }
  }

  async function copyLink(row: FileExchangeRow) {
    const url = absoluteDownloadUrl(row.downloadUrl);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(row.id);
      window.setTimeout(() => setCopiedId((current) => (current === row.id ? null : current)), 2000);
    } catch {
      setMsg("Не удалось скопировать ссылку");
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) void uploadFiles(e.dataTransfer.files);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="text-sm font-medium text-slate-900">Файлообменник</div>
        <p className="mt-2 text-sm text-slate-600">
          Загружайте файлы и делитесь ссылками для скачивания. Ссылка ведёт на публичный endpoint —
          любой, у кого есть URL, сможет скачать файл.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="grid gap-4 lg:grid-cols-[1fr_minmax(0,280px)]">
          <label
            htmlFor={inputId}
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
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition ${
              dragOver
                ? "border-[#496db3] bg-[#496db3]/5"
                : "border-slate-200 bg-slate-50/80 hover:border-[#496db3]/40 hover:bg-slate-50"
            } ${uploading ? "pointer-events-none opacity-60" : ""}`}
          >
            <ArrowDownTrayIcon className="h-8 w-8 text-slate-400" />
            <span className="mt-2 text-sm font-medium text-slate-700">
              {uploading ? "Загрузка..." : "Перетащите файлы сюда"}
            </span>
            <span className="mt-1 text-xs text-slate-500">
              или нажмите, чтобы выбрать (до 50 МБ на файл)
            </span>
          </label>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-slate-600" htmlFor="file-exchange-desc">
              Комментарий (необязательно)
            </label>
            <textarea
              id="file-exchange-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="Например: договор для клиента"
              className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#496db3]"
            />
          </div>
        </div>

        <input
          id={inputId}
          type="file"
          multiple
          disabled={uploading}
          className="sr-only"
          onChange={(e) => {
            const list = e.target.files;
            if (list?.length) void uploadFiles(list);
            e.target.value = "";
          }}
        />

        {msg ? <p className="mt-3 text-xs font-medium text-slate-700">{msg}</p> : null}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-end">
          {selectedIds.length > 0 ? (
            <button
              type="button"
              onClick={deleteSelected}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-4 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <TrashIcon className="h-3.5 w-3.5" />
              {deleting ? "Удаляем..." : "Удалить"}
            </button>
          ) : null}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-600">
                <th className="w-10 px-3 py-2 font-semibold">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(sortedRows.map((r) => r.id));
                        return;
                      }
                      setSelectedIds([]);
                    }}
                    aria-label="Выбрать все файлы"
                  />
                </th>
                <th className="px-3 py-2 font-semibold">Файл</th>
                <th className="px-3 py-2 font-semibold">Комментарий</th>
                <th className="px-3 py-2 font-semibold">Размер</th>
                <th className="px-3 py-2 font-semibold">Дата</th>
                <th className="px-3 py-2 font-semibold">Ссылка</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-slate-500" colSpan={6}>
                    Пока нет загруженных файлов.
                  </td>
                </tr>
              ) : (
                sortedRows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 text-slate-800">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(row.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds((prev) => [...prev, row.id]);
                            return;
                          }
                          setSelectedIds((prev) => prev.filter((id) => id !== row.id));
                        }}
                        aria-label={`Выбрать файл ${row.originalName}`}
                      />
                    </td>
                    <td className="max-w-[14rem] truncate px-3 py-2" title={row.originalName}>
                      <a
                        href={row.downloadUrl}
                        className="font-medium text-[#496db3] hover:underline"
                        download
                      >
                        {row.originalName}
                      </a>
                    </td>
                    <td
                      className="max-w-[12rem] truncate px-3 py-2 text-slate-600"
                      title={row.description}
                    >
                      {row.description || "—"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatBytes(row.size)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatDate(row.createdAt)}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void copyLink(row)}
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:border-[#496db3]/30 hover:text-[#496db3]"
                        >
                          <ClipboardDocumentIcon className="h-3.5 w-3.5" />
                          {copiedId === row.id ? "Скопировано" : "Копировать"}
                        </button>
                        <a
                          href={row.downloadUrl}
                          className="inline-flex items-center gap-1 rounded-full border border-[#496db3]/20 bg-[#496db3]/5 px-2.5 py-1 text-[11px] font-semibold text-[#496db3] transition hover:bg-[#496db3]/10"
                          download
                        >
                          <ArrowDownTrayIcon className="h-3.5 w-3.5" />
                          Скачать
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
