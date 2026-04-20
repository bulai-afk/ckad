"use client";

import { Fragment, useEffect } from "react";
import {
  bannerDebugEnabled,
  describeBannerImageRef,
  logBannerDebug,
} from "@/lib/bannerDebugLog";

type BannerPreviewSlide = {
  id: string;
  title: string;
  announcementText?: string;
  bannerType?: "hero" | "image" | "split";
  showAnnouncement?: boolean;
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
  image?: string | null;
  imagePosY?: number;
  textBand?: "full" | "left" | "right";
  align?: "left" | "center" | "right";
  showOverlay?: boolean;
};

type BannerPreviewReadonlyProps = {
  slide: BannerPreviewSlide;
  preserveBannerTitleLineBreaks?: boolean;
  callbackFormLink: string;
  onPrimaryClick?: () => void;
};

const DEFAULT_ANNOUNCEMENT_TEXT = "Announcing our next round of funding.";
const DEFAULT_LEARN_MORE_TEXT = "Learn more";

function bannerTitleToNodes(text: string) {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");
  return lines.map((line, idx) => (
    <Fragment key={idx}>
      {idx > 0 ? <br /> : null}
      {line}
    </Fragment>
  ));
}

function bannerTitleForAlt(text: string): string {
  return text.replace(/\r\n/g, " ").replace(/\r/g, " ").replace(/\n/g, " ").trim();
}

