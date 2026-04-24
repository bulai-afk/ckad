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

  const covers = Array.from(root.querySelectorAll(".page-web-cover")) as HTMLElement[];
  if (debugEnabled) {
    console.log("[cover-sync] found covers", covers.length);
  }
  covers.forEach((cover) => {
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
}

export function getTimelineRenderCss(scope: string): string {
  return `
${scope} .page-web-timeline { --timeline-dot-size: 0.8rem; --timeline-line-size: 2px; --timeline-term-gap: 1.35rem; --timeline-gap: 1rem; position: relative; width: 100%; margin: 0 0 1.25rem; padding-top: var(--timeline-term-gap); display: grid; grid-template-columns: repeat(var(--timeline-cols, 3), minmax(0, 1fr)); gap: var(--timeline-gap); box-sizing: border-box; }
${scope} .page-web-timeline-head { grid-column: 1 / -1; margin: 0 0 0.6rem; display: grid; gap: 0; text-align: center; }
${scope} .page-web-timeline-subtitle { margin: 0; color: #b91c1c; font-size: clamp(0.76rem, 1.15cqi, 0.88rem); line-height: 1; font-weight: 600; }
${scope} .page-web-timeline-heading { margin: 0; color: #496db3; font-size: clamp(0.98rem, 2.7cqi, 1.75rem); line-height: 1; letter-spacing: -0.02em; font-weight: 600; }
${scope} .page-web-timeline-subtitle + .page-web-timeline-heading { margin-top: -0.16rem; }
${scope} .page-web-timeline-description { margin: 0; color: #64748b; font-size: inherit; line-height: 1.5; }
${scope} .page-web-timeline-heading + .page-web-timeline-description { margin-top: 1rem; }
${scope} .page-web-timeline-item { position: relative; min-height: 1.5rem; padding-top: calc(var(--timeline-dot-size) + 0.35rem); }
${scope} .page-web-timeline-item::before { content: none; }
${scope} .page-web-timeline-item ~ .page-web-timeline-item::before { content: ""; position: absolute; top: calc(var(--timeline-dot-size) / 2 - var(--timeline-line-size) / 2); left: calc(-50% - var(--timeline-gap)); width: calc(100% + var(--timeline-gap)); height: var(--timeline-line-size); background: #cbd5e1; pointer-events: none; z-index: 1; }
${scope} .page-web-timeline-term { position: absolute; left: calc(0px - (var(--timeline-gap) / 2)); top: calc((var(--timeline-dot-size) / 2) - var(--timeline-term-gap)); transform: translateX(-50%); margin: 0; padding: 0 0.45rem; font-size: clamp(0.76rem, 1.15cqi, 0.88rem); font-weight: 600; color: #64748b; line-height: 1.25; white-space: nowrap; background: #fff; }
${scope} .page-web-timeline-dot { position: absolute; left: 50%; top: 0; transform: translateX(-50%); width: var(--timeline-dot-size); height: var(--timeline-dot-size); border-radius: 9999px; background: #496db3; box-shadow: 0 0 0 3px #e2e8f0; z-index: 2; }
${scope} .page-web-timeline-content { display: flex; flex-direction: column; align-items: center; gap: 0.2rem; padding-left: 0; text-align: center; }
${scope} .page-web-timeline-title { margin: 0; font-size: inherit; font-weight: 700; color: #0f172a; line-height: 1.5; text-align: center; }
${scope} .page-web-timeline-text { margin: 0; font-size: inherit; color: #475569; line-height: 1.5; text-align: center; }
@media (max-width: 767px) {
${scope} .page-web-timeline { grid-template-columns: 1fr; --timeline-gap: 1rem; }
${scope} .page-web-timeline-item { min-height: 0; padding-top: 0; padding-left: 1.5rem; }
${scope} .page-web-timeline-item::before { content: none; }
${scope} .page-web-timeline-item ~ .page-web-timeline-item::before { content: none; }
${scope} .page-web-timeline-item:not(:last-of-type)::before { content: ""; position: absolute; left: calc(var(--timeline-dot-size) / 2 - var(--timeline-line-size) / 2); top: calc(0.2rem + (var(--timeline-dot-size) / 2) - (var(--timeline-line-size) / 2)); width: var(--timeline-line-size); height: calc(100% + var(--timeline-gap)); background: #cbd5e1; pointer-events: none; z-index: 1; }
${scope} .page-web-timeline-dot { left: 0; top: 0.2rem; transform: none; }
${scope} .page-web-timeline-term { position: static; transform: none; margin: 0 0 0.35rem; padding: 0; background: transparent; text-align: left; }
${scope} .page-web-timeline-head { text-align: left; }
${scope} .page-web-timeline-content { align-items: flex-start; text-align: left; }
${scope} .page-web-timeline-title,
${scope} .page-web-timeline-text { text-align: left; }
}
`;
}

export function getWorkPricingRenderCss(scope: string): string {
  return `
${scope} .page-web-work-pricing .wrc { margin-inline: auto; }
${scope} .page-web-work-pricing .wrh { margin-top: 0; }
${scope} .page-web-work-pricing .wrp { max-width: 42rem; }
${scope} .page-web-work-pricing .wse { border-radius: 1.5rem; }
${scope} .page-web-work-pricing .wtv { --tw-ring-color: #e5e7eb; }
${scope} .page-web-work-pricing .wtt { box-shadow: 0 0 0 1px var(--tw-ring-color, #e5e7eb); }
${scope} .page-web-work-pricing .wrc.wse.wtt { background: #ffffff; }
${scope} .page-web-work-pricing .wsp { padding: 2rem 1.5rem; }
${scope} .page-web-work-pricing .wui { width: 100%; }
${scope} .page-web-work-pricing .wuu { display: grid; align-content: start; gap: 1rem; }
${scope} .page-web-work-pricing .wsx { margin: 0; color: #496db3; font-size: clamp(1.35rem, 2.9cqi, 2rem); line-height: 1.15; letter-spacing: -0.02em; }
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
${scope} .page-web-work-pricing .wrs { width: 100%; max-width: 16.5rem; }
${scope} .page-web-work-pricing .wss { margin-inline: auto; }
${scope} .page-web-work-pricing .wsz { color: #4b5563; font-size: 0.95rem; line-height: 1.4; font-weight: 600; }
${scope} .page-web-work-pricing .wrw { justify-content: center; }
${scope} .page-web-work-pricing .wry { gap: 0.35rem; }
${scope} .page-web-work-pricing .wsa { margin-top: 0.1rem; }
${scope} .page-web-work-pricing .wsy { font-size: clamp(1.85rem, 4.2cqi, 3rem); line-height: 1; letter-spacing: -0.02em; }
${scope} .page-web-work-pricing .wsy.wto { color: #496db3 !important; }
${scope} .page-web-work-pricing .wth { font-weight: 700; }
${scope} .page-web-work-pricing .wto { color: #111827; }
${scope} .page-web-work-pricing .wti { font-size: 0.9rem; }
${scope} .page-web-work-pricing .wri { width: 100%; }
${scope} .page-web-work-pricing .wro { margin-top: 0.15rem; }
${scope} .page-web-work-pricing .wsf { justify-content: center; }
${scope} .page-web-work-pricing .wsl { border-radius: 0.45rem; }
${scope} .page-web-work-pricing .wsq { border: 1px solid #4f46e5; }
${scope} .page-web-work-pricing .wst { background: #4f46e5; }
${scope} .page-web-work-pricing .wtc { color: #fff; }
${scope} .page-web-work-pricing .wtr { font-size: 0.92rem; }
${scope} .page-web-work-pricing .wts { line-height: 1.3; }
${scope} .page-web-work-pricing .wua { font-weight: 700; }
${scope} .page-web-work-pricing .wub { text-decoration: none; }
${scope} .page-web-work-pricing .wuc { padding: 0.58rem 0.86rem; }
${scope} .page-web-work-pricing .wue { display: inline-flex; }
${scope} .page-web-work-pricing .wte { margin-top: 0.85rem; font-size: 0.88rem; line-height: 1.5; color: #6b7280; }
${scope} .page-web-work-pricing .wue { background: #496db3 !important; border-color: #496db3 !important; color: #ffffff !important; }
${scope} .page-web-work-pricing .wue:hover { background: #3f5f9b !important; border-color: #3f5f9b !important; color: #ffffff !important; }
${scope} .page-web-work-pricing a.wrg.wri.wro.wsf.wsl.wsq.wst.wsw.wtc.wtg.wtr.wts.wua.wub.wuc.wue { background: #496db3 !important; border-color: #496db3 !important; color: #ffffff !important; }
${scope} .page-web-work-pricing a.wrg.wri.wro.wsf.wsl.wsq.wst.wsw.wtc.wtg.wtr.wts.wua.wub.wuc.wue:hover { background: #3f5f9b; border-color: #3f5f9b; }
@media (max-width: 767px) {
${scope} .page-web-work-pricing .wrf { grid-template-columns: minmax(0, 1fr); }
${scope} .page-web-work-pricing .wsp { padding: 1.25rem 1rem; }
${scope} .page-web-work-pricing .wrd { padding: 0.65rem; }
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
${scope} .page-web-cover:not([data-cover-type="split"])::before,
${scope} .page-web-cover:not([data-cover-type="split"])::after {
  content: none !important;
  display: none !important;
}
${scope} .page-web-cover-el-title { font-size: clamp(0.98rem, 2.7cqi, 1.75rem); }
${scope} .page-web-cover-el-subtitle { font-size: clamp(0.76rem, 1.15cqi, 0.88rem); }
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
${scope} .page-web-cover[data-cover-aspect="8-1"] { aspect-ratio: 8 / 1; }
${scope} .page-web-cover .page-web-cover-inner { position: relative; z-index: 2; }
${scope} .page-web-cover[data-cover-type="split"] .page-web-cover-inner { width: 50%; padding-right: clamp(1.2rem, 3vw, 2rem); }
${scope} .page-web-text-block-content h3 { margin: 0 0 0.55rem; font-size: 1.2rem; line-height: 1.2; color: #0f172a; }
${scope} .page-web-text-block-content p { margin: 0; color: #475569; line-height: 1.55; }
${scope} .page-web-text-media-col h3 { margin: 0 0 0.55rem; font-size: 1.2rem; line-height: 1.2; color: #0f172a; }
${scope} .page-web-text-media-col p { margin: 0; color: #475569; line-height: 1.55; }
${scope} .page-web-text-media-placeholder { color: #64748b; font-size: 0.9rem; }
@media (max-width: 767px) {
${scope} .page-web-cover[data-cover-type="split"] .page-web-cover-inner { width: 100%; padding-right: clamp(1rem, 4vw, 1.5rem); }
${scope} .page-web-cover[data-cover-type="split"]::before { background: linear-gradient(180deg, rgba(248,250,252,0.06) 0%, rgba(248,250,252,0.28) 48%, rgba(248,250,252,0.52) 100%); }
${scope} .page-web-cover[data-cover-type="split"]::after { width: 100% !important; border-left: none; opacity: 0.35; }
${scope} .page-web-cover[data-cover-type="split"] > .page-web-cover-bg { width: 100%; right: 0; }
${scope} .page-web-text-media-col { min-height: 160px; }
}
`;
}

