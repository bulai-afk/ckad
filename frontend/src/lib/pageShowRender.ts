export function ensureCoverBgLayers(root: ParentNode): void {
  const debugEnabled =
    typeof window !== "undefined" &&
    window.localStorage?.getItem("debugPageCoverSync") === "1";
  const makeBlobLayer = (kind: "blue" | "red") => {
    const layer = document.createElement("div");
    layer.className = `page-web-cover-blob-layer page-web-cover-blob-layer--${kind}`;
    layer.setAttribute("aria-hidden", "true");
    const blob = document.createElement("div");
    blob.className = `page-web-cover-blob page-web-cover-blob--${kind}`;
    layer.appendChild(blob);
    return layer;
  };
  const extractDataUrlFromBackground = (backgroundValue: string): string | null => {
    const raw = String(backgroundValue || "");
    const start = raw.indexOf("url(");
    if (start < 0) return null;
    let s = raw.slice(start + 4).trim();
    if (s.startsWith('"')) {
      const end = s.indexOf('"', 1);
      if (end < 0) return null;
      return s.slice(1, end).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    }
    if (s.startsWith("'")) {
      const end = s.indexOf("'", 1);
      if (end < 0) return null;
      return s.slice(1, end);
    }
    const end = s.indexOf(")");
    return end >= 0 ? s.slice(0, end).trim() : null;
  };

  const covers = Array.from(root.querySelectorAll(".page-web-cover")) as HTMLElement[];
  if (debugEnabled) {
    console.log("[cover-sync] found covers", covers.length);
  }
  covers.forEach((cover) => {
    const coverType = cover.getAttribute("data-cover-type");
    if (coverType === "hero") {
      cover.classList.remove("page-web-cover-has-bg");
      cover.style.background = "";
      cover.style.removeProperty("--cover-bg-image");
      cover.style.removeProperty("--cover-bg-pos");
    }

    const bgVar = cover.style.getPropertyValue("--cover-bg-image").trim();
    const legacyBgUrl = extractDataUrlFromBackground(cover.style.background || "");
    if (!bgVar && legacyBgUrl) {
      const safe = legacyBgUrl.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      cover.style.setProperty("--cover-bg-image", `url("${safe}")`);
      if (!cover.style.getPropertyValue("--cover-bg-pos").trim()) {
        cover.style.setProperty("--cover-bg-pos", "50% 50%");
      }
    }
    const styleHasBg = cover.style.getPropertyValue("--cover-bg-image").trim() !== "";
    if (styleHasBg) cover.classList.add("page-web-cover-has-bg");

    let bg =
      (Array.from(cover.children).find((node) =>
        (node as HTMLElement).classList?.contains("page-web-cover-bg")
      ) as HTMLElement | undefined) ?? null;
    if (!bg) {
      bg = document.createElement("div");
      bg.className = "page-web-cover-bg";
      bg.setAttribute("aria-hidden", "true");
      const inner =
        (Array.from(cover.children).find((node) =>
          (node as HTMLElement).classList?.contains("page-web-cover-inner")
        ) as HTMLElement | undefined) ?? null;
      if (inner?.parentElement === cover) cover.insertBefore(bg, inner);
      else cover.prepend(bg);
    }

    if (!bg.querySelector(".page-web-cover-blob-layer--blue")) {
      bg.appendChild(makeBlobLayer("blue"));
      if (debugEnabled) console.log("[cover-sync] added blue blob layer");
    }
    if (!bg.querySelector(".page-web-cover-blob-layer--red")) {
      bg.appendChild(makeBlobLayer("red"));
      if (debugEnabled) console.log("[cover-sync] added red blob layer");
    }
    cover.setAttribute("data-cover-bg-ready", "1");

    if (debugEnabled && typeof window !== "undefined") {
      const type = cover.getAttribute("data-cover-type") || "unknown";
      const hasBg = !!cover.querySelector(":scope > .page-web-cover-bg");
      const blue = cover.querySelector(".page-web-cover-blob--blue") as HTMLElement | null;
      const red = cover.querySelector(".page-web-cover-blob--red") as HTMLElement | null;
      const blueAnim = blue ? window.getComputedStyle(blue).animationName : "none";
      const redAnim = red ? window.getComputedStyle(red).animationName : "none";
      const splitAfter = window.getComputedStyle(cover, "::after");
      console.log("[cover-sync] cover-state", {
        type,
        hasBg,
        blueAnim,
        redAnim,
        splitAfterBgImage: splitAfter.backgroundImage,
        splitAfterWidth: splitAfter.width,
      });
    }
  });

  // Клиентский рендер (публичная страница/предпросмотр) не проходит через редакторные normalize-*,
  // поэтому выставляем data-timeline-has-next здесь, чтобы CSS линий работал 1:1 как в админке.
  const timelines = Array.from(root.querySelectorAll(".page-web-timeline")) as HTMLElement[];
  timelines.forEach((timeline) => {
    const items = Array.from(timeline.querySelectorAll(":scope > .page-web-timeline-item")) as HTMLElement[];
    items.forEach((item, idx) => {
      const nextVal = idx + 1 < items.length ? "1" : "0";
      if (item.getAttribute("data-timeline-has-next") !== nextVal) {
        item.setAttribute("data-timeline-has-next", nextVal);
      }
    });

    // Общая линия таймлайна должна идти строго от первой точки до последней
    // (горизонтально на desktop, вертикально на mobile — через CSS).
    const dots = Array.from(timeline.querySelectorAll(":scope .page-web-timeline-dot")) as HTMLElement[];
    if (dots.length >= 2) {
      const timelineRect = timeline.getBoundingClientRect();
      const firstRect = dots[0].getBoundingClientRect();
      const lastRect = dots[dots.length - 1].getBoundingClientRect();
      const leftPx = Math.max(0, firstRect.left + firstRect.width / 2 - timelineRect.left);
      const rightPx = Math.max(0, timelineRect.right - (lastRect.left + lastRect.width / 2));
      const topPx = Math.max(0, firstRect.top + firstRect.height / 2 - timelineRect.top);
      const bottomPx = Math.max(0, timelineRect.bottom - (lastRect.top + lastRect.height / 2));
      timeline.style.setProperty("--timeline-line-left", `${leftPx}px`);
      timeline.style.setProperty("--timeline-line-right", `${rightPx}px`);
      timeline.style.setProperty("--timeline-line-top", `${topPx}px`);
      timeline.style.setProperty("--timeline-line-bottom", `${bottomPx}px`);
    } else {
      timeline.style.removeProperty("--timeline-line-left");
      timeline.style.removeProperty("--timeline-line-right");
      timeline.style.removeProperty("--timeline-line-top");
      timeline.style.removeProperty("--timeline-line-bottom");
    }
  });
}

