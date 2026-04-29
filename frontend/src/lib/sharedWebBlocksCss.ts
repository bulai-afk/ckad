export const WEB_BLOCK_BASE_FONT_SIZE = "10.8px";

export function getSharedWebBlocksCss(scope: string): string {
  return `
${scope} {
  --wb-body-fs: ${WEB_BLOCK_BASE_FONT_SIZE};
  --wb-body-lh: 1.5;
  --wb-title-fs: var(--site-blue-title-fs, 2.25rem);
  --wb-title-lh: var(--site-blue-title-lh, 2.25rem);
}
@media (min-width: 640px) {
${scope} {
  --wb-title-fs: var(--site-blue-title-fs, 3.5rem);
  --wb-title-lh: var(--site-blue-title-lh, 1);
}
}
${scope} .page-web-cover,
${scope} .page-web-carousel,
${scope} .page-web-timeline,
${scope} .page-web-text-media,
${scope} .page-web-text-block,
${scope} .page-web-spacer { font-size: var(--wb-body-fs); line-height: var(--wb-body-lh); }
${scope} .page-web-cover { position: relative; display: flex; flex-direction: column; width: 100%; max-width: 100%; margin: 1.25rem 0; padding: 0; border-radius: 16px; background: #f1f5f9; box-sizing: border-box; overflow: visible; container-type: inline-size; }
${scope} .page-web-cover.page-web-cover-has-bg { background-color: #e2e8f0; }
${scope} .page-web-cover[data-cover-type="image"] .page-web-cover-bg { display: none; }
${scope} .page-web-cover[data-cover-type="split"].page-web-cover-has-bg { background: #f1f5f9 !important; }
${scope} .page-web-cover[data-cover-type="split"]::before { content: ""; position: absolute; inset: 0; z-index: 1; pointer-events: none; background: linear-gradient(90deg, rgba(248,250,252,0.02) 0%, rgba(248,250,252,0.2) 55%, rgba(248,250,252,0.7) 69%, rgba(248,250,252,0.08) 76%); border-radius: 0; filter: none; opacity: 1; }
${scope} .page-web-cover[data-cover-type="split"]::after { content: ""; position: absolute; top: 0; right: 0; bottom: 0; width: 50%; z-index: 1; pointer-events: none; background: #cbd5e1; border-left: 1px solid rgba(148, 163, 184, 0.75); border-radius: 0; filter: none; opacity: 1; }
${scope} .page-web-cover[data-cover-type="split"].page-web-cover-has-bg::after { background-image: var(--cover-bg-image); background-size: cover; background-position: var(--cover-bg-pos, 50% 50%); background-repeat: no-repeat; }
${scope} .page-web-cover[data-cover-aspect="16-9"], ${scope} .page-web-cover:not([data-cover-aspect]) { aspect-ratio: 16 / 9; }
${scope} .page-web-cover[data-cover-aspect="4-3"] { aspect-ratio: 4 / 3; }
${scope} .page-web-cover[data-cover-aspect="21-9"] { aspect-ratio: 21 / 9; }
${scope} .page-web-cover[data-cover-aspect="1-1"] { aspect-ratio: 1 / 1; }
${scope} .page-web-cover[data-cover-aspect="1-8"] { aspect-ratio: 2 / 1; }
${scope} .page-web-cover[data-cover-aspect="1-4"] { aspect-ratio: 4 / 1; }
${scope} .page-web-cover[data-cover-aspect="3-1"] { aspect-ratio: 3 / 1; }
${scope} .page-web-cover[data-cover-aspect="6-1"] { aspect-ratio: 6 / 1; }
${scope} .page-web-cover[data-cover-aspect="8-1"] { aspect-ratio: 6 / 1; }
${scope} .page-web-cover-inner { position: relative; z-index: 2; flex: 1; min-height: 0; max-width: 100%; width: 100%; display: flex; flex-direction: column; padding-inline: clamp(1rem, 4vw, 2.5rem); padding-block: clamp(1rem, 2.5vw, 1.8rem); box-sizing: border-box; overflow: hidden; }
${scope} .page-web-cover[data-cover-halign="left"] .page-web-cover-inner { align-items: flex-start; text-align: left; }
${scope} .page-web-cover[data-cover-halign="center"] .page-web-cover-inner { align-items: center; text-align: center; }
${scope} .page-web-cover[data-cover-halign="right"] .page-web-cover-inner { align-items: flex-end; text-align: right; }
${scope} .page-web-cover:not([data-cover-halign]) .page-web-cover-inner { align-items: center; text-align: center; }
${scope} .page-web-cover[data-cover-valign="top"] .page-web-cover-inner { justify-content: flex-start; }
${scope} .page-web-cover[data-cover-valign="middle"] .page-web-cover-inner { justify-content: center; }
${scope} .page-web-cover[data-cover-valign="bottom"] .page-web-cover-inner { justify-content: flex-end; }
${scope} .page-web-cover:not([data-cover-valign]) .page-web-cover-inner { justify-content: center; }
${scope} .page-web-cover[data-cover-type="split"] .page-web-cover-inner { width: 50%; padding-right: clamp(1.2rem, 3vw, 2rem); }
${scope} .page-web-cover-el-title { margin: 0 0 0.55rem; max-width: min(92%, 50rem); font-size: var(--wb-title-fs); font-weight: 600; letter-spacing: -0.02em; color: #496db3; line-height: var(--wb-title-lh); text-wrap: balance; }
${scope} .page-web-cover-el-subtitle { margin: 0 0 1rem; max-width: min(92%, 44rem); font-size: 1rem; color: #475569; line-height: 1.5; }
${scope} .page-web-cover-el-button-wrap { margin: 0; display: flex; align-items: center; justify-content: inherit; gap: 1.5rem; flex-wrap: wrap; }
${scope} .page-web-cover-el-button { display: inline-flex; align-items: center; justify-content: center; padding: 0.62rem 1.05rem; font-size: 0.875rem; font-weight: 600; color: #fff; background: #496db3; border-radius: 0.375rem; text-decoration: none; box-sizing: border-box; box-shadow: 0 1px 2px rgba(15,23,42,0.08), 0 4px 14px rgba(73,109,179,0.22); min-width: 0; max-width: 100%; white-space: normal; overflow-wrap: anywhere; word-break: break-word; text-align: center; }
${scope} .page-web-cover-el-learn-more { display: inline-flex; align-items: center; font-size: 0.875rem; font-weight: 600; color: #496db3; text-decoration: none; }
${scope} .page-web-cover-el-learn-more::after { content: "\\2192"; margin-left: 0.35rem; }
${scope} .page-web-cover-el-announcement-wrap { margin: 0; }
${scope} .page-web-cover-el-announcement {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.45rem 0.7rem;
  border-radius: 9999px;
  border: 1px solid #bfdbfe;
  background: #eff6ff;
  color: #1e3a8a;
  box-sizing: border-box;
}
${scope} .page-web-cover-el-announcement-text {
  font-size: 0.82rem;
  line-height: 1.25;
  color: #1e3a8a;
}
${scope} .page-web-cover-el-announcement-learn-more {
  display: inline-flex;
  align-items: center;
  font-size: 0.82rem;
  line-height: 1.25;
  font-weight: 700;
  color: #2563eb;
  text-decoration: none;
}
${scope} .page-web-cover-el-announcement-learn-more::after { content: "\\2192"; margin-left: 0.28rem; }
${scope} .page-web-text-block { width: 100%; margin: 1.25rem 0; border-radius: 12px; border: 1px solid #e2e8f0; background: #fff; padding: 1rem; box-sizing: border-box; }
${scope} .page-web-text-block[data-text-block-variant="feature-grid"] { border: none; background: transparent; padding: 0.75rem 0; }
${scope} .page-web-text-block[data-text-block-variant="work-pricing"] { border: none; background: transparent; padding: 0; }
${scope} .page-web-spacer { width: 100%; height: 2.5rem; margin: 0.5rem 0; border-radius: 8px; box-sizing: border-box; }
${scope} .page-web-spacer[data-spacer-size="sm"] { height: 1.5rem; }
${scope} .page-web-spacer[data-spacer-size="md"] { height: 2.5rem; }
${scope} .page-web-spacer[data-spacer-size="lg"] { height: 4rem; }
${scope} .page-web-feature-grid { display: grid; gap: 1.5rem; --feature-grid-message-bg: #fef2f2; --feature-grid-message-border: #fecaca; --feature-grid-message-text: #991b1b; }
${scope} .page-web-feature-grid-head { display: grid; gap: 0; width: 100%; max-width: 100%; }
${scope} .page-web-feature-grid-title { margin: 0; width: 100%; max-width: 100%; color: #496db3; font-size: var(--wb-title-fs); line-height: var(--wb-title-lh); letter-spacing: -0.02em; font-weight: 600; text-wrap: balance; }
${scope} .page-web-feature-grid-subtitle { margin: 0; width: 100%; max-width: 100%; color: #b91c1c !important; font-size: 1rem; line-height: 1; font-weight: 600; }
${scope} .page-web-feature-grid-subtitle + .page-web-feature-grid-title { margin-top: var(--site-red-blue-gap, -0.375rem); }
${scope} .page-web-feature-grid-head > .page-web-feature-grid-lead,
${scope} .page-web-feature-grid-head .page-web-feature-grid-lead-row > .page-web-feature-grid-lead { margin: 0; width: 100%; max-width: 100%; color: #64748b; line-height: 1.5; }
${scope} .page-web-feature-grid-head > .page-web-feature-grid-lead { padding-top: 1rem; }
${scope} .page-web-feature-grid-head > .page-web-feature-grid-lead-row { display: grid; grid-template-columns: minmax(0, 1fr); gap: 0.85rem; width: 100%; padding-top: 1rem; }
${scope} .page-web-feature-grid-message { display: none; border-radius: 0.6rem; border: 1px solid var(--feature-grid-message-border); background: var(--feature-grid-message-bg); padding: 0.35rem 0.45rem; color: var(--feature-grid-message-text); font-size: inherit; line-height: 1.5; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.45); }
${scope} .page-web-feature-grid-message > p,
${scope} .page-web-text-block-content .page-web-feature-grid-message > p { margin: 0; color: var(--feature-grid-message-text); }
${scope} .page-web-feature-grid-message > p + p { margin-top: 0.35rem; }
${scope} .page-web-feature-grid-message-title,
${scope} .page-web-text-block-content .page-web-feature-grid-message-title { color: var(--feature-grid-message-text); font-size: inherit; font-weight: 700; line-height: 1.5; }
${scope} .page-web-feature-grid[data-feature-grid-message-color="red"] { --feature-grid-message-bg: #fef2f2; --feature-grid-message-border: #fecaca; --feature-grid-message-text: #991b1b; }
${scope} .page-web-feature-grid[data-feature-grid-message-color="yellow"] { --feature-grid-message-bg: #fffbeb; --feature-grid-message-border: #fde68a; --feature-grid-message-text: #92400e; }
${scope} .page-web-feature-grid[data-feature-grid-message-color="green"] { --feature-grid-message-bg: #f0fdf4; --feature-grid-message-border: #86efac; --feature-grid-message-text: #166534; }
${scope} .page-web-feature-grid[data-feature-grid-message-position="right"] .page-web-feature-grid-message,
${scope} .page-web-feature-grid[data-feature-grid-message-position="left"] .page-web-feature-grid-message,
${scope} .page-web-feature-grid[data-feature-grid-message-position="bottom"] .page-web-feature-grid-message { display: block; }
${scope} .page-web-feature-grid[data-feature-grid-message-position="right"] .page-web-feature-grid-lead-row,
${scope} .page-web-feature-grid-lead-row[data-feature-grid-message-position="right"] { grid-template-columns: minmax(0, 1fr) minmax(220px, 0.85fr); align-items: start; column-gap: 1rem; }
${scope} .page-web-feature-grid[data-feature-grid-message-position="left"] .page-web-feature-grid-lead-row,
${scope} .page-web-feature-grid-lead-row[data-feature-grid-message-position="left"] { display: flex; flex-direction: row-reverse; align-items: start; gap: 1rem; }
${scope} .page-web-feature-grid[data-feature-grid-message-position="right"] .page-web-feature-grid-lead-row > .page-web-feature-grid-lead,
${scope} .page-web-feature-grid-lead-row[data-feature-grid-message-position="right"] > .page-web-feature-grid-lead { grid-column: 1; }
${scope} .page-web-feature-grid[data-feature-grid-message-position="right"] .page-web-feature-grid-lead-row > .page-web-feature-grid-message,
${scope} .page-web-feature-grid-lead-row[data-feature-grid-message-position="right"] > .page-web-feature-grid-message { grid-column: 2; margin-top: 0; align-self: center; }
${scope} .page-web-feature-grid[data-feature-grid-message-position="left"] .page-web-feature-grid-lead-row > .page-web-feature-grid-message,
${scope} .page-web-feature-grid-lead-row[data-feature-grid-message-position="left"] > .page-web-feature-grid-message { flex: 0 1 45%; min-width: 220px; margin-top: 0; align-self: center; }
${scope} .page-web-feature-grid[data-feature-grid-message-position="left"] .page-web-feature-grid-lead-row > .page-web-feature-grid-lead,
${scope} .page-web-feature-grid-lead-row[data-feature-grid-message-position="left"] > .page-web-feature-grid-lead { flex: 1 1 0; min-width: 0; }
${scope} .page-web-feature-grid[data-feature-grid-message-position="bottom"] .page-web-feature-grid-lead-row > .page-web-feature-grid-message,
${scope} .page-web-feature-grid-lead-row[data-feature-grid-message-position="bottom"] > .page-web-feature-grid-message { margin-top: 0.2rem; }
${scope} .page-web-feature-grid-image { display: none; position: relative; min-height: 220px; border-radius: 12px; border: 1px dashed #cbd5e1; background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%); color: #64748b; box-sizing: border-box; padding: 1rem; text-align: center; align-items: center; justify-content: center; overflow: hidden; }
${scope} .page-web-feature-grid-image-placeholder { margin: 0; font-size: 0.9rem; line-height: 1.5; }
${scope} .page-web-feature-grid-image[data-feature-grid-image-has-src="1"] .page-web-feature-grid-image-placeholder { display: none; }
${scope} .page-web-feature-grid[data-feature-grid-image-position="right"] { grid-template-columns: minmax(0, 1fr) minmax(260px, 0.85fr); column-gap: 1rem; align-items: start; }
${scope} .page-web-feature-grid[data-feature-grid-image-position="left"] { grid-template-columns: minmax(260px, 0.85fr) minmax(0, 1fr); column-gap: 1rem; align-items: start; }
${scope} .page-web-feature-grid[data-feature-grid-image-position="right"] > .page-web-feature-grid-head { grid-column: 1; grid-row: 1; }
${scope} .page-web-feature-grid[data-feature-grid-image-position="right"] > .page-web-feature-grid-list { grid-column: 1; grid-row: 2; }
${scope} .page-web-feature-grid[data-feature-grid-image-position="left"] > .page-web-feature-grid-head { grid-column: 2; grid-row: 1; }
${scope} .page-web-feature-grid[data-feature-grid-image-position="left"] > .page-web-feature-grid-list { grid-column: 2; grid-row: 2; }
${scope} .page-web-feature-grid[data-feature-grid-image-position="right"] > .page-web-feature-grid-image,
${scope} .page-web-feature-grid[data-feature-grid-image-position="left"] > .page-web-feature-grid-image {
  display: flex;
  grid-row: 1 / span 2;
  align-self: start;
  width: 100%;
  min-height: 0;
  height: auto;
  aspect-ratio: 1 / 1;
}
${scope} .page-web-feature-grid[data-feature-grid-image-position="right"] > .page-web-feature-grid-image { grid-column: 2; }
${scope} .page-web-feature-grid[data-feature-grid-image-position="left"] > .page-web-feature-grid-image { grid-column: 1; }
${scope} .page-web-feature-grid[data-feature-grid-image-position="bottom"] > .page-web-feature-grid-image {
  display: flex;
  width: 100%;
  min-height: 0;
  height: auto;
  aspect-ratio: 4 / 1;
}
${scope} .page-web-feature-grid[data-feature-grid-image-position="right"]:has(> .page-web-feature-grid-image[data-feature-grid-image-has-src="1"]),
${scope} .page-web-feature-grid[data-feature-grid-image-position="left"]:has(> .page-web-feature-grid-image[data-feature-grid-image-has-src="1"]) {
  position: relative;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: auto auto;
  column-gap: 0.9rem;
  row-gap: 0.9rem;
  overflow: hidden;
  border-radius: 12px;
}
${scope} .page-web-feature-grid[data-feature-grid-image-position="right"]:has(> .page-web-feature-grid-image[data-feature-grid-image-has-src="1"]) > .page-web-feature-grid-image,
${scope} .page-web-feature-grid[data-feature-grid-image-position="left"]:has(> .page-web-feature-grid-image[data-feature-grid-image-has-src="1"]) > .page-web-feature-grid-image {
  grid-column: 1 / -1;
  grid-row: 1 / span 2;
  align-self: stretch;
  justify-self: stretch;
  width: 100%;
  height: 100%;
  min-height: 280px;
  aspect-ratio: auto;
  border: none;
  padding: 0;
  border-radius: 12px;
  background-size: cover !important;
  background-position: center !important;
  background-repeat: no-repeat !important;
}
${scope} .page-web-feature-grid[data-feature-grid-image-position="right"]:has(> .page-web-feature-grid-image[data-feature-grid-image-has-src="1"])::before,
${scope} .page-web-feature-grid[data-feature-grid-image-position="left"]:has(> .page-web-feature-grid-image[data-feature-grid-image-has-src="1"])::before {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  width: 50%;
  z-index: 1;
  pointer-events: none;
  background: rgba(248, 250, 252, 0.5);
  backdrop-filter: blur(7px) saturate(1.03) brightness(1.14);
  -webkit-backdrop-filter: blur(7px) saturate(1.03) brightness(1.14);
}
${scope} .page-web-feature-grid[data-feature-grid-image-position="right"]:has(> .page-web-feature-grid-image[data-feature-grid-image-has-src="1"])::before { left: 0; }
${scope} .page-web-feature-grid[data-feature-grid-image-position="left"]:has(> .page-web-feature-grid-image[data-feature-grid-image-has-src="1"])::before { right: 0; }
${scope} .page-web-feature-grid[data-feature-grid-image-position="right"]:has(> .page-web-feature-grid-image[data-feature-grid-image-has-src="1"]) > .page-web-feature-grid-head,
${scope} .page-web-feature-grid[data-feature-grid-image-position="right"]:has(> .page-web-feature-grid-image[data-feature-grid-image-has-src="1"]) > .page-web-feature-grid-list {
  grid-column: 1;
  position: relative;
  z-index: 2;
  justify-self: center;
  width: calc(100% - 1.5rem);
  max-width: 100%;
}
${scope} .page-web-feature-grid[data-feature-grid-image-position="left"]:has(> .page-web-feature-grid-image[data-feature-grid-image-has-src="1"]) > .page-web-feature-grid-head,
${scope} .page-web-feature-grid[data-feature-grid-image-position="left"]:has(> .page-web-feature-grid-image[data-feature-grid-image-has-src="1"]) > .page-web-feature-grid-list {
  grid-column: 2;
  position: relative;
  z-index: 2;
  justify-self: center;
  width: calc(100% - 1.5rem);
  max-width: 100%;
}
${scope} .page-web-feature-grid[data-feature-grid-image-position="right"]:has(> .page-web-feature-grid-image[data-feature-grid-image-has-src="1"]) > .page-web-feature-grid-head,
${scope} .page-web-feature-grid[data-feature-grid-image-position="left"]:has(> .page-web-feature-grid-image[data-feature-grid-image-has-src="1"]) > .page-web-feature-grid-head {
  margin: 0.75rem 0.75rem 0 0.75rem;
  padding: 0.85rem 0.95rem;
  justify-items: center;
  text-align: center;
}
${scope} .page-web-feature-grid[data-feature-grid-image-position="right"]:has(> .page-web-feature-grid-image[data-feature-grid-image-has-src="1"]) > .page-web-feature-grid-list,
${scope} .page-web-feature-grid[data-feature-grid-image-position="left"]:has(> .page-web-feature-grid-image[data-feature-grid-image-has-src="1"]) > .page-web-feature-grid-list {
  margin: 0 0.75rem 0.75rem 0.75rem;
  padding: 0.75rem;
  justify-items: center;
}
${scope} .page-web-feature-grid[data-feature-grid-image-position="right"]:has(> .page-web-feature-grid-image[data-feature-grid-image-has-src="1"]) .page-web-feature-grid-head > .page-web-feature-grid-lead,
${scope} .page-web-feature-grid[data-feature-grid-image-position="left"]:has(> .page-web-feature-grid-image[data-feature-grid-image-has-src="1"]) .page-web-feature-grid-head > .page-web-feature-grid-lead,
${scope} .page-web-feature-grid[data-feature-grid-image-position="right"]:has(> .page-web-feature-grid-image[data-feature-grid-image-has-src="1"]) .page-web-feature-grid-head .page-web-feature-grid-lead-row > .page-web-feature-grid-lead,
${scope} .page-web-feature-grid[data-feature-grid-image-position="left"]:has(> .page-web-feature-grid-image[data-feature-grid-image-has-src="1"]) .page-web-feature-grid-head .page-web-feature-grid-lead-row > .page-web-feature-grid-lead {
  text-align: center;
}
${scope} .page-web-feature-grid[data-feature-grid-image-position="right"]:has(> .page-web-feature-grid-image[data-feature-grid-image-has-src="1"]) .page-web-feature-grid-list > .page-web-feature-grid-item,
${scope} .page-web-feature-grid[data-feature-grid-image-position="left"]:has(> .page-web-feature-grid-image[data-feature-grid-image-has-src="1"]) .page-web-feature-grid-list > .page-web-feature-grid-item {
  width: 100%;
}
${scope} .page-web-feature-grid-list { display: grid; width: 100%; max-width: 100%; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; margin: 0; }
${scope} .page-web-feature-grid[data-feature-grid-cols="2"] .page-web-feature-grid-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
${scope} .page-web-feature-grid[data-feature-grid-cols="4"] .page-web-feature-grid-list { grid-template-columns: repeat(4, minmax(0, 1fr)); }
${scope} .page-web-feature-grid-item { border-radius: 10px; border: 1px solid #e2e8f0; background: #fff; padding: 0.9rem; display: flex; flex-direction: column; justify-content: flex-start; min-height: 100%; }
${scope} .page-web-feature-grid-item-title { margin: 0; display: flex; align-items: center; gap: 0.55rem; color: #0f172a; font-size: 0.82rem; line-height: 1.35; font-weight: 600; }
${scope} .page-web-feature-grid-icon-wrap { display: inline-flex; width: 1.8rem; height: 1.8rem; align-items: center; justify-content: center; flex: 0 0 auto; border-radius: 999px; background: #e0e7ff; color: #496db3; }
${scope} .page-web-feature-grid-icon-wrap[data-feature-grid-icon-id="alert"],
${scope} .page-web-feature-grid-icon-wrap[data-feature-grid-icon-id="bug"],
${scope} .page-web-feature-grid-icon-wrap[data-feature-grid-icon-id="fire"] { background: #fee2e2; color: #dc2626; }
${scope} .page-web-feature-grid-icon { width: 1.12rem; height: 1.12rem; }
${scope} .page-web-feature-grid[data-feature-grid-card-numbers="1"] .page-web-feature-grid-list { counter-reset: feature-grid-card; }
${scope} .page-web-feature-grid[data-feature-grid-card-numbers="1"] .page-web-feature-grid-item-title { counter-increment: feature-grid-card; }
${scope} .page-web-feature-grid[data-feature-grid-card-numbers="1"] .page-web-feature-grid-item-title::before {
  content: counter(feature-grid-card);
  display: inline-flex;
  width: 1.8rem;
  height: 1.8rem;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  border-radius: 999px;
  background: #496db3;
  color: #ffffff;
  font-size: 0.92rem;
  font-weight: 700;
  line-height: 1;
}
${scope} .page-web-feature-grid[data-feature-grid-card-numbers="1"] .page-web-feature-grid-item-title .page-web-feature-grid-icon-wrap { display: none !important; }
${scope} .page-web-feature-grid-item-body { margin: 0.65rem 0 0; color: #475569; line-height: 1.55; }
${scope} .page-web-feature-grid-item-body:empty { display: none; margin: 0; }
${scope} .page-web-feature-grid-item:has(> .page-web-feature-grid-item-body:empty) { justify-content: center; }
${scope} .page-web-feature-grid-item-body p { margin: 0; }
${scope} .page-web-feature-grid-item-link-wrap { margin-top: 0.65rem !important; }
${scope} .page-web-feature-grid-link { color: #496db3; text-decoration: none; font-weight: 600; }
${scope} .page-web-feature-grid-link:hover { text-decoration: underline; }
${scope} .page-web-text-media { width: 100%; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; margin: 1.25rem 0; }
${scope} .page-web-text-media-col { min-height: 210px; border-radius: 12px; border: 1px solid #e2e8f0; background: #fff; padding: 1rem; box-sizing: border-box; overflow-wrap: anywhere; }
${scope} .page-web-text-media-col--media { background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%); display: flex; align-items: center; justify-content: center; text-align: center; color: #64748b; }
${scope} .page-web-timeline { --timeline-dot-size: 0.8rem; --timeline-line-size: 2px; --timeline-gap: 1rem; position: relative; width: 100%; margin: 0 0 1.25rem; padding-top: 1rem; display: grid; grid-template-columns: repeat(var(--timeline-cols, 3), minmax(0, 1fr)); gap: 0.7rem var(--timeline-gap); box-sizing: border-box; }
${scope} .page-web-timeline::before { content: ""; position: absolute; left: var(--timeline-line-left, 0); right: var(--timeline-line-right, 0); top: var(--timeline-line-top, 50%); height: var(--timeline-line-size); transform: translateY(-50%); background: #cbd5e1; pointer-events: none; z-index: 1; }
${scope} .page-web-timeline-head { grid-column: 1 / -1; display: grid; gap: 0; margin: 0 0 0.25rem; }
${scope} .page-web-timeline-subtitle { margin: 0; color: #b91c1c; font-size: 1rem; line-height: 1; font-weight: 600; }
${scope} .page-web-timeline-heading { margin: 0; color: #496db3; font-size: var(--wb-title-fs); line-height: var(--wb-title-lh); letter-spacing: -0.02em; font-weight: 600; }
${scope} .page-web-timeline-subtitle + .page-web-timeline-heading { margin-top: var(--site-red-blue-gap, -0.375rem); }
${scope} .page-web-timeline-description { margin: 0; color: #64748b; font-size: inherit; line-height: 1.5; }
${scope} .page-web-timeline-heading + .page-web-timeline-description { margin-top: 1rem; }
${scope} .page-web-timeline-item { position: relative; min-height: 0; display: grid; grid-template-rows: minmax(8.5rem, 1fr) var(--timeline-dot-size) minmax(8.5rem, 1fr); row-gap: 0.4rem; align-content: stretch; align-items: stretch; }
${scope} .page-web-timeline-item::before { content: none; display: none; }
${scope} .page-web-timeline-item[data-timeline-has-next="1"]::before,
${scope} .page-web-timeline-item:not([data-timeline-has-next="0"]):not(:last-of-type)::before,
${scope} .page-web-timeline-item[data-timeline-has-next="0"]::before { content: none !important; display: none !important; width: 0 !important; height: 0 !important; }
${scope} .page-web-timeline-term { position: relative; z-index: 3; font-size: 1rem; line-height: 1.25; margin: 0; padding: 0 0.15rem; background: transparent; grid-row: 1; align-self: end; justify-self: center; display: inline-flex; align-items: flex-end; justify-content: center; width: fit-content; max-width: 100%; min-height: 0; height: auto; }
${scope} .page-web-timeline-dot { position: relative; left: auto; top: auto; transform: none; width: var(--timeline-dot-size); height: var(--timeline-dot-size); border-radius: 9999px; background: #496db3; box-shadow: 0 0 0 3px #e2e8f0; z-index: 2; grid-row: 2; justify-self: center; align-self: center; }
${scope} .page-web-timeline-content { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 0.2rem; padding: 0.6rem 0.7rem; margin: 0; text-align: center; border: 1px solid #e2e8f0; border-radius: 10px; background: #ffffff; grid-row: 3; align-self: stretch; justify-self: center; height: 100%; box-sizing: border-box; }
${scope} .page-web-timeline-item:nth-of-type(odd):not(:first-of-type) > .page-web-timeline-term { grid-row: 3; align-self: start; margin: 0; align-items: flex-start; }
${scope} .page-web-timeline-item:nth-of-type(odd):not(:first-of-type) > .page-web-timeline-content { grid-row: 1; align-self: stretch; justify-self: center; margin: 0; }
${scope} .page-web-timeline-title { margin: 0; font-size: 1.75rem; font-weight: 700; color: #0f172a; line-height: 1.45; }
${scope} .page-web-timeline-text { margin: 0; font-size: 1.75rem; color: #475569; line-height: 1.5; }
${scope} .page-web-timeline[data-timeline-show-term="0"] .page-web-timeline-term { display: none !important; }
${scope} .page-web-timeline[data-timeline-show-title="0"] .page-web-timeline-title { display: none !important; }
${scope} .page-web-timeline[data-timeline-show-text="0"] .page-web-timeline-text { display: none !important; }
${scope} .page-web-carousel { position: relative; width: 100%; max-width: 100%; margin: 1.25rem 0; box-sizing: border-box; display: flex; flex-direction: row; align-items: center; gap: 10px; background: transparent; border: none; overflow: visible; }
${scope} .page-web-carousel-viewport { order: 2; position: relative; z-index: 0; flex: 1 1 0; min-width: 0; width: 100%; max-width: 100%; margin: 0; box-sizing: border-box; border-radius: 8px; background: transparent; min-height: 180px; display: grid; grid-auto-flow: column; grid-auto-columns: calc((100% - 16px) / 3); gap: 8px; overflow-x: auto; overflow-y: visible; }
${scope} .page-web-work-pricing .wsx,
${scope} .page-web-text-block h3,
${scope} .page-web-text-media .page-web-text-media-col h3 {
  font-size: var(--wb-title-fs);
  line-height: var(--wb-title-lh);
}
${scope} .page-web-work-pricing .wti { display: none !important; }
@media (max-width: 1205px) {
${scope} .page-web-cover { height: auto; min-height: max-content; }
${scope} .page-web-cover .page-web-cover-inner { overflow: hidden; }
${scope} .page-web-cover[data-cover-type="split"][data-cover-aspect="1-4"] { aspect-ratio: 1 / 1; }
${scope} .page-web-timeline { --timeline-gap: 0.65rem; --timeline-term-col: 4.6rem; gap: var(--timeline-gap); position: relative; }
${scope} .page-web-timeline::before {
  content: "";
  position: absolute;
  left: var(--timeline-line-left, calc(var(--timeline-term-col) + 0.35rem + 0.95rem));
  top: var(--timeline-line-top, 3.1rem);
  bottom: var(--timeline-line-bottom, 0.8rem);
  right: auto;
  transform: translateX(-50%);
  width: var(--timeline-line-size);
  height: auto;
  background: #cbd5e1;
  pointer-events: none;
  z-index: 1;
}
${scope} .page-web-timeline-item { min-height: 0; padding-top: 0; padding-left: 0; display: grid; grid-template-columns: var(--timeline-term-col) 1.9rem minmax(0, 1fr); column-gap: 0.35rem; grid-template-rows: none; row-gap: 0; align-items: start; position: relative; z-index: 2; }
${scope} .page-web-timeline[data-timeline-show-term="0"] .page-web-timeline-item { grid-template-columns: 0 1.9rem minmax(0, 1fr); }
${scope} .page-web-timeline-item::before,
${scope} .page-web-timeline-item::after { content: none; display: none; }
${scope} .page-web-timeline-item:not(:last-of-type)::before,
${scope} .page-web-timeline-item:not(:first-of-type)::after { content: none !important; display: none !important; width: 0 !important; height: 0 !important; }
${scope} .page-web-timeline-dot { left: 50%; top: 0.2rem; transform: translateX(-50%); z-index: 3; }
${scope} .page-web-timeline-term { position: static; transform: none; margin: 0; padding: 0 0.1rem 0 0; background: transparent; grid-column: 1; grid-row: 1; align-self: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: right; display: inline-flex; align-items: center; justify-content: flex-end; justify-self: end; width: 100%; max-width: var(--timeline-term-col); min-height: 0; height: auto; }
${scope} .page-web-timeline-content { grid-column: 3; grid-row: 1; align-items: flex-start; text-align: left; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 0.6rem 0.7rem; box-sizing: border-box; }
${scope} .page-web-timeline-item:nth-of-type(odd):not(:first-of-type) > .page-web-timeline-term { grid-row: 1; align-self: center; margin: 0; align-items: center; }
${scope} .page-web-timeline-item:nth-of-type(odd):not(:first-of-type) > .page-web-timeline-content { grid-row: 1; align-self: center; justify-self: stretch; margin: 0; }
${scope} .page-web-cover[data-cover-type="split"] .page-web-cover-inner { width: 100%; padding-right: clamp(1rem, 4vw, 1.5rem); }
${scope} .page-web-cover[data-cover-type="split"]::before { background: linear-gradient(180deg, rgba(248,250,252,0.06) 0%, rgba(248,250,252,0.28) 48%, rgba(248,250,252,0.52) 100%); }
${scope} .page-web-cover[data-cover-type="split"]::after { width: 100%; border-left: none; opacity: 0.35; }
${scope} .page-web-feature-grid-list { grid-template-columns: repeat(1, minmax(0, 1fr)); }
${scope} .page-web-feature-grid[data-feature-grid-message-position="right"] .page-web-feature-grid-lead-row,
${scope} .page-web-feature-grid[data-feature-grid-message-position="left"] .page-web-feature-grid-lead-row,
${scope} .page-web-feature-grid-lead-row[data-feature-grid-message-position="right"],
${scope} .page-web-feature-grid-lead-row[data-feature-grid-message-position="left"] { grid-template-columns: minmax(0, 1fr); }
${scope} .page-web-feature-grid[data-feature-grid-message-position="right"] .page-web-feature-grid-lead-row > .page-web-feature-grid-lead,
${scope} .page-web-feature-grid-lead-row[data-feature-grid-message-position="right"] > .page-web-feature-grid-lead,
${scope} .page-web-feature-grid[data-feature-grid-message-position="right"] .page-web-feature-grid-lead-row > .page-web-feature-grid-message,
${scope} .page-web-feature-grid-lead-row[data-feature-grid-message-position="right"] > .page-web-feature-grid-message {
  grid-column: 1 !important;
  width: 100%;
}
${scope} .page-web-feature-grid-message,
${scope} .page-web-feature-grid-message > p,
${scope} .page-web-feature-grid-message > p *,
${scope} .page-web-feature-grid-message-title {
  font-size: inherit;
  line-height: inherit;
}
${scope} .page-web-feature-grid[data-feature-grid-message-position="left"] .page-web-feature-grid-lead-row,
${scope} .page-web-feature-grid-lead-row[data-feature-grid-message-position="left"] { display: flex; flex-direction: column; }
${scope} .page-web-feature-grid[data-feature-grid-message-position="right"] .page-web-feature-grid-lead-row > .page-web-feature-grid-message,
${scope} .page-web-feature-grid[data-feature-grid-message-position="left"] .page-web-feature-grid-lead-row > .page-web-feature-grid-message,
${scope} .page-web-feature-grid-lead-row[data-feature-grid-message-position="right"] > .page-web-feature-grid-message,
${scope} .page-web-feature-grid-lead-row[data-feature-grid-message-position="left"] > .page-web-feature-grid-message { margin-top: 0.2rem; }
${scope} .page-web-feature-grid[data-feature-grid-image-position="right"],
${scope} .page-web-feature-grid[data-feature-grid-image-position="left"] { grid-template-columns: minmax(0, 1fr); }
${scope} .page-web-feature-grid[data-feature-grid-image-position="right"] > .page-web-feature-grid-head,
${scope} .page-web-feature-grid[data-feature-grid-image-position="right"] > .page-web-feature-grid-list,
${scope} .page-web-feature-grid[data-feature-grid-image-position="right"] > .page-web-feature-grid-image,
${scope} .page-web-feature-grid[data-feature-grid-image-position="left"] > .page-web-feature-grid-head,
${scope} .page-web-feature-grid[data-feature-grid-image-position="left"] > .page-web-feature-grid-list,
${scope} .page-web-feature-grid[data-feature-grid-image-position="left"] > .page-web-feature-grid-image { grid-column: 1; grid-row: auto; }
${scope} .page-web-feature-grid[data-feature-grid-image-position="right"] > .page-web-feature-grid-image,
${scope} .page-web-feature-grid[data-feature-grid-image-position="left"] > .page-web-feature-grid-image {
  display: flex;
  min-height: 0;
  height: auto;
  aspect-ratio: 1 / 1;
}
${scope} .page-web-feature-grid[data-feature-grid-image-position="right"]:has(> .page-web-feature-grid-image[data-feature-grid-image-has-src="1"]),
${scope} .page-web-feature-grid[data-feature-grid-image-position="left"]:has(> .page-web-feature-grid-image[data-feature-grid-image-has-src="1"]) {
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: auto auto;
  min-height: 300px;
}
${scope} .page-web-feature-grid[data-feature-grid-image-position="right"]:has(> .page-web-feature-grid-image[data-feature-grid-image-has-src="1"])::before,
${scope} .page-web-feature-grid[data-feature-grid-image-position="left"]:has(> .page-web-feature-grid-image[data-feature-grid-image-has-src="1"])::before {
  left: 0;
  right: 0;
  width: 100%;
}
${scope} .page-web-feature-grid[data-feature-grid-image-position="right"]:has(> .page-web-feature-grid-image[data-feature-grid-image-has-src="1"]) > .page-web-feature-grid-head,
${scope} .page-web-feature-grid[data-feature-grid-image-position="right"]:has(> .page-web-feature-grid-image[data-feature-grid-image-has-src="1"]) > .page-web-feature-grid-list,
${scope} .page-web-feature-grid[data-feature-grid-image-position="left"]:has(> .page-web-feature-grid-image[data-feature-grid-image-has-src="1"]) > .page-web-feature-grid-head,
${scope} .page-web-feature-grid[data-feature-grid-image-position="left"]:has(> .page-web-feature-grid-image[data-feature-grid-image-has-src="1"]) > .page-web-feature-grid-list {
  grid-column: 1;
}
${scope} .page-web-feature-grid[data-feature-grid-image-position="right"]:has(> .page-web-feature-grid-image[data-feature-grid-image-has-src="1"]) > .page-web-feature-grid-image,
${scope} .page-web-feature-grid[data-feature-grid-image-position="left"]:has(> .page-web-feature-grid-image[data-feature-grid-image-has-src="1"]) > .page-web-feature-grid-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  min-height: 0;
  aspect-ratio: auto;
  z-index: 0;
}
${scope} .page-web-feature-grid[data-feature-grid-image-position="right"] > .page-web-feature-grid-image[data-feature-grid-image-has-src="1"],
${scope} .page-web-feature-grid[data-feature-grid-image-position="left"] > .page-web-feature-grid-image[data-feature-grid-image-has-src="1"] {
  border: none;
  padding: 0;
  background-color: #e2e8f0;
  background-size: cover !important;
  background-position: center !important;
  background-repeat: no-repeat !important;
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.18);
}
${scope} .page-web-feature-grid[data-feature-grid-image-position="bottom"] > .page-web-feature-grid-image {
  aspect-ratio: 2 / 1;
}
${scope} .page-web-text-media { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 1205px) {
${scope} .page-web-timeline-subtitle { font-size: 1rem; line-height: 1; }
${scope} .page-web-timeline-heading { font-size: var(--wb-title-fs); line-height: var(--wb-title-lh); }
${scope} .page-web-timeline-description { font-size: inherit; line-height: inherit; }
${scope} .page-web-timeline-title { font-size: 1.28rem; line-height: 1.35; }
${scope} .page-web-timeline-text { font-size: 1.3rem; line-height: 1.5; }
${scope} .page-web-feature-grid-subtitle { font-size: 1rem; line-height: 1; }
${scope} .page-web-feature-grid-title { font-size: var(--wb-title-fs); line-height: var(--wb-title-lh); }
${scope} .page-web-feature-grid .page-web-feature-grid-lead,
${scope} .page-web-feature-grid .page-web-feature-grid-lead p,
${scope} .page-web-feature-grid .page-web-feature-grid-lead span,
${scope} .page-web-feature-grid .page-web-feature-grid-lead-row > :not(.page-web-feature-grid-message),
${scope} .page-web-feature-grid .page-web-feature-grid-lead-row > :not(.page-web-feature-grid-message) p,
${scope} .page-web-feature-grid .page-web-feature-grid-lead-row > :not(.page-web-feature-grid-message) span {
  font-size: inherit;
  line-height: inherit;
}
${scope} .page-web-feature-grid-head > .page-web-feature-grid-title + p,
${scope} .page-web-feature-grid-head > .page-web-feature-grid-title + div > p:first-child,
${scope} .page-web-feature-grid-head > .page-web-feature-grid-subtitle + .page-web-feature-grid-title + p,
${scope} .page-web-feature-grid-head > .page-web-feature-grid-subtitle + .page-web-feature-grid-title + div > p:first-child,
${scope} .page-web-feature-grid-head > .page-web-feature-grid-title + p *,
${scope} .page-web-feature-grid-head > .page-web-feature-grid-title + div > p:first-child *,
${scope} .page-web-feature-grid-head > .page-web-feature-grid-subtitle + .page-web-feature-grid-title + p *,
${scope} .page-web-feature-grid-head > .page-web-feature-grid-subtitle + .page-web-feature-grid-title + div > p:first-child * {
  font-size: inherit;
  line-height: inherit;
}
${scope} .page-web-feature-grid-head > .page-web-feature-grid-lead,
${scope} .page-web-feature-grid-head .page-web-feature-grid-lead-row > .page-web-feature-grid-lead,
${scope} .page-web-feature-grid-head > .page-web-feature-grid-lead p,
${scope} .page-web-feature-grid-head .page-web-feature-grid-lead-row > .page-web-feature-grid-lead p,
${scope} .page-web-feature-grid-head > .page-web-feature-grid-lead *,
${scope} .page-web-feature-grid-head .page-web-feature-grid-lead-row > .page-web-feature-grid-lead *,
${scope} .page-web-feature-grid-head > p:not(.page-web-feature-grid-subtitle):not(.page-web-feature-grid-title),
${scope} .page-web-feature-grid-head > div > p:not(.page-web-feature-grid-subtitle):not(.page-web-feature-grid-title),
${scope} .page-web-feature-grid-head > p:not(.page-web-feature-grid-subtitle):not(.page-web-feature-grid-title) *,
${scope} .page-web-feature-grid-head > div > p:not(.page-web-feature-grid-subtitle):not(.page-web-feature-grid-title) * { font-size: inherit; line-height: inherit; }
${scope} .page-web-feature-grid-item-title { font-size: 1.28rem; line-height: 1.35; }
${scope} .page-web-feature-grid-item-body { font-size: 1.3rem; line-height: 1.5; }
${scope} .page-web-feature-grid-link { font-size: 1.16rem; }
${scope} .page-web-feature-grid-list,
${scope} .page-web-feature-grid[data-feature-grid-cols="2"] .page-web-feature-grid-list,
${scope} .page-web-feature-grid[data-feature-grid-cols="3"] .page-web-feature-grid-list,
${scope} .page-web-feature-grid[data-feature-grid-cols="4"] .page-web-feature-grid-list { grid-template-columns: repeat(1, minmax(0, 1fr)) !important; }
}
`;
}

