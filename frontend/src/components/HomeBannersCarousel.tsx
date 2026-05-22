"use client";

import { useEffect, useMemo, useState } from "react";
import { useCarouselSwipe } from "@/hooks/useCarouselSwipe";
import {
  normalizeBannerLineHeight,
  parseBannerTextBand,
} from "@/lib/bannerElementPosition";
import { normalizeFontSizeToPercent } from "@/lib/bannerFontSize";
import { BannerCoverReadonlySlide } from "@/components/BannerCoverReadonlySlide";
import { BannerCarouselFrame } from "@/components/BannerCarouselFrame";
import { CallbackRequestModal } from "@/components/CallbackRequestModal";
import { SiteDocumentHtmlDialog } from "@/components/SiteDocumentHtmlDialog";
import {
  getCoverAspectCarouselClassName,
  type CoverAspectPresetId,
} from "@/lib/bannerCoverPresets";
import { parseBannersApiPayload } from "@/lib/bannersPayload";
import { bannerSlideToCoverModel } from "@/lib/bannerSlideToCoverModel";
import {
  bannerDebugEnabled,
  describeBannerImageRef,
  logBannerDebug,
} from "@/lib/bannerDebugLog";

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
  /** Общий размер баннеров из админки (2∶1 / 4∶1 / 6∶1). */
  coverAspect?: CoverAspectPresetId;
  /** Переносы строк в заголовке (символы \\n из API / админки), как на /admin/banners */
  preserveBannerTitleLineBreaks?: boolean;
  /** Во всю ширину viewport (главная): без бокового скругления у секции. */
  fullWidth?: boolean;
  /** Масштаб всей визуальной области банера (зум кадра в пределах области банера). */
  mainVisualScale?: number;
};

export function HomeBannersCarousel({
  slides = [],
  coverAspect: coverAspectProp = "1-8",
  preserveBannerTitleLineBreaks = true,
  fullWidth = false,
  mainVisualScale = 1,
}: HomeBannersCarouselProps) {
  const [fetchedSlides, setFetchedSlides] = useState<BannerSlide[]>([]);
  const [fetchedCoverAspect, setFetchedCoverAspect] =
    useState<CoverAspectPresetId>(coverAspectProp);
  /** Пока баннеры подгружаются с API (главная без SSR-слайдов) — не показываем текст без стилей (FOUC). */
  const [clientBannerFetchDone, setClientBannerFetchDone] = useState(slides.length > 0);

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
        const data = await res.json();
        const { coverAspect, slides: apiSlides } = parseBannersApiPayload(data);
        setFetchedCoverAspect(coverAspect);
        if (Array.isArray(apiSlides) && apiSlides.length > 0) {
          setFetchedSlides(apiSlides as BannerSlide[]);
        }
      } catch {
        /* оставляем пусто */
      } finally {
        setClientBannerFetchDone(true);
      }
    })();
  }, [slides]);

  const runtimeSlides = slides.length > 0 ? slides : fetchedSlides;
  const coverAspect = slides.length > 0 ? coverAspectProp : fetchedCoverAspect;
  const aspectClassName = getCoverAspectCarouselClassName(coverAspect);

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
          typeof s.announcementText === "string" ? s.announcementText : "",
        titleAlign:
          s.titleAlign === "left" || s.titleAlign === "right" || s.titleAlign === "center"
            ? s.titleAlign
            : undefined,
        subtitleAlign:
          s.subtitleAlign === "left" || s.subtitleAlign === "right" || s.subtitleAlign === "center"
            ? s.subtitleAlign
            : undefined,
        buttonAlign:
          s.buttonAlign === "left" || s.buttonAlign === "right" || s.buttonAlign === "center"
            ? s.buttonAlign
            : undefined,
        showTitle: typeof s.showTitle === "boolean" ? s.showTitle : true,
        showButton: typeof s.showButton === "boolean" ? s.showButton : true,
        buttonText: typeof s.buttonText === "string" ? s.buttonText : "",
        buttonHref: typeof s.buttonHref === "string" ? s.buttonHref : "#",
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
  const [documentDialogIndex, setDocumentDialogIndex] = useState<number | null>(null);
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
    if (!clientBannerFetchDone) {
      return (
        <div className="w-full min-w-0 max-w-full shrink-0 overflow-x-hidden bg-slate-100">
          <section
            aria-busy="true"
            aria-label="Загрузка баннеров"
            className={`relative w-full overflow-hidden ${frameClass}`}
            style={{
              minHeight: "min(52vh, 560px)",
              maxHeight:
                "calc(100dvh - var(--site-header-offset, 88px) - env(safe-area-inset-bottom, 0px) - 0.5rem)",
              background: "linear-gradient(90deg, #496db3 0%, #3f5f9d 100%)",
            }}
          />
        </div>
      );
    }
    return null;
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
          aspectClassName={aspectClassName}
          renderSlide={(slide, idx) => (
            <div className="relative h-full min-h-0 w-full min-w-0 max-w-full overflow-hidden bg-slate-100">
              <div
                className="flex h-full min-h-0 w-full min-w-0 flex-col"
                style={
                  fullWidth && mainVisualScale !== 1
                    ? { transform: `scale(${mainVisualScale})`, transformOrigin: "center center" }
                    : undefined
                }
              >
                <BannerCoverReadonlySlide
                  slide={bannerSlideToCoverModel(slide)}
                  coverAspect={coverAspect}
                  preserveTitleLineBreaks={preserveBannerTitleLineBreaks}
                  onPrimaryClick={() => setCallbackModalOpen(true)}
                  onDocumentClick={(index) => setDocumentDialogIndex(index)}
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
      <SiteDocumentHtmlDialog
        open={documentDialogIndex !== null}
        onClose={() => setDocumentDialogIndex(null)}
        documentIndex={documentDialogIndex}
      />
    </div>
  );
}