export function getTimelineRenderCss(scope: string): string {
  return `
${scope} .page-web-timeline { --timeline-dot-size: 0.8rem; --timeline-line-size: 2px; --timeline-gap: 1rem; position: relative; width: 100%; margin: 0 0 1.25rem; padding-top: 1rem; display: grid; grid-template-columns: repeat(var(--timeline-cols, 3), minmax(0, 1fr)); gap: 0.7rem var(--timeline-gap); box-sizing: border-box; }
${scope} .page-web-timeline::before { content: ""; position: absolute; left: var(--timeline-line-left, 0); right: var(--timeline-line-right, 0); top: var(--timeline-line-top, 50%); height: var(--timeline-line-size); transform: translateY(-50%); background: #cbd5e1; pointer-events: none; z-index: 1; }
${scope} .page-web-timeline-head { grid-column: 1 / -1; margin: 0 0 0.6rem; display: grid; gap: 0; text-align: center; }
${scope} .page-web-timeline-subtitle { margin: 0; color: #b91c1c; font-size: 1rem; line-height: 1; font-weight: 600; }
${scope} .page-web-timeline-heading { margin: 0; color: #496db3; font-size: var(--site-blue-title-fs, 2.25rem); line-height: var(--site-blue-title-lh, 2.25rem); letter-spacing: -0.02em; font-weight: 600; }
${scope} .page-web-timeline-subtitle + .page-web-timeline-heading { margin-top: var(--site-red-blue-gap, -0.375rem); }
${scope} .page-web-timeline-description { margin: 0; color: #64748b; font-size: inherit; line-height: 1.5; }
${scope} .page-web-timeline-heading + .page-web-timeline-description { margin-top: 1rem; }
${scope} .page-web-timeline-item {
  position: relative;
  min-height: 0;
  display: grid;
  grid-template-rows: minmax(8.5rem, 1fr) var(--timeline-dot-size) minmax(8.5rem, 1fr);
  row-gap: 0.4rem;
  align-content: stretch;
  align-items: stretch;
}
${scope} .page-web-timeline-item::before { content: none; display: none; }
${scope} .page-web-timeline-item[data-timeline-has-next="1"]::before,
${scope} .page-web-timeline-item:not([data-timeline-has-next="0"]):not(:last-of-type)::before,
${scope} .page-web-timeline-item[data-timeline-has-next="0"]::before { content: none !important; display: none !important; width: 0 !important; height: 0 !important; }
${scope} .page-web-timeline-term {
  position: relative;
  z-index: 3;
  margin: 0;
  padding: 0 0.15rem;
  font-size: 1rem;
  font-weight: 600;
  color: #64748b;
  line-height: 1.25;
  white-space: normal;
  background: transparent;
  text-align: center;
  grid-row: 1;
  align-self: end;
  justify-self: center;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  max-width: 100%;
  min-height: 0;
  height: auto;
}
${scope} .page-web-timeline-dot { position: relative; left: auto; top: auto; transform: none; width: var(--timeline-dot-size); height: var(--timeline-dot-size); border-radius: 9999px; background: #496db3; box-shadow: 0 0 0 3px #e2e8f0; z-index: 2; grid-row: 2; justify-self: center; align-self: center; }
${scope} .page-web-timeline-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  padding: 0.6rem 0.7rem;
  margin: 0;
  text-align: center;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #ffffff;
  grid-row: 3;
  align-self: stretch;
  justify-self: center;
  height: 100%;
  box-sizing: border-box;
}
${scope} .page-web-timeline-item:nth-of-type(odd):not(:first-of-type) > .page-web-timeline-term {
  grid-row: 3;
  align-self: start;
  margin: 0;
  align-items: flex-start;
}
${scope} .page-web-timeline-item:nth-of-type(odd):not(:first-of-type) > .page-web-timeline-content {
  grid-row: 1;
  align-self: stretch;
  justify-self: center;
  margin: 0;
}
${scope} .page-web-timeline-title { margin: 0; font-size: 1.75rem; font-weight: 700; color: #0f172a; line-height: 1.45; text-align: center; }
${scope} .page-web-timeline-text { margin: 0; font-size: 1.75rem; color: #475569; line-height: 1.5; text-align: center; }
${scope} .page-web-timeline[data-timeline-show-term="0"] .page-web-timeline-term { display: none !important; }
${scope} .page-web-timeline[data-timeline-show-title="0"] .page-web-timeline-title { display: none !important; }
${scope} .page-web-timeline[data-timeline-show-text="0"] .page-web-timeline-text { display: none !important; }
@media (max-width: 1205px) {
${scope} .page-web-timeline { grid-template-columns: 1fr; --timeline-gap: 0.65rem; --timeline-term-col: 4.6rem; gap: var(--timeline-gap); position: relative; }
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
${scope} .page-web-timeline-subtitle { font-size: 1rem; line-height: 1; }
${scope} .page-web-timeline-heading { font-size: var(--site-blue-title-fs, 2.25rem); line-height: var(--site-blue-title-lh, 2.25rem); }
${scope} .page-web-timeline-description { font-size: inherit; line-height: inherit; }
${scope} .page-web-timeline-item { min-height: 0; padding-top: 0; padding-left: 0; display: grid; grid-template-columns: var(--timeline-term-col) 1.9rem minmax(0, 1fr); column-gap: 0.35rem; grid-template-rows: none; row-gap: 0; align-items: center; position: relative; z-index: 2; }
${scope} .page-web-timeline[data-timeline-show-term="0"] .page-web-timeline-item { grid-template-columns: 0 1.9rem minmax(0, 1fr); }
${scope} .page-web-timeline-item::before,
${scope} .page-web-timeline-item::after { content: none; display: none; }
${scope} .page-web-timeline-item:not(:last-of-type)::before,
${scope} .page-web-timeline-item:not(:first-of-type)::after { content: none !important; display: none !important; width: 0 !important; height: 0 !important; }
${scope} .page-web-timeline-dot { position: static; left: auto; top: auto; transform: none; grid-column: 2; grid-row: 1; justify-self: center; align-self: center; z-index: 3; }
${scope} .page-web-timeline-term {
  position: static;
  transform: none;
  margin: 0;
  padding: 0 0.1rem 0 0;
  background: transparent;
  grid-column: 1;
  grid-row: 1;
  align-self: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: right;
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  justify-self: end;
  min-height: 0;
  height: auto;
  width: 100%;
  max-width: var(--timeline-term-col);
}
${scope} .page-web-timeline-content { grid-column: 3; grid-row: 1; align-self: center; align-items: flex-start; text-align: left; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 0.6rem 0.7rem; box-sizing: border-box; }
${scope} .page-web-timeline-item:nth-of-type(odd):not(:first-of-type) > .page-web-timeline-term { grid-row: 1; align-self: center; margin: 0; align-items: center; }
${scope} .page-web-timeline-item:nth-of-type(odd):not(:first-of-type) > .page-web-timeline-content { grid-row: 1; align-self: center; justify-self: stretch; margin: 0; }
${scope} .page-web-timeline-title,
${scope} .page-web-timeline-text { text-align: left; }
${scope} .page-web-timeline-title { font-size: 1.28rem; line-height: 1.35; }
${scope} .page-web-timeline-text { font-size: 1.3rem; line-height: 1.5; }
}
`;
}

