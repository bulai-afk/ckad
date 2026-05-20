export type WebElementsHAlign = "left" | "center" | "right";

const WEB_ELEMENTS_FIELD_ROW_TEXTAREA_SELECTOR =
  "textarea.page-web-elements-subtitle-input, textarea.page-web-elements-title-input, textarea.page-web-elements-title2-input, textarea.page-web-elements-description-input";

/** На публичной странице ряд — flex; для `width: max-content` у textarea нужен justify-content на ряду, не только text-align. */
export function webElementsFieldRowSetFlexJustify(row: HTMLElement, align: WebElementsHAlign): void {
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
    const raw = (node.style.textAlign || ta.style.textAlign || "").trim().toLowerCase();
    if (raw !== "center" && raw !== "right" && raw !== "left") return;
    webElementsFieldRowSetFlexJustify(node, raw as WebElementsHAlign);
  });
}
