/**
 * Редактор: одна вертикальная колонка тулбаров (стрелки + ⋯) у web-блоков.
 * left — от левого края padding-box блока (у всех web-блоков без горизонтального padding на оболочке).
 * Подключать последним в <style> редактора.
 */
export function getPageEditorWebToolbarCss(): string {
  return `
.page-editor {
  --page-editor-web-toolbar-x: 0.75rem;
}
.page-editor .page-web-cover > .page-web-cover-toolbar,
.page-editor .page-web-text-block > .page-web-text-block-toolbar,
.page-editor .page-web-text-block-v2 > .page-web-text-block-v2-toolbar,
.page-editor .page-web-article-text > .page-web-article-text-toolbar,
.page-editor .page-web-accordion > .page-web-accordion-toolbar,
.page-editor .page-web-text-media > .page-web-text-media-toolbar,
.page-editor .page-web-spacer > .page-web-spacer-toolbar,
.page-editor .page-web-timeline .page-web-timeline-toolbar {
  position: absolute !important;
  left: var(--page-editor-web-toolbar-x) !important;
  right: auto !important;
  top: 50% !important;
  transform: translateY(-50%) !important;
  align-items: flex-start !important;
  margin: 0 !important;
  padding: 0 !important;
  pointer-events: auto !important;
}
.page-editor .page-web-cover > .page-web-cover-toolbar {
  z-index: 10040 !important;
}
.page-editor .page-web-cover > .page-web-cover-toolbar[data-menu-open="1"] {
  z-index: 10150 !important;
}
.page-editor .page-web-cover-toolbar[data-menu-open="1"] .page-web-cover-menu-dropdown,
.page-editor .page-web-cover-toolbar[data-menu-open="1"] .page-web-cover-menu-sub-panel {
  z-index: 10100 !important;
}
.page-editor .page-web-text-block,
.page-editor .page-web-text-block-v2,
.page-editor .page-web-article-text,
.page-editor .page-web-accordion {
  overflow: visible;
}
.page-editor .page-web-text-block:has(> .page-web-text-block-toolbar[data-menu-open="1"]),
.page-editor .page-web-text-block-v2:has(> .page-web-text-block-v2-toolbar[data-menu-open="1"]),
.page-editor .page-web-article-text:has(> .page-web-article-text-toolbar[data-menu-open="1"]),
.page-editor .page-web-accordion:has(> .page-web-accordion-toolbar[data-menu-open="1"]) {
  z-index: 100 !important;
}
.page-editor .page-web-text-media > .page-web-text-media-toolbar,
.page-editor .page-web-spacer > .page-web-spacer-toolbar,
.page-editor .page-web-timeline .page-web-timeline-toolbar {
  z-index: 320 !important;
}
.page-editor .page-web-text-block > .page-web-text-block-toolbar,
.page-editor .page-web-text-block-v2 > .page-web-text-block-v2-toolbar,
.page-editor .page-web-article-text > .page-web-article-text-toolbar,
.page-editor .page-web-accordion > .page-web-accordion-toolbar {
  z-index: 10040 !important;
}
.page-editor .page-web-text-block > .page-web-text-block-toolbar[data-menu-open="1"],
.page-editor .page-web-text-block-v2 > .page-web-text-block-v2-toolbar[data-menu-open="1"],
.page-editor .page-web-article-text > .page-web-article-text-toolbar[data-menu-open="1"],
.page-editor .page-web-accordion > .page-web-accordion-toolbar[data-menu-open="1"] {
  z-index: 10150 !important;
}
.page-editor .page-web-text-block-toolbar[data-menu-open="1"] .page-web-text-block-menu-dropdown,
.page-editor .page-web-text-block-toolbar[data-menu-open="1"] .page-web-text-block-menu-sub-panel {
  z-index: 10100 !important;
}
.page-editor .page-web-timeline .page-web-timeline-toolbar .page-web-timeline-menu-dropdown {
  z-index: 330 !important;
}
.page-editor .page-web-timeline {
  overflow: visible;
}
.page-editor .page-web-timeline-head,
.page-editor .page-web-timeline-item {
  z-index: 1 !important;
}
.page-editor .page-web-timeline-dot {
  position: relative !important;
  z-index: 3 !important;
}
`;
}
