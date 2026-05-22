import type { WebElementsHAlign } from "@/lib/webElementsFieldRowJustify";

/** Выравнивание ряда кнопок: на cover — flex-колонка с align-items; иначе text-align на block. */
export function applyWebElementsActionsAlign(outer: HTMLElement, align: WebElementsHAlign): void {
  outer.style.textAlign = align;
  outer.style.removeProperty("justify-content");
  const cs = getComputedStyle(outer);
  const display = (cs.display || "").trim().toLowerCase();
  const flexDir = (cs.flexDirection || "").trim().toLowerCase();
  if (display === "flex" && (flexDir === "column" || flexDir === "column-reverse")) {
    outer.style.alignItems =
      align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center";
  } else {
    outer.style.removeProperty("align-items");
  }
}
