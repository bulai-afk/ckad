/** Ссылка на форму обратной связи (модальное окно на публичной странице). */
export const CALLBACK_FORM_LINK = "callback://open";

/** Префикс ссылки на HTML-документ из «Настройки сайта» (индекс 0…2). */
export const SITE_DOCUMENT_LINK_PREFIX = "document://";

export type SiteDocumentItem = {
  name: string;
  html: string;
};

export function buildSiteDocumentLink(index: number): string {
  return `${SITE_DOCUMENT_LINK_PREFIX}${index}`;
}

export function parseSiteDocumentLinkIndex(href: string): number | null {
  const trimmed = String(href || "").trim();
  if (!trimmed.toLowerCase().startsWith(SITE_DOCUMENT_LINK_PREFIX)) return null;
  const raw = trimmed.slice(SITE_DOCUMENT_LINK_PREFIX.length);
  const index = Number.parseInt(raw, 10);
  if (!Number.isFinite(index) || index < 0) return null;
  return index;
}

export function isCallbackFormLink(href: string): boolean {
  return String(href || "").trim() === CALLBACK_FORM_LINK;
}

export function isSiteDocumentLink(href: string): boolean {
  return parseSiteDocumentLinkIndex(href) !== null;
}

export function siteDocumentDisplayName(name: string): string {
  const base = String(name || "").trim();
  if (!base) return "Документ";
  return base.replace(/\.(html?|htm)$/i, "") || base;
}

export function isSiteHtmlDocument(doc: unknown): doc is SiteDocumentItem {
  if (!doc || typeof doc !== "object") return false;
  const row = doc as { name?: unknown; html?: unknown };
  return typeof row.name === "string" && typeof row.html === "string" && row.html.trim().length > 0;
}

export function normalizeSiteDocumentsList(docs: unknown): SiteDocumentItem[] {
  if (!Array.isArray(docs)) return [];
  return docs.filter(isSiteHtmlDocument).slice(0, 3);
}
