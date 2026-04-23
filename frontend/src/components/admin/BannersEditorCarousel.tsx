"use client";

import {
  EllipsisVerticalIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCarouselSwipe } from "@/hooks/useCarouselSwipe";
import { BannerCarouselFrame } from "@/components/BannerCarouselFrame";
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

const DEFAULT_ANNOUNCEMENT_TEXT = "Announcing our next round of funding.";
const DEFAULT_LEARN_MORE_TEXT = "Learn more";

function createDefaultHeroSlide(id: string): Slide {
  return {
    id,
    title: "Data to enrich your online business",
    announcementText: DEFAULT_ANNOUNCEMENT_TEXT,
    bannerType: "hero",
    showAnnouncement: true,
    showLearnMore: true,
    showAnnouncementLearnMore: true,
    showBottomLearnMore: true,
    subtitle:
      "Anim aute id magna aliqua ad ad non deserunt sunt. Qui irure qui lorem cupidatat commodo. Elit sunt amet fugiat veniam occaecat.",
    buttonText: "Get started",
    learnMoreText: DEFAULT_LEARN_MORE_TEXT,
    announcementLearnMoreText: DEFAULT_LEARN_MORE_TEXT,
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

function normalizeLearnMoreText(value: unknown): string {
  if (typeof value !== "string") return DEFAULT_LEARN_MORE_TEXT;
  const cleaned = value.replace(/\s*[→➝➡➜]+\s*$/u, "").trim();
  return cleaned.length > 0 ? cleaned : DEFAULT_LEARN_MORE_TEXT;
}

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
      typeof raw.announcementText === "string" && raw.announcementText.trim().length > 0
        ? raw.announcementText
        : DEFAULT_ANNOUNCEMENT_TEXT,
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
    learnMoreText:
      normalizeLearnMoreText(raw.learnMoreText),
    announcementLearnMoreText:
      normalizeLearnMoreText(
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
async function fetchBannersFromNextProxy(): Promise<{ slides?: Slide[] }> {
  const res = await fetch("/api/pages/banners", {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`banners GET ${res.status}`);
  return res.json() as Promise<{ slides?: Slide[] }>;
}

const BANNERS_PUT_TIMEOUT_MS = 120_000;

async function putBannersViaNextProxy(body: {
  slides: Slide[];
}): Promise<{ ok: boolean; slides: Slide[] }> {
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

export function BannersEditorCarousel() {
  const [slides, setSlides] = useState<Slide[]>(INITIAL_SLIDES);
  const [activeIndex, setActiveIndex] = useState(0);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveTone, setSaveTone] = useState<"success" | "error">("success");
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  // Temporarily disabled due to incorrect behavior in split banners.
  const imageAlignMode = false;
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkModalValue, setLinkModalValue] = useState("");
  const [linkModalButtonText, setLinkModalButtonText] = useState("");
  const [linkModalTarget, setLinkModalTarget] = useState<
    "primary" | "secondary" | "announcementSecondary"
  >("primary");
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const actionsMenuRef = useRef<HTMLDivElement | null>(null);
  const linkModalInputRef = useRef<HTMLInputElement | null>(null);


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
    void (async () => {
      try {
        const response = await fetchBannersFromNextProxy();
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
          const normalizedWithOverlay = ensureOverlayField(normalized.slides);
          setSlides(normalizedWithOverlay);
          setActiveIndex(0);
          if (normalized.changed) {
            // Persist migrated webp images immediately for future loads.
            try {
              await putBannersViaNextProxy({
                slides: ensureSlidesForApi(normalizedWithOverlay),
              });
            } catch {
              // ignore migration save issues; user can save manually
            }
          }
        }
      } catch {
        // fallback to local defaults when backend data is unavailable
      }
    })();
  }, []);

  useEffect(() => {
    if (!actionsMenuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (actionsMenuRef.current?.contains(target)) return;
      setActionsMenuOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [actionsMenuOpen]);

  useEffect(() => {
    if (!linkModalOpen) return;
    const t = window.setTimeout(() => linkModalInputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [linkModalOpen]);

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
          slides: payloadSlides,
        });
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

  function updateActiveSlide(patch: Partial<Slide>) {
    setSlides((prev) =>
      prev.map((s, idx) => (idx === activeIndex ? { ...s, ...patch } : s)),
    );
  }

  return (
    <section className="relative overflow-visible rounded-2xl border border-slate-200 bg-white p-4">
      <div className="relative z-[10020] mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Большой банер главной страницы</h2>
        <button
          type="button"
          className="rounded-full bg-[#496db3] px-3 py-1.5 text-xs font-semibold text-white hover:brightness-105"
          onClick={handleSave}
        >
          Сохранить
        </button>
      </div>
      {activeSlide ? (
        <div className="mb-4 rounded-xl bg-white p-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative z-10 flex flex-wrap items-center gap-1.5 bg-white p-1">
              <div ref={actionsMenuRef} className="relative z-[10030] ml-1">
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-200 bg-white text-slate-700 transition-colors hover:border-[#496db3] hover:text-[#496db3]"
                  onClick={() => setActionsMenuOpen((v) => !v)}
                  aria-label="Действия со слайдами"
                  aria-expanded={actionsMenuOpen}
                >
                  <EllipsisVerticalIcon className="h-4 w-4" />
                </button>
                {actionsMenuOpen ? (
                  <div
                    className="absolute left-0 top-full z-[10040] mt-2 rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
                    style={{ width: "13.5rem", minWidth: "13.5rem" }}
                  >
                    <button
                      type="button"
                      className="w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100"
                      onClick={() => {
                        uploadInputRef.current?.click();
                        setActionsMenuOpen(false);
                      }}
                    >
                      Загрузить в активный
                    </button>
                    <button
                      type="button"
                      className="w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100"
                      onClick={() => {
                        addSlide();
                        setActionsMenuOpen(false);
                      }}
                    >
                      Добавить слайд
                    </button>
                    <div className="my-1 h-px bg-slate-100" />
                    <button
                      type="button"
                      className="w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100"
                      onClick={() => {
                        if (!activeSlide) return;
                        updateActiveSlide({
                          showTitle: !activeSlide.showTitle,
                          title: activeSlide.title || "Заголовок банера",
                        });
                        setActionsMenuOpen(false);
                      }}
                    >
                      {activeSlide?.showTitle ? "Убрать заголовок" : "Добавить заголовок"}
                    </button>
                    <button
                      type="button"
                      className="w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100"
                      onClick={() => {
                        if (!activeSlide) return;
                        updateActiveSlide({
                          showSubtitle: !activeSlide.showSubtitle,
                          subtitle: activeSlide.subtitle || "Подзаголовок",
                        });
                        setActionsMenuOpen(false);
                      }}
                    >
                      {activeSlide?.showSubtitle ? "Убрать подзаголовок" : "Добавить подзаголовок"}
                    </button>
                    <button
                      type="button"
                      className="w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100"
                      onClick={() => {
                        if (!activeSlide) return;
                        updateActiveSlide({
                          showButton: !activeSlide.showButton,
                          buttonText: activeSlide.buttonText || "Подробнее",
                        });
                        setActionsMenuOpen(false);
                      }}
                    >
                      {activeSlide?.showButton ? "Убрать кнопку" : "Добавить кнопку"}
                    </button>
                    <button
                      type="button"
                      className="w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100"
                      onClick={() => {
                        if (!activeSlide) return;
                        updateActiveSlide({ showAnnouncement: !activeSlide.showAnnouncement });
                        setActionsMenuOpen(false);
                      }}
                    >
                      {activeSlide?.showAnnouncement ? "Убрать плашку анонса" : "Добавить плашку анонса"}
                    </button>
                    <button
                      type="button"
                      className="w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100"
                      onClick={() => {
                        if (!activeSlide) return;
                        updateActiveSlide({
                          showAnnouncementLearnMore: !activeSlide.showAnnouncementLearnMore,
                          announcementLearnMoreText:
                            activeSlide.announcementLearnMoreText ||
                            DEFAULT_LEARN_MORE_TEXT,
                        });
                        setActionsMenuOpen(false);
                      }}
                    >
                      {activeSlide?.showAnnouncementLearnMore
                        ? "Убрать Learn more (в плашке)"
                        : "Добавить Learn more (в плашке)"}
                    </button>
                    <button
                      type="button"
                      className="w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100"
                      onClick={() => {
                        if (!activeSlide) return;
                        updateActiveSlide({
                          showBottomLearnMore: !activeSlide.showBottomLearnMore,
                          learnMoreText: activeSlide.learnMoreText || DEFAULT_LEARN_MORE_TEXT,
                        });
                        setActionsMenuOpen(false);
                      }}
                    >
                      {activeSlide?.showBottomLearnMore
                        ? "Убрать Learn more (внизу)"
                        : "Добавить Learn more (внизу)"}
                    </button>
                    <button
                      type="button"
                      className="w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100"
                      onClick={() => {
                        if (!activeSlide) return;
                        updateActiveSlide({ showOverlay: !activeSlide.showOverlay });
                        setActionsMenuOpen(false);
                      }}
                    >
                      {activeSlide?.showOverlay ? "Убрать затемнение" : "Включить затемнение"}
                    </button>
                    <button
                      type="button"
                      className="w-full px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50 disabled:opacity-40"
                      onClick={() => {
                        removeActiveSlide();
                        setActionsMenuOpen(false);
                      }}
                      disabled={slides.length <= 1}
                    >
                      Удалить слайд
                    </button>
                  </div>
                ) : null}
                <input
                  ref={uploadInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onUploadToActive}
                />
              </div>
              <span className="relative ml-1 inline-flex items-center">
                <select
                  value={activeSlide.bannerType}
                  onChange={(e) =>
                    updateActiveSlide(
                      e.target.value === "image"
                        ? { bannerType: "image" }
                        : e.target.value === "split"
                          ? { bannerType: "split", textBand: "left", align: "left" }
                          : { bannerType: "hero", textBand: "full", align: "center" },
                    )
                  }
                  className="min-w-[11.5rem] appearance-none rounded-md border border-slate-200 bg-white px-3 py-1.5 pr-7 text-xs font-semibold text-slate-700 outline-none transition focus:border-[#496db3] focus:ring-2 focus:ring-[#496db3]/20"
                >
                  <option value="hero">Банер с градиентом</option>
                  <option value="image">Банер с изображением (2:1)</option>
                  <option value="split">
                    Градиент + текст слева + фото справа (1:1)
                  </option>
                </select>
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                  className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-slate-500"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            </div>
          </div>
        </div>
      ) : null}
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
      {linkModalOpen ? (
        <div
          className="fixed inset-0 z-[20000] flex items-center justify-center bg-slate-900/40 p-3 backdrop-blur-sm"
          onClick={() => setLinkModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Ссылка кнопки"
        >
          <div
            className="relative w-full max-w-md rounded-2xl bg-white p-4 shadow-xl ring-1 ring-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <span
              className="absolute right-2 top-2 inline-flex h-5 w-5 cursor-pointer items-center justify-center text-slate-500 transition-colors hover:text-[#496db3]"
              onClick={() => setLinkModalOpen(false)}
              role="button"
              aria-label="Закрыть"
            >
              <XMarkIcon className="h-4 w-4 [stroke-width:2.2]" />
            </span>
            <div className="mt-4 grid grid-cols-1 gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-semibold text-slate-700">Ссылка кнопки</span>
                <input
                  ref={linkModalInputRef}
                  value={linkModalValue}
                  onChange={(e) => setLinkModalValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      setSlides((prev) =>
                        prev.map((s, sIdx) =>
                          sIdx === activeIndex
                            ? {
                                ...s,
                                buttonHref:
                                  linkModalTarget === "announcementSecondary"
                                    ? s.buttonHref
                                    : linkModalValue.trim(),
                                announcementLearnMoreHref:
                                  linkModalTarget === "announcementSecondary"
                                    ? linkModalValue.trim()
                                    : s.announcementLearnMoreHref,
                                  buttonText:
                                    linkModalTarget === "primary" &&
                                    linkModalButtonText.trim().length > 0
                                      ? linkModalButtonText.trim()
                                      : s.buttonText,
                                  learnMoreText:
                                    linkModalTarget === "secondary" &&
                                    linkModalButtonText.trim().length > 0
                                      ? normalizeLearnMoreText(linkModalButtonText)
                                      : s.learnMoreText,
                                  announcementLearnMoreText:
                                    linkModalTarget === "announcementSecondary" &&
                                    linkModalButtonText.trim().length > 0
                                      ? normalizeLearnMoreText(linkModalButtonText)
                                      : s.announcementLearnMoreText,
                              }
                            : s,
                        ),
                      );
                      setLinkModalOpen(false);
                    }
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#496db3] focus:ring-1 focus:ring-[#496db3]"
                  placeholder="https://example.com или callback://open"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-semibold text-slate-700">
                  {linkModalTarget === "primary"
                    ? "Название кнопки"
                    : linkModalTarget === "secondary"
                      ? "Название Learn more (внизу)"
                      : "Название Learn more (в плашке)"}
                </span>
                <input
                  value={linkModalButtonText}
                  onChange={(e) => setLinkModalButtonText(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#496db3] focus:ring-1 focus:ring-[#496db3]"
                  placeholder={
                    linkModalTarget === "primary"
                      ? "Например: Get started"
                      : "Например: Learn more"
                  }
                />
              </label>
              <button
                type="button"
                className="inline-flex w-fit rounded-full border border-[#496db3]/30 bg-[#496db3]/5 px-3 py-1.5 text-xs font-semibold text-[#496db3] hover:bg-[#496db3]/10"
                onClick={() => setLinkModalValue(CALLBACK_FORM_LINK)}
              >
                Подключить форму обратной связи
              </button>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                onClick={() => setLinkModalOpen(false)}
              >
                Отмена
              </button>
              <button
                type="button"
                className="inline-flex rounded-full bg-[#496db3] px-4 py-1.5 text-xs font-medium text-white hover:brightness-105"
                onClick={() => {
                  setSlides((prev) =>
                    prev.map((s, sIdx) =>
                      sIdx === activeIndex
                        ? {
                            ...s,
                            buttonHref:
                              linkModalTarget === "announcementSecondary"
                                ? s.buttonHref
                                : linkModalValue.trim(),
                            announcementLearnMoreHref:
                              linkModalTarget === "announcementSecondary"
                                ? linkModalValue.trim()
                                : s.announcementLearnMoreHref,
                            buttonText:
                              linkModalTarget === "primary" &&
                              linkModalButtonText.trim().length > 0
                                ? linkModalButtonText.trim()
                                : s.buttonText,
                            learnMoreText:
                              linkModalTarget === "secondary" &&
                              linkModalButtonText.trim().length > 0
                                ? normalizeLearnMoreText(linkModalButtonText)
                                : s.learnMoreText,
                            announcementLearnMoreText:
                              linkModalTarget === "announcementSecondary" &&
                              linkModalButtonText.trim().length > 0
                                ? normalizeLearnMoreText(linkModalButtonText)
                                : s.announcementLearnMoreText,
                          }
                        : s,
                    ),
                  );
                  setLinkModalOpen(false);
                }}
              >
                Применить
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="relative overflow-hidden rounded-xl bg-transparent p-0">
        <BannerCarouselFrame
          slides={slides}
          activeIndex={activeIndex}
          onSelectSlide={setActiveIndex}
          swipeProps={bannerEditorSwipe}
          roundedClassName="rounded-xl"
          aspectClassName="aspect-[2/1]"
          renderSlide={(slide, idx) => {
            return (() => {
                    const useSplitBanner =
                      slide.bannerType === "split" ||
                      (slide.bannerType !== "image" &&
                        (slide.textBand === "left" ||
                          (slide.align === "left" && Boolean(slide.image))));
                    const singleLineImageTitle =
                      slide.title.replace(/\s*\n+\s*/g, " ").trim() || slide.title;
                    return (
                  <div className="@container h-full overflow-hidden bg-transparent">
                    {slide.bannerType === "image" ? (
                      <div className="relative h-full w-full">
                        {slide.image ? (
                          <img
                            src={slide.image}
                            alt={slide.title}
                            className={`absolute inset-0 z-0 h-full w-full object-cover ${imageAlignMode && activeIndex === idx ? "cursor-ns-resize" : ""}`}
                            style={{ objectPosition: `50% ${slide.imagePosY}%` }}
                            onMouseDown={(e) => {
                              if (!imageAlignMode || activeIndex !== idx) return;
                              e.preventDefault();
                              const target = e.currentTarget;
                              const rect = target.getBoundingClientRect();
                              const startY = e.clientY;
                              const startPos = slide.imagePosY;
                              const onMove = (moveEvent: MouseEvent) => {
                                const deltaY = moveEvent.clientY - startY;
                                const deltaPercent = (deltaY / rect.height) * 100;
                                const pos = Math.max(
                                  0,
                                  Math.min(100, startPos - deltaPercent),
                                );
                                setSlides((prev) =>
                                  prev.map((s, sIdx) => (sIdx === idx ? { ...s, imagePosY: pos } : s)),
                                );
                              };
                              const onUp = () => {
                                window.removeEventListener("mousemove", onMove);
                                window.removeEventListener("mouseup", onUp);
                              };
                              window.addEventListener("mousemove", onMove);
                              window.addEventListener("mouseup", onUp);
                            }}
                          />
                        ) : (
                          <div className="absolute inset-0 z-0 bg-slate-300" />
                        )}
                        {slide.showOverlay && Boolean(slide.image) ? (
                          <div
                            className={`absolute inset-0 z-10 ${
                              imageAlignMode && activeIndex === idx ? "pointer-events-none" : ""
                            }`}
                            style={{
                              backgroundColor: "rgba(248, 250, 252, 0.58)",
                              backdropFilter: "blur(2px)",
                              WebkitBackdropFilter: "blur(2px)",
                            }}
                          />
                        ) : null}
                        {!slide.image ? (
                          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                            <div className="rounded-md border border-slate-500/40 bg-slate-900/35 px-3 py-1.5 text-xs font-medium text-white/90">
                              Выберите изображение для фона
                            </div>
                          </div>
                        ) : null}
                        <div
                          className={`relative z-20 flex h-full w-full items-center justify-center px-6 py-10 ${
                            imageAlignMode && activeIndex === idx ? "pointer-events-none" : ""
                          }`}
                        >
                          <div className="mx-auto w-full min-w-0 max-w-3xl text-center">
                            {slide.showAnnouncement !== false ? (
                              <div className="hidden sm:mb-6 sm:flex sm:justify-center">
                                <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs text-slate-600 ring-1 ring-slate-900/10 sm:text-sm">
                                  <span
                                    contentEditable
                                    suppressContentEditableWarning
                                    onBlur={(e) => {
                                      const text = e.currentTarget.textContent ?? "";
                                      setSlides((prev) =>
                                        prev.map((s, sIdx) =>
                                          sIdx === activeIndex
                                            ? {
                                                ...s,
                                                announcementText:
                                                  text.trim().length > 0
                                                    ? text
                                                    : DEFAULT_ANNOUNCEMENT_TEXT,
                                              }
                                            : s,
                                        ),
                                      );
                                    }}
                                    className="outline-none"
                                  >
                                    {slide.announcementText || DEFAULT_ANNOUNCEMENT_TEXT}
                                  </span>
                                  {slide.showAnnouncementLearnMore !== false ? (
                                    <span
                                      contentEditable
                                      suppressContentEditableWarning
                                      onBlur={(e) => {
                                        const text = e.currentTarget.textContent ?? "";
                                        setSlides((prev) =>
                                          prev.map((s, sIdx) =>
                                            sIdx === activeIndex
                                              ? {
                                                  ...s,
                                                  announcementLearnMoreText:
                                                    normalizeLearnMoreText(text),
                                                }
                                              : s,
                                          ),
                                        );
                                      }}
                                      onDoubleClick={() => {
                                        setLinkModalValue(slide.announcementLearnMoreHref || "");
                                        setLinkModalButtonText(
                                          normalizeLearnMoreText(slide.announcementLearnMoreText),
                                        );
                                        setLinkModalTarget("announcementSecondary");
                                        setLinkModalOpen(true);
                                      }}
                                      className="font-semibold text-[#496db3] outline-none"
                                    >
                                      {normalizeLearnMoreText(slide.announcementLearnMoreText)}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            ) : null}
                            {slide.showTitle !== false ? (
                              <h1
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => {
                                  const text = (e.currentTarget.textContent ?? "")
                                    .replace(/\s*\n+\s*/g, " ")
                                    .trim();
                                  setSlides((prev) =>
                                    prev.map((s, sIdx) =>
                                      sIdx === activeIndex
                                        ? { ...s, title: text.length > 0 ? text : s.title }
                                        : s,
                                    ),
                                  );
                                }}
                                className="text-balance text-3xl font-semibold tracking-tight text-[#496db3] sm:text-5xl outline-none"
                              >
                                {singleLineImageTitle}
                              </h1>
                            ) : null}
                            {slide.showSubtitle ? (
                              <p
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => {
                                  const text = e.currentTarget.textContent ?? "";
                                  setSlides((prev) =>
                                    prev.map((s, sIdx) =>
                                      sIdx === activeIndex ? { ...s, subtitle: text } : s,
                                    ),
                                  );
                                }}
                                className="mt-6 text-pretty text-sm font-medium text-slate-600 sm:text-base outline-none"
                              >
                                {slide.subtitle || "Подзаголовок"}
                              </p>
                            ) : null}
                            <div className="mt-8 flex items-center justify-center gap-x-6">
                              {slide.showButton ? (
                                <button
                                  type="button"
                                  className="rounded-md bg-[#496db3] px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#3f5f9d] sm:text-sm"
                                  onDoubleClick={() => {
                                    setLinkModalValue(slide.buttonHref || "");
                                    setLinkModalButtonText(slide.buttonText || "Get started");
                                    setLinkModalTarget("primary");
                                    setLinkModalOpen(true);
                                  }}
                                >
                                  <span
                                    contentEditable
                                    suppressContentEditableWarning
                                    onBlur={(e) => {
                                      const text = e.currentTarget.textContent ?? "";
                                      setSlides((prev) =>
                                        prev.map((s, sIdx) =>
                                          sIdx === activeIndex ? { ...s, buttonText: text } : s,
                                        ),
                                      );
                                    }}
                                    className="outline-none"
                                  >
                                    {slide.buttonText || "Get started"}
                                  </span>
                                </button>
                              ) : null}
                              {slide.showBottomLearnMore !== false ? (
                                <span
                                  contentEditable
                                  suppressContentEditableWarning
                                  onBlur={(e) => {
                                    const text = e.currentTarget.textContent ?? "";
                                    setSlides((prev) =>
                                      prev.map((s, sIdx) =>
                                        sIdx === activeIndex
                                          ? {
                                              ...s,
                                              learnMoreText: normalizeLearnMoreText(text),
                                            }
                                          : s,
                                      ),
                                    );
                                  }}
                                  onDoubleClick={() => {
                                    setLinkModalValue(slide.buttonHref || "");
                                    setLinkModalButtonText(
                                      normalizeLearnMoreText(slide.learnMoreText),
                                    );
                                    setLinkModalTarget("secondary");
                                    setLinkModalOpen(true);
                                  }}
                                  className="text-xs font-semibold text-[#496db3] outline-none sm:text-sm"
                                >
                                  {normalizeLearnMoreText(slide.learnMoreText)}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`relative isolate flex h-full w-full overflow-hidden bg-slate-100 ${
                          useSplitBanner ? "items-stretch" : "items-center justify-center px-6 py-10"
                        }`}
                      >
                        <div
                          className="absolute inset-x-0 -top-24 -z-10 transform-gpu blur-3xl"
                          aria-hidden="true"
                        >
                          <div
                            className="hero-police-blob relative left-1/2 aspect-[1155/678] w-[36rem] -translate-x-1/2 rotate-[20deg] bg-gradient-to-tr from-[#496db3] via-[#5f7ebe] to-[#8aa9db] sm:w-[72rem]"
                            style={{
                              clipPath:
                                "polygon(74.1% 44.1%,100% 61.6%,97.5% 26.9%,85.5% 0.1%,80.7% 2%,72.5% 32.5%,60.2% 62.4%,52.4% 68.1%,47.5% 58.3%,45.2% 34.5%,27.5% 76.7%,0.1% 64.9%,17.9% 100%,27.6% 76.8%,76.1% 97.7%,74.1% 44.1%)",
                            }}
                          />
                        </div>
                        <div
                          className="absolute inset-x-0 -top-24 -z-10 transform-gpu blur-3xl"
                          aria-hidden="true"
                        >
                          <div
                            className="hero-police-blob hero-police-blob--alt relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36rem] -translate-x-1/2 bg-gradient-to-tr from-[#b91c1c] via-[#dc2626] to-[#f87171] sm:left-[calc(50%+24rem)] sm:w-[72rem]"
                            style={{
                              clipPath:
                                "polygon(74.1% 44.1%,100% 61.6%,97.5% 26.9%,85.5% 0.1%,80.7% 2%,72.5% 32.5%,60.2% 62.4%,52.4% 68.1%,47.5% 58.3%,45.2% 34.5%,27.5% 76.7%,0.1% 64.9%,17.9% 100%,27.6% 76.8%,76.1% 97.7%,74.1% 44.1%)",
                            }}
                          />
                        </div>
                        <div
                          className={`relative z-20 min-w-0 ${
                            useSplitBanner
                              ? "flex h-full w-1/2 shrink-0 flex-col justify-center px-6 py-10 text-left md:px-10"
                              : "mx-auto w-full max-w-3xl text-center"
                          }`}
                        >
                          {slide.showAnnouncement !== false ? (
                            <div className={`hidden sm:mb-6 sm:flex ${useSplitBanner ? "sm:justify-start" : "sm:justify-center"}`}>
                            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs text-slate-600 ring-1 ring-slate-900/10 sm:text-sm">
                              <span
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => {
                                  const text = e.currentTarget.textContent ?? "";
                                  setSlides((prev) =>
                                    prev.map((s, sIdx) =>
                                      sIdx === activeIndex
                                        ? {
                                            ...s,
                                            announcementText:
                                              text.trim().length > 0
                                                ? text
                                                : DEFAULT_ANNOUNCEMENT_TEXT,
                                          }
                                        : s,
                                    ),
                                  );
                                }}
                                className="outline-none"
                              >
                                {slide.announcementText || DEFAULT_ANNOUNCEMENT_TEXT}
                              </span>
                              {slide.showAnnouncementLearnMore !== false ? (
                                <span
                                  contentEditable
                                  suppressContentEditableWarning
                                  onBlur={(e) => {
                                    const text = e.currentTarget.textContent ?? "";
                                    setSlides((prev) =>
                                      prev.map((s, sIdx) =>
                                        sIdx === activeIndex
                                          ? {
                                              ...s,
                                              announcementLearnMoreText:
                                                normalizeLearnMoreText(text),
                                            }
                                          : s,
                                      ),
                                    );
                                  }}
                                  onDoubleClick={() => {
                                    setLinkModalValue(slide.announcementLearnMoreHref || "");
                                    setLinkModalButtonText(
                                      normalizeLearnMoreText(slide.announcementLearnMoreText),
                                    );
                                    setLinkModalTarget("announcementSecondary");
                                    setLinkModalOpen(true);
                                  }}
                                  className="font-semibold text-[#496db3] outline-none"
                                >
                                  {normalizeLearnMoreText(slide.announcementLearnMoreText)}
                                </span>
                              ) : null}
                            </div>
                            </div>
                          ) : null}
                          {slide.showTitle !== false ? (
                            <h1
                              contentEditable
                              suppressContentEditableWarning
                              onBlur={(e) => {
                                const text = e.currentTarget.textContent ?? "";
                                setSlides((prev) =>
                                  prev.map((s, sIdx) =>
                                    sIdx === activeIndex ? { ...s, title: text } : s,
                                  ),
                                );
                              }}
                              className="text-balance text-3xl font-semibold tracking-tight text-[#496db3] sm:text-5xl outline-none"
                            >
                              {slide.title}
                            </h1>
                          ) : null}
                          {slide.showSubtitle ? (
                            <p
                              contentEditable
                              suppressContentEditableWarning
                              onBlur={(e) => {
                                const text = e.currentTarget.textContent ?? "";
                                setSlides((prev) =>
                                  prev.map((s, sIdx) =>
                                    sIdx === activeIndex ? { ...s, subtitle: text } : s,
                                  ),
                                );
                              }}
                              className="mt-6 text-pretty text-sm font-medium text-slate-600 sm:text-base outline-none"
                            >
                              {slide.subtitle || "Подзаголовок"}
                            </p>
                          ) : null}
                          <div className={`mt-8 flex items-center gap-x-6 ${useSplitBanner ? "justify-start" : "justify-center"}`}>
                            {slide.showButton ? (
                              <button
                                type="button"
                                className="rounded-md bg-[#496db3] px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#3f5f9d] sm:text-sm"
                                onDoubleClick={() => {
                                  setLinkModalValue(slide.buttonHref || "");
                                  setLinkModalButtonText(slide.buttonText || "Get started");
                                  setLinkModalTarget("primary");
                                  setLinkModalOpen(true);
                                }}
                              >
                                <span
                                  contentEditable
                                  suppressContentEditableWarning
                                  onBlur={(e) => {
                                    const text = e.currentTarget.textContent ?? "";
                                    setSlides((prev) =>
                                      prev.map((s, sIdx) =>
                                        sIdx === activeIndex ? { ...s, buttonText: text } : s,
                                      ),
                                    );
                                  }}
                                  className="outline-none"
                                >
                                  {slide.buttonText || "Get started"}
                                </span>
                              </button>
                            ) : null}
                            {slide.showBottomLearnMore !== false ? (
                              <span
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => {
                                  const text = e.currentTarget.textContent ?? "";
                                  setSlides((prev) =>
                                    prev.map((s, sIdx) =>
                                      sIdx === activeIndex
                                        ? {
                                            ...s,
                                            learnMoreText: normalizeLearnMoreText(text),
                                          }
                                        : s,
                                    ),
                                  );
                                }}
                                onDoubleClick={() => {
                                  setLinkModalValue(slide.buttonHref || "");
                                  setLinkModalButtonText(
                                    normalizeLearnMoreText(slide.learnMoreText),
                                  );
                                  setLinkModalTarget("secondary");
                                  setLinkModalOpen(true);
                                }}
                                className="text-xs font-semibold text-[#496db3] outline-none sm:text-sm"
                              >
                                {normalizeLearnMoreText(slide.learnMoreText)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        {useSplitBanner ? (
                          <div className="relative z-10 h-full w-1/2 shrink-0 overflow-hidden border-l border-slate-300/70 bg-slate-200/60">
                            {slide.image ? (
                              <img
                                src={slide.image}
                                alt={slide.title}
                                className={`absolute inset-0 h-full w-full object-cover ${imageAlignMode && activeIndex === idx ? "cursor-ns-resize" : ""}`}
                                style={{ objectPosition: `50% ${slide.imagePosY}%` }}
                                onMouseDown={(e) => {
                                  if (!imageAlignMode || activeIndex !== idx) return;
                                  e.preventDefault();
                                  const target = e.currentTarget;
                                  const rect = target.getBoundingClientRect();
                                  const startY = e.clientY;
                                  const startPos = slide.imagePosY;
                                  const onMove = (moveEvent: MouseEvent) => {
                                    const deltaY = moveEvent.clientY - startY;
                                    const deltaPercent = (deltaY / rect.height) * 100;
                                    const pos = Math.max(0, Math.min(100, startPos - deltaPercent));
                                    setSlides((prev) =>
                                      prev.map((s, sIdx) =>
                                        sIdx === idx ? { ...s, imagePosY: pos } : s,
                                      ),
                                    );
                                  };
                                  const onUp = () => {
                                    window.removeEventListener("mousemove", onMove);
                                    window.removeEventListener("mouseup", onUp);
                                  };
                                  window.addEventListener("mousemove", onMove);
                                  window.addEventListener("mouseup", onUp);
                                }}
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center bg-slate-300">
                                <span className="rounded-md border border-slate-500/40 bg-slate-900/35 px-3 py-1.5 text-xs font-medium text-white/90">
                                  Выберите изображение для правого блока
                                </span>
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                    );
                  })();
          }}
        />
      </div>
    </section>
  );
}

