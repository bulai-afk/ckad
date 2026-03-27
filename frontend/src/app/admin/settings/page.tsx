"use client";

import { useEffect, useMemo, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { AdminSidebar } from "@/components/admin/Sidebar";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
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
};

const emptySettings: SiteSettings = {
  email: "",
  phone: "",
  address: "",
  social: { vk: "", telegram: "", max: "", whatsapp: "" },
  requisites: { companyName: "", inn: "", kpp: "", ogrn: "" },
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings>(emptySettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [tone, setTone] = useState<"success" | "error">("success");

  const inputClass =
    "mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#496db3] focus:ring-2 focus:ring-[#496db3]/20";
  const labelClass = "text-xs font-semibold text-slate-700";

  useEffect(() => {
    void (async () => {
      try {
        const data = await apiGet<{ settings?: SiteSettings }>("/api/pages/site-settings");
        if (data?.settings) setSettings(data.settings);
      } catch {
        // keep empty; user can still fill and save
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const canSave = useMemo(() => !loading && !saving, [loading, saving]);

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await apiPut<{ ok: boolean; settings: SiteSettings }>("/api/pages/site-settings", {
        settings,
      });
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

                <div
                  className="mt-6 grid items-start gap-8"
                  style={{ gridTemplateColumns: "1fr 1fr" }}
                >
                  <div className="space-y-8">
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
                  </div>

                  <div className="space-y-3">
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
    </div>
  );
}

