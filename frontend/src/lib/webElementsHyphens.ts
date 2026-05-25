/** Автоперенос по слогам для отдельных полей web-блоков (без justify). */

export const WEB_ELEMENTS_HYPHENS_ATTR = "data-web-elements-hyphens";
export const WEB_ELEMENTS_HYPHENS_AUTO = "auto";
export const WEB_ELEMENTS_HYPHENS_LANG = "ru";

const WEB_ELEMENTS_ISLAND_SELECTOR =
  ".page-web-elements.page-web-elements-title, .page-web-elements.page-web-elements-subtitle, .page-web-elements.page-web-elements-title2, .page-web-elements.page-web-elements-description";

const TEXT_BLOCK_FIELD_WRAP_SELECTOR =
  ".page-web-text-block-subtitle-field-wrap, .page-web-text-block-title-field-wrap, .page-web-text-block-lead-field-wrap";

const RICH_TEXT_HYPHEN_TAGS = "P,H1,H2,H3,H4,H5,H6,LI,BLOCKQUOTE";

export function readWebElementsHyphensEnabled(el: HTMLElement): boolean {
  return el.getAttribute(WEB_ELEMENTS_HYPHENS_ATTR) === WEB_ELEMENTS_HYPHENS_AUTO;
}

export function setWebElementsHyphensEnabled(el: HTMLElement, enabled: boolean): void {
  if (enabled) {
    el.setAttribute(WEB_ELEMENTS_HYPHENS_ATTR, WEB_ELEMENTS_HYPHENS_AUTO);
    el.setAttribute("lang", WEB_ELEMENTS_HYPHENS_LANG);
  } else {
    el.removeAttribute(WEB_ELEMENTS_HYPHENS_ATTR);
    if (el.getAttribute("lang") === WEB_ELEMENTS_HYPHENS_LANG) {
      el.removeAttribute("lang");
    }
  }
}

export function isHyphenatableRichTextBlock(el: HTMLElement): boolean {
  return RICH_TEXT_HYPHEN_TAGS.split(",").includes(el.tagName);
}

/** Остров web-elements или обёртка поля text-block для атрибута переноса. */
export function getHyphensTargetFromActiveField(active: HTMLElement): HTMLElement | null {
  if (
    active.matches(
      ".page-web-elements-subtitle-input, .page-web-elements-title-input, .page-web-elements-title2-input, .page-web-elements-description-input",
    )
  ) {
    return active.closest(WEB_ELEMENTS_ISLAND_SELECTOR) as HTMLElement | null;
  }
  if (
    active.matches(
      ".page-web-text-block-subtitle-input, .page-web-text-block-title-input, .page-web-text-block-lead-input",
    )
  ) {
    return active.closest(TEXT_BLOCK_FIELD_WRAP_SELECTOR) as HTMLElement | null;
  }
  return null;
}

export function getHyphensTargetFromNode(node: Node | null, editorRoot: HTMLElement): HTMLElement | null {
  if (!node) return null;
  let el: Element | null =
    node.nodeType === Node.TEXT_NODE ? (node.parentElement as Element | null) : (node as Element);
  while (el && el !== editorRoot) {
    if (!(el instanceof HTMLElement)) {
      el = el.parentElement;
      continue;
    }
    const fromField = getHyphensTargetFromActiveField(el);
    if (fromField) return fromField;
    if (isHyphenatableRichTextBlock(el)) return el;
    if (el.matches(WEB_ELEMENTS_ISLAND_SELECTOR)) return el;
    if (el.matches(TEXT_BLOCK_FIELD_WRAP_SELECTOR)) return el;
    el = el.parentElement;
  }
  return null;
}
