import type { SiteSettings } from "@/lib/siteSettingsPublic";

/** Идентификаторы форм для автоцелей «Отправка формы» / контактные данные. */
export const YM_CALLBACK_FORM_ID = "callback-request-form";
export const YM_FEEDBACK_FORM_ID = "site-feedback-form";

export function buildMailtoHref(email: string): string {
  const value = String(email || "").trim();
  return value ? `mailto:${value}` : "mailto:";
}

export function buildTelHref(phone: string, fallback = "tel:+74951234567"): string {
  const digits = String(phone || "").replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : fallback;
}

function ensureHttpUrl(raw: string): string {
  const value = String(raw || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value.replace(/^\/+/, "")}`;
}

function normalizeTelegramHref(raw: string): string {
  const value = String(raw || "").trim();
  if (!value) return "";
  if (value.startsWith("@")) return `https://t.me/${value.slice(1)}`;
  if (/^t\.me\//i.test(value)) return ensureHttpUrl(value);
  if (/^telegram\.me\//i.test(value)) return ensureHttpUrl(value.replace(/^telegram\.me/i, "t.me"));
  if (!value.includes("/") && !value.includes(".")) return `https://t.me/${value}`;
  const url = ensureHttpUrl(value);
  return url.replace(/^(https?:\/\/)telegram\.me/i, "$1t.me");
}

function normalizeWhatsappHref(raw: string): string {
  const value = String(raw || "").trim();
  if (!value) return "";
  if (/^wa\.me\//i.test(value) || /whatsapp\.com/i.test(value)) return ensureHttpUrl(value);
  const digits = value.replace(/[^\d]/g, "");
  return digits ? `https://wa.me/${digits}` : ensureHttpUrl(value);
}

function normalizeVkHref(raw: string): string {
  const value = String(raw || "").trim();
  if (!value) return "";
  if (/^vk\.com\//i.test(value)) return ensureHttpUrl(value);
  if (!value.includes("/") && !value.includes(".")) return `https://vk.com/${value}`;
  return ensureHttpUrl(value);
}

/** Нормализует URL соцсетей и мессенджеров для автоцелей Метрики. */
export function normalizeSocialLinksForMetrika(
  social: SiteSettings["social"] | null | undefined,
): SiteSettings["social"] {
  const source = social ?? { vk: "", telegram: "", max: "", whatsapp: "" };
  return {
    vk: normalizeVkHref(source.vk),
    telegram: normalizeTelegramHref(source.telegram),
    max: ensureHttpUrl(source.max),
    whatsapp: normalizeWhatsappHref(source.whatsapp),
  };
}
