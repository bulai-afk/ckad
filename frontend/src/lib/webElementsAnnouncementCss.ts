import { BANNER_COVER_MOBILE_MAX_WIDTH_PX } from "@/lib/bannerCoverPresets";

/** На узком экране кнопка «Подробнее» в плашке анонса не показывается. */
export function getWebElementsAnnouncementStripMobileCss(
  scope: string,
  important = false,
): string {
  const s = scope.trim();
  const i = important ? " !important" : "";
  const mq = `@media (max-width: ${BANNER_COVER_MOBILE_MAX_WIDTH_PX}px)`;
  return `
${mq} {
  /* Только плашка анонса в баннере/обложке — не «Подробнее» в карточках feature-grid */
  ${s} .page-web-elements-announcement-strip .page-web-elements-announcement-learn-more {
    display: none${i};
  }
}
`;
}
