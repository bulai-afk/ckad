import { isWebElementsFieldJustified } from "@/lib/webElementsTextAlign";

/** Поля v2, для которых на полотне вызывается раскладка (редактор и публичный просмотр). */
export const WEB_ELEMENTS_V2_TEXTAREA_LAYOUT_SELECTOR =
  ".page-web-elements-subtitle-input, .page-web-elements-title-input, .page-web-elements-title2-input, .page-web-elements-description-input, textarea.page-web-elements-announcement-input, .page-web-accordion-question-input, .page-web-accordion-answer-input";

function isAnnouncementWebElementsField(el: HTMLElement): boolean {
  return Boolean(el.closest(".page-web-elements-announcement-strip"));
}

function resolveWebElementsTextareaCapPx(textarea: HTMLTextAreaElement): number {
  const island =
    textarea.closest(".page-web-elements.page-web-elements-title") ??
    textarea.closest(".page-web-elements.page-web-elements-title2") ??
    textarea.closest(".page-web-elements.page-web-elements-subtitle") ??
    textarea.closest(".page-web-elements.page-web-elements-description");
  const wIsland = island?.clientWidth ?? 0;
  if (Number.isFinite(wIsland) && wIsland > 0) return Math.floor(wIsland);
  const row = textarea.closest(".page-web-elements-field-row");
  const wRow = row?.clientWidth ?? 0;
  if (Number.isFinite(wRow) && wRow > 0) return Math.floor(wRow);
  const wPar = textarea.parentElement?.clientWidth ?? 0;
  return Number.isFinite(wPar) && wPar > 0 ? Math.floor(wPar) : 0;
}

/**
 * Ширина содержимого одной строки (для переносов по \n берём самую длинную логическую строку).
 * `scrollWidth` на `<textarea>` с width:0 даёт нестабильный результат; зеркало в DOM — надёжно.
 */
function measureWebElementsTextareaContentWidthPx(textarea: HTMLTextAreaElement): number {
  const doc = textarea.ownerDocument;
  const win = doc.defaultView;
  if (!win) return 0;
  const cs = win.getComputedStyle(textarea);
  const mirror = doc.createElement("span");
  mirror.setAttribute("aria-hidden", "true");
  mirror.style.cssText = [
    "position:absolute",
    "left:-99999px",
    "top:0",
    "visibility:hidden",
    "pointer-events:none",
    "white-space:pre",
    "box-sizing:border-box",
    `font:${cs.font || "inherit"}`,
    `letter-spacing:${cs.letterSpacing}`,
    `text-transform:${cs.textTransform}`,
    `padding:${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`,
  ].join(";");
  mirror.style.fontFamily = cs.fontFamily;
  mirror.style.fontSize = cs.fontSize;
  mirror.style.fontWeight = cs.fontWeight;
  mirror.style.fontStyle = cs.fontStyle;
  mirror.style.fontVariant = cs.fontVariant;
  mirror.style.lineHeight = cs.lineHeight;
  doc.body.appendChild(mirror);
  let maxW = 0;
  const raw = (textarea.value || "").replace(/\r\n/g, "\n");
  const lines = raw.length === 0 ? [""] : raw.split("\n");
  for (const line of lines) {
    mirror.textContent = line.length === 0 ? "\u00a0" : line;
    maxW = Math.max(maxW, mirror.offsetWidth);
  }
  if (raw.length === 0) {
    const ph = (textarea.getAttribute("placeholder") || "").trim();
    if (ph) {
      mirror.textContent = ph;
      maxW = Math.max(maxW, mirror.offsetWidth);
    }
  }
  doc.body.removeChild(mirror);
  return Math.ceil(maxW);
}

export function isAnnouncementInputVisuallyEmpty(el: HTMLElement): boolean {
  const raw = (el.innerText ?? el.textContent ?? "").replace(/\u200b/g, "");
  return raw.replace(/[\s\u00a0]+/g, "").length === 0;
}

/** Подсказка `data-placeholder` — как в редакторе страниц (через ::before). */
export function syncAnnouncementInputPlaceholder(el: HTMLElement): void {
  if (!el.matches(".page-web-elements-announcement-input")) return;
  if (isAnnouncementInputVisuallyEmpty(el)) {
    el.setAttribute("data-placeholder-visible", "1");
  } else {
    el.removeAttribute("data-placeholder-visible");
  }
}

/**
 * Подставляет текст анонса в contenteditable до отрисовки.
 * React при ре-рендере без children очищает contentEditable — вызывать в useLayoutEffect на каждый commit.
 */
export function syncAnnouncementInputFromModel(
  el: HTMLElement | null,
  text: string,
): void {
  if (!el || !el.matches(".page-web-elements-announcement-input")) return;
  if (document.activeElement === el) return;
  const next = text.trim();
  const current = (el.textContent ?? "").replace(/\u200b/g, "").trim();
  if (current !== next) {
    el.textContent = next;
  }
  syncAnnouncementInputPlaceholder(el);
  layoutWebElementsAnnouncementInput(el);
}

/** Плашка анонса (contenteditable): чистим инлайновую ширину, перенос задаёт CSS strip/input. */
export function layoutWebElementsAnnouncementInput(el: HTMLElement): void {
  if (!el.matches(".page-web-elements-announcement-input")) return;
  if (el instanceof HTMLTextAreaElement) {
    layoutWebElementsTextareaSize(el);
    return;
  }
  el.style.boxSizing = "border-box";
  el.style.removeProperty("width");
  el.style.removeProperty("min-width");
  el.style.removeProperty("max-width");
  el.style.removeProperty("height");
  const strip = el.closest(".page-web-elements-announcement-strip");
  if (strip instanceof HTMLElement) {
    strip.style.removeProperty("width");
  }
  syncAnnouncementInputPlaceholder(el);
}

