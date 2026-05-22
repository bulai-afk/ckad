"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCarouselSwipe } from "@/hooks/useCarouselSwipe";
import { BannerCarouselFrame } from "@/components/BannerCarouselFrame";
import { BannerPreviewReadonly } from "@/components/BannerPreviewReadonly";
import {
  BannerCoverEditorSlide,
  type BannerCoverFocusField,
} from "@/components/admin/BannerCoverEditorSlide";
import { BannerCoverFormatBar } from "@/components/admin/BannerCoverFormatBar";
import {
  BannerCoverButtonLinkModal,
  type BannerCoverLinkModalTarget,
} from "@/components/admin/BannerCoverButtonLinkModal";
import {
  getCoverAspectCarouselClassName,
  type CoverAspectPresetId,
} from "@/lib/bannerCoverPresets";
import { parseBannersApiPayload } from "@/lib/bannersPayload";
import { getBannerCoverFormatBarCss } from "@/lib/bannerCoverEditorChromeCss";
import {
  BANNER_COVER_DEFAULT_CONTENT,
  normalizeBannerCoverAnnouncementLearnMore,
  normalizeBannerCoverAnnouncementText,
  normalizeBannerCoverButtonSecondary,
} from "@/lib/bannerCoverDefaults";
import {
  normalizeBannerLineHeight,
  parseBannerTextBand,
} from "@/lib/bannerElementPosition";
import { normalizeFontSizeToPercent } from "@/lib/bannerFontSize";

type Slide = {
  id: string;
  title: string;
  announcementText: string;
  bannerType: "hero" | "image" | "split";
  showAnnouncement: boolean;
  showLearnMore: boolean;
  showAnnouncementLearnMore: boolean;
  showBottomLearnMore: boolean;
  subtitle: string;
  buttonText: string;
  learnMoreText: string;
  announcementLearnMoreText: string;
  announcementLearnMoreHref: string;
  buttonHref: string;
  showTitle: boolean;
  showSubtitle: boolean;
  showButton: boolean;
  image: string | null;
  imagePosY: number;
  align: "left" | "center" | "right";
  verticalAlign: "top" | "middle" | "bottom";
  titleAlign?: "left" | "center" | "right";
  subtitleAlign?: "left" | "center" | "right";
  buttonAlign?: "left" | "center" | "right";
  fontSize: number;
  lineHeight: number;
  textColor: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  showOverlay: boolean;
  titleFontSize: number;
  subtitleFontSize: number;
  buttonFontSize: number;
  titleColor: string;
  subtitleColor: string;
  buttonTextColor: string;
  titleBold: boolean;
  titleItalic: boolean;
  subtitleBold: boolean;
  subtitleItalic: boolean;
  buttonBold: boolean;
  buttonItalic: boolean;
  /** Явная толщина шрифта (100..900). */
  titleWeight: number;
  subtitleWeight: number;
  buttonWeight: number;
  /** Зона текста: вся ширина или левая/правая половина банера. */
  textBand: "full" | "left" | "right";
};

function createDefaultHeroSlide(id: string): Slide {
  return {
    id,
    title: BANNER_COVER_DEFAULT_CONTENT.title,
    announcementText: BANNER_COVER_DEFAULT_CONTENT.announcement,
    bannerType: "hero",
    showAnnouncement: true,
    showLearnMore: true,
    showAnnouncementLearnMore: true,
    showBottomLearnMore: true,
    subtitle: BANNER_COVER_DEFAULT_CONTENT.description,
    buttonText: BANNER_COVER_DEFAULT_CONTENT.button,
    learnMoreText: BANNER_COVER_DEFAULT_CONTENT.buttonSecondary,
    announcementLearnMoreText: BANNER_COVER_DEFAULT_CONTENT.announcementLearnMore,
    announcementLearnMoreHref: "#",
    buttonHref: "#",
    showTitle: true,
    showSubtitle: true,
    showButton: true,
    image: null,
    imagePosY: 50,
    align: "center",
    verticalAlign: "middle",
    fontSize: 200,
    lineHeight: 1.2,
    textColor: "#ffffff",
    bold: true,
    italic: false,
    underline: false,
    showOverlay: true,
    titleFontSize: 230,
    subtitleFontSize: 120,
    buttonFontSize: 100,
    titleColor: "#ffffff",
    subtitleColor: "#9ca3af",
    buttonTextColor: "#ffffff",
    titleBold: true,
    titleItalic: false,
    subtitleBold: true,
    subtitleItalic: false,
    buttonBold: true,
    buttonItalic: false,
    titleWeight: 600,
    subtitleWeight: 500,
    buttonWeight: 600,
    textBand: "full",
  };
}

const INITIAL_SLIDES: Slide[] = [createDefaultHeroSlide("1")];