export function BannerPreviewReadonly({
  slide,
  preserveBannerTitleLineBreaks = true,
  callbackFormLink,
  onPrimaryClick,
}: BannerPreviewReadonlyProps) {
  const imageSrc = typeof slide.image === "string" ? slide.image.trim() : "";
  const useImageBanner = slide.bannerType === "image";

  useEffect(() => {
    if (!useImageBanner || !bannerDebugEnabled()) return;
    logBannerDebug("preview:mount", {
      slideId: slide.id,
      bannerType: slide.bannerType,
      image: describeBannerImageRef(imageSrc),
    });
  }, [useImageBanner, slide.id, slide.bannerType, imageSrc]);
  const useSplitBanner =
    slide.bannerType === "split" ||
    (slide.bannerType !== "image" &&
      (slide.textBand === "left" || (slide.align === "left" && imageSrc.length > 0)));
  const singleLineImageTitle = slide.title.replace(/\s*\n+\s*/g, " ").trim() || slide.title;

  if (useImageBanner) {
    const textBlock = (
      <div className="mx-auto w-full min-w-0 max-w-3xl text-center">
        {slide.showAnnouncement !== false ? (
          <div className="hidden sm:mb-6 sm:flex sm:justify-center">
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs text-slate-600 ring-1 ring-slate-900/10 sm:text-sm">
              <span>{slide.announcementText || DEFAULT_ANNOUNCEMENT_TEXT}</span>
              {slide.showAnnouncementLearnMore !== false ? (
                <a
                  href={slide.announcementLearnMoreHref || "#"}
                  className="font-semibold text-[#496db3] no-underline hover:text-[#3f5f9d]"
                >
                  {slide.announcementLearnMoreText || DEFAULT_LEARN_MORE_TEXT}
                </a>
              ) : null}
            </div>
          </div>
        ) : null}
        {slide.showTitle !== false ? (
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-[#496db3] sm:text-5xl">
            {preserveBannerTitleLineBreaks
              ? bannerTitleToNodes(singleLineImageTitle)
              : singleLineImageTitle}
          </h1>
        ) : null}
        {slide.showSubtitle ? (
          <p className="mt-6 text-pretty text-sm font-medium text-slate-600 sm:text-base">
            {slide.subtitle || "Подзаголовок"}
          </p>
        ) : null}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          {slide.showButton ? (
            <a
              href={slide.buttonHref || "#"}
              onClick={(e) => {
                if ((slide.buttonHref || "").trim() !== callbackFormLink) return;
                e.preventDefault();
                onPrimaryClick?.();
              }}
              className="rounded-md bg-[#496db3] px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#3f5f9d] sm:text-sm"
            >
              {slide.buttonText || "Get started"}
            </a>
          ) : null}
          {slide.showBottomLearnMore !== false ? (
            <a
              href={slide.buttonHref || "#"}
              className="text-xs font-semibold text-[#496db3] no-underline hover:text-[#3f5f9d] sm:text-sm"
            >
              {slide.learnMoreText || DEFAULT_LEARN_MORE_TEXT}
            </a>
          ) : null}
        </div>
      </div>
    );

    return (
      <div className="flex h-full min-h-0 w-full min-w-0 max-w-full flex-1 flex-col overflow-hidden md:grid md:grid-cols-2 md:grid-rows-1 md:gap-0">
        {/* Мобильная: как в Tailwind Plus — текст по высоте контента, картинка на всю ширину и заполняет остаток кадра (не жёсткие 50/50). md+: две колонки 1fr|1fr. */}
        <div className="relative z-20 flex min-h-0 shrink-0 flex-col justify-center overflow-y-auto overflow-x-hidden bg-slate-50 px-5 py-5 md:z-auto md:h-full md:min-h-0 md:w-full md:shrink md:overflow-visible md:self-stretch md:px-6 md:py-10">
          {textBlock}
        </div>
        <div className="relative min-h-0 w-full min-w-0 max-w-full flex-1 overflow-hidden bg-slate-200 shadow-[inset_0_1px_0_0_rgb(203_213_225)] md:h-full md:min-h-0 md:w-full md:flex-none md:shadow-none md:border-l md:border-slate-200/90">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={bannerTitleForAlt(slide.title)}
              className="absolute inset-0 box-border min-h-0 min-w-0 h-full w-full max-w-full object-contain md:object-cover"
              style={{ objectPosition: `50% ${slide.imagePosY ?? 50}%` }}
              loading="eager"
              decoding="async"
              onLoad={() => {
                if (!bannerDebugEnabled()) return;
                logBannerDebug("preview:img-load", {
                  slideId: slide.id,
                  image: describeBannerImageRef(imageSrc),
                });
              }}
              onError={() => {
                if (!bannerDebugEnabled()) return;
                logBannerDebug("preview:img-error", {
                  slideId: slide.id,
                  image: describeBannerImageRef(imageSrc),
                });
              }}
            />
          ) : (
            <div className="h-full w-full bg-slate-300" />
          )}
          {!imageSrc ? (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
              <div className="rounded-md border border-slate-500/40 bg-slate-900/35 px-3 py-1.5 text-xs font-medium text-white/90">
                Выберите изображение для фона
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative isolate flex h-full min-h-0 w-full flex-1 overflow-hidden bg-slate-100 ${
        useSplitBanner ? "items-stretch" : "items-center justify-center px-6 py-10"
      }`}
    >
      <div className="absolute inset-x-0 -top-24 -z-10 transform-gpu blur-3xl" aria-hidden="true">
        <div
          className="hero-police-blob relative left-1/2 aspect-[1155/678] w-[36rem] -translate-x-1/2 rotate-[20deg] bg-gradient-to-tr from-[#496db3] via-[#5f7ebe] to-[#8aa9db] sm:w-[72rem]"
          style={{
            clipPath:
              "polygon(74.1% 44.1%,100% 61.6%,97.5% 26.9%,85.5% 0.1%,80.7% 2%,72.5% 32.5%,60.2% 62.4%,52.4% 68.1%,47.5% 58.3%,45.2% 34.5%,27.5% 76.7%,0.1% 64.9%,17.9% 100%,27.6% 76.8%,76.1% 97.7%,74.1% 44.1%)",
          }}
        />
      </div>
      <div className="absolute inset-x-0 -top-24 -z-10 transform-gpu blur-3xl" aria-hidden="true">
        <div
          className="hero-police-blob hero-police-blob--alt relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36rem] -translate-x-1/2 bg-gradient-to-tr from-[#b91c1c] via-[#dc2626] to-[#f87171] sm:left-[calc(50%+24rem)] sm:w-[72rem]"
          style={{
            clipPath:
              "polygon(74.1% 44.1%,100% 61.6%,97.5% 26.9%,85.5% 0.1%,80.7% 2%,72.5% 32.5%,60.2% 62.4%,52.4% 68.1%,47.5% 58.3%,45.2% 34.5%,27.5% 76.7%,0.1% 64.9%,17.9% 100%,27.6% 76.8%,76.1% 97.7%,74.1% 44.1%)",
          }}
        />
      </div>
      {useSplitBanner ? (
        <div className="relative z-20 flex h-full min-h-0 w-full flex-col md:flex-row">
          <div className="flex min-h-0 w-full shrink-0 items-center px-6 py-8 md:h-full md:w-1/2 md:min-w-0 md:py-10">
            <div className="w-full min-w-0 text-left">
              {slide.showAnnouncement !== false ? (
                <div className="hidden sm:mb-6 sm:flex sm:justify-start">
                  <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs text-slate-600 ring-1 ring-slate-900/10 sm:text-sm">
                    <span>{slide.announcementText || DEFAULT_ANNOUNCEMENT_TEXT}</span>
                    {slide.showAnnouncementLearnMore !== false ? (
                      <a
                        href={slide.announcementLearnMoreHref || "#"}
                        className="font-semibold text-[#496db3] no-underline hover:text-[#3f5f9d]"
                      >
                        {slide.announcementLearnMoreText || DEFAULT_LEARN_MORE_TEXT}
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}
              {slide.showTitle !== false ? (
                <h1 className="text-balance text-3xl font-semibold tracking-tight text-[#496db3] sm:text-5xl">
                  {preserveBannerTitleLineBreaks ? bannerTitleToNodes(slide.title) : slide.title}
                </h1>
              ) : null}
              {slide.showSubtitle ? (
                <p className="mt-6 text-pretty text-sm font-medium text-slate-600 sm:text-base">
                  {slide.subtitle || "Подзаголовок"}
                </p>
              ) : null}
              <div className="mt-8 flex items-center justify-start gap-x-6">
                {slide.showButton ? (
                  <a
                    href={slide.buttonHref || "#"}
                    onClick={(e) => {
                      if ((slide.buttonHref || "").trim() !== callbackFormLink) return;
                      e.preventDefault();
                      onPrimaryClick?.();
                    }}
                    className="rounded-md bg-[#496db3] px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#3f5f9d] sm:text-sm"
                  >
                    {slide.buttonText || "Get started"}
                  </a>
                ) : null}
                {slide.showBottomLearnMore !== false ? (
                  <a
                    href={slide.buttonHref || "#"}
                    className="text-xs font-semibold text-[#496db3] no-underline hover:text-[#3f5f9d] sm:text-sm"
                  >
                    {slide.learnMoreText || DEFAULT_LEARN_MORE_TEXT}
                  </a>
                ) : null}
              </div>
            </div>
          </div>
          <div className="relative min-h-[12rem] w-full flex-1 overflow-hidden border-t border-slate-300/70 bg-slate-200/60 md:h-full md:min-h-0 md:w-1/2 md:flex-none md:border-l md:border-t-0">
            {imageSrc ? (
              <img
                src={imageSrc}
                alt={bannerTitleForAlt(slide.title)}
                className="absolute inset-0 box-border min-h-0 min-w-0 h-full w-full max-w-full object-cover"
                style={{ objectPosition: `50% ${slide.imagePosY ?? 50}%` }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-300">
                <span className="rounded-md border border-slate-500/40 bg-slate-900/35 px-3 py-1.5 text-xs font-medium text-white/90">
                  Выберите изображение для правого блока
                </span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="mx-auto w-full min-w-0 max-w-3xl text-center">
          {slide.showAnnouncement !== false ? (
            <div className="hidden sm:mb-6 sm:flex sm:justify-center">
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs text-slate-600 ring-1 ring-slate-900/10 sm:text-sm">
                <span>{slide.announcementText || DEFAULT_ANNOUNCEMENT_TEXT}</span>
                {slide.showAnnouncementLearnMore !== false ? (
                  <a
                    href={slide.announcementLearnMoreHref || "#"}
                    className="font-semibold text-[#496db3] no-underline hover:text-[#3f5f9d]"
                  >
                    {slide.announcementLearnMoreText || DEFAULT_LEARN_MORE_TEXT}
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}
          {slide.showTitle !== false ? (
            <h1 className="text-balance text-3xl font-semibold tracking-tight text-[#496db3] sm:text-5xl">
              {preserveBannerTitleLineBreaks ? bannerTitleToNodes(slide.title) : slide.title}
            </h1>
          ) : null}
          {slide.showSubtitle ? (
            <p className="mt-6 text-pretty text-sm font-medium text-slate-600 sm:text-base">
              {slide.subtitle || "Подзаголовок"}
            </p>
          ) : null}
          <div className="mt-8 flex items-center justify-center gap-x-6">
            {slide.showButton ? (
              <a
                href={slide.buttonHref || "#"}
                onClick={(e) => {
                  if ((slide.buttonHref || "").trim() !== callbackFormLink) return;
                  e.preventDefault();
                  onPrimaryClick?.();
                }}
                className="rounded-md bg-[#496db3] px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#3f5f9d] sm:text-sm"
              >
                {slide.buttonText || "Get started"}
              </a>
            ) : null}
            {slide.showBottomLearnMore !== false ? (
              <a
                href={slide.buttonHref || "#"}
                className="text-xs font-semibold text-[#496db3] no-underline hover:text-[#3f5f9d] sm:text-sm"
              >
                {slide.learnMoreText || DEFAULT_LEARN_MORE_TEXT}
              </a>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

