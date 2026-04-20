import { Router } from "express";
import { prisma } from "../prisma";
import sharp from "sharp";
import { promises as fs } from "node:fs";
import path from "node:path";

export const pagesRouter = Router();

/** БД без миграции `add_page_service_descriptions` — Prisma падает на SELECT/UPDATE несуществующих колонок. */
function isMissingDbColumnError(e: unknown): boolean {
  if (typeof e !== "object" || e === null) return false;
  const code = "code" in e ? String((e as { code: unknown }).code) : "";
  if (code === "P2022") return true;
  const msg =
    typeof (e as { message?: unknown }).message === "string"
      ? (e as { message: string }).message
      : "";
  return /Unknown column|doesn't exist/i.test(msg);
}

type PageListForApi = {
  id: number;
  title: string;
  slug: string;
  status: "DRAFT" | "PUBLISHED";
  createdAt: Date;
  updatedAt: Date;
  description?: string | null;
  preview?: string | null;
  keywords?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  blocks: { type: string; data: unknown }[];
};

const PAGE_TITLE_MAX = 60;
const PAGE_DESCRIPTION_MAX = 160;
const PAGE_KEYWORDS_MAX = 400;
const SEO_TITLE_MAX = 60;
const SEO_DESCRIPTION_MAX = 160;

function sanitizeTextField(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

/** Тип материала в разделе «Новости»: новость или статья (блок article_kind). */
function normalizeArticleKind(value: unknown): "news" | "article" {
  return value === "article" ? "article" : "news";
}

function mapPagesToListJson(pages: PageListForApi[], preferDbColumns: boolean) {
  return pages.map((p) => {
    const summary = p.blocks?.find((b) => b.type === "summary");
    const previewBlock = p.blocks?.find((b) => b.type === "preview");
    const keywordsBlock = p.blocks?.find((b) => b.type === "keywords");
    const seoTitleBlock = p.blocks?.find((b) => b.type === "seo_title");
    const seoDescriptionBlock = p.blocks?.find((b) => b.type === "seo_description");
    const fromSummary = (summary?.data as { text?: string } | undefined)?.text;
    const fromPreview = (previewBlock?.data as { src?: string } | undefined)?.src;
    const fromKeywords = (keywordsBlock?.data as { text?: string } | undefined)?.text;
    const fromSeoTitle = (seoTitleBlock?.data as { text?: string } | undefined)?.text;
    const fromSeoDescription =
      (seoDescriptionBlock?.data as { text?: string } | undefined)?.text;
    const description =
      preferDbColumns &&
      typeof p.description === "string" &&
      p.description.trim() !== ""
        ? p.description
        : typeof fromSummary === "string"
          ? fromSummary
          : null;
    const preview =
      preferDbColumns &&
      typeof p.preview === "string" &&
      p.preview.trim() !== ""
        ? p.preview
        : typeof fromPreview === "string"
          ? fromPreview
          : null;
    const keywords = typeof fromKeywords === "string" ? fromKeywords : null;
    const seoTitle = typeof fromSeoTitle === "string" ? fromSeoTitle : null;
    const seoDescription = typeof fromSeoDescription === "string" ? fromSeoDescription : null;
    const articleKindBlock = p.blocks?.find((b) => b.type === "article_kind");
    const rawKind = (articleKindBlock?.data as { kind?: string } | undefined)?.kind;
    const slugLower = String(p.slug ?? "")
      .trim()
      .replace(/\\/g, "/")
      .replace(/\/+/g, "/")
      .toLowerCase();
    const underArticles =
      slugLower === "articles" || slugLower.startsWith("articles/");
    let articleKind: "news" | "article" | undefined;
    if (articleKindBlock) {
      articleKind = rawKind === "article" ? "article" : "news";
    } else if (underArticles) {
      articleKind = "news";
    }
    return {
      id: p.id,
      title: p.title,
      slug: p.slug,
      status: p.status,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      description,
      preview,
      keywords,
      seoTitle,
      seoDescription,
      ...(articleKind ? { articleKind } : {}),
    };
  });
}

type BannerSlide = {
  id: string;
  title: string;
  announcementText?: string;
  bannerType?: "hero" | "image" | "split";
  showAnnouncement?: boolean;
  showLearnMore?: boolean;
  showAnnouncementLearnMore?: boolean;
  showBottomLearnMore?: boolean;
  subtitle?: string;
  buttonText?: string;
  learnMoreText?: string;
  announcementLearnMoreText?: string;
  announcementLearnMoreHref?: string;
  buttonHref?: string;
  showTitle?: boolean;
  showSubtitle?: boolean;
  showButton?: boolean;
  image: string | null;
  align?: "left" | "center" | "right";
  verticalAlign?: "top" | "middle" | "bottom";
  titleAlign?: "left" | "center" | "right";
  subtitleAlign?: "left" | "center" | "right";
  buttonAlign?: "left" | "center" | "right";
  fontSize?: number;
  lineHeight?: number;
  textColor?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  imagePosY?: number;
  showOverlay?: boolean;
  titleFontSize?: number;
  subtitleFontSize?: number;
  buttonFontSize?: number;
  titleColor?: string;
  subtitleColor?: string;
  buttonTextColor?: string;
  titleBold?: boolean;
  titleItalic?: boolean;
  subtitleBold?: boolean;
  subtitleItalic?: boolean;
  buttonBold?: boolean;
  buttonItalic?: boolean;
  /** Явная толщина шрифта (100..900). Если задана — приоритетнее, чем *Bold. */
  titleWeight?: number;
  subtitleWeight?: number;
  buttonWeight?: number;
  /** Зона текста: full / левая или правая половина (всегда явно в JSON, иначе клиент теряет значение при stringify). */
  textBand?: "full" | "left" | "right";
};

type ReviewSlide = {
  id: string;
  image: string | null;
};

type StoredFolder = {
  name: string;
  slug: string;
  description?: string;
  preview?: string;
  showInNavbar?: boolean;
};

function coerceToFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const t = value.trim().replace(",", ".");
    if (t === "") return undefined;
    const p = parseFloat(t);
    if (Number.isFinite(p)) return p;
  }
  return undefined;
}

function normalizeFontSizeToPercent(value: unknown): number {
  const n = coerceToFiniteNumber(value);
  if (n === undefined || Number.isNaN(n)) return 200;
  // Backward compatibility: old data was saved in px.
  if (n > 0 && n <= 64) {
    return Math.max(75, Math.min(400, Math.round((n / 16) * 100)));
  }
  return Math.max(75, Math.min(400, Math.round(n)));
}

const BANNERS_DATA_PATH = path.resolve(process.cwd(), "data", "banners.json");
const REVIEWS_DATA_PATH = path.resolve(process.cwd(), "data", "reviews.json");
const PARTNERS_DATA_PATH = path.resolve(process.cwd(), "data", "partners.json");
/** На проде задайте FOLDERS_JSON_PATH на каталог с правом записи (volume). */
const FOLDERS_DATA_PATH = (() => {
  const p = process.env.FOLDERS_JSON_PATH?.trim();
  if (p) return path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
  return path.resolve(process.cwd(), "data", "folders.json");
})();
const SITE_SETTINGS_DATA_PATH = path.resolve(process.cwd(), "data", "siteSettings.json");

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
  documents: {
    name: string;
    size: number;
    dataUrl: string;
  }[];
  topRibbonMessages: string[];
  director: {
    name: string;
    role: string;
    message: string;
    photo: string | null;
  };
  teamMembers: {
    name: string;
    role: string;
    photo: string | null;
  }[];
};