export function getWorkPricingRenderCss(scope: string): string {
  return `
${scope} .page-web-work-pricing .wrc { margin-inline: auto; }
${scope} .page-web-work-pricing .wrh { margin-top: 0; }
${scope} .page-web-work-pricing .wrp { max-width: 42rem; }
${scope} .page-web-work-pricing .wse { border-radius: 1.5rem; }
${scope} .page-web-work-pricing .wtv { --tw-ring-color: #cbd5e1; }
${scope} .page-web-work-pricing .wtt { border: 2px solid var(--tw-ring-color, #cbd5e1); box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08); overflow: hidden; background: #ffffff; background-clip: padding-box; }
${scope} .page-web-work-pricing .wrc.wse.wtt { background: #ffffff; }
${scope} .page-web-work-pricing .wsp { padding: 2rem 1.5rem; }
${scope} .page-web-work-pricing .wui { width: 100%; }
${scope} .page-web-work-pricing .wuu { display: grid; align-content: start; gap: 1rem; }
${scope} .page-web-work-pricing .wsx { margin: 0; color: #496db3; font-size: var(--site-blue-title-fs, 2.25rem); line-height: var(--site-blue-title-lh, 2.25rem); letter-spacing: -0.02em; font-weight: 600; }
${scope} .page-web-work-pricing h3.wsx.wto { color: #496db3 !important; }
${scope} .page-web-work-pricing .wre { margin: 0; }
${scope} .page-web-work-pricing .wta { line-height: 1.6; }
${scope} .page-web-work-pricing .wtn { color: #4b5563; }
${scope} .page-web-work-pricing .wrg { display: flex; }
${scope} .page-web-work-pricing .wrj { align-items: center; }
${scope} .page-web-work-pricing .wrx { margin-top: 0.25rem; }
${scope} .page-web-work-pricing .wsc { gap: 0.7rem; }
${scope} .page-web-work-pricing .wru { font-size: 0.94rem; }
${scope} .page-web-work-pricing .wtd { line-height: 1.35; }
${scope} .page-web-work-pricing .wtg { font-weight: 700; }
${scope} .page-web-work-pricing .wtq { color: #b91c1c; }
${scope} .page-web-work-pricing .wrm { flex: 1 1 0%; display: flex; align-items: center; }
${scope} .page-web-work-pricing .wrt { height: 1px; margin: 0; position: relative; top: 0; }
${scope} .page-web-work-pricing .wsh { background: #e5e7eb; }
${scope} .page-web-work-pricing .wrf { margin: 0; padding: 0 !important; list-style: none !important; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
${scope} .page-web-work-pricing .wrk { gap: 0.75rem 1rem; }
${scope} .page-web-work-pricing .wrv { color: #111827; }
${scope} .page-web-work-pricing .wrz { line-height: 1.5; }
${scope} .page-web-work-pricing .wug { margin-top: 0.25rem; }
${scope} .page-web-work-pricing .wuh { font-size: inherit; }
${scope} .page-web-work-pricing .wsb { display: flex; gap: 0.5rem; align-items: center; color: #111827; }
${scope} .page-web-work-pricing .wrf > li::before { content: none !important; display: none !important; }
${scope} .page-web-work-pricing .wrl { width: 1rem; display: inline-block; }
${scope} .page-web-work-pricing .wrn { height: 1rem; color: #496db3; stroke: currentColor; stroke-width: 1.2; }
${scope} .page-web-work-pricing .wrd { background: #f3f4f6; padding: 0.8rem; display: flex; align-items: center; }
${scope} .page-web-work-pricing .wso { align-items: center; }
${scope} .page-web-work-pricing .wup { border-radius: 1rem; }
${scope} .page-web-work-pricing .wur { width: 100%; }
${scope} .page-web-work-pricing .wus { text-align: center; }
${scope} .page-web-work-pricing .wuv { justify-content: center; }
${scope} .page-web-work-pricing .wsd { border-radius: 1rem; }
${scope} .page-web-work-pricing .wsg { background: #f3f4f6; }
${scope} .page-web-work-pricing .wsu { width: 100%; }
${scope} .page-web-work-pricing .wsw { display: grid; }
${scope} .page-web-work-pricing .wtu { justify-items: center; }
${scope} .page-web-work-pricing .wtx { align-content: center; }
${scope} .page-web-work-pricing .wuw { gap: 0.85rem; }
${scope} .page-web-work-pricing .wux { padding: 1.2rem 1rem; }
${scope} .page-web-work-pricing .wuz { text-align: center; }
${scope} .page-web-work-pricing .wrs { width: 100%; max-width: none; }
${scope} .page-web-work-pricing .wss { margin-inline: auto; }
${scope} .page-web-work-pricing .wsz { color: #4b5563; font-size: 0.95rem; line-height: 1.4; font-weight: 600; }
${scope} .page-web-work-pricing .wrw { justify-content: center; }
${scope} .page-web-work-pricing .wry { gap: 0.35rem; }
${scope} .page-web-work-pricing .wsa { margin-top: 0.1rem; }
${scope} .page-web-work-pricing .wre.wrj.wrw.wry.wsa { justify-content: center !important; align-items: baseline; width: 100%; margin-inline: auto; text-align: center; }
${scope} .page-web-work-pricing .wsy { font-size: var(--site-blue-title-fs, 2.25rem); line-height: var(--site-blue-title-lh, 2.25rem); letter-spacing: -0.02em; }
${scope} .page-web-work-pricing .wsy.wth { font-weight: 600; }
${scope} .page-web-work-pricing .wsy.wto { color: #496db3 !important; }
${scope} .page-web-work-pricing .wth { font-weight: 600; }
${scope} .page-web-work-pricing .wto { color: #111827; }
${scope} .page-web-work-pricing .wti { font-size: var(--site-blue-title-fs, 2.25rem) !important; line-height: var(--site-blue-title-lh, 2.25rem) !important; }
${scope} .page-web-work-pricing .wri { width: auto; }
${scope} .page-web-work-pricing .wro { margin-top: 0.15rem; }
${scope} .page-web-work-pricing .wsf { justify-content: center; }
${scope} .page-web-work-pricing .wsl { border-radius: 0.58rem; }
${scope} .page-web-work-pricing .wsq { border: 1px solid #4f46e5; }
${scope} .page-web-work-pricing .wst { background: #4f46e5; }
${scope} .page-web-work-pricing .wtc { color: #fff; }
${scope} .page-web-work-pricing .wtr { font-size: 1.28rem; }
${scope} .page-web-work-pricing .wts { line-height: 1; }
${scope} .page-web-work-pricing .wua { font-weight: 700; }
${scope} .page-web-work-pricing .wub { text-decoration: none; }
${scope} .page-web-work-pricing .wuc { padding: 1rem 1.6rem; }
${scope} .page-web-work-pricing .wue { display: inline-flex; }
${scope} .page-web-work-pricing .wue,
${scope} .page-web-work-pricing a.wrg.wri.wro.wsf.wsl.wsq.wst.wsw.wtc.wtg.wtr.wts.wua.wub.wuc.wue { width: auto !important; }
${scope} .page-web-work-pricing .wte { margin-top: 0.85rem; font-size: 0.88rem; line-height: 1.5; color: #6b7280; }
${scope} .page-web-work-pricing .wue { background: #496db3 !important; border-color: #496db3 !important; color: #ffffff !important; }
${scope} .page-web-work-pricing .wue:hover { background: #3f5f9b !important; border-color: #3f5f9b !important; color: #ffffff !important; }
${scope} .page-web-work-pricing a.wrg.wri.wro.wsf.wsl.wsq.wst.wsw.wtc.wtg.wtr.wts.wua.wub.wuc.wue { background: #496db3 !important; border-color: #496db3 !important; color: #ffffff !important; }
${scope} .page-web-work-pricing a.wrg.wri.wro.wsf.wsl.wsq.wst.wsw.wtc.wtg.wtr.wts.wua.wub.wuc.wue:hover { background: #3f5f9b; border-color: #3f5f9b; }
@media (max-width: 1205px) {
${scope} .page-web-work-pricing .wrc { width: calc(100% - 0.5rem); max-width: none; margin-inline: 0.25rem; }
${scope} .page-web-work-pricing .wrp { max-width: none; }
${scope} .page-web-work-pricing .wrf { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.85rem 0.9rem; }
${scope} .page-web-work-pricing .wsp { padding: 1.5rem 1.15rem; }
${scope} .page-web-work-pricing .wrd { padding: 0.8rem; }
${scope} .page-web-work-pricing .wsx { font-size: var(--site-blue-title-fs, 2.25rem); line-height: var(--site-blue-title-lh, 2.25rem); }
${scope} .page-web-work-pricing .wre,
${scope} .page-web-work-pricing .wta,
${scope} .page-web-work-pricing .wtn { font-size: 1.2rem; line-height: 1.5; }
${scope} .page-web-work-pricing .wru,
${scope} .page-web-work-pricing .wtq { font-size: 1.2rem; line-height: 1.35; }
${scope} .page-web-work-pricing .wuh { font-size: 1.14rem; line-height: 1.45; }
${scope} .page-web-work-pricing .wsz { font-size: 1.15rem; line-height: 1.4; }
${scope} .page-web-work-pricing .wsy { font-size: var(--site-blue-title-fs, 2.25rem); line-height: var(--site-blue-title-lh, 2.25rem); }
${scope} .page-web-work-pricing .wti { font-size: var(--site-blue-title-fs, 2.25rem) !important; line-height: var(--site-blue-title-lh, 2.25rem) !important; }
${scope} .page-web-work-pricing .wtr { font-size: 1.28rem; line-height: 1; }
${scope} .page-web-work-pricing .wri { width: auto; }
${scope} .page-web-work-pricing .wuc { padding: 1rem 1.6rem; }
${scope} .page-web-work-pricing .wte { font-size: 1.04rem; line-height: 1.5; }
}
@media (min-width: 1024px) {
${scope} .page-web-work-pricing .wut { max-width: none; }
${scope} .page-web-work-pricing .wuq { display: flex; }
${scope} .page-web-work-pricing .wuo { margin-inline: 0; }
${scope} .page-web-work-pricing .wsp { flex: 1 1 auto; padding: 2rem 2rem 2.25rem; }
${scope} .page-web-work-pricing .wrd { flex: 0 0 36%; min-width: 17.5rem; }
}
@media (min-width: 640px) {
${scope} .page-web-work-pricing .wuf { margin-top: 0; }
}
`;
}