const CALLBACK_FORM_LINK = "callback://open";


function pickBannerH(
  v: unknown,
): "left" | "center" | "right" | undefined {
  return v === "left" || v === "center" || v === "right" ? v : undefined;
}

function normalizeSlide(raw: Partial<Slide> & { id: string; title: string }): Slide {
  const legacyBaseSize = normalizeFontSizeToPercent(raw.fontSize);
  const baseColor = typeof raw.textColor === "string" ? raw.textColor : "#ffffff";
  const baseBold = Boolean(raw.bold);
  const baseItalic = Boolean(raw.italic);
  const normalizeWeight = (v: unknown, fallback: number) => {
    const n =
      typeof v === "number" && Number.isFinite(v)
        ? v
        : typeof v === "string"
          ? Number(v)
          : NaN;
    if (!Number.isFinite(n)) return fallback;
    return Math.max(100, Math.min(900, Math.round(n / 100) * 100));
  };
  return {
    id: raw.id,
    title: raw.title,
    announcementText:
      typeof raw.announcementText === "string"
        ? raw.announcementText
        : BANNER_COVER_DEFAULT_CONTENT.announcement,
    bannerType:
      raw.bannerType === "hero" || raw.bannerType === "image" || raw.bannerType === "split"
        ? raw.bannerType
        : typeof raw.image === "string" && raw.image.trim().length > 0
          ? "image"
          : "hero",
    showAnnouncement:
      typeof raw.showAnnouncement === "boolean" ? raw.showAnnouncement : true,
    showLearnMore:
      typeof raw.showLearnMore === "boolean" ? raw.showLearnMore : true,
    showAnnouncementLearnMore:
      typeof (raw as { showAnnouncementLearnMore?: unknown }).showAnnouncementLearnMore ===
      "boolean"
        ? Boolean((raw as { showAnnouncementLearnMore?: boolean }).showAnnouncementLearnMore)
        : typeof raw.showLearnMore === "boolean"
          ? raw.showLearnMore
          : true,
    showBottomLearnMore:
      typeof (raw as { showBottomLearnMore?: unknown }).showBottomLearnMore === "boolean"
        ? Boolean((raw as { showBottomLearnMore?: boolean }).showBottomLearnMore)
        : typeof raw.showLearnMore === "boolean"
          ? raw.showLearnMore
          : true,
    subtitle: typeof raw.subtitle === "string" ? raw.subtitle : "",
    buttonText: typeof raw.buttonText === "string" ? raw.buttonText : "",
    learnMoreText: normalizeBannerCoverButtonSecondary(raw.learnMoreText),
    announcementLearnMoreText: normalizeBannerCoverAnnouncementLearnMore(
        (raw as { announcementLearnMoreText?: unknown }).announcementLearnMoreText ??
          raw.learnMoreText,
      ),
    announcementLearnMoreHref:
      typeof (raw as { announcementLearnMoreHref?: unknown }).announcementLearnMoreHref === "string"
        ? ((raw as { announcementLearnMoreHref?: string }).announcementLearnMoreHref as string)
        : typeof raw.buttonHref === "string"
          ? raw.buttonHref
          : "",
    buttonHref: typeof raw.buttonHref === "string" ? raw.buttonHref : "",
    showTitle:
      typeof raw.showTitle === "boolean"
        ? raw.showTitle
        : Boolean(raw.title),
    showSubtitle:
      typeof raw.showSubtitle === "boolean"
        ? raw.showSubtitle
        : Boolean(raw.subtitle),
    showButton:
      typeof raw.showButton === "boolean"
        ? raw.showButton
        : Boolean(raw.buttonText),
    image: raw.image ?? null,
    imagePosY: typeof raw.imagePosY === "number" ? raw.imagePosY : 50,
    align: raw.align === "left" || raw.align === "right" ? raw.align : "center",
    verticalAlign:
      raw.verticalAlign === "top" || raw.verticalAlign === "bottom"
        ? raw.verticalAlign
        : "middle",
    fontSize: normalizeFontSizeToPercent(raw.fontSize),
    lineHeight: normalizeBannerLineHeight(raw.lineHeight),
    textColor: typeof raw.textColor === "string" ? raw.textColor : "#ffffff",
    bold: Boolean(raw.bold),
    italic: Boolean(raw.italic),
    underline: Boolean(raw.underline),
    showOverlay:
      typeof raw.showOverlay === "boolean" ? raw.showOverlay : true,
    titleFontSize: normalizeFontSizeToPercent(
      raw.titleFontSize ?? legacyBaseSize,
    ),
    subtitleFontSize: normalizeFontSizeToPercent(
      raw.subtitleFontSize ?? Math.max(70, Math.round(legacyBaseSize * 0.5)),
    ),
    buttonFontSize: normalizeFontSizeToPercent(raw.buttonFontSize ?? 100),
    titleColor: typeof raw.titleColor === "string" ? raw.titleColor : baseColor,
    subtitleColor:
      typeof raw.subtitleColor === "string" ? raw.subtitleColor : baseColor,
    buttonTextColor:
      typeof raw.buttonTextColor === "string" ? raw.buttonTextColor : "#ffffff",
    titleBold:
      typeof raw.titleBold === "boolean" ? raw.titleBold : baseBold,
    titleItalic:
      typeof raw.titleItalic === "boolean" ? raw.titleItalic : baseItalic,
    subtitleBold:
      typeof raw.subtitleBold === "boolean" ? raw.subtitleBold : false,
    subtitleItalic:
      typeof raw.subtitleItalic === "boolean" ? raw.subtitleItalic : false,
    buttonBold:
      typeof raw.buttonBold === "boolean" ? raw.buttonBold : true,
    buttonItalic:
      typeof raw.buttonItalic === "boolean" ? raw.buttonItalic : false,
    titleWeight: normalizeWeight((raw as { titleWeight?: unknown }).titleWeight, baseBold ? 700 : 400),
    subtitleWeight: normalizeWeight((raw as { subtitleWeight?: unknown }).subtitleWeight, 400),
    buttonWeight: normalizeWeight((raw as { buttonWeight?: unknown }).buttonWeight, 600),
    titleAlign: pickBannerH(raw.titleAlign),
    subtitleAlign: pickBannerH(raw.subtitleAlign),
    buttonAlign: pickBannerH(raw.buttonAlign),
    textBand: parseBannerTextBand(
      raw.textBand ?? (raw as { text_band?: unknown }).text_band,
    ),
  };
}

