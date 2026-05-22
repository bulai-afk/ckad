import type { BannerCoverEditorSlideModel } from "@/components/admin/BannerCoverEditorSlide";
import type { BannerSlide } from "@/components/HomeBannersCarousel";
import {
  parseBannerTextBand,
  type BannerHAlign,
} from "@/lib/bannerElementPosition";

function pickH(raw: unknown, fallback: BannerHAlign = "center"): BannerHAlign {
  return raw === "left" || raw === "right" || raw === "center" ? raw : fallback;
}

export function bannerSlideToCoverModel(slide: BannerSlide): BannerCoverEditorSlideModel {
  return {
    title: slide.title,
    announcementText:
      typeof slide.announcementText === "string" ? slide.announcementText : "",
    bannerType:
      slide.bannerType === "hero" || slide.bannerType === "image" || slide.bannerType === "split"
        ? slide.bannerType
        : "hero",
    showAnnouncement: slide.showAnnouncement !== false,
    showAnnouncementLearnMore: slide.showAnnouncementLearnMore !== false,
    showBottomLearnMore: slide.showBottomLearnMore !== false,
    subtitle: typeof slide.subtitle === "string" ? slide.subtitle : "",
    buttonText: typeof slide.buttonText === "string" ? slide.buttonText : "",
    buttonHref: typeof slide.buttonHref === "string" ? slide.buttonHref : "#",
    learnMoreText: typeof slide.learnMoreText === "string" ? slide.learnMoreText : "",
    announcementLearnMoreText:
      typeof slide.announcementLearnMoreText === "string"
        ? slide.announcementLearnMoreText
        : typeof slide.learnMoreText === "string"
          ? slide.learnMoreText
          : "",
    announcementLearnMoreHref:
      typeof slide.announcementLearnMoreHref === "string"
        ? slide.announcementLearnMoreHref
        : typeof slide.buttonHref === "string"
          ? slide.buttonHref
          : "#",
    showTitle: slide.showTitle !== false,
    showSubtitle: Boolean(slide.showSubtitle),
    showButton: slide.showButton !== false,
    image:
      typeof slide.image === "string"
        ? slide.image
        : slide.image === null
          ? null
          : null,
    imagePosY: typeof slide.imagePosY === "number" ? slide.imagePosY : 50,
    align: pickH(slide.align),
    verticalAlign:
      slide.verticalAlign === "top" || slide.verticalAlign === "bottom"
        ? slide.verticalAlign
        : "middle",
    titleAlign: pickH(slide.titleAlign),
    subtitleAlign: pickH(slide.subtitleAlign),
    buttonAlign: pickH(slide.buttonAlign),
    textBand: parseBannerTextBand(slide.textBand),
    showOverlay: slide.showOverlay !== false,
    lineHeight: slide.lineHeight,
  };
}