export function getPageShowRenderCss(scope: string): string {
  return `
@keyframes heroPoliceBlobA {
  0%, 24% { opacity: 0.46; filter: brightness(1.08) saturate(1.14); }
  30% { opacity: 0.4; filter: brightness(1.06) saturate(1.11); }
  36% { opacity: 0.3; filter: brightness(1.04) saturate(1.08); }
  42% { opacity: 0.2; filter: brightness(1.02) saturate(1.04); }
  48% { opacity: 0.12; filter: brightness(1.01) saturate(1.02); }
  54%, 74% { opacity: 0.07; filter: brightness(1) saturate(1); }
  80% { opacity: 0.14; filter: brightness(1.02) saturate(1.03); }
  86% { opacity: 0.28; filter: brightness(1.05) saturate(1.08); }
  92% { opacity: 0.4; filter: brightness(1.07) saturate(1.12); }
  100% { opacity: 0.46; filter: brightness(1.08) saturate(1.14); }
}
@keyframes heroPoliceBlobB {
  0%, 24% { opacity: 0.07; filter: brightness(1) saturate(1); }
  30% { opacity: 0.13; filter: brightness(1.02) saturate(1.03); }
  36% { opacity: 0.22; filter: brightness(1.04) saturate(1.07); }
  42% { opacity: 0.32; filter: brightness(1.06) saturate(1.1); }
  48% { opacity: 0.4; filter: brightness(1.07) saturate(1.12); }
  54%, 74% { opacity: 0.46; filter: brightness(1.08) saturate(1.14); }
  80% { opacity: 0.36; filter: brightness(1.06) saturate(1.1); }
  86% { opacity: 0.22; filter: brightness(1.03) saturate(1.05); }
  92% { opacity: 0.12; filter: brightness(1.01) saturate(1.02); }
  100% { opacity: 0.07; filter: brightness(1) saturate(1); }
}
${scope} .page-web-cover { width: calc(100% + 2rem); max-width: none; margin: 0 -1rem; border-radius: 0; }
${scope} .page-web-cover { position: relative; display: flex; flex-direction: column; padding: 0; background: #f1f5f9; box-sizing: border-box; overflow: visible; }
${scope} > .page-web-cover:first-child { margin-top: 0 !important; border-top-left-radius: 0; border-top-right-radius: 0; }
${scope} .page-web-cover.page-web-cover-has-bg { background-color: #e2e8f0; }
${scope} .page-web-cover[data-cover-type="split"].page-web-cover-has-bg { background: #f1f5f9 !important; }
${scope} .page-web-cover[data-cover-type="split"]::before { content: ""; position: absolute; inset: 0; z-index: 1; pointer-events: none; background: linear-gradient(90deg, rgba(248,250,252,0.02) 0%, rgba(248,250,252,0.2) 55%, rgba(248,250,252,0.7) 69%, rgba(248,250,252,0.08) 76%); }
${scope} .page-web-cover[data-cover-type="split"]::after { content: ""; position: absolute; top: 0; right: 0; bottom: 0; width: 50% !important; z-index: 1; pointer-events: none; background: #cbd5e1; border-left: 1px solid rgba(148, 163, 184, 0.75); }
${scope} .page-web-cover[data-cover-type="split"].page-web-cover-has-bg::after { background-image: var(--cover-bg-image); background-size: cover; background-position: var(--cover-bg-pos, 50% 50%); background-repeat: no-repeat; }
${scope} .page-web-cover-bg { position: absolute; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; border-radius: inherit; }
${scope} .page-web-cover[data-cover-type="image"] .page-web-cover-bg { display: none; }
${scope} .page-web-cover[data-cover-type="split"] > .page-web-cover-bg {
  display: block;
  width: 50%;
  right: auto;
}
${scope} .page-web-cover-bg::before,
${scope} .page-web-cover-bg::after {
  content: none !important;
  display: none !important;
}
${scope} .page-web-cover:not([data-cover-type="split"]):not([data-cover-type="image"])::before,
${scope} .page-web-cover:not([data-cover-type="split"]):not([data-cover-type="image"])::after {
  content: none !important;
  display: none !important;
}
${scope} .page-web-cover[data-cover-type="image"]::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background-image: var(--cover-bg-image);
  background-size: cover;
  background-position: var(--cover-bg-pos, 50% 50%);
  background-repeat: no-repeat;
  transform: scale(1.03);
  transform-origin: center;
  filter: blur(4px) saturate(1.02);
}
${scope} .page-web-cover[data-cover-type="image"]::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.26) 0%, rgba(248, 250, 252, 0.18) 100%);
}
${scope} .page-web-cover-el-title { font-size: var(--site-blue-title-fs, 2.25rem); line-height: var(--site-blue-title-lh, 2.25rem); }
${scope} .page-web-cover-el-subtitle { font-size: 1rem; }
${scope} .page-web-cover-blob-layer { position: absolute; inset-inline: 0; top: -6rem; z-index: 0; pointer-events: none; transform: translateZ(0); filter: blur(64px); }
${scope} .page-web-cover-blob { position: relative; width: 36rem; aspect-ratio: 1155 / 678; will-change: opacity, filter; clip-path: polygon(74.1% 44.1%,100% 61.6%,97.5% 26.9%,85.5% 0.1%,80.7% 2%,72.5% 32.5%,60.2% 62.4%,52.4% 68.1%,47.5% 58.3%,45.2% 34.5%,27.5% 76.7%,0.1% 64.9%,17.9% 100%,27.6% 76.8%,76.1% 97.7%,74.1% 44.1%); }
${scope} .page-web-cover-blob--blue { left: 50%; transform: translateX(-50%) rotate(20deg); background: linear-gradient(to top right, #496db3, #5f7ebe, #8aa9db); animation: heroPoliceBlobA 4.25s linear infinite; }
${scope} .page-web-cover-blob--red { left: calc(50% + 3rem); transform: translateX(-50%); background: linear-gradient(to top right, #b91c1c, #dc2626, #f87171); animation: heroPoliceBlobB 4.25s linear infinite; }
@media (min-width: 640px) {
${scope} .page-web-cover-blob { width: 72rem; }
${scope} .page-web-cover-blob--red { left: calc(50% + 24rem); }
}
${scope} .page-web-cover[data-cover-aspect="16-9"],
${scope} .page-web-cover:not([data-cover-aspect]) { aspect-ratio: 16 / 9; }
${scope} .page-web-cover[data-cover-aspect="4-3"] { aspect-ratio: 4 / 3; }
${scope} .page-web-cover[data-cover-aspect="21-9"] { aspect-ratio: 21 / 9; }
${scope} .page-web-cover[data-cover-aspect="1-1"] { aspect-ratio: 1 / 1; }
${scope} .page-web-cover[data-cover-aspect="1-8"] { aspect-ratio: 2 / 1; }
${scope} .page-web-cover[data-cover-aspect="1-4"] { aspect-ratio: 4 / 1; }
${scope} .page-web-cover[data-cover-aspect="3-1"] { aspect-ratio: 3 / 1; }
${scope} .page-web-cover[data-cover-aspect="6-1"] { aspect-ratio: 6 / 1; }
${scope} .page-web-cover[data-cover-aspect="8-1"] { aspect-ratio: 6 / 1; }
${scope} .page-web-cover .page-web-cover-inner { position: relative; z-index: 2; }
${scope} .page-web-cover[data-cover-type="split"] .page-web-cover-inner { width: 50%; padding-right: clamp(1.2rem, 3vw, 2rem); }
${scope} .page-web-text-block-content h3 { margin: 0 0 0.55rem; font-size: 1.2rem; line-height: 1.2; color: #0f172a; }
${scope} .page-web-text-block-content p { margin: 0; color: #475569; line-height: 1.55; }
${scope} .page-web-text-media-col h3 { margin: 0 0 0.55rem; font-size: 1.2rem; line-height: 1.2; color: #0f172a; }
${scope} .page-web-text-media-col p { margin: 0; color: #475569; line-height: 1.55; }
${scope} .page-web-text-media-placeholder { color: #64748b; font-size: 0.9rem; }
@media (max-width: 1205px) {
${scope} .page-web-cover { height: max-content; min-height: 0; aspect-ratio: auto !important; }
${scope} .page-web-cover .page-web-cover-inner { overflow: hidden; }
${scope} .page-web-cover[data-cover-aspect="1-8"][data-cover-type="hero"],
${scope} .page-web-cover[data-cover-aspect="1-8"][data-cover-type="image"] { aspect-ratio: 1 / 1; }
${scope} .page-web-cover[data-cover-aspect="6-1"][data-cover-type="hero"],
${scope} .page-web-cover[data-cover-aspect="6-1"][data-cover-type="image"],
${scope} .page-web-cover[data-cover-aspect="8-1"][data-cover-type="hero"],
${scope} .page-web-cover[data-cover-aspect="8-1"][data-cover-type="image"] { aspect-ratio: 2 / 1; }
${scope} .page-web-cover[data-cover-aspect="1-4"][data-cover-type="hero"],
${scope} .page-web-cover[data-cover-aspect="1-4"][data-cover-type="image"] { aspect-ratio: 1 / 1; }
${scope} .page-web-cover[data-cover-type="hero"] .page-web-cover-el-title,
${scope} .page-web-cover[data-cover-type="image"] .page-web-cover-el-title { font-size: var(--site-blue-title-fs, 2.25rem); line-height: var(--site-blue-title-lh, 2.25rem); }
${scope} .page-web-cover[data-cover-type="hero"] .page-web-cover-el-subtitle,
${scope} .page-web-cover[data-cover-type="image"] .page-web-cover-el-subtitle { font-size: 1rem; line-height: 1.4; }
${scope} .page-web-cover[data-cover-type="hero"] .page-web-cover-el-button,
${scope} .page-web-cover[data-cover-type="image"] .page-web-cover-el-button { font-size: 1.28rem; padding: 1rem 1.6rem; border-radius: 0.58rem; }
${scope} .page-web-cover[data-cover-type="split"] .page-web-cover-el-title { font-size: var(--site-blue-title-fs, 2.25rem); line-height: var(--site-blue-title-lh, 2.25rem); }
${scope} .page-web-cover[data-cover-type="split"] .page-web-cover-el-subtitle { font-size: 1rem; line-height: 1.4; }
${scope} .page-web-cover[data-cover-type="split"] .page-web-cover-el-button { font-size: 1.28rem; padding: 1rem 1.6rem; border-radius: 0.58rem; }
${scope} .page-web-cover[data-cover-type="split"] .page-web-cover-inner { width: 100%; padding-right: clamp(1rem, 4vw, 1.5rem); }
${scope} .page-web-cover[data-cover-type="split"]::before {
  background: rgba(248, 250, 252, 0.36) !important;
  -webkit-backdrop-filter: blur(3px) saturate(1.02) brightness(1.08);
  backdrop-filter: blur(3px) saturate(1.02) brightness(1.08);
  z-index: 2 !important;
}
${scope} .page-web-cover[data-cover-type="image"].page-web-cover-has-bg::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background: rgba(248, 250, 252, 0.36) !important;
  -webkit-backdrop-filter: blur(3px) saturate(1.02) brightness(1.08) !important;
  backdrop-filter: blur(3px) saturate(1.02) brightness(1.08) !important;
  filter: none !important;
  box-shadow: none !important;
  opacity: 1 !important;
}
${scope} .page-web-cover[data-cover-type="split"]::after {
  width: 100% !important;
  border-left: none;
  opacity: 1;
  background: rgba(203, 213, 225, 0.35) !important;
  z-index: 1 !important;
}
${scope} .page-web-cover[data-cover-type="split"].page-web-cover-has-bg::after {
  background-image: var(--cover-bg-image) !important;
  background-size: cover !important;
  background-position: var(--cover-bg-pos, 50% 50%) !important;
  background-repeat: no-repeat !important;
}
${scope} .page-web-cover[data-cover-type="split"] > .page-web-cover-bg { width: 100%; right: 0; }
${scope} .page-web-cover[data-cover-type="split"] .page-web-cover-blob-layer,
${scope} .page-web-cover[data-cover-type="split"] .page-web-cover-blob {
  display: none !important;
  animation: none !important;
}
${scope} .page-web-cover[data-cover-type="split"][data-cover-aspect="1-8"] { aspect-ratio: 1 / 1; }
${scope} .page-web-cover[data-cover-type="split"][data-cover-aspect="6-1"],
${scope} .page-web-cover[data-cover-type="split"][data-cover-aspect="8-1"] { aspect-ratio: 2 / 1; }
${scope} .page-web-cover[data-cover-type="split"][data-cover-aspect="1-4"] { aspect-ratio: 1 / 1; }
${scope} .page-web-text-media-col { min-height: 160px; }
}
@media (max-width: 1205px) {
${scope} .page-web-cover[data-cover-aspect="6-1"][data-cover-type="hero"],
${scope} .page-web-cover[data-cover-aspect="6-1"][data-cover-type="image"],
${scope} .page-web-cover[data-cover-type="split"][data-cover-aspect="6-1"],
${scope} .page-web-cover[data-cover-aspect="8-1"][data-cover-type="hero"],
${scope} .page-web-cover[data-cover-aspect="8-1"][data-cover-type="image"],
${scope} .page-web-cover[data-cover-type="split"][data-cover-aspect="8-1"] { aspect-ratio: 2 / 1; }
}
${scope} .page-web-cover,
${scope} .page-web-text-block,
${scope} .page-web-text-media,
${scope} .page-web-timeline,
${scope} .page-web-work-pricing,
${scope} .page-web-feature-grid {
  font-size: 1rem !important;
  line-height: 1.5 !important;
}
${scope} .page-web-cover *,
${scope} .page-web-text-block *,
${scope} .page-web-text-media *,
${scope} .page-web-timeline *,
${scope} .page-web-work-pricing *,
${scope} .page-web-feature-grid * {
  font-size: inherit !important;
}
`;
}

