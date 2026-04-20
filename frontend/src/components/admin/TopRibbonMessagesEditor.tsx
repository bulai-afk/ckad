"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPut } from "@/lib/api";

const MAX_MESSAGES = 8;
const MAX_MESSAGE_LEN = 58;
const ALLOWED_TEXT_RE = /[^0-9A-Za-zА-Яа-яЁё\s.,:;!?()[\]{}"'`«»\-_/+&@#%№]/g;

function sanitizeRibbonText(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(ALLOWED_TEXT_RE, "")
    .trimStart()
    .slice(0, MAX_MESSAGE_LEN);
}

function normalizeMessages(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => sanitizeRibbonText(item).trim())
    .filter(Boolean)
    .slice(0, MAX_MESSAGES);
}

export function TopRibbonMessagesEditor() {
  const [messages, setMessages] = useState<string[]>([]);
  const [settingsSnapshot, setSettingsSnapshot] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const canSave = useMemo(() => !loading && !saving, [loading, saving]);

  useEffect(() => {
    void (async () => {
      try {
        const data = await apiGet<{ settings?: Record<string, unknown> }>("/api/pages/site-settings");
        const settings = data?.settings ?? {};
        setSettingsSnapshot(settings);
        const current = normalizeMessages((settings as { topRibbonMessages?: unknown }).topRibbonMessages);
        setMessages(current.length > 0 ? current : [""]);
      } catch {
        setMessages([""]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setNotice(null);
    try {
      const nextMessages = normalizeMessages(messages);
      const payload = {
        settings: {
          ...(settingsSnapshot ?? {}),
          topRibbonMessages: nextMessages,
        },
      };
      const res = await apiPut<{ settings?: Record<string, unknown> }>(
        "/api/pages/site-settings",
        payload,
        30_000,
      );
      const savedSettings = res?.settings ?? payload.settings;
      setSettingsSnapshot(savedSettings);
      const savedMessages = normalizeMessages(
        (savedSettings as { topRibbonMessages?: unknown }).topRibbonMessages,
      );
      setMessages(savedMessages.length > 0 ? savedMessages : [""]);
      setNotice({ tone: "success", text: "Лента сохранена" });
      window.setTimeout(() => setNotice(null), 1800);
    } catch {
      setNotice({ tone: "error", text: "Не удалось сохранить ленту" });
      window.setTimeout(() => setNotice(null), 2200);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Лента над navbar</h2>
          <p className="mt-1 text-xs text-slate-500">Тексты прокручиваются в верхней синей полосе сайта.</p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="rounded-full bg-[#496db3] px-3 py-1.5 text-xs font-semibold text-white hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Сохранение…" : "Сохранить"}
        </button>
      </div>

      <div className="space-y-2">
        {messages.map((message, index) => (
          <div key={index} className="flex items-start gap-2">
            <input
              type="text"
              value={message}
              maxLength={MAX_MESSAGE_LEN}
              onChange={(e) => {
                const value = sanitizeRibbonText(e.target.value);
                setMessages((prev) => prev.map((item, i) => (i === index ? value : item)));
              }}
              placeholder={`Текст ленты #${index + 1}`}
              className="w-[58ch] max-w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#496db3] focus:ring-1 focus:ring-[#496db3]"
            />
            <button
              type="button"
              onClick={() =>
                setMessages((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)))
              }
              disabled={messages.length <= 1}
              className="mt-1 rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
              aria-label={`Удалить текст ${index + 1}`}
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() =>
            setMessages((prev) => (prev.length >= MAX_MESSAGES ? prev : [...prev, ""]))
          }
          disabled={messages.length >= MAX_MESSAGES}
          className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-[#496db3] hover:text-[#496db3] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Добавить текст
        </button>
        <span className="text-[11px] text-slate-400">{messages.length} / {MAX_MESSAGES}</span>
      </div>
      <p className="mt-2 text-[11px] text-slate-400">
        Допустимы буквы, цифры, пробел и базовая пунктуация. До {MAX_MESSAGE_LEN} символов.
      </p>

      {notice ? (
        <p
          className={`mt-3 text-xs font-medium ${
            notice.tone === "success" ? "text-emerald-700" : "text-red-600"
          }`}
        >
          {notice.text}
        </p>
      ) : null}
    </section>
  );
}

