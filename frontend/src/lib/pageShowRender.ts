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

