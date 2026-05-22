import { getPageEditorWebToolbarCss } from "./pageEditorWebToolbarCss";

/** Стили бокового меню баннера, фокуса полей и типографики — как на полотне `page_editor`. */
export function getBannerCoverEditorChromeCss(scope: string): string {
  const s = scope.trim();
  return `
${getPageEditorWebToolbarCss().replace(/\.page-editor/g, s)}
${s} {
  --page-editor-web-toolbar-x: 0.75rem;
  --site-blue-title-fs: 2.25rem;
  --site-blue-title-lh: 2.25rem;
  --site-red-blue-gap: -0.375rem;
  --page-editor-focus-pad-inline: 0.2em;
  --page-editor-focus-pad-block: 0.2em;
  --page-editor-focus-margin-inline: -0.2em;
  --page-editor-focus-margin-block: -0.2em;
  --page-editor-focus-radius: 9px;
  --page-editor-focus-shadow:
    0 0 0 6px rgba(73, 109, 179, 0.12),
    0 0 16px rgba(73, 109, 179, 0.3),
    0 0 26px rgba(73, 109, 179, 0.22);
}
@media (min-width: 640px) {
  ${s} {
    --site-blue-title-fs: 3.5rem;
    --site-blue-title-lh: 1;
    --site-red-blue-gap: -0.5rem;
  }
}
${s} .page-web-cover { position: relative; height: 100% !important; width: 100%; margin: 0 !important; max-width: 100% !important; max-height: 100% !important; aspect-ratio: unset !important; border-radius: inherit; overflow: hidden; flex: 1 1 auto; min-height: 0; }
${s} .page-web-cover-toolbar { display: flex; flex-direction: column; align-items: center; gap: 4px; position: absolute !important; left: var(--page-editor-web-toolbar-x) !important; right: auto !important; top: 50% !important; transform: translateY(-50%) !important; margin: 0; padding: 0; z-index: 10040; width: max-content; pointer-events: auto; user-select: none; -webkit-user-select: none; }
${s} .page-web-cover-toolbar[data-menu-open="1"] { z-index: 10150 !important; }
${s} .page-web-cover-menu-trigger { display: flex; width: 28px; height: 28px; align-items: center; justify-content: center; border-radius: 6px; border: 1px solid #cbd5e1; background: rgba(255,255,255,0.95); color: #64748b; cursor: pointer; user-select: none; -webkit-user-select: none; padding: 0; }
${s} .page-web-cover-menu-trigger:hover { border-color: #94a3b8; color: #0f172a; background: #fff; }
${s} .page-web-cover-menu-dots { display: inline-block; font-size: 1rem; line-height: 1; transform: translateY(-1px); }
${s} .page-web-cover-menu-dots::before { content: "\\22EE"; }
${s} .page-web-cover-menu-dropdown { display: none; position: absolute; left: calc(100% + 4px); top: 32px; width: max-content; min-width: 12.5rem; max-width: min(14rem, calc(100vw - 2rem)); padding: 4px 0; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 10px 24px rgba(15,23,42,0.12); z-index: 10050; }
${s} .page-web-cover-toolbar[data-menu-open="1"] .page-web-cover-menu-dropdown { display: block; }
${s} .page-web-cover-menu-sub { position: relative; }
${s} .page-web-cover-menu-sub-trigger { display: flex; width: 100%; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 12px; font-size: 13px; font-weight: 500; color: #0f172a; background: transparent; border: none; cursor: pointer; border-radius: 4px; text-align: left; }
${s} .page-web-cover-menu-sub-trigger:hover { background: #f1f5f9; }
${s} .page-web-cover-menu-sub-label { flex: 1; min-width: 0; }
${s} .page-web-cover-menu-chevron { flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; width: 1.25rem; color: #64748b; font-size: 1rem; line-height: 1; transition: transform 0.15s ease; }
${s} .page-web-cover-menu-chevron::before { content: "\\203A"; }
${s} .page-web-cover-toolbar[data-menu-open="1"] .page-web-cover-menu-sub[data-submenu-open="1"] > .page-web-cover-menu-sub-trigger .page-web-cover-menu-chevron { transform: rotate(90deg); }
${s} .page-web-cover-menu-sub-panel { display: none; position: absolute; left: calc(100% + 4px); top: 0; padding: 10px; min-width: 0; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 10px 24px rgba(15,23,42,0.12); z-index: 10060; }
${s} .page-web-cover-toolbar[data-menu-open="1"] .page-web-cover-menu-sub[data-submenu-open="1"] > .page-web-cover-menu-sub-panel { display: block; }
${s} .page-web-cover-menu-sub[data-submenu-drop="up"] > .page-web-cover-menu-sub-panel { top: auto; bottom: 0; }
${s} .page-web-cover-type-panel { display: none; flex-direction: column; gap: 2px; padding: 6px; min-width: 14.5rem; box-sizing: border-box; }
${s} .page-web-cover-toolbar[data-menu-open="1"] .page-web-cover-menu-sub[data-submenu-open="1"] > .page-web-cover-menu-sub-panel .page-web-cover-type-panel { display: flex; }
${s} .page-web-cover-menu-type { display: flex; width: 100%; box-sizing: border-box; align-items: center; gap: 8px; text-align: left; padding: 8px 10px; font-size: 13px; font-weight: 500; color: #0f172a; background: transparent; border: none; cursor: pointer; border-radius: 6px; white-space: nowrap; }
${s} .page-web-cover-menu-type:hover { background: #f1f5f9; }
${s} .page-web-cover-menu-type-radio { width: 14px; height: 14px; border-radius: 9999px; border: 1.5px solid #94a3b8; box-sizing: border-box; background: #fff; flex-shrink: 0; }
${s} .page-web-cover-menu-type[aria-checked="true"] .page-web-cover-menu-type-radio { border-color: #496db3; box-shadow: inset 0 0 0 3px #496db3; }
${s} .page-web-cover-menu-type-label { flex: 1; min-width: 0; }
${s} .page-web-cover-elements-panel { display: none; flex-direction: column; gap: 2px; padding: 6px; min-width: 11rem; box-sizing: border-box; }
${s} .page-web-cover-toolbar[data-menu-open="1"] .page-web-cover-menu-sub[data-submenu-open="1"] > .page-web-cover-menu-sub-panel .page-web-cover-elements-panel { display: flex; }
${s} .page-web-cover-menu-insert-cover-el { display: flex; width: 100%; box-sizing: border-box; align-items: center; gap: 8px; text-align: left; padding: 8px 10px; font-size: 13px; font-weight: 500; color: #0f172a; background: transparent; border: none; cursor: pointer; border-radius: 6px; white-space: nowrap; }
${s} .page-web-cover-menu-insert-cover-el:hover { background: #f1f5f9; }
${s} .page-web-cover-menu-insert-cover-el:disabled { opacity: 0.4; cursor: not-allowed; }
${s} .page-web-cover-menu-insert-cover-el.page-web-text-block-v2-field-toggle[aria-checked="true"] .page-web-text-block-v2-field-toggle-box { border-color: #496db3; background-color: #496db3; box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12); }
${s} .page-web-cover-menu-insert-cover-el.page-web-text-block-v2-field-toggle[aria-checked="true"] .page-web-text-block-v2-field-toggle-box::after { content: ""; display: block; width: 4px; height: 8px; border: solid #fff; border-width: 0 2px 2px 0; transform: rotate(45deg) translate(-0.5px, -1px); }
${s} .page-web-cover-aspect-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; width: 156px; box-sizing: border-box; }
${s} .page-web-cover-menu-aspect { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; width: 100%; box-sizing: border-box; margin: 0; padding: 6px 2px; text-align: center; font-size: 10px; font-weight: 600; line-height: 1.1; color: #0f172a; background: transparent; border: none; cursor: pointer; border-radius: 6px; }
${s} .page-web-cover-menu-aspect:hover { background: #f1f5f9; }
${s} .page-web-cover[data-cover-aspect="1-8"] .page-web-cover-menu-aspect[data-set-cover-aspect="1-8"],
${s} .page-web-cover[data-cover-aspect="1-4"] .page-web-cover-menu-aspect[data-set-cover-aspect="1-4"],
${s} .page-web-cover[data-cover-aspect="6-1"] .page-web-cover-menu-aspect[data-set-cover-aspect="6-1"] { background: #f1f5f9; box-shadow: inset 0 0 0 1px #496db3; }
${s} .page-web-cover[data-cover-type="hero"] .page-web-cover-menu-type[data-set-cover-type="hero"],
${s} .page-web-cover[data-cover-type="image"] .page-web-cover-menu-type[data-set-cover-type="image"],
${s} .page-web-cover[data-cover-type="split"] .page-web-cover-menu-type[data-set-cover-type="split"] { background: #f1f5f9; }
${s} .page-web-cover-menu-sep { height: 1px; margin: 6px 8px; background: #e2e8f0; pointer-events: none; }
${s} .page-web-cover-menu-upload,
${s} .page-web-cover-menu-overlay { display: block; width: 100%; box-sizing: border-box; text-align: left; padding: 8px 12px; font-size: 13px; font-weight: 500; color: #0f172a; background: transparent; border: none; cursor: pointer; border-radius: 4px; white-space: nowrap; }
${s} .page-web-cover-menu-upload:hover,
${s} .page-web-cover-menu-overlay:hover { background: #f1f5f9; }
${s} .page-web-cover-inner { outline: none !important; }
${s} .page-web-cover-inner[data-cover-unlocked="1"] { cursor: text; }
${s} .page-web-cover .page-web-cover-inner > .page-web-elements.page-web-elements-title,
${s} .page-web-cover .page-web-cover-inner > .page-web-elements.page-web-elements-title textarea.page-web-elements-title-input,
${s} .page-web-cover .page-web-cover-el-title { font-size: var(--site-blue-title-fs) !important; line-height: var(--site-blue-title-lh) !important; }
${s} .page-web-cover .page-web-cover-inner > .page-web-elements.page-web-elements-title textarea.page-web-elements-title-input {
  line-height: 1 !important;
  padding: 0.15rem 0.45rem !important;
  text-wrap: wrap !important;
  font-weight: 600;
  color: #496db3;
  letter-spacing: -0.02em;
}
${s} .page-web-cover-inner > .page-web-elements.page-web-elements-description[data-cover-description-halign="left"] > .page-web-elements-field-row { justify-content: flex-start; text-align: left; }
${s} .page-web-cover-inner > .page-web-elements.page-web-elements-description[data-cover-description-halign="center"] > .page-web-elements-field-row { justify-content: center; text-align: center; }
${s} .page-web-cover-inner > .page-web-elements.page-web-elements-description[data-cover-description-halign="right"] > .page-web-elements-field-row { justify-content: flex-end; text-align: right; }
${s} .page-web-cover-inner > .page-web-elements-actions[data-cover-actions-halign="left"] { align-items: flex-start !important; text-align: left !important; }
${s} .page-web-cover-inner > .page-web-elements-actions[data-cover-actions-halign="center"] { align-items: center !important; text-align: center !important; }
${s} .page-web-cover-inner > .page-web-elements-actions[data-cover-actions-halign="right"] { align-items: flex-end !important; text-align: right !important; }
${s} .page-web-cover .page-web-cover-inner > .page-web-elements.page-web-elements-description,
${s} .page-web-cover .page-web-cover-inner > .page-web-elements.page-web-elements-description textarea.page-web-elements-description-input,
${s} .page-web-cover .page-web-cover-el-subtitle { font-size: 1rem !important; line-height: 1.5 !important; color: #475569 !important; }
${s} .page-web-cover .page-web-elements-cta-button { font-size: 0.875rem !important; }
${s} .page-web-cover .page-web-elements-cta-button-secondary { font-size: 0.875rem !important; }
${s} .page-web-elements-title-input[data-editor-focus-target="1"],
${s} .page-web-elements-description-input[data-editor-focus-target="1"],
${s} .page-web-elements-announcement-input[data-editor-focus-target="1"] {
  padding: 0.15rem 0.45rem;
  margin: 0;
  border-radius: 8px;
  box-sizing: border-box;
  box-shadow: var(--page-editor-focus-shadow);
  transition: box-shadow 0.12s ease;
}
${s} .page-web-elements-actions-cluster[data-editor-focus-target="1"] {
  outline: none !important;
  padding: 0.2rem 0.35rem;
  margin: 0;
  box-shadow: var(--page-editor-focus-shadow);
  border-radius: 8px;
  transition: box-shadow 0.12s ease;
  box-sizing: border-box;
}
${s} a.page-web-elements-cta-button[data-editor-focus-target="1"],
${s} a.page-web-elements-cta-button-secondary[data-editor-focus-target="1"] {
  outline: none !important;
  border-radius: 0.625rem;
  box-shadow: var(--page-editor-focus-shadow);
}
${s} .page-web-cover[data-cover-show-overlay="0"][data-cover-type="image"]::after {
  display: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
`;
}

