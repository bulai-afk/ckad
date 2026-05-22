"use client";

import { Fragment, useEffect, useRef } from "react";
import { BannerCoverBlobLayers } from "@/components/BannerCoverBlobLayers";
import type { BannerCoverEditorSlideModel } from "@/components/admin/BannerCoverEditorSlide";
import { getBannerCoverPublicChromeCss } from "@/lib/bannerCoverPublicChromeCss";
import type { CoverAspectPresetId } from "@/lib/bannerCoverPresets";
import {
  resolveButtonHAlign,
  resolveCoverLayoutHAlign,
  resolveSubtitleHAlign,
  resolveTitleHAlign,
} from "@/lib/bannerElementPosition";
import {
  BANNER_COVER_DEFAULT_CONTENT,
  normalizeBannerCoverAnnouncementLearnMore,
  normalizeBannerCoverAnnouncementText,
  normalizeBannerCoverButtonSecondary,
} from "@/lib/bannerCoverDefaults";
import { getPageShowRenderCss } from "@/lib/pageShowRender";
import { getSharedWebBlocksCss } from "@/lib/sharedWebBlocksCss";
import { isCallbackFormLink, parseSiteDocumentLinkIndex } from "@/lib/siteDocumentLink";

const HOME_BANNER_SCOPE = "[data-home-banner-cover]";

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

type BannerCoverReadonlySlideProps = {
  slide: BannerCoverEditorSlideModel;
  coverAspect: CoverAspectPresetId;
  preserveTitleLineBreaks?: boolean;
  onPrimaryClick?: () => void;
  onDocumentClick?: (index: number) => void;
};

function handleCtaClick(
  e: React.MouseEvent<HTMLAnchorElement>,
  href: string,
  onPrimaryClick?: () => void,
  onDocumentClick?: (index: number) => void,
) {
  const trimmed = href.trim();
  const docIndex = parseSiteDocumentLinkIndex(trimmed);
  if (docIndex !== null) {
    e.preventDefault();
    onDocumentClick?.(docIndex);
    return;
  }
  if (isCallbackFormLink(trimmed)) {
    e.preventDefault();
    onPrimaryClick?.();
  }
}

