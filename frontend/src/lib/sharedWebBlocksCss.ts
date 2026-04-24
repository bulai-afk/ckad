export const WEB_BLOCK_BASE_FONT_SIZE = "10.8px";

export function getSharedWebBlocksCss(scope: string): string {
  return `
${scope} .page-web-cover,
${scope} .page-web-carousel,
${scope} .page-web-timeline,
${scope} .page-web-text-media,
${scope} .page-web-text-block { font-size: ${WEB_BLOCK_BASE_FONT_SIZE}; }
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
${scope} .page-web-cover[data-cover-aspect="8-1"] { aspect-ratio: 8 / 1; }
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
${scope} .page-web-cover-el-title { margin: 0 0 0.55rem; max-width: min(92%, 50rem); font-size: clamp(1.4rem, 4.4cqi, 2.8rem); font-weight: 600; letter-spacing: -0.02em; color: #496db3; line-height: 1.1; text-wrap: balance; }
${scope} .page-web-cover-el-subtitle { margin: 0 0 1rem; max-width: min(92%, 44rem); font-size: clamp(0.95rem, 1.9cqi, 1.1rem); color: #475569; line-height: 1.5; }
${scope} .page-web-cover-el-button-wrap { margin: 0; display: flex; align-items: center; justify-content: inherit; gap: 1.5rem; flex-wrap: wrap; }
${scope} .page-web-cover-el-button { display: inline-flex; align-items: center; justify-content: center; padding: 0.62rem 1.05rem; font-size: 0.875rem; font-weight: 600; color: #fff; background: #496db3; border-radius: 0.375rem; text-decoration: none; box-sizing: border-box; box-shadow: 0 1px 2px rgba(15,23,42,0.08), 0 4px 14px rgba(73,109,179,0.22); }
${scope} .page-web-cover-el-learn-more { display: inline-flex; align-items: center; font-size: 0.875rem; font-weight: 600; color: #496db3; text-decoration: none; }
${scope} .page-web-cover-el-learn-more::after { content: "\\2192"; margin-left: 0.35rem; }
${scope} .page-web-text-block { width: 100%; margin: 1.25rem 0; border-radius: 12px; border: 1px solid #e2e8f0; background: #fff; padding: 1rem; box-sizing: border-box; }
${scope} .page-web-text-block[data-text-block-variant="feature-grid"] { border: none; background: transparent; padding: 0; }
${scope} .page-web-text-block[data-text-block-variant="work-pricing"] { border: none; background: transparent; padding: 0; }
${scope} .page-web-feature-grid { display: grid; gap: 1.5rem; --feature-grid-message-bg: #fef2f2; --feature-grid-message-border: #fecaca; --feature-grid-message-text: #991b1b; }
${scope} .page-web-feature-grid-head { display: grid; gap: 0; width: 100%; max-width: 100%; }
${scope} .page-web-feature-grid-title { margin: 0; width: 100%; max-width: 100%; color: #496db3; font-size: clamp(0.98rem, 2.7cqi, 1.75rem); line-height: 1; letter-spacing: -0.02em; font-weight: 600; text-wrap: balance; }
${scope} .page-web-feature-grid-subtitle { margin: 0; width: 100%; max-width: 100%; color: #b91c1c !important; font-size: clamp(0.76rem, 1.15cqi, 0.88rem); line-height: 1; font-weight: 600; }
${scope} .page-web-feature-grid-subtitle + .page-web-feature-grid-title { margin-top: -0.16rem; }
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
${scope} .page-web-feature-grid[data-feature-grid-image-position="left"] > .page-web-feature-grid-image { display: flex; grid-row: 1 / span 2; align-self: stretch; }
${scope} .page-web-feature-grid[data-feature-grid-image-position="right"] > .page-web-feature-grid-image { grid-column: 2; }
${scope} .page-web-feature-grid[data-feature-grid-image-position="left"] > .page-web-feature-grid-image { grid-column: 1; }
${scope} .page-web-feature-grid[data-feature-grid-image-position="bottom"] > .page-web-feature-grid-image { display: flex; }
${scope} .page-web-feature-grid-list { display: grid; width: 100%; max-width: 100%; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; margin: 0; }
${scope} .page-web-feature-grid[data-feature-grid-cols="2"] .page-web-feature-grid-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
${scope} .page-web-feature-grid[data-feature-grid-cols="4"] .page-web-feature-grid-list { grid-template-columns: repeat(4, minmax(0, 1fr)); }
${scope} .page-web-feature-grid-item { border-radius: 10px; border: 1px solid #e2e8f0; background: #fff; padding: 0.9rem; display: flex; flex-direction: column; justify-content: flex-start; min-height: 100%; }
${scope} .page-web-feature-grid-item-title { margin: 0; display: flex; align-items: center; gap: 0.55rem; color: #0f172a; font-size: 0.82rem; line-height: 1.35; font-weight: 600; }
${scope} .page-web-feature-grid-icon-wrap { display: inline-flex; width: 1.8rem; height: 1.8rem; align-items: center; justify-content: center; flex: 0 0 auto; border-radius: 999px; background: #e0e7ff; color: #496db3; }
${scope} .page-web-feature-grid-icon { width: 1.12rem; height: 1.12rem; }
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
${scope} .page-web-timeline { width: 100%; margin: 0 0 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; }
${scope} .page-web-timeline-head { display: grid; gap: 0; margin: 0 0 0.25rem; }
${scope} .page-web-timeline-subtitle { margin: 0; color: #b91c1c; font-size: clamp(0.76rem, 1.15cqi, 0.88rem); line-height: 1; font-weight: 600; }
${scope} .page-web-timeline-heading { margin: 0; color: #496db3; font-size: clamp(0.98rem, 2.7cqi, 1.75rem); line-height: 1; letter-spacing: -0.02em; font-weight: 600; }
${scope} .page-web-timeline-subtitle + .page-web-timeline-heading { margin-top: -0.16rem; }
${scope} .page-web-timeline-description { margin: 0; color: #64748b; font-size: inherit; line-height: 1.5; }
${scope} .page-web-timeline-heading + .page-web-timeline-description { margin-top: 1rem; }
${scope} .page-web-timeline-term { font-size: clamp(0.76rem, 1.15cqi, 0.88rem); line-height: 1.25; }
${scope} .page-web-timeline-title { margin: 0; font-size: inherit; font-weight: 700; color: #0f172a; line-height: 1.5; }
${scope} .page-web-timeline-text { margin: 0; font-size: inherit; color: #475569; line-height: 1.5; }
${scope} .page-web-carousel { position: relative; width: 100%; max-width: 100%; margin: 1.25rem 0; box-sizing: border-box; display: flex; flex-direction: row; align-items: center; gap: 10px; background: transparent; border: none; overflow: visible; }
${scope} .page-web-carousel-viewport { order: 2; position: relative; z-index: 0; flex: 1 1 0; min-width: 0; width: 100%; max-width: 100%; margin: 0; box-sizing: border-box; border-radius: 8px; background: transparent; min-height: 180px; display: grid; grid-auto-flow: column; grid-auto-columns: calc((100% - 16px) / 3); gap: 8px; overflow-x: auto; overflow-y: visible; }
@media (max-width: 767px) {
${scope} .page-web-cover[data-cover-type="split"] .page-web-cover-inner { width: 100%; padding-right: clamp(1rem, 4vw, 1.5rem); }
${scope} .page-web-cover[data-cover-type="split"]::before { background: linear-gradient(180deg, rgba(248,250,252,0.06) 0%, rgba(248,250,252,0.28) 48%, rgba(248,250,252,0.52) 100%); }
${scope} .page-web-cover[data-cover-type="split"]::after { width: 100%; border-left: none; opacity: 0.35; }
${scope} .page-web-feature-grid-list { grid-template-columns: minmax(0, 1fr); }
${scope} .page-web-feature-grid[data-feature-grid-message-position="right"] .page-web-feature-grid-lead-row,
${scope} .page-web-feature-grid[data-feature-grid-message-position="left"] .page-web-feature-grid-lead-row,
${scope} .page-web-feature-grid-lead-row[data-feature-grid-message-position="right"],
${scope} .page-web-feature-grid-lead-row[data-feature-grid-message-position="left"] { grid-template-columns: minmax(0, 1fr); }
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
${scope} .page-web-feature-grid[data-feature-grid-image-position="left"] > .page-web-feature-grid-image { display: flex; min-height: 180px; }
${scope} .page-web-text-media { grid-template-columns: minmax(0, 1fr); }
}
`;
}