/** Панель форматирования над баннером (вне .banners-admin-cover-editor). */
export function getBannerCoverFormatBarCss(): string {
  const b = ".banner-cover-format-bar";
  return `
${b} {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem;
  padding: 0.35rem 0.5rem;
  border-radius: 8px;
  border: 1px solid rgba(203, 213, 225, 0.9);
  background: #fff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
  box-sizing: border-box;
  width: 100%;
}
${b} .banner-cover-format-label {
  margin-right: 0.15rem;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  white-space: nowrap;
}
${b} .banner-cover-format-sep {
  width: 1px;
  height: 1.25rem;
  margin: 0 0.15rem;
  background: rgba(203, 213, 225, 0.9);
}
${b} .banner-cover-format-aspect-select {
  height: 1.75rem;
  min-width: 4.5rem;
  max-width: 6rem;
  padding: 0 1.5rem 0 0.4rem;
  font-size: 12px;
  font-weight: 500;
  color: #0f172a;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%2364748b'%3E%3Cpath fill-rule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z' clip-rule='evenodd'/%3E%3C/svg%3E") right 0.25rem center / 1rem no-repeat;
  appearance: none;
  cursor: pointer;
}
${b} .banner-cover-format-aspect-select:hover { border-color: #94a3b8; }
${b} .banner-cover-format-aspect-select:focus {
  outline: 2px solid rgba(73, 109, 179, 0.35);
  outline-offset: 1px;
}
${b} .banner-cover-format-slide-btn {
  height: 1.75rem;
  padding: 0 0.65rem;
  font-size: 12px;
  font-weight: 500;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #0f172a;
  cursor: pointer;
  white-space: nowrap;
}
${b} .banner-cover-format-slide-btn:hover:not(:disabled) {
  border-color: #94a3b8;
  background: #f8fafc;
}
${b} .banner-cover-format-slide-btn--danger {
  color: #b91c1c;
  border-color: #fecaca;
}
${b} .banner-cover-format-slide-btn--danger:hover:not(:disabled) {
  background: #fef2f2;
  border-color: #fca5a5;
}
${b} .banner-cover-format-slide-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
`;
}

