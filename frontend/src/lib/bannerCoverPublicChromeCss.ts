/** Типографика и переменные cover на публичной главной (без меню редактора и фокуса). */
export function getBannerCoverPublicChromeCss(scope: string): string {
  const s = scope.trim();
  return `
${s} {
  --site-blue-title-fs: 2.25rem;
  --site-blue-title-lh: 2.25rem;
  --site-red-blue-gap: -0.375rem;
}
@media (min-width: 640px) {
  ${s} {
    --site-blue-title-fs: 3.5rem;
    --site-blue-title-lh: 1;
    --site-red-blue-gap: -0.5rem;
  }
}
${s} .page-web-cover { position: relative; height: 100%; width: 100%; margin: 0 !important; max-width: 100% !important; aspect-ratio: unset !important; border-radius: inherit; overflow: visible; }
${s} .page-web-cover .page-web-cover-inner > .page-web-elements.page-web-elements-title,
${s} .page-web-cover .page-web-cover-inner > .page-web-elements.page-web-elements-title .page-web-elements-title-input,
${s} .page-web-cover .page-web-cover-el-title { font-size: var(--site-blue-title-fs) !important; line-height: var(--site-blue-title-lh) !important; }
${s} .page-web-cover .page-web-cover-inner > .page-web-elements.page-web-elements-title .page-web-elements-title-input {
  line-height: 1 !important;
  padding: 0.15rem 0.45rem !important;
  text-wrap: wrap !important;
  font-weight: 600;
  color: #496db3;
  letter-spacing: -0.02em;
  white-space: pre-wrap;
  word-break: break-word;
}
${s} .page-web-cover-inner > .page-web-elements.page-web-elements-description[data-cover-description-halign="left"] > .page-web-elements-field-row { justify-content: flex-start; text-align: left; }
${s} .page-web-cover-inner > .page-web-elements.page-web-elements-description[data-cover-description-halign="center"] > .page-web-elements-field-row { justify-content: center; text-align: center; }
${s} .page-web-cover-inner > .page-web-elements.page-web-elements-description[data-cover-description-halign="right"] > .page-web-elements-field-row { justify-content: flex-end; text-align: right; }
${s} .page-web-cover-inner > .page-web-elements-actions[data-cover-actions-halign="left"] { align-items: flex-start !important; text-align: left !important; }
${s} .page-web-cover-inner > .page-web-elements-actions[data-cover-actions-halign="center"] { align-items: center !important; text-align: center !important; }
${s} .page-web-cover-inner > .page-web-elements-actions[data-cover-actions-halign="right"] { align-items: flex-end !important; text-align: right !important; }
${s} .page-web-cover .page-web-cover-inner > .page-web-elements.page-web-elements-description,
${s} .page-web-cover .page-web-cover-inner > .page-web-elements.page-web-elements-description .page-web-elements-description-input,
${s} .page-web-cover .page-web-cover-el-subtitle { font-size: 1rem !important; line-height: 1.5 !important; color: #475569 !important; }
${s} .page-web-cover .page-web-elements-cta-button { font-size: 0.875rem !important; }
${s} .page-web-cover .page-web-elements-cta-button-secondary { font-size: 0.875rem !important; }
${s} .page-web-cover[data-cover-show-overlay="0"][data-cover-type="image"]::after {
  display: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
`;
}