const SITE_DOCUMENTS_MAX = 3;
const SITE_DOCUMENT_MAX_BYTES = 20 * 1024 * 1024;
const TOP_RIBBON_MESSAGES_MAX = 8;
const TOP_RIBBON_MESSAGE_MAX_LEN = 58;
const TOP_RIBBON_ALLOWED_RE = /[^0-9A-Za-zА-Яа-яЁё\s.,:;!?()[\]{}"'`«»\-_/+&@#%№]/g;
const DIRECTOR_TEXT_MAX = 1000;
const TEAM_MEMBERS_MAX = 12;
const TEAM_MEMBER_TEXT_MAX = 120;
const TEAM_MEMBER_PHOTO_MAX_BYTES = 8 * 1024 * 1024;

const DEFAULT_SITE_SETTINGS: SiteSettings = {
  email: "info@центр-каталогизации.рф",
  phone: "+7 (495) 123-45-67",
  address: "г. Москва, набережная примерная, д. 1",
  social: {
    vk: "https://vk.com/",
    telegram: "https://t.me/",
    max: "",
    whatsapp: "https://wa.me/74951234567",
  },
  requisites: {
    companyName: "ООО «Центр каталогизации и анализа данных»",
    inn: "0000000000",
    kpp: "000000000",
    ogrn: "0000000000000",
  },
  documents: [],
  topRibbonMessages: [
    "Получите консультацию по каталогизации и обучению.",
    "Сопровождаем проекты от заявки до финального согласования.",
    "Поможем подобрать формат обучения для вашей команды.",
  ],
  director: {
    name: "",
    role: "Директор",
    message: "",
    photo: null,
  },
  teamMembers: [],
};

function sanitizeSiteDocuments(value: unknown): SiteSettings["documents"] {
  if (!Array.isArray(value)) return [];
  const out: SiteSettings["documents"] = [];
  const seen = new Set<string>();
  for (const raw of value) {
    if (out.length >= SITE_DOCUMENTS_MAX) break;
    if (typeof raw !== "object" || raw === null) continue;
    const item = raw as { name?: unknown; size?: unknown; dataUrl?: unknown };
    const name = typeof item.name === "string" ? item.name.trim() : "";
    const sizeNum = typeof item.size === "number" ? item.size : Number(item.size);
    const dataUrl = typeof item.dataUrl === "string" ? item.dataUrl.trim() : "";
    if (!name || !Number.isFinite(sizeNum) || sizeNum <= 0 || sizeNum > SITE_DOCUMENT_MAX_BYTES) continue;
    if (!/^data:application\/pdf;base64,/i.test(dataUrl)) continue;
    const key = `${name}:${Math.round(sizeNum)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      name,
      size: Math.round(sizeNum),
      dataUrl,
    });
  }
  return out;
}

function sanitizeTopRibbonMessages(value: unknown): string[] {
  if (!Array.isArray(value)) return DEFAULT_SITE_SETTINGS.topRibbonMessages;
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of value) {
    if (out.length >= TOP_RIBBON_MESSAGES_MAX) break;
    if (typeof raw !== "string") continue;
    const text = raw
      .replace(/\s+/g, " ")
      .replace(TOP_RIBBON_ALLOWED_RE, "")
      .trim()
      .slice(0, TOP_RIBBON_MESSAGE_MAX_LEN);
    if (!text) continue;
    if (seen.has(text)) continue;
    seen.add(text);
    out.push(text);
  }
  return out.length > 0 ? out : DEFAULT_SITE_SETTINGS.topRibbonMessages;
}

function sanitizeTeamMembers(value: unknown): SiteSettings["teamMembers"] {
  if (!Array.isArray(value)) return [];
  const out: SiteSettings["teamMembers"] = [];
  const seen = new Set<string>();
  const imageDataUrlRe = /^data:image\/(?:webp|png|jpe?g|gif);base64,([a-z0-9+/=]+)$/i;
  for (const raw of value) {
    if (out.length >= TEAM_MEMBERS_MAX) break;
    if (typeof raw !== "object" || raw === null) continue;
    const item = raw as { name?: unknown; role?: unknown; photo?: unknown };
    const name = typeof item.name === "string" ? item.name.trim().slice(0, TEAM_MEMBER_TEXT_MAX) : "";
    const role = typeof item.role === "string" ? item.role.trim().slice(0, TEAM_MEMBER_TEXT_MAX) : "";
    const photoRaw = typeof item.photo === "string" ? item.photo.trim() : "";
    const match = photoRaw.match(imageDataUrlRe);
    let photo: string | null = null;
    if (match) {
      const base64Payload = match[1] ?? "";
      const approxBytes = Math.floor((base64Payload.length * 3) / 4);
      if (approxBytes > 0 && approxBytes <= TEAM_MEMBER_PHOTO_MAX_BYTES) {
        photo = photoRaw;
      }
    }
    if (!name && !role && !photo) continue;
    const key = `${name}|${role}|${photo ? "1" : "0"}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name, role, photo });
  }
  return out;
}

function sanitizeDirector(value: unknown): SiteSettings["director"] {
  if (typeof value !== "object" || value === null) return DEFAULT_SITE_SETTINGS.director;
  const item = value as { name?: unknown; role?: unknown; message?: unknown; photo?: unknown };
  const name = typeof item.name === "string" ? item.name.trim().slice(0, TEAM_MEMBER_TEXT_MAX) : "";
  const role =
    typeof item.role === "string"
      ? item.role.trim().slice(0, TEAM_MEMBER_TEXT_MAX)
      : DEFAULT_SITE_SETTINGS.director.role;
  const message =
    typeof item.message === "string"
      ? item.message.trim().slice(0, DIRECTOR_TEXT_MAX)
      : DEFAULT_SITE_SETTINGS.director.message;
  const photoRaw = typeof item.photo === "string" ? item.photo.trim() : "";
  const match = photoRaw.match(/^data:image\/(?:webp|png|jpe?g|gif);base64,([a-z0-9+/=]+)$/i);
  let photo: string | null = null;
  if (match) {
    const base64Payload = match[1] ?? "";
    const approxBytes = Math.floor((base64Payload.length * 3) / 4);
    if (approxBytes > 0 && approxBytes <= TEAM_MEMBER_PHOTO_MAX_BYTES) {
      photo = photoRaw;
    }
  }
  return { name, role, message, photo };
}

const sortBlocksByOrder = <T extends { order: number }>(blocks: T[]) =>
  [...blocks].sort((a, b) => a.order - b.order);

