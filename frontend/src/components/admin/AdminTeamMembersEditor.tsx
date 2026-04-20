"use client";

import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useRef } from "react";

export type AdminTeamMember = {
  name: string;
  role: string;
  photo: string | null;
};

const MAX_TEAM_MEMBERS = 12;

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

export function AdminTeamMembersEditor({
  members,
  onChange,
}: {
  members: AdminTeamMember[];
  onChange: (next: AdminTeamMember[]) => void;
}) {
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const canAdd = members.length < MAX_TEAM_MEMBERS;

  const inputClass =
    "mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#496db3] focus:ring-2 focus:ring-[#496db3]/20";

  function updateMember(index: number, patch: Partial<AdminTeamMember>) {
    onChange(members.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  async function handlePickPhoto(index: number, file: File | null) {
    if (!file) return;
    const photo = await convertAnyImageToWebpDataUrl(file);
    if (!photo) return;
    updateMember(index, { photo });
  }

  function addMember() {
    if (!canAdd) return;
    onChange([...members, { name: "", role: "", photo: null }]);
  }

  function removeMember(index: number) {
    onChange(members.filter((_, i) => i !== index));
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Наша команда</h3>
          <p className="mt-1 text-xs text-slate-600">
            Добавьте фото, Фамилию Имя и должность для карточек на странице &quot;О компании&quot;.
          </p>
        </div>
        <button
          type="button"
          onClick={addMember}
          disabled={!canAdd}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#496db3] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <PlusIcon className="h-4 w-4" />
          Добавить
        </button>
      </div>

      {members.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
          Пока нет участников команды.
        </div>
      ) : (
        <div className="space-y-4">
          {members.map((member, index) => (
            <div key={index} className="rounded-2xl border border-slate-200 p-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-[120px_1fr_auto] md:items-start">
                <div>
                  <div className="aspect-[4/5] w-[120px] overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                    {member.photo ? (
                      <img src={member.photo} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-slate-500">Фото</div>
                    )}
                  </div>
                  <input
                    ref={(el) => {
                      fileInputRefs.current[index] = el;
                    }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      void handlePickPhoto(index, file);
                      e.currentTarget.value = "";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRefs.current[index]?.click()}
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#496db3] hover:bg-slate-50"
                  >
                    Выбрать фото
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Фамилия Имя</label>
                    <input
                      className={inputClass}
                      value={member.name}
                      onChange={(e) => updateMember(index, { name: e.target.value })}
                      placeholder="Иванов Иван"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Должность</label>
                    <input
                      className={inputClass}
                      value={member.role}
                      onChange={(e) => updateMember(index, { role: e.target.value })}
                      placeholder="Руководитель проектов"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeMember(index)}
                  className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50 p-2 text-red-600 hover:bg-red-100"
                  aria-label="Удалить участника"
                  title="Удалить"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
