export type WebElementsHAlign = "left" | "center" | "right" | "justify";

const WEB_ELEMENTS_FIELD_ROW_TEXTAREA_SELECTOR =
  "textarea.page-web-elements-subtitle-input, textarea.page-web-elements-title-input, textarea.page-web-elements-title2-input, textarea.page-web-elements-description-input";

const WORK_PRICING_HALIGN_ISLAND_SELECTOR =
  ".page-web-work-pricing .page-web-elements.page-web-elements-title, .page-web-work-pricing .page-web-elements.page-web-elements-title2, .page-web-work-pricing .page-web-elements.page-web-elements-subtitle, .page-web-work-pricing .page-web-elements.page-web-elements-description";

function readWorkPricingFieldHalign(ta: HTMLElement): WebElementsHAlign | null {
  const island = ta.closest(WORK_PRICING_HALIGN_ISLAND_SELECTOR) as HTMLElement | null;
  if (!island) return null;
  const raw = (island.getAttribute("data-work-pricing-halign") || "").trim().toLowerCase();
  if (raw === "justify" || raw === "center" || raw === "right" || raw === "left") return raw;
  return null;
}

function isWorkPricingPriceCardField(ta: HTMLElement): boolean {
  return Boolean(ta.closest(".page-web-work-pricing .wrc.wrs.wss"));
}

function isWorkPricingPriceCardMobileViewport(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(max-width: 1205px)").matches;
}

function applyWorkPricingFieldRowAlign(row: HTMLElement, ta: HTMLElement, align: WebElementsHAlign): void {
  if (align === "justify") {
    row.style.width = "100%";
    row.style.maxWidth = "100%";
    row.style.justifyContent = "flex-start";
    row.style.textAlign = "justify";
    ta.style.textAlign = "justify";
    if (ta instanceof HTMLTextAreaElement) {
      ta.style.width = "100%";
      ta.style.maxWidth = "100%";
    }
    return;
  }
  row.style.removeProperty("width");
  row.style.removeProperty("max-width");
  row.style.textAlign = align;
  webElementsFieldRowSetFlexJustify(row, align);
  ta.style.textAlign = align;
  if (ta instanceof HTMLTextAreaElement) {
    if (isWorkPricingPriceCardField(ta) && isWorkPricingPriceCardMobileViewport()) {
      ta.style.width = "100%";
      ta.style.maxWidth = "100%";
      ta.style.minWidth = "0";
    } else {
      ta.style.removeProperty("width");
      ta.style.removeProperty("max-width");
      ta.style.removeProperty("min-width");
    }
  }
}

/** На публичной странице ряд — flex; для `width: max-content` у textarea нужен justify-content на ряду, не только text-align. */
export function webElementsFieldRowSetFlexJustify(row: HTMLElement, align: WebElementsHAlign): void {
  if (align === "justify") {
    row.style.justifyContent = "flex-start";
    return;
  }
  row.style.justifyContent =
    align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center";
}

export function webElementsFieldRowClearFlexJustify(row: HTMLElement): void {
  row.style.removeProperty("justify-content");
}

/** Подставляет justify-content по уже сохранённому text-align (старые сохранения без justify). */
export function syncWebElementsFieldRowJustifyInRoot(root: ParentNode): void {
  root.querySelectorAll(".page-web-elements-field-row").forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    const ta = node.querySelector(WEB_ELEMENTS_FIELD_ROW_TEXTAREA_SELECTOR) as HTMLElement | null;
    if (!ta) return;
    const wpAlign = readWorkPricingFieldHalign(ta);
    if (wpAlign) {
      applyWorkPricingFieldRowAlign(node, ta, wpAlign);
      return;
    }
    const raw = (node.style.textAlign || ta.style.textAlign || "").trim().toLowerCase();
    if (raw === "justify") {
      node.style.width = "100%";
      node.style.maxWidth = "100%";
      node.style.justifyContent = "flex-start";
      node.style.textAlign = "justify";
      if (ta instanceof HTMLTextAreaElement) {
        ta.style.textAlign = "justify";
        ta.style.width = "100%";
        ta.style.maxWidth = "100%";
      }
      return;
    }
    if (raw !== "center" && raw !== "right" && raw !== "left") return;
    webElementsFieldRowSetFlexJustify(node, raw as WebElementsHAlign);
  });
}
