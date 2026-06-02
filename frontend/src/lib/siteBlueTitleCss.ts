/**
 * Единая типографика синих заголовков на публичных страницах
 * (как :root / .about-template-fallback__title: --site-blue-title-fs / --site-blue-title-lh).
 * Должна подключаться после правил с font-size: inherit на блоках.
 */
export function getSiteBlueTitleUnifiedCss(scope: string): string {
  const s = scope.trim();
  return `
${s} :is(
  .page-web-elements.page-web-elements-title .page-web-elements-title-input,
  .page-web-elements.page-web-elements-title textarea.page-web-elements-title-input,
  .page-web-timeline-heading,
  .page-web-timeline-head .page-web-elements.page-web-elements-title .page-web-elements-title-input,
  .page-web-timeline-head .page-web-elements.page-web-elements-title textarea.page-web-elements-title-input,
  .page-web-feature-grid-head > .page-web-elements.page-web-elements-title .page-web-elements-title-input,
  .page-web-cover-inner > .page-web-elements.page-web-elements-title .page-web-elements-title-input,
  .page-web-cover-inner > .page-web-elements.page-web-elements-title textarea.page-web-elements-title-input,
  .page-web-cover-el-title,
  .page-web-cover-el-title .page-web-elements-title-input,
  .page-web-cover-el-title textarea.page-web-elements-title-input,
  .page-web-work-pricing .page-web-elements.page-web-elements-title .page-web-elements-title-input,
  .page-web-work-pricing .page-web-elements.page-web-elements-title textarea.page-web-elements-title-input,
  .page-web-work-pricing .wsx,
  .page-web-work-pricing .wsy.wto,
  .page-web-work-pricing h3.wsx.wto,
  .page-web-text-block h3,
  .page-web-text-media .page-web-text-media-col h3
) {
  font-size: var(--site-blue-title-fs) !important;
  line-height: var(--site-blue-title-lh) !important;
  letter-spacing: -0.025em;
  font-weight: 600;
  color: #496db3 !important;
  padding-top: 0;
  padding-bottom: 0;
}
${s} .page-web-cover-inner > .page-web-elements.page-web-elements-title,
${s} .page-web-cover-el-title {
  font-size: var(--site-blue-title-fs);
  line-height: var(--site-blue-title-lh);
  letter-spacing: -0.025em;
  font-weight: 600;
  color: #496db3;
}
/* Article block is body-like title, not site-blue hero/title scale. */
${s} .page-web-article-text .page-web-elements.page-web-elements-title,
${s} .page-web-article-text .page-web-elements.page-web-elements-title .page-web-elements-title-input,
${s} .page-web-article-text .page-web-elements.page-web-elements-title textarea.page-web-elements-title-input {
  font-size: 1.16rem !important;
  line-height: 1.6 !important;
  font-weight: 700 !important;
  letter-spacing: normal !important;
}
`;
}