async function compressImageFileToWebpDataUrl(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) {
        reject(new Error("Не удалось прочитать файл"));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(new Error("Ошибка чтения файла"));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Ошибка загрузки изображения"));
    image.src = dataUrl;
  });

  const MAX_SIDE = 1600;
  const ratio = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
  const targetWidth = Math.max(1, Math.round(img.width * ratio));
  const targetHeight = Math.max(1, Math.round(img.height * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas недоступен");
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  // WebP + quality резко уменьшает размер для localStorage.
  return canvas.toDataURL("image/webp", 0.72);
}

async function normalizeImageDataUrlToWebp(
  dataUrl: string | null,
): Promise<string | null> {
  if (!dataUrl || !/^data:image\//i.test(dataUrl)) return dataUrl;
  if (/^data:image\/webp;/i.test(dataUrl)) return dataUrl;
  if (/^data:image\/svg\+xml;/i.test(dataUrl)) return dataUrl;

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Ошибка загрузки изображения"));
    image.src = dataUrl;
  });

  const MAX_SIDE = 1600;
  const ratio = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
  const targetWidth = Math.max(1, Math.round(img.width * ratio));
  const targetHeight = Math.max(1, Math.round(img.height * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
  return canvas.toDataURL("image/webp", 0.72);
}

async function normalizeSlidesToWebp(
  inputSlides: Slide[],
): Promise<{ slides: Slide[]; changed: boolean }> {
  let changed = false;
  const nextSlides: Slide[] = [];
  for (const slide of inputSlides) {
    const normalizedImage = await normalizeImageDataUrlToWebp(slide.image);
    if (normalizedImage !== slide.image) changed = true;
    nextSlides.push({ ...slide, image: normalizedImage });
  }
  return { slides: nextSlides, changed };
}

function ensureOverlayField(inputSlides: Slide[]): Slide[] {
  return inputSlides.map((slide) => ({
    ...slide,
    showOverlay: slide.showOverlay !== false,
  }));
}

/** JSON.stringify выкидывает undefined — без этого textBand не уезжает в PUT и не сохраняется. */
function ensureSlidesForApi(slides: Slide[]): Slide[] {
  return slides.map((s) => ({
    ...s,
    textBand:
      s.textBand === "left" || s.textBand === "right" ? s.textBand : "full",
  }));
}

/** Тот же origin (Next) → прокси на Express, не нужен NEXT_PUBLIC_API_URL в браузере. */
async function fetchBannersFromNextProxy(): Promise<{
  coverAspect?: CoverAspectPresetId;
  slides?: Slide[];
}> {
  const res = await fetch("/api/pages/banners", {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`banners GET ${res.status}`);
  const data = await res.json();
  const { coverAspect, slides } = parseBannersApiPayload(data);
  return { coverAspect, slides: slides as Slide[] };
}

const BANNERS_PUT_TIMEOUT_MS = 120_000;

async function putBannersViaNextProxy(body: {
  coverAspect: CoverAspectPresetId;
  slides: Slide[];
}): Promise<{ ok: boolean; coverAspect?: CoverAspectPresetId; slides: Slide[] }> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    BANNERS_PUT_TIMEOUT_MS,
  );
  try {
    const res = await fetch("/api/pages/banners", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: controller.signal,
    });
    const text = await res.text();
    if (!res.ok) {
      let hint = text.trim().slice(0, 400);
      try {
        const j = JSON.parse(text) as { detail?: string; error?: string };
        if (typeof j.detail === "string" && j.detail) hint = j.detail;
        else if (typeof j.error === "string" && j.error) hint = j.error;
      } catch {
        /* raw text */
      }
      throw new Error(`HTTP ${res.status}${hint ? `: ${hint}` : ""}`);
    }
    return JSON.parse(text) as { ok: boolean; slides: Slide[] };
  } finally {
    window.clearTimeout(timeoutId);
  }
}

