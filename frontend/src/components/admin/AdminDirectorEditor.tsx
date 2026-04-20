"use client";

import { useRef } from "react";

export type AdminDirector = {
  name: string;
  role: string;
  message: string;
  photo: string | null;
};

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

async function convertAnyImageToWebpDataUrl(source: File | string): Promise<string> {
  const sourceDataUrl = typeof source === "string" ? source : await fileToDataUrl(source);
  if (!sourceDataUrl) return "";

  const image = await new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = sourceDataUrl;
  });
  if (!image || !image.naturalWidth || !image.naturalHeight) return sourceDataUrl;

  const maxWidth = 900;
  const maxHeight = 1200;
  const widthScale = maxWidth / image.naturalWidth;
  const heightScale = maxHeight / image.naturalHeight;
  const scale = Math.min(1, widthScale, heightScale);
  const targetWidth = Math.max(1, Math.round(image.naturalWidth * scale));
  const targetHeight = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return sourceDataUrl;
  ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

  const blobDataUrl = await new Promise<string>((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (!blob || blob.type !== "image/webp") return resolve("");
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
        reader.onerror = () => resolve("");
        reader.readAsDataURL(blob);
      },
      "image/webp",
      0.78,
    );
  });

  if (blobDataUrl.startsWith("data:image/webp")) return blobDataUrl;
  try {
    const fallback = canvas.toDataURL("image/webp", 0.78);
    return fallback.startsWith("data:image/webp") ? fallback : sourceDataUrl;
  } catch {
    return sourceDataUrl;
  }
}

export function AdminDirectorEditor({
  director,
  onChange,
}: {
  director: AdminDirector;
  onChange: (next: AdminDirector) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const inputClass =
    "mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#496db3] focus:ring-2 focus:ring-[#496db3]/20";

  async function handlePickPhoto(file: File | null) {
    if (!file) return;
    const photo = await convertAnyImageToWebpDataUrl(file);
    if (!photo) return;
    onChange({ ...director, photo });
  }

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Директор</h3>
        <p className="mt-1 text-xs text-slate-600">
          Фото, Фамилия Имя, должность и обращение директора для страницы &quot;О компании&quot;.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[140px_1fr]">
          <div>
            <div className="aspect-[4/5] w-[140px] overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
              {director.photo ? (
                <img src={director.photo} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-slate-500">Фото директора</div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                void handlePickPhoto(file);
                e.currentTarget.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 w-[140px] rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#496db3] hover:bg-slate-50"
            >
              Выбрать фото
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700">Фамилия Имя</label>
              <input
                className={inputClass}
                value={director.name}
                onChange={(e) => onChange({ ...director, name: e.target.value })}
                placeholder="Иванов Иван"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Должность</label>
              <input
                className={inputClass}
                value={director.role}
                onChange={(e) => onChange({ ...director, role: e.target.value })}
                placeholder="Директор"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Обращение директора</label>
              <textarea
                className={`${inputClass} min-h-[120px] resize-y`}
                value={director.message}
                onChange={(e) => onChange({ ...director, message: e.target.value })}
                placeholder="Текст обращения директора..."
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
