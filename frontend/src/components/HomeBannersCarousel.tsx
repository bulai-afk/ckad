"use client";

import { useEffect, useMemo, useState } from "react";
import { useCarouselSwipe } from "@/hooks/useCarouselSwipe";
import {
  normalizeBannerLineHeight,
  parseBannerTextBand,
} from "@/lib/bannerElementPosition";
import { normalizeFontSizeToPercent } from "@/lib/bannerFontSize";
import { BannerPreviewReadonly } from "@/components/BannerPreviewReadonly";
import { BannerCarouselFrame } from "@/components/BannerCarouselFrame";
import { CallbackRequestModal } from "@/components/CallbackRequestModal";
import {
  bannerDebugEnabled,
  describeBannerImageRef,
  logBannerDebug,
} from "@/lib/bannerDebugLog";

const CALLBACK_FORM_LINK = "callback://open";
const DEFAULT_ANNOUNCEMENT_TEXT = "Announcing our next round of funding.";
const DEFAULT_LEARN_MORE_TEXT = "Learn more";

function normalizeLearnMoreText(value: unknown): string {
  if (typeof value !== "string") return DEFAULT_LEARN_MORE_TEXT;
  const cleaned = value.replace(/\s*[→➝➡➜]+\s*$/u, "").trim();
  return cleaned.length > 0 ? cleaned : DEFAULT_LEARN_MORE_TEXT;
}

export type BannerSlide = {
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
  /** Колонка текста: вся ширина или левая/правая половина банера. */
  textBand?: "full" | "left" | "right";
};

type HomeBannersCarouselProps = {
  /** Если не передать — данные подгружаются с API на клиенте (рекомендуется для главной). */
  slides?: BannerSlide[];
  /** Переносы строк в заголовке (символы \\n из API / админки), как на /admin/banners */
  preserveBannerTitleLineBreaks?: boolean;
  /** Во всю ширину viewport (главная): без бокового скругления у секции. */
  fullWidth?: boolean;
  /** Масштаб всей визуальной области банера (зум кадра в пределах области банера). */
  mainVisualScale?: number;
};