/** После SSR не пересоздаём слайды целиком — только картинки (webp-миграция), чтобы не сбрасывать contentEditable. */
function mergeSlidesImageFieldsOnly(prev: Slide[], next: Slide[]): Slide[] {
  const nextById = new Map(next.map((s) => [s.id, s]));
  return prev.map((p) => {
    const remote = nextById.get(p.id);
    if (!remote) return p;
    if (
      p.image === remote.image &&
      p.imagePosY === remote.imagePosY &&
      p.showOverlay === remote.showOverlay
    ) {
      return p;
    }
    return {
      ...p,
      image: remote.image,
      imagePosY: remote.imagePosY,
      showOverlay: remote.showOverlay,
    };
  });
}

function slidesFromApiRows(rows: unknown[]): Slide[] {
  return rows
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null && typeof (item as { id?: unknown }).id === "string",
    )
    .map((item) =>
      normalizeSlide({
        id: String(item.id),
        title: typeof item.title === "string" ? item.title : "",
        ...(item as Partial<Slide>),
      }),
    );
}

type BannersEditorCarouselProps = {
  /** С сервера — сразу верный размер кадра без скачка после fetch. */
  initialCoverAspect?: CoverAspectPresetId;
  /** Сырые слайды с API (нормализуются на клиенте). */
  initialSlidesFromApi?: unknown[];
};

