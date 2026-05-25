import {
  webElementsFieldRowClearFlexJustify,
  webElementsFieldRowSetFlexJustify,
  type WebElementsHAlign,
} from "@/lib/webElementsFieldRowJustify";

export type WebElementsTextAlign = WebElementsHAlign;

export function parseToolbarTextAlign(raw: string): WebElementsTextAlign {
  const v = raw.trim().toLowerCase();
  if (v === "justify") return "justify";
  if (v === "center") return "center";
  if (v === "right" || v === "end") return "right";
  return "left";
}

export function toolbarAlignFromCommand(command: string): WebElementsTextAlign | null {
  if (command === "justifyLeft") return "left";
  if (command === "justifyCenter") return "center";
  if (command === "justifyRight") return "right";
  if (command === "justifyFull") return "justify";
  return null;
}

/** text-align на поле web-elements (+ flex-ряд для left/center/right, full width для justify). */
export function applyWebElementsFieldTextAlign(
  row: HTMLElement | null,
  field: HTMLElement,
  align: WebElementsTextAlign,
): void {
  if (align === "justify") {
    if (row) {
      row.style.width = "100%";
      row.style.maxWidth = "100%";
      row.style.justifyContent = "flex-start";
      row.style.textAlign = "justify";
    }
    field.style.textAlign = "justify";
    if (field instanceof HTMLTextAreaElement) {
      field.style.width = "100%";
      field.style.maxWidth = "100%";
    }
    return;
  }

  if (row) {
    row.style.removeProperty("width");
    row.style.removeProperty("max-width");
    row.style.textAlign = align;
    webElementsFieldRowSetFlexJustify(row, align);
  }
  field.style.textAlign = align;
  if (field instanceof HTMLTextAreaElement) {
    field.style.removeProperty("width");
    field.style.removeProperty("max-width");
  }
}

/** Инлайн `text-align` с textarea или с flex-ряда (пустая строка → null, не «left» по умолчанию). */
export function readWebElementsFieldTextAlign(
  field: HTMLElement,
  row: HTMLElement | null = field.closest(".page-web-elements-field-row"),
): WebElementsTextAlign | null {
  const taRaw = (field.style.textAlign || "").trim().toLowerCase();
  if (taRaw) return parseToolbarTextAlign(taRaw);
  if (row instanceof HTMLElement) {
    const rowRaw = (row.style.textAlign || "").trim().toLowerCase();
    if (rowRaw) return parseToolbarTextAlign(rowRaw);
  }
  return null;
}

export function isWebElementsFieldJustified(field: HTMLElement): boolean {
  return readWebElementsFieldTextAlign(field) === "justify";
}

export function clearWebElementsFieldTextAlignWidth(row: HTMLElement | null, field: HTMLElement): void {
  if (row) {
    row.style.removeProperty("width");
    row.style.removeProperty("max-width");
    webElementsFieldRowClearFlexJustify(row);
  }
  if (field instanceof HTMLTextAreaElement) {
    field.style.removeProperty("width");
    field.style.removeProperty("max-width");
  }
}