export function HomeBannersCarousel({
  slides = [],
  preserveBannerTitleLineBreaks = true,
  fullWidth = false,
  mainVisualScale = 1,
}: HomeBannersCarouselProps) {
  const [fetchedSlides, setFetchedSlides] = useState<BannerSlide[]>([]);

  useEffect(() => {
    if (slides.length > 0) return;
    void (async () => {
      try {
        // Тот же origin, что и страница — Next проксирует на Express (см. app/api/pages/banners).
        const res = await fetch("/api/pages/banners", {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { slides?: BannerSlide[] };
        if (Array.isArray(data.slides) && data.slides.length > 0) {
          setFetchedSlides(data.slides);
        }
      } catch {
        // keep fallback banner
      }
    })();
  }, [slides]);

  const runtimeSlides = slides.length > 0 ? slides : fetchedSlides;

  const normalized = useMemo(
    () =>
      runtimeSlides
        .filter(
          (s): s is BannerSlide =>
            typeof s === "object" &&
            s !== null &&
            typeof s.id === "string" &&
            typeof s.title === "string",
        )
        .map((s) => ({
        ...s,
        image:
          typeof s.image === "string"
            ? s.image
            : s.image === null || s.image === undefined
              ? null
              : null,
        title: typeof s.title === "string" ? s.title : "",
        announcementText:
          typeof s.announcementText === "string" && s.announcementText.trim().length > 0
            ? s.announcementText
            : DEFAULT_ANNOUNCEMENT_TEXT,
        bannerType:
          s.bannerType === "hero" || s.bannerType === "image" || s.bannerType === "split"
            ? s.bannerType
            : typeof s.image === "string" && s.image.trim().length > 0
              ? "image"
              : "hero",
        showAnnouncement: typeof s.showAnnouncement === "boolean" ? s.showAnnouncement : true,
        showLearnMore: typeof s.showLearnMore === "boolean" ? s.showLearnMore : true,
        showAnnouncementLearnMore:
          typeof s.showAnnouncementLearnMore === "boolean"
            ? s.showAnnouncementLearnMore
            : typeof s.showLearnMore === "boolean"
              ? s.showLearnMore
              : true,
        showBottomLearnMore:
          typeof s.showBottomLearnMore === "boolean"
            ? s.showBottomLearnMore
            : typeof s.showLearnMore === "boolean"
              ? s.showLearnMore
              : true,
        learnMoreText:
          normalizeLearnMoreText(s.learnMoreText),
        announcementLearnMoreText:
          normalizeLearnMoreText(
            typeof s.announcementLearnMoreText === "string"
              ? s.announcementLearnMoreText
              : s.learnMoreText,
          ),
        announcementLearnMoreHref:
          typeof s.announcementLearnMoreHref === "string"
            ? s.announcementLearnMoreHref
            : s.buttonHref ?? "",
        align: s.align ?? "center",
        verticalAlign: s.verticalAlign ?? "middle",
        fontSize: normalizeFontSizeToPercent(s.fontSize),
        titleFontSize: normalizeFontSizeToPercent(
          s.titleFontSize ?? s.fontSize ?? 200,
        ),
        subtitleFontSize: normalizeFontSizeToPercent(
          s.subtitleFontSize ??
            Math.max(
              70,
              Math.round(normalizeFontSizeToPercent(s.fontSize ?? 200) * 0.5),
            ),
        ),
        buttonFontSize: normalizeFontSizeToPercent(s.buttonFontSize ?? 100),
        titleColor: typeof s.titleColor === "string" ? s.titleColor : s.textColor ?? "#ffffff",
        subtitleColor:
          typeof s.subtitleColor === "string" ? s.subtitleColor : s.textColor ?? "#ffffff",
        buttonTextColor:
          typeof s.buttonTextColor === "string" ? s.buttonTextColor : "#ffffff",
        titleBold: typeof s.titleBold === "boolean" ? s.titleBold : Boolean(s.bold),
        titleItalic:
          typeof s.titleItalic === "boolean" ? s.titleItalic : Boolean(s.italic),
        subtitleBold:
          typeof s.subtitleBold === "boolean" ? s.subtitleBold : false,
        subtitleItalic:
          typeof s.subtitleItalic === "boolean" ? s.subtitleItalic : false,
        buttonBold:
          typeof s.buttonBold === "boolean" ? s.buttonBold : true,
        buttonItalic:
          typeof s.buttonItalic === "boolean" ? s.buttonItalic : false,
        textBand: parseBannerTextBand(
          (s as { textBand?: unknown }).textBand ??
            (s as { text_band?: unknown }).text_band,
        ),
        lineHeight: normalizeBannerLineHeight(s.lineHeight),
        textColor: s.textColor ?? "#ffffff",
        imagePosY: s.imagePosY ?? 50,
        showOverlay: typeof s.showOverlay === "boolean" ? s.showOverlay : true,
        })),
    [runtimeSlides],
  );

  useEffect(() => {
    if (!bannerDebugEnabled()) return;
    logBannerDebug("carousel:slides", {
      source: slides.length > 0 ? "props" : "fetch",
      count: normalized.length,
      slides: normalized.map((s) => ({
        id: s.id,
        bannerType: s.bannerType,
        image: describeBannerImageRef(
          typeof s.image === "string" ? s.image : "",
        ),
      })),
    });
  }, [normalized, slides.length]);

  const [index, setIndex] = useState(0);
  const [callbackModalOpen, setCallbackModalOpen] = useState(false);
  const canUse = normalized.length > 0;

  useEffect(() => {
    if (normalized.length <= 1) return;
    const t = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % normalized.length);
    }, 5000);
    return () => window.clearInterval(t);
  }, [normalized.length]);
  const activeIndex =
    normalized.length > 0 ? Math.max(0, Math.min(index, normalized.length - 1)) : 0;

  const bannerSwipe = useCarouselSwipe(
    () =>
      setIndex((i) => (normalized.length ? (i - 1 + normalized.length) % normalized.length : 0)),
    () => setIndex((i) => (normalized.length ? (i + 1) % normalized.length : 0)),
    { enabled: normalized.length > 1 },
  );

  const frameClass = fullWidth ? "rounded-none" : "rounded-2xl";

  if (!canUse) {
    return (
      <div className="w-full min-w-0 max-w-full shrink-0 overflow-x-hidden bg-slate-100">
        <section
          className={`relative flex w-full max-h-[calc(100dvh-var(--site-header-offset)-env(safe-area-inset-bottom,0px)-0.5rem)] flex-col justify-center overflow-hidden ${frameClass} h-[200vw] bg-gradient-to-r from-[#496db3] to-[#3f5f9d] px-6 py-8 text-white sm:h-[50vw] md:px-10 md:py-10`}
        >
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Центр каталогизации — клиентская часть
          </h1>
          <p className="mt-2 text-sm text-white/85 md:text-base">
            Публичные страницы, созданные в редакторе.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-full shrink-0 overflow-x-hidden bg-slate-100">
      <section className={`relative min-w-0 max-w-full overflow-hidden ${frameClass} bg-slate-100 p-0`}>
        <BannerCarouselFrame
          slides={normalized}
          activeIndex={activeIndex}
          onSelectSlide={setIndex}
          swipeProps={bannerSwipe}
          roundedClassName={frameClass}
          renderSlide={(slide) => (
            <div className="relative h-full min-h-0 w-full min-w-0 max-w-full overflow-hidden bg-slate-100">
              <div
                className="flex h-full min-h-0 w-full min-w-0 flex-col"
                style={
                  fullWidth && mainVisualScale !== 1
                    ? { transform: `scale(${mainVisualScale})`, transformOrigin: "center center" }
                    : undefined
                }
              >
                <BannerPreviewReadonly
                  slide={slide}
                  preserveBannerTitleLineBreaks={preserveBannerTitleLineBreaks}
                  callbackFormLink={CALLBACK_FORM_LINK}
                  onPrimaryClick={() => setCallbackModalOpen(true)}
                />
              </div>
            </div>
          )}
        />
      </section>

      <CallbackRequestModal
        open={callbackModalOpen}
        onClose={() => setCallbackModalOpen(false)}
        sourceMessage="Заявка из кнопки баннера."
      />
    </div>
  );
}