async function normalizeInlineImageDataUrlsToWebp(html: string): Promise<string> {
  if (!html || !/data:image\//i.test(html)) return html;
  const re = /data:image\/([a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)/gi;
  const matches = Array.from(html.matchAll(re));
  if (matches.length === 0) return html;

  const unique = new Map<string, { mime: string; b64: string }>();
  for (const m of matches) {
    const full = m[0];
    const mime = (m[1] || "").toLowerCase();
    const b64 = m[2] || "";
    if (!full || !mime || !b64) continue;
    if (mime === "webp" || mime === "svg+xml") continue;
    if (!unique.has(full)) unique.set(full, { mime, b64 });
  }
  if (unique.size === 0) return html;

  let next = html;
  for (const [full, { b64 }] of unique) {
    try {
      const input = Buffer.from(b64, "base64");
      const output = await sharp(input).webp({ quality: 82 }).toBuffer();
      const webpDataUrl = `data:image/webp;base64,${output.toString("base64")}`;
      next = next.split(full).join(webpDataUrl);
    } catch {
      // keep original data-url if conversion fails
    }
  }
  return next;
}

async function normalizeBannerImageDataUrlToWebp(
  dataUrl: string | null,
): Promise<string | null> {
  if (!dataUrl || !/^data:image\//i.test(dataUrl)) return dataUrl;
  const match = dataUrl.match(/^data:image\/([a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/i);
  if (!match) return dataUrl;
  const mime = (match[1] || "").toLowerCase();
  const b64 = match[2] || "";
  if (!b64 || mime === "webp" || mime === "svg+xml") return dataUrl;
  try {
    const input = Buffer.from(b64, "base64");
    const image = sharp(input);
    const meta = await image.metadata();
    const width = meta.width ?? 0;
    const resized =
      width > 1920
        ? image.resize({ width: 1920, withoutEnlargement: true })
        : image;
    const output = await resized.webp({ quality: 78 }).toBuffer();
    return `data:image/webp;base64,${output.toString("base64")}`;
  } catch {
    return dataUrl;
  }
}

function isBannerSlideLike(item: unknown): item is Record<string, unknown> {
  if (typeof item !== "object" || item === null) return false;
  const obj = item as Record<string, unknown>;
  const id = obj.id;
  if (
    id !== undefined &&
    typeof id !== "string" &&
    typeof id !== "number"
  ) {
    return false;
  }
  /** title не проверяем — в sanitizeBannerSlide всё приводится к строке (иначе JSON/клиент могут дать number). */
  return typeof obj.image === "string" || obj.image === null;
}

function isReviewSlideLike(item: unknown): item is Record<string, unknown> {
  if (typeof item !== "object" || item === null) return false;
  const obj = item as Record<string, unknown>;
  const id = obj.id;
  if (
    id !== undefined &&
    typeof id !== "string" &&
    typeof id !== "number"
  ) {
    return false;
  }
  return typeof obj.image === "string" || obj.image === null;
}

function parseBannerH(
  v: unknown,
): "left" | "center" | "right" | undefined {
  return v === "left" || v === "right" || v === "center" ? v : undefined;
}

function normalizeBannerLineHeight(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) {
    return Math.min(3, Math.max(0.5, v));
  }
  if (typeof v === "string") {
    const n = parseFloat(v.trim().replace(",", "."));
    if (Number.isFinite(n)) return Math.min(3, Math.max(0.5, n));
  }
  return 1.2;
}

function normalizeLearnMoreText(value: unknown): string {
  if (typeof value !== "string") return "Learn more";
  const cleaned = value.replace(/\s*[→➝➡➜]+\s*$/u, "").trim();
  return cleaned.length > 0 ? cleaned : "Learn more";
}

function parseBannerType(value: unknown, hasImage: boolean): "hero" | "image" | "split" {
  if (value === "hero" || value === "image" || value === "split") return value;
  if (typeof value === "string") {
    const t = value.trim().toLowerCase();
    if (t === "hero" || t === "image" || t === "split") return t;
  }
  return hasImage ? "image" : "hero";
}

function normalizeFontWeight(value: unknown, fallback: number): number {
  const n = coerceToFiniteNumber(value);
  if (n === undefined) return fallback;
  const clamped = Math.max(100, Math.min(900, Math.round(n / 100) * 100));
  return clamped;
}

function sanitizeBannerSlide(item: Record<string, unknown>): BannerSlide {
  const alignRaw = item.align;
  const verticalAlignRaw = item.verticalAlign;
  const baseFontSize = normalizeFontSizeToPercent(item.fontSize);
  const baseColor = typeof item.textColor === "string" ? item.textColor : "#ffffff";
  const baseBold = typeof item.bold === "boolean" ? item.bold : false;
  const baseItalic = typeof item.italic === "boolean" ? item.italic : false;
  const baseTitleWeight = baseBold ? 700 : 400;
  return {
    id: String(item.id ?? ""),
    title: String(item.title ?? ""),
    announcementText:
      typeof item.announcementText === "string"
        ? item.announcementText
        : typeof (item as { announcement_text?: unknown }).announcement_text === "string"
          ? String((item as { announcement_text?: string }).announcement_text)
          : "Announcing our next round of funding.",
    bannerType: parseBannerType(
      (item as { bannerType?: unknown }).bannerType ??
        (item as { banner_type?: unknown }).banner_type,
      typeof item.image === "string" && item.image.trim().length > 0,
    ),
    subtitle: typeof item.subtitle === "string" ? item.subtitle : "",
    buttonText: typeof item.buttonText === "string" ? item.buttonText : "",
    learnMoreText:
      typeof (item as { learnMoreText?: unknown }).learnMoreText === "string"
        ? normalizeLearnMoreText((item as { learnMoreText?: string }).learnMoreText)
        : typeof (item as { learn_more_text?: unknown }).learn_more_text === "string"
          ? normalizeLearnMoreText((item as { learn_more_text?: string }).learn_more_text)
          : "Learn more",
    announcementLearnMoreText:
      typeof (item as { announcementLearnMoreText?: unknown }).announcementLearnMoreText === "string"
        ? normalizeLearnMoreText(
            (item as { announcementLearnMoreText?: string }).announcementLearnMoreText,
          )
        : typeof (item as { announcement_learn_more_text?: unknown }).announcement_learn_more_text === "string"
          ? normalizeLearnMoreText(
              (item as { announcement_learn_more_text?: string }).announcement_learn_more_text,
            )
          : typeof (item as { learnMoreText?: unknown }).learnMoreText === "string"
            ? normalizeLearnMoreText((item as { learnMoreText?: string }).learnMoreText)
            : "Learn more",
    showAnnouncement:
      typeof (item as { showAnnouncement?: unknown }).showAnnouncement === "boolean"
        ? ((item as { showAnnouncement?: boolean }).showAnnouncement as boolean)
        : true,
    showLearnMore:
      typeof (item as { showLearnMore?: unknown }).showLearnMore === "boolean"
        ? ((item as { showLearnMore?: boolean }).showLearnMore as boolean)
        : true,
    showAnnouncementLearnMore:
      typeof (item as { showAnnouncementLearnMore?: unknown }).showAnnouncementLearnMore === "boolean"
        ? ((item as { showAnnouncementLearnMore?: boolean }).showAnnouncementLearnMore as boolean)
        : typeof (item as { showLearnMore?: unknown }).showLearnMore === "boolean"
          ? ((item as { showLearnMore?: boolean }).showLearnMore as boolean)
          : true,
    showBottomLearnMore:
      typeof (item as { showBottomLearnMore?: unknown }).showBottomLearnMore === "boolean"
        ? ((item as { showBottomLearnMore?: boolean }).showBottomLearnMore as boolean)
        : typeof (item as { showLearnMore?: unknown }).showLearnMore === "boolean"
          ? ((item as { showLearnMore?: boolean }).showLearnMore as boolean)
          : true,
    announcementLearnMoreHref:
      typeof (item as { announcementLearnMoreHref?: unknown }).announcementLearnMoreHref === "string"
        ? (item as { announcementLearnMoreHref?: string }).announcementLearnMoreHref ?? ""
        : typeof (item as { announcement_learn_more_href?: unknown }).announcement_learn_more_href === "string"
          ? (item as { announcement_learn_more_href?: string }).announcement_learn_more_href ?? ""
          : typeof item.buttonHref === "string"
            ? item.buttonHref
            : "",
    buttonHref: typeof item.buttonHref === "string" ? item.buttonHref : "",
    showTitle: typeof item.showTitle === "boolean" ? item.showTitle : true,
    showSubtitle:
      typeof item.showSubtitle === "boolean" ? item.showSubtitle : false,
    showButton: typeof item.showButton === "boolean" ? item.showButton : false,
    image: typeof item.image === "string" || item.image === null ? item.image : null,
    align:
      alignRaw === "left" || alignRaw === "right" || alignRaw === "center"
        ? alignRaw
        : "center",
    verticalAlign:
      verticalAlignRaw === "top" ||
      verticalAlignRaw === "middle" ||
      verticalAlignRaw === "bottom"
        ? verticalAlignRaw
        : "middle",
    titleAlign: parseBannerH((item as { titleAlign?: unknown }).titleAlign),
    subtitleAlign: parseBannerH((item as { subtitleAlign?: unknown }).subtitleAlign),
    buttonAlign: parseBannerH((item as { buttonAlign?: unknown }).buttonAlign),
    fontSize: baseFontSize,
    titleFontSize: normalizeFontSizeToPercent(
      (item as { titleFontSize?: unknown }).titleFontSize ?? baseFontSize,
    ),
    subtitleFontSize: normalizeFontSizeToPercent(
      (item as { subtitleFontSize?: unknown }).subtitleFontSize ??
        Math.max(70, Math.round(baseFontSize * 0.5)),
    ),
    buttonFontSize: normalizeFontSizeToPercent(
      (item as { buttonFontSize?: unknown }).buttonFontSize ?? 100,
    ),
    titleColor:
      typeof (item as { titleColor?: unknown }).titleColor === "string"
        ? ((item as { titleColor?: string }).titleColor as string)
        : baseColor,
    subtitleColor:
      typeof (item as { subtitleColor?: unknown }).subtitleColor === "string"
        ? ((item as { subtitleColor?: string }).subtitleColor as string)
        : baseColor,
    buttonTextColor:
      typeof (item as { buttonTextColor?: unknown }).buttonTextColor === "string"
        ? ((item as { buttonTextColor?: string }).buttonTextColor as string)
        : "#ffffff",
    titleBold:
      typeof (item as { titleBold?: unknown }).titleBold === "boolean"
        ? ((item as { titleBold?: boolean }).titleBold as boolean)
        : baseBold,
    titleItalic:
      typeof (item as { titleItalic?: unknown }).titleItalic === "boolean"
        ? ((item as { titleItalic?: boolean }).titleItalic as boolean)
        : baseItalic,
    subtitleBold:
      typeof (item as { subtitleBold?: unknown }).subtitleBold === "boolean"
        ? ((item as { subtitleBold?: boolean }).subtitleBold as boolean)
        : false,
    subtitleItalic:
      typeof (item as { subtitleItalic?: unknown }).subtitleItalic === "boolean"
        ? ((item as { subtitleItalic?: boolean }).subtitleItalic as boolean)
        : false,
    buttonBold:
      typeof (item as { buttonBold?: unknown }).buttonBold === "boolean"
        ? ((item as { buttonBold?: boolean }).buttonBold as boolean)
        : true,
    buttonItalic:
      typeof (item as { buttonItalic?: unknown }).buttonItalic === "boolean"
        ? ((item as { buttonItalic?: boolean }).buttonItalic as boolean)
        : false,
    titleWeight: normalizeFontWeight(
      (item as { titleWeight?: unknown }).titleWeight,
      baseTitleWeight,
    ),
    subtitleWeight: normalizeFontWeight(
      (item as { subtitleWeight?: unknown }).subtitleWeight,
      400,
    ),
    buttonWeight: normalizeFontWeight(
      (item as { buttonWeight?: unknown }).buttonWeight,
      600,
    ),
    lineHeight: normalizeBannerLineHeight(item.lineHeight),
    textColor: typeof item.textColor === "string" ? item.textColor : "#ffffff",
    bold: typeof item.bold === "boolean" ? item.bold : false,
    italic: typeof item.italic === "boolean" ? item.italic : false,
    underline: typeof item.underline === "boolean" ? item.underline : false,
    imagePosY: typeof item.imagePosY === "number" ? item.imagePosY : 50,
    showOverlay:
      typeof item.showOverlay === "boolean" ? item.showOverlay : true,
    textBand: (() => {
      const tb = item.textBand ?? (item as { text_band?: unknown }).text_band;
      if (tb === "left" || tb === "right") return tb;
      if (tb === "full") return "full";
      if (typeof tb === "string") {
        const t = tb.trim().toLowerCase();
        if (t === "left" || t === "right") return t;
        if (t === "full") return "full";
      }
      return "full";
    })(),
  };
}

function sanitizeReviewSlide(item: Record<string, unknown>): ReviewSlide {
  return {
    id: String(item.id ?? ""),
    image: typeof item.image === "string" || item.image === null ? item.image : null,
  };
}

/** PUT /reviews и /partners: нормализация картинок и устойчивость к сбоям sharp/IO. */
async function buildReviewSlidesFromInput(input: unknown[]): Promise<ReviewSlide[]> {
  const rawSlides = input
    .filter((item): item is Record<string, unknown> => isReviewSlideLike(item))
    .map((item) => sanitizeReviewSlide(item))
    .filter((s) => s.id.trim() !== "");

  const slides: ReviewSlide[] = [];
  for (const slide of rawSlides) {
    try {
      const image = await normalizeBannerImageDataUrlToWebp(slide.image);
      slides.push({ ...slide, image });
    } catch (e: unknown) {
      // eslint-disable-next-line no-console
      console.error("[review/partner slide image]", slide.id, e);
      slides.push(slide);
    }
  }
  return slides;
}

async function buildBannerSlidesFromInput(input: unknown[]): Promise<BannerSlide[]> {
  const rawSlides = input
    .filter((item): item is Record<string, unknown> => isBannerSlideLike(item))
    .map((item) => sanitizeBannerSlide(item))
    .filter((s) => s.id.trim() !== "");

  const slides: BannerSlide[] = [];
  for (const slide of rawSlides) {
    try {
      const image = await normalizeBannerImageDataUrlToWebp(slide.image);
      slides.push({ ...slide, image });
    } catch (e: unknown) {
      // eslint-disable-next-line no-console
      console.error("[banner slide image]", slide.id, e);
      slides.push(slide);
    }
  }
  return slides;
}

async function readBannersFromFile(): Promise<BannerSlide[]> {
  try {
    const raw = await fs.readFile(BANNERS_DATA_PATH, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const slides = parsed
      .filter((item): item is Record<string, unknown> => isBannerSlideLike(item))
      .map((item) => sanitizeBannerSlide(item));

    // Lazy migration for old non-webp data URLs in existing banners file.
    let changed = false;
    const normalizedSlides: BannerSlide[] = [];
    for (const slide of slides) {
      const nextImage = await normalizeBannerImageDataUrlToWebp(slide.image);
      if (nextImage !== slide.image) changed = true;
      normalizedSlides.push({ ...slide, image: nextImage });
    }
    if (changed) {
      await writeBannersToFile(normalizedSlides);
    }
    return normalizedSlides;
  } catch {
    return [];
  }
}

async function writeBannersToFile(slides: BannerSlide[]): Promise<void> {
  await fs.mkdir(path.dirname(BANNERS_DATA_PATH), { recursive: true });
  await fs.writeFile(
    BANNERS_DATA_PATH,
    JSON.stringify(slides, null, 2),
    "utf-8",
  );
}

async function readReviewsFromFile(): Promise<ReviewSlide[]> {
  try {
    const raw = await fs.readFile(REVIEWS_DATA_PATH, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const slides = parsed
      .filter((item): item is Record<string, unknown> => isReviewSlideLike(item))
      .map((item) => sanitizeReviewSlide(item));

    let changed = false;
    const normalizedSlides: ReviewSlide[] = [];
    for (const slide of slides) {
      const nextImage = await normalizeBannerImageDataUrlToWebp(slide.image);
      if (nextImage !== slide.image) changed = true;
      normalizedSlides.push({ ...slide, image: nextImage });
    }
    if (changed) {
      await writeReviewsToFile(normalizedSlides);
    }
    return normalizedSlides;
  } catch {
    return [];
  }
}

async function writeReviewsToFile(slides: ReviewSlide[]): Promise<void> {
  await fs.mkdir(path.dirname(REVIEWS_DATA_PATH), { recursive: true });
  await fs.writeFile(
    REVIEWS_DATA_PATH,
    JSON.stringify(slides, null, 2),
    "utf-8",
  );
}

async function readPartnersFromFile(): Promise<ReviewSlide[]> {
  try {
    const raw = await fs.readFile(PARTNERS_DATA_PATH, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const slides = parsed
      .filter((item): item is Record<string, unknown> => isReviewSlideLike(item))
      .map((item) => sanitizeReviewSlide(item));

    let changed = false;
    const normalizedSlides: ReviewSlide[] = [];
    for (const slide of slides) {
      const nextImage = await normalizeBannerImageDataUrlToWebp(slide.image);
      if (nextImage !== slide.image) changed = true;
      normalizedSlides.push({ ...slide, image: nextImage });
    }
    if (changed) {
      await writePartnersToFile(normalizedSlides);
    }
    return normalizedSlides;
  } catch {
    return [];
  }
}

async function writePartnersToFile(slides: ReviewSlide[]): Promise<void> {
  await fs.mkdir(path.dirname(PARTNERS_DATA_PATH), { recursive: true });
  await fs.writeFile(
    PARTNERS_DATA_PATH,
    JSON.stringify(slides, null, 2),
    "utf-8",
  );
}

async function readFoldersFromFile(): Promise<StoredFolder[]> {
  try {
    const raw = await fs.readFile(FOLDERS_DATA_PATH, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is Record<string, unknown> => {
        return (
          typeof item === "object" &&
          item !== null &&
          typeof item.name === "string" &&
          typeof item.slug === "string"
        );
      })
      .map((item) => ({
        name: String(item.name ?? "").trim(),
        slug: String(item.slug ?? "").trim(),
        description:
          typeof item.description === "string" ? item.description.trim() : "",
        preview: (typeof item.preview === "string" ? item.preview : "").trim(),
        showInNavbar: Boolean(item.showInNavbar),
      }))
      .filter((f) => f.name && f.slug);
  } catch {
    return [];
  }
}

async function writeFoldersToFile(folders: StoredFolder[]): Promise<void> {
  await fs.mkdir(path.dirname(FOLDERS_DATA_PATH), { recursive: true });
  await fs.writeFile(
    FOLDERS_DATA_PATH,
    JSON.stringify(folders, null, 2),
    "utf-8",
  );
}

async function readSiteSettingsFromFile(): Promise<SiteSettings> {
  try {
    const raw = await fs.readFile(SITE_SETTINGS_DATA_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<SiteSettings>;
    const social = (parsed?.social ?? {}) as Partial<SiteSettings["social"]>;
    const requisites = (parsed?.requisites ?? {}) as Partial<SiteSettings["requisites"]>;
    const documents = sanitizeSiteDocuments((parsed as { documents?: unknown })?.documents);
    const topRibbonMessages = sanitizeTopRibbonMessages(
      (parsed as { topRibbonMessages?: unknown })?.topRibbonMessages,
    );
    const director = sanitizeDirector((parsed as { director?: unknown })?.director);
    const teamMembers = sanitizeTeamMembers((parsed as { teamMembers?: unknown })?.teamMembers);
    return {
      email: typeof parsed?.email === "string" ? parsed.email.trim() : DEFAULT_SITE_SETTINGS.email,
      phone: typeof parsed?.phone === "string" ? parsed.phone.trim() : DEFAULT_SITE_SETTINGS.phone,
      address:
        typeof parsed?.address === "string" ? parsed.address.trim() : DEFAULT_SITE_SETTINGS.address,
      social: {
        vk: typeof social.vk === "string" ? social.vk.trim() : DEFAULT_SITE_SETTINGS.social.vk,
        telegram:
          typeof social.telegram === "string"
            ? social.telegram.trim()
            : DEFAULT_SITE_SETTINGS.social.telegram,
        max:
          typeof (social as { max?: unknown }).max === "string"
            ? String((social as { max?: string }).max).trim()
            : DEFAULT_SITE_SETTINGS.social.max,
        whatsapp:
          typeof social.whatsapp === "string"
            ? social.whatsapp.trim()
            : DEFAULT_SITE_SETTINGS.social.whatsapp,
      },
      requisites: {
        companyName:
          typeof requisites.companyName === "string"
            ? requisites.companyName.trim()
            : DEFAULT_SITE_SETTINGS.requisites.companyName,
        inn: typeof requisites.inn === "string" ? requisites.inn.trim() : DEFAULT_SITE_SETTINGS.requisites.inn,
        kpp: typeof requisites.kpp === "string" ? requisites.kpp.trim() : DEFAULT_SITE_SETTINGS.requisites.kpp,
        ogrn: typeof requisites.ogrn === "string" ? requisites.ogrn.trim() : DEFAULT_SITE_SETTINGS.requisites.ogrn,
      },
      documents,
      topRibbonMessages,
      director,
      teamMembers,
    };
  } catch {
    return DEFAULT_SITE_SETTINGS;
  }
}

async function writeSiteSettingsToFile(settings: SiteSettings): Promise<void> {
  await fs.mkdir(path.dirname(SITE_SETTINGS_DATA_PATH), { recursive: true });
  await fs.writeFile(SITE_SETTINGS_DATA_PATH, JSON.stringify(settings, null, 2), "utf-8");
}

pagesRouter.get("/banners", async (_req, res) => {
  const slides = await readBannersFromFile();
  // eslint-disable-next-line no-console
  console.log(
    "[BANNERS_API] GET",
    slides.map((s) => ({
      id: s.id,
      showOverlay: s.showOverlay,
      textBand: s.textBand,
    })),
  );
  res.set("Cache-Control", "no-store, max-age=0");
  return res.json({ slides });
});

pagesRouter.put("/banners", async (req, res) => {
  try {
    const body = req.body ?? {};
    const input = (body as { slides?: unknown }).slides;
    if (!Array.isArray(input)) {
      return res.status(400).json({ error: "slides array is required" });
    }

    const slides = await buildBannerSlidesFromInput(input);
    await writeBannersToFile(slides);
    // eslint-disable-next-line no-console
    console.log(
      "[BANNERS_API] PUT",
      slides.map((s) => ({ id: s.id, showOverlay: s.showOverlay })),
    );
    return res.json({ ok: true, slides });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    // eslint-disable-next-line no-console
    console.error("[PUT /banners]", BANNERS_DATA_PATH, msg);
    return res.status(500).json({
      error: "Failed to save banners",
      detail: msg,
      path: BANNERS_DATA_PATH,
    });
  }
});

pagesRouter.get("/reviews", async (_req, res) => {
  try {
    const slides = await readReviewsFromFile();
    return res.json({ slides });
  } catch (e: unknown) {
    // eslint-disable-next-line no-console
    console.error("[GET /reviews]", e);
    return res.json({ slides: [] });
  }
});

pagesRouter.put("/reviews", async (req, res) => {
  try {
    const body = req.body ?? {};
    const input = (body as { slides?: unknown }).slides;
    if (!Array.isArray(input)) {
      return res.status(400).json({ error: "slides array is required" });
    }

    const slides = await buildReviewSlidesFromInput(input);
    await writeReviewsToFile(slides);
    return res.json({ ok: true, slides });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    // eslint-disable-next-line no-console
    console.error("[PUT /reviews]", REVIEWS_DATA_PATH, msg);
    return res.status(500).json({
      error: "Failed to save reviews",
      detail: msg,
      path: REVIEWS_DATA_PATH,
    });
  }
});

pagesRouter.get("/partners", async (_req, res) => {
  try {
    const slides = await readPartnersFromFile();
    return res.json({ slides });
  } catch (e: unknown) {
    // eslint-disable-next-line no-console
    console.error("[GET /partners]", e);
    return res.json({ slides: [] });
  }
});

pagesRouter.put("/partners", async (req, res) => {
  try {
    const body = req.body ?? {};
    const input = (body as { slides?: unknown }).slides;
    if (!Array.isArray(input)) {
      return res.status(400).json({ error: "slides array is required" });
    }

    const slides = await buildReviewSlidesFromInput(input);
    await writePartnersToFile(slides);
    return res.json({ ok: true, slides });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    // eslint-disable-next-line no-console
    console.error("[PUT /partners]", PARTNERS_DATA_PATH, msg);
    return res.status(500).json({
      error: "Failed to save partners",
      detail: msg,
      path: PARTNERS_DATA_PATH,
    });
  }
});

pagesRouter.get("/folders", async (_req, res) => {
  const folders = await readFoldersFromFile();
  res.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
  return res.json({ folders });
});

pagesRouter.put("/folders", async (req, res) => {
  try {
    const body = req.body ?? {};
    const input = (body as { folders?: unknown }).folders;
    if (!Array.isArray(input)) {
      return res.status(400).json({ error: "folders array is required" });
    }

    const normalized = input
      .filter((item): item is Record<string, unknown> => {
        return (
          typeof item === "object" &&
          item !== null &&
          typeof item.name === "string" &&
          typeof item.slug === "string"
        );
      })
      .map((item) => ({
        name: String(item.name ?? "").trim(),
        slug: String(item.slug ?? "")
          .trim()
          .replace(/^\/+|\/+$/g, "")
          .replace(/\\/g, "/")
          .replace(/\/+/g, "/")
          .toLowerCase(),
        description:
          typeof item.description === "string" ? item.description.trim() : "",
        preview: (typeof item.preview === "string" ? item.preview : "").trim(),
        showInNavbar: Boolean(item.showInNavbar),
      }))
      .filter((f) => f.name && f.slug);

    await writeFoldersToFile(normalized);
    return res.json({ ok: true, folders: normalized });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    // eslint-disable-next-line no-console
    console.error("[folders PUT]", FOLDERS_DATA_PATH, msg);
    return res.status(500).json({
      error: "Failed to save folders",
      detail: msg,
      path: FOLDERS_DATA_PATH,
    });
  }
});

pagesRouter.get("/site-settings", async (_req, res) => {
  const settings = await readSiteSettingsFromFile();
  res.set("Cache-Control", "no-store, max-age=0");
  return res.json({ settings });
});

pagesRouter.put("/site-settings", async (req, res) => {
  const body = (req.body ?? {}) as { settings?: unknown };
  const input = body.settings;
  if (typeof input !== "object" || input === null) {
    return res.status(400).json({ error: "settings object is required" });
  }
  const s = input as Partial<SiteSettings>;
  const social = (s.social ?? {}) as Partial<SiteSettings["social"]>;
  const requisites = (s.requisites ?? {}) as Partial<SiteSettings["requisites"]>;
  const documents = sanitizeSiteDocuments((s as { documents?: unknown })?.documents);
  const topRibbonMessages = sanitizeTopRibbonMessages(
    (s as { topRibbonMessages?: unknown })?.topRibbonMessages,
  );
  const director = sanitizeDirector((s as { director?: unknown })?.director);
  const teamMembers = sanitizeTeamMembers((s as { teamMembers?: unknown })?.teamMembers);
  const next: SiteSettings = {
    email: typeof s.email === "string" ? s.email.trim() : DEFAULT_SITE_SETTINGS.email,
    phone: typeof s.phone === "string" ? s.phone.trim() : DEFAULT_SITE_SETTINGS.phone,
    address: typeof s.address === "string" ? s.address.trim() : DEFAULT_SITE_SETTINGS.address,
    social: {
      vk: typeof social.vk === "string" ? social.vk.trim() : DEFAULT_SITE_SETTINGS.social.vk,
      telegram:
        typeof social.telegram === "string" ? social.telegram.trim() : DEFAULT_SITE_SETTINGS.social.telegram,
      max:
        typeof (social as { max?: unknown }).max === "string"
          ? String((social as { max?: string }).max).trim()
          : DEFAULT_SITE_SETTINGS.social.max,
      whatsapp:
        typeof social.whatsapp === "string" ? social.whatsapp.trim() : DEFAULT_SITE_SETTINGS.social.whatsapp,
    },
    requisites: {
      companyName:
        typeof requisites.companyName === "string"
          ? requisites.companyName.trim()
          : DEFAULT_SITE_SETTINGS.requisites.companyName,
      inn: typeof requisites.inn === "string" ? requisites.inn.trim() : DEFAULT_SITE_SETTINGS.requisites.inn,
      kpp: typeof requisites.kpp === "string" ? requisites.kpp.trim() : DEFAULT_SITE_SETTINGS.requisites.kpp,
      ogrn: typeof requisites.ogrn === "string" ? requisites.ogrn.trim() : DEFAULT_SITE_SETTINGS.requisites.ogrn,
    },
    documents,
    topRibbonMessages,
    director,
    teamMembers,
  };

  await writeSiteSettingsToFile(next);
  return res.json({ ok: true, settings: next });
});

// Get list of pages
pagesRouter.get("/", async (_req, res, next) => {
  const blockSubset = {
    where: {
      type: {
        in: [
          "summary",
          "preview",
          "keywords",
          "seo_title",
          "seo_description",
          "article_kind",
        ],
      },
    },
    select: { type: true, data: true },
    take: 8,
  };

  const selectWithColumns = {
    id: true,
    title: true,
    slug: true,
    status: true,
    createdAt: true,
    updatedAt: true,
    description: true,
    preview: true,
    blocks: blockSubset,
  };

  const selectLegacy = {
    id: true,
    title: true,
    slug: true,
    status: true,
    createdAt: true,
    updatedAt: true,
    blocks: blockSubset,
  };

  try {
    const pages = await prisma.page.findMany({
      orderBy: { id: "desc" },
      select: selectWithColumns,
    });
    res.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
    return res.json(mapPagesToListJson(pages as unknown as PageListForApi[], true));
  } catch (e) {
    if (!isMissingDbColumnError(e)) return next(e);
    const pages = await prisma.page.findMany({
      orderBy: { id: "desc" },
      select: selectLegacy,
    });
    res.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
    return res.json(mapPagesToListJson(pages as unknown as PageListForApi[], false));
  }
});

/** Express 5: /slug/{*path} — вложенные slug без %2F в одном сегменте (nginx/CDN не режут путь). */
function slugFromPathParam(path: unknown): string {
  if (Array.isArray(path)) {
    return path.map((p) => String(p)).join("/");
  }
  if (typeof path === "string") return path;
  return "";
}

// Get page by slug (for public client)
pagesRouter.get("/slug/{*path}", async (req, res) => {
  const slug = slugFromPathParam(req.params.path);

  if (!slug) {
    return res.status(400).json({ error: "slug is required" });
  }

  const page = await prisma.page.findFirst({
    where: { slug },
    include: { blocks: true },
  });

  if (!page) {
    return res.status(404).json({ error: "Page not found" });
  }

  return res.json({
    ...page,
    blocks: sortBlocksByOrder(page.blocks),
  });
});

// Get single page with blocks
pagesRouter.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "Invalid id" });
  }

  const page = await prisma.page.findUnique({
    where: { id },
    include: { blocks: true },
  });

  if (!page) {
    return res.status(404).json({ error: "Page not found" });
  }

  return res.json({
    ...page,
    blocks: sortBlocksByOrder(page.blocks),
  });
});

// Create page with blocks
pagesRouter.post("/", async (req, res) => {
  const {
    title,
    slug,
    status = "DRAFT",
    blocks = [],
    description,
    preview,
    keywords,
    seoTitle,
    seoDescription,
  } = req.body ?? {};

  const titleValue = sanitizeTextField(title, PAGE_TITLE_MAX);
  const slugValue = typeof slug === "string" ? slug.trim() : "";
  if (!titleValue || !slugValue) {
    return res.status(400).json({ error: "title and slug are required" });
  }

  try {
    // TODO: replace with real auth user.
    // For now ensure author exists so page creation doesn't fail on fresh DB.
    const requiredAuthorId = 1;
    let authorId = requiredAuthorId;

    const existingAuthor = await prisma.user.findUnique({
      where: { id: requiredAuthorId },
      select: { id: true },
    });

    if (!existingAuthor) {
      const createdAuthor = await prisma.user.create({
        data: {
          email: "admin@example.com",
          password: "dev-password",
          name: "Admin",
          role: "ADMIN",
        },
        select: { id: true },
      });
      authorId = createdAuthor.id;
    }

    const initialBlocks: any[] = [];
    for (let index = 0; index < (blocks as any[]).length; index += 1) {
      const b = (blocks as any[])[index];
      const type = b.type ?? "text";
      const data: any = b.data ?? {};
      if (type === "text" && typeof data.text === "string") {
        data.text = await normalizeInlineImageDataUrlsToWebp(data.text);
      }
      initialBlocks.push({
        type,
        order: index,
        data,
      });
    }
    const descriptionValue = sanitizeTextField(description, PAGE_DESCRIPTION_MAX);
    const previewValue = typeof preview === "string" ? preview.trim() : "";
    const keywordsValue = sanitizeTextField(keywords, PAGE_KEYWORDS_MAX);
    const seoTitleValue = sanitizeTextField(seoTitle, SEO_TITLE_MAX);
    const seoDescriptionValue = sanitizeTextField(seoDescription, SEO_DESCRIPTION_MAX);
    if (descriptionValue) {
      initialBlocks.push({
        type: "summary",
        order: initialBlocks.length,
        data: { text: descriptionValue },
      });
    }
    if (previewValue) {
      initialBlocks.push({
        type: "preview",
        order: initialBlocks.length,
        data: { src: previewValue },
      });
    }
    if (keywordsValue) {
      initialBlocks.push({
        type: "keywords",
        order: initialBlocks.length,
        data: { text: keywordsValue },
      });
    }
    if (seoTitleValue) {
      initialBlocks.push({
        type: "seo_title",
        order: initialBlocks.length,
        data: { text: seoTitleValue },
      });
    }
    if (seoDescriptionValue) {
      initialBlocks.push({
        type: "seo_description",
        order: initialBlocks.length,
        data: { text: seoDescriptionValue },
      });
    }

    const slugLower = slugValue.toLowerCase().replace(/\\/g, "/").replace(/\/+/g, "/");
    const underArticles = slugLower === "articles" || slugLower.startsWith("articles/");
    if (underArticles) {
      const articleKindInput = normalizeArticleKind((req.body as { articleKind?: unknown })?.articleKind);
      initialBlocks.push({
        type: "article_kind",
        order: initialBlocks.length,
        data: { kind: articleKindInput },
      });
    }

    const createPayload = {
      title: titleValue,
      slug: slugValue,
      status,
      authorId,
      blocks: {
        create: initialBlocks,
      },
    };
    let page;
    try {
      page = await prisma.page.create({
        data: {
          ...createPayload,
          description: descriptionValue || null,
          preview: previewValue || null,
        },
        include: { blocks: true },
      });
    } catch (createErr) {
      if (!isMissingDbColumnError(createErr)) throw createErr;
      page = await prisma.page.create({
        data: createPayload,
        include: { blocks: true },
      });
    }
    return res.status(201).json({
      ...page,
      blocks: sortBlocksByOrder(page.blocks),
    });
  } catch (e: any) {
    if (e.code === "P2002") {
      return res.status(409).json({ error: "Slug must be unique" });
    }
    // eslint-disable-next-line no-console
    console.error(e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Rename a folder slug (URL prefix) for all pages inside it — ДОЛЖЕН быть выше PUT /:id, иначе "folder-rename" попадает в :id.
// Example: oldSlug="articles" -> pages.slug "articles/..." become "newSlug/..."
pagesRouter.put("/folder-rename", async (req, res) => {
  const { oldSlug, newSlug } = req.body ?? {};

  if (!oldSlug || !newSlug) {
    return res.status(400).json({ error: "oldSlug and newSlug are required" });
  }
  if (oldSlug === newSlug) {
    return res.json({ renamed: 0 });
  }

  const oldPrefix = `${oldSlug}/`;
  const newPrefix = `${newSlug}/`;

  try {
    const pagesToRename = await prisma.page.findMany({
      where: {
        slug: { startsWith: oldPrefix },
      },
      select: { id: true, slug: true },
    });

    const updates = pagesToRename.map((p) => {
      const updatedSlug = p.slug.replace(oldPrefix, newPrefix);
      return prisma.page.update({
        where: { id: p.id },
        data: { slug: updatedSlug },
      });
    });

    await prisma.$transaction(updates);
    return res.json({ renamed: pagesToRename.length });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return res.status(409).json({ error: "Slug must be unique" });
    }
    // eslint-disable-next-line no-console
    console.error(e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Update page by id
pagesRouter.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "Invalid id" });
  }

  const { title, slug, text, description, preview, keywords, seoTitle, seoDescription, status, articleKind } =
    req.body ?? {};
  const titleValue = sanitizeTextField(title, PAGE_TITLE_MAX);
  const slugValue = typeof slug === "string" ? slug.trim() : "";
  if (!titleValue || !slugValue) {
    return res.status(400).json({ error: "title and slug are required" });
  }
  if (
    Object.prototype.hasOwnProperty.call(req.body ?? {}, "status") &&
    status !== "DRAFT" &&
    status !== "PUBLISHED"
  ) {
    return res.status(400).json({ error: "invalid_status" });
  }

  try {
    const body = req.body ?? {};
    const hasText = Object.prototype.hasOwnProperty.call(body, "text");
    const hasDescription = Object.prototype.hasOwnProperty.call(body, "description");
    const hasPreview = Object.prototype.hasOwnProperty.call(body, "preview");
    const hasKeywords = Object.prototype.hasOwnProperty.call(body, "keywords");
    const hasSeoTitle = Object.prototype.hasOwnProperty.call(body, "seoTitle");
    const hasSeoDescription = Object.prototype.hasOwnProperty.call(body, "seoDescription");
    const hasStatus = Object.prototype.hasOwnProperty.call(body, "status");
    const hasArticleKind = Object.prototype.hasOwnProperty.call(body, "articleKind");

    const existing = await prisma.page.findUnique({
      where: { id },
      include: {
        blocks: {
          where: {
            type: {
              in: [
                "text",
                "summary",
                "preview",
                "keywords",
                "seo_title",
                "seo_description",
                "article_kind",
              ],
            },
          },
          select: { id: true, type: true },
        },
      },
    });

    if (!existing) {
      return res.status(404).json({ error: "Page not found" });
    }

    const descriptionValue = sanitizeTextField(description, PAGE_DESCRIPTION_MAX);
    const previewValue = typeof preview === "string" ? preview.trim() : "";
    const keywordsValue = sanitizeTextField(keywords, PAGE_KEYWORDS_MAX);
    const seoTitleValue = sanitizeTextField(seoTitle, SEO_TITLE_MAX);
    const seoDescriptionValue = sanitizeTextField(seoDescription, SEO_DESCRIPTION_MAX);
    const articleKindValue = normalizeArticleKind(articleKind);

    await prisma.page
      .update({
        where: { id },
        data: {
          title: titleValue,
          slug: slugValue,
          ...(hasStatus ? { status } : {}),
          ...(hasDescription ? { description: descriptionValue || null } : {}),
          ...(hasPreview ? { preview: previewValue || null } : {}),
        },
      })
      .catch(async (err) => {
        if (!isMissingDbColumnError(err)) throw err;
        await prisma.page.update({
          where: { id },
          data: {
            title: titleValue,
            slug: slugValue,
            ...(hasStatus ? { status } : {}),
          },
        });
      });

    const firstTextBlock = existing.blocks.find((b) => b.type === "text");
    if (hasText) {
      const textValueRaw = typeof text === "string" ? text.trim() : "";
      const textValue = textValueRaw
        ? await normalizeInlineImageDataUrlsToWebp(textValueRaw)
        : "";
      if (textValue) {
        if (firstTextBlock) {
          await prisma.block.update({
            where: { id: firstTextBlock.id },
            data: { data: { text: textValue } },
          });
        } else {
          await prisma.block.create({
            data: {
              pageId: id,
              type: "text",
              order: 0,
              data: { text: textValue },
            },
          });
        }
      } else if (firstTextBlock) {
        await prisma.block.deleteMany({
          where: { pageId: id, type: "text" },
        });
      }
    }

    const firstSummaryBlock = existing.blocks.find((b) => b.type === "summary");
    if (hasDescription) {
      if (descriptionValue) {
        if (firstSummaryBlock) {
          await prisma.block.update({
            where: { id: firstSummaryBlock.id },
            data: { data: { text: descriptionValue } },
          });
        } else {
          await prisma.block.create({
            data: {
              pageId: id,
              type: "summary",
              order: 0,
              data: { text: descriptionValue },
            },
          });
        }
      } else if (firstSummaryBlock) {
        await prisma.block.deleteMany({
          where: { pageId: id, type: "summary" },
        });
      }
    }

    const firstPreviewBlock = existing.blocks.find((b) => b.type === "preview");
    if (hasPreview) {
      if (previewValue) {
        if (firstPreviewBlock) {
          await prisma.block.update({
            where: { id: firstPreviewBlock.id },
            data: { data: { src: previewValue } },
          });
        } else {
          await prisma.block.create({
            data: {
              pageId: id,
              type: "preview",
              order: 0,
              data: { src: previewValue },
            },
          });
        }
      } else if (firstPreviewBlock) {
        await prisma.block.deleteMany({
          where: { pageId: id, type: "preview" },
        });
      }
    }

    const firstKeywordsBlock = existing.blocks.find((b) => b.type === "keywords");
    if (hasKeywords) {
      if (keywordsValue) {
        if (firstKeywordsBlock) {
          await prisma.block.update({
            where: { id: firstKeywordsBlock.id },
            data: { data: { text: keywordsValue } },
          });
        } else {
          await prisma.block.create({
            data: {
              pageId: id,
              type: "keywords",
              order: 0,
              data: { text: keywordsValue },
            },
          });
        }
      } else if (firstKeywordsBlock) {
        await prisma.block.deleteMany({
          where: { pageId: id, type: "keywords" },
        });
      }
    }

    const firstSeoTitleBlock = existing.blocks.find((b) => b.type === "seo_title");
    if (hasSeoTitle) {
      if (seoTitleValue) {
        if (firstSeoTitleBlock) {
          await prisma.block.update({
            where: { id: firstSeoTitleBlock.id },
            data: { data: { text: seoTitleValue } },
          });
        } else {
          await prisma.block.create({
            data: {
              pageId: id,
              type: "seo_title",
              order: 0,
              data: { text: seoTitleValue },
            },
          });
        }
      } else if (firstSeoTitleBlock) {
        await prisma.block.deleteMany({
          where: { pageId: id, type: "seo_title" },
        });
      }
    }

    const firstSeoDescriptionBlock = existing.blocks.find((b) => b.type === "seo_description");
    if (hasSeoDescription) {
      if (seoDescriptionValue) {
        if (firstSeoDescriptionBlock) {
          await prisma.block.update({
            where: { id: firstSeoDescriptionBlock.id },
            data: { data: { text: seoDescriptionValue } },
          });
        } else {
          await prisma.block.create({
            data: {
              pageId: id,
              type: "seo_description",
              order: 0,
              data: { text: seoDescriptionValue },
            },
          });
        }
      } else if (firstSeoDescriptionBlock) {
        await prisma.block.deleteMany({
          where: { pageId: id, type: "seo_description" },
        });
      }
    }

    const firstArticleKindBlock = existing.blocks.find((b) => b.type === "article_kind");
    if (hasArticleKind) {
      const kindData = { kind: articleKindValue };
      if (firstArticleKindBlock) {
        await prisma.block.update({
          where: { id: firstArticleKindBlock.id },
          data: { data: kindData },
        });
      } else {
        await prisma.block.create({
          data: {
            pageId: id,
            type: "article_kind",
            order: 0,
            data: kindData,
          },
        });
      }
    }

    const updated = await prisma.page.findUnique({
      where: { id },
      include: { blocks: true },
    });
    if (!updated) {
      return res.status(404).json({ error: "Page not found" });
    }
    return res.json({
      ...updated,
      blocks: sortBlocksByOrder(updated.blocks),
    });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return res.status(409).json({ error: "Slug must be unique" });
    }
    // eslint-disable-next-line no-console
    console.error(e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Delete page by id
pagesRouter.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "Invalid id" });
  }

  try {
    await prisma.$transaction([
      prisma.block.deleteMany({ where: { pageId: id } }),
      prisma.page.delete({ where: { id } }),
    ]);
    return res.status(204).send();
  } catch (e: any) {
    if (e?.code === "P2025") {
      return res.status(404).json({ error: "Page not found" });
    }
    // eslint-disable-next-line no-console
    console.error(e);
    return res.status(500).json({ error: "Internal server error" });
  }
});
