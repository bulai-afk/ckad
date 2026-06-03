/** FAQ-аккордеон: разделители между пунктами, +/- без рамок у карточек. */

import { layoutWebElementsV2TextareasInRoot } from "@/lib/webElementsTextareaLayout";

function escapeWebBlockHtmlText(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const WEB_ACCORDION_ICON_PLUS_HTML =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" data-slot="icon" aria-hidden="true" class="page-web-accordion-icon page-web-accordion-icon-plus" contenteditable="false">' +
  '<path d="M12 6v12m6-6H6" stroke-linecap="round" stroke-linejoin="round"></path></svg>';

let accordionPanelIdSeq = 0;

export function createWebAccordionPanelId(): string {
  accordionPanelIdSeq += 1;
  return `page-web-accordion-panel-${Date.now()}-${accordionPanelIdSeq}`;
}

function getWebAccordionIconsHtml(expanded: boolean): string {
  const minusHiddenAttr = expanded ? "" : " hidden";
  const minusIcon =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" data-slot="icon" aria-hidden="true" class="page-web-accordion-icon page-web-accordion-icon-minus" contenteditable="false"' +
    minusHiddenAttr +
    ">" +
    '<path d="M18 12H6" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
  return (
    '<span class="page-web-accordion-icons" aria-hidden="true" contenteditable="false">' +
    WEB_ACCORDION_ICON_PLUS_HTML +
    minusIcon +
    "</span>"
  );
}

export function getWebAccordionItemHtml(
  question: string,
  answer: string,
  opts?: { panelId?: string; expanded?: boolean },
): string {
  const panelId = opts?.panelId ?? createWebAccordionPanelId();
  const expanded = opts?.expanded === true;
  const collapsedAttr = expanded ? "" : ' data-collapsed="1"';
  const ariaExpanded = expanded ? "true" : "false";
  return (
    '<div class="page-web-accordion-item" contenteditable="false">' +
    '<dt contenteditable="false">' +
    '<button type="button" class="page-web-accordion-trigger" contenteditable="false" tabindex="-1" aria-expanded="' +
    ariaExpanded +
    '" aria-controls="' +
    panelId +
    '">' +
    '<span class="page-web-accordion-question" contenteditable="false">' +
    '<span class="page-web-elements-field-row">' +
    '<textarea class="page-web-accordion-question-input" spellcheck="true" placeholder="Вопрос" rows="1">' +
    escapeWebBlockHtmlText(question) +
    "</textarea></span></span>" +
    getWebAccordionIconsHtml(expanded) +
    "</button></dt>" +
    '<dd id="' +
    panelId +
    '" class="page-web-accordion-panel page-web-accordion-answer page-web-elements page-web-elements-description" contenteditable="false"' +
    collapsedAttr +
    ">" +
    '<span class="page-web-elements-field-row">' +
    '<textarea class="page-web-elements-description-input page-web-accordion-answer-input" spellcheck="true" placeholder="Ответ" rows="1">' +
    escapeWebBlockHtmlText(answer) +
    "</textarea></span></dd></div>"
  );
}

export function extractWebAccordionItemContent(item: HTMLElement): {
  question: string;
  answer: string;
  expanded: boolean;
  panelId: string | null;
} {
  let expanded = false;
  let panelId: string | null = null;

  if (item.tagName === "DETAILS") {
    expanded = item.hasAttribute("open");
  }

  const trigger = item.querySelector(":scope > dt > .page-web-accordion-trigger, :scope > .page-web-accordion-trigger") as HTMLElement | null;
  if (trigger) {
    expanded = trigger.getAttribute("aria-expanded") === "true";
    panelId = trigger.getAttribute("aria-controls");
  }

  const qTa = item.querySelector(
    "textarea.page-web-accordion-question-input, textarea.page-web-elements-title-input, .page-web-accordion-summary textarea",
  ) as HTMLTextAreaElement | null;
  const aTa = item.querySelector(
    "textarea.page-web-accordion-answer-input, textarea.page-web-elements-description-input, .page-web-accordion-answer textarea, .page-web-accordion-panel textarea",
  ) as HTMLTextAreaElement | null;

  const question = (qTa?.value ?? qTa?.textContent ?? item.querySelector(".page-web-accordion-summary")?.textContent ?? "")
    .replace(/[\u200b\u00a0]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const answer = (aTa?.value ?? aTa?.textContent ?? item.querySelector(".page-web-accordion-answer")?.textContent ?? "")
    .replace(/[\u200b\u00a0]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const panel = item.querySelector(":scope > dd.page-web-accordion-panel, :scope > .page-web-accordion-panel") as HTMLElement | null;
  if (panel?.id) panelId = panel.id;
  if (panel && panel.getAttribute("data-collapsed") !== "1" && !panel.hasAttribute("hidden")) expanded = true;
  if (item.tagName === "DETAILS" && item.hasAttribute("open")) expanded = true;

  return { question: question || "Вопрос", answer: answer || "Ответ", expanded, panelId };
}

export function webAccordionItemNeedsFaqMigration(item: HTMLElement): boolean {
  if (item.tagName === "DETAILS") return true;
  if (!item.querySelector(".page-web-accordion-trigger")) return true;
  if (!item.querySelector(".page-web-accordion-icon-plus")) return true;
  const panel = item.querySelector(":scope > dd.page-web-accordion-panel, :scope > .page-web-accordion-answer");
  if (!panel || panel.tagName !== "DD") return true;
  if (!item.querySelector(":scope > dt")) return true;
  return false;
}

export function syncWebAccordionItemExpandedUi(item: HTMLElement, expanded: boolean): void {
  const trigger = item.querySelector(".page-web-accordion-trigger") as HTMLElement | null;
  const panel = item.querySelector(
    ":scope > dd.page-web-accordion-panel, :scope > .page-web-accordion-panel, :scope > .page-web-accordion-answer",
  ) as HTMLElement | null;
  const plus = item.querySelector(".page-web-accordion-icon-plus") as SVGElement | null;
  const minus = item.querySelector(".page-web-accordion-icon-minus") as SVGElement | null;
  if (trigger) trigger.setAttribute("aria-expanded", expanded ? "true" : "false");
  if (panel) {
    panel.removeAttribute("hidden");
    if (expanded) panel.removeAttribute("data-collapsed");
    else panel.setAttribute("data-collapsed", "1");
  }
  if (plus) {
    if (expanded) plus.setAttribute("hidden", "");
    else plus.removeAttribute("hidden");
  }
  if (minus) {
    if (expanded) minus.removeAttribute("hidden");
    else minus.setAttribute("hidden", "");
  }
  if (expanded) {
    const root = item.closest(".page-content, .page-editor, .service-page-content-root") as HTMLElement | null;
    layoutWebElementsV2TextareasInRoot(panel ?? item);
    if (root) layoutWebElementsV2TextareasInRoot(root);
  }
}

function isWebAccordionItemExpanded(item: HTMLElement): boolean {
  const trigger = item.querySelector(".page-web-accordion-trigger") as HTMLElement | null;
  const panel = item.querySelector(
    ":scope > dd.page-web-accordion-panel, :scope > .page-web-accordion-panel, :scope > .page-web-accordion-answer",
  ) as HTMLElement | null;
  if (panel?.getAttribute("data-collapsed") === "1" || panel?.hasAttribute("hidden")) return false;
  if (trigger?.getAttribute("aria-expanded") === "true") return true;
  if (item.tagName === "DETAILS" && item.hasAttribute("open")) return true;
  return false;
}

export function migrateWebAccordionItemToFaqMarkup(item: HTMLElement): HTMLElement | null {
  if (!webAccordionItemNeedsFaqMigration(item)) {
    syncWebAccordionItemExpandedUi(item, isWebAccordionItemExpanded(item));
    return null;
  }
  const { question, answer, expanded, panelId } = extractWebAccordionItemContent(item);
  const tmp = document.createElement("div");
  tmp.innerHTML = getWebAccordionItemHtml(question, answer, {
    panelId: panelId ?? createWebAccordionPanelId(),
    expanded,
  });
  return tmp.firstElementChild as HTMLElement | null;
}

function stripLegacyAccordionQuestionTitleClasses(item: HTMLElement): boolean {
  let changed = false;
  const qWrap = item.querySelector(":scope .page-web-accordion-question") as HTMLElement | null;
  if (qWrap?.classList.contains("page-web-elements-title") || qWrap?.classList.contains("page-web-elements")) {
    qWrap.classList.remove("page-web-elements", "page-web-elements-title");
    changed = true;
  }
  const qTa = item.querySelector(
    "textarea.page-web-accordion-question-input, textarea.page-web-elements-title-input",
  ) as HTMLTextAreaElement | null;
  if (qTa?.classList.contains("page-web-elements-title-input")) {
    qTa.classList.remove("page-web-elements-title-input");
    changed = true;
  }
  if (qTa && !qTa.classList.contains("page-web-accordion-question-input")) {
    qTa.classList.add("page-web-accordion-question-input");
    changed = true;
  }
  return changed;
}

export function ensureWebAccordionFaqItemsInRoot(root: HTMLElement): boolean {
  let changed = false;
  root.querySelectorAll(".page-web-accordion-list").forEach((listNode) => {
    const list = listNode as HTMLElement;
    if (list.tagName !== "DL") {
      const dl = document.createElement("dl");
      dl.className = list.className;
      if (list.getAttribute("contenteditable") === "false") dl.setAttribute("contenteditable", "false");
      while (list.firstChild) dl.appendChild(list.firstChild);
      list.replaceWith(dl);
      changed = true;
    }
  });
  root.querySelectorAll(".page-web-accordion-list > .page-web-accordion-item, .page-web-accordion-list > details").forEach((node) => {
    const item = node as HTMLElement;
    const fresh = migrateWebAccordionItemToFaqMarkup(item);
    if (fresh) {
      item.replaceWith(fresh);
      changed = true;
    } else if (stripLegacyAccordionQuestionTitleClasses(item)) {
      changed = true;
    }
  });
  root.querySelectorAll(".page-web-accordion-panel").forEach((panelNode) => {
    const panel = panelNode as HTMLElement;
    if (panel.hasAttribute("hidden")) {
      panel.setAttribute("data-collapsed", "1");
      panel.removeAttribute("hidden");
      changed = true;
    }
  });
  return changed;
}

/** В редакторе ответы всегда видны (свёрнутость только на опубликованной странице). */
export function expandWebAccordionPanelsForEditor(root: HTMLElement): void {
  if (root.closest(".service-page-content-root")) return;
  if (!root.closest(".page-editor")) return;
  root.querySelectorAll(".page-web-accordion-panel").forEach((panelNode) => {
    const panel = panelNode as HTMLElement;
    panel.removeAttribute("hidden");
    panel.removeAttribute("data-collapsed");
  });
}

/** Перед сохранением: все пункты свёрнуты (на сайте раскрывает посетитель). */
export function normalizeWebAccordionFaqForPublish(root: HTMLElement): void {
  root.querySelectorAll(".page-web-accordion-list > .page-web-accordion-item").forEach((node) => {
    syncWebAccordionItemExpandedUi(node as HTMLElement, false);
  });
  root.querySelectorAll("details.page-web-accordion-item").forEach((node) => {
    (node as HTMLDetailsElement).removeAttribute("open");
  });
}

function isWebAccordionPublicView(root: HTMLElement): boolean {
  return Boolean(root.closest(".service-page-content-root"));
}

function collapseSiblingWebAccordionItems(item: HTMLElement): void {
  const list = item.closest(".page-web-accordion-list");
  if (!list) return;
  list.querySelectorAll(":scope > .page-web-accordion-item").forEach((node) => {
    if (node !== item) syncWebAccordionItemExpandedUi(node as HTMLElement, false);
  });
}

export function toggleWebAccordionFaqItem(
  item: HTMLElement,
  root: HTMLElement,
  opts?: { expand?: boolean; singleOpen?: boolean },
): void {
  const trigger = item.querySelector(".page-web-accordion-trigger") as HTMLElement | null;
  if (!trigger) return;
  const expanded = trigger.getAttribute("aria-expanded") === "true";
  const nextExpanded = opts?.expand ?? !expanded;
  const singleOpen = opts?.singleOpen ?? isWebAccordionPublicView(root);
  if (singleOpen && nextExpanded) collapseSiblingWebAccordionItems(item);
  syncWebAccordionItemExpandedUi(item, nextExpanded);
}

export function initWebAccordionFaqInRoot(root: HTMLElement): () => void {
  const cleanups: Array<() => void> = [];
  const isPublicView = isWebAccordionPublicView(root);
  root.querySelectorAll(".page-web-accordion-list > .page-web-accordion-item").forEach((node) => {
    const item = node as HTMLElement;
    const trigger = item.querySelector(".page-web-accordion-trigger") as HTMLButtonElement | null;
    const panel = item.querySelector(
      ":scope > dd.page-web-accordion-panel, :scope > .page-web-accordion-panel",
    ) as HTMLElement | null;
    if (!trigger || !panel) return;
    syncWebAccordionItemExpandedUi(
      item,
      trigger.getAttribute("aria-expanded") === "true" && panel.getAttribute("data-collapsed") !== "1",
    );
    const onClick = (e: Event) => {
      if (!isPublicView && (e.target as HTMLElement | null)?.closest?.("textarea")) return;
      e.preventDefault();
      toggleWebAccordionFaqItem(item, root, { singleOpen: isPublicView });
    };
    trigger.addEventListener("click", onClick);
    cleanups.push(() => trigger.removeEventListener("click", onClick));
  });
  return () => {
    for (const fn of cleanups) fn();
  };
}

export function handleWebAccordionFaqEditorPointer(
  target: HTMLElement,
  opts: { preventToggleDefault?: boolean },
): boolean {
  if (target.closest("textarea") && target.closest(".page-web-accordion-trigger")) {
    if (opts.preventToggleDefault) return true;
    return false;
  }
  const trigger = target.closest(".page-web-accordion-trigger") as HTMLButtonElement | null;
  if (!trigger || target.closest("textarea")) return false;
  const item = trigger.closest(".page-web-accordion-item") as HTMLElement | null;
  if (!item) return false;
  const expanded = trigger.getAttribute("aria-expanded") === "true";
  syncWebAccordionItemExpandedUi(item, !expanded);
  return true;
}