export function layoutWebElementsAnnouncementInputsInRoot(root: ParentNode): void {
  root.querySelectorAll(".page-web-elements-announcement-input").forEach((n) => {
    if (!(n instanceof HTMLElement)) return;
    if (n instanceof HTMLTextAreaElement) return;
    layoutWebElementsAnnouncementInput(n);
  });
}

/**
 * Высота и ширина по содержимому (ширину задаём в px по зеркалу; CSS `max-content` на textarea ненадёжен).
 */
function isTimelineWebElementsTextarea(textarea: HTMLTextAreaElement): boolean {
  return Boolean(
    textarea.closest(
      ".page-web-timeline-head, .page-web-timeline-content, .page-web-timeline-term",
    ),
  );
}

function isFeatureGridCardTextarea(textarea: HTMLTextAreaElement): boolean {
  return Boolean(textarea.closest(".page-web-feature-grid-item"));
}

function isAccordionFaqTextarea(textarea: HTMLTextAreaElement): boolean {
  return Boolean(textarea.closest(".page-web-accordion-item"));
}

/** Подпись и цена в серой колонке: ширину даёт CSS (max-content + halign), не px по cap — иначе на mobile поле на всю ширину и текст «прилипает» влево. */
function isWorkPricingPriceCardTextarea(textarea: HTMLTextAreaElement): boolean {
  return Boolean(textarea.closest(".page-web-work-pricing .wrc.wrs.wss"));
}

export function layoutWebElementsTextareaSize(textarea: HTMLTextAreaElement): void {
  textarea.style.boxSizing = "border-box";

  if (isWebElementsFieldJustified(textarea)) {
    textarea.style.width = "100%";
    textarea.style.maxWidth = "100%";
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
    return;
  }

  if (isAnnouncementWebElementsField(textarea)) {
    textarea.style.width = "";
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
    return;
  }

  if (isTimelineWebElementsTextarea(textarea)) {
    /* Таймлайн на mobile: ширина из CSS (grid 1fr), не px по зеркалу — иначе при узкой
       колонке desktop-grid или до раскладки capPx ~20px и текст ломается по буквам. */
    textarea.style.width = "";
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
    return;
  }

  if (isFeatureGridCardTextarea(textarea)) {
    /* Карточки: ширина и высота из CSS (field-sizing: content), без px/scrollHeight с десктопа. */
    textarea.style.width = "";
    textarea.style.removeProperty("min-width");
    textarea.style.removeProperty("max-width");
    textarea.style.removeProperty("height");
    return;
  }

  if (isAccordionFaqTextarea(textarea)) {
    textarea.style.width = "100%";
    textarea.style.maxWidth = "100%";
    textarea.style.minWidth = "0";
    textarea.style.height = "auto";
    textarea.style.height = `${Math.max(textarea.scrollHeight, 20)}px`;
    return;
  }

  if (isWorkPricingPriceCardTextarea(textarea) && !isWebElementsFieldJustified(textarea)) {
    textarea.style.width = "";
    textarea.style.removeProperty("max-width");
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
    return;
  }

  if (textarea.closest(".page-web-feature-grid-message")) {
    /* Не задаём width в px: зеркало даёт одну «логическую» ширину, а перенос в textarea идёт по
       фактической ширине поля — получается рваный перенос при уже широкой рамке. Ширина —
       из CSS (max-content + field-sizing), здесь только высота. */
    textarea.style.width = "";
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
    return;
  }

  const capPx = resolveWebElementsTextareaCapPx(textarea);
  const measured = measureWebElementsTextareaContentWidthPx(textarea);
  const pad = 2;

  if (!Number.isFinite(capPx) || capPx <= 0) {
    const w = Math.max(measured + pad, 1);
    textarea.style.width = `${w}px`;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
    return;
  }

  const w = Math.min(Math.max(measured + pad, 1), capPx);
  textarea.style.width = `${w}px`;

  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight}px`;
}

/** Сбрасываем px-ширину после автолэйаута — иначе на mobile текст ломается по буквам. */
export function clearTimelineTextareaInlineWidthsInRoot(root: ParentNode): void {
  root.querySelectorAll(".page-web-timeline textarea").forEach((n) => {
    if (!(n instanceof HTMLTextAreaElement)) return;
    n.style.removeProperty("width");
    n.style.removeProperty("min-width");
    n.style.removeProperty("max-width");
  });
}

export function layoutWebElementsV2TextareasInRoot(root: ParentNode): void {
  clearTimelineTextareaInlineWidthsInRoot(root);
  root.querySelectorAll(WEB_ELEMENTS_V2_TEXTAREA_LAYOUT_SELECTOR).forEach((n) => {
    if (!(n instanceof HTMLTextAreaElement)) return;
    // Публичный просмотр помечает поля `readonly` (PageSlugClient), но высоту/ширину
    // по содержимому всё равно нужно — иначе остаётся UA-высота по `rows` и «полка» под текстом.
    if (n.disabled) return;
    layoutWebElementsTextareaSize(n);
  });
  layoutWebElementsAnnouncementInputsInRoot(root);
}
