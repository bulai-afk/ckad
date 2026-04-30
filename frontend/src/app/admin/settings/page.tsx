"use client";

import { useEffect, useMemo, useState } from "react";
import { EyeIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { AdminSidebar } from "@/components/admin/Sidebar";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import {
  AdminDocumentsUploadCard,
  type AdminDocumentItem,
} from "@/components/admin/AdminDocumentsUploadCard";
import {
  AdminDirectorEditor,
  type AdminDirector,
} from "@/components/admin/AdminDirectorEditor";
import { apiGet, apiPut } from "@/lib/api";

type SiteSettings = {
  email: string;
  phone: string;
  address: string;
  social: {
    vk: string;
    telegram: string;
    max: string;
    whatsapp: string;
  };
  requisites: {
    companyName: string;
    inn: string;
    kpp: string;
    ogrn: string;
  };
  documents: AdminDocumentItem[];
  privacyPolicyHtml: string;
  topRibbonMessages: string[];
  director: AdminDirector;
};

const emptySettings: SiteSettings = {
  email: "",
  phone: "",
  address: "",
  social: { vk: "", telegram: "", max: "", whatsapp: "" },
  requisites: { companyName: "", inn: "", kpp: "", ogrn: "" },
  documents: [],
  privacyPolicyHtml: "",
  topRibbonMessages: [],
  director: { name: "", role: "Директор", message: "", photo: null },
};

const PRIVACY_HTML_MAX_BYTES = 2 * 1024 * 1024;

function normalizePolicyHtml(html: string): string {
  const raw = String(html || "").trim();
  if (!raw) return "";
  const bodyMatch = raw.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch?.[1]) return bodyMatch[1].trim();
  return raw;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings>(emptySettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [tone, setTone] = useState<"success" | "error">("success");
  const [privacyPreviewOpen, setPrivacyPreviewOpen] = useState(false);

  const inputClass =
    "mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#496db3] focus:ring-2 focus:ring-[#496db3]/20";
  const labelClass = "text-xs font-semibold text-slate-700";

  useEffect(() => {
    void (async () => {
      try {
        const data = await apiGet<{ settings?: SiteSettings }>("/api/pages/site-settings");
        if (data?.settings) {
          const incoming = data.settings;
          const legacyTeamMembers = (
            incoming as unknown as {
              teamMembers?: Array<{ name?: string; role?: string; photo?: string | null }>;
            }
          ).teamMembers;
          const legacyDirector = Array.isArray(legacyTeamMembers) ? legacyTeamMembers[0] ?? null : null;
          setSettings({
            ...emptySettings,
            ...incoming,
            social: { ...emptySettings.social, ...(incoming.social ?? {}) },
            requisites: { ...emptySettings.requisites, ...(incoming.requisites ?? {}) },
            director: {
              ...emptySettings.director,
              ...(legacyDirector
                ? {
                    name: typeof legacyDirector.name === "string" ? legacyDirector.name : "",
                    role: typeof legacyDirector.role === "string" ? legacyDirector.role : "",
                    photo:
                      typeof legacyDirector.photo === "string" || legacyDirector.photo === null
                        ? legacyDirector.photo
                        : null,
                  }
                : {}),
              ...(incoming.director ?? {}),
            },
          });
        }
      } catch {
        // keep empty; user can still fill and save
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const canSave = useMemo(() => !loading && !saving, [loading, saving]);

  async function handlePrivacyHtmlFileSelect(file: File | null) {
    if (!file) return;
    const isHtml =
      file.type === "text/html" ||
      file.type === "application/xhtml+xml" ||
      file.name.toLowerCase().endsWith(".html") ||
      file.name.toLowerCase().endsWith(".htm");
    if (!isHtml) {
      setTone("error");
      setMsg("Нужен файл .html или .htm");
      window.setTimeout(() => setMsg(null), 2600);
      return;
    }
    if (file.size <= 0 || file.size > PRIVACY_HTML_MAX_BYTES) {
      setTone("error");
      setMsg("HTML файл должен быть до 2 МБ");
      window.setTimeout(() => setMsg(null), 2600);
      return;
    }
    try {
      const html = await file.text();
      setSettings((s) => ({ ...s, privacyPolicyHtml: normalizePolicyHtml(html) }));
      setTone("success");
      setMsg("HTML политики загружен. Нажмите «Сохранить».");
      window.setTimeout(() => setMsg(null), 2200);
    } catch {
      setTone("error");
      setMsg("Не удалось прочитать HTML файл.");
      window.setTimeout(() => setMsg(null), 2600);
    }
  }

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await apiPut<{ ok: boolean; settings: SiteSettings }>(
        "/api/pages/site-settings",
        { settings },
        30_000,
      );
      if (res?.settings) setSettings(res.settings);
      setTone("success");
      setMsg("Сохранено.");
      window.setTimeout(() => setMsg(null), 1600);
    } catch {
      setTone("error");
      setMsg("Не удалось сохранить.");
      window.setTimeout(() => setMsg(null), 2600);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="flex min-h-screen">
        <AdminSidebar />

        <div className="flex h-screen min-h-0 flex-1 flex-col overflow-hidden lg:ml-64">
          <AdminTopBar />

          <main className="flex-1 overflow-y-auto p-6">
            <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="text-sm font-medium text-slate-900">Страница настроек</div>
                <p className="mt-2 text-sm text-slate-600">
                  Здесь можно указать контакты, ссылки на соцсети и реквизиты — они будут использоваться на публичных страницах.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Настройки сайта</div>
                    <p className="mt-1 text-xs text-slate-600">
                      Email, телефон, соцсети и реквизиты.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!canSave}
                    className="rounded-full bg-[#496db3] px-4 py-2 text-xs font-semibold text-white hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Сохранение…" : "Сохранить"}
                  </button>
                </div>

                {loading ? (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    Загрузка…
                  </div>
                ) : null}

                <div className="mt-6 grid grid-cols-1 items-start gap-8 xl:grid-cols-2">
                  <div className="min-w-0 space-y-8">
                    <section className="space-y-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Контакты
                      </div>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className={labelClass}>E-mail</label>
                          <input
                            className={inputClass}
                            value={settings.email}
                            onChange={(e) => setSettings((s) => ({ ...s, email: e.target.value }))}
                            placeholder="info@example.ru"
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Телефон</label>
                          <input
                            className={inputClass}
                            value={settings.phone}
                            onChange={(e) => setSettings((s) => ({ ...s, phone: e.target.value }))}
                            placeholder="+7 (___) ___-__-__"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className={labelClass}>Адрес</label>
                          <input
                            className={inputClass}
                            value={settings.address}
                            onChange={(e) => setSettings((s) => ({ ...s, address: e.target.value }))}
                            placeholder="г. Москва, …"
                          />
                        </div>
                      </div>
                    </section>

                    <div className="my-6 h-px w-full bg-slate-100" aria-hidden="true" />

                    <section className="space-y-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Соцсети
                      </div>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className={labelClass}>VK</label>
                          <input
                            className={inputClass}
                            value={settings.social.vk}
                            onChange={(e) =>
                              setSettings((s) => ({ ...s, social: { ...s.social, vk: e.target.value } }))
                            }
                          placeholder="https://vk.com/..."
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Telegram</label>
                          <input
                            className={inputClass}
                            value={settings.social.telegram}
                            onChange={(e) =>
                              setSettings((s) => ({ ...s, social: { ...s.social, telegram: e.target.value } }))
                            }
                          placeholder="https://telegram.me/..."
                          />
                        </div>
                      <div>
                        <label className={labelClass}>Max</label>
                        <input
                          className={inputClass}
                          value={settings.social.max}
                          onChange={(e) =>
                            setSettings((s) => ({ ...s, social: { ...s.social, max: e.target.value } }))
                          }
                          placeholder="https://max.ru/..."
                        />
                      </div>
                        <div>
                          <label className={labelClass}>WhatsApp</label>
                          <input
                            className={inputClass}
                            value={settings.social.whatsapp}
                            onChange={(e) =>
                              setSettings((s) => ({ ...s, social: { ...s.social, whatsapp: e.target.value } }))
                            }
                          placeholder="https://wa.me/..."
                          />
                        </div>
                      </div>
                    </section>

                    <div className="my-6 h-px w-full bg-slate-100" aria-hidden="true" />
                    <section>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <AdminDocumentsUploadCard
                          documents={settings.documents}
                          onDocumentsChange={(documents) =>
                            setSettings((s) => ({
                              ...s,
                              documents,
                            }))
                          }
                        />
                        <div className="w-full max-w-[17rem] rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-900/5">
                          <div className="text-sm font-semibold text-slate-900">Политика конфиденциальности</div>
                          <p className="mt-0.5 text-xs leading-snug text-slate-500">
                            Загрузка файла .html/.htm (до 2 МБ)
                          </p>
                          <label
                            htmlFor="privacy-policy-html-upload"
                            className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center transition hover:border-[#496db3]/40 hover:bg-slate-50"
                          >
                            <span className="text-xs font-medium text-slate-600">Перетащите HTML сюда</span>
                            <span className="mt-1 text-[11px] text-slate-400">или нажмите, чтобы выбрать файл</span>
                          </label>
                          <input
                            id="privacy-policy-html-upload"
                            type="file"
                            accept=".html,.htm,text/html,application/xhtml+xml"
                            className="sr-only"
                            onChange={(e) => {
                              const file = e.target.files?.[0] ?? null;
                              void handlePrivacyHtmlFileSelect(file);
                              e.currentTarget.value = "";
                            }}
                          />
                          {settings.privacyPolicyHtml.trim() ? (
                            <div className="mt-3 rounded-lg bg-slate-50 px-2 py-1.5 text-[11px]">
                              <div className="flex items-center justify-between gap-2">
                                <button
                                  type="button"
                                  onClick={() => setPrivacyPreviewOpen(true)}
                                  className="flex min-w-0 items-center gap-1 rounded p-0.5 text-left font-medium text-[#496db3] hover:bg-slate-200/70"
                                  title="Открыть предпросмотр политики"
                                >
                                  <EyeIcon className="h-3.5 w-3.5 shrink-0" />
                                  <span className="min-w-0 truncate">privacy-policy.html</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSettings((s) => ({
                                      ...s,
                                      privacyPolicyHtml: "",
                                    }))
                                  }
                                  className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                                  aria-label="Удалить файл политики"
                                >
                                  <XMarkIcon className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-3 rounded-lg bg-slate-50 px-2.5 py-2 text-[11px] text-slate-600">
                              Файл пока не загружен.
                            </div>
                          )}
                        </div>
                      </div>
                    </section>
                  </div>

                  <div className="min-w-0 space-y-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Реквизиты
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <label className={labelClass}>Название организации</label>
                        <input
                          className={inputClass}
                          value={settings.requisites.companyName}
                          onChange={(e) =>
                            setSettings((s) => ({
                              ...s,
                              requisites: { ...s.requisites, companyName: e.target.value },
                            }))
                          }
                          placeholder='ООО "..."'
                        />
                      </div>
                      <div>
                        <label className={labelClass}>ИНН</label>
                        <input
                          className={inputClass}
                          value={settings.requisites.inn}
                          onChange={(e) =>
                            setSettings((s) => ({
                              ...s,
                              requisites: { ...s.requisites, inn: e.target.value },
                            }))
                          }
                          placeholder="0000000000"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>КПП</label>
                        <input
                          className={inputClass}
                          value={settings.requisites.kpp}
                          onChange={(e) =>
                            setSettings((s) => ({
                              ...s,
                              requisites: { ...s.requisites, kpp: e.target.value },
                            }))
                          }
                          placeholder="000000000"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>ОГРН</label>
                        <input
                          className={inputClass}
                          value={settings.requisites.ogrn}
                          onChange={(e) =>
                            setSettings((s) => ({
                              ...s,
                              requisites: { ...s.requisites, ogrn: e.target.value },
                            }))
                          }
                          placeholder="0000000000000"
                        />
                      </div>
                    </div>
                    <div className="my-6 h-px w-full bg-slate-100" aria-hidden="true" />
                    <AdminDirectorEditor
                      director={settings.director}
                      onChange={(director) => setSettings((s) => ({ ...s, director }))}
                    />
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      {msg ? (
        <div
          className={`fixed right-6 top-[4.5rem] z-50 flex items-center gap-2 rounded border px-3 py-1.5 text-xs font-medium shadow-md ${
            tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
          role="status"
          aria-live="polite"
        >
          <span>{msg}</span>
          <button
            type="button"
            onClick={() => setMsg(null)}
            className={`-mr-1 rounded p-0.5 ${
              tone === "success"
                ? "text-emerald-600 hover:bg-emerald-100 hover:text-emerald-900"
                : "text-red-600 hover:bg-red-100 hover:text-red-900"
            }`}
            aria-label="Закрыть"
          >
            <XMarkIcon className="h-3 w-3 [stroke-width:2.2]" />
          </button>
        </div>
      ) : null}

      {privacyPreviewOpen && settings.privacyPolicyHtml.trim() ? (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
          aria-label="Предпросмотр политики конфиденциальности"
          onClick={() => setPrivacyPreviewOpen(false)}
        >
          <div
            className="flex h-[min(86vh,820px)] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-end px-4 py-3">
              <button
                type="button"
                onClick={() => setPrivacyPreviewOpen(false)}
                className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Закрыть предпросмотр"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-white p-5">
              <div
                className="min-w-0 w-full max-w-full text-sm leading-relaxed text-slate-700 [overflow-wrap:anywhere] [&_*]:max-w-full [&_*]:[overflow-wrap:anywhere] [&_*]:!ml-0 [&_*]:!mr-0 [&_*]:!left-auto [&_*]:!right-auto [&_*]:!translate-x-0 [&_*]:!transform-none [&_*]:!indent-0"
                dangerouslySetInnerHTML={{ __html: settings.privacyPolicyHtml }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