export function BannerCoverReadonlySlide({
  slide,
  coverAspect,
  preserveTitleLineBreaks = true,
  onPrimaryClick,
  onDocumentClick,
}: BannerCoverReadonlySlideProps) {
  const coverRef = useRef<HTMLDivElement | null>(null);

  const titleH = resolveTitleHAlign(slide);
  const subtitleH = resolveSubtitleHAlign(slide);
  const buttonH = resolveButtonHAlign(slide);
  const coverLayoutH = resolveCoverLayoutHAlign(slide);
  const showButton2 = slide.showButton && slide.showBottomLearnMore;

  useEffect(() => {
    const cover = coverRef.current;
    if (!cover) return;
    const image = typeof slide.image === "string" ? slide.image.trim() : "";
    if (image) {
      const safe = image.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      cover.classList.add("page-web-cover-has-bg");
      cover.style.setProperty("--cover-bg-image", `url("${safe}")`);
      cover.style.setProperty("--cover-bg-pos", `50% ${slide.imagePosY}%`);
    } else {
      cover.classList.remove("page-web-cover-has-bg");
      cover.style.removeProperty("--cover-bg-image");
      cover.style.removeProperty("--cover-bg-pos");
    }
    cover.setAttribute("data-cover-show-overlay", slide.showOverlay ? "1" : "0");
    cover.setAttribute("data-cover-aspect", coverAspect);
  }, [slide.image, slide.imagePosY, slide.showOverlay, coverAspect]);

  const primaryHref = (slide.buttonHref || "#").trim() || "#";
  const announcementHref = (slide.announcementLearnMoreHref || "#").trim() || "#";

  return (
    <div
      data-home-banner-cover
      className="home-banner-cover-root @container h-auto min-h-0 w-full min-[1206px]:h-full"
    >
      <style>{`
        ${getSharedWebBlocksCss(HOME_BANNER_SCOPE)}
        ${getPageShowRenderCss(HOME_BANNER_SCOPE)}
        ${getBannerCoverPublicChromeCss(HOME_BANNER_SCOPE)}
        ${HOME_BANNER_SCOPE} .page-content { width: 100%; height: 100%; }
        ${HOME_BANNER_SCOPE} .page-web-cover { width: 100% !important; margin: 0 !important; }
      `}</style>
      <div className="page-content h-auto min-h-0 min-[1206px]:h-full">
        <div
          ref={coverRef}
          className="page-web-cover h-auto min-h-0 min-[1206px]:h-full"
          data-web-element="cover"
          data-cover-type={slide.bannerType}
          data-cover-aspect={coverAspect}
          data-cover-halign={coverLayoutH}
          data-cover-valign={slide.verticalAlign}
          data-cover-show-overlay={slide.showOverlay ? "1" : "0"}
        >
          {slide.bannerType === "hero" || slide.bannerType === "split" ? (
            <BannerCoverBlobLayers />
          ) : null}
          <div
            className="page-web-cover-inner"
            data-cover-show-button2={showButton2 ? "1" : "0"}
          >
            {slide.showAnnouncement ? (
              <div className="page-web-elements page-web-elements-announcement">
                <div
                  className="page-web-elements-announcement-row"
                  style={{ textAlign: slide.align ?? "center" }}
                >
                  <div className="page-web-elements-announcement-input-shell">
                    <div className="page-web-elements-announcement-strip">
                      <span className="page-web-elements-announcement-input">
                        {normalizeBannerCoverAnnouncementText(slide.announcementText)}
                      </span>
                      {slide.showAnnouncementLearnMore ? (
                        <a
                          href={announcementHref}
                          className="page-web-elements-announcement-learn-more"
                          onClick={(e) =>
                            handleCtaClick(e, announcementHref, onPrimaryClick, onDocumentClick)
                          }
                        >
                          {normalizeBannerCoverAnnouncementLearnMore(
                            slide.announcementLearnMoreText,
                          )}
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {slide.showTitle ? (
              <div
                className="page-web-elements page-web-elements-title"
                data-cover-title-halign={titleH}
              >
                <div className="page-web-elements-field-row">
                  <div className="page-web-elements-title-input">
                    {preserveTitleLineBreaks
                      ? bannerTitleToNodes(slide.title)
                      : slide.title.replace(/\s*\n+\s*/g, " ").trim() || slide.title}
                  </div>
                </div>
              </div>
            ) : null}

            {slide.showSubtitle ? (
              <div
                className="page-web-elements page-web-elements-description"
                data-cover-description-halign={subtitleH}
              >
                <div className="page-web-elements-field-row">
                  <div className="page-web-elements-description-input">
                    {slide.subtitle.trim() || BANNER_COVER_DEFAULT_CONTENT.description}
                  </div>
                </div>
              </div>
            ) : null}

            {slide.showButton ? (
              <div
                className="page-web-elements-actions"
                data-cover-actions-halign={buttonH}
              >
                <div className="page-web-elements-actions-cluster">
                  <div className="page-web-elements page-web-elements-button">
                    <p className="page-web-elements-cta-wrap">
                      <a
                        href={primaryHref}
                        className="page-web-elements-cta-button"
                        onClick={(e) =>
                          handleCtaClick(e, primaryHref, onPrimaryClick, onDocumentClick)
                        }
                      >
                        {slide.buttonText.trim() || BANNER_COVER_DEFAULT_CONTENT.button}
                      </a>
                    </p>
                  </div>
                  {showButton2 ? (
                    <div className="page-web-elements page-web-elements-button2">
                      <p className="page-web-elements-cta-wrap">
                        <a
                          href={primaryHref}
                          className="page-web-elements-cta-button-secondary"
                          onClick={(e) =>
                            handleCtaClick(e, primaryHref, onPrimaryClick, onDocumentClick)
                          }
                        >
                          {normalizeBannerCoverButtonSecondary(slide.learnMoreText)}
                        </a>
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