export function BannersEditorCarousel({
  initialCoverAspect = "1-8",
  initialSlidesFromApi,
}: BannersEditorCarouselProps = {}) {
  const hasInitialSlides =
    Array.isArray(initialSlidesFromApi) && initialSlidesFromApi.length > 0;
  const [slides, setSlides] = useState<Slide[]>(() =>
    hasInitialSlides ? slidesFromApiRows(initialSlidesFromApi) : INITIAL_SLIDES,
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveTone, setSaveTone] = useState<"success" | "error">("success");
  // Temporarily disabled due to incorrect behavior in split banners.
  const imageAlignMode = false;
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkModalValue, setLinkModalValue] = useState("");
  const [linkModalButtonText, setLinkModalButtonText] = useState("");
  const [linkModalTarget, setLinkModalTarget] = useState<BannerCoverLinkModalTarget>("primary");
  const [coverAspect, setCoverAspect] = useState<CoverAspectPresetId>(initialCoverAspect);
  const [bannersReady, setBannersReady] = useState(hasInitialSlides);
  const [coverFocusField, setCoverFocusField] = useState<BannerCoverFocusField>("title");
  const uploadInputRef = useRef<HTMLInputElement | null>(null);


  const bannerEditorSwipe = useCarouselSwipe(
    () => setActiveIndex((p) => (p > 0 ? p - 1 : p)),
    () => setActiveIndex((p) => (p < slides.length - 1 ? p + 1 : p)),
    { enabled: slides.length > 1 && !imageAlignMode },
  );

  const activeSlide = useMemo(() => slides[activeIndex] ?? null, [slides, activeIndex]);

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log(
      "[BANNERS_ADMIN] activeSlide",
      activeSlide
        ? { id: activeSlide.id, showOverlay: activeSlide.showOverlay }
        : null,
    );
  }, [activeSlide]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetchBannersFromNextProxy();
        if (cancelled) return;

        const nextAspect = response.coverAspect ?? initialCoverAspect;
        let nextSlides: Slide[] | null = null;

        if (Array.isArray(response.slides) && response.slides.length > 0) {
          // eslint-disable-next-line no-console
          console.log(
            "[BANNERS_ADMIN] GET banners",
            response.slides.map((s) => ({
              id: s.id,
              showOverlay: s.showOverlay,
              textBand: s.textBand,
            })),
          );
          const loaded = response.slides.map((s) =>
            normalizeSlide({
              id: s.id,
              title: s.title,
              announcementText:
                typeof (s as { announcementText?: unknown }).announcementText === "string"
                  ? (s as { announcementText: string }).announcementText
                  : undefined,
              bannerType:
                (s as { bannerType?: unknown }).bannerType === "hero" ||
                  (s as { bannerType?: unknown }).bannerType === "image" ||
                  (s as { bannerType?: unknown }).bannerType === "split"
                  ? ((s as { bannerType: "hero" | "image" | "split" }).bannerType)
                  : undefined,
              showAnnouncement:
                typeof (s as { showAnnouncement?: unknown }).showAnnouncement === "boolean"
                  ? ((s as { showAnnouncement: boolean }).showAnnouncement)
                  : undefined,
              showLearnMore:
                typeof (s as { showLearnMore?: unknown }).showLearnMore === "boolean"
                  ? ((s as { showLearnMore: boolean }).showLearnMore)
                  : undefined,
              showAnnouncementLearnMore:
                typeof (s as { showAnnouncementLearnMore?: unknown }).showAnnouncementLearnMore ===
                "boolean"
                  ? ((s as { showAnnouncementLearnMore: boolean }).showAnnouncementLearnMore)
                  : undefined,
              showBottomLearnMore:
                typeof (s as { showBottomLearnMore?: unknown }).showBottomLearnMore === "boolean"
                  ? ((s as { showBottomLearnMore: boolean }).showBottomLearnMore)
                  : undefined,
              subtitle: s.subtitle,
              buttonText: s.buttonText,
              learnMoreText:
                typeof (s as { learnMoreText?: unknown }).learnMoreText === "string"
                  ? (s as { learnMoreText: string }).learnMoreText
                  : undefined,
              announcementLearnMoreText:
                typeof (s as { announcementLearnMoreText?: unknown }).announcementLearnMoreText ===
                "string"
                  ? (s as { announcementLearnMoreText: string }).announcementLearnMoreText
                  : undefined,
              announcementLearnMoreHref:
                typeof (s as { announcementLearnMoreHref?: unknown }).announcementLearnMoreHref ===
                "string"
                  ? (s as { announcementLearnMoreHref: string }).announcementLearnMoreHref
                  : undefined,
              buttonHref: s.buttonHref,
              showTitle: s.showTitle,
              showSubtitle: s.showSubtitle,
              showButton: s.showButton,
              image: s.image,
              imagePosY: s.imagePosY,
              align: s.align,
              verticalAlign: s.verticalAlign,
              titleAlign: s.titleAlign,
              subtitleAlign: s.subtitleAlign,
              buttonAlign: s.buttonAlign,
              textBand: s.textBand,
              fontSize: s.fontSize,
              titleFontSize: s.titleFontSize,
              subtitleFontSize: s.subtitleFontSize,
              buttonFontSize: s.buttonFontSize,
              titleColor: s.titleColor,
              subtitleColor: s.subtitleColor,
              buttonTextColor: s.buttonTextColor,
              titleBold: s.titleBold,
              titleItalic: s.titleItalic,
              subtitleBold: s.subtitleBold,
              subtitleItalic: s.subtitleItalic,
              buttonBold: s.buttonBold,
              buttonItalic: s.buttonItalic,
              titleWeight:
                typeof (s as { titleWeight?: unknown }).titleWeight === "number"
                  ? ((s as { titleWeight?: unknown }).titleWeight as number)
                  : undefined,
              subtitleWeight:
                typeof (s as { subtitleWeight?: unknown }).subtitleWeight === "number"
                  ? ((s as { subtitleWeight?: unknown }).subtitleWeight as number)
                  : undefined,
              buttonWeight:
                typeof (s as { buttonWeight?: unknown }).buttonWeight === "number"
                  ? ((s as { buttonWeight?: unknown }).buttonWeight as number)
                  : undefined,
              lineHeight: s.lineHeight,
              textColor: s.textColor,
              bold: s.bold,
              italic: s.italic,
              underline: s.underline,
              showOverlay: s.showOverlay,
            }),
          );
          const normalized = await normalizeSlidesToWebp(loaded);
          if (cancelled) return;
          const normalizedWithOverlay = ensureOverlayField(normalized.slides);
          nextSlides = normalizedWithOverlay;
          if (normalized.changed) {
            // Persist migrated webp images immediately for future loads.
            try {
              await putBannersViaNextProxy({
                coverAspect: nextAspect,
                slides: ensureSlidesForApi(normalizedWithOverlay),
              });
            } catch {
              // ignore migration save issues; user can save manually
            }
          }
        }

        if (cancelled) return;
        setCoverAspect(nextAspect);
        if (nextSlides) {
          if (hasInitialSlides) {
            setSlides((prev) => mergeSlidesImageFieldsOnly(prev, nextSlides));
          } else {
            setSlides(nextSlides);
            setActiveIndex(0);
          }
        }
      } catch {
        // fallback to local defaults when backend data is unavailable
      } finally {
        if (!cancelled) setBannersReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialCoverAspect, hasInitialSlides]);

  function addSlide() {
    setSlides((prev) => [
      ...prev,
      createDefaultHeroSlide(String(Date.now())),
    ]);
  }

  function removeActiveSlide() {
    if (slides.length <= 1) return;
    setSlides((prev) => prev.filter((_, idx) => idx !== activeIndex));
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : 0));
  }

  function onUploadToActive(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !activeSlide) return;
    const activeSlideType = activeSlide.bannerType;
    void (async () => {
      try {
        const url = await compressImageFileToWebpDataUrl(file);
        setSlides((prev) =>
          prev.map((s, idx) =>
            idx === activeIndex
              ? {
                  ...s,
                  image: url,
                  bannerType:
                    activeSlideType === "split"
                      ? "split"
                      : s.bannerType,
                }
              : s,
          ),
        );
      } catch {
        setSaveMessage("Не удалось обработать изображение");
        window.setTimeout(() => setSaveMessage(null), 2500);
      }
    })();
    event.currentTarget.value = "";
  }

  function handleSave() {
    void (async () => {
      try {
        const normalized = await normalizeSlidesToWebp(slides);
        const normalizedWithOverlay = ensureOverlayField(normalized.slides);
        const payloadSlides = ensureSlidesForApi(normalizedWithOverlay);
        // eslint-disable-next-line no-console
        console.log(
          "[BANNERS_ADMIN] SAVE payload",
          payloadSlides.map((s) => ({
            id: s.id,
            showOverlay: s.showOverlay,
            textBand: s.textBand,
            titleWeight: (s as unknown as { titleWeight?: unknown }).titleWeight,
            subtitleWeight: (s as unknown as { subtitleWeight?: unknown }).subtitleWeight,
            buttonWeight: (s as unknown as { buttonWeight?: unknown }).buttonWeight,
          })),
        );
        const saved = await putBannersViaNextProxy({
          coverAspect,
          slides: payloadSlides,
        });
        if (saved.coverAspect) {
          setCoverAspect(saved.coverAspect);
        }
        // eslint-disable-next-line no-console
        console.log(
          "[BANNERS_ADMIN] SAVE response",
          Array.isArray(saved.slides)
            ? saved.slides.map((s) => ({
                id: s.id,
                showOverlay: s.showOverlay,
                textBand: s.textBand,
                titleWeight:
                  typeof (s as unknown as { titleWeight?: unknown }).titleWeight === "number"
                    ? ((s as unknown as { titleWeight?: unknown }).titleWeight as number)
                    : undefined,
                subtitleWeight:
                  typeof (s as unknown as { subtitleWeight?: unknown }).subtitleWeight === "number"
                    ? ((s as unknown as { subtitleWeight?: unknown }).subtitleWeight as number)
                    : undefined,
                buttonWeight:
                  typeof (s as unknown as { buttonWeight?: unknown }).buttonWeight === "number"
                    ? ((s as unknown as { buttonWeight?: unknown }).buttonWeight as number)
                    : undefined,
              }))
            : saved,
        );
        if (Array.isArray(saved.slides) && saved.slides.length > 0) {
          const payloadById = new Map(payloadSlides.map((slide) => [slide.id, slide]));
          setSlides(
            saved.slides.map((s) =>
              normalizeSlide({
                id: s.id,
                title: s.title,
                announcementText:
                  typeof (s as { announcementText?: unknown }).announcementText === "string"
                    ? (s as { announcementText: string }).announcementText
                    : undefined,
                bannerType:
                  (() => {
                    const serverType =
                      (s as { bannerType?: unknown }).bannerType === "hero" ||
                      (s as { bannerType?: unknown }).bannerType === "image" ||
                      (s as { bannerType?: unknown }).bannerType === "split"
                        ? ((s as { bannerType: "hero" | "image" | "split" }).bannerType)
                        : undefined;
                    const localType = payloadById.get(s.id)?.bannerType;
                    if (localType === "split" && serverType !== "split") return "split";
                    return serverType ?? localType;
                  })(),
                showAnnouncement:
                  typeof (s as { showAnnouncement?: unknown }).showAnnouncement === "boolean"
                    ? ((s as { showAnnouncement: boolean }).showAnnouncement)
                    : undefined,
                showLearnMore:
                  typeof (s as { showLearnMore?: unknown }).showLearnMore === "boolean"
                    ? ((s as { showLearnMore: boolean }).showLearnMore)
                    : undefined,
                showAnnouncementLearnMore:
                  typeof (s as { showAnnouncementLearnMore?: unknown }).showAnnouncementLearnMore ===
                  "boolean"
                    ? ((s as { showAnnouncementLearnMore: boolean }).showAnnouncementLearnMore)
                    : undefined,
                showBottomLearnMore:
                  typeof (s as { showBottomLearnMore?: unknown }).showBottomLearnMore ===
                  "boolean"
                    ? ((s as { showBottomLearnMore: boolean }).showBottomLearnMore)
                    : undefined,
                subtitle: s.subtitle,
                buttonText: s.buttonText,
                learnMoreText:
                  typeof (s as { learnMoreText?: unknown }).learnMoreText === "string"
                    ? (s as { learnMoreText: string }).learnMoreText
                    : undefined,
                announcementLearnMoreText:
                  typeof (s as { announcementLearnMoreText?: unknown }).announcementLearnMoreText ===
                  "string"
                    ? (s as { announcementLearnMoreText: string }).announcementLearnMoreText
                    : undefined,
                announcementLearnMoreHref:
                  typeof (s as { announcementLearnMoreHref?: unknown }).announcementLearnMoreHref ===
                  "string"
                    ? (s as { announcementLearnMoreHref: string }).announcementLearnMoreHref
                    : undefined,
                buttonHref: s.buttonHref,
                showTitle: s.showTitle,
                showSubtitle: s.showSubtitle,
                showButton: s.showButton,
                image: s.image,
                imagePosY: s.imagePosY,
                align: s.align,
                verticalAlign: s.verticalAlign,
                titleAlign: s.titleAlign,
                subtitleAlign: s.subtitleAlign,
                buttonAlign: s.buttonAlign,
                textBand: s.textBand,
                fontSize: s.fontSize,
                titleFontSize: s.titleFontSize,
                subtitleFontSize: s.subtitleFontSize,
                buttonFontSize: s.buttonFontSize,
                titleColor: s.titleColor,
                subtitleColor: s.subtitleColor,
                buttonTextColor: s.buttonTextColor,
                titleBold: s.titleBold,
                titleItalic: s.titleItalic,
                subtitleBold: s.subtitleBold,
                subtitleItalic: s.subtitleItalic,
                buttonBold: s.buttonBold,
                buttonItalic: s.buttonItalic,
                titleWeight:
                  typeof (s as unknown as { titleWeight?: unknown }).titleWeight === "number"
                    ? ((s as unknown as { titleWeight?: unknown }).titleWeight as number)
                    : undefined,
                subtitleWeight:
                  typeof (s as unknown as { subtitleWeight?: unknown }).subtitleWeight === "number"
                    ? ((s as unknown as { subtitleWeight?: unknown }).subtitleWeight as number)
                    : undefined,
                buttonWeight:
                  typeof (s as unknown as { buttonWeight?: unknown }).buttonWeight === "number"
                    ? ((s as unknown as { buttonWeight?: unknown }).buttonWeight as number)
                    : undefined,
                lineHeight: s.lineHeight,
                textColor: s.textColor,
                bold: s.bold,
                italic: s.italic,
                underline: s.underline,
                showOverlay: s.showOverlay,
              }),
            ),
          );
        } else {
          setSlides(normalizedWithOverlay);
        }
        setSaveTone("success");
        setSaveMessage("Баннер главной странице сохранен!");
        window.setTimeout(() => setSaveMessage(null), 1800);
      } catch (e: unknown) {
        setSaveTone("error");
        const msg =
          e instanceof Error && e.message
            ? e.message
            : "Не удалось сохранить на сервере";
        setSaveMessage(msg.length > 220 ? `${msg.slice(0, 220)}…` : msg);
        window.setTimeout(() => setSaveMessage(null), 8000);
      }
    })();
  }

  function normalizeLinkForModal(href: string): string {
    const trimmed = href.trim();
    return trimmed === "#" ? "" : trimmed;
  }

  function openLinkModalForTarget(target: BannerCoverLinkModalTarget) {
    if (!activeSlide) return;
    setLinkModalTarget(target);
    if (target === "primary") {
      setLinkModalValue(normalizeLinkForModal(activeSlide.buttonHref || ""));
      setLinkModalButtonText(activeSlide.buttonText || BANNER_COVER_DEFAULT_CONTENT.button);
    } else if (target === "secondary") {
      setLinkModalValue(normalizeLinkForModal(activeSlide.buttonHref || ""));
      setLinkModalButtonText(normalizeBannerCoverButtonSecondary(activeSlide.learnMoreText));
    } else {
      setLinkModalValue(normalizeLinkForModal(activeSlide.announcementLearnMoreHref || ""));
      setLinkModalButtonText(
        normalizeBannerCoverAnnouncementLearnMore(activeSlide.announcementLearnMoreText),
      );
    }
    setLinkModalOpen(true);
  }

  function applyLinkModal() {
    const href = linkModalValue.trim();
    setSlides((prev) =>
      prev.map((s, sIdx) => {
        if (sIdx !== activeIndex) return s;
        if (linkModalTarget === "primary") {
          return {
            ...s,
            buttonHref: href,
            buttonText:
              linkModalButtonText.trim() || BANNER_COVER_DEFAULT_CONTENT.button,
          };
        }
        if (linkModalTarget === "secondary") {
          return {
            ...s,
            buttonHref: href,
            learnMoreText: normalizeBannerCoverButtonSecondary(linkModalButtonText),
          };
        }
        return {
          ...s,
          announcementLearnMoreHref: href,
          announcementLearnMoreText: normalizeBannerCoverAnnouncementLearnMore(
            linkModalButtonText,
          ),
        };
      }),
    );
    setLinkModalOpen(false);
  }

  return (
    <section className="relative overflow-visible rounded-2xl border border-slate-200 bg-white p-4">
      <div className="relative z-[10020] mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Большой баннер главной страницы</h2>
        <button
          type="button"
          className="rounded-full bg-[#496db3] px-3 py-1.5 text-xs font-semibold text-white hover:brightness-105"
          onClick={handleSave}
        >
          Сохранить
        </button>
      </div>
                <input
                  ref={uploadInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onUploadToActive}
                />
      {saveMessage ? (
        <div
          className={`fixed right-6 top-[4.5rem] z-50 flex items-center gap-2 rounded border px-3 py-1.5 text-xs font-medium shadow-md ${
            saveTone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
          role="status"
          aria-live="polite"
        >
          <span>{saveMessage}</span>
          <button
            type="button"
            onClick={() => setSaveMessage(null)}
            className={`-mr-1 rounded p-0.5 ${
              saveTone === "success"
                ? "text-emerald-600 hover:bg-emerald-100 hover:text-emerald-900"
                : "text-red-600 hover:bg-red-100 hover:text-red-900"
            }`}
            aria-label="Закрыть"
          >
            <XMarkIcon className="h-3 w-3 [stroke-width:2.2]" />
          </button>
        </div>
      ) : null}
      <BannerCoverButtonLinkModal
        open={linkModalOpen}
        target={linkModalTarget}
        labelValue={linkModalButtonText}
        linkValue={linkModalValue}
        onLabelChange={setLinkModalButtonText}
        onLinkChange={setLinkModalValue}
        onClose={() => setLinkModalOpen(false)}
        onApply={applyLinkModal}
      />

      {bannersReady && activeSlide ? (
        <div className="mb-2">
          <style>{getBannerCoverFormatBarCss()}</style>
          <BannerCoverFormatBar
            focusField={coverFocusField}
            slide={activeSlide}
            onChange={(patch) =>
                      setSlides((prev) =>
                prev.map((s, sIdx) => (sIdx === activeIndex ? { ...s, ...patch } : s)),
              )
            }
            coverAspect={coverAspect}
            onCoverAspectChange={setCoverAspect}
            onAddSlide={addSlide}
            onRemoveSlide={removeActiveSlide}
            canRemoveSlide={slides.length > 1}
          />
        </div>
      ) : null}

      <div className="relative overflow-hidden rounded-xl bg-transparent p-0">
        {!bannersReady ? (
          <div
            className={`rounded-xl bg-slate-100 animate-pulse ${getCoverAspectCarouselClassName(coverAspect)}`}
            aria-busy="true"
            aria-label="Загрузка баннеров"
          />
        ) : (
        <BannerCarouselFrame
          slides={slides}
          activeIndex={activeIndex}
          onSelectSlide={setActiveIndex}
          swipeProps={bannerEditorSwipe}
          roundedClassName="rounded-xl"
          aspectClassName={getCoverAspectCarouselClassName(coverAspect)}
          renderSlide={(slide, idx) => {
            if (idx !== activeIndex) {
                    return (
                <BannerPreviewReadonly
                  slide={slide}
                  preserveBannerTitleLineBreaks
                  callbackFormLink={CALLBACK_FORM_LINK}
                />
              );
            }
            return (
              <BannerCoverEditorSlide
                slide={slide}
                onChange={(patch) =>
                                  setSlides((prev) =>
                    prev.map((s, sIdx) => (sIdx === activeIndex ? { ...s, ...patch } : s)),
                  )
                }
                onOpenLinkModal={openLinkModalForTarget}
                onUploadImage={() => uploadInputRef.current?.click()}
                coverAspect={coverAspect}
                onFocusField={setCoverFocusField}
              />
            );
          }}
        />
        )}
      </div>
    </section>
  );
}
