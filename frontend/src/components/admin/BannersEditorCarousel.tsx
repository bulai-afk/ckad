"use client";

import { CheckIcon } from "@heroicons/react/20/solid";
import {
  Bars3BottomLeftIcon,
  Bars3BottomRightIcon,
  EllipsisVerticalIcon,
  SwatchIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCarouselSwipe } from "@/hooks/useCarouselSwipe";
import { BannerTextOverlayBand } from "@/components/BannerTextOverlayBand";
import {
  bannerHToAlignSelf,
  normalizeBannerLineHeight,
  parseBannerTextBand,
  resolveBannerTitleLineHeight,
  resolveButtonHAlign,
  resolveSubtitleHAlign,
  resolveTitleHAlign,
} from "@/lib/bannerElementPosition";
import { normalizeFontSizeToPercent } from "@/lib/bannerFontSize";

type Slide = {
  id: string;
  title: string;
  subtitle: string;
  buttonText: string;
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

const INITIAL_SLIDES: Slide[] = [
  {
    id: "1",
    title: "Банер 1",
    subtitle: "",
    buttonText: "",
    buttonHref: "",
    showTitle: true,
    showSubtitle: false,
    showButton: false,
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
    titleFontSize: 200,
    subtitleFontSize: 100,
    buttonFontSize: 100,
    titleColor: "#ffffff",
    subtitleColor: "#ffffff",
    buttonTextColor: "#ffffff",
    titleBold: true,
    titleItalic: false,
    subtitleBold: false,
    subtitleItalic: false,
    buttonBold: true,
    buttonItalic: false,
    titleWeight: 700,
    subtitleWeight: 400,
    buttonWeight: 600,
    textBand: "full",
  },
  {
    id: "2",
    title: "Банер 2",
    subtitle: "",
    buttonText: "",
    buttonHref: "",
    showTitle: true,
    showSubtitle: false,
    showButton: false,
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
    titleFontSize: 200,
    subtitleFontSize: 100,
    buttonFontSize: 100,
    titleColor: "#ffffff",
    subtitleColor: "#ffffff",
    buttonTextColor: "#ffffff",
    titleBold: true,
    titleItalic: false,
    subtitleBold: false,
    subtitleItalic: false,
    buttonBold: true,
    buttonItalic: false,
    titleWeight: 700,
    subtitleWeight: 400,
    buttonWeight: 600,
    textBand: "full",
  },
  {
    id: "3",
    title: "Банер 3",
    subtitle: "",
    buttonText: "",
    buttonHref: "",
    showTitle: true,
    showSubtitle: false,
    showButton: false,
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
    titleFontSize: 200,
    subtitleFontSize: 100,
    buttonFontSize: 100,
    titleColor: "#ffffff",
    subtitleColor: "#ffffff",
    buttonTextColor: "#ffffff",
    titleBold: true,
    titleItalic: false,
    subtitleBold: false,
    subtitleItalic: false,
    buttonBold: true,
    buttonItalic: false,
    titleWeight: 700,
    subtitleWeight: 400,
    buttonWeight: 600,
    textBand: "full",
  },
];

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
    subtitle: typeof raw.subtitle === "string" ? raw.subtitle : "",
    buttonText: typeof raw.buttonText === "string" ? raw.buttonText : "",
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

function AlignCenterIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75Zm5 5.5a.75.75 0 0 1 .75-.75h5.5a.75.75 0 0 1 0 1.5h-5.5A.75.75 0 0 1 7 10.25Zm-5 5a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function AlignVerticalTopIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true">
      <path d="M3 3.75A.75.75 0 0 1 3.75 3h12.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 3.75Z" />
      <path d="M7.75 7A.75.75 0 0 0 7 7.75v8.5c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-8.5a.75.75 0 0 0-.75-.75h-4.5Z" />
    </svg>
  );
}

function AlignVerticalMiddleIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true">
      <path d="M3 10a.75.75 0 0 1 .75-.75h12.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 10Z" />
      <path d="M7.75 5A.75.75 0 0 0 7 5.75v8.5c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-8.5a.75.75 0 0 0-.75-.75h-4.5Z" />
    </svg>
  );
}

function AlignVerticalBottomIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true">
      <path d="M3 16.25a.75.75 0 0 1 .75-.75h12.5a.75.75 0 0 1 0 1.5H3.75a.75.75 0 0 1-.75-.75Z" />
      <path d="M7.75 3A.75.75 0 0 0 7 3.75v8.5c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-8.5a.75.75 0 0 0-.75-.75h-4.5Z" />
    </svg>
  );
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
  const [imageAlignMode, setImageAlignMode] = useState(false);
  const [colorMenuOpen, setColorMenuOpen] = useState(false);
  const [fontSizeTarget, setFontSizeTarget] = useState<"title" | "subtitle" | "button">("title");
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkModalValue, setLinkModalValue] = useState("");
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const actionsMenuRef = useRef<HTMLDivElement | null>(null);
  const colorDropdownRef = useRef<HTMLDivElement | null>(null);
  const linkModalInputRef = useRef<HTMLInputElement | null>(null);
  const presetColors = [
    "#ffffff",
    "#f8fafc",
    "#000000",
    "#1e293b",
    "#496db3",
    "#2563eb",
    "#16a34a",
    "#dc2626",
    "#f59e0b",
    "#7c3aed",
  ];
  const fontSizes = [75, 100, 125, 150, 175, 200, 225, 250, 300, 350, 400];


  const canPrev = activeIndex > 0;
  const canNext = activeIndex < slides.length - 1;

  const bannerEditorSwipe = useCarouselSwipe(
    () => setActiveIndex((p) => (p > 0 ? p - 1 : p)),
    () => setActiveIndex((p) => (p < slides.length - 1 ? p + 1 : p)),
    { enabled: slides.length > 1 && !imageAlignMode },
  );

  const activeSlide = useMemo(() => slides[activeIndex] ?? null, [slides, activeIndex]);
  const activeFontSizeValue =
    !activeSlide
      ? 200
      : fontSizeTarget === "title"
        ? activeSlide.titleFontSize
        : fontSizeTarget === "subtitle"
          ? activeSlide.subtitleFontSize
          : activeSlide.buttonFontSize;
  const activeTextColorValue =
    !activeSlide
      ? "#ffffff"
      : fontSizeTarget === "title"
        ? activeSlide.titleColor
        : fontSizeTarget === "subtitle"
          ? activeSlide.subtitleColor
          : activeSlide.buttonTextColor;

  const activeElementH = useMemo(() => {
    if (!activeSlide) return "center" as const;
    const base = activeSlide.align;
    if (fontSizeTarget === "title") return activeSlide.titleAlign ?? base;
    if (fontSizeTarget === "subtitle") return activeSlide.subtitleAlign ?? base;
    return activeSlide.buttonAlign ?? base;
  }, [activeSlide, fontSizeTarget]);

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
              subtitle: s.subtitle,
              buttonText: s.buttonText,
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
    if (!colorMenuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (colorDropdownRef.current?.contains(target)) return;
      setColorMenuOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [colorMenuOpen]);

  useEffect(() => {
    if (!linkModalOpen) return;
    const t = window.setTimeout(() => linkModalInputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [linkModalOpen]);

  function goPrev() {
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }

  function goNext() {
    setActiveIndex((prev) => (prev < slides.length - 1 ? prev + 1 : prev));
  }

  function addSlide() {
    const nextNumber = slides.length + 1;
    setSlides((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        title: `Банер ${nextNumber}`,
        subtitle: "",
        buttonText: "",
        buttonHref: "",
        showTitle: true,
        showSubtitle: false,
        showButton: false,
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
        titleFontSize: 200,
        subtitleFontSize: 100,
        buttonFontSize: 100,
        titleColor: "#ffffff",
        subtitleColor: "#ffffff",
        buttonTextColor: "#ffffff",
        titleBold: true,
        titleItalic: false,
        subtitleBold: false,
        subtitleItalic: false,
        buttonBold: true,
        buttonItalic: false,
        titleWeight: 700,
        subtitleWeight: 400,
        buttonWeight: 600,
        textBand: "full",
      },
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
    void (async () => {
      try {
        const url = await compressImageFileToWebpDataUrl(file);
        setSlides((prev) =>
          prev.map((s, idx) => (idx === activeIndex ? { ...s, image: url } : s)),
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
          setSlides(
            saved.slides.map((s) =>
              normalizeSlide({
                id: s.id,
                title: s.title,
                subtitle: s.subtitle,
                buttonText: s.buttonText,
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
              <button
                type="button"
                className={`inline-flex h-8 w-8 items-center justify-center rounded transition-colors hover:text-[#496db3] ${
                  activeElementH === "left"
                    ? "bg-slate-200 text-[#496db3]"
                    : "text-slate-600"
                }`}
                onClick={() => {
                  if (fontSizeTarget === "title") updateActiveSlide({ titleAlign: "left" });
                  else if (fontSizeTarget === "subtitle")
                    updateActiveSlide({ subtitleAlign: "left" });
                  else updateActiveSlide({ buttonAlign: "left" });
                }}
                title="По горизонтали: влево"
              >
                <Bars3BottomLeftIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                className={`inline-flex h-8 w-8 items-center justify-center rounded transition-colors hover:text-[#496db3] ${
                  activeElementH === "center"
                    ? "bg-slate-200 text-[#496db3]"
                    : "text-slate-600"
                }`}
                onClick={() => {
                  if (fontSizeTarget === "title") updateActiveSlide({ titleAlign: "center" });
                  else if (fontSizeTarget === "subtitle")
                    updateActiveSlide({ subtitleAlign: "center" });
                  else updateActiveSlide({ buttonAlign: "center" });
                }}
                title="По горизонтали: по центру"
              >
                <AlignCenterIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                className={`inline-flex h-8 w-8 items-center justify-center rounded transition-colors hover:text-[#496db3] ${
                  activeElementH === "right"
                    ? "bg-slate-200 text-[#496db3]"
                    : "text-slate-600"
                }`}
                onClick={() => {
                  if (fontSizeTarget === "title") updateActiveSlide({ titleAlign: "right" });
                  else if (fontSizeTarget === "subtitle")
                    updateActiveSlide({ subtitleAlign: "right" });
                  else updateActiveSlide({ buttonAlign: "right" });
                }}
                title="По горизонтали: вправо"
              >
                <Bars3BottomRightIcon className="h-4 w-4" />
              </button>
              <div className="h-6 w-px shrink-0 bg-slate-200" aria-hidden="true" />
              <label className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 text-[11px] text-slate-600">
                Размер
                <select
                  value={String(activeFontSizeValue)}
                  onChange={(e) => {
                    const base = Number(e.target.value);
                    if (fontSizeTarget === "title") {
                      updateActiveSlide({ titleFontSize: base });
                      return;
                    }
                    if (fontSizeTarget === "subtitle") {
                      updateActiveSlide({ subtitleFontSize: base });
                      return;
                    }
                    updateActiveSlide({ buttonFontSize: base });
                  }}
                  className="h-8 bg-transparent text-xs text-slate-700 outline-none"
                >
                  {fontSizes.map((size) => (
                    <option key={`font-${size}`} value={size}>
                      {size}%
                    </option>
                  ))}
                </select>
              </label>
              <div className="h-6 w-px shrink-0 bg-slate-200" aria-hidden="true" />
              <button
                type="button"
                className={`inline-flex h-8 w-8 items-center justify-center rounded transition-colors hover:text-[#496db3] ${
                  activeSlide.verticalAlign === "top"
                    ? "bg-slate-200 text-[#496db3]"
                    : "text-slate-600"
                }`}
                onClick={() => updateActiveSlide({ verticalAlign: "top" })}
                aria-label="Блок текста: верх"
                title="Вертикаль всего текстового блока: верх"
              >
                <AlignVerticalTopIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                className={`inline-flex h-8 w-8 items-center justify-center rounded transition-colors hover:text-[#496db3] ${
                  activeSlide.verticalAlign === "middle"
                    ? "bg-slate-200 text-[#496db3]"
                    : "text-slate-600"
                }`}
                onClick={() => updateActiveSlide({ verticalAlign: "middle" })}
                aria-label="Блок текста: центр"
                title="Вертикаль всего текстового блока: центр"
              >
                <AlignVerticalMiddleIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                className={`inline-flex h-8 w-8 items-center justify-center rounded transition-colors hover:text-[#496db3] ${
                  activeSlide.verticalAlign === "bottom"
                    ? "bg-slate-200 text-[#496db3]"
                    : "text-slate-600"
                }`}
                onClick={() => updateActiveSlide({ verticalAlign: "bottom" })}
                aria-label="Блок текста: низ"
                title="Вертикаль всего текстового блока: низ"
              >
                <AlignVerticalBottomIcon className="h-4 w-4" />
              </button>
              <div className="h-6 w-px shrink-0 bg-slate-200" aria-hidden="true" />
              <select
                value={String(activeSlide.lineHeight)}
                onChange={(e) => updateActiveSlide({ lineHeight: Number(e.target.value) })}
                className="flex h-8 min-w-[4rem] items-center justify-between gap-1 rounded border border-slate-200 bg-white px-2 text-xs text-slate-700 transition-colors hover:border-slate-300"
              >
                <option value="1">1.0</option>
                <option value="1.2">1.2</option>
                <option value="1.4">1.4</option>
                <option value="1.6">1.6</option>
              </select>
              <div ref={colorDropdownRef} className="relative z-20">
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-200 bg-white transition-colors hover:border-slate-300"
                  aria-label="Цвет шрифта"
                  aria-expanded={colorMenuOpen}
                  onClick={() => setColorMenuOpen((v) => !v)}
                  title="Цвет текста"
                >
                  <span className="h-4 w-4 rounded border border-slate-200" style={{ backgroundColor: activeTextColorValue }} />
                </button>
                {colorMenuOpen ? (
                  <div
                    className="absolute left-0 top-full z-[10040] mt-1 rounded border border-slate-200 bg-white p-2 shadow-lg"
                    style={{ width: 112, minWidth: 112 }}
                    role="listbox"
                  >
                    <div className="grid grid-cols-4 gap-1.5">
                      {presetColors.map((color) => {
                        const isSelected =
                          activeTextColorValue.toLowerCase() ===
                          color.toLowerCase();
                        const luminance = (() => {
                          const r = parseInt(color.slice(1, 3), 16);
                          const g = parseInt(color.slice(3, 5), 16);
                          const b = parseInt(color.slice(5, 7), 16);
                          return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
                        })();
                        const iconLight = luminance < 0.6;
                        return (
                          <button
                            key={color}
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            className={`flex aspect-square w-full items-center justify-center rounded border border-slate-200 transition-colors hover:ring-2 hover:ring-[#496db3] hover:ring-offset-1 ${
                              isSelected
                                ? "ring-2 ring-[#496db3] ring-offset-1"
                                : ""
                            }`}
                            style={{ backgroundColor: color }}
                            onClick={() => {
                              if (fontSizeTarget === "title") {
                                updateActiveSlide({ titleColor: color });
                              } else if (fontSizeTarget === "subtitle") {
                                updateActiveSlide({ subtitleColor: color });
                              } else {
                                updateActiveSlide({ buttonTextColor: color });
                              }
                              setColorMenuOpen(false);
                            }}
                            aria-label={`Цвет ${color}`}
                          >
                            {isSelected ? (
                              <CheckIcon
                                className={`h-3 w-3 ${
                                  iconLight
                                    ? "text-white drop-shadow-[0_0_1px_rgba(0,0,0,0.5)]"
                                    : "text-slate-800"
                                }`}
                              />
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                    <label className="mt-2 flex items-center gap-2 rounded border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600">
                      <SwatchIcon className="h-3.5 w-3.5" />
                      <input
                        type="color"
                        value={activeTextColorValue}
                        onChange={(e) => {
                          if (fontSizeTarget === "title") {
                            updateActiveSlide({ titleColor: e.target.value });
                          } else if (fontSizeTarget === "subtitle") {
                            updateActiveSlide({ subtitleColor: e.target.value });
                          } else {
                            updateActiveSlide({ buttonTextColor: e.target.value });
                          }
                        }}
                        className="h-5 w-6 cursor-pointer border-0 bg-transparent p-0"
                        aria-label="Пользовательский цвет текста"
                      />
                    </label>
                  </div>
                ) : null}
              </div>
              <div className="h-6 w-px shrink-0 bg-slate-200" aria-hidden="true" />
              <label className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 text-[11px] text-slate-600">
                Толщина
                <select
                  value={String(
                    fontSizeTarget === "title"
                      ? activeSlide.titleWeight
                      : fontSizeTarget === "subtitle"
                        ? activeSlide.subtitleWeight
                        : activeSlide.buttonWeight,
                  )}
                  onChange={(e) => {
                    const w = Number(e.target.value);
                    if (fontSizeTarget === "title") updateActiveSlide({ titleWeight: w });
                    else if (fontSizeTarget === "subtitle") updateActiveSlide({ subtitleWeight: w });
                    else updateActiveSlide({ buttonWeight: w });
                  }}
                  className="h-8 bg-transparent text-xs text-slate-700 outline-none"
                >
                  {[300, 400, 500, 600, 700, 800, 900].map((w) => (
                    <option key={`w-${w}`} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </label>
              <div className="h-6 w-px shrink-0 bg-slate-200" aria-hidden="true" />
              <button
                type="button"
                className={`inline-flex h-8 w-8 items-center justify-center rounded transition-colors hover:text-[#496db3] ${
                  (fontSizeTarget === "title"
                    ? activeSlide.titleBold
                    : fontSizeTarget === "subtitle"
                      ? activeSlide.subtitleBold
                      : activeSlide.buttonBold)
                    ? "bg-slate-200 text-[#496db3]"
                    : "text-slate-600"
                }`}
                onClick={() => {
                  if (fontSizeTarget === "title") {
                    const next = !activeSlide.titleBold;
                    updateActiveSlide({ titleBold: next, titleWeight: next ? 700 : 400 });
                    return;
                  }
                  if (fontSizeTarget === "subtitle") {
                    const next = !activeSlide.subtitleBold;
                    updateActiveSlide({ subtitleBold: next, subtitleWeight: next ? 700 : 400 });
                    return;
                  }
                  const next = !activeSlide.buttonBold;
                  updateActiveSlide({ buttonBold: next, buttonWeight: next ? 700 : 600 });
                }}
                aria-label="Жирный"
              >
                <span className="text-sm font-bold">B</span>
              </button>
              <button
                type="button"
                className={`inline-flex h-8 w-8 items-center justify-center rounded transition-colors hover:text-[#496db3] ${
                  (fontSizeTarget === "title"
                    ? activeSlide.titleItalic
                    : fontSizeTarget === "subtitle"
                      ? activeSlide.subtitleItalic
                      : activeSlide.buttonItalic)
                    ? "bg-slate-200 text-[#496db3]"
                    : "text-slate-600"
                }`}
                onClick={() => {
                  if (fontSizeTarget === "title") {
                    updateActiveSlide({ titleItalic: !activeSlide.titleItalic });
                    return;
                  }
                  if (fontSizeTarget === "subtitle") {
                    updateActiveSlide({ subtitleItalic: !activeSlide.subtitleItalic });
                    return;
                  }
                  updateActiveSlide({ buttonItalic: !activeSlide.buttonItalic });
                }}
                aria-label="Курсив"
              >
                <span className="text-sm italic">I</span>
              </button>
              <button
                type="button"
                className={`inline-flex h-8 w-8 items-center justify-center rounded transition-colors hover:text-[#496db3] ${
                  activeSlide.underline ? "bg-slate-200 text-[#496db3]" : "text-slate-600"
                }`}
                onClick={() => updateActiveSlide({ underline: !activeSlide.underline })}
                aria-label="Подчеркнутый"
              >
                <span className="text-sm underline">U</span>
              </button>
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
                    className="absolute right-0 top-full z-[10040] mt-2 rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
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
                    <div className="my-1 h-px bg-slate-100" />
                    <p className="px-3 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Зона текста
                    </p>
                    <button
                      type="button"
                      className={`w-full px-3 py-1.5 text-left text-xs ${
                        (activeSlide?.textBand ?? "full") === "full"
                          ? "bg-slate-100 text-[#496db3]"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                      onClick={() => {
                        if (!activeSlide) return;
                        updateActiveSlide({ textBand: "full" });
                        setActionsMenuOpen(false);
                      }}
                    >
                      На всю ширину банера
                    </button>
                    <button
                      type="button"
                      className={`w-full px-3 py-1.5 text-left text-xs ${
                        activeSlide?.textBand === "left"
                          ? "bg-slate-100 text-[#496db3]"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                      onClick={() => {
                        if (!activeSlide) return;
                        updateActiveSlide({ textBand: "left" });
                        setActionsMenuOpen(false);
                      }}
                    >
                      Текст в левой половине
                    </button>
                    <button
                      type="button"
                      className={`w-full px-3 py-1.5 text-left text-xs ${
                        activeSlide?.textBand === "right"
                          ? "bg-slate-100 text-[#496db3]"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                      onClick={() => {
                        if (!activeSlide) return;
                        updateActiveSlide({ textBand: "right" });
                        setActionsMenuOpen(false);
                      }}
                    >
                      Текст в правой половине
                    </button>
                    <button
                      type="button"
                      className={`w-full px-3 py-1.5 text-left text-xs ${
                        imageAlignMode
                          ? "bg-slate-100 text-[#496db3]"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                      onClick={() => {
                        setImageAlignMode((v) => !v);
                        setActionsMenuOpen(false);
                      }}
                    >
                      {imageAlignMode ? "Завершить положение фона" : "Положение фона"}
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-3 backdrop-blur-sm"
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
                          sIdx === activeIndex ? { ...s, buttonHref: linkModalValue.trim() } : s,
                        ),
                      );
                      setLinkModalOpen(false);
                    }
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#496db3] focus:ring-1 focus:ring-[#496db3]"
                  placeholder="https://example.com или callback://open"
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
                      sIdx === activeIndex ? { ...s, buttonHref: linkModalValue.trim() } : s,
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

      <div className="relative overflow-hidden rounded-xl bg-slate-100 p-4">
        {imageAlignMode ? (
          <div className="mb-2 text-xs text-[#496db3]">
            Режим выравнивания картинки по вертикали: потяните изображение мышкой вверх/вниз.
          </div>
        ) : null}
        {/*
          Кнопки навигации под баннером (не сбоку), чтобы ширина превью совпадала с главной:
          иначе flex с ‹ › уменьшает область баннера → другой cqw и другой визуальный размер шрифта.
        */}
        <div
          className="mx-auto w-full max-w-[1200px] touch-pan-y overflow-hidden rounded-xl bg-white"
          {...bannerEditorSwipe}
        >
            <div
              className="flex transition-transform duration-300 ease-out"
              style={{ transform: `translateX(-${activeIndex * 100}%)` }}
            >
              {slides.map((slide, idx) => (
                <div key={slide.id} className="w-full shrink-0">
                  <div className="aspect-[16/7] overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                    {slide.image ? (
                      <div className="relative h-full w-full">
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
                        {slide.showOverlay ? (
                          <div
                            className={`absolute inset-0 z-10 ${
                              imageAlignMode && activeIndex === idx ? "pointer-events-none" : ""
                            }`}
                            style={{ backgroundColor: "rgba(0, 0, 0, 0.35)" }}
                          />
                        ) : null}
                        <BannerTextOverlayBand
                          textBand={slide.textBand}
                          verticalAlign={slide.verticalAlign}
                          className={
                            imageAlignMode && activeIndex === idx
                              ? "pointer-events-none"
                              : ""
                          }
                        >
                          {slide.showTitle ? (
                            <h1
                              contentEditable
                              suppressContentEditableWarning
                              onFocus={() => setFontSizeTarget("title")}
                              onBlur={(e) => {
                                /* innerText сохраняет переносы строк из contentEditable (Enter) */
                                const text = e.currentTarget.innerText ?? "";
                                setSlides((prev) =>
                                  prev.map((s, sIdx) =>
                                    sIdx === activeIndex ? { ...s, title: text } : s,
                                  ),
                                );
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Escape") {
                                  e.preventDefault();
                                  (e.currentTarget as HTMLElement).blur();
                                }
                              }}
                              style={{
                                alignSelf: bannerHToAlignSelf(
                                  resolveTitleHAlign({
                                    align: slide.align,
                                    titleAlign: slide.titleAlign,
                                  }),
                                ),
                                marginTop:
                                  slide.verticalAlign === "top" ? "1.25rem" : undefined,
                                marginBottom:
                                  slide.verticalAlign === "bottom" ? "1.25rem" : undefined,
                                zIndex: 21,
                                color: slide.titleColor,
                                fontSize: `${slide.titleFontSize}%`,
                                lineHeight: resolveBannerTitleLineHeight(
                                  slide.title,
                                  slide.lineHeight,
                                  true,
                                ),
                                fontWeight: slide.titleWeight ?? (slide.titleBold ? 700 : 400),
                                fontStyle: slide.titleItalic ? "italic" : "normal",
                                textDecoration: slide.underline ? "underline" : "none",
                                textAlign: resolveTitleHAlign({
                                  align: slide.align,
                                  titleAlign: slide.titleAlign,
                                }),
                              }}
                              className="m-0 max-w-[90%] whitespace-pre-line outline-none"
                            >
                              {slide.title}
                            </h1>
                          ) : null}
                          {slide.showSubtitle ? (
                            <p
                              contentEditable
                              suppressContentEditableWarning
                              onFocus={() => setFontSizeTarget("subtitle")}
                              onBlur={(e) => {
                                const text = e.currentTarget.textContent ?? "";
                                setSlides((prev) =>
                                  prev.map((s, sIdx) =>
                                    sIdx === activeIndex ? { ...s, subtitle: text } : s,
                                  ),
                                );
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  (e.currentTarget as HTMLElement).blur();
                                }
                              }}
                              style={{
                                alignSelf: bannerHToAlignSelf(
                                  resolveSubtitleHAlign({
                                    align: slide.align,
                                    subtitleAlign: slide.subtitleAlign,
                                  }),
                                ),
                                zIndex: 22,
                                color: slide.subtitleColor,
                                lineHeight: normalizeBannerLineHeight(slide.lineHeight),
                                fontSize: `${slide.subtitleFontSize}%`,
                                fontWeight: slide.subtitleWeight ?? (slide.subtitleBold ? 700 : 400),
                                fontStyle: slide.subtitleItalic ? "italic" : "normal",
                                textAlign: resolveSubtitleHAlign({
                                  align: slide.align,
                                  subtitleAlign: slide.subtitleAlign,
                                }),
                              }}
                              className="m-0 mt-2 max-w-[90%] opacity-90 outline-none"
                            >
                              {slide.subtitle || "Подзаголовок"}
                            </p>
                          ) : null}
                          {slide.showButton ? (
                            <button
                              type="button"
                              className="mt-4 inline-flex items-center rounded-full border-0 bg-[#496db3] px-4 py-2 font-semibold text-white shadow-sm"
                              title={slide.buttonHref || "Двойной клик для редактирования ссылки"}
                              onDoubleClick={() => {
                                setLinkModalValue(slide.buttonHref || "");
                                setLinkModalOpen(true);
                              }}
                              style={{
                                alignSelf: bannerHToAlignSelf(
                                  resolveButtonHAlign({
                                    align: slide.align,
                                    buttonAlign: slide.buttonAlign,
                                  }),
                                ),
                                zIndex: 23,
                                fontFamily: "inherit",
                                fontSize: `${slide.buttonFontSize}%`,
                                color: slide.buttonTextColor,
                                fontWeight: slide.buttonWeight ?? (slide.buttonBold ? 700 : 600),
                                fontStyle: slide.buttonItalic ? "italic" : "normal",
                              }}
                            >
                              <span
                                contentEditable
                                suppressContentEditableWarning
                                onFocus={() => setFontSizeTarget("button")}
                                onBlur={(e) => {
                                  const text = e.currentTarget.textContent ?? "";
                                  setSlides((prev) =>
                                    prev.map((s, sIdx) =>
                                      sIdx === activeIndex ? { ...s, buttonText: text } : s,
                                    ),
                                  );
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    (e.currentTarget as HTMLElement).blur();
                                  }
                                }}
                                className="outline-none"
                                style={{ font: "inherit" }}
                              >
                                {slide.buttonText || "Подробнее"}
                              </span>
                            </button>
                          ) : null}
                        </BannerTextOverlayBand>
                      </div>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm text-slate-500">
                        {slide.title}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        {slides.length > 1 ? (
          <div className="mx-auto mt-3 flex w-full max-w-[1200px] flex-col items-center gap-3">
            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={goPrev}
                disabled={!canPrev}
                className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-slate-100 text-2xl leading-none text-slate-700 shadow-sm disabled:opacity-40"
                aria-label="Предыдущий слайд"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={!canNext}
                className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-slate-100 text-2xl leading-none text-slate-700 shadow-sm disabled:opacity-40"
                aria-label="Следующий слайд"
              >
                ›
              </button>
            </div>
            <div className="flex items-center justify-center gap-1.5">
              {slides.map((slide, idx) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  className={`h-2.5 rounded-full transition-all ${
                    idx === activeIndex
                      ? "w-6 bg-[#496db3]"
                      : "w-2.5 bg-slate-300 hover:bg-slate-400"
                  }`}
                  aria-label={`Перейти к банеру ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