/** Стили выпадающего меню в portal (вне .banners-admin-cover-editor). */
export function getBannerCoverMenuPortalCss(): string {
  const r = ".banner-cover-menu-portal-root";
  return `
${r}.page-web-cover-menu-dropdown { display: block; width: max-content; min-width: 12.5rem; max-width: min(14rem, calc(100vw - 2rem)); padding: 4px 0; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 10px 24px rgba(15,23,42,0.12); box-sizing: border-box; }
${r} .page-web-cover-menu-sub { position: relative; }
${r} .page-web-cover-menu-sub-trigger { display: flex; width: 100%; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 12px; font-size: 13px; font-weight: 500; color: #0f172a; background: transparent; border: none; cursor: pointer; border-radius: 4px; text-align: left; }
${r} .page-web-cover-menu-sub-trigger:hover { background: #f1f5f9; }
${r} .page-web-cover-menu-sub-label { flex: 1; min-width: 0; }
${r} .page-web-cover-menu-chevron { flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; width: 1.25rem; color: #64748b; font-size: 1rem; line-height: 1; transition: transform 0.15s ease; }
${r} .page-web-cover-menu-chevron::before { content: "\\203A"; }
${r} .page-web-cover-menu-sub[data-submenu-open="1"] > .page-web-cover-menu-sub-trigger .page-web-cover-menu-chevron { transform: rotate(90deg); }
${r} .page-web-cover-menu-sub-panel { display: none; position: fixed; left: 0; top: 0; padding: 10px; min-width: 0; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 10px 24px rgba(15,23,42,0.12); box-sizing: border-box; z-index: 20060; pointer-events: auto; }
${r} .page-web-cover-menu-sub[data-submenu-open="1"] > .page-web-cover-menu-sub-panel { display: block; }
${r} .page-web-cover-type-panel { display: none; flex-direction: column; gap: 2px; padding: 6px; min-width: 14.5rem; box-sizing: border-box; }
${r} .page-web-cover-menu-sub[data-submenu-open="1"] > .page-web-cover-menu-sub-panel .page-web-cover-type-panel { display: flex; }
${r} .page-web-cover-menu-type { display: flex; width: 100%; box-sizing: border-box; align-items: center; gap: 8px; text-align: left; padding: 8px 10px; font-size: 13px; font-weight: 500; color: #0f172a; background: transparent; border: none; cursor: pointer; border-radius: 6px; white-space: nowrap; }
${r} .page-web-cover-menu-type:hover { background: #f1f5f9; }
${r} .page-web-cover-menu-type[aria-checked="true"] { background: #f1f5f9; }
${r} .page-web-cover-menu-type-radio { width: 14px; height: 14px; border-radius: 9999px; border: 1.5px solid #94a3b8; box-sizing: border-box; background: #fff; flex-shrink: 0; }
${r} .page-web-cover-menu-type[aria-checked="true"] .page-web-cover-menu-type-radio { border-color: #496db3; box-shadow: inset 0 0 0 3px #496db3; }
${r} .page-web-cover-elements-panel { display: none; flex-direction: column; gap: 2px; padding: 6px; min-width: 11rem; box-sizing: border-box; }
${r} .page-web-cover-menu-sub[data-submenu-open="1"] > .page-web-cover-menu-sub-panel .page-web-cover-elements-panel { display: flex; }
${r} .page-web-cover-menu-insert-cover-el { display: flex; width: 100%; box-sizing: border-box; align-items: center; gap: 8px; text-align: left; padding: 8px 10px; font-size: 13px; font-weight: 500; color: #0f172a; background: transparent; border: none; cursor: pointer; border-radius: 6px; white-space: nowrap; }
${r} .page-web-cover-menu-insert-cover-el:hover { background: #f1f5f9; }
${r} .page-web-cover-menu-insert-cover-el:disabled { opacity: 0.4; cursor: not-allowed; }
${r} .page-web-cover-menu-insert-cover-el.page-web-text-block-v2-field-toggle[aria-checked="true"] .page-web-text-block-v2-field-toggle-box { border-color: #496db3; background-color: #496db3; box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12); }
${r} .page-web-cover-menu-insert-cover-el.page-web-text-block-v2-field-toggle[aria-checked="true"] .page-web-text-block-v2-field-toggle-box::after { content: ""; display: block; width: 4px; height: 8px; border: solid #fff; border-width: 0 2px 2px 0; transform: rotate(45deg) translate(-0.5px, -1px); }
${r} .page-web-cover-aspect-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; width: 156px; box-sizing: border-box; }
${r} .page-web-cover-menu-aspect { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; width: 100%; padding: 6px 2px; font-size: 10px; font-weight: 600; color: #0f172a; background: transparent; border: none; cursor: pointer; border-radius: 6px; }
${r} .page-web-cover-menu-aspect:hover { background: #f1f5f9; }
${r} .page-web-cover-menu-aspect[data-active="1"] { background: #f1f5f9; box-shadow: inset 0 0 0 1px #496db3; }
${r} .page-web-cover-menu-sep { height: 1px; margin: 6px 8px; background: #e2e8f0; pointer-events: none; }
${r} .page-web-cover-menu-upload,
${r} .page-web-cover-menu-overlay { display: block; width: 100%; box-sizing: border-box; text-align: left; padding: 8px 12px; font-size: 13px; font-weight: 500; color: #0f172a; background: transparent; border: none; cursor: pointer; border-radius: 4px; white-space: nowrap; }
${r} .page-web-cover-menu-upload:hover,
${r} .page-web-cover-menu-overlay:hover { background: #f1f5f9; }
${r} .page-web-cover-menu-delete { display: block; width: 100%; box-sizing: border-box; text-align: left; padding: 8px 12px; font-size: 13px; font-weight: 500; color: #b91c1c; background: transparent; border: none; cursor: pointer; border-radius: 4px; white-space: nowrap; }
${r} .page-web-cover-menu-delete:hover:not(:disabled) { background: #fef2f2; }
${r} .page-web-cover-menu-delete:disabled { opacity: 0.4; cursor: not-allowed; }
`;
}
