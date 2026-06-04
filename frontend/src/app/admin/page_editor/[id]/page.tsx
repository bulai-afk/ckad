"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ApiRequestError,
  apiGet,
  apiPut,
  computeApiPayloadTimeoutMs,
  formatApiErrorForUi,
  isPageByIdApiPath,
} from "@/lib/api";
import {
  buildSiteDocumentLink,
  CALLBACK_FORM_LINK,
  normalizeSiteDocumentsList,
  parseSiteDocumentLinkIndex,
  siteDocumentDisplayName,
  type SiteDocumentItem,
} from "@/lib/siteDocumentLink";
import { adminPageIdFromParams } from "@/lib/adminPageIdFromParams";
import {
  ensureFeatureGridContentWrap,
  ensureFeatureGridImageDisplay,
  featureGridImagePositionSupportsDisplay,
  getFeatureGridContentWrap,
  normalizeFeatureGridContentWrapInRoot,
} from "@/lib/featureGridContentWrap";
import { getSharedWebBlocksCss } from "@/lib/sharedWebBlocksCss";
import { getPageEditorWebToolbarCss } from "@/lib/pageEditorWebToolbarCss";
import {
  applyTimelineLineGeometry,
  getPageShowRenderCss,
  getTimelineRenderCss,
  getWorkPricingRenderCss,
} from "@/lib/pageShowRender";
import {
  clearTimelineTextareaInlineWidthsInRoot,
  layoutWebElementsAnnouncementInputsInRoot,
  layoutWebElementsTextareaSize,
  WEB_ELEMENTS_V2_TEXTAREA_LAYOUT_SELECTOR,
} from "@/lib/webElementsTextareaLayout";
import {
  alignCarouselStripToStartSlideIndex,
  getCarouselSlideWidthPx,
  getCarouselVisibleSlides,
  refreshCarouselStripTranslateAfterLayout,
  shiftCarouselStripBySlide,
} from "@/lib/pageWebCarouselTranslate";
import { stripLegacyTimelineDom } from "@/lib/stripLegacyTimelineDom";
import {
  ensureWebAccordionFaqItemsInRoot,
  syncWebAccordionPanelsForEditor,
  getWebAccordionItemHtml,
  handleWebAccordionFaqEditorPointer,
  initWebAccordionFaqInRoot,
  normalizeWebAccordionFaqForPublish,
} from "@/lib/webAccordionFaq";
import {
  webElementsFieldRowClearFlexJustify,
  webElementsFieldRowSetFlexJustify,
} from "@/lib/webElementsFieldRowJustify";
import {
  getHyphensTargetFromActiveField,
  getHyphensTargetFromNode,
  readWebElementsHyphensEnabled,
  setWebElementsHyphensEnabled,
} from "@/lib/webElementsHyphens";
import {
  applyWebElementsFieldTextAlign,
  clearWebElementsFieldTextAlignWidth,
  parseToolbarTextAlign,
  readWebElementsFieldTextAlign,
  toolbarAlignFromCommand,
  type WebElementsTextAlign,
} from "@/lib/webElementsTextAlign";
import { AdminSidebar } from "@/components/admin/Sidebar";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import {
  CarouselFullPreviewOverlay,
  type CarouselPreviewSessionState,
} from "@/components/CarouselFullPreviewOverlay";
import {
  ArrowRightIcon,
  Bars3BottomLeftIcon,
  Bars3BottomRightIcon,
  BoldIcon,
  BoltIcon,
  CheckCircleIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  EllipsisHorizontalIcon,
  EllipsisVerticalIcon,
  HeartIcon,
  ItalicIcon,
  ListBulletIcon,
  MinusIcon,
  NoSymbolIcon,
  NumberedListIcon,
  PhotoIcon,
  PlusIcon,
  StarIcon,
  StopIcon,
  TableCellsIcon,
  TrashIcon,
  UnderlineIcon,
  XMarkIcon,
} from "@heroicons/react/20/solid";

const ICON_SIZE = "h-4 w-4";

/** Вставка из панели «Web»: расширяйте список и getWebElementHtml. */
const WEB_PAGE_ELEMENTS = [
  { id: "cover", tab: "media", label: "Баннер", description: "Градиентный баннер с заголовком, текстом и кнопкой" },
  { id: "timeline", tab: "text", label: "Этапы работы", description: "Пошаговый блок этапов с заголовками и описаниями" },
  { id: "work-pricing", tab: "text", label: "Стоимость работ", description: "Блок с факторами стоимости, диапазоном цены и призывом к расчёту" },
  { id: "feature-grid", tab: "text", label: "Текстовый блок", description: "Заголовок с описанием и список преимуществ с иконками" },
  {
    id: "text-block-v2",
    tab: "text",
    label: "Текстовый блок v2",
    description: "Плашка анонса, подзаголовок, Заголовок 1, Заголовок 2 и короткое описание",
  },
  {
    id: "article-text",
    tab: "text",
    label: "Текст статьи",
    description: "Заголовок и основной текст статьи для публикаций и длинных материалов",
  },
  {
    id: "accordion",
    tab: "text",
    label: "Аккордеон",
    description: "Подзаголовок, заголовок, описание и список вопросов с ответами при раскрытии",
  },
  { id: "spacer", tab: "decor", label: "Отступ", description: "Пустой декоративный блок для дополнительного вертикального воздуха" },
] as const;
const WEB_BLOCK_SHELL_SELECTOR =
  ".page-web-cover, .page-web-carousel, .page-web-timeline, .page-web-text-media, .page-web-text-block, .page-web-text-block-v2, .page-web-article-text, .page-web-accordion, .page-web-spacer";

/** Панель форматирования над полотном: скрыть расширенные инструменты (размер и цвет шрифта, жирный/курсив/подчёрк, вертикальное выравнивание, списки и маркеры, таблица, картинка). */
const PAGE_EDITOR_FORMAT_TOOLBAR_MINIMAL = true;

/**
 * Автоперенос старой HTML-разметки web-блоков в острова (p/h → textarea, шапка/шаги таймлайна, feature-grid, стоимость и т.д.).
 * Сейчас выключено: старый текст из разметки не подмешивается в поля — правьте контент вручную или замените блоки.
 */
const ENABLE_LEGACY_WEB_BLOCK_HTML_MIGRATIONS = false;

/** Единый маркер активного редактируемого фрагмента на полотне (подсветка области фокуса). Настраивается в CSS через переменные на `.page-editor`. */
const PAGE_EDITOR_FOCUS_TARGET_ATTR = "data-editor-focus-target";

/** Редактируемые листья внутри блока «Стоимость работ» (как в tryKeepCaret… для каретки). */
const WORK_PRICING_EDITABLE_LEAF_SELECTOR =
  ".page-web-work-pricing h1, .page-web-work-pricing h2, .page-web-work-pricing h3, .page-web-work-pricing h4, .page-web-work-pricing h5, .page-web-work-pricing h6, .page-web-work-pricing p, .page-web-work-pricing li, .page-web-work-pricing a, .page-web-work-pricing span, .page-web-work-pricing blockquote, .page-web-work-pricing textarea.page-web-elements-title-input, .page-web-work-pricing textarea.page-web-elements-title2-input, .page-web-work-pricing textarea.page-web-elements-subtitle-input, .page-web-work-pricing textarea.page-web-elements-description-input";

/** Горизонтальное положение островка поля в блоке «Стоимость работ» (смещает весь `textarea`, а не только текст внутри). */
const WORK_PRICING_WEB_ELEMENTS_HALIGN_ATTR = "data-work-pricing-halign";
type WorkPricingBlockHalign = "left" | "center" | "right";

const WORK_PRICING_WEB_ELEMENTS_ALIGN_WRAP_SELECTOR =
  ".page-web-work-pricing .page-web-elements.page-web-elements-title, .page-web-work-pricing .page-web-elements.page-web-elements-title2, .page-web-work-pricing .page-web-elements.page-web-elements-subtitle, .page-web-work-pricing .page-web-elements.page-web-elements-description";

/** Иконка-галочка в пункте списка стоимости работ: не редактируется и при потере восстанавливается в начале `li`. */
const WORK_PRICING_LI_CHECK_SVG_HTML =
  '<svg viewBox="0 0 20 20" fill="currentColor" data-slot="icon" aria-hidden="true" class="wrl wrn wru wtq" contenteditable="false">' +
  '<path d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd" fill-rule="evenodd"></path>' +
  "</svg>";

function ensureWorkPricingListItemCheckmarks(root: HTMLElement): boolean {
  let changed = false;
  root.querySelectorAll(".page-web-work-pricing ul.wrf").forEach((ul) => {
    ul.querySelectorAll(":scope > li").forEach((liNode) => {
      const li = liNode as HTMLElement;
      let svg = li.querySelector(":scope > svg.wrl.wrn") as SVGElement | null;
      if (!svg) {
        const wrap = document.createElement("div");
        wrap.innerHTML = WORK_PRICING_LI_CHECK_SVG_HTML;
        svg = wrap.firstElementChild as SVGElement | null;
        if (!svg) return;
        li.insertBefore(svg, li.firstChild);
        changed = true;
      } else if (svg !== li.firstElementChild) {
        li.insertBefore(svg, li.firstChild);
        changed = true;
      }
      if (svg.getAttribute("contenteditable") !== "false") {
        svg.setAttribute("contenteditable", "false");
        changed = true;
      }
    });
  });
  return changed;
}

function createWorkPricingDescriptionIsland(
  initialText: string,
  placeholder: string,
  blockHalign: WorkPricingBlockHalign = "left",
): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "page-web-elements page-web-elements-description";
  wrap.setAttribute("contenteditable", "false");
  wrap.setAttribute(WORK_PRICING_WEB_ELEMENTS_HALIGN_ATTR, blockHalign);
  const row = document.createElement("div");
  row.className = "page-web-elements-field-row";
  row.setAttribute("contenteditable", "false");
  const ta = document.createElement("textarea");
  ta.className = "page-web-elements-description-input";
  ta.setAttribute("spellcheck", "true");
  ta.setAttribute("placeholder", placeholder);
  ta.setAttribute("rows", "1");
  ta.value = initialText;
  row.appendChild(ta);
  wrap.appendChild(row);
  return wrap;
}

function createWorkPricingTitleIsland(
  initialText: string,
  placeholder: string,
  blockHalign: WorkPricingBlockHalign = "left",
): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "page-web-elements page-web-elements-title";
  wrap.setAttribute("contenteditable", "false");
  wrap.setAttribute(WORK_PRICING_WEB_ELEMENTS_HALIGN_ATTR, blockHalign);
  const row = document.createElement("div");
  row.className = "page-web-elements-field-row";
  row.setAttribute("contenteditable", "false");
  const ta = document.createElement("textarea");
  ta.className = "page-web-elements-title-input";
  ta.setAttribute("spellcheck", "true");
  ta.setAttribute("placeholder", placeholder);
  ta.setAttribute("rows", "1");
  ta.value = initialText;
  row.appendChild(ta);
  wrap.appendChild(row);
  return wrap;
}

function createWorkPricingTitle2Island(
  initialText: string,
  placeholder: string,
  blockHalign: WorkPricingBlockHalign = "center",
): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "page-web-elements page-web-elements-title2";
  wrap.setAttribute("contenteditable", "false");
  wrap.setAttribute(WORK_PRICING_WEB_ELEMENTS_HALIGN_ATTR, blockHalign);
  const row = document.createElement("div");
  row.className = "page-web-elements-field-row";
  row.setAttribute("contenteditable", "false");
  const ta = document.createElement("textarea");
  ta.className = "page-web-elements-title2-input";
  ta.setAttribute("spellcheck", "true");
  ta.setAttribute("placeholder", placeholder);
  ta.setAttribute("rows", "1");
  ta.value = initialText;
  row.appendChild(ta);
  wrap.appendChild(row);
  return wrap;
}

/** Подзаголовок / описание баннера: `.page-web-elements.page-web-elements-description` + `textarea.page-web-elements-description-input`. */
function createCoverDescriptionIsland(initialText: string, placeholder = "Короткое описание"): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "page-web-elements page-web-elements-description";
  wrap.setAttribute("contenteditable", "false");
  const row = document.createElement("div");
  row.className = "page-web-elements-field-row";
  row.setAttribute("contenteditable", "false");
  const ta = document.createElement("textarea");
  ta.className = "page-web-elements-description-input";
  ta.setAttribute("spellcheck", "true");
  ta.setAttribute("placeholder", placeholder);
  ta.setAttribute("rows", "1");
  ta.value = initialText;
  row.appendChild(ta);
  wrap.appendChild(row);
  return wrap;
}

/** Заголовок баннера: островок `.page-web-elements.page-web-elements-title` + `textarea.page-web-elements-title-input` (как в текстовом блоке v2). */
function createCoverTitleIsland(initialText: string, placeholder = "Заголовок баннера"): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "page-web-elements page-web-elements-title";
  wrap.setAttribute("contenteditable", "false");
  const row = document.createElement("div");
  row.className = "page-web-elements-field-row";
  row.setAttribute("contenteditable", "false");
  const ta = document.createElement("textarea");
  ta.className = "page-web-elements-title-input";
  ta.setAttribute("spellcheck", "true");
  ta.setAttribute("placeholder", placeholder);
  ta.setAttribute("rows", "1");
  ta.value = initialText;
  row.appendChild(ta);
  wrap.appendChild(row);
  return wrap;
}

/** Анонс баннера: как в текстовом блоке v2 — `page-web-elements-announcement` + `div.page-web-elements-announcement-input`. */
function createCoverAnnouncementIsland(
  initialText: string,
  options?: { includeLearnMore?: boolean; learnMoreLabel?: string },
): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "page-web-elements page-web-elements-announcement";
  wrap.setAttribute("contenteditable", "false");
  const row = document.createElement("div");
  row.className = "page-web-elements-announcement-row";
  const shell = document.createElement("div");
  shell.className = "page-web-elements-announcement-input-shell";
  const strip = document.createElement("div");
  strip.className = "page-web-elements-announcement-strip";
  strip.setAttribute("contenteditable", "false");
  const input = document.createElement("div");
  input.className = "page-web-elements-announcement-input";
  input.setAttribute("contenteditable", "true");
  input.setAttribute("spellcheck", "true");
  input.setAttribute("role", "textbox");
  input.setAttribute("aria-multiline", "true");
  input.setAttribute("data-placeholder", "Анонс");
  input.textContent = initialText;
  strip.appendChild(input);
  if (options?.includeLearnMore) {
    const label = (options.learnMoreLabel || "Подробнее").trim() || "Подробнее";
    strip.appendChild(createCoverAnnouncementLearnMoreSpan(label));
  }
  shell.appendChild(strip);
  row.appendChild(shell);
  wrap.appendChild(row);
  return wrap;
}

/** «Подробнее» в плашке или в ряду действий баннера — тот же узел, что в текстовом блоке v2. */
function createCoverAnnouncementLearnMoreSpan(label: string): HTMLElement {
  const lm = document.createElement("span");
  lm.className = "page-web-elements-announcement-learn-more";
  lm.setAttribute("role", "button");
  lm.setAttribute("contenteditable", "false");
  lm.setAttribute("tabindex", "-1");
  lm.textContent = label.trim() || "Подробнее";
  return lm;
}

/** Кнопки баннера: та же разметка, что в `getTextBlockV2Html` — primary + secondary. */
function createCoverActionsIsland(
  primaryLabel: string = "Кнопка",
  secondaryLabel: string = "Дополнительно",
): HTMLElement {
  const actions = document.createElement("div");
  actions.className = "page-web-elements-actions";
  actions.setAttribute("contenteditable", "false");
  const cluster = document.createElement("div");
  cluster.className = "page-web-elements-actions-cluster";
  cluster.setAttribute("tabindex", "-1");

  const btnIsland = document.createElement("div");
  btnIsland.className = "page-web-elements page-web-elements-button";
  btnIsland.setAttribute("contenteditable", "false");
  const p1 = document.createElement("p");
  p1.className = "page-web-elements-cta-wrap";
  p1.setAttribute("contenteditable", "false");
  const a1 = document.createElement("a");
  a1.href = "#";
  a1.className = "page-web-elements-cta-button";
  a1.textContent = primaryLabel;
  p1.appendChild(a1);
  btnIsland.appendChild(p1);

  const btn2Island = document.createElement("div");
  btn2Island.className = "page-web-elements page-web-elements-button2";
  btn2Island.setAttribute("contenteditable", "false");
  const p2 = document.createElement("p");
  p2.className = "page-web-elements-cta-wrap";
  p2.setAttribute("contenteditable", "false");
  const a2 = document.createElement("a");
  a2.href = "#";
  a2.className = "page-web-elements-cta-button-secondary";
  a2.textContent = secondaryLabel;
  p2.appendChild(a2);
  btn2Island.appendChild(p2);

  cluster.appendChild(btnIsland);
  cluster.appendChild(btn2Island);
  actions.appendChild(cluster);
  return actions;
}

/** Старый блок кнопки (`p.page-web-cover-el-button-wrap`) → `page-web-elements-actions` + `page-web-elements-actions-cluster`. */
function migrateLegacyCoverButtonWrapToWebElements(root: HTMLElement): boolean {
  let changed = false;
  root.querySelectorAll(".page-web-cover-inner > .page-web-cover-el-button-wrap").forEach((n) => {
    const wrap = n as HTMLElement;
    const inner = wrap.parentElement;
    if (!inner?.classList.contains("page-web-cover-inner")) return;

    const btn =
      (wrap.querySelector(":scope > .page-web-cover-el-button") as HTMLElement | null) ??
      (wrap.querySelector(":scope > a.page-web-cover-el-button") as HTMLElement | null);
    const learnMore =
      (wrap.querySelector(":scope > .page-web-cover-el-learn-more") as HTMLElement | null) ??
      (wrap.querySelector(":scope > a.page-web-cover-el-learn-more") as HTMLElement | null);
    const label = (btn?.textContent ?? "").replace(/\u200b/g, "").trim() || "Кнопка";
    const island = createCoverActionsIsland(label, "Дополнительно");
    const cluster = island.querySelector(":scope > .page-web-elements-actions-cluster") as HTMLElement | null;
    if (cluster && learnMore) {
      const lmText = (learnMore.textContent ?? "").replace(/\u200b/g, "").trim() || "Подробнее";
      if (learnMore.matches(".page-web-cover-el-learn-more, a.page-web-cover-el-learn-more")) {
        cluster.appendChild(createCoverAnnouncementLearnMoreSpan(lmText));
      } else {
        cluster.appendChild(learnMore);
      }
    }
    wrap.replaceWith(island);
    changed = true;
  });
  return changed;
}

/** Старый подзаголовок баннера (`p.page-web-cover-el-subtitle`) → `page-web-elements-description` + `textarea.page-web-elements-description-input`. */
function migrateLegacyCoverSubtitleToWebElements(root: HTMLElement): boolean {
  let changed = false;
  root.querySelectorAll(".page-web-cover-inner > .page-web-cover-el-subtitle").forEach((n) => {
    const p = n as HTMLElement;
    if (p.querySelector("textarea.page-web-elements-description-input")) return;
    const inner = p.parentElement;
    if (!inner?.classList.contains("page-web-cover-inner")) return;
    const text = (p.textContent ?? "").replace(/\u200b/g, "").trim();
    const initial =
      text ||
      "Короткое описание услуги: основные преимущества, сроки и ожидаемый результат для клиента.";
    p.replaceWith(createCoverDescriptionIsland(initial));
    changed = true;
  });
  return changed;
}

/** Старый анонс баннера (`p.page-web-cover-el-announcement-wrap` …) → `page-web-elements-announcement` + `div.page-web-elements-announcement-input`. */
function migrateLegacyCoverAnnouncementToWebElements(root: HTMLElement): boolean {
  let changed = false;
  root.querySelectorAll(".page-web-cover-inner > .page-web-cover-el-announcement-wrap").forEach((n) => {
    const wrap = n as HTMLElement;
    if (wrap.querySelector(".page-web-elements-announcement-input")) return;
    const inner = wrap.parentElement;
    if (!inner?.classList.contains("page-web-cover-inner")) return;

    const pill = wrap.querySelector(":scope > .page-web-cover-el-announcement") as HTMLElement | null;
    const textSpan = pill?.querySelector(".page-web-cover-el-announcement-text") as HTMLElement | null;
    let text = (textSpan?.textContent ?? pill?.textContent ?? "").replace(/\u200b/g, "").trim();
    if (!text) text = "Анонс: мы запустили новый этап проекта.";

    const lmLegacy = pill?.querySelector(
      ".page-web-cover-el-announcement-learn-more, .page-web-elements-announcement-learn-more",
    ) as HTMLElement | null;
    const learnLabel = (lmLegacy?.textContent ?? "").replace(/\u200b/g, "").trim() || "Подробнее";

    const island = createCoverAnnouncementIsland(text, {
      includeLearnMore: !!lmLegacy,
      learnMoreLabel: learnLabel,
    });
    wrap.replaceWith(island);
    changed = true;
  });
  return changed;
}

/**
 * «Голые» заголовок/абзац внутри баннера (как старый HTML без классов обложки) → те же острова, что после
 * миграций таймлайна: текст попадает в textarea, а не остаётся только в DOM вне полей.
 */
function migrateLegacyCoverOrphanHeadingParagraphToWebElements(root: HTMLElement): boolean {
  let changed = false;
  root.querySelectorAll(".page-web-cover-inner").forEach((n) => {
    const inner = n as HTMLElement;
    if (!inner.classList.contains("page-web-cover-inner")) return;

    const titleIsland = inner.querySelector(":scope > .page-web-elements.page-web-elements-title");
    const titleTa = inner.querySelector(
      ":scope > .page-web-elements.page-web-elements-title textarea.page-web-elements-title-input",
    ) as HTMLTextAreaElement | null;
    const orphanHeading = inner.querySelector(":scope > h1, :scope > h2, :scope > h3") as HTMLElement | null;
    if (orphanHeading && !orphanHeading.closest(".page-web-elements.page-web-elements-title")) {
      const text = (orphanHeading.textContent ?? "").replace(/[\u200b\u00a0]/g, " ").replace(/\s+/g, " ").trim();
      if (text) {
        if (titleTa && !(titleTa.value || "").trim()) {
          titleTa.value = text;
          orphanHeading.remove();
          changed = true;
        } else if (!titleIsland) {
          orphanHeading.replaceWith(createCoverTitleIsland(text));
          changed = true;
        }
      }
    }

    const descIsland = inner.querySelector(":scope > .page-web-elements.page-web-elements-description");
    const descTa = inner.querySelector(
      ":scope > .page-web-elements.page-web-elements-description textarea.page-web-elements-description-input",
    ) as HTMLTextAreaElement | null;
    const orphanP = Array.from(inner.querySelectorAll(":scope > p")).find((p) => {
      const el = p as HTMLElement;
      if (el.classList.contains("page-web-cover-el-announcement-wrap")) return false;
      if (el.classList.contains("page-web-cover-el-button-wrap")) return false;
      if (el.classList.contains("page-web-cover-el-subtitle")) return false;
      if (el.closest(".page-web-elements")) return false;
      return (el.textContent ?? "").replace(/[\u200b\u00a0]/g, " ").replace(/\s+/g, " ").trim().length > 0;
    }) as HTMLElement | undefined;

    if (orphanP) {
      const text = (orphanP.textContent ?? "").replace(/[\u200b\u00a0]/g, " ").replace(/\s+/g, " ").trim();
      if (text) {
        if (descTa && !(descTa.value || "").trim()) {
          descTa.value = text;
          orphanP.remove();
          changed = true;
        } else if (!descIsland) {
          orphanP.replaceWith(createCoverDescriptionIsland(text));
          changed = true;
        }
      }
    }
  });
  return changed;
}

/** Старый заголовок баннера (`h1–h3` или `div.page-web-cover-el-title`) → островок web-elements. */
function migrateLegacyCoverTitleHeadingToWebElements(root: HTMLElement): boolean {
  let changed = false;
  root.querySelectorAll(".page-web-cover-inner").forEach((n) => {
    const inner = n as HTMLElement;
    const legacyHeading = inner.querySelector(
      ":scope > h1.page-web-cover-el-title, :scope > h2.page-web-cover-el-title, :scope > h3.page-web-cover-el-title",
    ) as HTMLElement | null;
    if (legacyHeading) {
      const text = (legacyHeading.textContent ?? "").replace(/\u200b/g, "").trim();
      legacyHeading.replaceWith(createCoverTitleIsland(text));
      changed = true;
      return;
    }
    const legacyDiv = inner.querySelector(":scope > .page-web-cover-el-title") as HTMLElement | null;
    if (legacyDiv) {
      const ta = legacyDiv.querySelector("textarea.page-web-elements-title-input") as HTMLTextAreaElement | null;
      const text = (ta?.value ?? legacyDiv.textContent ?? "").replace(/\u200b/g, "").trim();
      legacyDiv.replaceWith(createCoverTitleIsland(text));
      changed = true;
    }
  });
  return changed;
}

/** Соотношение сторон обложки (сохраняется в data-cover-aspect на .page-web-cover). arW/arH — как в CSS редактора (превью в меню). */
const COVER_ASPECT_PRESETS = [
  { id: "1-8", label: "2∶1", arW: 2, arH: 1 },
  { id: "1-4", label: "4∶1", arW: 4, arH: 1 },
  { id: "6-1", label: "6∶1", arW: 6, arH: 1 },
] as const;

/** Тип изображения в карусели (сохраняется в data-carousel-aspect на .page-web-carousel). */
const CAROUSEL_IMAGE_TYPE_PRESETS = [
  { id: "vertical", label: "Вертикальное" },
  { id: "horizontal", label: "Горизонтальное" },
  { id: "square", label: "Квадратное" },
  { id: "a4", label: "А4 (210∶297)" },
] as const;

function getCoverAspectPreviewSvg(arW: number, arH: number): string {
  const pad = 10;
  const box = 100 - pad * 2;
  const r = arW / arH;
  let rw: number;
  let rh: number;
  let rx: number;
  let ry: number;
  if (r >= 1) {
    rw = box;
    rh = box / r;
    rx = pad;
    ry = pad + (box - rh) / 2;
  } else {
    rh = box;
    rw = box * r;
    ry = pad;
    rx = pad + (box - rw) / 2;
  }
  return (
    '<svg class="page-web-cover-menu-aspect-svg" viewBox="0 0 100 100" width="28" height="28" aria-hidden="true">' +
    '<rect x="' +
    rx.toFixed(2) +
    '" y="' +
    ry.toFixed(2) +
    '" width="' +
    rw.toFixed(2) +
    '" height="' +
    rh.toFixed(2) +
    '" rx="3" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5"/>' +
    "</svg>"
  );
}

const FONT_SIZES = [
  { value: "1", label: "10px" },
  { value: "2", label: "13px" },
  { value: "3", label: "16px" },
  { value: "4", label: "18px" },
  { value: "5", label: "24px" },
  { value: "6", label: "32px" },
  { value: "7", label: "48px" },
] as const;

const LIST_STYLE_UL = [
  { value: "disc", Icon: ListDiscIcon },
  { value: "circle", Icon: ListCircleIcon },
  { value: "square", Icon: StopIcon },
  { value: "check", Icon: CheckIcon },
  { value: "check-circle", Icon: CheckCircleIcon },
  { value: "dash", Icon: MinusIcon },
  { value: "arrow", Icon: ChevronRightIcon },
  { value: "arrow-right", Icon: ArrowRightIcon },
  { value: "star", Icon: StarIcon },
  { value: "heart", Icon: HeartIcon },
  { value: "bolt", Icon: BoltIcon },
  { value: "none", Icon: NoSymbolIcon },
] as const;

const CUSTOM_LIST_STYLES = ["disc", "circle", "square", "check", "check-circle", "dash", "arrow", "arrow-right", "star", "heart", "bolt"];

const LIST_MARKER_SVG = {
  disc: encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="white"><circle cx="10" cy="10" r="3.5"/></svg>'),
  circle: encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="white" stroke-width="2"><circle cx="10" cy="10" r="3.5"/></svg>'),
  square: encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="white"><path d="M5.25 3A2.25 2.25 0 0 0 3 5.25v9.5A2.25 2.25 0 0 0 5.25 17h9.5A2.25 2.25 0 0 0 17 14.75v-9.5A2.25 2.25 0 0 0 14.75 3h-9.5Z"/></svg>'),
  check: encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="white"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd"/></svg>'),
  "check-circle": encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="white"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clip-rule="evenodd"/></svg>'),
  dash: encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="white"><path fill-rule="evenodd" d="M4 10a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H4.75A.75.75 0 0 1 4 10Z" clip-rule="evenodd"/></svg>'),
  arrow: encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="white"><path fill-rule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"/></svg>'),
  "arrow-right": encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="white"><path fill-rule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clip-rule="evenodd"/></svg>'),
  star: encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="white"><path fill-rule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z" clip-rule="evenodd"/></svg>'),
  heart: encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="white"><path d="m9.653 16.915-.005-.003-.019-.01a20.759 20.759 0 0 1-1.162-.682 22.045 22.045 0 0 1-2.582-1.9C4.045 12.733 2 10.352 2 7.5a4.5 4.5 0 0 1 8-2.828A4.5 4.5 0 0 1 18 7.5c0 2.852-2.044 5.233-3.885 6.82a22.049 22.049 0 0 1-3.744 2.582l-.019.01-.005.003h-.002a.739.739 0 0 1-.69.001l-.002-.001Z"/></svg>'),
  bolt: encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="white"><path d="M11.983 1.907a.75.75 0 0 0-1.292-.657l-8.5 9.5A.75.75 0 0 0 2.75 12h6.572l-1.305 6.093a.75.75 0 0 0 1.292.657l8.5-9.5A.75.75 0 0 0 17.25 8h-6.572l1.305-6.093Z"/></svg>'),
};

const LIST_COLORS = [
  { value: "black", label: "Черный", hex: "#000000" },
  { value: "slate", label: "Slate", hex: "#64748b" },
  { value: "gray", label: "Gray", hex: "#6b7280" },
  { value: "zinc", label: "Zinc", hex: "#71717a" },
  { value: "red", label: "Red", hex: "#ef4444" },
  { value: "orange", label: "Orange", hex: "#f97316" },
  { value: "amber", label: "Amber", hex: "#f59e0b" },
  { value: "yellow", label: "Yellow", hex: "#eab308" },
  { value: "lime", label: "Lime", hex: "#84cc16" },
  { value: "green", label: "Green", hex: "#22c55e" },
  { value: "emerald", label: "Emerald", hex: "#10b981" },
  { value: "teal", label: "Teal", hex: "#14b8a6" },
  { value: "cyan", label: "Cyan", hex: "#06b6d4" },
  { value: "sky", label: "Sky", hex: "#0ea5e9" },
  { value: "blue", label: "Blue", hex: "#3b82f6" },
  { value: "indigo", label: "Indigo", hex: "#6366f1" },
  { value: "violet", label: "Violet", hex: "#8b5cf6" },
  { value: "purple", label: "Purple", hex: "#a855f7" },
  { value: "fuchsia", label: "Fuchsia", hex: "#d946ef" },
  { value: "pink", label: "Pink", hex: "#ec4899" },
  { value: "rose", label: "Rose", hex: "#f43f5e" },
] as const;

type FeatureGridIconPreset = {
  id:
    | "bolt"
    | "users"
    | "calendar"
    | "star"
    | "heart"
    | "check"
    | "shield"
    | "rocket"
    | "clock"
    | "globe"
    | "chart"
    | "gear"
    | "factory"
    | "enterprise"
    | "warehouse"
    | "tools"
    | "truck"
    | "alert"
    | "bug"
    | "fire";
  label: string;
  path: string;
};

const FEATURE_GRID_ICON_PRESETS: readonly FeatureGridIconPreset[] = [
  {
    id: "bolt",
    label: "Молния",
    path: "m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z",
  },
  {
    id: "users",
    label: "Команда",
    path:
      "M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z",
  },
  {
    id: "calendar",
    label: "Календарь",
    path:
      "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5",
  },
  {
    id: "star",
    label: "Звезда",
    path:
      "M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z",
  },
  {
    id: "heart",
    label: "Сердце",
    path:
      "M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z",
  },
  {
    id: "check",
    label: "Галочка",
    path:
      "M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z",
  },
  {
    id: "shield",
    label: "Щит",
    path:
      "M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z",
  },
  {
    id: "rocket",
    label: "Ракета",
    path:
      "M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z",
  },
  {
    id: "clock",
    label: "Часы",
    path:
      "M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  },
  {
    id: "globe",
    label: "Глобус",
    path:
      "M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418",
  },
  {
    id: "chart",
    label: "График",
    path:
      "M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605",
  },
  {
    id: "gear",
    label: "Шестерня",
    path:
      "M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Zm0-3v2.25m0 10.5V19.5m7.5-7.5h-2.25m-10.5 0H4.5m12.303-5.303-1.59 1.59m-6.426 6.426-1.59 1.59m9.606 0-1.59-1.59m-6.426-6.426-1.59-1.59",
  },
  {
    id: "factory",
    label: "Завод",
    path:
      "M3 21h18M4.5 21V11.25l4.5 2.25V9l4.5 2.25V7.5l4.5 2.25V21M7.5 21v-3h3v3m3 0v-4.5h3V21M18 9V4.5h1.5V9M15.75 6h4.5",
  },
  {
    id: "enterprise",
    label: "Предприятие",
    path:
      "M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21",
  },
  {
    id: "warehouse",
    label: "Склад",
    path:
      "m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z",
  },
  {
    id: "tools",
    label: "Инструменты",
    path:
      "M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z",
  },
  {
    id: "truck",
    label: "Логистика",
    path:
      "M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12",
  },
  {
    id: "alert",
    label: "Проблема",
    path:
      "M12 9v4.5m0 3.75h.008v.008H12v-.008ZM10.29 3.86 1.82 18a1.875 1.875 0 0 0 1.61 2.813h16.94A1.875 1.875 0 0 0 21.98 18L13.51 3.86a1.875 1.875 0 0 0-3.22 0Z",
  },
  {
    id: "bug",
    label: "Сбой",
    path:
      "M9 9h6m-6 0a3 3 0 0 0-3 3v3a6 6 0 1 0 12 0v-3a3 3 0 0 0-3-3m-6 0V7.5A1.5 1.5 0 0 1 10.5 6h3A1.5 1.5 0 0 1 15 7.5V9m-9.75 3H3m2.25 4.5H3m18-4.5h-2.25M21 16.5h-2.25M6.5 4.5l1.5 1.5m8-1.5-1.5 1.5",
  },
  {
    id: "fire",
    label: "Критично",
    path:
      "M12 3.75c.643 1.302.99 2.734.99 4.185 0 1.11-.203 2.198-.598 3.218.92-.56 1.69-1.34 2.25-2.25.724 1.252 1.108 2.674 1.108 4.125A5.75 5.75 0 0 1 10 18.75c-2.899 0-5.25-2.351-5.25-5.25 0-2.076.84-3.864 2.25-5.25.26 1.053.826 1.996 1.62 2.707A8.89 8.89 0 0 0 9.75 6.75c0-1.11.84-2.25 2.25-3Z",
  },
] as const;
const FEATURE_GRID_PROBLEM_ICON_IDS = new Set<FeatureGridIconPreset["id"]>(["alert", "bug", "fire"]);

// Палитра цветов как на `admin/banners` (выпадающее меню "Цвет шрифта").
const BANNERS_FONT_COLOR_PRESETS = [
  "#ffffff",
  "#f8fafc",
  "#000000",
  "#1e293b",
  "#496db3",
  "#2563eb",
  "#16a34a",
  "#dc2626",
  "#f59e0b",
  "#7c3aed",
] as const;

const LIST_STYLE_OL = [
  { value: "decimal", label: "1." },
  { value: "lower-alpha", label: "a." },
  { value: "upper-alpha", label: "A." },
  { value: "lower-roman", label: "i." },
  { value: "upper-roman", label: "I." },
] as const;

function pluralRowsInsert(n: number): string {
  if (n === 1) return "1 строку";
  if (n >= 2 && n <= 4) return `${n} строки`;
  return `${n} строк`;
}
function pluralColsInsert(n: number): string {
  if (n === 1) return "1 столбец";
  if (n >= 2 && n <= 4) return `${n} столбца`;
  return `${n} столбцов`;
}
function pluralRowsDelete(n: number): string {
  if (n === 1) return "1 строку";
  if (n >= 2 && n <= 4) return `${n} строки`;
  return `${n} строк`;
}
function pluralColsDelete(n: number): string {
  if (n === 1) return "1 столбец";
  if (n >= 2 && n <= 4) return `${n} столбца`;
  return `${n} столбцов`;
}

type CoverBgAdjustRevertSnapshot = {
  background: string;
  hasBgClass: boolean;
  dataX: string | null;
  dataY: string | null;
  coverBgImageVar: string;
  coverBgPosVar: string;
};

/** Один общий `<input type="file">` для фона обложки и слайдов карусели (два отдельных input ломали диалог/change в WebKit). */
type WebShellImageUploadPending =
  | { kind: "cover"; cover: HTMLElement }
  | { kind: "carousel"; carousel: HTMLElement; slide: HTMLElement }
  | { kind: "feature-grid-image"; imageBox: HTMLElement };

function buildCoverBgRevertSnapshot(cover: HTMLElement): CoverBgAdjustRevertSnapshot {
  return {
    background: cover.style.background || "",
    hasBgClass: cover.classList.contains("page-web-cover-has-bg"),
    dataX: cover.getAttribute("data-cover-bg-x"),
    dataY: cover.getAttribute("data-cover-bg-y"),
    coverBgImageVar: cover.style.getPropertyValue("--cover-bg-image"),
    coverBgPosVar: cover.style.getPropertyValue("--cover-bg-pos"),
  };
}

/** Достаёт data URL из inline `background: url("...")` обложки. */
function extractCoverBackgroundDataUrl(cover: HTMLElement): string | null {
  const bg = cover.style?.background || "";
  if (!bg.includes("url(")) return null;
  const start = bg.indexOf("url(");
  let s = bg.slice(start + 4).trim();
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
}

function ensureCoverBackgroundCssVars(
  cover: HTMLElement,
  fallbackPosX = 50,
  fallbackPosY = 50,
) {
  const existingBg = cover.style.getPropertyValue("--cover-bg-image").trim();
  const existingPos = cover.style.getPropertyValue("--cover-bg-pos").trim();
  const src = extractCoverBackgroundDataUrl(cover);
  if (src && !existingBg) {
    const safe = src.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    cover.style.setProperty("--cover-bg-image", `url("${safe}")`);
  }
  if (!existingPos) {
    const x = Number.parseFloat(cover.getAttribute("data-cover-bg-x") || `${fallbackPosX}`);
    const y = Number.parseFloat(cover.getAttribute("data-cover-bg-y") || `${fallbackPosY}`);
    const nx = clampPercent(Number.isFinite(x) ? x : fallbackPosX);
    const ny = clampPercent(Number.isFinite(y) ? y : fallbackPosY);
    cover.style.setProperty("--cover-bg-pos", `${nx}% ${ny}%`);
  }
}

type CoverBgAdjustSessionState = {
  mount: HTMLElement;
  imageSrc: string;
  posX: number;
  posY: number;
  revert: CoverBgAdjustRevertSnapshot;
};

function clampPercent(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n * 10) / 10));
}

/** Затемнение вокруг обложки + окно с перетаскиванием background-position (как кадрирование). */
function CoverBackgroundAdjustOverlay({
  coverEl,
  imageSrc,
  posX,
  posY,
  onPositionChange,
  onCommit,
  onCancel,
}: {
  coverEl: HTMLElement;
  imageSrc: string;
  posX: number;
  posY: number;
  onPositionChange: (x: number, y: number) => void;
  onCommit: () => void;
  onCancel: () => void;
}) {
  const [, bump] = useState(0);
  const dragRef = useRef<{
    active: boolean;
    sx: number;
    sy: number;
    px: number;
    py: number;
    w: number;
    h: number;
  } | null>(null);
  const layerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const tick = () => bump((n) => n + 1);
    const ro = new ResizeObserver(tick);
    ro.observe(coverEl);
    window.addEventListener("scroll", tick, true);
    window.addEventListener("resize", tick);
    const scrollParents: HTMLElement[] = [];
    let p: HTMLElement | null = coverEl.parentElement;
    while (p) {
      const st = typeof getComputedStyle !== "undefined" ? getComputedStyle(p) : { overflowY: "visible" };
      const oy = st.overflowY;
      if (oy === "auto" || oy === "scroll") {
        p.addEventListener("scroll", tick);
        scrollParents.push(p);
      }
      p = p.parentElement;
    }
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", tick, true);
      window.removeEventListener("resize", tick);
      scrollParents.forEach((el) => el.removeEventListener("scroll", tick));
    };
  }, [coverEl]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d?.active) return;
      const dx = e.clientX - d.sx;
      const dy = e.clientY - d.sy;
      const factor = 0.55;
      const nx = clampPercent(d.px - (dx / d.w) * 100 * factor);
      const ny = clampPercent(d.py - (dy / d.h) * 100 * factor);
      onPositionChange(nx, ny);
    };
    const onUp = () => {
      if (dragRef.current) dragRef.current.active = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [onPositionChange]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onCancel]);

  const rect = coverEl.getBoundingClientRect();
  const br = typeof getComputedStyle !== "undefined" ? getComputedStyle(coverEl).borderRadius : "12px";
  const escaped = imageSrc.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const el = layerRef.current?.parentElement;
    if (!el) return;
    const r = el.getBoundingClientRect();
    dragRef.current = {
      active: true,
      sx: e.clientX,
      sy: e.clientY,
      px: posX,
      py: posY,
      w: Math.max(r.width, 1),
      h: Math.max(r.height, 1),
    };
  };

  const topH = Math.max(0, rect.top);
  const leftW = Math.max(0, rect.left);
  const bottomTop = rect.top + rect.height;
  const rightLeft = rect.left + rect.width;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[100] pointer-events-none" aria-hidden>
        <div className="pointer-events-auto fixed left-0 right-0 top-0 bg-slate-900/60" style={{ height: topH }} />
        <div
          className="pointer-events-auto fixed bg-slate-900/60"
          style={{ top: rect.top, left: 0, width: leftW, height: rect.height }}
        />
        <div
          className="pointer-events-auto fixed bg-slate-900/60"
          style={{ top: rect.top, left: rightLeft, right: 0, height: rect.height }}
        />
        <div
          className="pointer-events-auto fixed left-0 right-0 bottom-0 bg-slate-900/60"
          style={{ top: bottomTop }}
        />
      </div>
      <div
        className="fixed z-[101] overflow-hidden shadow-xl ring-2 ring-white/90"
        style={{
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          borderRadius: br,
        }}
      >
        <div className="relative h-full w-full overflow-hidden" style={{ borderRadius: br }}>
          <div
            ref={layerRef}
            role="presentation"
            className="absolute inset-0 cursor-grab select-none active:cursor-grabbing"
            style={{
              borderRadius: br,
              backgroundImage: `url("${escaped}")`,
              backgroundSize: "cover",
              backgroundPosition: `${posX}% ${posY}%`,
              backgroundRepeat: "no-repeat",
            }}
            onMouseDown={onMouseDown}
          />
        </div>
      </div>
      <div
        className="pointer-events-auto fixed z-[102] flex justify-center gap-2"
        style={{
          top: rect.top + rect.height + 8,
          left: rect.left,
          width: rect.width,
        }}
      >
        <button
          type="button"
          className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-md hover:bg-slate-100"
          onClick={onCommit}
        >
          Готово
        </button>
        <button
          type="button"
          className="rounded-md border border-slate-300 bg-white/95 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-md hover:bg-slate-50"
          onClick={onCancel}
        >
          Отмена
        </button>
      </div>
    </>,
    document.body,
  );
}

const TABLE_BORDER_STYLES = [
  { value: "solid", label: "Сплошная" },
  { value: "dashed", label: "Пунктир" },
  { value: "dotted", label: "Точки" },
  { value: "double", label: "Двойная" },
  { value: "none", label: "Без рамки" },
] as const;

const TABLE_BORDER_WIDTHS = [
  { value: "1", label: "1px" },
  { value: "2", label: "2px" },
  { value: "3", label: "3px" },
] as const;

function TableBorderPreview({
  value,
  isSelected,
  size = "md",
}: {
  value: string;
  isSelected: boolean;
  size?: "sm" | "md";
}) {
  const opt = TABLE_BORDER_STYLES.find((s) => s.value === value);
  const boxClass = size === "sm" ? "h-3 w-4" : "h-5 w-6";
  return (
    <div
      className={`flex items-center justify-center rounded-sm ${size === "sm" ? "h-4 w-5" : "h-6 w-7"} ${isSelected ? "ring-2 ring-[#496db3] ring-offset-1" : ""}`}
      title={opt?.label}
    >
      {value === "none" ? (
        <div className={`${boxClass} rounded bg-slate-100`} />
      ) : (
        <div
          className={`${boxClass} rounded`}
          style={{
            border: value === "double" ? "2px double #94a3b8" : `1px ${value} #94a3b8`,
          }}
        />
      )}
    </div>
  );
}

const TABLE_WIDTH_PRESETS = [
  { value: "auto", label: "Авто" },
  { value: "15%", label: "15%" },
  { value: "25%", label: "25%" },
  { value: "50%", label: "50%" },
  { value: "75%", label: "75%" },
  { value: "100%", label: "100%" },
] as const;

const TABLE_ROW_HEIGHT_PRESETS = [
  { value: "auto", label: "Авто" },
  { value: "24px", label: "24px" },
  { value: "32px", label: "32px" },
  { value: "40px", label: "40px" },
  { value: "48px", label: "48px" },
] as const;

function ListDiscIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className ?? ICON_SIZE} aria-hidden="true" data-slot="icon">
      <circle cx="10" cy="10" r="3.5" />
    </svg>
  );
}

function ListCircleIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className ?? ICON_SIZE} aria-hidden="true" data-slot="icon">
      <circle cx="10" cy="10" r="3.5" />
    </svg>
  );
}

function AlignJustifyIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className ?? ICON_SIZE}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M2.75 4.5a.75.75 0 0 1 .75-.75h13a.75.75 0 0 1 0 1.5h-13a.75.75 0 0 1-.75-.75Zm0 5.25a.75.75 0 0 1 .75-.75h13a.75.75 0 0 1 0 1.5h-13a.75.75 0 0 1-.75-.75Zm0 5.25a.75.75 0 0 1 .75-.75h13a.75.75 0 0 1 0 1.5h-13a.75.75 0 0 1-.75-.75Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function AlignCenterIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className ?? ICON_SIZE}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75Zm5 5.5a.75.75 0 0 1 .75-.75h5.5a.75.75 0 0 1 0 1.5h-5.5A.75.75 0 0 1 7 10.25Zm-5 5a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function HyphensAutoIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      className={className ?? ICON_SIZE}
      aria-hidden="true"
    >
      <path d="M3.5 5.5h5.25" />
      <path d="M11.25 5.5H16.5" />
      <path d="M3.5 10h4" />
      <path d="M9.5 10h7" />
      <path d="M3.5 14.5h6.5" />
      <path d="M12 14.5h4.5" />
    </svg>
  );
}

function AlignVerticalTopIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className ?? ICON_SIZE} aria-hidden="true">
      <path d="M3 3.75A.75.75 0 0 1 3.75 3h12.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 3.75Z" />
      <path d="M7.75 7A.75.75 0 0 0 7 7.75v8.5c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-8.5a.75.75 0 0 0-.75-.75h-4.5Z" />
    </svg>
  );
}

function AlignVerticalMiddleIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className ?? ICON_SIZE} aria-hidden="true">
      <path d="M3 10a.75.75 0 0 1 .75-.75h12.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 10Z" />
      <path d="M7.75 5A.75.75 0 0 0 7 5.75v8.5c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-8.5a.75.75 0 0 0-.75-.75h-4.5Z" />
    </svg>
  );
}

function AlignVerticalBottomIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className ?? ICON_SIZE} aria-hidden="true">
      <path d="M3 16.25a.75.75 0 0 1 .75-.75h12.5a.75.75 0 0 1 0 1.5H3.75a.75.75 0 0 1-.75-.75Z" />
      <path d="M7.75 3A.75.75 0 0 0 7 3.75v8.5c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-8.5a.75.75 0 0 0-.75-.75h-4.5Z" />
    </svg>
  );
}

function normalizeCommandColor(value: string | null | undefined): string {
  if (!value) return "#000000";
  const raw = String(value).trim().toLowerCase();
  if (raw.startsWith("#")) {
    if (raw.length === 4) {
      return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`;
    }
    return raw;
  }
  const rgb = raw.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgb) {
    const r = Math.max(0, Math.min(255, parseInt(rgb[1], 10)));
    const g = Math.max(0, Math.min(255, parseInt(rgb[2], 10)));
    const b = Math.max(0, Math.min(255, parseInt(rgb[3], 10)));
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  }
  return "#000000";
}

type PageBlock = {
  id: number;
  type: string;
  order: number;
  data: { text?: string; src?: string };
};

type PageDetails = {
  id: number;
  title: string;
  slug: string;
  status: "DRAFT" | "PUBLISHED";
  description?: string | null;
  blocks: PageBlock[];
};

function normalizeComparableText(value: string): string {
  return value.replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Старые страницы могли хранить автогенерированный text-блок:
 * `<h2>{title}</h2><p>{description}</p>`. Это SEO/карточные данные, а не контент редактора.
 */
function isSeededTitleDescriptionTextBlock(
  html: string,
  pageTitle: string,
  pageDescription: string | null | undefined,
): boolean {
  if (typeof document === "undefined") return false;
  const raw = typeof html === "string" ? html.trim() : "";
  const description = typeof pageDescription === "string" ? pageDescription.trim() : "";
  if (!raw || !description) return false;
  if (/data-web-element=|<table|<img|<iframe|<video|<ul|<ol/i.test(raw)) return false;
  try {
    const wrap = document.createElement("div");
    wrap.innerHTML = raw;
    const heading = wrap.querySelector("h1, h2, h3, h4, h5, h6");
    const paragraph = wrap.querySelector("p");
    if (!heading || !paragraph) return false;
    const headingText = normalizeComparableText(heading.textContent || "");
    const paragraphText = normalizeComparableText(paragraph.textContent || "");
    return (
      headingText === normalizeComparableText(pageTitle || "") &&
      paragraphText === normalizeComparableText(description)
    );
  } catch {
    return false;
  }
}

function getTextMediaBlockHtml(textColumnHtml?: string): string {
  const textHtml = typeof textColumnHtml === "string" && textColumnHtml.trim().length > 0
    ? textColumnHtml
    : "<h3>Заголовок блока</h3><p>Добавьте основной текст слева. Этот блок подходит для описания услуги, этапов или преимуществ.</p>";
  return (
    '<div class="page-web-text-media" data-web-element="text-media" contenteditable="false">' +
    getWebTextMediaToolbarHtml() +
    '<div class="page-web-text-media-col page-web-text-media-col--text" contenteditable="true">' +
    textHtml +
    "</div>" +
    '<div class="page-web-text-media-col page-web-text-media-col--media" contenteditable="true">' +
    '<p class="page-web-text-media-placeholder">Добавьте изображение в правую колонку</p>' +
    "</div>" +
    "</div>"
  );
}

function escapeWebBlockHtmlText(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeWebBlockHtmlAttr(s: string): string {
  return escapeWebBlockHtmlText(s).replace(/'/g, "&#39;");
}

/** Пока открыт диалог «Ссылка и название кнопки» — маркер на живой кнопке (после a→span ref иначе «отваливается»). */
const CTA_LINK_EDIT_ATTR = "data-cta-link-edit";

const CTA_LINK_MODAL_BUTTON_SELECTOR =
  "a.page-web-elements-cta-button, span.page-web-elements-cta-button, a.page-web-elements-cta-button-secondary, span.page-web-elements-cta-button-secondary, .page-web-cover-el-button, a.page-web-cover-el-button, .page-web-work-pricing a.wrg.wri.wro.wsf.wsl.wsq.wst.wsw.wtc.wtg.wtr.wts.wua.wub.wuc.wue";

function resolveCtaLinkModalTarget(from: HTMLElement): HTMLElement | null {
  if (from.matches(CTA_LINK_MODAL_BUTTON_SELECTOR)) return from;
  const viaClosest = from.closest(CTA_LINK_MODAL_BUTTON_SELECTOR) as HTMLElement | null;
  if (viaClosest) return viaClosest;
  const actions = from.closest(".page-web-elements-actions") as HTMLElement | null;
  if (actions) {
    const fromButton2 = from.closest(".page-web-elements-button2");
    if (fromButton2) {
      const secondary =
        (actions.querySelector(".page-web-elements-button2 .page-web-elements-cta-button-secondary") as HTMLElement | null) ??
        (actions.querySelector(".page-web-elements-button2 a.page-web-elements-cta-button-secondary") as HTMLElement | null);
      if (secondary) return secondary;
    }
    const primary =
      (actions.querySelector(".page-web-elements-button .page-web-elements-cta-button") as HTMLElement | null) ??
      (actions.querySelector(".page-web-elements-button a.page-web-elements-cta-button") as HTMLElement | null) ??
      (actions.querySelector(".page-web-elements-cta-button") as HTMLElement | null) ??
      (actions.querySelector("a.page-web-elements-cta-button") as HTMLElement | null);
    if (primary) return primary;
  }
  const legacyWrap = from.closest(".page-web-cover-el-button-wrap") as HTMLElement | null;
  if (legacyWrap) {
    const legacyBtn =
      (legacyWrap.querySelector(".page-web-cover-el-button") as HTMLElement | null) ??
      (legacyWrap.querySelector("a.page-web-cover-el-button") as HTMLElement | null);
    if (legacyBtn) return legacyBtn;
  }
  return null;
}

function convertSingleWebCtaAnchorToSpan(anchor: HTMLAnchorElement): HTMLSpanElement {
  const span = document.createElement("span");
  span.className = anchor.className;
  span.setAttribute("role", "button");
  const href = (anchor.getAttribute("href") || "").trim();
  if (href && href !== "#" && !href.toLowerCase().startsWith("javascript:")) {
    span.setAttribute("data-href", href);
  }
  if (
    span.classList.contains("page-web-elements-announcement-learn-more") ||
    span.classList.contains("page-web-elements-cta-button") ||
    span.classList.contains("page-web-elements-cta-button-secondary")
  ) {
    span.setAttribute("contenteditable", "false");
    span.setAttribute("tabindex", "-1");
  }
  if (anchor.hasAttribute(CTA_LINK_EDIT_ATTR)) {
    span.setAttribute(CTA_LINK_EDIT_ATTR, anchor.getAttribute(CTA_LINK_EDIT_ATTR) || "1");
  }
  while (anchor.firstChild) span.appendChild(anchor.firstChild);
  anchor.parentNode?.replaceChild(span, anchor);
  return span;
}

function ensureEditorCtaControlIsSpan(el: HTMLElement): HTMLElement {
  if (el instanceof HTMLAnchorElement && el.matches(CTA_LINK_MODAL_BUTTON_SELECTOR)) {
    return convertSingleWebCtaAnchorToSpan(el);
  }
  return el;
}

function clearCtaLinkEditMarkers(root: HTMLElement): void {
  root.querySelectorAll(`[${CTA_LINK_EDIT_ATTR}]`).forEach((node) => {
    (node as HTMLElement).removeAttribute(CTA_LINK_EDIT_ATTR);
  });
}

function syncCtaActionsPlaceholderFromButton(cta: HTMLElement): void {
  const actions = cta.closest(".page-web-elements-actions") as HTMLElement | null;
  if (!actions) return;
  const raw = (cta.textContent || "").replace(/\u200b/g, "");
  const visible = raw.replace(/[\s\u00a0]+/g, "").length === 0 ? "1" : "0";
  actions.setAttribute("data-placeholder-visible", visible);
}

function getCoverButtonLinkLabelForModal(target: HTMLElement): string {
  if (target.matches(".page-web-feature-grid-link")) {
    const clone = target.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("span[aria-hidden='true']").forEach((s) => s.remove());
    return (clone.textContent ?? "").replace(/\s+/g, " ").trim();
  }
  return (target.textContent ?? "").replace(/\u200b/g, "").trim();
}

function applyCoverButtonLinkLabelToDom(target: HTMLElement, labelRaw: string): void {
  const label = labelRaw.trim();
  if (!label) return;
  if (target.matches(".page-web-feature-grid-link")) {
    target.innerHTML = `${escapeWebBlockHtmlText(label)} <span aria-hidden="true">→</span>`;
    return;
  }
  target.textContent = label;
  syncCtaActionsPlaceholderFromButton(target);
}

type GetTextBlockHtmlOptions = { contentOnly?: boolean };

function getTextBlockHtml(textHtml?: string, options?: GetTextBlockHtmlOptions): string {
  if (options?.contentOnly) {
    return (
      '<div class="page-web-text-block" data-web-element="text-block" contenteditable="false">' +
      getWebTextBlockToolbarHtml() +
      '<div class="page-web-text-block-content" contenteditable="true">' +
      (typeof textHtml === "string" ? textHtml : "") +
      "</div>" +
      "</div>"
    );
  }
  const bodyHtml =
    typeof textHtml === "string" && textHtml.trim().length > 0
      ? textHtml
      : "<p>Добавьте основной текст блока. Подходит для обычного контента страницы.</p>";
  return (
    '<div class="page-web-text-block" data-web-element="text-block" data-text-block-has-subtitle="1" data-text-block-has-title="1" data-text-block-has-lead="1" contenteditable="false">' +
    getWebTextBlockToolbarHtml() +
    '<div class="page-web-text-block-fields" contenteditable="false">' +
    '<div class="page-web-elements page-web-elements-subtitle">' +
    '<div class="page-web-elements-field-row">' +
    '<textarea class="page-web-elements-subtitle-input" spellcheck="true" placeholder="Подзаголовок" rows="1">' +
    escapeWebBlockHtmlText("Подзаголовок") +
    "</textarea>" +
    "</div></div>" +
    '<div class="page-web-elements page-web-elements-title">' +
    '<div class="page-web-elements-field-row">' +
    '<textarea class="page-web-elements-title-input" spellcheck="true" placeholder="Заголовок" rows="1">' +
    escapeWebBlockHtmlText("Заголовок") +
    "</textarea>" +
    "</div></div>" +
    '<div class="page-web-elements page-web-elements-description">' +
    '<div class="page-web-elements-field-row">' +
    '<textarea class="page-web-elements-description-input" spellcheck="true" placeholder="Короткое описание" rows="1">' +
    escapeWebBlockHtmlText("Краткое описание под заголовком.") +
    "</textarea>" +
    "</div></div>" +
    "</div>" +
    '<div class="page-web-text-block-content" contenteditable="true">' +
    bodyHtml +
    "</div>" +
    "</div>"
  );
}

const FEATURE_GRID_LEAD_DEFAULT = "Краткое описание";

const FEATURE_GRID_CARD_DESCRIPTION_DEFAULT =
  "Добавьте описание карточки. Здесь можно указать ключевое преимущество.";

const FEATURE_GRID_MESSAGE_BODY_DEFAULT =
  "Здесь появится дополнительная информация в формате alert-блока.";

function getFeatureGridLearnMoreRowHtml(): string {
  return (
    '<p class="page-web-feature-grid-item-link-wrap">' +
    '<span class="page-web-elements-announcement-learn-more" role="button" contenteditable="false" tabindex="-1">' +
    "Подробнее" +
    "</span>" +
    "</p>"
  );
}

function getFeatureGridCardCtaRowHtml(): string {
  return (
    '<p class="page-web-elements-cta-wrap" contenteditable="false">' +
    '<span class="page-web-elements-cta-button" role="button" contenteditable="false" tabindex="-1">' +
    escapeWebBlockHtmlText("Кнопка") +
    "</span></p>"
  );
}

function getFeatureGridCardTitle2FieldHtml(initialValue: string): string {
  return (
    '<div class="page-web-elements page-web-elements-title2">' +
    '<div class="page-web-elements-field-row">' +
    '<textarea class="page-web-elements-title2-input" spellcheck="true" placeholder="Заголовок 2" rows="1">' +
    escapeWebBlockHtmlText(initialValue) +
    "</textarea></div></div>"
  );
}

function getFeatureGridMessageTitleFieldHtml(initialValue: string): string {
  return (
    '<div class="page-web-elements page-web-elements-title2">' +
    '<div class="page-web-elements-field-row">' +
    '<textarea class="page-web-elements-title2-input page-web-feature-grid-message-title" spellcheck="true" placeholder="Заголовок сообщения" rows="1">' +
    escapeWebBlockHtmlText(initialValue) +
    "</textarea></div></div>"
  );
}

function getFeatureGridMessageBodyFieldHtml(initialValue: string): string {
  return (
    '<div class="page-web-elements page-web-elements-description">' +
    '<div class="page-web-elements-field-row">' +
    '<textarea class="page-web-elements-description-input page-web-feature-grid-message-body" spellcheck="true" placeholder="Дополнительный текст alert-блока" rows="1">' +
    escapeWebBlockHtmlText(initialValue) +
    "</textarea></div></div>"
  );
}

function createFeatureGridCardTitle2Wrap(initialValue: string): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "page-web-elements page-web-elements-title2";
  const row = document.createElement("div");
  row.className = "page-web-elements-field-row";
  const ta = document.createElement("textarea");
  ta.className = "page-web-elements-title2-input";
  ta.setAttribute("spellcheck", "true");
  ta.setAttribute("placeholder", "Заголовок 2");
  ta.setAttribute("rows", "1");
  ta.value = initialValue;
  row.appendChild(ta);
  wrap.appendChild(row);
  return wrap;
}

function getFeatureGridCardDescriptionFieldHtml(initialValue: string): string {
  return (
    '<div class="page-web-elements page-web-elements-description">' +
    '<div class="page-web-elements-field-row">' +
    '<textarea class="page-web-elements-description-input" spellcheck="true" placeholder="Короткое описание" rows="1">' +
    escapeWebBlockHtmlText(initialValue) +
    "</textarea></div></div>"
  );
}

function createFeatureGridCardDescriptionWrap(initialValue: string): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "page-web-elements page-web-elements-description";
  const row = document.createElement("div");
  row.className = "page-web-elements-field-row";
  const ta = document.createElement("textarea");
  ta.className = "page-web-elements-description-input";
  ta.setAttribute("spellcheck", "true");
  ta.setAttribute("placeholder", "Короткое описание");
  ta.setAttribute("rows", "1");
  ta.value = initialValue;
  row.appendChild(ta);
  wrap.appendChild(row);
  return wrap;
}

function getFeatureGridTextBlockHtml(): string {
  return getTextBlockHtml(
    '<div class="page-web-feature-grid" data-feature-grid-cols="3">' +
      '<div class="page-web-feature-grid-content" contenteditable="false">' +
      '<div class="page-web-feature-grid-head" contenteditable="false">' +
        '<div class="page-web-elements page-web-elements-subtitle">' +
        '<div class="page-web-elements-field-row">' +
        '<textarea class="page-web-elements-subtitle-input" spellcheck="true" placeholder="Подзаголовок" rows="1">' +
        escapeWebBlockHtmlText("Подзаголовок") +
        "</textarea></div></div>" +
        '<div class="page-web-elements page-web-elements-title">' +
        '<div class="page-web-elements-field-row">' +
        '<textarea class="page-web-elements-title-input" spellcheck="true" placeholder="Заголовок 1" rows="1">' +
        escapeWebBlockHtmlText("Заголовок 1") +
        "</textarea></div></div>" +
        '<div class="page-web-elements page-web-elements-description">' +
        '<div class="page-web-elements-field-row">' +
        '<textarea class="page-web-elements-description-input" spellcheck="true" placeholder="Короткое описание" rows="1">' +
        escapeWebBlockHtmlText(FEATURE_GRID_LEAD_DEFAULT) +
        "</textarea></div></div>" +
      '</div>' +
      '<dl class="page-web-feature-grid-list">' +
        '<div class="page-web-feature-grid-item">' +
          '<dt class="page-web-feature-grid-item-title" contenteditable="false">' +
            '<span class="page-web-feature-grid-icon-wrap" aria-hidden="true">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="page-web-feature-grid-icon">' +
                '<path d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" stroke-linecap="round" stroke-linejoin="round"></path>' +
              "</svg>" +
            "</span>" +
            getFeatureGridCardTitle2FieldHtml("Мониторинг серверов") +
          "</dt>" +
          '<dd class="page-web-feature-grid-item-body" contenteditable="false">' +
            getFeatureGridCardDescriptionFieldHtml(
              "Следите за нагрузкой и доступностью серверов в одном месте. Настройте оповещения и отчёты, чтобы команда реагировала до того, как заметят пользователи.",
            ) +
            getFeatureGridLearnMoreRowHtml() +
          "</dd>" +
        "</div>" +
        '<div class="page-web-feature-grid-item">' +
          '<dt class="page-web-feature-grid-item-title" contenteditable="false">' +
            '<span class="page-web-feature-grid-icon-wrap" aria-hidden="true">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="page-web-feature-grid-icon">' +
                '<path d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" stroke-linecap="round" stroke-linejoin="round"></path>' +
              "</svg>" +
            "</span>" +
            getFeatureGridCardTitle2FieldHtml("Совместная работа") +
          "</dt>" +
          '<dd class="page-web-feature-grid-item-body" contenteditable="false">' +
            getFeatureGridCardDescriptionFieldHtml(
              "Объединяйте задачи, обсуждения и файлы в одной среде. Меньше переключений между сервисами — больше времени на продукт и общий результат.",
            ) +
            getFeatureGridLearnMoreRowHtml() +
          "</dd>" +
        "</div>" +
        '<div class="page-web-feature-grid-item">' +
          '<dt class="page-web-feature-grid-item-title" contenteditable="false">' +
            '<span class="page-web-feature-grid-icon-wrap" aria-hidden="true">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="page-web-feature-grid-icon">' +
                '<path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" stroke-linecap="round" stroke-linejoin="round"></path>' +
              "</svg>" +
            "</span>" +
            getFeatureGridCardTitle2FieldHtml("Планирование задач") +
          "</dt>" +
          '<dd class="page-web-feature-grid-item-body" contenteditable="false">' +
            getFeatureGridCardDescriptionFieldHtml(
              "Распределяйте сроки и приоритеты без хаоса в таблицах. Наглядные статусы и напоминания помогают держать план под контролем от идеи до релиза.",
            ) +
            getFeatureGridLearnMoreRowHtml() +
          "</dd>" +
        "</div>" +
      "</dl>" +
      "</div>" +
    "</div>",
    { contentOnly: true },
  ).replace('data-web-element="text-block"', 'data-web-element="text-block" data-text-block-variant="feature-grid"');
}

function getWorkPricingTextBlockHtml(): string {
  return getTextBlockHtml(
    '<div class="page-web-work-pricing">' +
      '<div class="wrc wrh wrp wse wtt wtv wuf wuo wuq wut">' +
        '<div class="wsp wui wuu">' +
          '<div class="page-web-elements page-web-elements-title" contenteditable="false" data-work-pricing-halign="left">' +
          '<div class="page-web-elements-field-row" contenteditable="false">' +
          '<textarea class="page-web-elements-title-input" spellcheck="true" placeholder="Заголовок" rows="1">' +
          escapeWebBlockHtmlText("Пожизненное участие") +
          "</textarea></div></div>" +
          '<div class="page-web-elements page-web-elements-description" contenteditable="false" data-work-pricing-halign="left">' +
          '<div class="page-web-elements-field-row" contenteditable="false">' +
          '<textarea class="page-web-elements-description-input" spellcheck="true" placeholder="Короткое описание" rows="1">' +
          escapeWebBlockHtmlText(
            "Один раз подключаетесь — и навсегда остаётесь в сообществе: материалы, встречи и поддержка без ежемесячных платежей.",
          ) +
          "</textarea></div></div>" +
          '<div class="wrg wrj wrx wsc">' +
            '<div class="page-web-elements page-web-elements-subtitle" contenteditable="false" data-work-pricing-halign="left">' +
            '<div class="page-web-elements-field-row" contenteditable="false">' +
            '<textarea class="page-web-elements-subtitle-input" spellcheck="true" placeholder="Подзаголовок" rows="1">' +
            escapeWebBlockHtmlText("Что входит") +
            "</textarea></div></div>" +
            '<div class="wrm wrt wsh"></div>' +
          "</div>" +
          '<ul role="list" class="wrf wrk wrv wrz wtd wtn wug wuh">' +
            '<li class="wrj wsb">' +
              WORK_PRICING_LI_CHECK_SVG_HTML +
              '<div class="page-web-elements page-web-elements-description" contenteditable="false" data-work-pricing-halign="left">' +
              '<div class="page-web-elements-field-row" contenteditable="false">' +
              '<textarea class="page-web-elements-description-input" spellcheck="true" placeholder="Текст пункта" rows="1">' +
              escapeWebBlockHtmlText("Доступ к закрытому форуму") +
              "</textarea></div></div>" +
            "</li>" +
            '<li class="wrj wsb">' +
              WORK_PRICING_LI_CHECK_SVG_HTML +
              '<div class="page-web-elements page-web-elements-description" contenteditable="false" data-work-pricing-halign="left">' +
              '<div class="page-web-elements-field-row" contenteditable="false">' +
              '<textarea class="page-web-elements-description-input" spellcheck="true" placeholder="Текст пункта" rows="1">' +
              escapeWebBlockHtmlText("Материалы для участников") +
              "</textarea></div></div>" +
            "</li>" +
            '<li class="wrj wsb">' +
              WORK_PRICING_LI_CHECK_SVG_HTML +
              '<div class="page-web-elements page-web-elements-description" contenteditable="false" data-work-pricing-halign="left">' +
              '<div class="page-web-elements-field-row" contenteditable="false">' +
              '<textarea class="page-web-elements-description-input" spellcheck="true" placeholder="Текст пункта" rows="1">' +
              escapeWebBlockHtmlText("Участие в ежегодной конференции") +
              "</textarea></div></div>" +
            "</li>" +
            '<li class="wrj wsb">' +
              WORK_PRICING_LI_CHECK_SVG_HTML +
              '<div class="page-web-elements page-web-elements-description" contenteditable="false" data-work-pricing-halign="left">' +
              '<div class="page-web-elements-field-row" contenteditable="false">' +
              '<textarea class="page-web-elements-description-input" spellcheck="true" placeholder="Текст пункта" rows="1">' +
              escapeWebBlockHtmlText("Фирменная футболка участника") +
              "</textarea></div></div>" +
            "</li>" +
          "</ul>" +
        "</div>" +
        '<div class="wrd wso wup wur wus wuv">' +
          '<div class="wsd wsg wsu wsw wtu wtx wuq wuw wux wuz">' +
            '<div class="wrc wrs wss">' +
              '<div class="page-web-elements page-web-elements-title2" contenteditable="false" data-work-pricing-halign="center">' +
              '<div class="page-web-elements-field-row" contenteditable="false">' +
              '<textarea class="page-web-elements-title2-input" spellcheck="true" placeholder="Подпись над ценой" rows="1">' +
              escapeWebBlockHtmlText("Один раз оплатили — навсегда ваше") +
              "</textarea></div></div>" +
              '<div class="page-web-elements page-web-elements-title" contenteditable="false" data-work-pricing-halign="center">' +
              '<div class="page-web-elements-field-row" contenteditable="false">' +
              '<textarea class="page-web-elements-title-input" spellcheck="true" placeholder="Стоимость" rows="1">' +
              escapeWebBlockHtmlText("70 000 ₽") +
              "</textarea></div></div>" +
              '<p class="page-web-elements-cta-wrap" contenteditable="false">' +
              '<a href="#" class="page-web-elements-cta-button">' +
              escapeWebBlockHtmlText("Получить доступ") +
              "</a></p>" +
              '<div class="page-web-elements page-web-elements-description" contenteditable="false" data-work-pricing-halign="left">' +
              '<div class="page-web-elements-field-row" contenteditable="false">' +
              '<textarea class="page-web-elements-description-input" spellcheck="true" placeholder="Дополнительный текст" rows="1">' +
              escapeWebBlockHtmlText(
                "Счета и чеки для бухгалтерии — удобно оформить возмещение через работодателя.",
              ) +
              "</textarea></div></div>" +
            "</div>" +
          "</div>" +
        "</div>" +
      "</div>" +
    "</div>",
    { contentOnly: true },
  ).replace('data-web-element="text-block"', 'data-web-element="text-block" data-text-block-variant="work-pricing"');
}

function isPlainWebTextBlock(block: HTMLElement): boolean {
  const v = block.getAttribute("data-text-block-variant");
  return v !== "feature-grid" && v !== "work-pricing";
}

function ensurePlainTextBlockFieldShell(block: HTMLElement): boolean {
  if (!isPlainWebTextBlock(block)) return false;
  if (block.querySelector(":scope > .page-web-text-block-fields")) return false;
  const content = block.querySelector(":scope > .page-web-text-block-content") as HTMLElement | null;
  if (!content) return false;
  const wrap = document.createElement("div");
  wrap.className = "page-web-text-block-fields";
  wrap.setAttribute("contenteditable", "false");
  wrap.innerHTML =
    '<div class="page-web-elements page-web-elements-subtitle">' +
    '<div class="page-web-elements-field-row">' +
    '<textarea class="page-web-elements-subtitle-input" spellcheck="true" placeholder="Подзаголовок" rows="1"></textarea>' +
    "</div></div>" +
    '<div class="page-web-elements page-web-elements-title">' +
    '<div class="page-web-elements-field-row">' +
    '<textarea class="page-web-elements-title-input" spellcheck="true" placeholder="Заголовок" rows="1"></textarea>' +
    "</div></div>" +
    '<div class="page-web-elements page-web-elements-description">' +
    '<div class="page-web-elements-field-row">' +
    '<textarea class="page-web-elements-description-input" spellcheck="true" placeholder="Короткое описание" rows="1"></textarea>' +
    "</div></div>";
  block.insertBefore(wrap, content);
  if (!block.hasAttribute("data-text-block-has-subtitle")) block.setAttribute("data-text-block-has-subtitle", "1");
  if (!block.hasAttribute("data-text-block-has-title")) block.setAttribute("data-text-block-has-title", "1");
  if (!block.hasAttribute("data-text-block-has-lead")) block.setAttribute("data-text-block-has-lead", "1");
  return true;
}

function ensurePlainTextBlockSubtitleFieldWrap(block: HTMLElement): boolean {
  if (!isPlainWebTextBlock(block)) return false;
  const fields = block.querySelector(":scope > .page-web-text-block-fields") as HTMLElement | null;
  if (!fields || fields.querySelector(":scope > .page-web-elements-subtitle")) return false;
  const wrap = document.createElement("div");
  wrap.className = "page-web-elements page-web-elements-subtitle";
  wrap.innerHTML =
    '<div class="page-web-elements-field-row">' +
    '<textarea class="page-web-elements-subtitle-input" spellcheck="true" placeholder="Подзаголовок" rows="1"></textarea>' +
    "</div>";
  fields.insertBefore(wrap, fields.firstChild);
  if (!block.hasAttribute("data-text-block-has-subtitle")) block.setAttribute("data-text-block-has-subtitle", "1");
  return true;
}

/** Старые обёртки input → общие `page-web-elements-*` + textarea (как в текстовом блоке v2). */
function migrateLegacyPlainTextBlockFieldsToWebElements(block: HTMLElement): boolean {
  if (!isPlainWebTextBlock(block)) return false;
  const fields = block.querySelector(":scope > .page-web-text-block-fields") as HTMLElement | null;
  if (!fields) return false;
  let changed = false;
  const makeTextarea = (className: string, placeholder: string, value: string) => {
    const ta = document.createElement("textarea");
    ta.className = className;
    ta.setAttribute("spellcheck", "true");
    ta.setAttribute("placeholder", placeholder);
    ta.setAttribute("rows", "1");
    ta.value = value;
    return ta;
  };
  const pairs: Array<{
    legacyWrap: string;
    legacyInput: string;
    kind: "subtitle" | "title" | "description";
    placeholder: string;
  }> = [
    {
      legacyWrap: ".page-web-text-block-subtitle-field-wrap",
      legacyInput: ".page-web-text-block-subtitle-input",
      kind: "subtitle",
      placeholder: "Подзаголовок",
    },
    {
      legacyWrap: ".page-web-text-block-title-field-wrap",
      legacyInput: ".page-web-text-block-title-input",
      kind: "title",
      placeholder: "Заголовок",
    },
    {
      legacyWrap: ".page-web-text-block-lead-field-wrap",
      legacyInput: ".page-web-text-block-lead-input",
      kind: "description",
      placeholder: "Короткое описание",
    },
  ];
  for (const { legacyWrap, legacyInput, kind, placeholder } of pairs) {
    const oldWrap = fields.querySelector(legacyWrap) as HTMLElement | null;
    if (!oldWrap) continue;
    const oldField = oldWrap.querySelector(legacyInput) as HTMLInputElement | HTMLTextAreaElement | null;
    const val =
      oldField instanceof HTMLTextAreaElement || oldField instanceof HTMLInputElement ? oldField.value ?? "" : "";
    const wrap = document.createElement("div");
    wrap.className = `page-web-elements page-web-elements-${kind}`;
    const taClass =
      kind === "subtitle"
        ? "page-web-elements-subtitle-input"
        : kind === "title"
          ? "page-web-elements-title-input"
          : "page-web-elements-description-input";
    const row = document.createElement("div");
    row.className = "page-web-elements-field-row";
    row.appendChild(makeTextarea(taClass, placeholder, val));
    wrap.appendChild(row);
    oldWrap.replaceWith(wrap);
    changed = true;
  }
  return changed;
}

function normalizePlainTextBlockFieldTextareas(fields: HTMLElement): boolean {
  let mutated = false;
  const defs: Array<{ selector: string; rows: number }> = [
    { selector: ".page-web-elements-subtitle-input", rows: 1 },
    { selector: ".page-web-elements-title-input", rows: 1 },
    { selector: ".page-web-elements-description-input", rows: 1 },
  ];
  defs.forEach(({ selector, rows }) => {
    const node = fields.querySelector(selector);
    if (!node) return;
    if (node instanceof HTMLInputElement) {
      const ta = document.createElement("textarea");
      ta.className = node.className;
      ta.setAttribute("spellcheck", node.getAttribute("spellcheck") ?? "true");
      ta.setAttribute("placeholder", node.getAttribute("placeholder") ?? "");
      ta.setAttribute("rows", String(rows));
      ta.value = node.value ?? "";
      if (node.style.textAlign) ta.style.textAlign = node.style.textAlign;
      if (node.getAttribute(PAGE_EDITOR_FOCUS_TARGET_ATTR) === "1") {
        ta.setAttribute(PAGE_EDITOR_FOCUS_TARGET_ATTR, "1");
      }
      node.replaceWith(ta);
      mutated = true;
      return;
    }
    if (node instanceof HTMLTextAreaElement) {
      if (node.getAttribute("rows") !== String(rows)) {
        node.setAttribute("rows", String(rows));
        mutated = true;
      }
    }
  });
  if (ensureWebElementsTextFieldRowsInRoot(fields)) mutated = true;
  return mutated;
}

/** Textarea подзаголовка / заголовков / описания: `text-align` и на `.page-web-elements-field-row`, и на поле — у textarea UA-стили перебивают наследование с ряда. */
const WEB_ELEMENTS_TEXT_FIELD_TEXTAREA_SELECTOR =
  ".page-web-elements-subtitle-input, .page-web-elements-title-input, .page-web-elements-title2-input, .page-web-elements-description-input";

function ensureWebElementsTextFieldRowWrap(elementsWrap: HTMLElement): boolean {
  let changed = false;
  const wpIsland =
    !!elementsWrap.closest(".page-web-work-pricing") &&
    (elementsWrap.classList.contains("page-web-elements-title") ||
      elementsWrap.classList.contains("page-web-elements-title2") ||
      elementsWrap.classList.contains("page-web-elements-subtitle") ||
      elementsWrap.classList.contains("page-web-elements-description"));
  const existingRow = elementsWrap.querySelector(":scope > .page-web-elements-field-row") as HTMLElement | null;
  if (existingRow) {
    const ta = existingRow.querySelector(WEB_ELEMENTS_TEXT_FIELD_TEXTAREA_SELECTOR) as HTMLTextAreaElement | null;
    if (!ta) return changed;
    const effectiveAlign = readWebElementsFieldTextAlign(ta, existingRow);
    if (effectiveAlign) {
      if (wpIsland) {
        elementsWrap.setAttribute(WORK_PRICING_WEB_ELEMENTS_HALIGN_ATTR, effectiveAlign);
        applyWebElementsFieldTextAlign(null, ta, effectiveAlign);
        if (existingRow.style.getPropertyValue("text-align")) {
          existingRow.style.removeProperty("text-align");
          changed = true;
        }
        if (existingRow.style.getPropertyValue("width")) {
          existingRow.style.removeProperty("width");
          changed = true;
        }
        if (existingRow.style.getPropertyValue("max-width")) {
          existingRow.style.removeProperty("max-width");
          changed = true;
        }
        if (existingRow.style.getPropertyValue("justify-content")) {
          webElementsFieldRowClearFlexJustify(existingRow);
          changed = true;
        }
      } else {
        applyWebElementsFieldTextAlign(existingRow, ta, effectiveAlign);
      }
      changed = true;
    } else if (!wpIsland && ta.style.getPropertyValue("text-align")) {
      ta.style.removeProperty("text-align");
      changed = true;
      if (existingRow.style.getPropertyValue("text-align")) {
        existingRow.style.removeProperty("text-align");
        changed = true;
      }
      if (existingRow.style.getPropertyValue("justify-content")) {
        webElementsFieldRowClearFlexJustify(existingRow);
        changed = true;
      }
      clearWebElementsFieldTextAlignWidth(existingRow, ta);
    }
    return changed;
  }
  const directTa = Array.from(elementsWrap.children).find(
    (c): c is HTMLTextAreaElement =>
      c instanceof HTMLTextAreaElement && c.matches(WEB_ELEMENTS_TEXT_FIELD_TEXTAREA_SELECTOR),
  );
  if (!directTa) return changed;
  const row = document.createElement("div");
  row.className = "page-web-elements-field-row";
  const taAlign = readWebElementsFieldTextAlign(directTa, null);
  if (taAlign) {
    if (wpIsland) {
      elementsWrap.setAttribute(WORK_PRICING_WEB_ELEMENTS_HALIGN_ATTR, taAlign);
      applyWebElementsFieldTextAlign(null, directTa, taAlign);
    } else {
      applyWebElementsFieldTextAlign(row, directTa, taAlign);
    }
  }
  elementsWrap.insertBefore(row, directTa);
  row.appendChild(directTa);
  return true;
}

function ensureWebElementsTextFieldRowsInRoot(root: HTMLElement): boolean {
  let changed = false;
  root
    .querySelectorAll(
      ".page-web-elements-subtitle, .page-web-elements-title, .page-web-elements-title2, .page-web-elements-description",
    )
    .forEach((n) => {
      if (n instanceof HTMLElement && ensureWebElementsTextFieldRowWrap(n)) changed = true;
    });
  return changed;
}

function webElementsActionsAlignItemsToHorizontal(
  raw: string,
): "left" | "center" | "right" | null {
  const v = raw.trim().toLowerCase();
  if (v === "center") return "center";
  if (v === "flex-end" || v === "end" || v === "self-end") return "right";
  if (v === "flex-start" || v === "start" || v === "self-start") return "left";
  return null;
}

function readWebElementsActionsAlign(outer: HTMLElement): WebElementsTextAlign {
  const aiInline = webElementsActionsAlignItemsToHorizontal(outer.style.alignItems || "");
  if (aiInline) return aiInline;
  const ta = (outer.style.textAlign || "").trim().toLowerCase();
  if (ta === "justify") return "justify";
  if (ta === "center" || ta === "right" || ta === "left") return ta as WebElementsTextAlign;
  const jc = (outer.style.justifyContent || "").trim().toLowerCase();
  if (jc === "center") return "center";
  if (jc === "flex-end" || jc === "end") return "right";
  if (jc === "flex-start" || jc === "start") return "left";
  const cs = getComputedStyle(outer);
  const display = (cs.display || "").trim().toLowerCase();
  const flexDir = (cs.flexDirection || "").trim().toLowerCase();
  if (display === "flex" && (flexDir === "column" || flexDir === "column-reverse")) {
    const fromAi = webElementsActionsAlignItemsToHorizontal(cs.alignItems || "");
    if (fromAi) return fromAi;
  }
  const csTa = (cs.textAlign || "").trim().toLowerCase();
  if (csTa === "justify") return "justify";
  if (csTa === "center" || csTa === "right" || csTa === "left") return csTa as WebElementsTextAlign;
  if (csTa === "start") return "left";
  if (csTa === "end") return "right";
  const csJc = (cs.justifyContent || "").trim().toLowerCase();
  if (csJc === "center") return "center";
  if (csJc === "flex-end" || csJc === "end") return "right";
  return "left";
}

function applyWebElementsActionsAlign(outer: HTMLElement, align: WebElementsTextAlign): void {
  outer.style.textAlign = align;
  outer.style.removeProperty("justify-content");
  const cs = getComputedStyle(outer);
  const display = (cs.display || "").trim().toLowerCase();
  const flexDir = (cs.flexDirection || "").trim().toLowerCase();
  if (display === "flex" && (flexDir === "column" || flexDir === "column-reverse")) {
    if (align === "justify") {
      outer.style.alignItems = "stretch";
    } else {
      outer.style.alignItems = align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center";
    }
  } else {
    outer.style.removeProperty("align-items");
  }
}

function getActiveWebElementsActionsInsideEditor(el: HTMLElement): HTMLElement | null {
  const active = document.activeElement as Element | null;
  if (!active || !el.contains(active)) return null;
  if (active.matches(".page-web-elements-actions-cluster")) return active as HTMLElement;
  const outer = active.closest(".page-web-elements-actions") as HTMLElement | null;
  if (!outer || !el.contains(outer)) return null;
  const cluster = outer.querySelector(":scope > .page-web-elements-actions-cluster") as HTMLElement | null;
  if (cluster) {
    if (active === outer || cluster.contains(active)) return cluster;
  }
  if (active.matches(".page-web-elements-actions") && !cluster) return outer;
  return null;
}

function getWebElementsActionsOuterFromFocus(focus: HTMLElement): HTMLElement | null {
  if (focus.matches(".page-web-elements-actions-cluster")) {
    const p = focus.parentElement;
    return p?.classList.contains("page-web-elements-actions") ? (p as HTMLElement) : null;
  }
  if (focus.matches(".page-web-elements-actions")) return focus;
  return focus.closest(".page-web-elements-actions") as HTMLElement | null;
}

/** Внешний ряд на всю ширину + внутренний кластер кнопок (подсветка по ширине контента, выравнивание через text-align на внешнем). */
function ensureWebElementsActionsCluster(outer: HTMLElement): boolean {
  if (!outer.classList.contains("page-web-elements-actions")) return false;
  let changed = false;
  const existing = outer.querySelector(":scope > .page-web-elements-actions-cluster") as HTMLElement | null;
  if (existing) {
    if (existing.getAttribute("tabindex") !== "-1") {
      existing.setAttribute("tabindex", "-1");
      changed = true;
    }
    if (outer.hasAttribute("tabindex")) {
      outer.removeAttribute("tabindex");
      changed = true;
    }
    const jc = (outer.style.justifyContent || "").trim().toLowerCase();
    if (jc) {
      const align: "left" | "center" | "right" =
        jc === "center" ? "center" : jc === "flex-end" || jc === "end" ? "right" : "left";
      applyWebElementsActionsAlign(outer, align);
      changed = true;
    }
    return changed;
  }
  const toWrap = Array.from(outer.children).filter(
    (c): c is HTMLElement =>
      c instanceof HTMLElement &&
      (c.classList.contains("page-web-elements-button") || c.classList.contains("page-web-elements-button2")),
  );
  if (toWrap.length === 0) return changed;
  const cluster = document.createElement("div");
  cluster.className = "page-web-elements-actions-cluster";
  cluster.setAttribute("tabindex", "-1");
  if (outer.getAttribute("tabindex") === "-1") {
    outer.removeAttribute("tabindex");
    changed = true;
  }
  const jc = (outer.style.justifyContent || "").trim().toLowerCase();
  if (jc) {
    const align: "left" | "center" | "right" =
      jc === "center" ? "center" : jc === "flex-end" || jc === "end" ? "right" : "left";
    applyWebElementsActionsAlign(outer, align);
    changed = true;
  } else if (!outer.style.textAlign) {
    applyWebElementsActionsAlign(outer, "left");
  }
  toWrap.forEach((n) => cluster.appendChild(n));
  outer.appendChild(cluster);
  return true;
}

function ensureWebElementsActionsClustersInRoot(root: HTMLElement): boolean {
  let changed = false;
  root.querySelectorAll(".page-web-text-block-v2 .page-web-elements-actions, .page-web-cover-inner > .page-web-elements-actions").forEach((n) => {
    if (n instanceof HTMLElement && ensureWebElementsActionsCluster(n)) changed = true;
  });
  return changed;
}

function migrateLegacyPlainTextBlockHeadingIntoFields(block: HTMLElement): boolean {
  if (!isPlainWebTextBlock(block)) return false;
  const titleInput = block.querySelector(".page-web-elements-title-input") as
    | HTMLInputElement
    | HTMLTextAreaElement
    | null;
  const leadInput = block.querySelector(".page-web-elements-description-input") as
    | HTMLInputElement
    | HTMLTextAreaElement
    | null;
  if (!titleInput || !leadInput) return false;
  const content = block.querySelector(":scope > .page-web-text-block-content") as HTMLElement | null;
  if (!content) return false;
  if (content.querySelector(".page-web-feature-grid, .page-web-work-pricing")) return false;

  let changed = false;
  const first = content.firstElementChild;
  if (first && /^H[1-6]$/i.test(first.tagName)) {
    if (!titleInput.value.trim()) {
      titleInput.value = (first.textContent || "").trim();
    }
    first.remove();
    changed = true;
    block.setAttribute("data-text-block-has-title", "1");
  }
  const p1 = content.firstElementChild;
  const p2 = p1?.nextElementSibling ?? null;
  if (
    p1?.tagName === "P" &&
    p2 &&
    !(p1 as HTMLElement).querySelector("img,table,ul,ol")
  ) {
    if (!leadInput.value.trim()) {
      leadInput.value = (p1.textContent || "").trim();
    }
    p1.remove();
    changed = true;
    block.setAttribute("data-text-block-has-lead", "1");
  }
  if (changed && !(content.textContent || "").replace(/\u200b/g, "").trim() && !content.querySelector("img,table,ul,ol,iframe,video")) {
    content.innerHTML = "<p>Добавьте основной текст блока. Подходит для обычного контента страницы.</p>";
  }
  return changed;
}

function reorderPlainTextBlockFieldsBeforeContent(block: HTMLElement): boolean {
  if (!isPlainWebTextBlock(block)) return false;
  const toolbar = block.querySelector(":scope > .page-web-text-block-toolbar") as HTMLElement | null;
  const fields = block.querySelector(":scope > .page-web-text-block-fields") as HTMLElement | null;
  const content = block.querySelector(":scope > .page-web-text-block-content") as HTMLElement | null;
  if (!toolbar || !fields || !content) return false;
  if (fields.previousElementSibling === toolbar) return false;
  block.insertBefore(fields, content);
  return true;
}

function countPlainTextBlockVisibleHeadFields(block: HTMLElement): number {
  let n = 0;
  if (block.getAttribute("data-text-block-has-subtitle") !== "0") n += 1;
  if (block.getAttribute("data-text-block-has-title") !== "0") n += 1;
  if (block.getAttribute("data-text-block-has-lead") !== "0") n += 1;
  return n;
}

function applyPlainTextBlockFieldToggle(block: HTMLElement, field: "subtitle" | "title" | "lead"): boolean {
  if (!isPlainWebTextBlock(block)) return false;
  const subtitleInput = block.querySelector(".page-web-elements-subtitle-input") as
    | HTMLInputElement
    | HTMLTextAreaElement
    | null;
  const titleInput = block.querySelector(".page-web-elements-title-input") as
    | HTMLInputElement
    | HTMLTextAreaElement
    | null;
  const leadInput = block.querySelector(".page-web-elements-description-input") as
    | HTMLInputElement
    | HTMLTextAreaElement
    | null;
  const attr =
    field === "subtitle"
      ? "data-text-block-has-subtitle"
      : field === "title"
        ? "data-text-block-has-title"
        : "data-text-block-has-lead";
  const input = field === "subtitle" ? subtitleInput : field === "title" ? titleInput : leadInput;
  const on = block.getAttribute(attr) !== "0";
  if (on) {
    if (countPlainTextBlockVisibleHeadFields(block) <= 1) return false;
    block.setAttribute(attr, "0");
    if (input) input.value = "";
    return true;
  }
  block.setAttribute(attr, "1");
  return true;
}

function syncPlainTextBlockFieldMenuButtons(toolbar: HTMLElement, block: HTMLElement) {
  if (!isPlainWebTextBlock(block)) return;
  const hasSubtitle = block.getAttribute("data-text-block-has-subtitle") !== "0";
  const hasTitle = block.getAttribute("data-text-block-has-title") !== "0";
  const hasLead = block.getAttribute("data-text-block-has-lead") !== "0";
  const count = (hasSubtitle ? 1 : 0) + (hasTitle ? 1 : 0) + (hasLead ? 1 : 0);
  (["subtitle", "title", "lead"] as const).forEach((field) => {
    const has = field === "subtitle" ? hasSubtitle : field === "title" ? hasTitle : hasLead;
    toolbar.querySelectorAll(`[data-plain-text-block-field="${field}"]`).forEach((node) => {
      const btn = node as HTMLButtonElement;
      btn.setAttribute("aria-checked", has ? "true" : "false");
      const disableRemoveLast = has && count <= 1;
      btn.disabled = disableRemoveLast;
      btn.setAttribute("aria-disabled", disableRemoveLast ? "true" : "false");
    });
  });
}

function addOneWorkPricingItem(block: HTMLElement): boolean {
  const content = block.querySelector(":scope > .page-web-text-block-content") as HTMLElement | null;
  const list = content?.querySelector(".page-web-work-pricing .wrf") as HTMLElement | null;
  if (!list) return false;
  const nextIndex = list.querySelectorAll(":scope > li").length + 1;
  const li = document.createElement("li");
  li.className = "wrj wsb";
  li.innerHTML = WORK_PRICING_LI_CHECK_SVG_HTML;
  li.appendChild(createWorkPricingDescriptionIsland("Новый пункт " + String(nextIndex), "Текст пункта"));
  list.appendChild(li);
  return true;
}

function removeOneWorkPricingItem(block: HTMLElement): boolean {
  const content = block.querySelector(":scope > .page-web-text-block-content") as HTMLElement | null;
  const list = content?.querySelector(".page-web-work-pricing .wrf") as HTMLElement | null;
  if (!list) return false;
  const items = Array.from(list.querySelectorAll(":scope > li")) as HTMLElement[];
  if (items.length <= 1) return false;
  items[items.length - 1]?.remove();
  return true;
}

type CoverInsertBlockKind = "title" | "subtitle" | "button" | "announcement";

const COVER_TYPE_PRESETS = [
  { id: "hero", label: "Банер с градиентом" },
  { id: "image", label: "Текст на фоне изображения" },
  { id: "split", label: "Изображение справа + градиент" },
] as const;

type CoverTypePresetId = (typeof COVER_TYPE_PRESETS)[number]["id"];

function getCoverInsertElementNode(inner: HTMLElement, kind: CoverInsertBlockKind): HTMLElement | null {
  if (kind === "title") {
    return inner.querySelector(":scope > .page-web-elements.page-web-elements-title") as HTMLElement | null;
  }
  if (kind === "subtitle") {
    return inner.querySelector(":scope > .page-web-elements.page-web-elements-description") as HTMLElement | null;
  }
  if (kind === "button") {
    return inner.querySelector(":scope > .page-web-elements-actions") as HTMLElement | null;
  }
  return inner.querySelector(":scope > .page-web-elements.page-web-elements-announcement") as HTMLElement | null;
}

function getCoverInsertRootSelector(kind: CoverInsertBlockKind): string {
  if (kind === "announcement") return ".page-web-elements.page-web-elements-announcement";
  if (kind === "title") return ".page-web-elements.page-web-elements-title";
  if (kind === "subtitle") return ".page-web-elements.page-web-elements-description";
  return ".page-web-elements-actions";
}

function insertCoverNodeByVisualOrder(inner: HTMLElement, node: HTMLElement, kind: CoverInsertBlockKind) {
  const order: CoverInsertBlockKind[] = ["announcement", "title", "subtitle", "button"];
  const myIdx = order.indexOf(kind);
  if (myIdx < 0) {
    inner.appendChild(node);
    return;
  }
  for (let i = myIdx + 1; i < order.length; i += 1) {
    const nextSelector = getCoverInsertRootSelector(order[i]);
    const nextNode = inner.querySelector(`:scope > ${nextSelector}`) as HTMLElement | null;
    if (nextNode) {
      inner.insertBefore(node, nextNode);
      return;
    }
  }
  inner.appendChild(node);
}

function syncCoverElementsMenuLabels(toolbar: HTMLElement) {
  const cover = toolbar.closest(".page-web-cover") as HTMLElement | null;
  const inner = cover?.querySelector(".page-web-cover-inner") as HTMLElement | null;
  if (!inner) return;
  const labels: Record<CoverInsertBlockKind, { add: string; remove: string }> = {
    title: { add: "Добавить заголовок", remove: "Убрать заголовок" },
    subtitle: { add: "Добавить подзаголовок", remove: "Убрать подзаголовок" },
    button: { add: "Добавить кнопку", remove: "Убрать кнопку" },
    announcement: { add: "Добавить плашку анонса", remove: "Убрать плашку анонса" },
  };
  toolbar.querySelectorAll("[data-insert-cover-element]").forEach((node) => {
    const btn = node as HTMLElement;
    const raw = (btn.getAttribute("data-insert-cover-element") || "") as CoverInsertBlockKind;
    if (!(raw in labels)) return;
    const exists = !!getCoverInsertElementNode(inner, raw);
    btn.setAttribute("aria-checked", exists ? "true" : "false");
    const text = exists ? labels[raw].remove : labels[raw].add;
    const labelEl = btn.querySelector(".page-web-cover-menu-insert-cover-el-label");
    if (labelEl) labelEl.textContent = text;
    else btn.textContent = text;
  });
}

function syncCoverButton2Toggle(toolbar: HTMLElement) {
  const cover = toolbar.closest(".page-web-cover") as HTMLElement | null;
  const inner = cover?.querySelector(".page-web-cover-inner") as HTMLElement | null;
  const btn = toolbar.querySelector("[data-toggle-cover-button2]") as HTMLButtonElement | null;
  if (!inner || !btn) return;
  const cluster = inner.querySelector(".page-web-elements-actions .page-web-elements-actions-cluster");
  const hasB2 = !!cluster?.querySelector(".page-web-elements-button2");
  const labelEl = btn.querySelector(".page-web-cover-menu-insert-cover-el-label");
  if (!hasB2) {
    btn.disabled = true;
    btn.setAttribute("aria-disabled", "true");
    btn.setAttribute("aria-checked", "false");
    if (labelEl) labelEl.textContent = "Дополнительная кнопка";
    return;
  }
  btn.disabled = false;
  btn.setAttribute("aria-disabled", "false");
  let v = inner.getAttribute("data-cover-show-button2");
  if (v !== "0" && v !== "1") {
    inner.setAttribute("data-cover-show-button2", "1");
    v = "1";
  }
  btn.setAttribute("aria-checked", v === "0" ? "false" : "true");
  if (labelEl) labelEl.textContent = "Дополнительная кнопка";
}

function syncCoverTypeMenuState(toolbar: HTMLElement) {
  const cover = toolbar.closest(".page-web-cover") as HTMLElement | null;
  if (!cover) return;
  const active = cover.getAttribute("data-cover-type");
  toolbar.querySelectorAll(".page-web-cover-menu-type[data-set-cover-type]").forEach((node) => {
    const btn = node as HTMLElement;
    const preset = btn.getAttribute("data-set-cover-type");
    btn.setAttribute("aria-checked", preset === active ? "true" : "false");
  });
  const uploadBtn = toolbar.querySelector(".page-web-cover-menu-upload") as HTMLButtonElement | null;
  if (uploadBtn) {
    const canUploadImage = active === "image" || active === "split";
    uploadBtn.style.display = canUploadImage ? "block" : "none";
    uploadBtn.disabled = !canUploadImage;
    uploadBtn.setAttribute("aria-disabled", canUploadImage ? "false" : "true");
  }
}

function getWebBlockMoveButtonHtml(direction: "up" | "down"): string {
  const isUp = direction === "up";
  return (
    '<button type="button" class="page-web-block-move-btn page-web-block-move-' +
    direction +
    '" tabindex="-1" contenteditable="false" data-move-web-block="' +
    direction +
    '" aria-label="' +
    (isUp ? "Переместить блок вверх" : "Переместить блок вниз") +
    '" title="' +
    (isUp ? "Переместить блок вверх" : "Переместить блок вниз") +
    '">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true" class="page-web-block-move-icon">' +
    '<path d="' +
    (isUp ? "m4.5 15.75 7.5-7.5 7.5 7.5" : "m19.5 8.25-7.5 7.5-7.5-7.5") +
    '" stroke-linecap="round" stroke-linejoin="round"></path>' +
    "</svg>" +
    "</button>"
  );
}

function getWebTextMediaToolbarHtml(): string {
  return (
    '<div class="page-web-text-media-toolbar" contenteditable="false">' +
    getWebBlockMoveButtonHtml("up") +
    '<button type="button" class="page-web-text-media-menu-trigger" tabindex="-1" aria-label="Меню блока текст+картинка" aria-haspopup="true" title="Действия с блоком">' +
    '<span class="page-web-text-media-menu-dots" aria-hidden="true"></span></button>' +
    getWebBlockMoveButtonHtml("down") +
    '<div role="menu" class="page-web-text-media-menu-dropdown">' +
    '<button type="button" role="menuitem" class="page-web-text-media-menu-delete" contenteditable="false" tabindex="-1">Удалить блок</button>' +
    "</div></div>"
  );
}

function getWebTextBlockV2ToolbarHtml(): string {
  return (
    '<div class="page-web-text-block-v2-toolbar" contenteditable="false">' +
    getWebBlockMoveButtonHtml("up") +
    '<button type="button" class="page-web-text-block-v2-menu-trigger" tabindex="-1" aria-label="Меню текстового блока v2" aria-haspopup="true" title="Действия с блоком">' +
    '<span class="page-web-text-block-v2-menu-dots" aria-hidden="true"></span></button>' +
    getWebBlockMoveButtonHtml("down") +
    '<div role="menu" class="page-web-text-block-v2-menu-dropdown">' +
    '<div class="page-web-text-block-menu-sub page-web-text-block-menu-sub--v2-elements" contenteditable="false">' +
    '<button type="button" class="page-web-text-block-menu-sub-trigger" tabindex="-1" aria-haspopup="true" aria-expanded="false">' +
    '<span class="page-web-text-block-menu-sub-label">Элементы</span>' +
    '<span class="page-web-text-block-menu-chevron" aria-hidden="true"></span></button>' +
    '<div role="menu" class="page-web-text-block-menu-sub-panel">' +
    '<button type="button" role="menuitemcheckbox" class="page-web-text-block-menu-element page-web-text-block-v2-field-toggle !flex w-full flex-row flex-nowrap items-center gap-2.5 rounded-md py-2 pl-2.5 pr-2 text-left text-[13px] font-medium text-slate-800 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40" contenteditable="false" tabindex="-1" data-toggle-v2-field="announcement" aria-checked="true">' +
    '<span class="page-web-text-block-v2-field-toggle-box inline-flex size-[18px] shrink-0 items-center justify-center rounded border border-slate-300 bg-white shadow-sm transition-colors" aria-hidden="true"></span>' +
    '<span class="min-w-0 flex-1 truncate text-slate-800">Плашка анонса</span></button>' +
    '<button type="button" role="menuitemcheckbox" class="page-web-text-block-menu-element page-web-text-block-v2-field-toggle !flex w-full flex-row flex-nowrap items-center gap-2.5 rounded-md py-2 pl-2.5 pr-2 text-left text-[13px] font-medium text-slate-800 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40" contenteditable="false" tabindex="-1" data-toggle-v2-announcement-learn-more aria-checked="false">' +
    '<span class="page-web-text-block-v2-field-toggle-box inline-flex size-[18px] shrink-0 items-center justify-center rounded border border-slate-300 bg-white shadow-sm transition-colors" aria-hidden="true"></span>' +
    '<span class="min-w-0 flex-1 truncate text-slate-800">Кнопка «Подробнее»</span></button>' +
    '<button type="button" role="menuitemcheckbox" class="page-web-text-block-menu-element page-web-text-block-v2-field-toggle !flex w-full flex-row flex-nowrap items-center gap-2.5 rounded-md py-2 pl-2.5 pr-2 text-left text-[13px] font-medium text-slate-800 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40" contenteditable="false" tabindex="-1" data-toggle-v2-field="subtitle" aria-checked="true">' +
    '<span class="page-web-text-block-v2-field-toggle-box inline-flex size-[18px] shrink-0 items-center justify-center rounded border border-slate-300 bg-white shadow-sm transition-colors" aria-hidden="true"></span>' +
    '<span class="min-w-0 flex-1 truncate text-slate-800">Подзаголовок</span></button>' +
    '<button type="button" role="menuitemcheckbox" class="page-web-text-block-menu-element page-web-text-block-v2-field-toggle !flex w-full flex-row flex-nowrap items-center gap-2.5 rounded-md py-2 pl-2.5 pr-2 text-left text-[13px] font-medium text-slate-800 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40" contenteditable="false" tabindex="-1" data-toggle-v2-field="title" aria-checked="true">' +
    '<span class="page-web-text-block-v2-field-toggle-box inline-flex size-[18px] shrink-0 items-center justify-center rounded border border-slate-300 bg-white shadow-sm transition-colors" aria-hidden="true"></span>' +
    '<span class="min-w-0 flex-1 truncate text-slate-800">Заголовок 1</span></button>' +
    '<button type="button" role="menuitemcheckbox" class="page-web-text-block-menu-element page-web-text-block-v2-field-toggle !flex w-full flex-row flex-nowrap items-center gap-2.5 rounded-md py-2 pl-2.5 pr-2 text-left text-[13px] font-medium text-slate-800 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40" contenteditable="false" tabindex="-1" data-toggle-v2-field="title2" aria-checked="true">' +
    '<span class="page-web-text-block-v2-field-toggle-box inline-flex size-[18px] shrink-0 items-center justify-center rounded border border-slate-300 bg-white shadow-sm transition-colors" aria-hidden="true"></span>' +
    '<span class="min-w-0 flex-1 truncate text-slate-800">Заголовок 2</span></button>' +
    '<button type="button" role="menuitemcheckbox" class="page-web-text-block-menu-element page-web-text-block-v2-field-toggle !flex w-full flex-row flex-nowrap items-center gap-2.5 rounded-md py-2 pl-2.5 pr-2 text-left text-[13px] font-medium text-slate-800 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40" contenteditable="false" tabindex="-1" data-toggle-v2-field="description" aria-checked="true">' +
    '<span class="page-web-text-block-v2-field-toggle-box inline-flex size-[18px] shrink-0 items-center justify-center rounded border border-slate-300 bg-white shadow-sm transition-colors" aria-hidden="true"></span>' +
    '<span class="min-w-0 flex-1 truncate text-slate-800">Короткое описание</span></button>' +
    '<button type="button" role="menuitemcheckbox" class="page-web-text-block-menu-element page-web-text-block-v2-field-toggle !flex w-full flex-row flex-nowrap items-center gap-2.5 rounded-md py-2 pl-2.5 pr-2 text-left text-[13px] font-medium text-slate-800 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40" contenteditable="false" tabindex="-1" data-toggle-v2-field="button" aria-checked="false">' +
    '<span class="page-web-text-block-v2-field-toggle-box inline-flex size-[18px] shrink-0 items-center justify-center rounded border border-slate-300 bg-white shadow-sm transition-colors" aria-hidden="true"></span>' +
    '<span class="min-w-0 flex-1 truncate text-slate-800">Кнопка</span></button>' +
    '<button type="button" role="menuitemcheckbox" class="page-web-text-block-menu-element page-web-text-block-v2-field-toggle !flex w-full flex-row flex-nowrap items-center gap-2.5 rounded-md py-2 pl-2.5 pr-2 text-left text-[13px] font-medium text-slate-800 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40" contenteditable="false" tabindex="-1" data-toggle-v2-field="button2" aria-checked="false">' +
    '<span class="page-web-text-block-v2-field-toggle-box inline-flex size-[18px] shrink-0 items-center justify-center rounded border border-slate-300 bg-white shadow-sm transition-colors" aria-hidden="true"></span>' +
    '<span class="min-w-0 flex-1 truncate text-slate-800">Дополнительная кнопка</span></button>' +
    "</div></div>" +
    '<div class="page-web-text-block-menu-sep page-web-text-block-v2-menu-sep" aria-hidden="true"></div>' +
    '<button type="button" role="menuitem" class="page-web-text-block-v2-menu-delete" contenteditable="false" tabindex="-1">Удалить блок</button>' +
    "</div></div>"
  );
}

function getTextBlockV2Html(): string {
  return (
    '<div class="page-web-text-block-v2" data-web-element="text-block-v2" contenteditable="false" data-v2-show-announcement="1" data-v2-show-subtitle="1" data-v2-show-title="1" data-v2-show-title2="1" data-v2-show-description="1" data-v2-show-button="0" data-v2-show-button2="0" data-v2-announcement-learn-more="0">' +
    getWebTextBlockV2ToolbarHtml() +
    '<div class="page-web-text-block-v2-fields" contenteditable="false">' +
    '<div class="page-web-elements page-web-elements-announcement">' +
    '<div class="page-web-elements-announcement-row">' +
    '<div class="page-web-elements-announcement-input-shell">' +
    '<div class="page-web-elements-announcement-strip" contenteditable="false">' +
    '<div class="page-web-elements-announcement-input" contenteditable="true" spellcheck="true" role="textbox" aria-multiline="true" data-placeholder="Анонс">' +
    escapeWebBlockHtmlText("Анонс: мы запустили новый этап проекта.") +
    "</div>" +
    "</div>" +
    "</div>" +
    "</div>" +
    "</div>" +
    '<div class="page-web-elements page-web-elements-subtitle">' +
    '<div class="page-web-elements-field-row">' +
    '<textarea class="page-web-elements-subtitle-input" spellcheck="true" placeholder="Подзаголовок" rows="1">' +
    escapeWebBlockHtmlText("Подзаголовок") +
    "</textarea>" +
    "</div></div>" +
    '<div class="page-web-elements page-web-elements-title">' +
    '<div class="page-web-elements-field-row">' +
    '<textarea class="page-web-elements-title-input" spellcheck="true" placeholder="Заголовок 1" rows="1">' +
    escapeWebBlockHtmlText("Заголовок 1") +
    "</textarea>" +
    "</div></div>" +
    '<div class="page-web-elements page-web-elements-title2">' +
    '<div class="page-web-elements-field-row">' +
    '<textarea class="page-web-elements-title2-input" spellcheck="true" placeholder="Заголовок 2" rows="1">' +
    escapeWebBlockHtmlText("Заголовок 2") +
    "</textarea>" +
    "</div></div>" +
    '<div class="page-web-elements page-web-elements-description">' +
    '<div class="page-web-elements-field-row">' +
    '<textarea class="page-web-elements-description-input" spellcheck="true" placeholder="Короткое описание" rows="1">' +
    escapeWebBlockHtmlText("Короткое описание") +
    "</textarea>" +
    "</div></div>" +
    '<div class="page-web-elements-actions" contenteditable="false">' +
    '<div class="page-web-elements-actions-cluster" tabindex="-1">' +
    '<div class="page-web-elements page-web-elements-button">' +
    '<p class="page-web-elements-cta-wrap" contenteditable="false">' +
    '<a href="#" class="page-web-elements-cta-button">' +
    escapeWebBlockHtmlText("Кнопка") +
    "</a></p>" +
    "</div>" +
    '<div class="page-web-elements page-web-elements-button2">' +
    '<p class="page-web-elements-cta-wrap" contenteditable="false">' +
    '<a href="#" class="page-web-elements-cta-button-secondary">' +
    escapeWebBlockHtmlText("Дополнительно") +
    "</a></p>" +
    "</div>" +
    "</div>" +
    "</div>" +
    "</div>" +
    "</div>"
  );
}

function getWebArticleTextToolbarHtml(): string {
  const fieldToggle = (field: "title" | "body", label: string) =>
    '<button type="button" role="menuitemcheckbox" class="page-web-text-block-menu-element page-web-text-block-v2-field-toggle !flex w-full flex-row flex-nowrap items-center gap-2.5 rounded-md py-2 pl-2.5 pr-2 text-left text-[13px] font-medium text-slate-800 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40" contenteditable="false" tabindex="-1" data-toggle-article-field="' +
    field +
    '" aria-checked="true">' +
    '<span class="page-web-text-block-v2-field-toggle-box inline-flex size-[18px] shrink-0 items-center justify-center rounded border border-slate-300 bg-white shadow-sm transition-colors" aria-hidden="true"></span>' +
    '<span class="min-w-0 flex-1 truncate text-slate-800">' +
    label +
    "</span></button>";
  return (
    '<div class="page-web-article-text-toolbar" contenteditable="false">' +
    getWebBlockMoveButtonHtml("up") +
    '<button type="button" class="page-web-article-text-menu-trigger" tabindex="-1" aria-label="Меню блока «Текст статьи»" aria-haspopup="true" title="Действия с блоком">' +
    '<span class="page-web-article-text-menu-dots" aria-hidden="true"></span></button>' +
    getWebBlockMoveButtonHtml("down") +
    '<div role="menu" class="page-web-article-text-menu-dropdown">' +
    '<div class="page-web-text-block-menu-sub page-web-text-block-menu-sub--article-elements" contenteditable="false">' +
    '<button type="button" class="page-web-text-block-menu-sub-trigger" tabindex="-1" aria-haspopup="true" aria-expanded="false">' +
    '<span class="page-web-text-block-menu-sub-label">Элементы</span>' +
    '<span class="page-web-text-block-menu-chevron" aria-hidden="true"></span></button>' +
    '<div role="menu" class="page-web-text-block-menu-sub-panel">' +
    fieldToggle("title", "Заголовок") +
    fieldToggle("body", "Основной текст статьи") +
    "</div></div>" +
    '<div class="page-web-text-block-menu-sep page-web-article-text-menu-sep" aria-hidden="true"></div>' +
    '<button type="button" role="menuitem" class="page-web-article-text-menu-delete" contenteditable="false" tabindex="-1">Удалить блок</button>' +
    "</div></div>"
  );
}

function getArticleTextHtml(): string {
  return (
    '<div class="page-web-article-text" data-web-element="article-text" contenteditable="false" data-article-show-title="1" data-article-show-body="1">' +
    getWebArticleTextToolbarHtml() +
    '<div class="page-web-article-text-fields" contenteditable="false">' +
    '<div class="page-web-elements page-web-elements-title">' +
    '<div class="page-web-elements-field-row">' +
    '<textarea class="page-web-elements-title-input" spellcheck="true" placeholder="Заголовок" rows="1">' +
    escapeWebBlockHtmlText("Заголовок статьи") +
    "</textarea>" +
    "</div></div>" +
    "</div>" +
    '<div class="page-web-elements page-web-elements-description page-web-article-text-body" contenteditable="false">' +
    '<div class="page-web-elements-field-row">' +
    '<textarea class="page-web-elements-description-input page-web-article-text-body-input" spellcheck="true" placeholder="Основной текст статьи" rows="1">' +
    escapeWebBlockHtmlText("Добавьте основной текст статьи. Здесь размещается полный текст публикации.") +
    "</textarea>" +
    "</div>" +
    "</div>" +
    "</div>"
  );
}

function getWebAccordionHeadFieldsHtml(overrides?: {
  subtitle?: string;
  title?: string;
  description?: string;
}): string {
  return getWebTimelineHeadFieldsHtml({
    subtitle: overrides?.subtitle ?? "Частые вопросы",
    title: overrides?.title ?? "Ответы на популярные вопросы",
    description:
      overrides?.description ??
      "Краткие пояснения по типовым ситуациям. Раскройте пункт, чтобы прочитать подробный ответ.",
  });
}

function getWebAccordionToolbarHtml(): string {
  const fieldToggle = (field: "subtitle" | "title" | "description", label: string) =>
    '<button type="button" role="menuitemcheckbox" class="page-web-text-block-menu-element page-web-text-block-v2-field-toggle !flex w-full flex-row flex-nowrap items-center gap-2.5 rounded-md py-2 pl-2.5 pr-2 text-left text-[13px] font-medium text-slate-800 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40" contenteditable="false" tabindex="-1" data-toggle-accordion-field="' +
    field +
    '" aria-checked="true">' +
    '<span class="page-web-text-block-v2-field-toggle-box inline-flex size-[18px] shrink-0 items-center justify-center rounded border border-slate-300 bg-white shadow-sm transition-colors" aria-hidden="true"></span>' +
    '<span class="min-w-0 flex-1 truncate text-slate-800">' +
    label +
    "</span></button>";
  return (
    '<div class="page-web-accordion-toolbar" contenteditable="false">' +
    getWebBlockMoveButtonHtml("up") +
    '<button type="button" class="page-web-accordion-menu-trigger" tabindex="-1" aria-label="Меню блока «Аккордеон»" aria-haspopup="true" title="Действия с блоком">' +
    '<span class="page-web-accordion-menu-dots" aria-hidden="true"></span></button>' +
    getWebBlockMoveButtonHtml("down") +
    '<div role="menu" class="page-web-accordion-menu-dropdown">' +
    '<div class="page-web-text-block-menu-sub page-web-text-block-menu-sub--accordion-elements" contenteditable="false">' +
    '<button type="button" class="page-web-text-block-menu-sub-trigger" tabindex="-1" aria-haspopup="true" aria-expanded="false">' +
    '<span class="page-web-text-block-menu-sub-label">Элементы</span>' +
    '<span class="page-web-text-block-menu-chevron" aria-hidden="true"></span></button>' +
    '<div role="menu" class="page-web-text-block-menu-sub-panel">' +
    fieldToggle("subtitle", "Подзаголовок") +
    fieldToggle("title", "Заголовок") +
    fieldToggle("description", "Описание") +
    "</div></div>" +
    '<div class="page-web-accordion-menu-sep" aria-hidden="true"></div>' +
    '<button type="button" role="menuitem" class="page-web-accordion-menu-add-item" contenteditable="false" tabindex="-1">Добавить пункт</button>' +
    '<button type="button" role="menuitem" class="page-web-accordion-menu-remove-item" contenteditable="false" tabindex="-1">Удалить последний пункт</button>' +
    '<div class="page-web-accordion-menu-sep" aria-hidden="true"></div>' +
    '<button type="button" role="menuitem" class="page-web-accordion-menu-delete" contenteditable="false" tabindex="-1">Удалить блок</button>' +
    "</div></div>"
  );
}

function getAccordionHtml(): string {
  return (
    '<div class="page-web-accordion" data-web-element="accordion" contenteditable="false" data-accordion-show-subtitle="1" data-accordion-show-title="1" data-accordion-show-description="1">' +
    getWebAccordionToolbarHtml() +
    '<div class="page-web-accordion-head" contenteditable="false">' +
    getWebAccordionHeadFieldsHtml() +
    "</div>" +
    '<dl class="page-web-accordion-list" contenteditable="false">' +
    getWebAccordionItemHtml(
      "Как оформить заявку?",
      "Оставьте контакты в форме обратной связи — мы перезвоним или ответим по e-mail в рабочее время.",
    ) +
    getWebAccordionItemHtml(
      "Сколько времени занимает обработка?",
      "Обычно ответим в течение одного рабочего дня. Сложные запросы согласуем отдельно.",
    ) +
    "</dl></div>"
  );
}

function reorderWebAccordionShellChildren(block: HTMLElement): boolean {
  const toolbar = block.querySelector(":scope > .page-web-accordion-toolbar") as HTMLElement | null;
  const head = block.querySelector(":scope > .page-web-accordion-head") as HTMLElement | null;
  const list = block.querySelector(":scope > .page-web-accordion-list") as HTMLElement | null;
  if (!toolbar || !list) return false;
  let changed = false;
  if (block.firstElementChild !== toolbar) {
    block.insertBefore(toolbar, block.firstChild);
    changed = true;
  }
  if (head) {
    if (head.previousElementSibling !== toolbar) {
      block.insertBefore(head, list);
      changed = true;
    }
    if (list.previousElementSibling !== head) {
      block.insertBefore(list, head.nextSibling);
      changed = true;
    }
  } else if (list.previousElementSibling !== toolbar) {
    block.insertBefore(list, toolbar.nextSibling);
    changed = true;
  }
  return changed;
}

type WebAccordionHeadFieldKey = "subtitle" | "title" | "description";

const WEB_ACCORDION_HEAD_FIELD_ATTR: Record<WebAccordionHeadFieldKey, string> = {
  subtitle: "data-accordion-show-subtitle",
  title: "data-accordion-show-title",
  description: "data-accordion-show-description",
};

function isWebAccordionHeadFieldKey(value: string | null | undefined): value is WebAccordionHeadFieldKey {
  return value === "subtitle" || value === "title" || value === "description";
}

function normalizeWebAccordionVisibilityAttrs(block: HTMLElement): boolean {
  let changed = false;
  (["subtitle", "title", "description"] as const).forEach((k) => {
    const attr = WEB_ACCORDION_HEAD_FIELD_ATTR[k];
    const raw = block.getAttribute(attr);
    if (raw !== "0" && raw !== "1") {
      block.setAttribute(attr, "1");
      changed = true;
    }
  });
  return changed;
}

function isWebAccordionHeadFieldVisible(block: HTMLElement, kind: WebAccordionHeadFieldKey): boolean {
  return block.getAttribute(WEB_ACCORDION_HEAD_FIELD_ATTR[kind]) !== "0";
}

function countVisibleWebAccordionHeadFields(block: HTMLElement): number {
  let n = 0;
  if (isWebAccordionHeadFieldVisible(block, "subtitle")) n += 1;
  if (isWebAccordionHeadFieldVisible(block, "title")) n += 1;
  if (isWebAccordionHeadFieldVisible(block, "description")) n += 1;
  return n;
}

function toggleWebAccordionHeadField(block: HTMLElement, kind: WebAccordionHeadFieldKey): boolean {
  const attr = WEB_ACCORDION_HEAD_FIELD_ATTR[kind];
  if (isWebAccordionHeadFieldVisible(block, kind)) {
    if (countVisibleWebAccordionHeadFields(block) <= 1) return false;
    block.setAttribute(attr, "0");
    return true;
  }
  block.setAttribute(attr, "1");
  return true;
}

function syncWebAccordionElementsMenuState(toolbar: HTMLElement) {
  const block = toolbar.closest(".page-web-accordion") as HTMLElement | null;
  if (!block) return;
  const count = countVisibleWebAccordionHeadFields(block);
  toolbar.querySelectorAll("[data-toggle-accordion-field]").forEach((node) => {
    const btn = node as HTMLButtonElement;
    const raw = btn.getAttribute("data-toggle-accordion-field");
    if (!isWebAccordionHeadFieldKey(raw)) return;
    const on = isWebAccordionHeadFieldVisible(block, raw);
    btn.setAttribute("aria-checked", on ? "true" : "false");
    const disableUncheck = on && count <= 1;
    btn.disabled = disableUncheck;
    btn.setAttribute("aria-disabled", disableUncheck ? "true" : "false");
  });
}

/** Шапка «Этапы работы»: та же разметка полей, что у текстового блока v2 (`page-web-text-block-v2-fields` + островки). */
function getWebTimelineHeadFieldsHtml(overrides?: {
  subtitle?: string;
  title?: string;
  description?: string;
}): string {
  const subtitle = escapeWebBlockHtmlText(
    (overrides?.subtitle != null ? overrides.subtitle.trim() : "") || "Как мы работаем",
  );
  const title = escapeWebBlockHtmlText(
    (overrides?.title != null ? overrides.title.trim() : "") || "Этапы работы",
  );
  const description = escapeWebBlockHtmlText(
    (overrides?.description != null ? overrides.description.trim() : "") ||
      "Прозрачный процесс от первого брифа до финального результата с понятными сроками на каждом шаге.",
  );
  return (
    '<div class="page-web-text-block-v2-fields" contenteditable="false">' +
    '<div class="page-web-elements page-web-elements-subtitle">' +
    '<div class="page-web-elements-field-row">' +
    '<textarea class="page-web-elements-subtitle-input" spellcheck="true" placeholder="Подзаголовок" rows="1">' +
    subtitle +
    "</textarea></div></div>" +
    '<div class="page-web-elements page-web-elements-title">' +
    '<div class="page-web-elements-field-row">' +
    '<textarea class="page-web-elements-title-input" spellcheck="true" placeholder="Заголовок 1" rows="1">' +
    title +
    "</textarea></div></div>" +
    '<div class="page-web-elements page-web-elements-description">' +
    '<div class="page-web-elements-field-row">' +
    '<textarea class="page-web-elements-description-input" spellcheck="true" placeholder="Короткое описание" rows="1">' +
    description +
    "</textarea></div></div>" +
    "</div>"
  );
}

function migrateLegacyTimelineHeadToWebElements(timeline: HTMLElement): boolean {
  const head = timeline.querySelector(":scope > .page-web-timeline-head") as HTMLElement | null;
  if (!head) return false;
  const fieldsShell = head.querySelector(":scope > .page-web-text-block-v2-fields") as HTMLElement | null;
  if (fieldsShell?.querySelector("textarea.page-web-elements-title-input")) {
    return false;
  }
  const subOld = head.querySelector(".page-web-timeline-subtitle");
  const titleOld = head.querySelector(".page-web-timeline-heading");
  const descOld = head.querySelector(".page-web-timeline-description");
  if (subOld || titleOld || descOld) {
    const subtitle = (subOld?.textContent ?? "").replace(/[\u200b\u00a0]/g, " ").replace(/\s+/g, " ").trim();
    const title = (titleOld?.textContent ?? "").replace(/[\u200b\u00a0]/g, " ").replace(/\s+/g, " ").trim();
    const description = (descOld?.textContent ?? "").replace(/[\u200b\u00a0]/g, " ").replace(/\s+/g, " ").trim();
    head.innerHTML = getWebTimelineHeadFieldsHtml({
      subtitle: subtitle || undefined,
      title: title || undefined,
      description: description || undefined,
    });
    head.setAttribute("contenteditable", "false");
    return true;
  }
  const taSub = head.querySelector("textarea.page-web-elements-subtitle-input") as HTMLTextAreaElement | null;
  const taTitle = head.querySelector("textarea.page-web-elements-title-input") as HTMLTextAreaElement | null;
  const taDesc = head.querySelector("textarea.page-web-elements-description-input") as HTMLTextAreaElement | null;
  if (taSub && taTitle && taDesc) {
    head.innerHTML = getWebTimelineHeadFieldsHtml({
      subtitle: taSub.value,
      title: taTitle.value,
      description: taDesc.value,
    });
    head.setAttribute("contenteditable", "false");
    return true;
  }
  return false;
}

function getWebTimelineItemTitle2Html(titleText: string): string {
  return (
    '<div class="page-web-elements page-web-elements-title2">' +
    '<div class="page-web-elements-field-row">' +
    '<textarea class="page-web-elements-title2-input" spellcheck="true" placeholder="Заголовок 2" rows="1">' +
    escapeWebBlockHtmlText(titleText) +
    "</textarea></div></div>"
  );
}

function getWebTimelineItemTermHtml(text: string): string {
  return (
    '<div class="page-web-elements page-web-elements-subtitle page-web-timeline-term">' +
    '<div class="page-web-elements-field-row">' +
    '<textarea class="page-web-elements-subtitle-input" spellcheck="true" placeholder="Срок" rows="1">' +
    escapeWebBlockHtmlText(text) +
    "</textarea></div></div>"
  );
}

function getWebTimelineItemStepDescriptionHtml(text: string): string {
  return (
    '<div class="page-web-elements page-web-elements-description page-web-timeline-text">' +
    '<div class="page-web-elements-field-row">' +
    '<textarea class="page-web-elements-description-input" spellcheck="true" placeholder="Короткое описание" rows="1">' +
    escapeWebBlockHtmlText(text) +
    "</textarea></div></div>"
  );
}

function getTimelineItemStepTitlePlain(item: HTMLElement): string {
  const ta = item.querySelector(
    ":scope > .page-web-timeline-content textarea.page-web-elements-title2-input",
  ) as HTMLTextAreaElement | null;
  if (ta) return (ta.value || "").replace(/[\u200b\u00a0]/g, " ").replace(/\s+/g, " ").trim();
  const legacy = item.querySelector(":scope > .page-web-timeline-content .page-web-timeline-title");
  return (legacy?.textContent ?? "").replace(/[\u200b\u00a0]/g, " ").replace(/\s+/g, " ").trim();
}

function getTimelineItemTermPlain(item: HTMLElement): string {
  const ta = item.querySelector(
    ":scope > .page-web-elements.page-web-timeline-term textarea.page-web-elements-subtitle-input",
  ) as HTMLTextAreaElement | null;
  if (ta) return (ta.value || "").replace(/[\u200b\u00a0]/g, " ").replace(/\s+/g, " ").trim();
  const legacy = item.querySelector(":scope > p.page-web-timeline-term");
  return (legacy?.textContent ?? "").replace(/[\u200b\u00a0]/g, " ").replace(/\s+/g, " ").trim();
}

function getTimelineItemStepBodyPlain(item: HTMLElement): string {
  const ta = item.querySelector(
    ":scope > .page-web-timeline-content .page-web-elements.page-web-elements-description.page-web-timeline-text textarea.page-web-elements-description-input",
  ) as HTMLTextAreaElement | null;
  if (ta) return (ta.value || "").replace(/[\u200b\u00a0]/g, " ").replace(/\s+/g, " ").trim();
  const legacy = item.querySelector(":scope > .page-web-timeline-content p.page-web-timeline-text");
  return (legacy?.textContent ?? "").replace(/[\u200b\u00a0]/g, " ").replace(/\s+/g, " ").trim();
}

function migrateLegacyTimelineItemsToWebElements(timeline: HTMLElement): boolean {
  let changed = false;
  timeline.querySelectorAll(".page-web-timeline-item").forEach((it) => {
    const item = it as HTMLElement;
    const content = item.querySelector(":scope > .page-web-timeline-content") as HTMLElement | null;
    if (content) {
      if (!content.querySelector(":scope textarea.page-web-elements-title2-input")) {
        const legTitle = content.querySelector(":scope > .page-web-timeline-title");
        if (legTitle) {
          const text = (legTitle.textContent ?? "").replace(/[\u200b\u00a0]/g, " ").replace(/\s+/g, " ").trim();
          const tmp = document.createElement("div");
          tmp.innerHTML = getWebTimelineItemTitle2Html(text);
          const first = tmp.firstElementChild;
          if (first) {
            legTitle.replaceWith(first);
            changed = true;
          }
        }
      }
      if (
        !content.querySelector(
          ":scope > .page-web-elements.page-web-elements-description.page-web-timeline-text textarea.page-web-elements-description-input",
        )
      ) {
        const legText = content.querySelector(":scope > p.page-web-timeline-text");
        if (legText) {
          const text = (legText.textContent ?? "").replace(/[\u200b\u00a0]/g, " ").replace(/\s+/g, " ").trim();
          const tmp = document.createElement("div");
          tmp.innerHTML = getWebTimelineItemStepDescriptionHtml(text);
          const first = tmp.firstElementChild;
          if (first) {
            legText.replaceWith(first);
            changed = true;
          }
        }
      }
    }
    if (!item.querySelector(":scope > .page-web-elements.page-web-timeline-term textarea.page-web-elements-subtitle-input")) {
      const legTerm = item.querySelector(":scope > p.page-web-timeline-term");
      if (legTerm) {
        const text = (legTerm.textContent ?? "").replace(/[\u200b\u00a0]/g, " ").replace(/\s+/g, " ").trim();
        const tmp = document.createElement("div");
        tmp.innerHTML = getWebTimelineItemTermHtml(text);
        const first = tmp.firstElementChild;
        if (first) {
          legTerm.replaceWith(first);
          changed = true;
        }
      }
    }
  });
  return changed;
}

function getWebTextBlockToolbarHtml(): string {
  return (
    '<div class="page-web-text-block-toolbar" contenteditable="false">' +
    getWebBlockMoveButtonHtml("up") +
    '<button type="button" class="page-web-text-block-menu-trigger" tabindex="-1" aria-label="Меню текстового блока" aria-haspopup="true" title="Действия с блоком">' +
    '<span class="page-web-text-block-menu-dots" aria-hidden="true"></span></button>' +
    getWebBlockMoveButtonHtml("down") +
    '<div role="menu" class="page-web-text-block-menu-dropdown">' +
    '<div class="page-web-text-block-menu-plain-fields" contenteditable="false">' +
    '<button type="button" role="menuitemcheckbox" class="page-web-text-block-menu-element page-web-text-block-v2-field-toggle !flex w-full flex-row flex-nowrap items-center gap-2.5 rounded-md py-2 pl-2.5 pr-2 text-left text-[13px] font-medium text-slate-800 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40" contenteditable="false" tabindex="-1" data-plain-text-block-field="subtitle" aria-checked="true">' +
    '<span class="page-web-text-block-v2-field-toggle-box inline-flex size-[18px] shrink-0 items-center justify-center rounded border border-slate-300 bg-white shadow-sm transition-colors" aria-hidden="true"></span>' +
    '<span class="min-w-0 flex-1 truncate text-slate-800">Подзаголовок</span></button>' +
    '<button type="button" role="menuitemcheckbox" class="page-web-text-block-menu-element page-web-text-block-v2-field-toggle !flex w-full flex-row flex-nowrap items-center gap-2.5 rounded-md py-2 pl-2.5 pr-2 text-left text-[13px] font-medium text-slate-800 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40" contenteditable="false" tabindex="-1" data-plain-text-block-field="title" aria-checked="true">' +
    '<span class="page-web-text-block-v2-field-toggle-box inline-flex size-[18px] shrink-0 items-center justify-center rounded border border-slate-300 bg-white shadow-sm transition-colors" aria-hidden="true"></span>' +
    '<span class="min-w-0 flex-1 truncate text-slate-800">Заголовок 1</span></button>' +
    '<button type="button" role="menuitemcheckbox" class="page-web-text-block-menu-element page-web-text-block-v2-field-toggle !flex w-full flex-row flex-nowrap items-center gap-2.5 rounded-md py-2 pl-2.5 pr-2 text-left text-[13px] font-medium text-slate-800 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40" contenteditable="false" tabindex="-1" data-plain-text-block-field="lead" aria-checked="true">' +
    '<span class="page-web-text-block-v2-field-toggle-box inline-flex size-[18px] shrink-0 items-center justify-center rounded border border-slate-300 bg-white shadow-sm transition-colors" aria-hidden="true"></span>' +
    '<span class="min-w-0 flex-1 truncate text-slate-800">Описание</span></button>' +
    "</div>" +
    '<div class="page-web-text-block-menu-sep page-web-text-block-menu-sep--plain-fields" aria-hidden="true"></div>' +
    '<div class="page-web-text-block-menu-sub page-web-text-block-menu-sub--feature-grid-block-elements" contenteditable="false">' +
    '<button type="button" class="page-web-text-block-menu-sub-trigger" tabindex="-1" aria-haspopup="true" aria-expanded="false">' +
    '<span class="page-web-text-block-menu-sub-label">Элементы блока</span>' +
    '<span class="page-web-text-block-menu-chevron" aria-hidden="true"></span></button>' +
    '<div role="menu" class="page-web-text-block-menu-sub-panel">' +
    '<button type="button" role="menuitemcheckbox" class="page-web-text-block-menu-element page-web-text-block-v2-field-toggle !flex w-full flex-row flex-nowrap items-center gap-2.5 rounded-md py-2 pl-2.5 pr-2 text-left text-[13px] font-medium text-slate-800 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40" contenteditable="false" tabindex="-1" data-toggle-feature-grid-element="subtitle" aria-checked="true">' +
    '<span class="page-web-text-block-v2-field-toggle-box inline-flex size-[18px] shrink-0 items-center justify-center rounded border border-slate-300 bg-white shadow-sm transition-colors" aria-hidden="true"></span>' +
    '<span class="min-w-0 flex-1 truncate text-slate-800">Подзаголовок</span></button>' +
    '<button type="button" role="menuitemcheckbox" class="page-web-text-block-menu-element page-web-text-block-v2-field-toggle !flex w-full flex-row flex-nowrap items-center gap-2.5 rounded-md py-2 pl-2.5 pr-2 text-left text-[13px] font-medium text-slate-800 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40" contenteditable="false" tabindex="-1" data-toggle-feature-grid-element="title" aria-checked="true">' +
    '<span class="page-web-text-block-v2-field-toggle-box inline-flex size-[18px] shrink-0 items-center justify-center rounded border border-slate-300 bg-white shadow-sm transition-colors" aria-hidden="true"></span>' +
    '<span class="min-w-0 flex-1 truncate text-slate-800">Заголовок</span></button>' +
    '<button type="button" role="menuitemcheckbox" class="page-web-text-block-menu-element page-web-text-block-v2-field-toggle !flex w-full flex-row flex-nowrap items-center gap-2.5 rounded-md py-2 pl-2.5 pr-2 text-left text-[13px] font-medium text-slate-800 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40" contenteditable="false" tabindex="-1" data-toggle-feature-grid-element="lead" aria-checked="true">' +
    '<span class="page-web-text-block-v2-field-toggle-box inline-flex size-[18px] shrink-0 items-center justify-center rounded border border-slate-300 bg-white shadow-sm transition-colors" aria-hidden="true"></span>' +
    '<span class="min-w-0 flex-1 truncate text-slate-800">Описание</span></button>' +
    '<button type="button" role="menuitemcheckbox" class="page-web-text-block-menu-element page-web-text-block-v2-field-toggle !flex w-full flex-row flex-nowrap items-center gap-2.5 rounded-md py-2 pl-2.5 pr-2 text-left text-[13px] font-medium text-slate-800 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40" contenteditable="false" tabindex="-1" data-feature-grid-block-toggle="cards" aria-checked="true">' +
    '<span class="page-web-text-block-v2-field-toggle-box inline-flex size-[18px] shrink-0 items-center justify-center rounded border border-slate-300 bg-white shadow-sm transition-colors" aria-hidden="true"></span>' +
    '<span class="min-w-0 flex-1 truncate text-slate-800">Карточки</span></button>' +
    "</div></div>" +
    '<div class="page-web-text-block-menu-sub page-web-text-block-menu-sub--feature-grid-card-elements" contenteditable="false">' +
    '<button type="button" class="page-web-text-block-menu-sub-trigger" tabindex="-1" aria-haspopup="true" aria-expanded="false">' +
    '<span class="page-web-text-block-menu-sub-label">Элементы карточек</span>' +
    '<span class="page-web-text-block-menu-chevron" aria-hidden="true"></span></button>' +
    '<div role="menu" class="page-web-text-block-menu-sub-panel">' +
    '<div class="page-web-text-block-menu-sub page-web-text-block-menu-sub--feature-grid-card-grid" contenteditable="false">' +
    '<button type="button" class="page-web-text-block-menu-sub-trigger" tabindex="-1" aria-haspopup="true" aria-expanded="false">' +
    '<span class="page-web-text-block-menu-sub-label">Сетка карточек</span>' +
    '<span class="page-web-text-block-menu-chevron" aria-hidden="true"></span></button>' +
    '<div role="menu" class="page-web-text-block-menu-sub-panel">' +
    '<button type="button" role="menuitemradio" class="page-web-text-block-menu-grid-option" contenteditable="false" tabindex="-1" data-feature-grid-set-cols="2" aria-checked="false">' +
    '<span class="page-web-text-block-menu-grid-option-radio" aria-hidden="true"></span><span class="page-web-text-block-menu-grid-option-label">2 в ряд</span></button>' +
    '<button type="button" role="menuitemradio" class="page-web-text-block-menu-grid-option" contenteditable="false" tabindex="-1" data-feature-grid-set-cols="3" aria-checked="false">' +
    '<span class="page-web-text-block-menu-grid-option-radio" aria-hidden="true"></span><span class="page-web-text-block-menu-grid-option-label">3 в ряд</span></button>' +
    '<button type="button" role="menuitemradio" class="page-web-text-block-menu-grid-option" contenteditable="false" tabindex="-1" data-feature-grid-set-cols="4" aria-checked="false">' +
    '<span class="page-web-text-block-menu-grid-option-radio" aria-hidden="true"></span><span class="page-web-text-block-menu-grid-option-label">4 в ряд</span></button>' +
    "</div></div>" +
    '<div class="page-web-text-block-menu-sep" aria-hidden="true"></div>' +
    '<button type="button" role="menuitemcheckbox" class="page-web-text-block-menu-element page-web-text-block-v2-field-toggle !flex w-full flex-row flex-nowrap items-center gap-2.5 rounded-md py-2 pl-2.5 pr-2 text-left text-[13px] font-medium text-slate-800 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40" contenteditable="false" tabindex="-1" data-feature-grid-card-field-toggle="title2" aria-checked="true">' +
    '<span class="page-web-text-block-v2-field-toggle-box inline-flex size-[18px] shrink-0 items-center justify-center rounded border border-slate-300 bg-white shadow-sm transition-colors" aria-hidden="true"></span>' +
    '<span class="min-w-0 flex-1 truncate text-slate-800">Заголовок 2</span></button>' +
    '<button type="button" role="menuitemcheckbox" class="page-web-text-block-menu-element page-web-text-block-v2-field-toggle !flex w-full flex-row flex-nowrap items-center gap-2.5 rounded-md py-2 pl-2.5 pr-2 text-left text-[13px] font-medium text-slate-800 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40" contenteditable="false" tabindex="-1" data-feature-grid-card-field-toggle="description" aria-checked="true">' +
    '<span class="page-web-text-block-v2-field-toggle-box inline-flex size-[18px] shrink-0 items-center justify-center rounded border border-slate-300 bg-white shadow-sm transition-colors" aria-hidden="true"></span>' +
    '<span class="min-w-0 flex-1 truncate text-slate-800">Описание</span></button>' +
    '<button type="button" role="menuitemcheckbox" class="page-web-text-block-menu-element page-web-text-block-v2-field-toggle !flex w-full flex-row flex-nowrap items-center gap-2.5 rounded-md py-2 pl-2.5 pr-2 text-left text-[13px] font-medium text-slate-800 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40" contenteditable="false" tabindex="-1" data-feature-grid-card-field-toggle="learn-more" aria-checked="true">' +
    '<span class="page-web-text-block-v2-field-toggle-box inline-flex size-[18px] shrink-0 items-center justify-center rounded border border-slate-300 bg-white shadow-sm transition-colors" aria-hidden="true"></span>' +
    '<span class="min-w-0 flex-1 truncate text-slate-800">Подробнее</span></button>' +
    '<div class="page-web-text-block-menu-sep" aria-hidden="true"></div>' +
    '<button type="button" role="menuitem" class="page-web-text-block-menu-element" contenteditable="false" tabindex="-1" data-feature-grid-cards-action="add">Добавить карточку</button>' +
    '<button type="button" role="menuitem" class="page-web-text-block-menu-element" contenteditable="false" tabindex="-1" data-feature-grid-cards-action="remove">Удалить карточку</button>' +
    '<div class="page-web-text-block-menu-sep" aria-hidden="true"></div>' +
    '<div class="page-web-text-block-menu-sub page-web-text-block-menu-sub--feature-grid-card-icons" contenteditable="false">' +
    '<button type="button" class="page-web-text-block-menu-sub-trigger" tabindex="-1" aria-haspopup="true" aria-expanded="false">' +
    '<span class="page-web-text-block-menu-sub-label">Иконки</span>' +
    '<span class="page-web-text-block-menu-chevron" aria-hidden="true"></span></button>' +
    '<div role="menu" class="page-web-text-block-menu-sub-panel">' +
    '<button type="button" role="menuitemradio" class="page-web-text-block-menu-grid-option" contenteditable="false" tabindex="-1" data-feature-grid-card-decoration="none" aria-checked="false">' +
    '<span class="page-web-text-block-menu-grid-option-radio" aria-hidden="true"></span><span class="page-web-text-block-menu-grid-option-label">Без иконок</span></button>' +
    '<button type="button" role="menuitemradio" class="page-web-text-block-menu-grid-option" contenteditable="false" tabindex="-1" data-feature-grid-card-decoration="icons" aria-checked="false">' +
    '<span class="page-web-text-block-menu-grid-option-radio" aria-hidden="true"></span><span class="page-web-text-block-menu-grid-option-label">С иконками</span></button>' +
    '<button type="button" role="menuitemradio" class="page-web-text-block-menu-grid-option" contenteditable="false" tabindex="-1" data-feature-grid-card-decoration="numbers" aria-checked="false">' +
    '<span class="page-web-text-block-menu-grid-option-radio" aria-hidden="true"></span><span class="page-web-text-block-menu-grid-option-label">Нумерация</span></button>' +
    "</div></div></div></div>" +
    '<div class="page-web-text-block-menu-sub page-web-text-block-menu-sub--feature-grid-extra" contenteditable="false">' +
    '<button type="button" class="page-web-text-block-menu-sub-trigger" tabindex="-1" aria-haspopup="true" aria-expanded="false">' +
    '<span class="page-web-text-block-menu-sub-label">Дополнительно</span>' +
    '<span class="page-web-text-block-menu-chevron" aria-hidden="true"></span></button>' +
    '<div role="menu" class="page-web-text-block-menu-sub-panel">' +
    '<div class="page-web-text-block-menu-sub page-web-text-block-menu-sub--feature-grid-message" contenteditable="false">' +
    '<button type="button" class="page-web-text-block-menu-sub-trigger" tabindex="-1" aria-haspopup="true" aria-expanded="false">' +
    '<span class="page-web-text-block-menu-sub-label">Сообщение</span>' +
    '<span class="page-web-text-block-menu-chevron" aria-hidden="true"></span></button>' +
    '<div role="menu" class="page-web-text-block-menu-sub-panel">' +
    '<button type="button" role="menuitemradio" class="page-web-text-block-menu-grid-option" contenteditable="false" tabindex="-1" data-feature-grid-message-position="none" aria-checked="false">' +
    '<span class="page-web-text-block-menu-grid-option-radio" aria-hidden="true"></span><span class="page-web-text-block-menu-grid-option-label">Без сообщения</span></button>' +
    '<button type="button" role="menuitemradio" class="page-web-text-block-menu-grid-option" contenteditable="false" tabindex="-1" data-feature-grid-message-position="right" aria-checked="false">' +
    '<span class="page-web-text-block-menu-grid-option-radio" aria-hidden="true"></span><span class="page-web-text-block-menu-grid-option-label">Справа</span></button>' +
    '<button type="button" role="menuitemradio" class="page-web-text-block-menu-grid-option" contenteditable="false" tabindex="-1" data-feature-grid-message-position="left" aria-checked="false">' +
    '<span class="page-web-text-block-menu-grid-option-radio" aria-hidden="true"></span><span class="page-web-text-block-menu-grid-option-label">Слева</span></button>' +
    '<button type="button" role="menuitemradio" class="page-web-text-block-menu-grid-option" contenteditable="false" tabindex="-1" data-feature-grid-message-position="top" aria-checked="false">' +
    '<span class="page-web-text-block-menu-grid-option-radio" aria-hidden="true"></span><span class="page-web-text-block-menu-grid-option-label">Сверху</span></button>' +
    '<button type="button" role="menuitemradio" class="page-web-text-block-menu-grid-option" contenteditable="false" tabindex="-1" data-feature-grid-message-position="bottom" aria-checked="false">' +
    '<span class="page-web-text-block-menu-grid-option-radio" aria-hidden="true"></span><span class="page-web-text-block-menu-grid-option-label">Снизу</span></button>' +
    '<div class="page-web-text-block-menu-sep" aria-hidden="true"></div>' +
    '<button type="button" role="menuitemradio" class="page-web-text-block-menu-grid-option" contenteditable="false" tabindex="-1" data-feature-grid-message-color="green" aria-checked="false">' +
    '<span class="page-web-text-block-menu-grid-option-radio" aria-hidden="true"></span><span class="page-web-text-block-menu-grid-option-label">Зеленое</span></button>' +
    '<button type="button" role="menuitemradio" class="page-web-text-block-menu-grid-option" contenteditable="false" tabindex="-1" data-feature-grid-message-color="yellow" aria-checked="false">' +
    '<span class="page-web-text-block-menu-grid-option-radio" aria-hidden="true"></span><span class="page-web-text-block-menu-grid-option-label">Желтое</span></button>' +
    '<button type="button" role="menuitemradio" class="page-web-text-block-menu-grid-option" contenteditable="false" tabindex="-1" data-feature-grid-message-color="red" aria-checked="false">' +
    '<span class="page-web-text-block-menu-grid-option-radio" aria-hidden="true"></span><span class="page-web-text-block-menu-grid-option-label">Красное</span></button>' +
    "</div></div>" +
    '<div class="page-web-text-block-menu-sub page-web-text-block-menu-sub--feature-grid-image" contenteditable="false">' +
    '<button type="button" class="page-web-text-block-menu-sub-trigger" tabindex="-1" aria-haspopup="true" aria-expanded="false">' +
    '<span class="page-web-text-block-menu-sub-label">Изображение</span>' +
    '<span class="page-web-text-block-menu-chevron" aria-hidden="true"></span></button>' +
    '<div role="menu" class="page-web-text-block-menu-sub-panel">' +
    '<button type="button" role="menuitemradio" class="page-web-text-block-menu-grid-option" contenteditable="false" tabindex="-1" data-feature-grid-image-position="none" aria-checked="false">' +
    '<span class="page-web-text-block-menu-grid-option-radio" aria-hidden="true"></span><span class="page-web-text-block-menu-grid-option-label">Без изображения</span></button>' +
    '<button type="button" role="menuitemradio" class="page-web-text-block-menu-grid-option" contenteditable="false" tabindex="-1" data-feature-grid-image-position="right" aria-checked="false">' +
    '<span class="page-web-text-block-menu-grid-option-radio" aria-hidden="true"></span><span class="page-web-text-block-menu-grid-option-label">Справа</span></button>' +
    '<button type="button" role="menuitemradio" class="page-web-text-block-menu-grid-option" contenteditable="false" tabindex="-1" data-feature-grid-image-position="left" aria-checked="false">' +
    '<span class="page-web-text-block-menu-grid-option-radio" aria-hidden="true"></span><span class="page-web-text-block-menu-grid-option-label">Слева</span></button>' +
    '<button type="button" role="menuitemradio" class="page-web-text-block-menu-grid-option" contenteditable="false" tabindex="-1" data-feature-grid-image-position="bottom" aria-checked="false">' +
    '<span class="page-web-text-block-menu-grid-option-radio" aria-hidden="true"></span><span class="page-web-text-block-menu-grid-option-label">Снизу</span></button>' +
    '<div class="page-web-text-block-menu-sep page-web-text-block-menu-sep--feature-grid-image-display" aria-hidden="true"></div>' +
    '<button type="button" role="menuitemradio" class="page-web-text-block-menu-grid-option page-web-text-block-menu-grid-option--feature-grid-image-display" contenteditable="false" tabindex="-1" data-feature-grid-image-display="background" aria-checked="false">' +
    '<span class="page-web-text-block-menu-grid-option-radio" aria-hidden="true"></span><span class="page-web-text-block-menu-grid-option-label">Как часть фона</span></button>' +
    '<button type="button" role="menuitemradio" class="page-web-text-block-menu-grid-option page-web-text-block-menu-grid-option--feature-grid-image-display" contenteditable="false" tabindex="-1" data-feature-grid-image-display="separate" aria-checked="false">' +
    '<span class="page-web-text-block-menu-grid-option-radio" aria-hidden="true"></span><span class="page-web-text-block-menu-grid-option-label">Отдельно</span></button>' +
    '<div class="page-web-text-block-menu-sep" aria-hidden="true"></div>' +
    '<button type="button" role="menuitem" class="page-web-text-block-menu-element page-web-text-block-menu-element--feature-grid-image-upload" contenteditable="false" tabindex="-1" data-feature-grid-upload-image>Загрузить изображение</button>' +
    "</div></div>" +
    "</div></div>" +
    '<div class="page-web-text-block-menu-sep page-web-text-block-menu-sep--feature-grid" aria-hidden="true"></div>' +
    '<div class="page-web-text-block-menu-sep page-web-text-block-menu-sep--work-pricing" aria-hidden="true"></div>' +
    '<button type="button" role="menuitem" class="page-web-text-block-menu-element page-web-text-block-menu-element--work-pricing" contenteditable="false" tabindex="-1" data-work-pricing-items-action="add">Добавить пункт</button>' +
    '<button type="button" role="menuitem" class="page-web-text-block-menu-element page-web-text-block-menu-element--work-pricing" contenteditable="false" tabindex="-1" data-work-pricing-items-action="remove">Убрать пункт</button>' +
    '<button type="button" role="menuitem" class="page-web-text-block-menu-delete" contenteditable="false" tabindex="-1">Удалить блок</button>' +
    "</div></div>"
  );
}

type FeatureGridElementKind = "subtitle" | "title" | "lead";
type FeatureGridMessagePosition = "none" | "left" | "right" | "top" | "bottom";
type FeatureGridMessageColor = "red" | "yellow" | "green";
type FeatureGridImagePosition = "none" | "left" | "right" | "bottom";
type FeatureGridImageDisplay = "background" | "separate";

function isFeatureGridElementKind(value: string | null): value is FeatureGridElementKind {
  return value === "subtitle" || value === "title" || value === "lead";
}

function isFeatureGridMessagePosition(value: string | null): value is FeatureGridMessagePosition {
  return value === "none" || value === "left" || value === "right" || value === "top" || value === "bottom";
}

function isFeatureGridMessageColor(value: string | null): value is FeatureGridMessageColor {
  return value === "red" || value === "yellow" || value === "green";
}

function isFeatureGridImagePosition(value: string | null): value is FeatureGridImagePosition {
  return value === "none" || value === "left" || value === "right" || value === "bottom";
}

function isFeatureGridImageDisplay(value: string | null): value is FeatureGridImageDisplay {
  return value === "background" || value === "separate";
}

function getFeatureGridImageDisplay(root: HTMLElement): FeatureGridImageDisplay {
  const raw = root.getAttribute("data-feature-grid-image-display");
  return isFeatureGridImageDisplay(raw) ? raw : "separate";
}

function setFeatureGridImageDisplay(root: HTMLElement, display: FeatureGridImageDisplay): boolean {
  const pos = getFeatureGridImagePosition(root);
  if (!featureGridImagePositionSupportsDisplay(pos)) return false;
  if (getFeatureGridImageDisplay(root) === display) return false;
  root.setAttribute("data-feature-grid-image-display", display);
  return true;
}

function isFeatureGridCardFieldToggleKey(value: string | null): value is "title2" | "description" | "learn-more" | "cta" {
  return value === "title2" || value === "description" || value === "learn-more" || value === "cta";
}

function isFeatureGridCardDecorationKey(value: string | null): value is "none" | "icons" | "numbers" {
  return value === "none" || value === "icons" || value === "numbers";
}

function applyFeatureGridCardFieldToggle(root: HTMLElement, key: "title2" | "description" | "learn-more" | "cta"): boolean {
  if (key === "title2") return toggleFeatureGridCardTitle2(root);
  if (key === "description") return toggleFeatureGridCardDescriptions(root);
  if (key === "cta") return toggleFeatureGridCardCta(root);
  return toggleFeatureGridCardLearnMore(root);
}

type WebTextBlockV2FieldKey =
  | "announcement"
  | "subtitle"
  | "title"
  | "title2"
  | "description"
  | "button"
  | "button2";

const WEB_TEXT_BLOCK_V2_FIELD_KEYS: WebTextBlockV2FieldKey[] = [
  "announcement",
  "subtitle",
  "title",
  "title2",
  "description",
  "button",
  "button2",
];

const WEB_TEXT_BLOCK_V2_FIELD_ATTR: Record<WebTextBlockV2FieldKey, string> = {
  announcement: "data-v2-show-announcement",
  subtitle: "data-v2-show-subtitle",
  title: "data-v2-show-title",
  title2: "data-v2-show-title2",
  description: "data-v2-show-description",
  button: "data-v2-show-button",
  button2: "data-v2-show-button2",
};

function isWebTextBlockV2FieldKey(value: string | null | undefined): value is WebTextBlockV2FieldKey {
  return (
    value === "announcement" ||
    value === "subtitle" ||
    value === "title" ||
    value === "title2" ||
    value === "description" ||
    value === "button" ||
    value === "button2"
  );
}

function normalizeWebTextBlockV2VisibilityAttrs(block: HTMLElement): boolean {
  let changed = false;
  for (const k of WEB_TEXT_BLOCK_V2_FIELD_KEYS) {
    const attr = WEB_TEXT_BLOCK_V2_FIELD_ATTR[k];
    const raw = block.getAttribute(attr);
    const defaultVal = k === "button" || k === "button2" ? "0" : "1";
    if (raw !== "0" && raw !== "1") {
      block.setAttribute(attr, defaultVal);
      changed = true;
    }
  }
  return changed;
}

function isWebTextBlockV2FieldVisible(block: HTMLElement, kind: WebTextBlockV2FieldKey): boolean {
  return block.getAttribute(WEB_TEXT_BLOCK_V2_FIELD_ATTR[kind]) !== "0";
}

function countVisibleWebTextBlockV2Fields(block: HTMLElement): number {
  let n = 0;
  for (const k of WEB_TEXT_BLOCK_V2_FIELD_KEYS) {
    if (isWebTextBlockV2FieldVisible(block, k)) n += 1;
  }
  return n;
}

function toggleWebTextBlockV2Field(block: HTMLElement, kind: WebTextBlockV2FieldKey): boolean {
  const attr = WEB_TEXT_BLOCK_V2_FIELD_ATTR[kind];
  if (isWebTextBlockV2FieldVisible(block, kind)) {
    if (countVisibleWebTextBlockV2Fields(block) <= 1) return false;
    block.setAttribute(attr, "0");
    return true;
  }
  block.setAttribute(attr, "1");
  return true;
}

type WebArticleTextFieldKey = "title" | "body";

const WEB_ARTICLE_TEXT_FIELD_ATTR: Record<WebArticleTextFieldKey, string> = {
  title: "data-article-show-title",
  body: "data-article-show-body",
};

function isWebArticleTextFieldKey(value: string | null | undefined): value is WebArticleTextFieldKey {
  return value === "title" || value === "body";
}

function normalizeWebArticleTextVisibilityAttrs(block: HTMLElement): boolean {
  let changed = false;
  (["title", "body"] as const).forEach((k) => {
    const attr = WEB_ARTICLE_TEXT_FIELD_ATTR[k];
    const raw = block.getAttribute(attr);
    if (raw !== "0" && raw !== "1") {
      block.setAttribute(attr, "1");
      changed = true;
    }
  });
  return changed;
}

function isWebArticleTextFieldVisible(block: HTMLElement, kind: WebArticleTextFieldKey): boolean {
  return block.getAttribute(WEB_ARTICLE_TEXT_FIELD_ATTR[kind]) !== "0";
}

function countVisibleWebArticleTextFields(block: HTMLElement): number {
  let n = 0;
  if (isWebArticleTextFieldVisible(block, "title")) n += 1;
  if (isWebArticleTextFieldVisible(block, "body")) n += 1;
  return n;
}

function toggleWebArticleTextField(block: HTMLElement, kind: WebArticleTextFieldKey): boolean {
  const attr = WEB_ARTICLE_TEXT_FIELD_ATTR[kind];
  if (isWebArticleTextFieldVisible(block, kind)) {
    if (countVisibleWebArticleTextFields(block) <= 1) return false;
    block.setAttribute(attr, "0");
    return true;
  }
  block.setAttribute(attr, "1");
  return true;
}

function syncWebArticleTextElementsMenuState(toolbar: HTMLElement) {
  const block = toolbar.closest(".page-web-article-text") as HTMLElement | null;
  if (!block) return;
  const count = countVisibleWebArticleTextFields(block);
  toolbar.querySelectorAll("[data-toggle-article-field]").forEach((node) => {
    const btn = node as HTMLButtonElement;
    const raw = btn.getAttribute("data-toggle-article-field");
    if (!isWebArticleTextFieldKey(raw)) return;
    const on = isWebArticleTextFieldVisible(block, raw);
    btn.setAttribute("aria-checked", on ? "true" : "false");
    const disableUncheck = on && count <= 1;
    btn.disabled = disableUncheck;
    btn.setAttribute("aria-disabled", disableUncheck ? "true" : "false");
  });
}

function reorderWebArticleTextShellChildren(block: HTMLElement): boolean {
  const toolbar = block.querySelector(":scope > .page-web-article-text-toolbar") as HTMLElement | null;
  const fields = block.querySelector(":scope > .page-web-article-text-fields") as HTMLElement | null;
  const body = block.querySelector(":scope > .page-web-article-text-body") as HTMLElement | null;
  if (!toolbar || !fields || !body) return false;
  let changed = false;
  if (block.firstElementChild !== toolbar) {
    block.insertBefore(toolbar, block.firstChild);
    changed = true;
  }
  if (fields.previousElementSibling !== toolbar) {
    block.insertBefore(fields, body);
    changed = true;
  }
  return changed;
}

/** Сохранённый HTML со старыми классами v2-field / announcement-* / cta-* → общие `page-web-elements-*`. */
function migrateLegacyWebTextBlockV2FieldsToWebElements(fields: HTMLElement): boolean {
  let changed = false;
  fields.querySelectorAll(".page-web-text-block-v2-field-wrap").forEach((node) => {
    const el = node as HTMLElement;
    for (const key of WEB_TEXT_BLOCK_V2_FIELD_KEYS) {
      const legacy = `page-web-text-block-v2-field-wrap--${key}`;
      if (el.classList.contains(legacy)) {
        el.classList.remove("page-web-text-block-v2-field-wrap", legacy);
        el.classList.add("page-web-elements", `page-web-elements-${key}`);
        changed = true;
        break;
      }
    }
  });
  const classPairs: Array<[string, string]> = [
    ["page-web-text-block-v2-announcement-input-shell", "page-web-elements-announcement-input-shell"],
    ["page-web-text-block-v2-announcement-strip", "page-web-elements-announcement-strip"],
    ["page-web-text-block-v2-announcement-row", "page-web-elements-announcement-row"],
    ["page-web-text-block-v2-announcement-learn-more", "page-web-elements-announcement-learn-more"],
    ["page-web-text-block-v2-announcement-input", "page-web-elements-announcement-input"],
    ["page-web-text-block-v2-title2-input", "page-web-elements-title2-input"],
    ["page-web-text-block-v2-title-input", "page-web-elements-title-input"],
    ["page-web-text-block-v2-subtitle-input", "page-web-elements-subtitle-input"],
    ["page-web-text-block-v2-description-input", "page-web-elements-description-input"],
    ["page-web-text-block-v2-cta-button-secondary", "page-web-elements-cta-button-secondary"],
    ["page-web-text-block-v2-cta-button", "page-web-elements-cta-button"],
    ["page-web-text-block-v2-cta-wrap", "page-web-elements-cta-wrap"],
    ["page-web-text-block-v2-cta-row", "page-web-elements-actions"],
    ["page-web-text-block-v2-announcement-toolbar", "page-web-elements-announcement-toolbar"],
  ];
  for (const [fromClass, toClass] of classPairs) {
    fields.querySelectorAll("." + fromClass).forEach((node) => {
      const el = node as HTMLElement;
      if (el.classList.contains(fromClass)) {
        el.classList.remove(fromClass);
        el.classList.add(toClass);
        changed = true;
      }
    });
  }
  return changed;
}

function syncWebTextBlockV2ElementsMenuState(toolbar: HTMLElement) {
  const block = toolbar.closest(".page-web-text-block-v2") as HTMLElement | null;
  if (!block) return;
  const count = countVisibleWebTextBlockV2Fields(block);
  toolbar.querySelectorAll("[data-toggle-v2-field]").forEach((node) => {
    const btn = node as HTMLButtonElement;
    const raw = btn.getAttribute("data-toggle-v2-field");
    if (!isWebTextBlockV2FieldKey(raw)) return;
    const on = isWebTextBlockV2FieldVisible(block, raw);
    btn.setAttribute("aria-checked", on ? "true" : "false");
    const disableUncheck = on && count <= 1;
    btn.disabled = disableUncheck;
    btn.setAttribute("aria-disabled", disableUncheck ? "true" : "false");
  });
  const learnToggle = toolbar.querySelector(
    "[data-toggle-v2-announcement-learn-more]",
  ) as HTMLButtonElement | null;
  if (learnToggle) {
    const annOn = isWebTextBlockV2FieldVisible(block, "announcement");
    const hasLm =
      block.getAttribute("data-v2-announcement-learn-more") === "1" ||
      !!block.querySelector(".page-web-elements-announcement-learn-more");
    learnToggle.setAttribute("aria-checked", hasLm ? "true" : "false");
    learnToggle.disabled = !annOn;
    learnToggle.setAttribute("aria-disabled", !annOn ? "true" : "false");
  }
}

function addWebTextBlockV2AnnouncementLearnMore(block: HTMLElement): boolean {
  const strip = block.querySelector(
    ".page-web-elements-announcement-strip",
  ) as HTMLElement | null;
  if (!strip || strip.querySelector(".page-web-elements-announcement-learn-more")) return false;
  const span = document.createElement("span");
  span.className = "page-web-elements-announcement-learn-more";
  span.setAttribute("role", "button");
  span.setAttribute("contenteditable", "false");
  span.setAttribute("tabindex", "-1");
  span.textContent = "Подробнее";
  strip.appendChild(span);
  block.setAttribute("data-v2-announcement-learn-more", "1");
  return true;
}

function removeWebTextBlockV2AnnouncementLearnMore(block: HTMLElement): boolean {
  const strip = block.querySelector(
    ".page-web-elements-announcement-strip",
  ) as HTMLElement | null;
  const lm = strip?.querySelector(".page-web-elements-announcement-learn-more");
  if (!lm) return false;
  lm.remove();
  block.setAttribute("data-v2-announcement-learn-more", "0");
  return true;
}

function toggleWebTextBlockV2AnnouncementLearnMore(block: HTMLElement): boolean {
  if (block.querySelector(".page-web-elements-announcement-learn-more")) {
    return removeWebTextBlockV2AnnouncementLearnMore(block);
  }
  return addWebTextBlockV2AnnouncementLearnMore(block);
}

function queryFeatureGridHeadLeadLikeWrap(head: HTMLElement): HTMLElement | null {
  const desc = head.querySelector(":scope > .page-web-elements-description") as HTMLElement | null;
  if (desc) return desc;
  return head.querySelector(":scope > .page-web-feature-grid-lead") as HTMLElement | null;
}

function queryFeatureGridRowLeadLikeWrap(row: HTMLElement): HTMLElement | null {
  const desc = row.querySelector(":scope > .page-web-elements-description") as HTMLElement | null;
  if (desc) return desc;
  return row.querySelector(":scope > .page-web-feature-grid-lead") as HTMLElement | null;
}

function listFeatureGridHeadDirectLeadLikeWraps(head: HTMLElement): HTMLElement[] {
  return Array.from(head.children).filter(
    (n): n is HTMLElement =>
      n instanceof HTMLElement &&
      (n.classList.contains("page-web-elements-description") || n.classList.contains("page-web-feature-grid-lead")),
  );
}

function listFeatureGridRowLeadLikeWraps(row: HTMLElement): HTMLElement[] {
  return Array.from(row.children).filter(
    (n): n is HTMLElement =>
      n instanceof HTMLElement &&
      !n.classList.contains("page-web-feature-grid-message") &&
      (n.classList.contains("page-web-elements-description") || n.classList.contains("page-web-feature-grid-lead")),
  );
}

function queryFeatureGridHeadOrderAnchor(head: HTMLElement, kind: FeatureGridElementKind): HTMLElement | null {
  if (kind === "subtitle") {
    return head.querySelector(":scope > .page-web-elements-subtitle") as HTMLElement | null;
  }
  if (kind === "title") {
    return head.querySelector(":scope > .page-web-elements-title") as HTMLElement | null;
  }
  return queryFeatureGridHeadLeadLikeWrap(head);
}

function getFeatureGridElementNode(root: HTMLElement, kind: FeatureGridElementKind): HTMLElement | null {
  const head = root.querySelector(".page-web-feature-grid-head") as HTMLElement | null;
  if (!head) return null;
  if (kind === "subtitle") {
    const wrap = head.querySelector(":scope > .page-web-elements-subtitle") as HTMLElement | null;
    if (wrap) return wrap;
    return head.querySelector(".page-web-feature-grid-subtitle") as HTMLElement | null;
  }
  if (kind === "title") {
    const wrap = head.querySelector(":scope > .page-web-elements-title") as HTMLElement | null;
    if (wrap) return wrap;
    return head.querySelector(".page-web-feature-grid-title") as HTMLElement | null;
  }
  const direct = queryFeatureGridHeadLeadLikeWrap(head);
  if (direct) return direct;
  const row = head.querySelector(":scope > .page-web-feature-grid-lead-row") as HTMLElement | null;
  if (row) {
    const inRow = queryFeatureGridRowLeadLikeWrap(row);
    if (inRow) return inRow;
  }
  return head.querySelector(".page-web-elements-description, .page-web-feature-grid-lead") as HTMLElement | null;
}

function createFeatureGridHeadNode(kind: FeatureGridElementKind): HTMLElement {
  if (kind === "subtitle") {
    const wrap = document.createElement("div");
    wrap.className = "page-web-elements page-web-elements-subtitle";
    const ta = document.createElement("textarea");
    ta.className = "page-web-elements-subtitle-input";
    ta.setAttribute("spellcheck", "true");
    ta.setAttribute("placeholder", "Подзаголовок");
    ta.setAttribute("rows", "1");
    ta.value = "Подзаголовок";
    const row = document.createElement("div");
    row.className = "page-web-elements-field-row";
    row.appendChild(ta);
    wrap.appendChild(row);
    return wrap;
  }
  if (kind === "title") {
    const wrap = document.createElement("div");
    wrap.className = "page-web-elements page-web-elements-title";
    const ta = document.createElement("textarea");
    ta.className = "page-web-elements-title-input";
    ta.setAttribute("spellcheck", "true");
    ta.setAttribute("placeholder", "Заголовок 1");
    ta.setAttribute("rows", "1");
    ta.value = "Заголовок 1";
    const row = document.createElement("div");
    row.className = "page-web-elements-field-row";
    row.appendChild(ta);
    wrap.appendChild(row);
    return wrap;
  }
  const wrap = document.createElement("div");
  wrap.className = "page-web-elements page-web-elements-description";
  const ta = document.createElement("textarea");
  ta.className = "page-web-elements-description-input";
  ta.setAttribute("spellcheck", "true");
  ta.setAttribute("placeholder", "Короткое описание");
  ta.setAttribute("rows", "1");
  ta.value = FEATURE_GRID_LEAD_DEFAULT;
  const row = document.createElement("div");
  row.className = "page-web-elements-field-row";
  row.appendChild(ta);
  wrap.appendChild(row);
  return wrap;
}

function getFeatureGridMessagePosition(root: HTMLElement): FeatureGridMessagePosition | null {
  const raw = root.getAttribute("data-feature-grid-message-position");
  return isFeatureGridMessagePosition(raw) ? raw : null;
}

function getFeatureGridMessageColor(root: HTMLElement): FeatureGridMessageColor {
  const raw = root.getAttribute("data-feature-grid-message-color");
  return isFeatureGridMessageColor(raw) ? raw : "red";
}

function getFeatureGridImagePosition(root: HTMLElement): FeatureGridImagePosition {
  const raw = root.getAttribute("data-feature-grid-image-position");
  return isFeatureGridImagePosition(raw) ? raw : "none";
}

function ensureFeatureGridLeadRow(head: HTMLElement): HTMLElement {
  let row = head.querySelector(":scope > .page-web-feature-grid-lead-row") as HTMLElement | null;
  if (!row) {
    row = document.createElement("div");
    row.className = "page-web-feature-grid-lead-row";
    const lead = queryFeatureGridHeadLeadLikeWrap(head);
    if (lead) row.appendChild(lead);
    head.appendChild(row);
  }
  return row;
}

function createFeatureGridMessageNode(): HTMLElement {
  const node = document.createElement("div");
  node.className = "page-web-feature-grid-message";
  node.setAttribute("contenteditable", "false");
  node.innerHTML =
    getFeatureGridMessageTitleFieldHtml("Важное сообщение") +
    getFeatureGridMessageBodyFieldHtml(FEATURE_GRID_MESSAGE_BODY_DEFAULT);
  return node;
}

function createFeatureGridImageNode(): HTMLElement {
  const node = document.createElement("div");
  node.className = "page-web-feature-grid-image";
  node.setAttribute("data-feature-grid-image-has-src", "0");
  node.innerHTML = '<p class="page-web-feature-grid-image-placeholder">Добавьте изображение</p>';
  return node;
}

function ensureFeatureGridImageNode(root: HTMLElement): HTMLElement {
  let image = root.querySelector(":scope > .page-web-feature-grid-image") as HTMLElement | null;
  if (image) return image;
  image = createFeatureGridImageNode();
  root.appendChild(image);
  return image;
}

function clearFeatureGridImage(root: HTMLElement): boolean {
  let changed = false;
  root.querySelectorAll(":scope > .page-web-feature-grid-image").forEach((n) => {
    n.remove();
    changed = true;
  });
  if (root.hasAttribute("data-feature-grid-image-position")) {
    root.removeAttribute("data-feature-grid-image-position");
    changed = true;
  }
  if (root.hasAttribute("data-feature-grid-image-display")) {
    root.removeAttribute("data-feature-grid-image-display");
    changed = true;
  }
  return changed;
}

function clearFeatureGridMessage(root: HTMLElement): boolean {
  const head = root.querySelector(".page-web-feature-grid-head") as HTMLElement | null;
  let changed = false;
  if (head) {
    const row = head.querySelector(":scope > .page-web-feature-grid-lead-row") as HTMLElement | null;
    if (row) {
      const lead = queryFeatureGridRowLeadLikeWrap(row);
      const message = row.querySelector(":scope > .page-web-feature-grid-message") as HTMLElement | null;
      if (message) {
        message.remove();
        changed = true;
      }
      row.removeAttribute("data-feature-grid-message-position");
      if (lead) {
        head.appendChild(lead);
        changed = true;
      }
      row.remove();
      changed = true;
    }
  }
  if (root.hasAttribute("data-feature-grid-message-position")) {
    root.removeAttribute("data-feature-grid-message-position");
    changed = true;
  }
  return changed;
}

function ensureFeatureGridMessage(root: HTMLElement, position: FeatureGridMessagePosition): boolean {
  if (position === "none") return clearFeatureGridMessage(root);
  const head = ensureFeatureGridHead(root);
  const row = ensureFeatureGridLeadRow(head);
  let changed = false;
  const rowLead = queryFeatureGridRowLeadLikeWrap(row);
  const headDirectLeads = listFeatureGridHeadDirectLeadLikeWraps(head);
  let lead = rowLead;
  if (!lead && headDirectLeads.length > 0) {
    lead = headDirectLeads[0];
    row.insertBefore(lead, row.firstChild);
    changed = true;
  }
  if (lead) {
    const extras = [
      ...headDirectLeads.filter((n) => n !== lead),
      ...listFeatureGridRowLeadLikeWraps(row).filter((n) => n !== lead),
    ] as HTMLElement[];
    extras.forEach((n) => {
      n.remove();
      changed = true;
    });
  } else {
    lead = createFeatureGridHeadNode("lead");
    row.insertBefore(lead, row.firstChild);
    changed = true;
  }
  let message = row.querySelector(":scope > .page-web-feature-grid-message") as HTMLElement | null;
  if (!message) {
    message = createFeatureGridMessageNode();
    row.appendChild(message);
    changed = true;
  }
  if (row.getAttribute("data-feature-grid-message-position") !== position) {
    row.setAttribute("data-feature-grid-message-position", position);
    changed = true;
  }
  if (root.getAttribute("data-feature-grid-message-position") !== position) {
    root.setAttribute("data-feature-grid-message-position", position);
    changed = true;
  }
  if (!isFeatureGridMessageColor(root.getAttribute("data-feature-grid-message-color"))) {
    root.setAttribute("data-feature-grid-message-color", "red");
    changed = true;
  }
  return changed;
}

function setFeatureGridMessageColor(root: HTMLElement, color: FeatureGridMessageColor): boolean {
  if (root.getAttribute("data-feature-grid-message-color") === color) return false;
  root.setAttribute("data-feature-grid-message-color", color);
  return true;
}

/** `<h2 class="page-web-feature-grid-title">` → `page-web-elements-title` + `textarea.page-web-elements-title-input`. */
function migrateLegacyFeatureGridTitleToWebElements(root: HTMLElement): boolean {
  let changed = false;
  root.querySelectorAll(".page-web-feature-grid-head .page-web-feature-grid-title").forEach((n) => {
    const legacy = n as HTMLElement;
    const text = (legacy.textContent ?? "").replace(/\u200b/g, "").trim();
    const wrap = document.createElement("div");
    wrap.className = "page-web-elements page-web-elements-title";
    const ta = document.createElement("textarea");
    ta.className = "page-web-elements-title-input";
    ta.setAttribute("spellcheck", "true");
    ta.setAttribute("placeholder", "Заголовок 1");
    ta.setAttribute("rows", "1");
    ta.value = text;
    const row = document.createElement("div");
    row.className = "page-web-elements-field-row";
    row.appendChild(ta);
    wrap.appendChild(row);
    legacy.replaceWith(wrap);
    changed = true;
  });
  return changed;
}

/** `<p class="page-web-feature-grid-subtitle">` → `page-web-elements-subtitle` + `textarea.page-web-elements-subtitle-input`. */
function migrateLegacyFeatureGridSubtitleToWebElements(root: HTMLElement): boolean {
  let changed = false;
  root.querySelectorAll(".page-web-feature-grid-head .page-web-feature-grid-subtitle").forEach((n) => {
    const legacy = n as HTMLElement;
    const text = (legacy.textContent ?? "").replace(/\u200b/g, "").trim();
    const wrap = document.createElement("div");
    wrap.className = "page-web-elements page-web-elements-subtitle";
    const ta = document.createElement("textarea");
    ta.className = "page-web-elements-subtitle-input";
    ta.setAttribute("spellcheck", "true");
    ta.setAttribute("placeholder", "Подзаголовок");
    ta.setAttribute("rows", "1");
    ta.value = text;
    const row = document.createElement("div");
    row.className = "page-web-elements-field-row";
    row.appendChild(ta);
    wrap.appendChild(row);
    legacy.replaceWith(wrap);
    changed = true;
  });
  return changed;
}

/** `<p class="page-web-feature-grid-lead">` → `page-web-elements-description` + `textarea.page-web-elements-description-input`. */
function migrateLegacyFeatureGridLeadToWebElements(root: HTMLElement): boolean {
  let changed = false;
  root.querySelectorAll(".page-web-feature-grid-head .page-web-feature-grid-lead").forEach((n) => {
    const legacy = n as HTMLElement;
    const text = (legacy.textContent ?? "").replace(/\u200b/g, "").trim();
    const wrap = document.createElement("div");
    wrap.className = "page-web-elements page-web-elements-description";
    const ta = document.createElement("textarea");
    ta.className = "page-web-elements-description-input";
    ta.setAttribute("spellcheck", "true");
    ta.setAttribute("placeholder", "Короткое описание");
    ta.setAttribute("rows", "1");
    ta.value = text;
    const row = document.createElement("div");
    row.className = "page-web-elements-field-row";
    row.appendChild(ta);
    wrap.appendChild(row);
    legacy.replaceWith(wrap);
    changed = true;
  });
  return changed;
}

/** `<p class="page-web-feature-grid-message-title">` или заголовок в `description` + `description-input.message-title` → `page-web-elements-title2` + `textarea.page-web-elements-title2-input.page-web-feature-grid-message-title`. */
function migrateLegacyFeatureGridMessageTitleToWebElements(root: HTMLElement): boolean {
  let changed = false;
  root.querySelectorAll(".page-web-feature-grid-message").forEach((n) => {
    const message = n as HTMLElement;
    if (
      message.querySelector(
        ":scope .page-web-elements.page-web-elements-title2 textarea.page-web-feature-grid-message-title",
      )
    ) {
      return;
    }
    const legacyDescTitle = message.querySelector(
      ":scope .page-web-elements.page-web-elements-description:has(textarea.page-web-elements-description-input.page-web-feature-grid-message-title)",
    ) as HTMLElement | null;
    if (legacyDescTitle) {
      const ta = legacyDescTitle.querySelector("textarea") as HTMLTextAreaElement | null;
      const text =
        (ta?.value ?? ta?.textContent ?? "").replace(/\u200b/g, "").trim() || "Важное сообщение";
      const tmp = document.createElement("div");
      tmp.innerHTML = getFeatureGridMessageTitleFieldHtml(text);
      const block = tmp.firstElementChild as HTMLElement | null;
      if (!block) return;
      legacyDescTitle.replaceWith(block);
      changed = true;
      return;
    }
    const oldTitle = message.querySelector(":scope > p.page-web-feature-grid-message-title") as HTMLElement | null;
    if (oldTitle) {
      const text = (oldTitle.textContent || "").replace(/\u200b/g, "").trim() || "Важное сообщение";
      const tmp = document.createElement("div");
      tmp.innerHTML = getFeatureGridMessageTitleFieldHtml(text);
      const block = tmp.firstElementChild as HTMLElement | null;
      if (!block) return;
      oldTitle.replaceWith(block);
      changed = true;
      return;
    }
    const title2NoFlag = message.querySelector(
      ":scope .page-web-elements.page-web-elements-title2:has(textarea.page-web-elements-title2-input)",
    ) as HTMLElement | null;
    if (title2NoFlag) {
      const ta = title2NoFlag.querySelector("textarea.page-web-elements-title2-input") as HTMLTextAreaElement | null;
      if (ta && !ta.classList.contains("page-web-feature-grid-message-title")) {
        ta.classList.add("page-web-feature-grid-message-title");
        changed = true;
      }
      return;
    }
  });
  return changed;
}

/** Текст тела alert-сообщения: `<p>` или старое поле без класса → `textarea` с `page-web-feature-grid-message-body`. */
function migrateLegacyFeatureGridMessageBodyToWebElements(root: HTMLElement): boolean {
  let changed = false;
  root.querySelectorAll(".page-web-feature-grid-message").forEach((n) => {
    const message = n as HTMLElement;
    if (message.querySelector(":scope textarea.page-web-feature-grid-message-body")) {
      return;
    }
    const directBodyTa = message.querySelector(
      ":scope > .page-web-elements.page-web-elements-description textarea.page-web-elements-description-input:not(.page-web-feature-grid-message-title)",
    ) as HTMLTextAreaElement | null;
    if (directBodyTa) {
      if (!directBodyTa.classList.contains("page-web-feature-grid-message-body")) {
        directBodyTa.classList.add("page-web-feature-grid-message-body");
        changed = true;
      }
      return;
    }
    const nestedBodyTa = message.querySelector(
      ":scope textarea.page-web-elements-description-input:not(.page-web-feature-grid-message-title)",
    ) as HTMLTextAreaElement | null;
    if (nestedBodyTa) {
      if (!nestedBodyTa.classList.contains("page-web-feature-grid-message-body")) {
        nestedBodyTa.classList.add("page-web-feature-grid-message-body");
        changed = true;
      }
      return;
    }
    const bodyParas = Array.from(message.querySelectorAll(":scope > p")).filter(
      (p) => !p.classList.contains("page-web-feature-grid-message-title"),
    ) as HTMLElement[];
    const combined = bodyParas
      .map((p) => (p.textContent ?? "").replace(/\u200b/g, "").trim())
      .filter(Boolean)
      .join("\n\n")
      .trim();
    const text = combined || FEATURE_GRID_MESSAGE_BODY_DEFAULT;
    const tmp = document.createElement("div");
    tmp.innerHTML = getFeatureGridMessageBodyFieldHtml(text);
    const block = tmp.firstElementChild as HTMLElement | null;
    if (!block) return;
    const titleBlock =
      (message.querySelector(":scope > .page-web-elements.page-web-elements-title2") as HTMLElement | null) ??
      (message.querySelector(":scope .page-web-elements.page-web-elements-title2") as HTMLElement | null);
    if (titleBlock?.nextSibling) message.insertBefore(block, titleBlock.nextSibling);
    else message.appendChild(block);
    bodyParas.forEach((p) => p.remove());
    changed = true;
  });
  return changed;
}

/** `data-web-elements-halign` на lead-row: только положение alert-блока; короткое описание не трогаем. */
function syncFeatureGridLeadRowHalignFromFieldRows(root: HTMLElement): boolean {
  let changed = false;
  root.querySelectorAll(".page-web-feature-grid-lead-row").forEach((n) => {
    const leadRow = n as HTMLElement;
    const message = leadRow.querySelector(":scope > .page-web-feature-grid-message") as HTMLElement | null;
    if (!message) return;
    if (leadRow.hasAttribute("data-web-elements-halign")) return;
    for (const fr of Array.from(message.querySelectorAll(".page-web-elements-field-row"))) {
      if (!(fr instanceof HTMLElement)) continue;
      const raw = (fr.style.textAlign || "").trim().toLowerCase();
      if (raw === "center" || raw === "right" || raw === "left") {
        leadRow.setAttribute("data-web-elements-halign", raw);
        changed = true;
        break;
      }
    }
  });
  return changed;
}

/** Текст заголовка карточки после иконки → `page-web-elements-title2` + `textarea.page-web-elements-title2-input`; `dt` — не редактируемая оболочка. */
function migrateLegacyFeatureGridCardTitleToTitle2(root: HTMLElement): boolean {
  let changed = false;
  root.querySelectorAll(".page-web-feature-grid-item-title").forEach((n) => {
    const title = n as HTMLElement;
    if (title.getAttribute("contenteditable") !== "false") {
      title.setAttribute("contenteditable", "false");
      changed = true;
    }
    if (title.querySelector(":scope .page-web-elements-title2-input")) return;

    let collectedText = "";
    const toRemove: ChildNode[] = [];
    for (const ch of Array.from(title.childNodes)) {
      if (ch.nodeType === Node.TEXT_NODE) {
        collectedText += (ch.textContent ?? "").replace(/\u200b/g, "");
        toRemove.push(ch);
      } else if (ch instanceof HTMLElement) {
        if (ch.classList.contains("page-web-feature-grid-icon-wrap")) continue;
        if (ch.classList.contains("page-web-elements-title2")) continue;
        collectedText += (ch.textContent ?? "").replace(/\u200b/g, "");
        toRemove.push(ch);
      }
    }
    toRemove.forEach((node) => node.remove());
    title.appendChild(createFeatureGridCardTitle2Wrap(collectedText.trim()));
    changed = true;
  });
  return changed;
}

/** Текст карточки в `<p>` внутри `dd.page-web-feature-grid-item-body` → `page-web-elements-description` + `textarea.page-web-elements-description-input`. */
function migrateLegacyFeatureGridCardBodyToWebElements(root: HTMLElement): boolean {
  let changed = false;
  root.querySelectorAll(".page-web-feature-grid-item-body").forEach((n) => {
    const body = n as HTMLElement;
    if (body.getAttribute("contenteditable") !== "false") {
      body.setAttribute("contenteditable", "false");
      changed = true;
    }
    if (body.querySelector(":scope > .page-web-elements-description .page-web-elements-description-input")) return;

    const linkWraps = Array.from(
      body.querySelectorAll(":scope > .page-web-feature-grid-item-link-wrap"),
    ) as HTMLElement[];
    const paras = Array.from(
      body.querySelectorAll(":scope > p:not(.page-web-feature-grid-item-link-wrap)"),
    ) as HTMLElement[];
    const texts = paras.map((p) => (p.textContent ?? "").replace(/\u200b/g, "").trim()).filter(Boolean);
    const combined = texts.join("\n\n").trim();
    linkWraps.forEach((lw) => lw.remove());
    paras.forEach((p) => p.remove());
    Array.from(body.childNodes).forEach((ch) => {
      if (ch.nodeType === Node.TEXT_NODE && (ch.textContent ?? "").replace(/\u200b/g, "").trim()) {
        ch.remove();
        changed = true;
      }
    });
    const desc = createFeatureGridCardDescriptionWrap(combined);
    body.appendChild(desc);
    linkWraps.forEach((lw) => body.appendChild(lw));
    changed = true;
  });
  return changed;
}

/** Заголовок колонки «факторов» (`<h3 class="wsx">`) → `page-web-elements-title` + `textarea.page-web-elements-title-input`. */
function migrateLegacyWorkPricingMainTitleToWebElements(root: HTMLElement): boolean {
  let changed = false;
  root.querySelectorAll(".page-web-work-pricing .wsp").forEach((n) => {
    const sp = n as HTMLElement;
    const legacy = sp.querySelector(":scope > h3.wsx") as HTMLElement | null;
    if (!legacy) return;
    const text = (legacy.textContent ?? "").replace(/\u200b/g, "").trim();
    legacy.replaceWith(createWorkPricingTitleIsland(text, "Заголовок"));
    changed = true;
  });
  return changed;
}

/** Строка цены (`<p class="wre wrj …"><span class="wsy">`) → `page-web-elements-title` + `textarea.page-web-elements-title-input`. */
function migrateLegacyWorkPricingPriceRowToWebElements(root: HTMLElement): boolean {
  let changed = false;
  root.querySelectorAll(".page-web-work-pricing .wrc.wrs.wss > p.wre.wrj.wrw.wry.wsa").forEach((n) => {
    const legacy = n as HTMLElement;
    const span = legacy.querySelector(":scope > span.wsy") as HTMLElement | null;
    const text = ((span ?? legacy).textContent ?? "").replace(/\u200b/g, "").trim();
    legacy.replaceWith(createWorkPricingTitleIsland(text, "Стоимость", "center"));
    changed = true;
  });
  return changed;
}

/** Подпись над ценой (`<p class="wsz wtg wtn">` в `.wrc.wrs.wss`) → `page-web-elements-title2` + `textarea.page-web-elements-title2-input`. */
function migrateLegacyWorkPricingPriceCaptionParagraphToWebElements(root: HTMLElement): boolean {
  let changed = false;
  root.querySelectorAll(".page-web-work-pricing .wrc.wrs.wss > p.wsz.wtg.wtn").forEach((n) => {
    const legacy = n as HTMLElement;
    if (legacy.closest(".page-web-elements")) return;
    const text = (legacy.textContent ?? "").replace(/\u200b/g, "").trim();
    legacy.replaceWith(createWorkPricingTitle2Island(text, "Подпись над ценой", "center"));
    changed = true;
  });
  return changed;
}

/** Кнопка в карточке цены (`<a class="wrg wri … wue">`) → `p.page-web-elements-cta-wrap` + `a.page-web-elements-cta-button`. */
function migrateLegacyWorkPricingCtaAnchorToWebElements(root: HTMLElement): boolean {
  let changed = false;
  root
    .querySelectorAll(
      ".page-web-work-pricing a.wrg.wri.wro.wsf.wsl.wsq.wst.wsw.wtc.wtg.wtr.wts.wua.wub.wuc.wue",
    )
    .forEach((n) => {
      const a = n as HTMLAnchorElement;
      if (a.classList.contains("page-web-elements-cta-button")) return;
      const href = (a.getAttribute("href") || "#").trim() || "#";
      const text = (a.textContent ?? "").replace(/\u200b/g, "").trim() || "Кнопка";
      const wrap = document.createElement("p");
      wrap.className = "page-web-elements-cta-wrap";
      wrap.setAttribute("contenteditable", "false");
      const na = document.createElement("a");
      na.setAttribute("href", href);
      na.className = "page-web-elements-cta-button";
      na.textContent = text;
      wrap.appendChild(na);
      a.replaceWith(wrap);
      changed = true;
    });
  return changed;
}

/** Строка «Что входит» (`<h4 class="wru …">` в `.wrg`) → `page-web-elements-subtitle` + `textarea.page-web-elements-subtitle-input`. */
function migrateLegacyWorkPricingIncludedRowSubtitleToWebElements(root: HTMLElement): boolean {
  let changed = false;
  root.querySelectorAll(".page-web-work-pricing .wrg").forEach((n) => {
    const row = n as HTMLElement;
    const legacy = row.querySelector(":scope > h4.wru.wtg.wtq") as HTMLElement | null;
    if (!legacy) return;
    const text = (legacy.textContent ?? "").replace(/\u200b/g, "").trim();
    const wrap = document.createElement("div");
    wrap.className = "page-web-elements page-web-elements-subtitle";
    wrap.setAttribute("contenteditable", "false");
    wrap.setAttribute(WORK_PRICING_WEB_ELEMENTS_HALIGN_ATTR, "left");
    const fieldRow = document.createElement("div");
    fieldRow.className = "page-web-elements-field-row";
    fieldRow.setAttribute("contenteditable", "false");
    const ta = document.createElement("textarea");
    ta.className = "page-web-elements-subtitle-input";
    ta.setAttribute("spellcheck", "true");
    ta.setAttribute("placeholder", "Подзаголовок");
    ta.setAttribute("rows", "1");
    ta.value = text;
    fieldRow.appendChild(ta);
    wrap.appendChild(fieldRow);
    legacy.replaceWith(wrap);
    changed = true;
  });
  return changed;
}

/** Лид в левой колонке (`<p class="wre wta wtn">`) → `page-web-elements-description` + `textarea.page-web-elements-description-input`. */
function migrateLegacyWorkPricingLeadParagraphToWebElements(root: HTMLElement): boolean {
  let changed = false;
  root.querySelectorAll(".page-web-work-pricing .wsp > p.wre.wta.wtn").forEach((n) => {
    const legacy = n as HTMLElement;
    const text = (legacy.textContent ?? "").replace(/\u200b/g, "").trim();
    legacy.replaceWith(createWorkPricingDescriptionIsland(text, "Короткое описание"));
    changed = true;
  });
  return changed;
}

/** Подпись под ценой (`<p class="wre wte wtn">` в `.wrd`) → `page-web-elements-description` + textarea. */
function migrateLegacyWorkPricingRightColumnFootnoteToWebElements(root: HTMLElement): boolean {
  let changed = false;
  root.querySelectorAll(".page-web-work-pricing .wrd p.wre.wte.wtn").forEach((n) => {
    const legacy = n as HTMLElement;
    const text = (legacy.textContent ?? "").replace(/\u200b/g, "").trim();
    legacy.replaceWith(createWorkPricingDescriptionIsland(text, "Дополнительный текст"));
    changed = true;
  });
  return changed;
}

/** Текст пункта списка (после галочки) → `page-web-elements-description` + textarea. */
function migrateLegacyWorkPricingListItemBodyToWebElements(root: HTMLElement): boolean {
  let changed = false;
  root.querySelectorAll(".page-web-work-pricing ul.wrf > li").forEach((n) => {
    const li = n as HTMLElement;
    if (
      li.querySelector(
        ":scope > .page-web-elements.page-web-elements-description textarea.page-web-elements-description-input",
      )
    ) {
      return;
    }
    const svg = li.querySelector(":scope > svg.wrl.wrn") as SVGElement | null;
    const parts: string[] = [];
    const toRemove: ChildNode[] = [];
    for (const ch of Array.from(li.childNodes)) {
      if (svg && ch === svg) continue;
      if (ch.nodeType === Node.TEXT_NODE) {
        parts.push((ch.textContent ?? "").replace(/\u200b/g, ""));
        toRemove.push(ch);
      } else if (ch.nodeType === Node.ELEMENT_NODE) {
        const el = ch as HTMLElement;
        if (el.tagName === "P") {
          parts.push((el.textContent ?? "").replace(/\u200b/g, "").trim());
          toRemove.push(ch);
        } else if (!el.classList.contains("page-web-elements")) {
          parts.push((el.textContent ?? "").replace(/\u200b/g, "").trim());
          toRemove.push(ch);
        }
      }
    }
    const text = parts.join(" ").replace(/\s+/g, " ").trim();
    toRemove.forEach((x) => x.remove());
    li.appendChild(createWorkPricingDescriptionIsland(text, "Текст пункта"));
    changed = true;
  });
  return changed;
}

/** Островки web-elements внутри contenteditable блока стоимости: обёртки не редактируются, только textarea. */
function normalizeWebWorkPricingWebElementsIslandEditabilityInEditor(rootEl: HTMLElement): boolean {
  let changed = false;
  const normalizeOne = (wrap: HTMLElement) => {
    if (wrap.getAttribute("contenteditable") !== "false") {
      wrap.setAttribute("contenteditable", "false");
      changed = true;
    }
    if (!wrap.hasAttribute(WORK_PRICING_WEB_ELEMENTS_HALIGN_ATTR)) {
      const inPriceCard =
        (wrap.classList.contains("page-web-elements-title") || wrap.classList.contains("page-web-elements-title2")) &&
        !!wrap.closest(".page-web-work-pricing .wrc.wrs.wss");
      wrap.setAttribute(WORK_PRICING_WEB_ELEMENTS_HALIGN_ATTR, inPriceCard ? "center" : "left");
      changed = true;
    }
    wrap.querySelectorAll(":scope > .page-web-elements-field-row").forEach((r) => {
      const row = r as HTMLElement;
      if (row.getAttribute("contenteditable") !== "false") {
        row.setAttribute("contenteditable", "false");
        changed = true;
      }
    });
  };
  rootEl.querySelectorAll(".page-web-work-pricing .page-web-elements.page-web-elements-title").forEach((n) => {
    normalizeOne(n as HTMLElement);
  });
  rootEl.querySelectorAll(".page-web-work-pricing .page-web-elements.page-web-elements-title2").forEach((n) => {
    normalizeOne(n as HTMLElement);
  });
  rootEl.querySelectorAll(".page-web-work-pricing .wrg > .page-web-elements.page-web-elements-subtitle").forEach((n) => {
    normalizeOne(n as HTMLElement);
  });
  rootEl.querySelectorAll(".page-web-work-pricing .page-web-elements.page-web-elements-description").forEach((n) => {
    normalizeOne(n as HTMLElement);
  });
  return changed;
}

function normalizeFeatureGridMessageLayoutsInEditor(rootEl: HTMLElement): boolean {
  let changed = false;
  rootEl.querySelectorAll(".page-web-feature-grid").forEach((node) => {
    const grid = node as HTMLElement;
    const pos = getFeatureGridMessagePosition(grid);
    if (!pos) return;
    if (pos === "none") {
      if (clearFeatureGridMessage(grid)) changed = true;
      return;
    }
    if (ensureFeatureGridMessage(grid, pos)) changed = true;
  });
  return changed;
}

function setFeatureGridImagePosition(root: HTMLElement, position: FeatureGridImagePosition): boolean {
  if (position === "none") return clearFeatureGridImage(root);
  let changed = ensureFeatureGridContentWrap(root);
  const image = ensureFeatureGridImageNode(root);
  if (image.parentElement !== root || root.lastElementChild !== image) {
    root.appendChild(image);
    changed = true;
  }
  if (image.getAttribute("data-feature-grid-image-has-src") !== "1") {
    image.setAttribute("data-feature-grid-image-has-src", "0");
  }
  if (root.getAttribute("data-feature-grid-image-position") !== position) {
    root.setAttribute("data-feature-grid-image-position", position);
    changed = true;
  }
  if (featureGridImagePositionSupportsDisplay(position)) {
    if (ensureFeatureGridImageDisplay(root)) changed = true;
  } else if (root.hasAttribute("data-feature-grid-image-display")) {
    root.removeAttribute("data-feature-grid-image-display");
    changed = true;
  }
  return changed;
}

function normalizeFeatureGridImageLayoutsInEditor(rootEl: HTMLElement): boolean {
  let changed = normalizeFeatureGridContentWrapInRoot(rootEl);
  rootEl.querySelectorAll(".page-web-feature-grid").forEach((node) => {
    const root = node as HTMLElement;
    const pos = getFeatureGridImagePosition(root);
    if (pos === "none") {
      if (clearFeatureGridImage(root)) changed = true;
      return;
    }
    if (setFeatureGridImagePosition(root, pos)) changed = true;
  });
  return changed;
}

/** Шапка сетки внутри contenteditable: без этого каретка попадает в обёртки вне textarea. Сообщение — отдельный редактируемый островок. */
function normalizeWebFeatureGridHeadEditabilityInEditor(rootEl: HTMLElement): boolean {
  let changed = false;
  rootEl.querySelectorAll(".page-web-feature-grid-content").forEach((n) => {
    const content = n as HTMLElement;
    if (content.getAttribute("contenteditable") !== "false") {
      content.setAttribute("contenteditable", "false");
      changed = true;
    }
  });
  rootEl.querySelectorAll(".page-web-feature-grid-head").forEach((n) => {
    const head = n as HTMLElement;
    if (head.getAttribute("contenteditable") !== "false") {
      head.setAttribute("contenteditable", "false");
      changed = true;
    }
  });
  rootEl.querySelectorAll(".page-web-feature-grid .page-web-feature-grid-message").forEach((n) => {
    const message = n as HTMLElement;
    if (message.getAttribute("contenteditable") !== "false") {
      message.setAttribute("contenteditable", "false");
      changed = true;
    }
    message.querySelectorAll(":scope > p").forEach((p) => {
      const pe = p as HTMLElement;
      if (pe.getAttribute("contenteditable") !== "true") {
        pe.setAttribute("contenteditable", "true");
        changed = true;
      }
    });
  });
  return changed;
}

/** Соседние feature-grid: остров alert/textarea снизу может визуально и по hit-test наезжать на шапку следующего блока — поднимаем z-index по порядку в DOM. */
function assignFeatureGridWebTextBlockStackingOrderInEditor(root: HTMLElement): boolean {
  let changed = false;
  let fgStack = 0;
  root.querySelectorAll(".page-web-text-block").forEach((n) => {
    const el = n as HTMLElement;
    const isFg = el.getAttribute("data-text-block-variant") === "feature-grid";
    if (isFg) {
      fgStack += 1;
      const z = String(fgStack);
      if (el.style.zIndex !== z) {
        el.style.zIndex = z;
        changed = true;
      }
    } else if (el.style.zIndex) {
      el.style.removeProperty("z-index");
      changed = true;
    }
  });
  return changed;
}

function createFeatureGridCardNode(root: HTMLElement, index: number): HTMLElement {
  const alreadyHadCards = getFeatureGridCardsCount(root) > 0;
  const decoration = getFeatureGridCardDecoration(root);
  const includeIcon = decoration === "icons";
  const includeTitle2 = hasFeatureGridCardTitle2Visible(root);
  const includeDescription = !alreadyHadCards || hasFeatureGridCardDescriptions(root);
  const includeCta = alreadyHadCards && hasFeatureGridCardCta(root);
  const includeLearnMore = !alreadyHadCards || hasFeatureGridCardLearnMore(root);

  const wrap = document.createElement("div");
  wrap.innerHTML =
    '<div class="page-web-feature-grid-item">' +
    '<dt class="page-web-feature-grid-item-title" contenteditable="false">' +
    (includeIcon ? getFeatureGridIconWrapHtml("bolt") : "") +
    "</dt>" +
    '<dd class="page-web-feature-grid-item-body" contenteditable="false">' +
    "</dd>" +
    "</div>";
  const item = wrap.firstElementChild as HTMLElement;
  const dt = item.querySelector(":scope > .page-web-feature-grid-item-title") as HTMLElement | null;
  const dd = item.querySelector(":scope > .page-web-feature-grid-item-body") as HTMLElement | null;
  if (!dt || !dd) return item;

  if (includeTitle2) {
    dt.appendChild(createFeatureGridCardTitle2Wrap(`Карточка ${index}`));
  }
  if (includeDescription) {
    dd.appendChild(createFeatureGridCardDescriptionWrap(FEATURE_GRID_CARD_DESCRIPTION_DEFAULT));
  }
  if (includeCta) {
    const tmp = document.createElement("div");
    tmp.innerHTML = getFeatureGridCardCtaRowHtml();
    const cta = tmp.firstElementChild;
    if (cta) dd.appendChild(cta);
  }
  if (includeLearnMore) {
    dd.appendChild(createFeatureGridLearnMoreNode());
  }
  return item;
}

function getFeatureGridCardItems(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll(".page-web-feature-grid-list .page-web-feature-grid-item")) as HTMLElement[];
}

function getFeatureGridCardsList(root: HTMLElement): HTMLElement | null {
  return root.querySelector(".page-web-feature-grid-list") as HTMLElement | null;
}

function getFeatureGridCardsCount(root: HTMLElement): number {
  return getFeatureGridCardItems(root).length;
}

function addOneFeatureGridCard(root: HTMLElement): boolean {
  ensureFeatureGridContentWrap(root);
  let list = getFeatureGridCardsList(root);
  if (!list) {
    const content = getFeatureGridContentWrap(root) ?? root;
    list = document.createElement("dl");
    list.className = "page-web-feature-grid-list";
    content.appendChild(list);
  }
  const nextIndex = getFeatureGridCardsCount(root) + 1;
  list.appendChild(createFeatureGridCardNode(root, nextIndex));
  return true;
}

function removeOneFeatureGridCard(root: HTMLElement): boolean {
  const list = getFeatureGridCardsList(root);
  if (!list) return false;
  const items = Array.from(list.querySelectorAll(".page-web-feature-grid-item")) as HTMLElement[];
  if (items.length === 0) return false;
  items[items.length - 1].remove();
  if (list.querySelectorAll(".page-web-feature-grid-item").length === 0) {
    list.remove();
  }
  return true;
}

function createFeatureGridCardIconNode(): HTMLElement {
  const wrap = document.createElement("div");
  wrap.innerHTML = getFeatureGridIconWrapHtml("bolt");
  return wrap.firstElementChild as HTMLElement;
}

function getFeatureGridIconPresetById(id: string | null | undefined): FeatureGridIconPreset {
  const found = FEATURE_GRID_ICON_PRESETS.find((item) => item.id === id);
  return found ?? FEATURE_GRID_ICON_PRESETS[0];
}

function getFeatureGridIconWrapHtml(id: string | null | undefined): string {
  const icon = getFeatureGridIconPresetById(id);
  return (
    '<span class="page-web-feature-grid-icon-wrap" data-feature-grid-icon-id="' +
    icon.id +
    '" aria-hidden="true">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="page-web-feature-grid-icon">' +
    '<path d="' +
    icon.path +
    '" stroke-linecap="round" stroke-linejoin="round"></path>' +
    "</svg>" +
    "</span>"
  );
}

function detectFeatureGridIconPresetId(iconWrap: HTMLElement): FeatureGridIconPreset["id"] {
  const attrId = iconWrap.getAttribute("data-feature-grid-icon-id");
  if (FEATURE_GRID_ICON_PRESETS.some((n) => n.id === attrId)) return attrId as FeatureGridIconPreset["id"];
  const path = (iconWrap.querySelector("path")?.getAttribute("d") || "").trim();
  const byPath = FEATURE_GRID_ICON_PRESETS.find((n) => n.path === path);
  return (byPath?.id ?? FEATURE_GRID_ICON_PRESETS[0].id) as FeatureGridIconPreset["id"];
}

function createFeatureGridLearnMoreNode(): HTMLElement {
  const p = document.createElement("p");
  p.className = "page-web-feature-grid-item-link-wrap";
  const span = document.createElement("span");
  span.className = "page-web-elements-announcement-learn-more";
  span.setAttribute("role", "button");
  span.setAttribute("contenteditable", "false");
  span.setAttribute("tabindex", "-1");
  span.textContent = "Подробнее";
  p.appendChild(span);
  return p;
}

function hasFeatureGridCardIcons(root: HTMLElement): boolean {
  return !!root.querySelector(".page-web-feature-grid-item-title .page-web-feature-grid-icon-wrap");
}

function hasFeatureGridCardNumbers(root: HTMLElement): boolean {
  return root.getAttribute("data-feature-grid-card-numbers") === "1";
}

function hasFeatureGridCardLearnMore(root: HTMLElement): boolean {
  return !!root.querySelector(
    ".page-web-feature-grid-item-link-wrap .page-web-elements-announcement-learn-more, .page-web-feature-grid-item-link-wrap .page-web-feature-grid-link",
  );
}

function hasFeatureGridCardTitle2Visible(root: HTMLElement): boolean {
  return root.getAttribute("data-feature-grid-card-show-title2") !== "0";
}

function toggleFeatureGridCardTitle2(root: HTMLElement): boolean {
  if (hasFeatureGridCardTitle2Visible(root)) {
    root.setAttribute("data-feature-grid-card-show-title2", "0");
  } else {
    root.removeAttribute("data-feature-grid-card-show-title2");
  }
  return true;
}

function getFeatureGridCardDecoration(root: HTMLElement): "none" | "icons" | "numbers" {
  if (hasFeatureGridCardNumbers(root)) return "numbers";
  if (hasFeatureGridCardIcons(root)) return "icons";
  return "none";
}

function setFeatureGridCardDecoration(root: HTMLElement, mode: "none" | "icons" | "numbers"): boolean {
  const cur = getFeatureGridCardDecoration(root);
  if (cur === mode) return false;
  if (mode === "none") {
    if (hasFeatureGridCardNumbers(root)) toggleFeatureGridCardNumbers(root);
    if (hasFeatureGridCardIcons(root)) toggleFeatureGridCardIcons(root);
    return true;
  }
  if (mode === "icons") {
    if (hasFeatureGridCardNumbers(root)) toggleFeatureGridCardNumbers(root);
    if (!hasFeatureGridCardIcons(root)) toggleFeatureGridCardIcons(root);
    return true;
  }
  if (!hasFeatureGridCardNumbers(root)) toggleFeatureGridCardNumbers(root);
  return true;
}

function hasFeatureGridCardDescriptions(root: HTMLElement): boolean {
  const items = getFeatureGridCardItems(root);
  if (items.length === 0) return false;
  return items.some((item) => {
    const body = item.querySelector(":scope > .page-web-feature-grid-item-body") as HTMLElement | null;
    if (!body) return false;
    return !!body.querySelector(":scope > .page-web-elements-description");
  });
}

function toggleFeatureGridCardIcons(root: HTMLElement): boolean {
  const items = getFeatureGridCardItems(root);
  if (items.length === 0) return false;
  const hasIcons = hasFeatureGridCardIcons(root);
  if (hasIcons) {
    items.forEach((item) => {
      const title = item.querySelector(":scope > .page-web-feature-grid-item-title") as HTMLElement | null;
      if (!title) return;
      title.querySelectorAll(".page-web-feature-grid-icon-wrap").forEach((n) => n.remove());
    });
    return true;
  }
  root.removeAttribute("data-feature-grid-card-numbers");
  items.forEach((item) => {
    const title = item.querySelector(":scope > .page-web-feature-grid-item-title") as HTMLElement | null;
    if (!title) return;
    if (title.querySelector(".page-web-feature-grid-icon-wrap")) return;
    title.insertBefore(createFeatureGridCardIconNode(), title.firstChild);
  });
  return true;
}

function toggleFeatureGridCardNumbers(root: HTMLElement): boolean {
  const items = getFeatureGridCardItems(root);
  if (items.length === 0) return false;
  const enabled = hasFeatureGridCardNumbers(root);
  if (enabled) {
    root.removeAttribute("data-feature-grid-card-numbers");
    return true;
  }
  // Numbered circles are an alternative to per-card icons.
  items.forEach((item) => {
    const title = item.querySelector(":scope > .page-web-feature-grid-item-title") as HTMLElement | null;
    if (!title) return;
    title.querySelectorAll(".page-web-feature-grid-icon-wrap").forEach((n) => n.remove());
  });
  root.setAttribute("data-feature-grid-card-numbers", "1");
  return true;
}

function toggleFeatureGridCardLearnMore(root: HTMLElement): boolean {
  const items = getFeatureGridCardItems(root);
  if (items.length === 0) return false;
  const hasLearnMore = hasFeatureGridCardLearnMore(root);
  if (hasLearnMore) {
    items.forEach((item) => {
      const body = item.querySelector(":scope > .page-web-feature-grid-item-body") as HTMLElement | null;
      if (!body) return;
      body.querySelectorAll(".page-web-feature-grid-item-link-wrap").forEach((n) => n.remove());
    });
    return true;
  }
  items.forEach((item) => {
    const body = item.querySelector(":scope > .page-web-feature-grid-item-body") as HTMLElement | null;
    if (!body) return;
    if (body.querySelector(".page-web-feature-grid-item-link-wrap")) return;
    body.appendChild(createFeatureGridLearnMoreNode());
  });
  return true;
}

function hasFeatureGridCardCta(root: HTMLElement): boolean {
  const items = getFeatureGridCardItems(root);
  if (items.length === 0) return false;
  return items.some((item) => {
    const body = item.querySelector(":scope > .page-web-feature-grid-item-body") as HTMLElement | null;
    return !!body?.querySelector(":scope > p.page-web-elements-cta-wrap");
  });
}

function toggleFeatureGridCardCta(root: HTMLElement): boolean {
  const items = getFeatureGridCardItems(root);
  if (items.length === 0) return false;
  if (hasFeatureGridCardCta(root)) {
    items.forEach((item) => {
      const body = item.querySelector(":scope > .page-web-feature-grid-item-body") as HTMLElement | null;
      if (!body) return;
      body.querySelectorAll(":scope > p.page-web-elements-cta-wrap").forEach((n) => n.remove());
    });
    return true;
  }
  items.forEach((item) => {
    const body = item.querySelector(":scope > .page-web-feature-grid-item-body") as HTMLElement | null;
    if (!body) return;
    if (body.querySelector(":scope > p.page-web-elements-cta-wrap")) return;
    const tmp = document.createElement("div");
    tmp.innerHTML = getFeatureGridCardCtaRowHtml();
    const cta = tmp.firstElementChild as HTMLElement | null;
    if (!cta) return;
    const linkWrap = body.querySelector(":scope > .page-web-feature-grid-item-link-wrap");
    if (linkWrap) body.insertBefore(cta, linkWrap);
    else body.appendChild(cta);
  });
  return true;
}

function toggleFeatureGridCardDescriptions(root: HTMLElement): boolean {
  const items = getFeatureGridCardItems(root);
  if (items.length === 0) return false;
  const hasDescriptions = hasFeatureGridCardDescriptions(root);
  if (hasDescriptions) {
    items.forEach((item) => {
      const body = item.querySelector(":scope > .page-web-feature-grid-item-body") as HTMLElement | null;
      if (!body) return;
      body.querySelectorAll(":scope > .page-web-elements-description").forEach((n) => n.remove());
    });
    return true;
  }
  items.forEach((item) => {
    const body = item.querySelector(":scope > .page-web-feature-grid-item-body") as HTMLElement | null;
    if (!body) return;
    if (body.querySelector(":scope > .page-web-elements-description")) return;
    const description = createFeatureGridCardDescriptionWrap(FEATURE_GRID_CARD_DESCRIPTION_DEFAULT);
    const anchor = body.querySelector(
      ":scope > .page-web-elements-cta-wrap, :scope > .page-web-feature-grid-item-link-wrap",
    );
    if (anchor) body.insertBefore(description, anchor);
    else body.appendChild(description);
  });
  return true;
}

function getFeatureGridCols(root: HTMLElement): 2 | 3 | 4 {
  const raw = root.getAttribute("data-feature-grid-cols");
  if (raw === "2") return 2;
  if (raw === "4") return 4;
  return 3;
}

function setFeatureGridCols(root: HTMLElement, cols: 2 | 3 | 4): boolean {
  const current = getFeatureGridCols(root);
  if (current === cols) return false;
  root.setAttribute("data-feature-grid-cols", String(cols));
  return true;
}

function hasFeatureGridBlockCardsListVisible(root: HTMLElement): boolean {
  return root.getAttribute("data-feature-grid-show-cards") !== "0";
}

function toggleFeatureGridBlockCardsList(root: HTMLElement): boolean {
  if (hasFeatureGridBlockCardsListVisible(root)) {
    root.setAttribute("data-feature-grid-show-cards", "0");
  } else {
    root.removeAttribute("data-feature-grid-show-cards");
  }
  return true;
}

function ensureFeatureGridHead(root: HTMLElement): HTMLElement {
  ensureFeatureGridContentWrap(root);
  const content = getFeatureGridContentWrap(root) ?? root;
  let head = content.querySelector(":scope > .page-web-feature-grid-head") as HTMLElement | null;
  if (head) return head;
  head = document.createElement("div");
  head.className = "page-web-feature-grid-head";
  head.setAttribute("contenteditable", "false");
  content.insertBefore(head, content.firstChild);
  return head;
}

function insertFeatureGridHeadNodeByOrder(head: HTMLElement, node: HTMLElement, kind: FeatureGridElementKind) {
  if (kind === "lead") {
    const row = ensureFeatureGridLeadRow(head);
    const message = row.querySelector(":scope > .page-web-feature-grid-message");
    if (message) row.insertBefore(node, message);
    else row.appendChild(node);
    return;
  }
  const order: FeatureGridElementKind[] = ["subtitle", "title", "lead"];
  const myIdx = order.indexOf(kind);
  for (let i = myIdx + 1; i < order.length; i++) {
    const after = queryFeatureGridHeadOrderAnchor(head, order[i]);
    if (after) {
      head.insertBefore(node, after);
      return;
    }
  }
  head.appendChild(node);
}

function countFeatureGridHeadFieldKindsPresent(root: HTMLElement): number {
  let n = 0;
  (["subtitle", "title", "lead"] as const).forEach((k) => {
    if (getFeatureGridElementNode(root, k)) n += 1;
  });
  return n;
}

function toggleFeatureGridTextBlockElement(block: HTMLElement, kind: FeatureGridElementKind): boolean {
  const content = block.querySelector(":scope > .page-web-text-block-content") as HTMLElement | null;
  if (!content) return false;
  const root = content.querySelector(".page-web-feature-grid") as HTMLElement | null;
  if (!root) return false;
  const existing = getFeatureGridElementNode(root, kind);
  if (existing) {
    if (countFeatureGridHeadFieldKindsPresent(root) <= 1) return false;
    const parent = existing.parentElement;
    existing.remove();
    if (kind === "lead" && parent?.classList.contains("page-web-feature-grid-lead-row")) {
      if (!parent.querySelector(".page-web-feature-grid-message")) parent.remove();
    }
    return true;
  }
  const head = ensureFeatureGridHead(root);
  const node = createFeatureGridHeadNode(kind);
  insertFeatureGridHeadNodeByOrder(head, node, kind);
  return true;
}

function syncFeatureGridElementsMenuState(toolbar: HTMLElement) {
  const block = toolbar.closest(".page-web-text-block") as HTMLElement | null;
  if (!block) return;
  const content = block.querySelector(":scope > .page-web-text-block-content") as HTMLElement | null;
  const root = content?.querySelector(".page-web-feature-grid") as HTMLElement | null;
  const headFieldCount = root ? countFeatureGridHeadFieldKindsPresent(root) : 0;
  const blockCardsOn = root ? hasFeatureGridBlockCardsListVisible(root) : true;
  toolbar.querySelectorAll("[data-toggle-feature-grid-element]").forEach((node) => {
    const btn = node as HTMLButtonElement;
    const raw = btn.getAttribute("data-toggle-feature-grid-element");
    if (!isFeatureGridElementKind(raw)) return;
    const exists = root ? !!getFeatureGridElementNode(root, raw) : false;
    btn.setAttribute("aria-checked", exists ? "true" : "false");
    const disableRemoveLast = exists && headFieldCount <= 1;
    btn.disabled = disableRemoveLast;
    btn.setAttribute("aria-disabled", disableRemoveLast ? "true" : "false");
  });
  toolbar.querySelectorAll("[data-feature-grid-block-toggle]").forEach((node) => {
    const btn = node as HTMLButtonElement;
    const raw = btn.getAttribute("data-feature-grid-block-toggle");
    if (raw !== "cards" || !root) return;
    btn.setAttribute("aria-checked", hasFeatureGridBlockCardsListVisible(root) ? "true" : "false");
  });
    const hasCards = root ? getFeatureGridCardsCount(root) > 0 : false;
  toolbar.querySelectorAll("[data-feature-grid-cards-action]").forEach((node) => {
    const btn = node as HTMLButtonElement;
    const action = btn.getAttribute("data-feature-grid-cards-action");
    if (action === "remove") {
      const dis = !root || !blockCardsOn || !hasCards;
      btn.disabled = dis;
      btn.setAttribute("aria-disabled", dis ? "true" : "false");
    } else if (action === "add") {
      const dis = !root || !blockCardsOn;
      btn.disabled = dis;
      btn.setAttribute("aria-disabled", dis ? "true" : "false");
    }
  });
  toolbar.querySelectorAll("[data-feature-grid-card-field-toggle]").forEach((node) => {
    const btn = node as HTMLButtonElement;
    const raw = btn.getAttribute("data-feature-grid-card-field-toggle");
    if (!isFeatureGridCardFieldToggleKey(raw) || !root) return;
    const dis = !blockCardsOn || !hasCards;
    btn.disabled = dis;
    btn.setAttribute("aria-disabled", dis ? "true" : "false");
    if (!hasCards || !blockCardsOn) return;
    if (raw === "title2") {
      btn.setAttribute("aria-checked", hasFeatureGridCardTitle2Visible(root) ? "true" : "false");
      return;
    }
    if (raw === "description") {
      btn.setAttribute("aria-checked", hasFeatureGridCardDescriptions(root) ? "true" : "false");
      return;
    }
    if (raw === "cta") {
      btn.setAttribute("aria-checked", hasFeatureGridCardCta(root) ? "true" : "false");
      return;
    }
    btn.setAttribute("aria-checked", hasFeatureGridCardLearnMore(root) ? "true" : "false");
  });
  toolbar.querySelectorAll("[data-feature-grid-card-decoration]").forEach((node) => {
    const btn = node as HTMLButtonElement;
    const raw = btn.getAttribute("data-feature-grid-card-decoration");
    if (!isFeatureGridCardDecorationKey(raw) || !root) return;
    const dis = !blockCardsOn || !hasCards;
    btn.disabled = dis;
    btn.setAttribute("aria-disabled", dis ? "true" : "false");
    if (!hasCards || !blockCardsOn) return;
    btn.setAttribute("aria-checked", getFeatureGridCardDecoration(root) === raw ? "true" : "false");
  });
  const currentCols = root ? getFeatureGridCols(root) : 3;
  toolbar.querySelectorAll("[data-feature-grid-set-cols]").forEach((node) => {
    const btn = node as HTMLButtonElement;
    const cols = btn.getAttribute("data-feature-grid-set-cols");
    const dis = !root || !blockCardsOn;
    btn.disabled = dis;
    btn.setAttribute("aria-disabled", dis ? "true" : "false");
    btn.setAttribute("aria-checked", cols === String(currentCols) ? "true" : "false");
  });
  const currentMessagePosition = root ? (getFeatureGridMessagePosition(root) ?? "none") : "none";
  toolbar.querySelectorAll("[data-feature-grid-message-position]").forEach((node) => {
    const btn = node as HTMLButtonElement;
    const pos = btn.getAttribute("data-feature-grid-message-position");
    btn.setAttribute("aria-checked", pos && pos === currentMessagePosition ? "true" : "false");
  });
  const currentMessageColor = root ? getFeatureGridMessageColor(root) : "red";
  toolbar.querySelectorAll("[data-feature-grid-message-color]").forEach((node) => {
    const btn = node as HTMLButtonElement;
    const color = btn.getAttribute("data-feature-grid-message-color");
    btn.setAttribute("aria-checked", color && color === currentMessageColor ? "true" : "false");
  });
  const currentImagePosition = root ? getFeatureGridImagePosition(root) : "none";
  toolbar.querySelectorAll("[data-feature-grid-image-position]").forEach((node) => {
    const btn = node as HTMLButtonElement;
    const pos = btn.getAttribute("data-feature-grid-image-position");
    btn.setAttribute("aria-checked", pos && pos === currentImagePosition ? "true" : "false");
  });
  const showImageDisplayOptions = featureGridImagePositionSupportsDisplay(currentImagePosition);
  const currentImageDisplay = root ? getFeatureGridImageDisplay(root) : "separate";
  toolbar.querySelectorAll(".page-web-text-block-menu-sep--feature-grid-image-display").forEach((node) => {
    (node as HTMLElement).style.display = showImageDisplayOptions ? "" : "none";
  });
  toolbar.querySelectorAll("[data-feature-grid-image-display]").forEach((node) => {
    const btn = node as HTMLButtonElement;
    const display = btn.getAttribute("data-feature-grid-image-display");
    btn.style.display = showImageDisplayOptions ? "" : "none";
    btn.disabled = !showImageDisplayOptions;
    btn.setAttribute("aria-disabled", showImageDisplayOptions ? "false" : "true");
    btn.setAttribute("aria-checked", display && display === currentImageDisplay ? "true" : "false");
  });
  toolbar.querySelectorAll("[data-feature-grid-upload-image]").forEach((node) => {
    const btn = node as HTMLButtonElement;
    const canUpload = currentImagePosition !== "none";
    btn.style.display = canUpload ? "block" : "none";
    btn.disabled = !canUpload;
    btn.setAttribute("aria-disabled", canUpload ? "false" : "true");
    btn.textContent = root?.querySelector(":scope > .page-web-feature-grid-image[data-feature-grid-image-has-src='1']")
      ? "Заменить изображение"
      : "Загрузить изображение";
  });
}

function syncTextBlockToolbarVariantState(toolbar: HTMLElement) {
  const block = toolbar.closest(".page-web-text-block") as HTMLElement | null;
  if (!block) return;
  const variant = block.getAttribute("data-text-block-variant") || "";
  if (toolbar.getAttribute("data-text-block-variant") !== variant) {
    toolbar.setAttribute("data-text-block-variant", variant);
  }
  if (variant === "feature-grid") {
    syncFeatureGridElementsMenuState(toolbar);
    return;
  }
  if (variant === "work-pricing") {
    const block = toolbar.closest(".page-web-text-block") as HTMLElement | null;
    const content = block?.querySelector(":scope > .page-web-text-block-content") as HTMLElement | null;
    const list = content?.querySelector(".page-web-work-pricing .wrf") as HTMLElement | null;
    const count = list ? list.querySelectorAll(":scope > li").length : 0;
    toolbar.querySelectorAll("[data-work-pricing-items-action='remove']").forEach((node) => {
      const btn = node as HTMLButtonElement;
      const canRemove = count > 1;
      btn.disabled = !canRemove;
      btn.setAttribute("aria-disabled", canRemove ? "false" : "true");
    });
    return;
  }
  syncPlainTextBlockFieldMenuButtons(toolbar, block);
}

function moveWebBlockByToolbar(toolbar: HTMLElement, direction: "up" | "down", ed: HTMLElement): boolean {
  const block = toolbar.closest(
    ".page-web-cover, .page-web-carousel, .page-web-timeline, .page-web-text-media, .page-web-text-block, .page-web-text-block-v2, .page-web-article-text, .page-web-accordion, .page-web-spacer",
  ) as HTMLElement | null;
  if (!block || !ed.contains(block)) return false;
  const parent = block.parentElement;
  if (!parent) return false;
  const blocks = Array.from(parent.children).filter((node) =>
    (node as HTMLElement).matches?.(
      ".page-web-cover, .page-web-carousel, .page-web-timeline, .page-web-text-media, .page-web-text-block, .page-web-text-block-v2, .page-web-article-text, .page-web-accordion, .page-web-spacer",
    ),
  ) as HTMLElement[];
  const idx = blocks.indexOf(block);
  if (idx < 0) return false;
  const neighbor = direction === "up" ? blocks[idx - 1] : blocks[idx + 1];
  if (!neighbor) return false;
  if (direction === "up") parent.insertBefore(block, neighbor);
  else parent.insertBefore(neighbor, block);
  return true;
}

/**
 * Для сравнения innerHTML до/после нормализаций: убираем из `<textarea style="…">` только
 * измерительные свойства, которые выставляет `autosizeWebTextBlockV2Textareas` / `layoutWebElementsTextareaSize` (width/height и т.д.),
 * иначе каждый проход layoutEffect даёт «изменение» → setContentHtml → бесконечный цикл React.
 */
function stripWebTextBlockV2TextareaMeasurementStylesForCompare(html: string): string {
  return html.replace(/<textarea\b([^>]*?)>/gi, (full, attrs: string) => {
    const styleMatch = attrs.match(/\bstyle\s*=\s*"([^"]*)"/i);
    if (!styleMatch) return full;
    const style = styleMatch[1];
    const cleaned = style
      .replace(/\bwidth\s*:\s*[^;]+;?/gi, "")
      .replace(/\bheight\s*:\s*[^;]+;?/gi, "")
      .replace(/\bmax-width\s*:\s*[^;]+;?/gi, "")
      .replace(/\bbox-sizing\s*:\s*[^;]+;?/gi, "")
      .replace(/\s*;\s*;/g, ";")
      .trim()
      .replace(/^;+|;+$/g, "");
    let newAttrs = attrs.replace(/\bstyle\s*=\s*"[^"]*"/i, cleaned ? `style="${cleaned}"` : "");
    newAttrs = newAttrs.replace(/\s{2,}/g, " ").trim();
    return `<textarea ${newAttrs}>`;
  });
}

/**
 * Block-mode редактор: на полотне остаются только web-блоки.
 * Старый свободный HTML переносится в блок "текст слева, картинка справа".
 */
function normalizeToBlockEditorHtml(inputHtml: string): string {
  if (typeof document === "undefined") return inputHtml;
  const raw = typeof inputHtml === "string" ? inputHtml.trim() : "";
  if (!raw) return "";
  try {
    const wrap = document.createElement("div");
    wrap.innerHTML = raw;
    // Чистим служебный chrome редактора, если он случайно попал в сохранённый HTML.
    wrap
      .querySelectorAll(
        '.page-editor, [aria-label="Добавить блок"], .page-web-text-block-toolbar, .page-web-text-block-v2-toolbar, .page-web-article-text-toolbar, .page-web-accordion-toolbar, .page-web-spacer-toolbar, .oin, .oit, .oja, .ohx, .oie, .oir, .oia, .oif, .ohw, .oig, .oid, .oij, .oim, .oil',
      )
      .forEach((n) => n.remove());
    const blockHtml: string[] = [];
    const legacy = document.createElement("div");
    const isAllowedBlock = (el: Element) =>
      el.matches(
        ".page-web-cover, .page-web-carousel, .page-web-timeline, .page-web-text-media, .page-web-text-block, .page-web-text-block-v2, .page-web-article-text, .page-web-accordion, .page-web-spacer",
      );
    const hasEditorChromeInside = (el: Element) =>
      Boolean(
        el.querySelector(
          '.page-editor, [aria-label="Добавить блок"], .page-web-text-media-toolbar, .page-web-text-block-toolbar, .page-web-text-block-v2-toolbar, .page-web-article-text-toolbar, .page-web-accordion-toolbar, .page-web-spacer-toolbar, .oin, .oit, .oja, .ohx, .oie, .oir, .oia, .oif, .ohw, .oig',
        ),
      );
    const appendLegacyNode = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        if ((node.textContent || "").trim().length === 0) return;
        legacy.appendChild(node.cloneNode(true));
        return;
      }
      if (!(node instanceof Element)) return;
      // Никогда не переносим в контент служебную разметку самого редактора.
      if (
        node.matches(
          ".page-editor, .page-web-text-media-toolbar, .page-web-text-block-toolbar, .page-web-text-block-v2-toolbar, .page-web-article-text-toolbar, .page-web-accordion-toolbar, .page-web-spacer-toolbar, .oin, .oit, .oja, .ohx, .oie, .oir, .oia, .oif, .ohw, .oig",
        ) ||
        node.matches('[aria-label="Добавить блок"]') ||
        hasEditorChromeInside(node)
      ) {
        return;
      }
      if (isAllowedBlock(node)) return;
      if (
        node.matches(
          ".page-web-cover-toolbar, .page-web-carousel-toolbar, .page-web-timeline-toolbar, .page-web-text-media-toolbar, .page-web-text-block-toolbar, .page-web-text-block-v2-toolbar, .page-web-article-text-toolbar, .page-web-accordion-toolbar, .page-web-spacer-toolbar, .page-web-cover-delete, .page-web-carousel-arrow",
        )
      ) {
        return;
      }
      if (node.tagName.toLowerCase() === "br" && legacy.childNodes.length === 0) return;
      const clone = node.cloneNode(true) as Element;
      if ((clone.textContent || "").replace(/\u00A0/g, " ").trim().length === 0 && !clone.querySelector("img,video,iframe,table,ul,ol")) {
        return;
      }
      legacy.appendChild(clone);
    };

    for (const node of Array.from(wrap.childNodes)) {
      if (node instanceof Element && isAllowedBlock(node)) {
        blockHtml.push(node.outerHTML);
      } else {
        appendLegacyNode(node);
      }
    }

    const legacyHtml = legacy.innerHTML.trim();
    if (legacyHtml) {
      blockHtml.push(getTextMediaBlockHtml(legacyHtml));
    }
    return blockHtml.join("");
  } catch {
    return "";
  }
}

/** Логи каретки: префикс `[page-editor-caret]`. Выключить: `false`. Без пересборки: `localStorage.setItem('debugPageEditorCaret','0')`. */
const DEBUG_PAGE_EDITOR_CARET = true;
/** Логи синхронизации cover-стилей: `localStorage.setItem('debugPageCoverSync','1')`. */
const DEBUG_PAGE_COVER_SYNC = true;

function caretDebugOn(): boolean {
  if (!DEBUG_PAGE_EDITOR_CARET) return false;
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem("debugPageEditorCaret") !== "0";
  } catch {
    return true;
  }
}

function coverSyncDebugOn(): boolean {
  if (!DEBUG_PAGE_COVER_SYNC) return false;
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem("debugPageCoverSync") === "1";
  } catch {
    return false;
  }
}

function logEditorCoverSyncState(root: HTMLElement, phase: string) {
  if (!coverSyncDebugOn() || typeof window === "undefined") return;
  const covers = Array.from(root.querySelectorAll(".page-web-cover")) as HTMLElement[];
  const rootRect = root.getBoundingClientRect();
  console.log("[editor-cover-sync] snapshot", {
    phase,
    covers: covers.length,
    rootWidth: rootRect.width,
    rootHeight: rootRect.height,
  });
  covers.forEach((cover, index) => {
    const type = cover.getAttribute("data-cover-type") || "unknown";
    const directChildren = Array.from(cover.children) as HTMLElement[];
    const bg = directChildren.find((el) => el.classList.contains("page-web-cover-bg")) ?? null;
    const blue = bg?.querySelector(".page-web-cover-blob--blue") as HTMLElement | null;
    const red = bg?.querySelector(".page-web-cover-blob--red") as HTMLElement | null;
    const splitAfter = window.getComputedStyle(cover, "::after");
    console.log("[editor-cover-sync] cover", {
      index,
      type,
      hasBgWrap: !!bg,
      hasBlueBlob: !!blue,
      hasRedBlob: !!red,
      blueAnim: blue ? window.getComputedStyle(blue).animationName : "none",
      redAnim: red ? window.getComputedStyle(red).animationName : "none",
      splitAfterBgImage: splitAfter.backgroundImage,
      splitAfterWidth: splitAfter.width,
    });
  });
}

function describeNodeForCaretLog(n: Node | null): string {
  if (!n) return "null";
  if (n.nodeType === Node.TEXT_NODE) {
    const t = (n as Text).data;
    const preview = t.length > 60 ? `${t.slice(0, 60)}…` : t;
    return `#text(len=${t.length}) "${preview.replace(/\n/g, "\\n")}"`;
  }
  if (n.nodeType === Node.ELEMENT_NODE) {
    const el = n as Element;
    const tag = el.tagName.toLowerCase();
    const dc = el.getAttribute("data-editor-caret");
    const attrs = dc ? ` data-editor-caret="${dc}"` : "";
    return `<${tag}${attrs}>`;
  }
  return n.nodeName;
}

function pathFromEditorRoot(root: Element | null, n: Node | null): string {
  if (!n || !root) return "";
  const parts: string[] = [];
  let cur: Node | null = n;
  let depth = 0;
  while (cur && cur !== root && depth < 40) {
    if (cur.nodeType === Node.ELEMENT_NODE) {
      const el = cur as Element;
      const tag = el.tagName.toLowerCase();
      const dc = el.getAttribute("data-editor-caret");
      parts.unshift(dc ? `${tag}ⓒ` : tag);
    } else {
      parts.unshift(describeNodeForCaretLog(cur));
    }
    cur = cur.parentNode;
    depth += 1;
  }
  return parts.length ? parts.join(" ← ") : "(outside root)";
}

function logPageEditorCaret(phase: string, payload: Record<string, unknown>) {
  if (!caretDebugOn()) return;
  console.log(`[page-editor-caret] ${phase}`, payload);
}

function snapshotSelection(phase: string, root: HTMLElement | null) {
  if (!caretDebugOn()) return;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) {
    logPageEditorCaret(phase, { selection: "none", rangeCount: sel?.rangeCount ?? 0 });
    return;
  }
  const r = sel.getRangeAt(0);
  let rect: { top: number; left: number; width: number; height: number } | null = null;
  let clientRects = 0;
  try {
    clientRects = r.getClientRects().length;
    if (clientRects > 0) {
      const b = r.getBoundingClientRect();
      rect = { top: b.top, left: b.left, width: b.width, height: b.height };
    }
  } catch {
    rect = null;
  }
  const rootRect = root?.getBoundingClientRect();
  logPageEditorCaret(phase, {
    collapsed: r.collapsed,
    start: { node: describeNodeForCaretLog(r.startContainer), offset: r.startOffset, path: pathFromEditorRoot(root, r.startContainer) },
    end: { node: describeNodeForCaretLog(r.endContainer), offset: r.endOffset },
    focusNode: describeNodeForCaretLog(sel.focusNode),
    focusOffset: sel.focusOffset,
    rangeClientRects: clientRects,
    rangeBoundingRect: rect,
    rootBoundingRect: rootRect
      ? { top: rootRect.top, left: rootRect.left, width: rootRect.width, height: rootRect.height }
      : null,
    /** Положение курсора относительно верхнего левого угла редактора (видно «улет в паддинг») */
    caretRelativeToEditor:
      rect && rootRect ? { dTop: rect.top - rootRect.top, dLeft: rect.left - rootRect.left } : null,
    activeElement: document.activeElement?.nodeName ?? null,
    activeElementIsEditor: !!(root && document.activeElement === root),
  });
}

/** Логи скролла, фокуса и авто-высоты в редакторе. Включить: `localStorage.setItem('debugPageEditorLayout','1')`; выключить: `'0'`. */
const DEBUG_PAGE_EDITOR_LAYOUT = true;

function editorLayoutDebugOn(): boolean {
  if (!DEBUG_PAGE_EDITOR_LAYOUT) return false;
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem("debugPageEditorLayout") === "1";
  } catch {
    return false;
  }
}

function logPageEditorLayout(phase: string, payload: Record<string, unknown>) {
  if (!editorLayoutDebugOn()) return;
  console.log(`[page-editor-layout] ${phase}`, payload);
}

function summarizeLayoutElement(el: Element | null | undefined): string | null {
  if (!el) return null;
  const tag = el.tagName.toLowerCase();
  if (el instanceof HTMLTextAreaElement) {
    return `${tag}(scrollH=${el.scrollHeight},clientH=${el.clientHeight},valLen=${(el.value || "").length})`;
  }
  const id = el.id ? `#${el.id}` : "";
  const cn = (el as HTMLElement).className;
  const cls =
    typeof cn === "string"
      ? cn
          .trim()
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 10)
          .join(".")
      : "";
  return cls ? `<${tag}${id}.${cls}>` : `<${tag}${id}>`;
}

function layoutScrollSnapshot(scrollEl: HTMLElement | null, anchor: HTMLElement | null) {
  if (!scrollEl) {
    return {
      scrollTop: null as number | null,
      scrollLeft: null as number | null,
      clientHeight: null as number | null,
      scrollHeight: null as number | null,
      maxScrollTop: null as number | null,
      anchorTopInPort: null as number | null,
      anchorBottomInPort: null as number | null,
    };
  }
  const port = scrollEl.getBoundingClientRect();
  const ar =
    anchor && scrollEl.contains(anchor) ? anchor.getBoundingClientRect() : null;
  const maxScrollTop = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight);
  return {
    scrollTop: scrollEl.scrollTop,
    scrollLeft: scrollEl.scrollLeft,
    clientHeight: scrollEl.clientHeight,
    scrollHeight: scrollEl.scrollHeight,
    maxScrollTop,
    nearBottom: scrollEl.scrollTop >= maxScrollTop - 4,
    portTop: Math.round(port.top * 10) / 10,
    anchorTopInPort: ar != null ? Math.round((ar.top - port.top) * 10) / 10 : null,
    anchorBottomInPort: ar != null ? Math.round((ar.bottom - port.top) * 10) / 10 : null,
    active: summarizeLayoutElement(document.activeElement),
  };
}

/** Авто-высота полей только внутри одного web-блока: иначе при фокусе в «Стоимость» пересчитываются все textarea на странице, скачет вёрстка и withPreservedScrollPortAnchor тянет скролл к низу области. */
function resolveWebBlockAutosizeRoot(anchor: HTMLElement | null, ed: HTMLElement): HTMLElement {
  if (!anchor) return ed;
  const root =
    anchor.closest(".page-web-text-block") ??
    anchor.closest(".page-web-text-block-v2") ??
    anchor.closest(".page-web-article-text") ??
    anchor.closest(".page-web-accordion") ??
    anchor.closest(".page-web-cover") ??
    anchor.closest(".page-web-timeline") ??
    anchor.closest(".page-web-text-media") ??
    anchor.closest(".page-web-carousel");
  return (root as HTMLElement | null) ?? ed;
}

/** Поля карточек feature-grid: пересчёт всего блока при фокусе двигает соседние карточки и `withPreservedScrollPortAnchor` крутит скролл. */
function isFeatureGridCardTextarea(el: EventTarget | null): el is HTMLTextAreaElement {
  return el instanceof HTMLTextAreaElement && !!el.closest(".page-web-feature-grid-item");
}

export default function PageEditorDetailsPage() {
  const params = useParams<{ id?: string | string[] }>();
  const pageId = useMemo(() => adminPageIdFromParams(params ?? null), [params]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** 404 на GET /api/pages/:id — в БД нет записи с таким id (часто открыли /page_editor/1 на пустой БД). */
  const [pageMissingInDb, setPageMissingInDb] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  const hasWebBlocksInCanvas = useMemo(
    () =>
      /page-web-(?:cover|carousel|timeline|text-media|text-block|text-block-v2|article-text|accordion|spacer)\b/.test(
        contentHtml,
      ),
    [contentHtml],
  );

  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [alignment, setAlignment] = useState<WebElementsTextAlign>("left");
  const [hyphensEnabled, setHyphensEnabled] = useState(false);
  const [hyphensApplicable, setHyphensApplicable] = useState(false);
  const [isUnorderedList, setIsUnorderedList] = useState(false);
  const [isOrderedList, setIsOrderedList] = useState(false);
  const [listStyleType, setListStyleType] = useState<string>("");
  const [listStyleOpen, setListStyleOpen] = useState(false);
  const [listColor, setListColor] = useState<string>("");
  const [listColorOpen, setListColorOpen] = useState(false);
  const [listStart, setListStart] = useState<number>(1);
  const [tableOpen, setTableOpen] = useState(false);
  const [addElementDialogOpen, setAddElementDialogOpen] = useState(false);
  const [addElementDialogTab, setAddElementDialogTab] = useState<"media" | "text" | "decor">("media");
  const [tableHover, setTableHover] = useState<{ rows: number; cols: number } | null>(null);
  const [isInTable, setIsInTable] = useState(false);
  const [tableBorderStyle, setTableBorderStyle] = useState<string>("solid");
  const [tableBorderColor, setTableBorderColor] = useState<string>("#e2e8f0");
  const [tableBorderWidth, setTableBorderWidth] = useState<string>("1");
  const [tableBorderOpen, setTableBorderOpen] = useState(false);
  const [tableBorderColorOpen, setTableBorderColorOpen] = useState(false);
  const [tableBorderWidthOpen, setTableBorderWidthOpen] = useState(false);
  const [tableWidth, setTableWidth] = useState<string>("auto");
  const [tableRowHeight, setTableRowHeight] = useState<string>("auto");
  const [tableWidthModalOpen, setTableWidthModalOpen] = useState(false);
  const [tableWidthModalValue, setTableWidthModalValue] = useState("");
  const [coverButtonLinkModalOpen, setCoverButtonLinkModalOpen] = useState(false);
  const [coverButtonLinkModalLabelValue, setCoverButtonLinkModalLabelValue] = useState("");
  const [coverButtonLinkModalValue, setCoverButtonLinkModalValue] = useState("");
  const [ctaLinkModalDocuments, setCtaLinkModalDocuments] = useState<SiteDocumentItem[]>([]);
  const [ctaLinkModalDocumentsLoading, setCtaLinkModalDocumentsLoading] = useState(false);
  const [featureGridIconPickerOpen, setFeatureGridIconPickerOpen] = useState(false);
  const [featureGridIconPickerValue, setFeatureGridIconPickerValue] = useState<FeatureGridIconPreset["id"]>("bolt");
  const [tableWidthSubmenuOpen, setTableWidthSubmenuOpen] = useState(false);
  const [tableRowHeightSubmenuOpen, setTableRowHeightSubmenuOpen] = useState(false);
  const [tableVerticalAlign, setTableVerticalAlign] = useState<"top" | "middle" | "bottom">("middle");
  /** Каретка в зоне текста обложки (не в таблице) — вертикальное выравнивание блока контента относительно всего баннера. */
  const [isInWebCoverContent, setIsInWebCoverContent] = useState(false);
  const [coverVerticalAlign, setCoverVerticalAlign] = useState<"top" | "middle" | "bottom">("top");
  const [tableRowHeightModalOpen, setTableRowHeightModalOpen] = useState(false);
  const [tableRowHeightModalValue, setTableRowHeightModalValue] = useState("");
  const [cellMenuOpen, setCellMenuOpen] = useState(false);
  const [cellMenuAnchor, setCellMenuAnchor] = useState<"left" | "top">("left");
  const [cellMenuRect, setCellMenuRect] = useState<{ top: number; left: number; height: number } | null>(null);
  const [cellMenuViewport, setCellMenuViewport] = useState<{
    top: number;
    left: number;
    topBtn: { top: number; left: number };
    openUp?: boolean;
    selectionBadge?: { top: number; right: number };
  } | null>(null);
  const [fontSize, setFontSize] = useState("");
  const [fontSizeOpen, setFontSizeOpen] = useState(false);
  const [fontColor, setFontColor] = useState<string>("#000000");
  const [fontColorOpen, setFontColorOpen] = useState(false);

  const editorRef = useRef<HTMLDivElement | null>(null);
  const inputSyncTimerRef = useRef<number | null>(null);
  const pendingInputHtmlRef = useRef<string | null>(null);
  const fontSizeDropdownRef = useRef<HTMLDivElement | null>(null);
  const fontColorDropdownRef = useRef<HTMLDivElement | null>(null);
  const listStyleDropdownRef = useRef<HTMLDivElement | null>(null);
  const listStyleButtonMousedownRef = useRef(false);
  const tableDropdownRef = useRef<HTMLDivElement | null>(null);
  const tableBorderDropdownRef = useRef<HTMLDivElement | null>(null);
  const tableWidthModalInputRef = useRef<HTMLInputElement | null>(null);
  const coverButtonLinkModalLabelInputRef = useRef<HTMLInputElement | null>(null);
  const coverButtonLinkModalInputRef = useRef<HTMLInputElement | null>(null);
  const tableRowHeightModalInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  /** Обложка + карусель: один file input вне contentEditable (см. WebShellImageUploadPending). */
  const webShellImageInputRef = useRef<HTMLInputElement | null>(null);
  const webShellImageUploadPendingRef = useRef<WebShellImageUploadPending | null>(null);
  /** После add/remove слайда пересчитывается ширина колонки — без выравнивания scrollLeft «плывёт» и виден кусок соседнего слайда. */
  const webCarouselScrollAlignPendingRef = useRef(false);
  const coverBgAdjustingRef = useRef(false);
  const [coverBgAdjustSession, setCoverBgAdjustSession] = useState<CoverBgAdjustSessionState | null>(null);
  const [carouselPreviewSession, setCarouselPreviewSession] = useState<CarouselPreviewSessionState | null>(null);
  const imageResizeRef = useRef<{
    img: HTMLImageElement;
    wrapper: HTMLElement;
    handle: string;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
    aspectRatio: number;
  } | null>(null);
  const selectedImageWrapperRef = useRef<HTMLElement | null>(null);
  /** Ряд CTA v2: фокус снимается при mousedown на тулбаре, но выравнивание должно знать цель до click. */
  const selectedWebElementsActionsRef = useRef<HTMLElement | null>(null);
  const cellMenuRef = useRef<HTMLDivElement | null>(null);
  const preserveTableSelectionRef = useRef(false);
  const editorScrollRef = useRef<HTMLDivElement | null>(null);
  /** Автовысота textarea меняет layout; без этого скролл-обёртка «подкручивается» (scroll anchoring + фокус). */
  const withPreservedEditorScroll = useCallback((run: () => void) => {
    const scrollEl = editorScrollRef.current;
    if (!scrollEl) {
      run();
      return;
    }
    const top = scrollEl.scrollTop;
    const left = scrollEl.scrollLeft;
    run();
    scrollEl.scrollTop = top;
    scrollEl.scrollLeft = left;
    requestAnimationFrame(() => {
      if (editorScrollRef.current !== scrollEl) return;
      scrollEl.scrollTop = top;
      scrollEl.scrollLeft = left;
    });
  }, []);

  /**
   * После смены фокуса фиксированный scrollTop из `withPreservedEditorScroll` часто даёт скачок вверх: вёрстка
   * меняется (autosize), а старый scrollTop уже не соответствует. Держим положение якоря относительно верха
   * видимой области скролла.
   */
  const withPreservedScrollPortAnchor = useCallback(
    (anchor: HTMLElement | null, run: () => void, reason = "unspecified") => {
      const scrollEl = editorScrollRef.current;
      if (!scrollEl) {
        if (editorLayoutDebugOn()) {
          logPageEditorLayout(`scrollPortAnchor:noScrollEl:${reason}`, { anchor: summarizeLayoutElement(anchor) });
        }
        run();
        return;
      }
      if (!anchor || !scrollEl.contains(anchor)) {
        if (editorLayoutDebugOn()) {
          logPageEditorLayout(`scrollPortAnchor:noAnchor:${reason}`, {
            anchor: summarizeLayoutElement(anchor),
            anchorInScroll: !!(anchor && scrollEl.contains(anchor)),
            ...layoutScrollSnapshot(scrollEl, anchor),
          });
        }
        run();
        return;
      }
      const portTop = scrollEl.getBoundingClientRect().top;
      const anchorVsPortTop = () => anchor.getBoundingClientRect().top - portTop;
      const before = anchorVsPortTop();
      if (editorLayoutDebugOn()) {
        logPageEditorLayout(`scrollPortAnchor:beforeRun:${reason}`, {
          beforeAnchorVsPortTop: Math.round(before * 10) / 10,
          ...layoutScrollSnapshot(scrollEl, anchor),
        });
      }
      run();
      let d = before - anchorVsPortTop();
      if (d !== 0) scrollEl.scrollTop += d;
      if (editorLayoutDebugOn()) {
        logPageEditorLayout(`scrollPortAnchor:afterSync:${reason}`, {
          d: Math.round(d * 10) / 10,
          scrollTopAfter: scrollEl.scrollTop,
          anchorVsPortTop: Math.round(anchorVsPortTop() * 10) / 10,
          ...layoutScrollSnapshot(scrollEl, anchor),
        });
      }
      requestAnimationFrame(() => {
        if (editorScrollRef.current !== scrollEl || !scrollEl.contains(anchor)) return;
        d = before - anchorVsPortTop();
        if (d !== 0) scrollEl.scrollTop += d;
        if (editorLayoutDebugOn()) {
          logPageEditorLayout(`scrollPortAnchor:afterRaf:${reason}`, {
            d: Math.round(d * 10) / 10,
            scrollTopAfter: scrollEl.scrollTop,
            anchorVsPortTop: Math.round(anchorVsPortTop() * 10) / 10,
            ...layoutScrollSnapshot(scrollEl, anchor),
          });
        }
      });
    },
    [],
  );
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const editorWrapperRef = useRef<HTMLDivElement | null>(null);
  const selectedCellRef = useRef<HTMLTableCellElement | null>(null);
  const [selectedCellRange, setSelectedCellRange] = useState<{ rows: number; cols: number }>({ rows: 1, cols: 1 });
  const cellDragStartRef = useRef<{ cell: HTMLTableCellElement; table: HTMLTableElement } | null>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const insertWebAfterBlockRef = useRef<HTMLElement | null>(null);
  const coverButtonLinkTargetRef = useRef<HTMLElement | null>(null);
  const featureGridIconPickerTargetRef = useRef<HTMLElement | null>(null);
  const commandRangeRef = useRef<Range | null>(null);
  /** After setContentHtml, selection is restored in the contentHtml effect using this marker id. */
  const pendingEditorCaretRef = useRef<string | null>(null);
  /** Native capture listeners need the latest cover/backspace logic (React synthetic events can be too late on WebKit). */
  const webCoverNativeInputRef = useRef<{
    beforeInput: (e: InputEvent) => void;
    keyDown: (e: KeyboardEvent) => void;
  }>({
    beforeInput: () => {},
    keyDown: () => {},
  });

  /** Collapsed range at the start of a list item (shared by Enter handler + layout effect). */
  const placeCaretAtLiStart = useCallback((target: HTMLElement, source = "unknown") => {
    const ed = editorRef.current;
    const first = target.firstChild;
    let branch: "textNode0" | "setStartBeforeFirst" | "emptyLiOffset0" = "emptyLiOffset0";
    if (first?.nodeType === Node.TEXT_NODE) branch = "textNode0";
    else if (first) branch = "setStartBeforeFirst";

    if (caretDebugOn()) {
      logPageEditorCaret("placeCaretAtLiStart:before", {
        source,
        targetPreview: target.outerHTML?.slice(0, 200),
        branch,
        firstChild: describeNodeForCaretLog(first),
        editorExists: !!ed,
      });
      snapshotSelection("placeCaretAtLiStart:selection-before", ed);
    }

    if (!ed) return;
    const sel = window.getSelection();
    if (!sel) return;
    const r = document.createRange();
    if (first?.nodeType === Node.TEXT_NODE) {
      r.setStart(first, 0);
    } else if (first) {
      r.setStartBefore(first);
    } else {
      r.setStart(target, 0);
    }
    r.collapse(true);
    sel.removeAllRanges();
    try {
      sel.addRange(r);
    } catch (err) {
      logPageEditorCaret("placeCaretAtLiStart:addRange-FAILED", { source, err: String(err) });
      return;
    }
    savedRangeRef.current = r.cloneRange();
    ed.focus({ preventScroll: true });

    if (caretDebugOn()) {
      logPageEditorCaret("placeCaretAtLiStart:range-applied", {
        source,
        branch,
        rangeStart: { node: describeNodeForCaretLog(r.startContainer), offset: r.startOffset },
      });
      snapshotSelection("placeCaretAtLiStart:selection-after", ed);
    }
  }, []);

  const clearTableSelection = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    el.querySelectorAll(".page-editor-table td[data-cell-selected]").forEach((td) =>
      td.removeAttribute("data-cell-selected")
    );
    setCellMenuRect(null);
    setCellMenuViewport(null);
    setSelectedCellRange({ rows: 1, cols: 1 });
    selectedCellRef.current = null;
  }, []);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      const toggleBtn = listStyleDropdownRef.current?.querySelector('button[aria-label="Стиль маркера"]');
      listStyleButtonMousedownRef.current = !!(toggleBtn?.contains(target));
    };
    document.addEventListener("mousedown", handleMouseDown, true);
    return () => document.removeEventListener("mousedown", handleMouseDown, true);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (fontSizeOpen && fontSizeDropdownRef.current && !fontSizeDropdownRef.current.contains(target)) {
        setFontSizeOpen(false);
      }
      if (fontColorOpen && fontColorDropdownRef.current && !fontColorDropdownRef.current.contains(target)) {
        setFontColorOpen(false);
      }
      if (listStyleOpen && listStyleDropdownRef.current && !listStyleDropdownRef.current.contains(target)) {
        setListStyleOpen(false);
        setListColorOpen(false);
      }
      if (tableOpen && tableDropdownRef.current && !tableDropdownRef.current.contains(target)) {
        setTableOpen(false);
      }
      if (tableBorderOpen && tableBorderDropdownRef.current && !tableBorderDropdownRef.current.contains(target)) {
        setTableBorderOpen(false);
        setTableBorderColorOpen(false);
        setTableBorderWidthOpen(false);
      }
      if (cellMenuOpen && cellMenuRef.current && !cellMenuRef.current.contains(target)) {
        setCellMenuOpen(false);
        setTableWidthSubmenuOpen(false);
        setTableRowHeightSubmenuOpen(false);
      }
    };
    const cellMenuHandler = (e: MouseEvent) => {
      const target = e.target as Node;
      const inCellMenu = cellMenuRef.current?.contains(target);
      const inToolbar = toolbarRef.current?.contains(target);
      const el = editorRef.current;
      const eventPath =
        typeof e.composedPath === "function" ? e.composedPath() : [];
      const inCoverToolbarFromPath = eventPath.some((node) => {
        if (!(node instanceof Element)) return false;
        return !!node.closest?.(".page-web-cover-toolbar");
      });
      const targetEl =
        target instanceof Element ? target : (target.parentElement as Element | null);
      const inCoverToolbar = inCoverToolbarFromPath || !!targetEl?.closest?.(".page-web-cover-toolbar");
      if (el && !inCoverToolbar) {
        el.querySelectorAll(".page-web-cover-toolbar").forEach((node) => {
          closeCoverToolbarMenus(node as HTMLElement);
        });
      }
      const inTextMediaToolbar = eventPath.some((node) => {
        if (!(node instanceof Element)) return false;
        return !!node.closest?.(".page-web-text-media-toolbar");
      }) || !!targetEl?.closest?.(".page-web-text-media-toolbar");
      if (el && !inTextMediaToolbar) {
        el.querySelectorAll(".page-web-text-media-toolbar").forEach((node) => {
          closeTextMediaToolbarMenus(node as HTMLElement);
        });
      }
      const inTextBlockToolbar = eventPath.some((node) => {
        if (!(node instanceof Element)) return false;
        return !!node.closest?.(".page-web-text-block-toolbar");
      }) || !!targetEl?.closest?.(".page-web-text-block-toolbar");
      if (el && !inTextBlockToolbar) {
        el.querySelectorAll(".page-web-text-block-toolbar").forEach((node) => {
          closeTextBlockToolbarMenus(node as HTMLElement);
        });
      }
      const inTextBlockV2Toolbar = eventPath.some((node) => {
        if (!(node instanceof Element)) return false;
        return !!node.closest?.(".page-web-text-block-v2-toolbar");
      }) || !!targetEl?.closest?.(".page-web-text-block-v2-toolbar");
      if (el && !inTextBlockV2Toolbar) {
        el.querySelectorAll(".page-web-text-block-v2-toolbar").forEach((node) => {
          closeTextBlockV2ToolbarMenus(node as HTMLElement);
        });
      }
      const inArticleTextToolbar = eventPath.some((node) => {
        if (!(node instanceof Element)) return false;
        return !!node.closest?.(".page-web-article-text-toolbar");
      }) || !!targetEl?.closest?.(".page-web-article-text-toolbar");
      if (el && !inArticleTextToolbar) {
        el.querySelectorAll(".page-web-article-text-toolbar").forEach((node) => {
          closeArticleTextToolbarMenus(node as HTMLElement);
        });
      }
      const inAccordionToolbar = eventPath.some((node) => {
        if (!(node instanceof Element)) return false;
        return !!node.closest?.(".page-web-accordion-toolbar");
      }) || !!targetEl?.closest?.(".page-web-accordion-toolbar");
      if (el && !inAccordionToolbar) {
        el.querySelectorAll(".page-web-accordion-toolbar").forEach((node) => {
          closeAccordionToolbarMenus(node as HTMLElement);
        });
      }
      const inSpacerToolbar = eventPath.some((node) => {
        if (!(node instanceof Element)) return false;
        return !!node.closest?.(".page-web-spacer-toolbar");
      }) || !!targetEl?.closest?.(".page-web-spacer-toolbar");
      if (el && !inSpacerToolbar) {
        el.querySelectorAll(".page-web-spacer-toolbar").forEach((node) => {
          closeSpacerToolbarMenus(node as HTMLElement);
        });
      }
      const editingCell = (target as Element)?.closest?.("table.page-editor-table td[data-cell-editing]");
      if (!editingCell && !inToolbar && !inCellMenu && el) {
        let hadEditing = false;
        el.querySelectorAll(".page-editor-table td[data-cell-editing]").forEach((td) => {
          const cell = td as HTMLElement;
          cell.removeAttribute("data-cell-editing");
          cell.setAttribute("contenteditable", "false");
          hadEditing = true;
        });
        if (hadEditing) {
          setContentHtml(el.innerHTML);
        }
      }
      if (inToolbar || inCellMenu) {
        preserveTableSelectionRef.current = true;
        const clearPreserve = () => {
          setTimeout(() => {
            preserveTableSelectionRef.current = false;
          }, 0);
        };
        document.addEventListener("mouseup", clearPreserve, { once: true });
        document.addEventListener("click", clearPreserve, { once: true });
      }
      if (cellMenuOpen && cellMenuRef.current && !cellMenuRef.current.contains(target)) {
        setCellMenuOpen(false);
        setTableWidthSubmenuOpen(false);
        setTableRowHeightSubmenuOpen(false);
      }
      const inTableCell = (target as Element)?.closest?.("table.page-editor-table td");
      if (!inTableCell && !inCellMenu && !inToolbar && editorRef.current) {
        const hasSelection = editorRef.current.querySelector(".page-editor-table td[data-cell-selected]");
        if (hasSelection) {
          clearTableSelection();
        }
      }
    };
    document.addEventListener("click", handler);
    document.addEventListener("mousedown", cellMenuHandler);
    return () => {
      document.removeEventListener("click", handler);
      document.removeEventListener("mousedown", cellMenuHandler);
    };
  }, [fontSizeOpen, fontColorOpen, listStyleOpen, tableOpen, tableBorderOpen, cellMenuOpen, clearTableSelection]);

  useEffect(() => {
    function setSelectedImageWrapper(next: HTMLElement | null) {
      if (selectedImageWrapperRef.current && selectedImageWrapperRef.current !== next) {
        selectedImageWrapperRef.current.removeAttribute("data-image-selected");
      }
      if (next) next.setAttribute("data-image-selected", "true");
      selectedImageWrapperRef.current = next;
    }

    function handleImageResizeMove(e: MouseEvent) {
      const state = imageResizeRef.current;
      if (!state) return;
      e.preventDefault();
      const dx = e.clientX - state.startX;
      const dy = e.clientY - state.startY;
      const { handle } = state;
      let newWidth = state.startWidth;
      let newHeight = state.startHeight;
      let offsetX = 0;
      let offsetY = 0;
      if (handle.includes("e")) newWidth = state.startWidth + dx;
      if (handle.includes("w")) {
        newWidth = state.startWidth - dx;
        offsetX = -dx;
      }
      if (handle.includes("s")) newHeight = state.startHeight + dy;
      if (handle.includes("n")) {
        newHeight = state.startHeight - dy;
        offsetY = -dy;
      }
      newWidth = Math.max(50, newWidth);
      newHeight = Math.max(30, newHeight);
      if (e.shiftKey) {
        const scale = Math.min(newWidth / state.startWidth, newHeight / state.startHeight);
        newWidth = state.startWidth * scale;
        newHeight = state.startHeight * scale;
        if (handle.includes("w")) offsetX = state.startWidth - newWidth;
        if (handle.includes("n")) offsetY = state.startHeight - newHeight;
      }
      if (offsetX < 0) offsetX = 0;
      if (offsetY < 0) offsetY = 0;
      state.img.style.width = `${newWidth}px`;
      state.img.style.height = `${newHeight}px`;
      state.img.style.maxWidth = state.img.closest("td") ? "100%" : "none";
      state.wrapper.style.marginLeft = offsetX ? `-${offsetX}px` : "";
      state.wrapper.style.marginTop = offsetY ? `-${offsetY}px` : "";
    }
    function handleImageResizeUp() {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      const state = imageResizeRef.current;
      if (state) {
        const img = state.img;
        const w = parseFloat(img.style.width) || state.startWidth;
        const h = parseFloat(img.style.height) || state.startHeight;
        const ml = state.wrapper.style.marginLeft;
        const mt = state.wrapper.style.marginTop;
        img.style.width = `${Math.max(50, Math.round(w))}px`;
        img.style.height = `${Math.max(30, Math.round(h))}px`;
        img.style.maxWidth = img.closest("td") ? "100%" : "none";
        state.wrapper.style.marginLeft = ml;
        state.wrapper.style.marginTop = mt;
        const el = editorRef.current;
        if (el) setContentHtml(el.innerHTML);
        imageResizeRef.current = null;
      }
      document.removeEventListener("mousemove", handleImageResizeMove);
      document.removeEventListener("mouseup", handleImageResizeUp);
    }
    function handleImageResizeDown(e: MouseEvent) {
      const target = (e.target as Element)?.closest?.(".page-editor-image-resize");
      if (!target) return;
      const handle = (target as HTMLElement).getAttribute("data-resize");
      if (!handle) return;
      const wrapper = target.closest(".page-editor-image-wrapper") as HTMLElement | null;
      const img = wrapper?.querySelector(".page-editor-image") as HTMLImageElement | null;
      if (!img || !wrapper) return;
      setSelectedImageWrapper(wrapper);
      e.preventDefault();
      e.stopPropagation();
      wrapper.style.marginLeft = "";
      wrapper.style.marginTop = "";
      const rect = img.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      imageResizeRef.current = {
        img,
        wrapper,
        handle,
        startX: e.clientX,
        startY: e.clientY,
        startWidth: w,
        startHeight: h,
        aspectRatio: w / h,
      };
      const cursorMap: Record<string, string> = { n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize", ne: "nesw-resize", nw: "nwse-resize", se: "nwse-resize", sw: "nesw-resize" };
      document.body.style.cursor = cursorMap[handle] || "nwse-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", handleImageResizeMove);
      document.addEventListener("mouseup", handleImageResizeUp);
    }
    function handleImageWrapperDown(e: MouseEvent) {
      const target = e.target as Element;
      const wrapper = target?.closest?.(".page-editor-image-wrapper") as HTMLElement | null;
      if (wrapper) {
        setSelectedImageWrapper(wrapper);
      } else if (!target?.closest?.(".page-editor-image-resize")) {
        setSelectedImageWrapper(null);
      }
    }
    const wrapper = editorWrapperRef.current;
    if (!wrapper) return;
    wrapper.addEventListener("mousedown", handleImageResizeDown);
    wrapper.addEventListener("mousedown", handleImageWrapperDown);
    return () => {
      wrapper.removeEventListener("mousedown", handleImageResizeDown);
      wrapper.removeEventListener("mousedown", handleImageWrapperDown);
      document.removeEventListener("mousemove", handleImageResizeMove);
      document.removeEventListener("mouseup", handleImageResizeUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setSelectedImageWrapper(null);
    };
  }, []);

  function clearPageEditorFocusTargets(root: HTMLElement) {
    root.querySelectorAll(`[${PAGE_EDITOR_FOCUS_TARGET_ATTR}]`).forEach((n) =>
      n.removeAttribute(PAGE_EDITOR_FOCUS_TARGET_ATTR),
    );
  }

  /** Подсветка текущего редактируемого узла: один атрибут и один набор правил в `<style>` (см. переменные `--page-editor-focus-*` на `.page-editor`). */
  function syncPageEditorFocusTarget(ed: HTMLElement, range: Range | null) {
    clearPageEditorFocusTargets(ed);
    let node: Node | null = null;
    if (range) {
      node = range.startContainer;
      if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    }
    if (!node || !(node instanceof Element)) {
      const active = (typeof document !== "undefined" ? document.activeElement : null) as Element | null;
      if (active && ed.contains(active)) node = active;
    }
    if (!node || !(node instanceof Element)) return;

    const mark = (el: HTMLElement) => {
      el.setAttribute(PAGE_EDITOR_FOCUS_TARGET_ATTR, "1");
    };

    // Заголовок баннера: textarea не живёт в .page-web-text-block*, а общая ветка для v2 полей его не помечает;
    // плюс inner может быть ещё без data-cover-unlocked — без этой ветки подсветка фокуса пропадает.
    const coverInnerLoose = node.closest(".page-web-cover-inner") as HTMLElement | null;
    if (coverInnerLoose && ed.contains(coverInnerLoose)) {
      const coverTitleIsland = coverInnerLoose.querySelector(
        ":scope > .page-web-elements.page-web-elements-title",
      ) as HTMLElement | null;
      if (
        node instanceof HTMLTextAreaElement &&
        node.classList.contains("page-web-elements-title-input") &&
        coverTitleIsland &&
        coverTitleIsland.contains(node)
      ) {
        mark(node);
        return;
      }
      const descInputLoose = node.closest(".page-web-elements-description-input") as HTMLTextAreaElement | null;
      if (
        descInputLoose &&
        coverInnerLoose.contains(descInputLoose) &&
        !node.closest("table.page-editor-table")
      ) {
        const descWrap = descInputLoose.closest(".page-web-elements.page-web-elements-description") as HTMLElement | null;
        if (descWrap && descWrap.parentElement === coverInnerLoose) {
          mark(descInputLoose);
          return;
        }
      }
      const annInputLoose = node.closest(".page-web-elements-announcement-input") as HTMLElement | null;
      if (
        annInputLoose &&
        coverInnerLoose.contains(annInputLoose) &&
        !node.closest("table.page-editor-table")
      ) {
        const annWrap = annInputLoose.closest(".page-web-elements.page-web-elements-announcement") as HTMLElement | null;
        if (annWrap && annWrap.parentElement === coverInnerLoose) {
          mark(annInputLoose);
          return;
        }
      }
      const actionsLoose = coverInnerLoose.querySelector(":scope > .page-web-elements-actions") as HTMLElement | null;
      if (actionsLoose && actionsLoose.contains(node) && !node.closest("table.page-editor-table")) {
        const lmLoose = node.closest(".page-web-cover-el-learn-more") as HTMLElement | null;
        if (lmLoose && actionsLoose.contains(lmLoose)) {
          mark(lmLoose);
          return;
        }
        const clusterLoose = actionsLoose.querySelector(
          ":scope > .page-web-elements-actions-cluster",
        ) as HTMLElement | null;
        if (clusterLoose) {
          mark(clusterLoose);
          return;
        }
      }
    }

    const coverInner = node.closest(".page-web-cover-inner[data-cover-unlocked='1']") as HTMLElement | null;
    if (coverInner && ed.contains(coverInner)) {
      let coverTitleTa: HTMLTextAreaElement | null = null;
      if (node instanceof HTMLTextAreaElement && node.classList.contains("page-web-elements-title-input")) {
        const titleIsland = coverInner.querySelector(":scope > .page-web-elements.page-web-elements-title");
        if (titleIsland?.contains(node)) coverTitleTa = node;
      }
      if (coverTitleTa) {
        mark(coverTitleTa);
        return;
      }
      const coverDescTa =
        node instanceof HTMLTextAreaElement && node.classList.contains("page-web-elements-description-input")
          ? node
          : (node.closest("textarea.page-web-elements-description-input") as HTMLTextAreaElement | null);
      const coverDescWrap = coverDescTa?.closest(
        ".page-web-elements.page-web-elements-description",
      ) as HTMLElement | null;
      if (
        coverDescTa &&
        coverDescWrap &&
        coverInner.contains(coverDescTa) &&
        coverDescWrap.parentElement === coverInner
      ) {
        mark(coverDescTa);
        return;
      }
      const coverAnnInput =
        node instanceof HTMLElement && node.classList.contains("page-web-elements-announcement-input")
          ? node
          : (node.closest(".page-web-elements-announcement-input") as HTMLElement | null);
      const coverAnnWrap = coverAnnInput?.closest(
        ".page-web-elements.page-web-elements-announcement",
      ) as HTMLElement | null;
      if (coverAnnInput && coverAnnWrap && coverInner.contains(coverAnnInput) && coverAnnWrap.parentElement === coverInner) {
        mark(coverAnnInput);
        return;
      }
      const actionsDirect = coverInner.querySelector(":scope > .page-web-elements-actions") as HTMLElement | null;
      if (actionsDirect && actionsDirect.contains(node)) {
        const lm = node.closest(".page-web-cover-el-learn-more") as HTMLElement | null;
        if (lm && actionsDirect.contains(lm)) {
          mark(lm);
          return;
        }
        const cluster = actionsDirect.querySelector(
          ":scope > .page-web-elements-actions-cluster",
        ) as HTMLElement | null;
        if (cluster) {
          mark(cluster);
          return;
        }
      }
      const target =
        (node.closest(
          ".page-web-elements.page-web-elements-title, .page-web-elements.page-web-elements-announcement, .page-web-elements.page-web-elements-description, .page-web-cover-el-subtitle, .page-web-cover-el-button-wrap, .page-web-cover-el-announcement-wrap, .page-web-elements-actions-cluster",
        ) as HTMLElement | null) ??
        (node.closest(
          ".page-web-cover-el-learn-more, .page-web-cover-el-announcement-learn-more, .page-web-elements-announcement-learn-more",
        ) as HTMLElement | null);
      if (target && coverInner.contains(target)) mark(target);
      return;
    }

    const timeline = node.closest(".page-web-timeline") as HTMLElement | null;
    if (timeline && ed.contains(timeline)) {
      if (
        node instanceof HTMLTextAreaElement &&
        (node.matches(".page-web-elements-subtitle-input") ||
          node.matches(".page-web-elements-title-input") ||
          node.matches(".page-web-elements-description-input"))
      ) {
        const head = node.closest(".page-web-timeline-head");
        if (head && timeline.contains(head)) {
          mark(node);
          return;
        }
      }
      if (node instanceof HTMLTextAreaElement && node.matches(".page-web-elements-subtitle-input")) {
        const termIsland = node.closest(
          ".page-web-elements.page-web-elements-subtitle.page-web-timeline-term",
        ) as HTMLElement | null;
        const parentItem = termIsland?.parentElement;
        if (
          termIsland &&
          parentItem?.classList.contains("page-web-timeline-item") &&
          timeline.contains(termIsland)
        ) {
          mark(node);
          return;
        }
      }
      if (node instanceof HTMLTextAreaElement && node.matches(".page-web-elements-description-input")) {
        const descWrap = node.closest(
          ".page-web-elements.page-web-elements-description.page-web-timeline-text",
        ) as HTMLElement | null;
        if (descWrap && descWrap.closest(".page-web-timeline-content") && timeline.contains(descWrap)) {
          mark(node);
          return;
        }
      }
      if (node instanceof HTMLTextAreaElement && node.matches(".page-web-elements-title2-input")) {
        const stepContent = node.closest(".page-web-timeline-content");
        if (stepContent && timeline.contains(stepContent)) {
          mark(node);
          return;
        }
      }
      const target = node.closest(
        ".page-web-timeline-subtitle, .page-web-timeline-heading, .page-web-timeline-description, .page-web-timeline-term, .page-web-timeline-text",
      ) as HTMLElement | null;
      if (target && timeline.contains(target)) mark(target);
      return;
    }

    const ctaWrap = node.closest(".page-web-elements-cta-wrap") as HTMLElement | null;
    if (ctaWrap && ed.contains(ctaWrap) && ctaWrap.contains(node)) {
      const actionsRow = ctaWrap.closest(".page-web-elements-actions") as HTMLElement | null;
      const clusterFromRow = actionsRow?.querySelector(
        ":scope > .page-web-elements-actions-cluster",
      ) as HTMLElement | null;
      if (clusterFromRow && clusterFromRow.contains(ctaWrap)) {
        mark(clusterFromRow);
        return;
      }
      const inner =
        (ctaWrap.querySelector(":scope > a.page-web-elements-cta-button") as HTMLElement | null) ??
        (ctaWrap.querySelector(":scope > a.page-web-elements-cta-button-secondary") as HTMLElement | null) ??
        (ctaWrap.querySelector(":scope > span.page-web-elements-cta-button") as HTMLElement | null) ??
        (ctaWrap.querySelector(":scope > span.page-web-elements-cta-button-secondary") as HTMLElement | null);
      if (inner) {
        mark(inner);
        return;
      }
    }

    const workPricingRoot = node.closest(".page-web-work-pricing") as HTMLElement | null;
    if (workPricingRoot && ed.contains(workPricingRoot)) {
      const ta = node.closest(
        ".page-web-work-pricing textarea.page-web-elements-title-input, .page-web-work-pricing textarea.page-web-elements-title2-input, .page-web-work-pricing textarea.page-web-elements-subtitle-input, .page-web-work-pricing textarea.page-web-elements-description-input",
      ) as HTMLTextAreaElement | null;
      if (ta && workPricingRoot.contains(ta)) {
        mark(ta);
        return;
      }
      const target = node.closest(WORK_PRICING_EDITABLE_LEAF_SELECTOR) as HTMLElement | null;
      if (target && workPricingRoot.contains(target)) mark(target);
      return;
    }

    if (
      node instanceof Element &&
      (node.matches(".page-web-text-block-subtitle-input") ||
        node.matches(".page-web-text-block-title-input") ||
        node.matches(".page-web-text-block-lead-input"))
    ) {
      const shell = node.closest(".page-web-text-block") as HTMLElement | null;
      if (shell && ed.contains(shell)) mark(node as HTMLElement);
      return;
    }

    if (
      node instanceof Element &&
      (node.matches(".page-web-elements-announcement-input") ||
        node.matches(".page-web-elements-title-input") ||
        node.matches(".page-web-elements-title2-input") ||
        node.matches(".page-web-elements-subtitle-input") ||
        node.matches(".page-web-elements-description-input") ||
        node.matches(".page-web-accordion-question-input") ||
        node.matches(".page-web-accordion-answer-input"))
    ) {
      const shell =
        (node.closest(".page-web-text-block-v2") as HTMLElement | null) ??
        (node.closest(".page-web-article-text") as HTMLElement | null) ??
        (node.closest(".page-web-accordion") as HTMLElement | null) ??
        (node.closest(".page-web-text-block") as HTMLElement | null) ??
        (node.closest(".page-web-timeline") as HTMLElement | null);
      if (shell && ed.contains(shell)) mark(node as HTMLElement);
      return;
    }

    if (node instanceof Element && node.matches(".page-web-elements-actions-cluster")) {
      const shell =
        (node.closest(".page-web-text-block-v2") as HTMLElement | null) ??
        (node.closest(".page-web-text-block") as HTMLElement | null);
      if (shell && ed.contains(shell)) mark(node as HTMLElement);
      return;
    }

    if (
      node instanceof Element &&
      node.matches(".page-web-elements-actions") &&
      !node.querySelector(":scope > .page-web-elements-actions-cluster")
    ) {
      const shell =
        (node.closest(".page-web-text-block-v2") as HTMLElement | null) ??
        (node.closest(".page-web-text-block") as HTMLElement | null);
      if (shell && ed.contains(shell)) mark(node as HTMLElement);
      return;
    }

    const textBlockContent = node.closest(".page-web-text-block-content") as HTMLElement | null;
    if (textBlockContent && ed.contains(textBlockContent)) {
      const target = node.closest("h1, h2, h3, h4, h5, h6, p, li, dt, dd, a, span") as HTMLElement | null;
      if (target && textBlockContent.contains(target)) mark(target);
      return;
    }

    const articleTextBody = node.closest(".page-web-article-text-body") as HTMLElement | null;
    if (articleTextBody && ed.contains(articleTextBody)) {
      const target = node.closest("h1, h2, h3, h4, h5, h6, p, li, dt, dd, a, span") as HTMLElement | null;
      if (target && articleTextBody.contains(target)) mark(target);
      else mark(articleTextBody);
      return;
    }

    const textMediaCol = node.closest(".page-web-text-media-col") as HTMLElement | null;
    if (textMediaCol && ed.contains(textMediaCol)) {
      const target = node.closest(
        "h1, h2, h3, h4, h5, h6, p, li, dt, dd, a, span, img, figure, figcaption",
      ) as HTMLElement | null;
      if (target && textMediaCol.contains(target)) mark(target);
      else mark(textMediaCol);
    }
  }

  function syncHyphensToolbarState(target: HTMLElement | null) {
    setHyphensApplicable(!!target);
    setHyphensEnabled(target ? readWebElementsHyphensEnabled(target) : false);
  }

  function toggleWebElementsHyphens() {
    const el = editorRef.current;
    if (!el) return;
    const activeInput = getActiveTextInputInsideEditor(el);
    let target: HTMLElement | null =
      activeInput instanceof HTMLElement ? getHyphensTargetFromActiveField(activeInput) : null;
    if (!target) {
      const range = savedRangeRef.current;
      if (range && el.contains(range.commonAncestorContainer)) {
        target = getHyphensTargetFromNode(range.commonAncestorContainer, el);
      }
    }
    if (!target) return;
    setWebElementsHyphensEnabled(target, !readWebElementsHyphensEnabled(target));
    syncHyphensToolbarState(target);
    scheduleEditorHtmlStateSync(el.innerHTML);
  }

  function updateToolbarState() {
    const el = editorRef.current;
    if (!el || !document.contains(el)) return;
    const active = document.activeElement as HTMLElement | null;
    const actionsOuter =
      active && el.contains(active) ? getWebElementsActionsOuterFromFocus(active) : null;
    if (actionsOuter?.classList.contains("page-web-elements-actions")) {
      el.querySelectorAll(`[${PAGE_EDITOR_FOCUS_TARGET_ATTR}]`).forEach((n) =>
        n.removeAttribute(PAGE_EDITOR_FOCUS_TARGET_ATTR),
      );
      const focusEl =
        (actionsOuter.querySelector(":scope > .page-web-elements-actions-cluster") as HTMLElement | null) ??
        actionsOuter;
      focusEl.setAttribute(PAGE_EDITOR_FOCUS_TARGET_ATTR, "1");
      selectedWebElementsActionsRef.current = focusEl;
      setAlignment(readWebElementsActionsAlign(actionsOuter));
      setIsInTable(false);
      setIsInWebCoverContent(false);
      syncHyphensToolbarState(null);
      syncPageEditorFocusTarget(el, null);
      return;
    }
    const activeInput =
      active &&
      el.contains(active) &&
      active.matches(
        ".page-web-text-block-subtitle-input, .page-web-text-block-title-input, .page-web-text-block-lead-input, .page-web-elements-announcement-input, .page-web-elements-title-input, .page-web-elements-title2-input, .page-web-elements-subtitle-input, .page-web-elements-description-input, .page-web-accordion-question-input, .page-web-accordion-answer-input",
      ) &&
      (active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        (active.matches(".page-web-elements-announcement-input") &&
          active.getAttribute("contenteditable") === "true"))
        ? active
        : null;
    if (activeInput) {
      el.querySelectorAll(`[${PAGE_EDITOR_FOCUS_TARGET_ATTR}]`).forEach((n) =>
        n.removeAttribute(PAGE_EDITOR_FOCUS_TARGET_ATTR),
      );
      activeInput.setAttribute(PAGE_EDITOR_FOCUS_TARGET_ATTR, "1");
      const isElementsTextTa =
        activeInput instanceof HTMLTextAreaElement &&
        (activeInput.matches(".page-web-elements-subtitle-input") ||
          activeInput.matches(".page-web-elements-title-input") ||
          activeInput.matches(".page-web-elements-title2-input") ||
          activeInput.matches(".page-web-elements-description-input") ||
          activeInput.matches(".page-web-accordion-question-input") ||
          activeInput.matches(".page-web-accordion-answer-input"));
      const coverBannerForToolbar = activeInput.closest(".page-web-cover") as HTMLElement | null;
      const inCoverBannerToolbar =
        !!coverBannerForToolbar &&
        el.contains(coverBannerForToolbar) &&
        !!activeInput.closest(".page-web-cover-inner") &&
        isElementsTextTa;
      if (inCoverBannerToolbar && coverBannerForToolbar && activeInput.matches(".page-web-elements-title-input")) {
        const titleIsland = activeInput.closest(".page-web-elements.page-web-elements-title") as HTMLElement | null;
        const ha = (titleIsland?.getAttribute("data-cover-title-halign") || "center").toLowerCase();
        setAlignment(parseToolbarTextAlign(ha === "justify" ? "justify" : ha));
        const va = (coverBannerForToolbar.getAttribute("data-cover-valign") || "middle").toLowerCase();
        setCoverVerticalAlign(va === "top" || va === "bottom" ? va : "middle");
        setIsInTable(false);
        setIsInWebCoverContent(true);
        syncHyphensToolbarState(getHyphensTargetFromActiveField(activeInput));
        syncPageEditorFocusTarget(el, null);
        return;
      }
      const leadRowForHalign = activeInput.closest(".page-web-feature-grid-lead-row") as HTMLElement | null;
      const inFeatureGridMessage = !!activeInput.closest(".page-web-feature-grid-message");
      const halignFromLeadRow =
        isElementsTextTa &&
        inFeatureGridMessage &&
        leadRowForHalign &&
        leadRowForHalign.querySelector(":scope > .page-web-feature-grid-message")
          ? (leadRowForHalign.getAttribute("data-web-elements-halign") || "").trim().toLowerCase()
          : "";
      const wpAlignWrap = activeInput.closest(WORK_PRICING_WEB_ELEMENTS_ALIGN_WRAP_SELECTOR) as HTMLElement | null;
      const halignFromWorkPricing =
        isElementsTextTa && wpAlignWrap?.closest(".page-web-work-pricing")
          ? (wpAlignWrap.getAttribute(WORK_PRICING_WEB_ELEMENTS_HALIGN_ATTR) || "").trim().toLowerCase()
          : "";
      const alignEl =
        activeInput.matches(".page-web-elements-announcement-input") &&
        activeInput.getAttribute("contenteditable") === "true"
          ? (activeInput.closest(".page-web-elements-announcement-row") as HTMLElement | null) ?? activeInput
          : isElementsTextTa
            ? (activeInput.closest(".page-web-elements-field-row") as HTMLElement | null) ?? activeInput
            : activeInput;
      const inputAlignRaw =
        halignFromLeadRow === "center" ||
        halignFromLeadRow === "right" ||
        halignFromLeadRow === "left" ||
        halignFromLeadRow === "justify"
          ? halignFromLeadRow
          : halignFromWorkPricing === "center" ||
              halignFromWorkPricing === "right" ||
              halignFromWorkPricing === "left" ||
              halignFromWorkPricing === "justify"
            ? halignFromWorkPricing
            : (alignEl.style.textAlign || getComputedStyle(alignEl).textAlign || "").toLowerCase();
      setAlignment(parseToolbarTextAlign(inputAlignRaw));
      setIsInTable(false);
      setIsInWebCoverContent(false);
      syncHyphensToolbarState(
        activeInput instanceof HTMLElement ? getHyphensTargetFromActiveField(activeInput) : null,
      );
      syncPageEditorFocusTarget(el, null);
      return;
    }

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      syncHyphensToolbarState(null);
      syncPageEditorFocusTarget(el, null);
      return;
    }

    const range = sel.getRangeAt(0);
    if (!el.contains(range.commonAncestorContainer)) {
      syncHyphensToolbarState(null);
      syncPageEditorFocusTarget(el, null);
      return;
    }
    syncPageEditorFocusTarget(el, range);

    try {
      if (!range.collapsed) {
        setListStyleOpen(false);
        setListColorOpen(false);
      }
      const snapshot = range.cloneRange();
      savedRangeRef.current = snapshot;
      commandRangeRef.current = snapshot.cloneRange();

      setIsBold(document.queryCommandState("bold"));
      setIsItalic(document.queryCommandState("italic"));
      setIsUnderline(document.queryCommandState("underline"));

      const selectedImage = selectedImageWrapperRef.current;
      if (selectedImage && el.contains(selectedImage)) {
        const imageAlign = (selectedImage.getAttribute("data-image-align") || "").toLowerCase();
        if (imageAlign === "center" || imageAlign === "right" || imageAlign === "left") setAlignment(imageAlign);
        else if (document.queryCommandState("justifyFull")) setAlignment("justify");
        else if (document.queryCommandState("justifyCenter")) setAlignment("center");
        else if (document.queryCommandState("justifyRight")) setAlignment("right");
        else setAlignment("left");
      } else if (document.queryCommandState("justifyFull")) setAlignment("justify");
      else if (document.queryCommandState("justifyCenter")) setAlignment("center");
      else if (document.queryCommandState("justifyRight")) setAlignment("right");
      else setAlignment("left");

      setIsUnorderedList(document.queryCommandState("insertUnorderedList"));
      setIsOrderedList(document.queryCommandState("insertOrderedList"));

      let ls = "";
      if (document.queryCommandState("insertUnorderedList") || document.queryCommandState("insertOrderedList")) {
        try {
          const node =
            range.startContainer.nodeType === Node.TEXT_NODE
              ? range.startContainer.parentElement
              : range.startContainer;
          const list = (node as Element)?.closest?.("ol, ul");
          if (list) {
            const dataStyle = (list as HTMLElement).getAttribute?.("data-list-style");
            if (dataStyle) ls = dataStyle;
            else if (list.tagName === "OL") {
              const val = (list as HTMLElement).style?.listStyleType;
              ls = val && val !== "none" ? val : "decimal";
            } else {
              const style = getComputedStyle(list).listStyleType;
              const val = (list as HTMLElement).style?.listStyleType || style;
              ls = val && val !== "none" ? val : "disc";
            }
          }
        } catch {
          // ignore
        }
      }
      setListStyleType(ls);

      let lc = "";
      let lsStart = 1;
      if (document.queryCommandState("insertUnorderedList") || document.queryCommandState("insertOrderedList")) {
        try {
          const node =
            range.startContainer.nodeType === Node.TEXT_NODE
              ? range.startContainer.parentElement
              : range.startContainer;
          const list = (node as Element)?.closest?.("ol, ul");
          if (list) {
            lc = (list as HTMLElement).getAttribute?.("data-list-color") ?? "";
            if (list.tagName === "OL") {
              const startAttr = (list as HTMLElement).getAttribute?.("start");
              lsStart = startAttr ? Math.max(1, parseInt(startAttr, 10) || 1) : 1;
            }
          }
        } catch {
          // ignore
        }
      }
      setListColor(lc);
      setListStart(lsStart);

      let fs = document.queryCommandValue("fontSize");
      if (!fs || !/^[1-7]$/.test(fs)) {
        try {
          const node =
            range.startContainer.nodeType === Node.TEXT_NODE
              ? range.startContainer.parentElement
              : range.startContainer;
          const target =
            node?.nodeType === Node.ELEMENT_NODE ? node : (node as Node)?.parentElement;
          if (target && target instanceof HTMLElement) {
            const px = parseInt(getComputedStyle(target).fontSize, 10);
            const map: Record<number, string> = {
              10: "1", 13: "2", 16: "3", 18: "4", 24: "5", 32: "6", 48: "7",
            };
            fs = map[px] ?? "";
          }
        } catch {
          fs = "";
        }
      }
      setFontSize(fs || "");
      setFontColor(normalizeCommandColor(document.queryCommandValue("foreColor")));

      let inTable = false;
      let tblBorder = "solid";
      try {
        const node =
          range.startContainer.nodeType === Node.TEXT_NODE
            ? range.startContainer.parentElement
            : range.startContainer;
        const table = (node as Element)?.closest?.("table.page-editor-table");
        if (table) {
          inTable = true;
          const cell = (node as Element)?.closest?.("table.page-editor-table td") as HTMLElement | null;
          const selCells = Array.from(el.querySelectorAll(".page-editor-table td[data-cell-selected]")) as HTMLElement[];
          const srcCell = (selCells.length > 0 ? selCells[0] : cell) as HTMLElement | null;
          if (srcCell?.hasAttribute?.("data-cell-border")) {
            tblBorder = srcCell.getAttribute("data-cell-border") ?? "solid";
            const c = srcCell.getAttribute("data-cell-border-color");
            if (c) setTableBorderColor(c);
            const w = srcCell.getAttribute("data-cell-border-width");
            if (w) setTableBorderWidth(w);
          } else {
            tblBorder = (table as HTMLElement).getAttribute?.("data-table-border") ?? "solid";
            const tblColor = (table as HTMLElement).style?.getPropertyValue?.("--table-border-color")?.trim();
            if (tblColor) setTableBorderColor(tblColor);
            const tblWidth = (table as HTMLElement).style?.getPropertyValue?.("--table-border-width")?.trim();
            if (tblWidth) setTableBorderWidth(tblWidth.replace(/px$/, "") || "1");
          }
          const cellAlign = (srcCell?.getAttribute?.("data-cell-align") || srcCell?.style?.textAlign || "").toLowerCase();
          if (cellAlign === "center" || cellAlign === "right" || cellAlign === "left" || cellAlign === "justify")
            setAlignment(cellAlign as WebElementsTextAlign);
          else {
            const tblAlign = (table as HTMLElement).getAttribute?.("data-table-align");
            if (
              tblAlign === "center" ||
              tblAlign === "right" ||
              tblAlign === "left" ||
              tblAlign === "justify"
            )
              setAlignment(tblAlign as WebElementsTextAlign);
            else setAlignment("left");
          }
          const tw = (cell?.getAttribute?.("data-cell-width") || cell?.style?.width) || ((table as HTMLElement).getAttribute?.("data-table-width") ?? (table as HTMLElement).style?.width ?? "");
          setTableWidth(tw || "auto");
          const trh = (cell?.getAttribute?.("data-cell-height") || cell?.style?.height) || ((table as HTMLElement).getAttribute?.("data-table-row-height") ?? (table as HTMLElement).style?.getPropertyValue?.("--table-row-height")?.trim() ?? "");
          setTableRowHeight(trh || "auto");
          const tva = (cell?.getAttribute?.("data-cell-valign") || cell?.style?.verticalAlign || "").toLowerCase();
          if (tva === "top" || tva === "middle" || tva === "bottom") setTableVerticalAlign(tva);
          else setTableVerticalAlign("middle");
        }
      } catch {
        // ignore
      }
      setIsInTable(inTable);
      setTableBorderStyle(tblBorder);

      let inWebCoverLayouts = false;
      if (!inTable) {
        try {
          const node =
            range.startContainer.nodeType === Node.TEXT_NODE
              ? range.startContainer.parentElement
              : range.startContainer;
          const inner = (node as Element)?.closest?.(".page-web-cover-inner") as HTMLElement | null;
          if (inner && el.contains(inner) && !inner.closest("table.page-editor-table")) {
            const cover = inner.closest(".page-web-cover") as HTMLElement | null;
            if (cover && el.contains(cover)) {
              inWebCoverLayouts = true;
              const ha = (cover.getAttribute("data-cover-halign") || "center").toLowerCase();
              const va = (cover.getAttribute("data-cover-valign") || "top").toLowerCase();
              setCoverVerticalAlign(va === "middle" || va === "bottom" ? va : "top");
              const selectedImage = selectedImageWrapperRef.current;
              const anchor = range.commonAncestorContainer;
              const inSelectedImage =
                selectedImage &&
                el.contains(selectedImage) &&
                (selectedImage === anchor || selectedImage.contains(anchor));
              if (!inSelectedImage) {
                const refSel = selectedWebElementsActionsRef.current;
                let coverActionsOuter: HTMLElement | null = null;
                if (refSel && el.contains(refSel) && inner.contains(refSel)) {
                  const o = getWebElementsActionsOuterFromFocus(refSel as HTMLElement);
                  if (
                    o &&
                    o.classList.contains("page-web-elements-actions") &&
                    o.parentElement === inner
                  ) {
                    coverActionsOuter = o;
                  }
                }
                if (!coverActionsOuter) {
                  const anchor = range.commonAncestorContainer;
                  const probe =
                    anchor.nodeType === Node.TEXT_NODE
                      ? (anchor.parentElement as Element | null)
                      : (anchor as Element | null);
                  const found = probe?.closest(".page-web-elements-actions") as HTMLElement | null;
                  if (found && found.parentElement === inner && inner.contains(found)) {
                    coverActionsOuter = found;
                  }
                }
                if (coverActionsOuter) {
                  setAlignment(readWebElementsActionsAlign(coverActionsOuter));
                } else {
                  setAlignment(parseToolbarTextAlign(ha));
                }
              }
            }
          }
        } catch {
          // ignore
        }
      }
      setIsInWebCoverContent(inWebCoverLayouts);

      let hyphensTarget: HTMLElement | null = null;
      if (!(selectedImage && el.contains(selectedImage)) && !inTable) {
        hyphensTarget = getHyphensTargetFromNode(range.commonAncestorContainer, el);
      }
      syncHyphensToolbarState(hyphensTarget);
    } catch {
      syncHyphensToolbarState(null);
    }
  }

  function getCellPosition(cell: HTMLTableCellElement): { row: number; col: number } | null {
    const table = cell.closest("table.page-editor-table") as HTMLTableElement | null;
    if (!table) return null;
    const tbody = table.querySelector("tbody");
    if (!tbody) return null;
    const rows = tbody.querySelectorAll("tr");
    for (let r = 0; r < rows.length; r++) {
      const cells = rows[r].querySelectorAll("td");
      let col = 0;
      for (const td of cells) {
        if (td === cell) return { row: r, col };
        col += parseInt((td as HTMLTableCellElement).getAttribute("colspan") || "1", 10);
      }
    }
    return null;
  }

  function getCellAtPosition(table: HTMLTableElement, row: number, col: number): HTMLTableCellElement | null {
    const tbody = table.querySelector("tbody");
    if (!tbody) return null;
    const rows = tbody.querySelectorAll("tr");
    const tr = rows[row];
    if (!tr) return null;
    const cells = tr.querySelectorAll("td");
    let c = 0;
    for (const cell of cells) {
      const colspan = parseInt((cell as HTMLTableCellElement).getAttribute("colspan") || "1", 10);
      if (col >= c && col < c + colspan) return cell as HTMLTableCellElement;
      c += colspan;
    }
    return null;
  }

  function getTableColumnCount(table: HTMLTableElement): number {
    const tbody = table.querySelector("tbody");
    const firstRow = tbody?.querySelector("tr");
    if (!firstRow) return 0;
    let count = 0;
    firstRow.querySelectorAll("td").forEach((td) => {
      count += parseInt((td as HTMLTableCellElement).getAttribute("colspan") || "1", 10);
    });
    return count;
  }

  function syncTableColgroup(table: HTMLTableElement) {
    const colCount = getTableColumnCount(table);
    if (colCount === 0) return;
    const widths: (string | null)[] = [];
    for (let col = 0; col < colCount; col++) {
      const cell = getCellAtPosition(table, 0, col);
      const w = cell?.getAttribute("data-cell-width") || (cell as HTMLElement)?.style?.width || null;
      widths.push(w);
    }
    const hasAnyWidth = widths.some((w) => w != null && w !== "");
    let colgroup = table.querySelector("colgroup");
    if (!hasAnyWidth) {
      colgroup?.remove();
      return;
    }
    if (!colgroup) {
      colgroup = document.createElement("colgroup");
      table.insertBefore(colgroup, table.querySelector("tbody"));
    }
    colgroup.innerHTML = "";
    widths.forEach((w) => {
      const col = document.createElement("col");
      if (w) col.style.width = w;
      colgroup!.appendChild(col);
    });
  }

  function highlightCellsInRect(
    table: HTMLTableElement,
    startRow: number,
    startCol: number,
    endRow: number,
    endCol: number
  ) {
    const rMin = Math.min(startRow, endRow);
    const rMax = Math.max(startRow, endRow);
    const cMin = Math.min(startCol, endCol);
    const cMax = Math.max(startCol, endCol);
    const seen = new Set<HTMLTableCellElement>();
    for (let r = rMin; r <= rMax; r++) {
      for (let c = cMin; c <= cMax; c++) {
        const cell = getCellAtPosition(table, r, c);
        if (cell && !seen.has(cell)) {
          seen.add(cell);
          cell.setAttribute("data-cell-selected", "true");
        }
      }
    }
  }

  function highlightSelectedTableCells() {
    const el = editorRef.current;
    const wrapper = editorWrapperRef.current;
    if (!el) return;
    const existing = Array.from(el.querySelectorAll(".page-editor-table td[data-cell-selected]")) as HTMLElement[];
    const sel = window.getSelection();
    let selectedCells: HTMLElement[] = [];
    let selectionInTable = false;
    const range = sel?.rangeCount ? sel.getRangeAt(0) : null;
    const focusNode = range?.commonAncestorContainer;
    const focusEl = focusNode?.nodeType === Node.TEXT_NODE ? focusNode.parentElement : focusNode;
    const activeEl = typeof document !== "undefined" ? document.activeElement : null;
    const inToolbar =
      !!(toolbarRef.current?.contains(focusEl as Node) || (activeEl && toolbarRef.current?.contains(activeEl)));
    const inCellMenu =
      !!(cellMenuRef.current?.contains(focusEl as Node) || (activeEl && cellMenuRef.current?.contains(activeEl)));
    const preserveSelection =
      (preserveTableSelectionRef.current || inToolbar || inCellMenu) && existing.length > 1;
    if (sel && sel.rangeCount > 0 && range) {
      try {
        const node = range.commonAncestorContainer.nodeType === Node.TEXT_NODE
          ? range.commonAncestorContainer.parentElement
          : range.commonAncestorContainer;
        selectionInTable = !!(node && (node as Element).closest?.("table.page-editor-table"));
        if (selectionInTable && el.contains(range.commonAncestorContainer) && !preserveSelection) {
          el.querySelectorAll(".page-editor-table td").forEach((td) => {
            if (range.intersectsNode(td)) {
              selectedCells.push(td as HTMLElement);
            }
          });
        }
      } catch {
        // ignore
      }
    }
    if (!selectionInTable && existing.length > 0) {
      if (!inToolbar && !inCellMenu) {
        clearTableSelection();
        return;
      }
    }
    if (preserveSelection || (cellDragStartRef.current && existing.length > 1)) {
      selectedCells = existing;
    } else if (selectedCells.length === 0 && existing.length > 0) {
      selectedCells = existing;
    }
    if (selectedCells.length === 0) {
      clearTableSelection();
      return;
    }
    el.querySelectorAll(".page-editor-table td[data-cell-selected]").forEach((td) =>
      td.removeAttribute("data-cell-selected")
    );
    selectedCells.forEach((td) => td.setAttribute("data-cell-selected", "true"));
    selectedCellRef.current = null;
    try {
      if (selectedCells.length > 0) {
        const cell = selectedCells[0] as HTMLTableCellElement;
        selectedCellRef.current = cell;
        const table = cell.closest("table.page-editor-table");
        let rows = 1;
        let cols = 1;
        if (table) {
          const tbody = table.querySelector("tbody");
          if (tbody) {
            const allRows = tbody.querySelectorAll("tr");
            let rMin = Infinity;
            let rMax = -Infinity;
            let cMin = Infinity;
            let cMax = -Infinity;
            selectedCells.forEach((c) => {
              const pos = getCellPosition(c as HTMLTableCellElement);
              if (pos) {
                rMin = Math.min(rMin, pos.row);
                rMax = Math.max(rMax, pos.row);
                cMin = Math.min(cMin, pos.col);
                cMax = Math.max(cMax, pos.col);
              }
            });
            if (rMin !== Infinity) rows = rMax - rMin + 1;
            if (cMin !== Infinity) cols = cMax - cMin + 1;
            const positions = selectedCells.map((c) => getCellPosition(c as HTMLTableCellElement)).filter(Boolean) as { row: number; col: number }[];
            const allSameRow = positions.length > 0 && positions.every((p) => p.row === positions[0].row);
            const allSameCol = positions.length > 0 && positions.every((p) => p.col === positions[0].col);
            if (allSameRow) cols = Math.max(cols, selectedCells.length);
            if (allSameCol) rows = Math.max(rows, selectedCells.length);
          }
        }
        setSelectedCellRange({ rows, cols });
        if (table) {
          const tbl = table as HTMLElement;
          const cellWidths = selectedCells.map((c) => (c as HTMLElement).getAttribute?.("data-cell-width") || (c as HTMLElement).style?.width || "").filter(Boolean);
          const sameWidth = cellWidths.length > 0 && cellWidths.every((w) => w === cellWidths[0]);
          setTableWidth(sameWidth ? cellWidths[0]! : "auto");
          const cellHeights = selectedCells.map((c) => (c as HTMLElement).getAttribute?.("data-cell-height") || (c as HTMLElement).style?.height || "").filter(Boolean);
          const sameHeight = cellHeights.length > 0 && cellHeights.every((h) => h === cellHeights[0]);
          setTableRowHeight(sameHeight ? (cellHeights[0] || "auto") : "auto");
          const cellAligns = selectedCells.map((c) => ((c as HTMLElement).getAttribute?.("data-cell-align") || (c as HTMLElement).style?.textAlign || "left").toLowerCase());
          const sameAlign = cellAligns.length > 0 && cellAligns.every((a) => a === cellAligns[0]);
          const align = (sameAlign ? cellAligns[0] : "left") as "left" | "center" | "right";
          setAlignment(align);
          const cellVAligns = selectedCells.map((c) => ((c as HTMLElement).getAttribute?.("data-cell-valign") || (c as HTMLElement).style?.verticalAlign || "middle").toLowerCase());
          const sameVAlign = cellVAligns.length > 0 && cellVAligns.every((v) => v === cellVAligns[0]);
          const vAlign = (sameVAlign ? cellVAligns[0] : "middle") as "top" | "middle" | "bottom";
          setTableVerticalAlign(vAlign);
        }
        const cellRect = cell.getBoundingClientRect();
        const wrapperRect = wrapper?.getBoundingClientRect();
        const scrollTop = editorScrollRef.current?.scrollTop ?? 0;
        const scrollLeft = editorScrollRef.current?.scrollLeft ?? 0;
        if (wrapper && wrapperRect) {
          setCellMenuRect({
            top: cellRect.top - wrapperRect.top + scrollTop,
            left: cellRect.left - wrapperRect.left + scrollLeft,
            height: cellRect.height,
          });
        }
        const rects = selectedCells.map((c) => c.getBoundingClientRect());
        let rightmostTop = cellRect.top;
        let rightmostRight = cellRect.right;
        if (rects.length > 0) {
          const maxRight = Math.max(...rects.map((r) => r.right));
          const rightmostIdx = rects.findIndex((r) => r.right === maxRight);
          if (rightmostIdx >= 0) {
            rightmostTop = rects[rightmostIdx].top;
            rightmostRight = rects[rightmostIdx].right;
          }
        }
        const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 600;
        const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 800;
        const spaceBelow = typeof window !== "undefined" ? window.innerHeight - cellRect.bottom : 300;
        setCellMenuViewport({
          top: cellRect.top + cellRect.height / 2 - 14,
          left: Math.max(8, Math.min(cellRect.left - 32, viewportWidth - 40)),
          topBtn: {
            top: Math.max(8, Math.min(cellRect.top - 28, viewportHeight - 40)),
            left: cellRect.left + cellRect.width / 2 - 14,
          },
          openUp: spaceBelow < 280,
          selectionBadge: { top: rightmostTop, right: rightmostRight },
        });
      }
    } catch {
      // ignore
    }
  }

  function applyCellSelectionFromHighlight() {
    const el = editorRef.current;
    const wrapper = editorWrapperRef.current;
    if (!el) return;
    const selected = Array.from(el.querySelectorAll(".page-editor-table td[data-cell-selected]")) as HTMLTableCellElement[];
    if (selected.length === 0) return;
    const cell = selected[0];
    selectedCellRef.current = cell;
    const table = cell.closest("table.page-editor-table") as HTMLTableElement | null;
    let rows = 1;
    let cols = 1;
    if (table) {
      const tbody = table.querySelector("tbody");
      if (tbody) {
        let rMin = Infinity;
        let rMax = -Infinity;
        let cMin = Infinity;
        let cMax = -Infinity;
        selected.forEach((c) => {
          const pos = getCellPosition(c);
          if (pos) {
            rMin = Math.min(rMin, pos.row);
            rMax = Math.max(rMax, pos.row);
            cMin = Math.min(cMin, pos.col);
            cMax = Math.max(cMax, pos.col);
          }
        });
        if (rMin !== Infinity) rows = rMax - rMin + 1;
        if (cMin !== Infinity) cols = cMax - cMin + 1;
        const positions = selected.map((c) => getCellPosition(c)).filter(Boolean) as { row: number; col: number }[];
        const allSameRow = positions.length > 0 && positions.every((p) => p.row === positions[0].row);
        const allSameCol = positions.length > 0 && positions.every((p) => p.col === positions[0].col);
        if (allSameRow) cols = Math.max(cols, selected.length);
        if (allSameCol) rows = Math.max(rows, selected.length);
      }
    }
    setSelectedCellRange({ rows, cols });
    if (table) {
      const tbl = table as HTMLElement;
      const cellWidths = selected.map((c) => c.getAttribute?.("data-cell-width") || c.style?.width || "").filter(Boolean);
      const sameWidth = cellWidths.length > 0 && cellWidths.every((w) => w === cellWidths[0]);
      setTableWidth(sameWidth ? cellWidths[0]! : "auto");
      const cellHeights = selected.map((c) => c.getAttribute?.("data-cell-height") || c.style?.height || "").filter(Boolean);
      const sameHeight = cellHeights.length > 0 && cellHeights.every((h) => h === cellHeights[0]);
      setTableRowHeight(sameHeight ? (cellHeights[0] || "auto") : "auto");
      const cellAligns = selected.map((c) => (c.getAttribute?.("data-cell-align") || c.style?.textAlign || "left").toLowerCase());
      const sameAlign = cellAligns.length > 0 && cellAligns.every((a) => a === cellAligns[0]);
      const align = (sameAlign ? cellAligns[0] : "left") as "left" | "center" | "right";
      setAlignment(align);
      const cellVAligns = selected.map((c) => (c.getAttribute?.("data-cell-valign") || c.style?.verticalAlign || "middle").toLowerCase());
      const sameVAlign = cellVAligns.length > 0 && cellVAligns.every((v) => v === cellVAligns[0]);
      const vAlign = (sameVAlign ? cellVAligns[0] : "middle") as "top" | "middle" | "bottom";
      setTableVerticalAlign(vAlign);
    }
    const cellRect = cell.getBoundingClientRect();
    const wrapperRect = wrapper?.getBoundingClientRect();
    const scrollTop = editorScrollRef.current?.scrollTop ?? 0;
    const scrollLeft = editorScrollRef.current?.scrollLeft ?? 0;
    if (wrapper && wrapperRect) {
      setCellMenuRect({
        top: cellRect.top - wrapperRect.top + scrollTop,
        left: cellRect.left - wrapperRect.left + scrollLeft,
        height: cellRect.height,
      });
    }
    const rects = selected.map((c) => c.getBoundingClientRect());
    let rightmostTop = cellRect.top;
    let rightmostRight = cellRect.right;
    if (rects.length > 0) {
      const maxRight = Math.max(...rects.map((r) => r.right));
      const rightmostIdx = rects.findIndex((r) => r.right === maxRight);
      if (rightmostIdx >= 0) {
        rightmostTop = rects[rightmostIdx].top;
        rightmostRight = rects[rightmostIdx].right;
      }
    }
    const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 600;
    const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 800;
    const spaceBelow = typeof window !== "undefined" ? window.innerHeight - cellRect.bottom : 300;
    setCellMenuViewport({
      top: cellRect.top + cellRect.height / 2 - 14,
      left: Math.max(8, Math.min(cellRect.left - 32, viewportWidth - 40)),
      topBtn: {
        top: Math.max(8, Math.min(cellRect.top - 28, viewportHeight - 40)),
        left: cellRect.left + cellRect.width / 2 - 14,
      },
      openUp: spaceBelow < 280,
      selectionBadge: { top: rightmostTop, right: rightmostRight },
    });
  }

  useEffect(() => {
    if (!Number.isFinite(pageId)) return;

    void (async () => {
      try {
        setLoading(true);
        setError(null);
        setPageMissingInDb(false);
        const page = await apiGet<PageDetails>(`/api/pages/${pageId}`, 120_000);
        setTitle(page.title || "");
        setSlug(page.slug || "");
        const blocks = Array.isArray(page.blocks) ? page.blocks : [];
        const firstText = blocks.find((b) => b.type === "text")?.data?.text;
        const rawInitialHtml = typeof firstText === "string" ? firstText : "";
        const initialHtml = isSeededTitleDescriptionTextBlock(
          rawInitialHtml,
          page.title || "",
          page.description,
        )
          ? ""
          : rawInitialHtml;
        const blockModeInitialHtml = normalizeToBlockEditorHtml(initialHtml);
        let normalizedInitialHtml = blockModeInitialHtml;
        try {
          normalizedInitialHtml = await normalizeHtmlInlineImagesToWebp(blockModeInitialHtml);
        } catch (webpErr) {
          // Очень большие data URL / лимиты canvas — не блокируем открытие редактора.
          console.warn("[page-editor] normalizeHtmlInlineImagesToWebp failed, using raw HTML", webpErr);
        }
        setContentHtml(normalizedInitialHtml);
      } catch (e) {
        console.error("[page-editor] load failed", e);
        const notFound =
          e instanceof ApiRequestError &&
          e.status === 404 &&
          isPageByIdApiPath(`/api/pages/${pageId}`);
        if (notFound) {
          setPageMissingInDb(true);
          setError(
            `Страницы с id «${pageId}» в базе нет. Откройте её из списка «Страницы» — в адресе должен быть существующий id (сейчас в БД нет записи с номером ${pageId}).`,
          );
        } else {
          setError(
            e instanceof Error && e.message.trim()
              ? e.message
              : "Не удалось загрузить страницу",
          );
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [pageId]);

  useEffect(() => {
    return () => {
      if (inputSyncTimerRef.current !== null) {
        window.clearTimeout(inputSyncTimerRef.current);
        inputSyncTimerRef.current = null;
      }
    };
  }, []);

  function scheduleEditorHtmlStateSync(html: string) {
    pendingInputHtmlRef.current = html;
    if (inputSyncTimerRef.current !== null) window.clearTimeout(inputSyncTimerRef.current);
    inputSyncTimerRef.current = window.setTimeout(() => {
      inputSyncTimerRef.current = null;
      const pending = pendingInputHtmlRef.current;
      if (typeof pending !== "string") {
        pendingInputHtmlRef.current = null;
        return;
      }
      const ed = editorRef.current;
      const sel = typeof window !== "undefined" ? window.getSelection() : null;
      const selectionInsideEditor =
        !!ed && !!sel && sel.rangeCount > 0 && ed.contains(sel.getRangeAt(0).commonAncestorContainer);
      const active = typeof document !== "undefined" ? (document.activeElement as HTMLElement | null) : null;
      const plainTextBlockFieldActive =
        !!ed &&
        !!active &&
        ed.contains(active) &&
        (active.matches(".page-web-text-block-subtitle-input") ||
          active.matches(".page-web-text-block-title-input") ||
          active.matches(".page-web-text-block-lead-input") ||
          active.matches(".page-web-elements-announcement-input") ||
          active.matches(".page-web-elements-title-input") ||
          active.matches(".page-web-elements-title2-input") ||
          active.matches(".page-web-elements-subtitle-input") ||
          active.matches(".page-web-elements-description-input") ||
          active.matches(".page-web-accordion-question-input") ||
          active.matches(".page-web-accordion-answer-input"));
      // Keep typing path native: don't commit React HTML state while caret is still inside editor.
      if (selectionInsideEditor || plainTextBlockFieldActive) {
        inputSyncTimerRef.current = window.setTimeout(() => {
          inputSyncTimerRef.current = null;
          const delayed = pendingInputHtmlRef.current;
          if (typeof delayed === "string") {
            const delayedSel = typeof window !== "undefined" ? window.getSelection() : null;
            const delayedActive =
              typeof document !== "undefined" ? (document.activeElement as HTMLElement | null) : null;
            const delayedPlainField =
              !!ed &&
              !!delayedActive &&
              ed.contains(delayedActive) &&
              (delayedActive.matches(".page-web-text-block-subtitle-input") ||
                delayedActive.matches(".page-web-text-block-title-input") ||
                delayedActive.matches(".page-web-text-block-lead-input") ||
                delayedActive.matches(".page-web-elements-announcement-input") ||
                delayedActive.matches(".page-web-elements-title-input") ||
                delayedActive.matches(".page-web-elements-title2-input") ||
                delayedActive.matches(".page-web-elements-subtitle-input") ||
                delayedActive.matches(".page-web-elements-description-input") ||
                delayedActive.matches(".page-web-accordion-question-input") ||
                delayedActive.matches(".page-web-accordion-answer-input"));
            const delayedInside =
              !!ed && !!delayedSel && delayedSel.rangeCount > 0 && ed.contains(delayedSel.getRangeAt(0).commonAncestorContainer);
            if (!delayedInside && !delayedPlainField) {
              pendingInputHtmlRef.current = null;
              setContentHtml((prev) => (prev === delayed ? prev : delayed));
            }
          }
        }, 180);
        return;
      }
      pendingInputHtmlRef.current = null;
      setContentHtml((prev) => (prev === pending ? prev : pending));
    }, 120);
  }

  /** Сбрасывает отложенный sync полотна — иначе правки другого блока (напр. кнопка 2-го баннера) затираются старым HTML. */
  function commitEditorDomToContentHtml() {
    const ed = editorRef.current;
    if (!ed) return;
    if (inputSyncTimerRef.current !== null) {
      window.clearTimeout(inputSyncTimerRef.current);
      inputSyncTimerRef.current = null;
    }
    pendingInputHtmlRef.current = null;
    syncWebTextBlockV2FieldValuesForSerialization(ed);
    setContentHtml(ed.innerHTML);
  }

  function openCtaButtonLinkModal(rawTarget: HTMLElement) {
    const ed = editorRef.current;
    if (!ed || !ed.contains(rawTarget)) return;
    const resolved = resolveCtaLinkModalTarget(rawTarget);
    if (!resolved || !ed.contains(resolved)) return;
    if (inputSyncTimerRef.current !== null) {
      window.clearTimeout(inputSyncTimerRef.current);
      inputSyncTimerRef.current = null;
    }
    pendingInputHtmlRef.current = null;
    clearCtaLinkEditMarkers(ed);
    const target = ensureEditorCtaControlIsSpan(resolved);
    target.setAttribute(CTA_LINK_EDIT_ATTR, "1");
    coverButtonLinkTargetRef.current = target;
    const currentLink =
      (target.getAttribute("data-href") || "").trim() ||
      (target.tagName === "A" ? (target.getAttribute("href") || "").trim() : "");
    setCoverButtonLinkModalValue(currentLink === "#" ? "" : currentLink);
    setCoverButtonLinkModalLabelValue(getCoverButtonLinkLabelForModal(target));
    setCoverButtonLinkModalOpen(true);
  }

  function isWebTextBlockV2AnnouncementVisuallyEmpty(el: HTMLElement): boolean {
    const raw = (el.innerText ?? "").replace(/\r\n/g, "\n").replace(/\u200b/g, "");
    return raw.replace(/[\n\r\t\f\v \u00A0]/g, "").length === 0;
  }

  function syncWebTextBlockV2AnnouncementPlaceholderAttr(el: HTMLElement): void {
    if (!el.matches(".page-web-elements-announcement-input")) return;
    if (isWebTextBlockV2AnnouncementVisuallyEmpty(el)) el.setAttribute("data-placeholder-visible", "1");
    else el.removeAttribute("data-placeholder-visible");
  }

  function normalizeWebTextBlockV2AnnouncementPlaceholderAttrs(root: HTMLElement): boolean {
    let changed = false;
    root.querySelectorAll(".page-web-elements-announcement-input").forEach((n) => {
      if (!(n instanceof HTMLElement)) return;
      const prev = n.getAttribute("data-placeholder-visible");
      syncWebTextBlockV2AnnouncementPlaceholderAttr(n);
      if (prev !== n.getAttribute("data-placeholder-visible")) changed = true;
    });
    return changed;
  }

  /**
   * Перед сериализацией innerHTML синхронизируем живые значения полей v2 в DOM-разметку.
   * Для анонса (contenteditable) по умолчанию не перезаписываем `textContent` при вводе — иначе сбрасывается каретка;
   * полная подстановка plain-текста только при `flushAnnouncementText` (сохранение, уход фокуса с редактора).
   */
  function syncWebTextBlockV2FieldValuesForSerialization(
    root: HTMLElement,
    opts?: { flushAnnouncementText?: boolean },
  ) {
    const flushAnnouncementText = opts?.flushAnnouncementText === true;
    root
      .querySelectorAll(
        `${WEB_ELEMENTS_V2_TEXTAREA_LAYOUT_SELECTOR}, .page-web-elements-announcement-input`,
      )
      .forEach((node) => {
        if (node instanceof HTMLElement && node.matches(".page-web-elements-announcement-input")) {
          if (node.getAttribute("contenteditable") === "true") {
            const raw = (node.innerText ?? "").replace(/\r\n/g, "\n").replace(/\u200b/g, "");
            if (raw.replace(/[\n\r\t\f\v \u00A0]/g, "").length === 0) {
              node.textContent = "";
            } else if (flushAnnouncementText) {
              node.textContent = raw;
            }
            syncWebTextBlockV2AnnouncementPlaceholderAttr(node);
          } else {
            syncWebTextBlockV2AnnouncementPlaceholderAttr(node);
          }
          return;
        }
        if (node instanceof HTMLTextAreaElement) {
          if (node.textContent !== node.value) node.textContent = node.value;
          node.defaultValue = node.value;
          return;
        }
        if (node instanceof HTMLInputElement) {
          node.setAttribute("value", node.value);
        }
      });
  }

  function flushScheduledEditorHtmlStateSync() {
    if (inputSyncTimerRef.current !== null) {
      window.clearTimeout(inputSyncTimerRef.current);
      inputSyncTimerRef.current = null;
    }
    const pending = pendingInputHtmlRef.current;
    pendingInputHtmlRef.current = null;
    if (typeof pending === "string") {
      setContentHtml((prev) => (prev === pending ? prev : pending));
    }
  }

  useLayoutEffect(() => {
    if (!editorRef.current) return;
    const root = editorRef.current;
    const blockModeHtml = normalizeToBlockEditorHtml(contentHtml);
    if (blockModeHtml !== contentHtml) {
      setContentHtml(blockModeHtml);
    }
    const effectiveContentHtml = blockModeHtml;
    const pendingId = pendingEditorCaretRef.current;
    const safeId = pendingId ? pendingId.replace(/"/g, "") : "";
    // React re-renders can clear a contentEditable with no React children; the live marker then
    // disappears while contentHtml still holds the full HTML. We must re-apply innerHTML in that case.
    const markerStillInDom = !!pendingId && !!root.querySelector(`[data-editor-caret="${safeId}"]`);
    const activeElement = typeof document !== "undefined" ? document.activeElement : null;
    const selNow = typeof window !== "undefined" ? window.getSelection() : null;
    const selectionInsideEditor =
      !!selNow && selNow.rangeCount > 0 && root.contains(selNow.getRangeAt(0).commonAncestorContainer);
    const hasLiveEditorFocus = (!!activeElement && root.contains(activeElement)) || selectionInsideEditor;
    // While user is actively typing inside contentEditable, avoid forcing root.innerHTML from React state.
    // This destructive write can recreate nodes and drop caret/focus after the first typed character.
    const skipDestructiveInnerHtmlSync = (!!pendingId && markerStillInDom) || hasLiveEditorFocus;
    const innerDiffers = root.innerHTML !== effectiveContentHtml;

    if (caretDebugOn()) {
      logPageEditorCaret("layoutEffect[contentHtml]:start", {
        pendingId,
        markerStillInDom,
        selectionInsideEditor,
        hasLiveEditorFocus,
        skipDestructiveInnerHtmlSync,
        innerDiffers,
        rootChildCount: root.childNodes.length,
        contentHtmlLength: effectiveContentHtml.length,
        rootInnerLength: root.innerHTML.length,
      });
      snapshotSelection("layoutEffect[contentHtml]:selection-start", root);
    }

    if (!skipDestructiveInnerHtmlSync && innerDiffers && !coverBgAdjustingRef.current) {
      if (caretDebugOn()) {
        logPageEditorCaret("layoutEffect[contentHtml]:assign-innerHTML", {
          reason: "sync from React state (marker missing or no pending caret)",
        });
      }
      root.innerHTML = effectiveContentHtml;
      if (caretDebugOn()) {
        snapshotSelection("layoutEffect[contentHtml]:after-innerHTML-assign", root);
      }
    }
    const before = root.innerHTML;
    normalizeListContent();
    normalizeOlStartNumbers();
    normalizeTableCells();
    normalizeImages();
    normalizeWebCoverInnerEditability(root);
    normalizeWebTextBlockContentEditability(root);
    if (ENABLE_LEGACY_WEB_BLOCK_HTML_MIGRATIONS && migrateLegacyFeatureGridSubtitleToWebElements(root) && caretDebugOn()) {
      logPageEditorCaret("layoutEffect[contentHtml]:feature-grid-subtitle-elements-migrate", {});
    }
    if (ENABLE_LEGACY_WEB_BLOCK_HTML_MIGRATIONS && migrateLegacyFeatureGridTitleToWebElements(root) && caretDebugOn()) {
      logPageEditorCaret("layoutEffect[contentHtml]:feature-grid-title-elements-migrate", {});
    }
    if (ENABLE_LEGACY_WEB_BLOCK_HTML_MIGRATIONS && migrateLegacyFeatureGridLeadToWebElements(root) && caretDebugOn()) {
      logPageEditorCaret("layoutEffect[contentHtml]:feature-grid-lead-elements-migrate", {});
    }
    if (ENABLE_LEGACY_WEB_BLOCK_HTML_MIGRATIONS && migrateLegacyFeatureGridMessageTitleToWebElements(root) && caretDebugOn()) {
      logPageEditorCaret("layoutEffect[contentHtml]:feature-grid-message-title-migrate", {});
    }
    if (ENABLE_LEGACY_WEB_BLOCK_HTML_MIGRATIONS && migrateLegacyFeatureGridMessageBodyToWebElements(root) && caretDebugOn()) {
      logPageEditorCaret("layoutEffect[contentHtml]:feature-grid-message-body-migrate", {});
    }
    if (ENABLE_LEGACY_WEB_BLOCK_HTML_MIGRATIONS && migrateLegacyFeatureGridCardTitleToTitle2(root) && caretDebugOn()) {
      logPageEditorCaret("layoutEffect[contentHtml]:feature-grid-card-title2-migrate", {});
    }
    if (ENABLE_LEGACY_WEB_BLOCK_HTML_MIGRATIONS && migrateLegacyFeatureGridCardBodyToWebElements(root) && caretDebugOn()) {
      logPageEditorCaret("layoutEffect[contentHtml]:feature-grid-card-body-description-migrate", {});
    }
    if (ENABLE_LEGACY_WEB_BLOCK_HTML_MIGRATIONS && migrateLegacyWorkPricingPriceCaptionParagraphToWebElements(root) && caretDebugOn()) {
      logPageEditorCaret("layoutEffect[contentHtml]:work-pricing-price-caption-migrate", {});
    }
    if (ENABLE_LEGACY_WEB_BLOCK_HTML_MIGRATIONS && migrateLegacyWorkPricingMainTitleToWebElements(root) && caretDebugOn()) {
      logPageEditorCaret("layoutEffect[contentHtml]:work-pricing-main-title-migrate", {});
    }
    if (ENABLE_LEGACY_WEB_BLOCK_HTML_MIGRATIONS && migrateLegacyWorkPricingIncludedRowSubtitleToWebElements(root) && caretDebugOn()) {
      logPageEditorCaret("layoutEffect[contentHtml]:work-pricing-included-row-subtitle-migrate", {});
    }
    if (ENABLE_LEGACY_WEB_BLOCK_HTML_MIGRATIONS && migrateLegacyWorkPricingLeadParagraphToWebElements(root) && caretDebugOn()) {
      logPageEditorCaret("layoutEffect[contentHtml]:work-pricing-lead-migrate", {});
    }
    if (ENABLE_LEGACY_WEB_BLOCK_HTML_MIGRATIONS && migrateLegacyWorkPricingRightColumnFootnoteToWebElements(root) && caretDebugOn()) {
      logPageEditorCaret("layoutEffect[contentHtml]:work-pricing-footnote-migrate", {});
    }
    if (ENABLE_LEGACY_WEB_BLOCK_HTML_MIGRATIONS && migrateLegacyWorkPricingPriceRowToWebElements(root) && caretDebugOn()) {
      logPageEditorCaret("layoutEffect[contentHtml]:work-pricing-price-row-migrate", {});
    }
    if (ENABLE_LEGACY_WEB_BLOCK_HTML_MIGRATIONS && migrateLegacyWorkPricingCtaAnchorToWebElements(root) && caretDebugOn()) {
      logPageEditorCaret("layoutEffect[contentHtml]:work-pricing-cta-anchor-migrate", {});
    }
    if (ENABLE_LEGACY_WEB_BLOCK_HTML_MIGRATIONS && migrateLegacyWorkPricingListItemBodyToWebElements(root) && caretDebugOn()) {
      logPageEditorCaret("layoutEffect[contentHtml]:work-pricing-list-item-body-migrate", {});
    }
    if (ensureWebElementsTextFieldRowsInRoot(root) && caretDebugOn()) {
      logPageEditorCaret("layoutEffect[contentHtml]:web-elements-field-rows", {});
    }
    if (syncFeatureGridLeadRowHalignFromFieldRows(root) && caretDebugOn()) {
      logPageEditorCaret("layoutEffect[contentHtml]:feature-grid-lead-row-halign-sync", {});
    }
    if (ensureWebElementsActionsClustersInRoot(root) && caretDebugOn()) {
      logPageEditorCaret("layoutEffect[contentHtml]:web-elements-actions-cluster", {});
    }
    if (ENABLE_LEGACY_WEB_BLOCK_HTML_MIGRATIONS && migrateLegacyCoverTitleHeadingToWebElements(root) && caretDebugOn()) {
      logPageEditorCaret("layoutEffect[contentHtml]:cover-title-textarea-migrate", {});
    }
    if (ENABLE_LEGACY_WEB_BLOCK_HTML_MIGRATIONS && migrateLegacyCoverSubtitleToWebElements(root) && caretDebugOn()) {
      logPageEditorCaret("layoutEffect[contentHtml]:cover-subtitle-description-migrate", {});
    }
    if (ENABLE_LEGACY_WEB_BLOCK_HTML_MIGRATIONS && migrateLegacyCoverButtonWrapToWebElements(root) && caretDebugOn()) {
      logPageEditorCaret("layoutEffect[contentHtml]:cover-button-actions-cluster-migrate", {});
    }
    if (ENABLE_LEGACY_WEB_BLOCK_HTML_MIGRATIONS && migrateLegacyCoverAnnouncementToWebElements(root) && caretDebugOn()) {
      logPageEditorCaret("layoutEffect[contentHtml]:cover-announcement-web-elements-migrate", {});
    }
    if (ENABLE_LEGACY_WEB_BLOCK_HTML_MIGRATIONS && migrateLegacyCoverOrphanHeadingParagraphToWebElements(root) && caretDebugOn()) {
      logPageEditorCaret("layoutEffect[contentHtml]:cover-orphan-heading-paragraph-migrate", {});
    }
    ensureWorkPricingListItemCheckmarks(root);
    if (normalizeWebWorkPricingWebElementsIslandEditabilityInEditor(root) && caretDebugOn()) {
      logPageEditorCaret("layoutEffect[contentHtml]:work-pricing-web-elements-islands-editability", {});
    }
    if (normalizeWebCoverElementPlaceholders(root) && caretDebugOn()) {
      logPageEditorCaret("layoutEffect[contentHtml]:web-cover-placeholder-normalize", {});
    }
    normalizeWebCoverButtonAnchorsToSpans(root);
    if (ensureWebCoverToolbarInEditor(root) && caretDebugOn()) {
      logPageEditorCaret("layoutEffect[contentHtml]:web-cover-toolbar-upgrade", {});
    }
    if (ensureWebCarouselToolbarInEditor(root) && caretDebugOn()) {
      logPageEditorCaret("layoutEffect[contentHtml]:web-carousel-toolbar-upgrade", {});
    }
    if (ensureWebTimelineToolbarInEditor(root) && caretDebugOn()) {
      logPageEditorCaret("layoutEffect[contentHtml]:web-timeline-toolbar-upgrade", {});
    }
    if (ensureWebTextMediaToolbarInEditor(root) && caretDebugOn()) {
      logPageEditorCaret("layoutEffect[contentHtml]:web-text-media-toolbar-upgrade", {});
    }
    if (ensureWebTextBlockToolbarInEditor(root) && caretDebugOn()) {
      logPageEditorCaret("layoutEffect[contentHtml]:web-text-block-toolbar-upgrade", {});
    }
    if (ensureWebTextBlockV2ToolbarInEditor(root) && caretDebugOn()) {
      logPageEditorCaret("layoutEffect[contentHtml]:web-text-block-v2-toolbar-upgrade", {});
    }
    if (ensureWebArticleTextToolbarInEditor(root) && caretDebugOn()) {
      logPageEditorCaret("layoutEffect[contentHtml]:web-article-text-toolbar-upgrade", {});
    }
    if (ensureWebAccordionToolbarInEditor(root) && caretDebugOn()) {
      logPageEditorCaret("layoutEffect[contentHtml]:web-accordion-toolbar-upgrade", {});
    }
    if (ensureWebAccordionFaqItemsInRoot(root) && caretDebugOn()) {
      logPageEditorCaret("layoutEffect[contentHtml]:web-accordion-faq-markup", {});
    }
    syncWebAccordionPanelsForEditor(root);
    if (ensureWebSpacerToolbarInEditor(root) && caretDebugOn()) {
      logPageEditorCaret("layoutEffect[contentHtml]:web-spacer-toolbar-upgrade", {});
    }
    if (normalizeFeatureGridMessageLayoutsInEditor(root) && caretDebugOn()) {
      logPageEditorCaret("layoutEffect[contentHtml]:feature-grid-message-layout-normalize", {});
    }
    if (normalizeFeatureGridImageLayoutsInEditor(root) && caretDebugOn()) {
      logPageEditorCaret("layoutEffect[contentHtml]:feature-grid-image-layout-normalize", {});
    }
    if (normalizeWebFeatureGridHeadEditabilityInEditor(root) && caretDebugOn()) {
      logPageEditorCaret("layoutEffect[contentHtml]:feature-grid-head-editability", {});
    }
    if (assignFeatureGridWebTextBlockStackingOrderInEditor(root) && caretDebugOn()) {
      logPageEditorCaret("layoutEffect[contentHtml]:feature-grid-text-block-stack", {});
    }
    if (ensureWebInsertHandlesInEditor(root) && caretDebugOn()) {
      logPageEditorCaret("layoutEffect[contentHtml]:web-insert-handles-upgrade", {});
    }
    sanitizeLeakedNodesOutOfWebCovers(root);
    sanitizeLeakedNodesOutOfWebCarousels(root);
    sanitizeLeakedNodesOutOfWebTextMedia(root);
    sanitizeLeakedNodesOutOfWebTextBlocks(root);
    sanitizeLeakedNodesOutOfWebTextBlockV2(root);
    normalizeWebTextBlockV2AnnouncementPlaceholderAttrs(root);
    sanitizeLeakedNodesOutOfWebSpacers(root);
    sanitizeLeakedNodesOutOfWebAccordions(root);
    if (normalizeWebCarouselStripInEditor(root) && caretDebugOn()) {
      logPageEditorCaret("layoutEffect[contentHtml]:web-carousel-strip-normalize", {});
    }
    if (ensureWebCarouselShellNonEditableInEditor(root) && caretDebugOn()) {
      logPageEditorCaret("layoutEffect[contentHtml]:web-carousel-shell-non-editable", {});
    }
    if (normalizeWebCarouselAspectAttributes(root) && caretDebugOn()) {
      logPageEditorCaret("layoutEffect[contentHtml]:carousel-aspect-default", {});
    }
    if (normalizeWebCoverAspectAttributes(root) && caretDebugOn()) {
      logPageEditorCaret("layoutEffect[contentHtml]:cover-aspect-default", {});
    }
    if (normalizeWebCoverTypeAttributes(root) && caretDebugOn()) {
      logPageEditorCaret("layoutEffect[contentHtml]:cover-type-default", {});
    }
    root.querySelectorAll(".page-editor-table").forEach((t) => syncTableColgroup(t as HTMLTableElement));
    syncWebTextBlockV2FieldValuesForSerialization(root);
    const after = root.innerHTML;
    if (after !== before) {
      const afterNorm = stripWebTextBlockV2TextareaMeasurementStylesForCompare(after);
      const beforeNorm = stripWebTextBlockV2TextareaMeasurementStylesForCompare(before);
      if (afterNorm !== beforeNorm) {
      if (caretDebugOn()) {
        logPageEditorCaret("layoutEffect[contentHtml]:normalize-changed-html", {
          beforeLen: before.length,
            afterLen: after.length,
        });
      }
        setContentHtml(after);
    }
    }
    autosizeWebTextBlockV2Textareas(root);
    syncMarkerBold();
    updateToolbarState();
    highlightSelectedTableCells();

    const caretId = pendingEditorCaretRef.current;
    if (caretId) {
      const safeCaret = caretId.replace(/"/g, "");
      const tryRestore = (): boolean => {
        if (!editorRef.current) return false;
        const ed = editorRef.current;
        const target = ed.querySelector(`[data-editor-caret="${safeCaret}"]`) as HTMLElement | null;
        if (!target) {
          if (caretDebugOn()) {
            logPageEditorCaret("tryRestore:marker-NOT-FOUND", { safeCaret });
          }
          return false;
        }
        if (caretDebugOn()) {
          logPageEditorCaret("tryRestore:marker-FOUND", {
            liPreview: target.outerHTML?.slice(0, 180),
          });
        }
        target.removeAttribute("data-editor-caret");
        pendingEditorCaretRef.current = null;
        placeCaretAtLiStart(target, "layoutEffect-tryRestore");
        syncMarkerBold();
        // Critical: React state still had serialized HTML *with* data-editor-caret while the live DOM
        // no longer has it. Next layoutEffect pass would see innerHTML !== contentHtml and assign
        // root.innerHTML = contentHtml, recreating the whole editor tree and resetting the caret
        // (often to the first li or visually to the top padding).
        setContentHtml(ed.innerHTML);
        if (caretDebugOn()) {
          logPageEditorCaret("tryRestore:sync-state-after-marker-strip", {
            htmlLen: ed.innerHTML.length,
          });
        }
        return true;
      };
      if (!tryRestore()) {
        let rafAttempts = 0;
        const scheduleRetry = () => {
          requestAnimationFrame(() => {
            if (caretDebugOn()) {
              logPageEditorCaret("tryRestore:raf-retry", { attempt: rafAttempts + 1 });
            }
            if (tryRestore()) return;
            rafAttempts += 1;
            if (rafAttempts < 4) scheduleRetry();
            else {
              pendingEditorCaretRef.current = null;
              const edGiveUp = editorRef.current;
              edGiveUp?.querySelectorAll("[data-editor-caret]").forEach((n) => n.removeAttribute("data-editor-caret"));
              if (edGiveUp) setContentHtml(edGiveUp.innerHTML);
              if (caretDebugOn()) {
                logPageEditorCaret("tryRestore:GAVE-UP", { rafAttempts });
                snapshotSelection("layoutEffect[contentHtml]:after-give-up", editorRef.current);
              }
            }
          });
        };
        scheduleRetry();
      }
    }

    syncWebCarouselViewportInnerPx(root);
    if (webCarouselScrollAlignPendingRef.current) {
      alignAllWebCarouselViewportsInEditor(root);
    }
    requestAnimationFrame(() => {
      const ed2 = editorRef.current;
      if (ed2) {
        syncWebCarouselViewportInnerPx(ed2);
        if (webCarouselScrollAlignPendingRef.current) {
          alignAllWebCarouselViewportsInEditor(ed2);
        }
      }
      webCarouselScrollAlignPendingRef.current = false;
    });

    if (caretDebugOn()) {
      snapshotSelection("layoutEffect[contentHtml]:end", root);
      requestAnimationFrame(() => {
        snapshotSelection("layoutEffect[contentHtml]:rAF-after-1-frame", editorRef.current);
      });
    }
  }, [contentHtml, placeCaretAtLiStart]);

  useEffect(() => {
    const ed = editorRef.current;
    if (!ed) return;
    const runSyncOnly = () => syncWebCarouselViewportInnerPx(ed);
    const runSyncAndAlign = () => {
      syncWebCarouselViewportInnerPx(ed);
      alignAllWebCarouselViewportsInEditor(ed);
    };
    const ro = new ResizeObserver(runSyncAndAlign);
    ro.observe(ed);
    ed.querySelectorAll(".page-web-carousel-viewport").forEach((vp) => ro.observe(vp));
    runSyncOnly();
    return () => ro.disconnect();
  }, [contentHtml]);

  useEffect(() => {
    if (!coverSyncDebugOn()) return;
    const root = editorRef.current;
    if (!root) return;
    const id = window.requestAnimationFrame(() => {
      logEditorCoverSyncState(root, "contentHtml-change");
    });
    return () => window.cancelAnimationFrame(id);
  }, [contentHtml, loading]);

  useEffect(() => {
    const onSelectionChange = () => {
      updateToolbarState();
      highlightSelectedTableCells();
    };
    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setCellMenuViewport(null);
      setCellMenuRect(null);
      setCellMenuOpen(false);
    };
    const scrollEl = editorScrollRef.current;
    if (scrollEl) {
      scrollEl.addEventListener("scroll", onScroll, { passive: true });
    }
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    return () => {
      scrollEl?.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [contentHtml]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const drag = cellDragStartRef.current;
      if (!drag) return;
      const el = editorRef.current;
      if (!el) return;
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const endCell = (target as Element)?.closest?.("table.page-editor-table td") as HTMLTableCellElement | null;
      if (!endCell || endCell.closest("table") !== drag.table) return;
      if (endCell.getAttribute("contenteditable") === "true") return;
      const startPos = getCellPosition(drag.cell);
      const endPos = getCellPosition(endCell);
      if (!startPos || !endPos) return;
      el.querySelectorAll(".page-editor-table td[data-cell-selected]").forEach((td) =>
        td.removeAttribute("data-cell-selected")
      );
      setCellMenuRect(null);
      setCellMenuViewport(null);
      selectedCellRef.current = null;
      highlightCellsInRect(drag.table, startPos.row, startPos.col, endPos.row, endPos.col);
      applyCellSelectionFromHighlight();
    };
    const onMouseUp = () => {
      if (cellDragStartRef.current) {
        cellDragStartRef.current = null;
        updateToolbarState();
      }
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  function applyListStyle(value: string) {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const range = savedRangeRef.current;
    if (range) {
      try {
        if (el.contains(range.commonAncestorContainer)) {
          const sel = window.getSelection();
          if (sel) {
            sel.removeAllRanges();
            sel.addRange(range);
          }
        }
      } catch {
        // ignore
      }
    }
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const r = sel.getRangeAt(0);
    if (!el.contains(r.commonAncestorContainer)) return;
    const list = (r.commonAncestorContainer.nodeType === Node.TEXT_NODE
      ? r.commonAncestorContainer.parentElement
      : r.commonAncestorContainer) as Element | null;
    const listEl = list?.closest?.("ol, ul");
    if (listEl) {
      const html = listEl as HTMLElement;
      if (CUSTOM_LIST_STYLES.includes(value)) {
        html.style.listStyleType = "none";
        html.setAttribute("data-list-style", value);
      } else if (value === "none") {
        html.style.listStyleType = "none";
        html.setAttribute("data-list-style", "none");
      } else {
        html.style.listStyleType = value;
        html.removeAttribute("data-list-style");
      }
      splitMultiLineListItems();
      normalizeListContent();
      setContentHtml(el.innerHTML);
      setListStyleType(value);
    }
    setListStyleOpen(false);
  }

  function applyListColor(value: string) {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const range = savedRangeRef.current;
    if (range) {
      try {
        if (el.contains(range.commonAncestorContainer)) {
          const sel = window.getSelection();
          if (sel) {
            sel.removeAllRanges();
            sel.addRange(range);
          }
        }
      } catch {
        // ignore
      }
    }
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const r = sel.getRangeAt(0);
    if (!el.contains(r.commonAncestorContainer)) return;
    const list = (r.commonAncestorContainer.nodeType === Node.TEXT_NODE
      ? r.commonAncestorContainer.parentElement
      : r.commonAncestorContainer) as Element | null;
    const listEl = list?.closest?.("ol, ul");
    if (listEl) {
      const html = listEl as HTMLElement;
      if (value) html.setAttribute("data-list-color", value);
      else html.removeAttribute("data-list-color");
      splitMultiLineListItems();
      normalizeListContent();
      setContentHtml(el.innerHTML);
      setListColor(value);
    }
  }

  function applyListStart(value: number) {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const range = savedRangeRef.current;
    if (range) {
      try {
        if (el.contains(range.commonAncestorContainer)) {
          const sel = window.getSelection();
          if (sel) {
            sel.removeAllRanges();
            sel.addRange(range);
          }
        }
      } catch {
        // ignore
      }
    }
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const r = sel.getRangeAt(0);
    if (!el.contains(r.commonAncestorContainer)) return;
    const list = (r.commonAncestorContainer.nodeType === Node.TEXT_NODE
      ? r.commonAncestorContainer.parentElement
      : r.commonAncestorContainer) as Element | null;
    const listEl = list?.closest?.("ol");
    if (listEl) {
      const start = Math.max(1, Math.floor(value) || 1);
      const htmlList = listEl as HTMLElement;
      htmlList.setAttribute("start", String(start));
      // Якорь: не перетирать это значение глобальным пересчётом (любое число из диалога).
      htmlList.setAttribute("data-list-restart", "1");
      setContentHtml(el.innerHTML);
      setListStart(start);
    }
  }

  function insertTable(rows: number, cols: number) {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const range = savedRangeRef.current;
    if (range) {
      try {
        if (el.contains(range.commonAncestorContainer)) {
          const sel = window.getSelection();
          if (sel) {
            sel.removeAllRanges();
            sel.addRange(range);
          }
        }
      } catch {
        // ignore
      }
    }
    const r = Math.max(1, Math.min(10, rows));
    const c = Math.max(1, Math.min(10, cols));
    let html = '<table class="page-editor-table"><tbody>';
    for (let i = 0; i < r; i++) {
      html += "<tr>";
      for (let j = 0; j < c; j++) {
        html += '<td contenteditable="false"><br></td>';
      }
      html += "</tr>";
    }
    html += "</tbody></table>";
    document.execCommand("insertHTML", false, html);
    setContentHtml(el.innerHTML);
    setTableOpen(false);
    setTimeout(updateToolbarState, 0);
  }

  function getWebCoverAspectMenuHtml(): string {
    const cells = COVER_ASPECT_PRESETS.map((p) => {
      const svg = getCoverAspectPreviewSvg(p.arW, p.arH);
      return (
        '<button type="button" role="menuitem" class="page-web-cover-menu-aspect" contenteditable="false" tabindex="-1" data-set-cover-aspect="' +
        p.id +
        '" title="' +
        p.label +
        '">' +
        '<span class="page-web-cover-menu-aspect-preview">' +
        svg +
        '</span><span class="page-web-cover-menu-aspect-label">' +
        p.label +
        "</span></button>"
      );
    }).join("");
    return '<div class="page-web-cover-aspect-grid" role="group" aria-label="Соотношения сторон">' + cells + "</div>";
  }

  function getWebCoverElementsMenuHtml(): string {
    const items: { data: CoverInsertBlockKind; label: string }[] = [
      { data: "title", label: "Добавить заголовок" },
      { data: "subtitle", label: "Добавить подзаголовок" },
      { data: "button", label: "Добавить кнопку" },
      { data: "announcement", label: "Добавить плашку анонса" },
    ];
    const toggleBox =
      '<span class="page-web-text-block-v2-field-toggle-box inline-flex size-[18px] shrink-0 items-center justify-center rounded border border-slate-300 bg-white shadow-sm transition-colors" aria-hidden="true"></span>';
    const insertPart = items
      .map(
        (it) =>
          '<button type="button" role="menuitemcheckbox" class="page-web-cover-menu-insert-cover-el page-web-text-block-menu-element page-web-text-block-v2-field-toggle !flex w-full flex-row flex-nowrap items-center gap-2.5 rounded-md py-2 pl-2.5 pr-2 text-left text-[13px] font-medium text-slate-800 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40" contenteditable="false" tabindex="-1" data-insert-cover-element="' +
          it.data +
          '" aria-checked="false">' +
          toggleBox +
          '<span class="page-web-cover-menu-insert-cover-el-label min-w-0 flex-1 truncate text-slate-800">' +
          it.label +
          "</span></button>",
      )
      .join("");
    const secondaryToggle =
      '<button type="button" role="menuitemcheckbox" class="page-web-cover-menu-insert-cover-el page-web-text-block-menu-element page-web-text-block-v2-field-toggle !flex w-full flex-row flex-nowrap items-center gap-2.5 rounded-md py-2 pl-2.5 pr-2 text-left text-[13px] font-medium text-slate-800 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40" contenteditable="false" tabindex="-1" data-toggle-cover-button2="1" aria-checked="false">' +
      toggleBox +
      '<span class="page-web-cover-menu-insert-cover-el-label min-w-0 flex-1 truncate text-slate-800">Дополнительная кнопка</span></button>';
    return insertPart + secondaryToggle;
  }

  function getWebCoverTypeMenuHtml(): string {
    return COVER_TYPE_PRESETS.map((preset) => {
      return (
        '<button type="button" role="menuitemradio" class="page-web-cover-menu-type" contenteditable="false" tabindex="-1" data-set-cover-type="' +
        preset.id +
        '" aria-checked="false">' +
        '<span class="page-web-cover-menu-type-radio" aria-hidden="true"></span>' +
        '<span class="page-web-cover-menu-type-label">' +
        preset.label +
        "</span></button>"
      );
    }).join("");
  }

  function insertCoverBlockElement(cover: HTMLElement, kind: CoverInsertBlockKind, ed: HTMLElement) {
    const inner = cover.querySelector(".page-web-cover-inner") as HTMLElement | null;
    if (!inner || !ed.contains(inner)) return;

    inner.setAttribute("data-cover-unlocked", "1");
    inner.setAttribute("contenteditable", "true");

    let node: HTMLElement;
    if (kind === "title") {
      node = createCoverTitleIsland("Заголовок");
    } else if (kind === "announcement") {
      node = createCoverAnnouncementIsland("Анонс: мы запустили новый этап проекта.", { includeLearnMore: false });
    } else if (kind === "subtitle") {
      node = createCoverDescriptionIsland("Подзаголовок");
    } else {
      node = createCoverActionsIsland();
      inner.setAttribute("data-cover-show-button2", "1");
    }

    const onlyBr =
      inner.childNodes.length === 1 &&
      inner.firstChild?.nodeName === "BR" &&
      !(inner.textContent || "").replace(/\u200b/g, "").trim();
    if (onlyBr && inner.firstChild) inner.removeChild(inner.firstChild);

    insertCoverNodeByVisualOrder(inner, node, kind);

    requestAnimationFrame(() => {
      if (kind === "title") {
        const ta = node.querySelector("textarea.page-web-elements-title-input") as HTMLTextAreaElement | null;
        if (ta && ed.contains(ta)) {
          ta.focus();
          const len = ta.value.length;
          ta.setSelectionRange(len, len);
        }
        setTimeout(() => updateToolbarState(), 0);
        return;
      }
      if (kind === "announcement") {
        const ann = node.querySelector(".page-web-elements-announcement-input") as HTMLElement | null;
        if (ann && ed.contains(ann)) {
          ann.focus();
          const sel = window.getSelection();
          if (sel) {
            const r = document.createRange();
            r.selectNodeContents(ann);
            r.collapse(false);
            sel.removeAllRanges();
            try {
              sel.addRange(r);
            } catch {
              // ignore
            }
          }
          inner.focus();
          setTimeout(() => updateToolbarState(), 0);
        }
        return;
      }
      if (kind === "subtitle") {
        const ta = node.querySelector("textarea.page-web-elements-description-input") as HTMLTextAreaElement | null;
        if (ta && ed.contains(ta)) {
          ta.focus();
          const len = ta.value.length;
          ta.setSelectionRange(len, len);
        }
        setTimeout(() => updateToolbarState(), 0);
        return;
      }
      const sel = window.getSelection();
      if (!sel || !ed.contains(inner)) return;
      const r = document.createRange();
      if (kind === "button") {
        const targetTextNode =
          node.querySelector(".page-web-elements-cta-button")?.firstChild ??
          (node.querySelector("a.page-web-elements-cta-button") as HTMLElement | null)?.firstChild ??
          node.querySelector(".page-web-cover-el-button")?.firstChild;
        if (targetTextNode?.nodeType === Node.TEXT_NODE) {
          r.selectNodeContents(targetTextNode);
        } else {
          r.selectNodeContents(node);
          r.collapse(false);
        }
      } else {
        r.selectNodeContents(node);
      }
      sel.removeAllRanges();
      try {
        sel.addRange(r);
      } catch {
        // ignore
      }
      inner.focus();
      setTimeout(() => updateToolbarState(), 0);
    });
  }

  function toggleCoverBlockElement(cover: HTMLElement, kind: CoverInsertBlockKind, ed: HTMLElement) {
    const inner = cover.querySelector(".page-web-cover-inner") as HTMLElement | null;
    if (!inner || !ed.contains(inner)) return false;
    const existing = getCoverInsertElementNode(inner, kind);
    if (existing) {
      existing.remove();
      return true;
    }
    insertCoverBlockElement(cover, kind, ed);
    return true;
  }

  function getWebCoverToolbarHtml(): string {
    return (
      '<div class="page-web-cover-toolbar" contenteditable="false">' +
      getWebBlockMoveButtonHtml("up") +
      '<button type="button" class="page-web-cover-menu-trigger" tabindex="-1" aria-label="Меню баннера" aria-haspopup="true" title="Действия с баннером">' +
      '<span class="page-web-cover-menu-dots" aria-hidden="true"></span></button>' +
      getWebBlockMoveButtonHtml("down") +
      '<div role="menu" class="page-web-cover-menu-dropdown">' +
      '<div class="page-web-cover-menu-sub" contenteditable="false">' +
      '<button type="button" class="page-web-cover-menu-sub-trigger" tabindex="-1" aria-haspopup="true" aria-expanded="false">' +
      '<span class="page-web-cover-menu-sub-label">Размер баннера</span>' +
      '<span class="page-web-cover-menu-chevron" aria-hidden="true"></span></button>' +
      '<div role="menu" class="page-web-cover-menu-sub-panel">' +
      getWebCoverAspectMenuHtml() +
      "</div></div>" +
      '<div class="page-web-cover-menu-sub" contenteditable="false">' +
      '<button type="button" class="page-web-cover-menu-sub-trigger" tabindex="-1" aria-haspopup="true" aria-expanded="false">' +
      '<span class="page-web-cover-menu-sub-label">Тип баннера</span>' +
      '<span class="page-web-cover-menu-chevron" aria-hidden="true"></span></button>' +
      '<div role="menu" class="page-web-cover-menu-sub-panel page-web-cover-type-panel">' +
      getWebCoverTypeMenuHtml() +
      "</div></div>" +
      '<div class="page-web-cover-menu-sub" contenteditable="false">' +
      '<button type="button" class="page-web-cover-menu-sub-trigger" tabindex="-1" aria-haspopup="true" aria-expanded="false">' +
      '<span class="page-web-cover-menu-sub-label">Элементы</span>' +
      '<span class="page-web-cover-menu-chevron" aria-hidden="true"></span></button>' +
      '<div role="menu" class="page-web-cover-menu-sub-panel page-web-cover-elements-panel">' +
      getWebCoverElementsMenuHtml() +
      "</div></div>" +
      '<button type="button" role="menuitem" class="page-web-cover-menu-upload" contenteditable="false" tabindex="-1">Загрузить изображение</button>' +
      '<div class="page-web-cover-menu-sep" aria-hidden="true"></div>' +
      '<button type="button" role="menuitem" class="page-web-cover-menu-delete" contenteditable="false" tabindex="-1">Удалить баннер</button>' +
      "</div></div>"
    );
  }

  function getWebCoverBlobLayersHtml(): string {
    return (
      '<div class="page-web-cover-bg" contenteditable="false" aria-hidden="true">' +
      '<div class="page-web-cover-blob-layer page-web-cover-blob-layer--blue" contenteditable="false" aria-hidden="true">' +
      '<div class="page-web-cover-blob page-web-cover-blob--blue"></div>' +
      "</div>" +
      '<div class="page-web-cover-blob-layer page-web-cover-blob-layer--red" contenteditable="false" aria-hidden="true">' +
      '<div class="page-web-cover-blob page-web-cover-blob--red"></div>' +
      "</div>" +
      "</div>"
    );
  }

  function getWebElementHtml(kind: string): string {
    if (kind === "cover") {
      // Панель с меню только в редакторе; перед сохранением вырезается из HTML.
      return (
        '<div class="page-web-cover" data-web-element="cover" data-cover-type="hero" data-cover-aspect="1-8" data-cover-halign="center" data-cover-valign="middle" contenteditable="false">' +
        getWebCoverToolbarHtml() +
        getWebCoverBlobLayersHtml() +
        '<div class="page-web-cover-inner" contenteditable="false" data-cover-show-button2="1" title="Нажмите, чтобы отредактировать текст баннера">' +
        '<div class="page-web-elements page-web-elements-title" contenteditable="false">' +
        '<div class="page-web-elements-field-row" contenteditable="false">' +
        '<textarea class="page-web-elements-title-input" spellcheck="true" placeholder="Заголовок баннера" rows="1">' +
        escapeWebBlockHtmlText("Надежное решение для вашего проекта") +
        "</textarea></div></div>" +
        '<div class="page-web-elements page-web-elements-description" contenteditable="false">' +
        '<div class="page-web-elements-field-row" contenteditable="false">' +
        '<textarea class="page-web-elements-description-input" spellcheck="true" placeholder="Короткое описание" rows="1">' +
        escapeWebBlockHtmlText(
          "Короткое описание услуги: основные преимущества, сроки и ожидаемый результат для клиента.",
        ) +
        "</textarea></div></div>" +
        '<div class="page-web-elements-actions" contenteditable="false">' +
        '<div class="page-web-elements-actions-cluster" tabindex="-1">' +
        '<div class="page-web-elements page-web-elements-button" contenteditable="false">' +
        '<p class="page-web-elements-cta-wrap" contenteditable="false">' +
        '<a href="#" class="page-web-elements-cta-button">' +
        escapeWebBlockHtmlText("Кнопка") +
        "</a></p></div>" +
        '<div class="page-web-elements page-web-elements-button2" contenteditable="false">' +
        '<p class="page-web-elements-cta-wrap" contenteditable="false">' +
        '<a href="#" class="page-web-elements-cta-button-secondary">' +
        escapeWebBlockHtmlText("Дополнительно") +
        "</a></p></div></div></div>" +
        "</div>" +
        "</div>"
      );
    }
    if (kind === "carousel") {
      const slide = (n: number, active: boolean) =>
        '<div class="page-web-carousel-slide" contenteditable="false"' +
        (active ? ' data-carousel-active="1"' : "") +
        ">" +
        '<div class="page-web-carousel-slide-inner" contenteditable="false">' +
        '<div class="page-web-carousel-placeholder" contenteditable="false">Слайд ' +
        n +
        "</div></div></div>";
      return (
        '<div class="page-web-carousel" data-web-element="carousel" data-carousel-aspect="horizontal" contenteditable="false">' +
        getWebCarouselToolbarHtml() +
        '<button type="button" class="page-web-carousel-prev page-web-carousel-arrow" tabindex="-1" aria-label="Предыдущий слайд" contenteditable="false">‹</button>' +
        '<button type="button" class="page-web-carousel-next page-web-carousel-arrow" tabindex="-1" aria-label="Следующий слайд" contenteditable="false">›</button>' +
        '<div class="page-web-carousel-viewport" contenteditable="false">' +
        '<div class="page-web-carousel-strip" contenteditable="false">' +
        slide(1, true) +
        slide(2, false) +
        slide(3, false) +
        "</div></div></div>"
      );
    }
    if (kind === "timeline") {
      return (
        '<div class="page-web-timeline" data-web-element="timeline" contenteditable="false">' +
        getWebTimelineToolbarHtml() +
        '<div class="page-web-timeline-head" contenteditable="false">' +
        getWebTimelineHeadFieldsHtml() +
        "</div>" +
        '<div class="page-web-timeline-item">' +
        '<div class="page-web-timeline-dot" aria-hidden="true"></div>' +
        '<div class="page-web-timeline-content">' +
        getWebTimelineItemTitle2Html("Этап 1. Подготовка") +
        getWebTimelineItemStepDescriptionHtml("Сбор требований, анализ текущего процесса и постановка задач.") +
        "</div></div>" +
        '<div class="page-web-timeline-item">' +
        getWebTimelineItemTermHtml("3 дня") +
        '<div class="page-web-timeline-dot" aria-hidden="true"></div>' +
        '<div class="page-web-timeline-content">' +
        getWebTimelineItemTitle2Html("Этап 2. Реализация") +
        getWebTimelineItemStepDescriptionHtml("Выполнение работ и регулярная синхронизация по статусу.") +
        "</div></div>" +
        '<div class="page-web-timeline-item">' +
        getWebTimelineItemTermHtml("5 дней") +
        '<div class="page-web-timeline-dot" aria-hidden="true"></div>' +
        '<div class="page-web-timeline-content">' +
        getWebTimelineItemTitle2Html("Этап 3. Результат") +
        getWebTimelineItemStepDescriptionHtml("Проверка качества, финальные правки и передача результата.") +
        "</div></div>" +
        "</div>"
      );
    }
    if (kind === "text-block") {
      return getTextBlockHtml();
    }
    if (kind === "text-media") {
      return getTextMediaBlockHtml();
    }
    if (kind === "feature-grid") {
      return getFeatureGridTextBlockHtml();
    }
    if (kind === "work-pricing") {
      return getWorkPricingTextBlockHtml();
    }
    if (kind === "text-block-v2") {
      return getTextBlockV2Html();
    }
    if (kind === "article-text") {
      return getArticleTextHtml();
    }
    if (kind === "accordion") {
      return getAccordionHtml();
    }
    if (kind === "spacer") {
      return '<div class="page-web-spacer" data-web-element="spacer" data-spacer-size="md" contenteditable="false" aria-hidden="true"></div>';
    }
    return "";
  }

  function getWebCarouselToolbarHtml(): string {
    const imageTypeItems = CAROUSEL_IMAGE_TYPE_PRESETS.map(
      (p) =>
        '<button type="button" role="menuitemradio" class="page-web-carousel-menu-image-type" contenteditable="false" tabindex="-1" data-set-carousel-aspect="' +
        p.id +
        '" aria-checked="false">' +
        '<span class="page-web-carousel-menu-image-type-radio" aria-hidden="true"></span>' +
        '<span class="page-web-carousel-menu-image-type-label">' +
        p.label +
        "</span></button>"
    ).join("");
    return (
      '<div class="page-web-carousel-toolbar" contenteditable="false">' +
      getWebBlockMoveButtonHtml("up") +
      '<button type="button" class="page-web-carousel-menu-trigger" tabindex="-1" aria-label="Меню карусели" aria-haspopup="true" title="Действия с каруселью">' +
      '<span class="page-web-carousel-menu-dots" aria-hidden="true"></span></button>' +
      getWebBlockMoveButtonHtml("down") +
      '<div role="menu" class="page-web-carousel-menu-dropdown">' +
      '<div class="page-web-carousel-menu-sub" contenteditable="false">' +
      '<button type="button" class="page-web-carousel-menu-sub-trigger" tabindex="-1" aria-haspopup="true" aria-expanded="false">' +
      '<span class="page-web-carousel-menu-sub-label">Тип изображения</span>' +
      '<span class="page-web-carousel-menu-chevron" aria-hidden="true"></span></button>' +
      '<div role="menu" class="page-web-carousel-menu-sub-panel">' +
      imageTypeItems +
      "</div></div>" +
      '<button type="button" role="menuitem" class="page-web-carousel-menu-fullscreen" contenteditable="false" tabindex="-1">Полный просмотр</button>' +
      '<button type="button" role="menuitem" class="page-web-carousel-menu-upload-slide" contenteditable="false" tabindex="-1">Изображение в активный слайд</button>' +
      '<button type="button" role="menuitem" class="page-web-carousel-menu-add-slide" contenteditable="false" tabindex="-1">Добавить слайд</button>' +
      '<button type="button" role="menuitem" class="page-web-carousel-menu-remove-slide" contenteditable="false" tabindex="-1">Удалить активный слайд</button>' +
      '<div class="page-web-carousel-menu-sep" aria-hidden="true"></div>' +
      '<button type="button" role="menuitem" class="page-web-carousel-menu-delete" contenteditable="false" tabindex="-1">Удалить карусель</button>' +
      "</div></div>"
    );
  }

  function getWebTimelineToolbarHtml(): string {
    return (
      '<div class="page-web-timeline-toolbar" contenteditable="false">' +
      getWebBlockMoveButtonHtml("up") +
      '<button type="button" class="page-web-timeline-menu-trigger" tabindex="-1" aria-label="Меню таймлайна" aria-haspopup="true" title="Действия с таймлайном">' +
      '<span class="page-web-timeline-menu-dots" aria-hidden="true"></span></button>' +
      getWebBlockMoveButtonHtml("down") +
      '<div role="menu" class="page-web-timeline-menu-dropdown">' +
      '<button type="button" role="menuitem" class="page-web-timeline-menu-add-step" contenteditable="false" tabindex="-1">Добавить этап</button>' +
      '<button type="button" role="menuitem" class="page-web-timeline-menu-remove-step" contenteditable="false" tabindex="-1">Удалить последний этап</button>' +
      '<div class="page-web-timeline-menu-sep" aria-hidden="true"></div>' +
      '<button type="button" role="menuitem" class="page-web-timeline-menu-toggle-element" contenteditable="false" tabindex="-1" data-toggle-timeline-element="term">Убрать сроки</button>' +
      '<button type="button" role="menuitem" class="page-web-timeline-menu-toggle-element" contenteditable="false" tabindex="-1" data-toggle-timeline-element="title">Убрать заголовки</button>' +
      '<button type="button" role="menuitem" class="page-web-timeline-menu-toggle-element" contenteditable="false" tabindex="-1" data-toggle-timeline-element="text">Убрать описания</button>' +
      '<div class="page-web-timeline-menu-sep" aria-hidden="true"></div>' +
      '<button type="button" role="menuitem" class="page-web-timeline-menu-delete" contenteditable="false" tabindex="-1">Удалить таймлайн</button>' +
      "</div></div>"
    );
  }

  function syncTimelineToolbarMenuState(toolbar: HTMLElement) {
    const timeline = toolbar.closest(".page-web-timeline") as HTMLElement | null;
    if (!timeline) return;
    const showTerm = timeline.getAttribute("data-timeline-show-term") !== "0";
    const showTitle = timeline.getAttribute("data-timeline-show-title") !== "0";
    const showText = timeline.getAttribute("data-timeline-show-text") !== "0";
    const labels: Record<"term" | "title" | "text", string> = {
      term: showTerm ? "Убрать сроки" : "Показать сроки",
      title: showTitle ? "Убрать заголовки" : "Показать заголовки",
      text: showText ? "Убрать описания" : "Показать описания",
    };
    toolbar.querySelectorAll("[data-toggle-timeline-element]").forEach((node) => {
      const btn = node as HTMLElement;
      const kind = btn.getAttribute("data-toggle-timeline-element");
      if (kind === "term" || kind === "title" || kind === "text") {
        btn.textContent = labels[kind];
      }
    });
  }

  function getWebSpacerToolbarHtml(): string {
    return (
      '<div class="page-web-spacer-toolbar" contenteditable="false">' +
      getWebBlockMoveButtonHtml("up") +
      '<button type="button" class="page-web-spacer-menu-trigger" tabindex="-1" aria-label="Меню отступа" aria-haspopup="true" title="Действия с отступом">' +
      '<span class="page-web-spacer-menu-dots" aria-hidden="true"></span></button>' +
      getWebBlockMoveButtonHtml("down") +
      '<div role="menu" class="page-web-spacer-menu-dropdown">' +
      '<button type="button" role="menuitemradio" class="page-web-spacer-menu-size" contenteditable="false" tabindex="-1" data-set-spacer-size="sm" aria-checked="false">' +
      '<span class="page-web-spacer-menu-size-radio" aria-hidden="true"></span><span class="page-web-spacer-menu-size-label">Минимальный</span></button>' +
      '<button type="button" role="menuitemradio" class="page-web-spacer-menu-size" contenteditable="false" tabindex="-1" data-set-spacer-size="md" aria-checked="false">' +
      '<span class="page-web-spacer-menu-size-radio" aria-hidden="true"></span><span class="page-web-spacer-menu-size-label">Средний</span></button>' +
      '<button type="button" role="menuitemradio" class="page-web-spacer-menu-size" contenteditable="false" tabindex="-1" data-set-spacer-size="lg" aria-checked="false">' +
      '<span class="page-web-spacer-menu-size-radio" aria-hidden="true"></span><span class="page-web-spacer-menu-size-label">Большой</span></button>' +
      '<div class="page-web-spacer-menu-sep" aria-hidden="true"></div>' +
      '<button type="button" role="menuitem" class="page-web-spacer-menu-delete" contenteditable="false" tabindex="-1">Удалить отступ</button>' +
      "</div></div>"
    );
  }

  /**
   * Одна панель ⋮ на обложку: старый «×», отсутствие панели, или панель не прямой потомок (тогда раньше
   * вставлялась вторая копия).
   */
  function ensureWebCoverToolbarInEditor(root: HTMLElement): boolean {
    let changed = false;
    root.querySelectorAll(".page-web-cover").forEach((cov) => {
      const cover = cov as HTMLElement;
      cover.querySelectorAll(".page-web-cover-delete").forEach((n) => n.remove());

      const bars = Array.from(cover.querySelectorAll(".page-web-cover-toolbar")) as HTMLElement[];
      if (bars.length > 1) {
        const keep = bars.find((b) => b.parentElement === cover) ?? bars[0];
        for (const b of bars) {
          if (b !== keep) {
            b.remove();
            changed = true;
          }
        }
      }

      let toolbar = cover.querySelector(".page-web-cover-toolbar") as HTMLElement | null;
      if (!toolbar) {
        const tmp = document.createElement("div");
        tmp.innerHTML = getWebCoverToolbarHtml();
        toolbar = tmp.firstElementChild as HTMLElement;
        cover.insertBefore(toolbar, cover.firstChild);
        changed = true;
      } else if (toolbar.parentElement !== cover) {
        cover.insertBefore(toolbar, cover.firstChild);
        changed = true;
      }

      toolbar = cover.querySelector(".page-web-cover-toolbar") as HTMLElement | null;
      const inner = cover.querySelector(":scope > .page-web-cover-inner");
      if (toolbar && inner && (inner.compareDocumentPosition(toolbar) & Node.DOCUMENT_POSITION_FOLLOWING)) {
        cover.insertBefore(toolbar, inner);
        changed = true;
      }

      const legacyLayers = Array.from(cover.querySelectorAll(":scope > .page-web-cover-blob-layer")) as HTMLElement[];
      const bgWraps = Array.from(cover.querySelectorAll(":scope > .page-web-cover-bg")) as HTMLElement[];
      let bg = bgWraps[0] ?? null;
      if (bgWraps.length > 1) {
        for (const extra of bgWraps.slice(1)) {
          extra.remove();
          changed = true;
        }
      }
      if (!bg) {
        const tmp = document.createElement("div");
        tmp.innerHTML = getWebCoverBlobLayersHtml();
        bg = tmp.firstElementChild as HTMLElement;
        const anchor = (cover.querySelector(":scope > .page-web-cover-inner") as Node | null) ?? null;
        cover.insertBefore(bg, anchor);
        changed = true;
      }
      if (bg.parentElement !== cover) {
        const anchor = (cover.querySelector(":scope > .page-web-cover-inner") as Node | null) ?? null;
        cover.insertBefore(bg, anchor);
        changed = true;
      }
      if (legacyLayers.length > 0) {
        for (const l of legacyLayers) {
          bg.appendChild(l);
        }
        changed = true;
      }
      const layers = Array.from(bg.querySelectorAll(":scope > .page-web-cover-blob-layer")) as HTMLElement[];
      const keepBlue = layers.find((l) => l.classList.contains("page-web-cover-blob-layer--blue")) ?? null;
      const keepRed = layers.find((l) => l.classList.contains("page-web-cover-blob-layer--red")) ?? null;
      for (const l of layers) {
        const isBlue = l.classList.contains("page-web-cover-blob-layer--blue");
        const isRed = l.classList.contains("page-web-cover-blob-layer--red");
        if ((isBlue && keepBlue !== l) || (isRed && keepRed !== l) || (!isBlue && !isRed)) {
          l.remove();
          changed = true;
        }
      }
      const blueBlob = keepBlue?.querySelector(":scope > .page-web-cover-blob--blue");
      const redBlob = keepRed?.querySelector(":scope > .page-web-cover-blob--red");
      if (!keepBlue || !keepRed || !blueBlob || !redBlob) {
        const tmp = document.createElement("div");
        tmp.innerHTML = getWebCoverBlobLayersHtml();
        const fresh = tmp.firstElementChild as HTMLElement;
        bg.replaceWith(fresh);
        bg = fresh;
        changed = true;
      }
      const anchor = (cover.querySelector(":scope > .page-web-cover-inner") as Node | null) ?? null;
      if (anchor && (anchor.compareDocumentPosition(bg) & Node.DOCUMENT_POSITION_FOLLOWING)) {
        cover.insertBefore(bg, anchor);
        changed = true;
      }

      toolbar = cover.querySelector(".page-web-cover-toolbar") as HTMLElement | null;
      if (
        toolbar &&
        (!toolbar.querySelector(".page-web-cover-menu-sub") ||
          !toolbar.querySelector(".page-web-block-move-up") ||
          !toolbar.querySelector(".page-web-block-move-down") ||
          !toolbar.querySelector(".page-web-cover-aspect-grid") ||
          !toolbar.querySelector("[data-set-cover-aspect]") ||
          !toolbar.querySelector("[data-set-cover-type]") ||
          !toolbar.querySelector(".page-web-cover-menu-upload") ||
          !toolbar.querySelector("[data-insert-cover-element]"))
      ) {
        const tmp = document.createElement("div");
        tmp.innerHTML = getWebCoverToolbarHtml();
        const fresh = tmp.firstElementChild as HTMLElement;
        toolbar.replaceWith(fresh);
        changed = true;
      }
    });
    return changed;
  }

  function ensureWebCarouselToolbarInEditor(root: HTMLElement): boolean {
    let changed = false;
    root.querySelectorAll(".page-web-carousel").forEach((c) => {
      const carousel = c as HTMLElement;
      let toolbar = carousel.querySelector(":scope > .page-web-carousel-toolbar") as HTMLElement | null;
      if (!toolbar) {
        const tmp = document.createElement("div");
        tmp.innerHTML = getWebCarouselToolbarHtml();
        toolbar = tmp.firstElementChild as HTMLElement;
        carousel.insertBefore(toolbar, carousel.firstChild);
        changed = true;
      } else if (toolbar.parentElement !== carousel || carousel.firstElementChild !== toolbar) {
        carousel.insertBefore(toolbar, carousel.firstChild);
        changed = true;
      }
      toolbar = carousel.querySelector(".page-web-carousel-toolbar") as HTMLElement | null;
      if (
        toolbar &&
        (!toolbar.querySelector(".page-web-carousel-menu-sub") ||
          !toolbar.querySelector(".page-web-block-move-up") ||
          !toolbar.querySelector(".page-web-block-move-down") ||
          !toolbar.querySelector("[data-set-carousel-aspect]") ||
          !toolbar.querySelector(".page-web-carousel-menu-fullscreen") ||
          !toolbar.querySelector(".page-web-carousel-menu-upload-slide") ||
          !toolbar.querySelector(".page-web-carousel-menu-add-slide") ||
          !toolbar.querySelector(".page-web-carousel-menu-delete"))
      ) {
        const tmp = document.createElement("div");
        tmp.innerHTML = getWebCarouselToolbarHtml();
        const fresh = tmp.firstElementChild as HTMLElement;
        toolbar.replaceWith(fresh);
        changed = true;
      }
    });
    return changed;
  }

  function ensureWebTimelineToolbarInEditor(root: HTMLElement): boolean {
    let changed = false;
    root.querySelectorAll(".page-web-timeline").forEach((t) => {
      const timeline = t as HTMLElement;
      if (timeline.getAttribute("contenteditable") !== "false") {
        timeline.setAttribute("contenteditable", "false");
        changed = true;
      }
      const headEl = timeline.querySelector(":scope > .page-web-timeline-head") as HTMLElement | null;
      if (headEl && headEl.getAttribute("contenteditable") !== "false") {
        headEl.setAttribute("contenteditable", "false");
        changed = true;
      }
      if (!ENABLE_LEGACY_WEB_BLOCK_HTML_MIGRATIONS && stripLegacyTimelineDom(timeline)) changed = true;
      if (ENABLE_LEGACY_WEB_BLOCK_HTML_MIGRATIONS && migrateLegacyTimelineHeadToWebElements(timeline)) changed = true;
      if (ENABLE_LEGACY_WEB_BLOCK_HTML_MIGRATIONS && migrateLegacyTimelineItemsToWebElements(timeline)) changed = true;
      const items = Array.from(timeline.querySelectorAll(".page-web-timeline-item")) as HTMLElement[];
      // Remove empty tail items to avoid a "line tail" after the last real step.
      if (ENABLE_LEGACY_WEB_BLOCK_HTML_MIGRATIONS) {
        for (let i = items.length - 1; i >= 1; i -= 1) {
          const item = items[i];
          const titleText = getTimelineItemStepTitlePlain(item);
          const bodyText = getTimelineItemStepBodyPlain(item);
          if (titleText || bodyText) break;
          item.remove();
          changed = true;
        }
      }
      const normalizedItems = Array.from(timeline.querySelectorAll(".page-web-timeline-item")) as HTMLElement[];
      const stepsCount = Math.max(1, normalizedItems.length);
      if (timeline.style.getPropertyValue("--timeline-cols") !== String(stepsCount)) {
        timeline.style.setProperty("--timeline-cols", String(stepsCount));
        changed = true;
      }
      const cleanTimelineText = (text: string): string =>
        text
          .replace(/[\u200B-\u200D\uFEFF]/g, "")
          .replace(/\s+/g, " ")
          .trim();
      const isRealTimelineItem = (item: HTMLElement): boolean => {
        const titleText = cleanTimelineText(getTimelineItemStepTitlePlain(item));
        const bodyText = cleanTimelineText(getTimelineItemStepBodyPlain(item));
        return Boolean(titleText || bodyText);
      };
      normalizedItems.forEach((item, idx) => {
        let hasNextReal = false;
        for (let j = idx + 1; j < normalizedItems.length; j += 1) {
          if (isRealTimelineItem(normalizedItems[j])) {
            hasNextReal = true;
            break;
          }
        }
        const nextVal = hasNextReal && isRealTimelineItem(item) ? "1" : "0";
        if (item.getAttribute("data-timeline-has-next") !== nextVal) {
          item.setAttribute("data-timeline-has-next", nextVal);
          changed = true;
        }
      });
      normalizedItems.forEach((item) => {
        const term = item.querySelector(":scope > .page-web-timeline-term") as HTMLElement | null;
        if (!term) {
          const tmpTerm = document.createElement("div");
          tmpTerm.innerHTML = getWebTimelineItemTermHtml("1 неделя");
          const termNode = tmpTerm.firstElementChild;
          if (termNode) {
            item.insertBefore(termNode, item.firstChild);
            changed = true;
          }
        }
      });
      applyTimelineLineGeometry(timeline);
      let toolbar = timeline.querySelector(":scope > .page-web-timeline-toolbar") as HTMLElement | null;
      if (!toolbar) {
        const tmp = document.createElement("div");
        tmp.innerHTML = getWebTimelineToolbarHtml();
        toolbar = tmp.firstElementChild as HTMLElement;
        timeline.insertBefore(toolbar, timeline.firstChild);
        changed = true;
      } else if (toolbar.parentElement !== timeline || timeline.firstElementChild !== toolbar) {
        timeline.insertBefore(toolbar, timeline.firstChild);
        changed = true;
      }
      toolbar = timeline.querySelector(".page-web-timeline-toolbar") as HTMLElement | null;
      if (
        toolbar &&
        (!toolbar.querySelector(".page-web-timeline-menu-add-step") ||
          !toolbar.querySelector(".page-web-block-move-up") ||
          !toolbar.querySelector(".page-web-block-move-down") ||
          !toolbar.querySelector('[data-toggle-timeline-element="term"]') ||
          !toolbar.querySelector('[data-toggle-timeline-element="title"]') ||
          !toolbar.querySelector('[data-toggle-timeline-element="text"]') ||
          !toolbar.querySelector(".page-web-timeline-menu-remove-step") ||
          !toolbar.querySelector(".page-web-timeline-menu-delete"))
      ) {
        const tmp = document.createElement("div");
        tmp.innerHTML = getWebTimelineToolbarHtml();
        const fresh = tmp.firstElementChild as HTMLElement;
        toolbar.replaceWith(fresh);
        changed = true;
      }
      toolbar = timeline.querySelector(".page-web-timeline-toolbar") as HTMLElement | null;
      if (toolbar) syncTimelineToolbarMenuState(toolbar);
    });
    return changed;
  }

  function ensureWebTextMediaToolbarInEditor(root: HTMLElement): boolean {
    let changed = false;
    root.querySelectorAll(".page-web-text-media").forEach((n) => {
      const block = n as HTMLElement;
      let toolbar = block.querySelector(":scope > .page-web-text-media-toolbar") as HTMLElement | null;
      if (!toolbar) {
        const tmp = document.createElement("div");
        tmp.innerHTML = getWebTextMediaToolbarHtml();
        toolbar = tmp.firstElementChild as HTMLElement;
        block.insertBefore(toolbar, block.firstChild);
        changed = true;
      } else if (toolbar.parentElement !== block || block.firstElementChild !== toolbar) {
        block.insertBefore(toolbar, block.firstChild);
        changed = true;
      }
      toolbar = block.querySelector(".page-web-text-media-toolbar") as HTMLElement | null;
      if (
        toolbar &&
        (!toolbar.querySelector(".page-web-text-media-menu-trigger") ||
          !toolbar.querySelector(".page-web-block-move-up") ||
          !toolbar.querySelector(".page-web-block-move-down") ||
          !toolbar.querySelector(".page-web-text-media-menu-delete"))
      ) {
        const tmp = document.createElement("div");
        tmp.innerHTML = getWebTextMediaToolbarHtml();
        const fresh = tmp.firstElementChild as HTMLElement;
        toolbar.replaceWith(fresh);
        changed = true;
      }
    });
    return changed;
  }

  function ensureWebTextBlockToolbarInEditor(root: HTMLElement): boolean {
    let changed = false;
    root.querySelectorAll(".page-web-text-block").forEach((n) => {
      const block = n as HTMLElement;
      if (block.getAttribute("contenteditable") !== "false") {
        block.setAttribute("contenteditable", "false");
        changed = true;
      }
      let toolbar = block.querySelector(":scope > .page-web-text-block-toolbar") as HTMLElement | null;
      if (!toolbar) {
        const tmp = document.createElement("div");
        tmp.innerHTML = getWebTextBlockToolbarHtml();
        toolbar = tmp.firstElementChild as HTMLElement;
        block.insertBefore(toolbar, block.firstChild);
        changed = true;
      } else if (toolbar.parentElement !== block || block.firstElementChild !== toolbar) {
        block.insertBefore(toolbar, block.firstChild);
        changed = true;
      }
      let content = block.querySelector(":scope > .page-web-text-block-content") as HTMLElement | null;
      if (!content) {
        content = document.createElement("div");
        content.className = "page-web-text-block-content";
        content.setAttribute("contenteditable", "true");
        const movable = Array.from(block.childNodes).filter((ch) => ch !== toolbar);
        movable.forEach((ch) => content?.appendChild(ch));
        if (!(content.textContent || "").trim() && !content.querySelector("img,table,ul,ol,iframe,video")) {
          const isVariant =
            block.getAttribute("data-text-block-variant") === "feature-grid" ||
            block.getAttribute("data-text-block-variant") === "work-pricing";
          content.innerHTML = isVariant
            ? "<p></p>"
            : "<p>Добавьте основной текст блока. Подходит для обычного контента страницы.</p>";
        }
        block.appendChild(content);
        changed = true;
      } else {
        if (content.parentElement !== block || block.lastElementChild !== content) {
          block.appendChild(content);
          changed = true;
        }
        if (content.getAttribute("contenteditable") !== "true") {
          content.setAttribute("contenteditable", "true");
          changed = true;
        }
      }
      toolbar = block.querySelector(".page-web-text-block-toolbar") as HTMLElement | null;
      if (
        toolbar &&
        (!toolbar.querySelector(".page-web-text-block-menu-trigger") ||
          !toolbar.querySelector(".page-web-block-move-up") ||
          !toolbar.querySelector(".page-web-block-move-down") ||
          !toolbar.querySelector(".page-web-text-block-menu-delete") ||
          !toolbar.querySelector(".page-web-text-block-menu-sub-trigger") ||
          !toolbar.querySelector('[data-plain-text-block-field="subtitle"]') ||
          !toolbar.querySelector('[data-plain-text-block-field="title"]') ||
          !toolbar.querySelector(".page-web-text-block-menu-sub--feature-grid-block-elements") ||
          !toolbar.querySelector(".page-web-text-block-menu-sub--feature-grid-card-elements") ||
          !toolbar.querySelector(".page-web-text-block-menu-sub--feature-grid-card-grid") ||
          !toolbar.querySelector(".page-web-text-block-menu-sub--feature-grid-card-icons") ||
          !toolbar.querySelector('[data-feature-grid-block-toggle="cards"]') ||
          !toolbar.querySelector('[data-toggle-feature-grid-element="title"]') ||
          !toolbar.querySelector('[data-feature-grid-set-cols="4"]') ||
          !toolbar.querySelector('[data-feature-grid-card-field-toggle="title2"]') ||
          !toolbar.querySelector('[data-feature-grid-card-decoration="none"]') ||
          !toolbar.querySelector('[data-feature-grid-image-position="right"]') ||
          !toolbar.querySelector('[data-feature-grid-image-display="background"]'))
      ) {
        const tmp = document.createElement("div");
        tmp.innerHTML = getWebTextBlockToolbarHtml();
        const fresh = tmp.firstElementChild as HTMLElement;
        toolbar.replaceWith(fresh);
        changed = true;
      }
      if (isPlainWebTextBlock(block)) {
        if (ensurePlainTextBlockFieldShell(block)) changed = true;
        if (ENABLE_LEGACY_WEB_BLOCK_HTML_MIGRATIONS && migrateLegacyPlainTextBlockFieldsToWebElements(block)) changed = true;
        const plainFields = block.querySelector(":scope > .page-web-text-block-fields") as HTMLElement | null;
        if (plainFields && normalizePlainTextBlockFieldTextareas(plainFields)) changed = true;
        if (ensurePlainTextBlockSubtitleFieldWrap(block)) changed = true;
        if (ENABLE_LEGACY_WEB_BLOCK_HTML_MIGRATIONS && migrateLegacyPlainTextBlockHeadingIntoFields(block)) changed = true;
        if (reorderPlainTextBlockFieldsBeforeContent(block)) changed = true;
      }
      toolbar = block.querySelector(".page-web-text-block-toolbar") as HTMLElement | null;
      if (toolbar) {
        const variant = block.getAttribute("data-text-block-variant") || "";
        if (toolbar.getAttribute("data-text-block-variant") !== variant) {
          toolbar.setAttribute("data-text-block-variant", variant);
          changed = true;
        }
        syncTextBlockToolbarVariantState(toolbar);
      }
    });
    return changed;
  }

  function ensureWebTextBlockV2ToolbarInEditor(root: HTMLElement): boolean {
    let changed = false;
    /** Порядок: … → короткое описание → ряд кнопок (основная + доп.). */
    function ensureWebTextBlockV2FieldWraps(fields: HTMLElement): boolean {
      let mutated = false;
      const tmp = document.createElement("div");
      tmp.innerHTML = getTextBlockV2Html();
      const sampleFields = tmp.querySelector(".page-web-text-block-v2-fields") as HTMLElement | null;
      if (!sampleFields) return false;
      for (const key of WEB_TEXT_BLOCK_V2_FIELD_KEYS) {
        const wrapSel = `.page-web-elements-${key}`;
        if (fields.querySelector(wrapSel)) continue;
        const sample = sampleFields.querySelector(wrapSel) as HTMLElement | null;
        if (!sample) continue;
        const clone = sample.cloneNode(true) as HTMLElement;
        if (key === "button" || key === "button2") {
          let row = fields.querySelector(":scope > .page-web-elements-actions") as HTMLElement | null;
          if (!row) {
            row = document.createElement("div");
            row.className = "page-web-elements-actions";
            row.setAttribute("contenteditable", "false");
            fields.appendChild(row);
            mutated = true;
          }
          let cluster = row.querySelector(":scope > .page-web-elements-actions-cluster") as HTMLElement | null;
          if (!cluster) {
            cluster = document.createElement("div");
            cluster.className = "page-web-elements-actions-cluster";
            cluster.setAttribute("tabindex", "-1");
            while (row.firstChild) cluster.appendChild(row.firstChild);
            row.appendChild(cluster);
            mutated = true;
          }
          cluster.appendChild(clone);
        } else {
          fields.appendChild(clone);
        }
        mutated = true;
      }
      return mutated;
    }

    /** Старые блоки: две кнопки сразу в fields — оборачиваем в ряд; «осыпавшиеся» обёртки возвращаем в ряд. */
    function normalizeWebTextBlockV2CtaRowStructure(fields: HTMLElement): boolean {
      let mutated = false;
      const row =
        (fields.querySelector(":scope > .page-web-elements-actions") as HTMLElement | null) ??
        null;
      const looseBtn = fields.querySelector(":scope > .page-web-elements-button") as HTMLElement | null;
      const looseBtn2 = fields.querySelector(":scope > .page-web-elements-button2") as HTMLElement | null;
      if (looseBtn && looseBtn2 && looseBtn.parentElement === fields && looseBtn2.parentElement === fields) {
        const newRow = document.createElement("div");
        newRow.className = "page-web-elements-actions";
        newRow.setAttribute("contenteditable", "false");
        fields.insertBefore(newRow, looseBtn);
        const cluster = document.createElement("div");
        cluster.className = "page-web-elements-actions-cluster";
        cluster.setAttribute("tabindex", "-1");
        cluster.appendChild(looseBtn);
        cluster.appendChild(looseBtn2);
        newRow.appendChild(cluster);
        return true;
      }
      if (row) {
        let cluster = row.querySelector(":scope > .page-web-elements-actions-cluster") as HTMLElement | null;
        if (looseBtn && looseBtn.parentElement === fields) {
          if (cluster) cluster.insertBefore(looseBtn, cluster.firstChild);
          else row.insertBefore(looseBtn, row.firstChild);
          mutated = true;
        }
        if (looseBtn2 && looseBtn2.parentElement === fields) {
          if (!cluster) cluster = row.querySelector(":scope > .page-web-elements-actions-cluster") as HTMLElement | null;
          (cluster ?? row).appendChild(looseBtn2);
          mutated = true;
        }
        if (ensureWebElementsActionsCluster(row)) mutated = true;
      }
      return mutated;
    }

    /** Старые блоки: textarea / pill / без strip / лишний тулбар у плашки — приводим к row + strip + input. */
    function normalizeWebTextBlockV2AnnouncementMarkup(fields: HTMLElement): boolean {
      const wrap = fields.querySelector(
        ":scope > .page-web-elements-announcement",
      ) as HTMLElement | null;
      if (!wrap) return false;
      const block = fields.closest(".page-web-text-block-v2") as HTMLElement | null;
      const tmp = document.createElement("div");
      tmp.innerHTML = getTextBlockV2Html();
      const sampleWrap = tmp.querySelector(".page-web-elements-announcement") as HTMLElement | null;
      if (!sampleWrap) return false;

      const rebuildFromSample = (keptFrom?: HTMLElement | null): boolean => {
        const oldField = (keptFrom ??
          wrap.querySelector(".page-web-elements-announcement-input")) as
          | HTMLElement
          | HTMLTextAreaElement
          | null;
        const kept =
          oldField instanceof HTMLTextAreaElement
            ? oldField.value
            : oldField
              ? (oldField.innerText ?? "").replace(/\u200b/g, "")
              : "";
        wrap.innerHTML = sampleWrap.innerHTML;
        const newField = wrap.querySelector(".page-web-elements-announcement-input") as HTMLElement | null;
        if (newField && kept !== "") newField.textContent = kept;
        return true;
      };

      let mutated = false;
      const row = wrap.querySelector(":scope > .page-web-elements-announcement-row") as HTMLElement | null;
      if (!row) return rebuildFromSample();

      row.querySelectorAll(":scope > .page-web-elements-announcement-toolbar").forEach((n) => {
        n.remove();
        mutated = true;
      });

      const shell = row.querySelector(":scope > .page-web-elements-announcement-input-shell") as HTMLElement | null;
      if (!shell) return rebuildFromSample();

      let strip = shell.querySelector(":scope > .page-web-elements-announcement-strip") as HTMLElement | null;
      if (!strip) {
        strip = document.createElement("div");
        strip.className = "page-web-elements-announcement-strip";
        strip.setAttribute("contenteditable", "false");
        const inputMove = shell.querySelector(".page-web-elements-announcement-input") as HTMLElement | null;
        if (inputMove) {
          shell.insertBefore(strip, inputMove);
          strip.appendChild(inputMove);
        } else {
          shell.appendChild(strip);
        }
        mutated = true;
      }

      let field = strip.querySelector(".page-web-elements-announcement-input") as HTMLElement | null;
      if (!field) {
        field = shell.querySelector(".page-web-elements-announcement-input") as HTMLElement | null;
      }
      if (!field) return rebuildFromSample();
      if (field.parentElement !== strip) {
        strip.insertBefore(field, strip.firstChild);
        mutated = true;
      }

      wrap.querySelectorAll(".page-web-elements-announcement-learn-more").forEach((node) => {
        const lm = node as HTMLElement;
        if (lm.parentElement !== strip) {
          strip!.appendChild(lm);
          mutated = true;
        }
      });
      const dupes = strip.querySelectorAll(".page-web-elements-announcement-learn-more");
      if (dupes.length > 1) {
        for (let i = 1; i < dupes.length; i++) dupes[i].remove();
        mutated = true;
      }

      if (field.getAttribute("contenteditable") !== "true" || field instanceof HTMLTextAreaElement) {
        return rebuildFromSample(field);
      }

      if (block) {
        const hasLm = !!strip.querySelector(".page-web-elements-announcement-learn-more");
        const want = hasLm ? "1" : "0";
        if (block.getAttribute("data-v2-announcement-learn-more") !== want) {
          block.setAttribute("data-v2-announcement-learn-more", want);
          mutated = true;
        }
      }

      return mutated;
    }

    /** Раньше text-align вешали на contenteditable с display:inline — не работало; держим на строке. */
    function normalizeWebTextBlockV2AnnouncementRowAlignment(fields: HTMLElement): boolean {
      const wrap = fields.querySelector(
        ":scope > .page-web-elements-announcement",
      ) as HTMLElement | null;
      if (!wrap) return false;
      const row = wrap.querySelector(":scope > .page-web-elements-announcement-row") as HTMLElement | null;
      const field = wrap.querySelector(".page-web-elements-announcement-input") as HTMLElement | null;
      if (!row || !field || field instanceof HTMLTextAreaElement) return false;
      const raw = (field.style.textAlign || "").trim().toLowerCase();
      if (raw !== "center" && raw !== "right" && raw !== "left") return false;
      if (!row.style.getPropertyValue("text-align")) row.style.textAlign = raw;
      field.style.removeProperty("text-align");
      return true;
    }

    function normalizeWebTextBlockV2FieldControls(fields: HTMLElement): boolean {
      let mutated = false;
      const legacyAnn = fields.querySelector(".page-web-elements-announcement-input");
      if (legacyAnn instanceof HTMLTextAreaElement) {
        const div = document.createElement("div");
        div.className = legacyAnn.className;
        div.setAttribute("contenteditable", "true");
        div.setAttribute("spellcheck", legacyAnn.getAttribute("spellcheck") ?? "true");
        div.setAttribute("role", "textbox");
        div.setAttribute("aria-multiline", "true");
        div.setAttribute("data-placeholder", legacyAnn.getAttribute("placeholder") ?? "Анонс");
        div.textContent = legacyAnn.value ?? "";
        if (legacyAnn.getAttribute(PAGE_EDITOR_FOCUS_TARGET_ATTR) === "1") {
          div.setAttribute(PAGE_EDITOR_FOCUS_TARGET_ATTR, "1");
        }
        legacyAnn.replaceWith(div);
        mutated = true;
      }
      const defs: Array<{ selector: string; rows: number }> = [
        { selector: ".page-web-elements-subtitle-input", rows: 1 },
        { selector: ".page-web-elements-title-input", rows: 1 },
        { selector: ".page-web-elements-title2-input", rows: 1 },
        { selector: ".page-web-elements-description-input", rows: 1 },
      ];
      defs.forEach(({ selector, rows }) => {
        const node = fields.querySelector(selector);
        if (!node) return;
        if (node instanceof HTMLInputElement) {
          const ta = document.createElement("textarea");
          ta.className = node.className;
          ta.setAttribute("spellcheck", node.getAttribute("spellcheck") ?? "true");
          ta.setAttribute("placeholder", node.getAttribute("placeholder") ?? "");
          ta.setAttribute("rows", String(rows));
          ta.value = node.value ?? "";
          if (node.style.textAlign) ta.style.textAlign = node.style.textAlign;
          if (node.getAttribute(PAGE_EDITOR_FOCUS_TARGET_ATTR) === "1") {
            ta.setAttribute(PAGE_EDITOR_FOCUS_TARGET_ATTR, "1");
          }
          node.replaceWith(ta);
          mutated = true;
          return;
        }
        if (node instanceof HTMLTextAreaElement) {
          if (node.getAttribute("rows") !== String(rows)) {
            node.setAttribute("rows", String(rows));
            mutated = true;
          }
        }
      });
      for (const kind of ["subtitle", "title", "title2", "description"] as const) {
        const wrap = fields.querySelector(`:scope > .page-web-elements-${kind}`) as HTMLElement | null;
        if (wrap && ensureWebElementsTextFieldRowWrap(wrap)) mutated = true;
      }
      return mutated;
    }

    function reorderWebTextBlockV2FieldChildren(fields: HTMLElement): boolean {
      let moved = false;
      const announcementWrap = fields.querySelector(
        ":scope > .page-web-elements-announcement",
      ) as HTMLElement | null;
      const subtitleWrap = fields.querySelector(
        ":scope > .page-web-elements-subtitle",
      ) as HTMLElement | null;
      const titleWrap = fields.querySelector(
        ":scope > .page-web-elements-title",
      ) as HTMLElement | null;
      const title2Wrap = fields.querySelector(
        ":scope > .page-web-elements-title2",
      ) as HTMLElement | null;
      const descriptionWrap = fields.querySelector(
        ":scope > .page-web-elements-description",
      ) as HTMLElement | null;
      const ctaRow = fields.querySelector(":scope > .page-web-elements-actions") as HTMLElement | null;
      if (!announcementWrap || !subtitleWrap || !titleWrap || !title2Wrap || !descriptionWrap || !ctaRow)
        return false;
      if (fields.firstElementChild !== announcementWrap) {
        fields.insertBefore(announcementWrap, fields.firstChild);
        moved = true;
      }
      if (announcementWrap.nextElementSibling !== subtitleWrap) {
        fields.insertBefore(subtitleWrap, announcementWrap.nextElementSibling);
        moved = true;
      }
      if (subtitleWrap.nextElementSibling !== titleWrap) {
        fields.insertBefore(titleWrap, subtitleWrap.nextElementSibling);
        moved = true;
      }
      if (titleWrap.nextElementSibling !== title2Wrap) {
        fields.insertBefore(title2Wrap, titleWrap.nextElementSibling);
        moved = true;
      }
      if (title2Wrap.nextElementSibling !== descriptionWrap) {
        fields.insertBefore(descriptionWrap, title2Wrap.nextElementSibling);
        moved = true;
      }
      if (descriptionWrap.nextElementSibling !== ctaRow) {
        fields.insertBefore(ctaRow, descriptionWrap.nextElementSibling);
        moved = true;
      }
      if (fields.lastElementChild !== ctaRow) {
        fields.appendChild(ctaRow);
        moved = true;
      }
      return moved;
    }

    function reorderWebTextBlockV2ShellChildren(block: HTMLElement): boolean {
      let moved = false;
      const toolbar = block.querySelector(":scope > .page-web-text-block-v2-toolbar") as HTMLElement | null;
      const fields = block.querySelector(":scope > .page-web-text-block-v2-fields") as HTMLElement | null;
      const handle = block.querySelector(":scope > .page-web-insert-handle") as HTMLElement | null;
      if (!toolbar || !fields) return false;
      if (block.firstElementChild !== toolbar) {
        block.insertBefore(toolbar, block.firstChild);
        moved = true;
      }
      if (toolbar.nextElementSibling !== fields) {
        block.insertBefore(fields, toolbar.nextElementSibling);
        moved = true;
      }
      if (handle && block.lastElementChild !== handle) {
        block.appendChild(handle);
        moved = true;
      }
      return moved;
    }
    root.querySelectorAll(".page-web-text-block-v2").forEach((n) => {
      const block = n as HTMLElement;
      block.querySelectorAll(".page-web-text-block-v2-content").forEach((legacy) => {
        legacy.remove();
        changed = true;
      });
      if (block.getAttribute("contenteditable") !== "false") {
        block.setAttribute("contenteditable", "false");
        changed = true;
      }
      let toolbar = block.querySelector(":scope > .page-web-text-block-v2-toolbar") as HTMLElement | null;
      if (!toolbar) {
        const tmp = document.createElement("div");
        tmp.innerHTML = getWebTextBlockV2ToolbarHtml();
        toolbar = tmp.firstElementChild as HTMLElement;
        block.insertBefore(toolbar, block.firstChild);
        changed = true;
      } else if (toolbar.parentElement !== block || block.firstElementChild !== toolbar) {
        block.insertBefore(toolbar, block.firstChild);
        changed = true;
      }
      toolbar = block.querySelector(".page-web-text-block-v2-toolbar") as HTMLElement | null;
      if (
        toolbar &&
        (!toolbar.querySelector(".page-web-text-block-v2-menu-trigger") ||
          !toolbar.querySelector(".page-web-block-move-up") ||
          !toolbar.querySelector(".page-web-block-move-down") ||
          !toolbar.querySelector(".page-web-text-block-v2-menu-delete") ||
          !toolbar.querySelector("[data-toggle-v2-field]") ||
          !toolbar.querySelector('[data-toggle-v2-field="announcement"]') ||
          !toolbar.querySelector('[data-toggle-v2-field="button"]') ||
          !toolbar.querySelector('[data-toggle-v2-field="button2"]') ||
          !toolbar.querySelector("[data-toggle-v2-announcement-learn-more]"))
      ) {
        const tmp = document.createElement("div");
        tmp.innerHTML = getWebTextBlockV2ToolbarHtml();
        const fresh = tmp.firstElementChild as HTMLElement;
        toolbar.replaceWith(fresh);
        changed = true;
      }
      let fields = block.querySelector(":scope > .page-web-text-block-v2-fields") as HTMLElement | null;
      if (!fields) {
        const tmp = document.createElement("div");
        tmp.innerHTML = getTextBlockV2Html();
        const sampleBlock = tmp.querySelector(".page-web-text-block-v2") as HTMLElement | null;
        const sampleFields = sampleBlock?.querySelector(":scope > .page-web-text-block-v2-fields") as HTMLElement | null;
        if (sampleFields) {
          fields = sampleFields.cloneNode(true) as HTMLElement;
          toolbar = block.querySelector(":scope > .page-web-text-block-v2-toolbar") as HTMLElement | null;
          if (toolbar) block.insertBefore(fields, toolbar.nextElementSibling);
          else block.insertBefore(fields, block.firstChild);
          changed = true;
        }
      } else if (fields.getAttribute("contenteditable") !== "false") {
        fields.setAttribute("contenteditable", "false");
        changed = true;
      }
      if (fields && ENABLE_LEGACY_WEB_BLOCK_HTML_MIGRATIONS && migrateLegacyWebTextBlockV2FieldsToWebElements(fields)) changed = true;
      if (fields && ensureWebTextBlockV2FieldWraps(fields)) changed = true;
      if (fields && normalizeWebTextBlockV2CtaRowStructure(fields)) changed = true;
      if (fields) {
        fields.querySelectorAll(":scope > .page-web-elements-actions").forEach((node) => {
          if (node instanceof HTMLElement && ensureWebElementsActionsCluster(node)) changed = true;
        });
      }
      if (fields && normalizeWebTextBlockV2AnnouncementMarkup(fields)) changed = true;
      if (fields && normalizeWebTextBlockV2AnnouncementRowAlignment(fields)) changed = true;
      if (fields && normalizeWebTextBlockV2FieldControls(fields)) changed = true;
      if (fields && reorderWebTextBlockV2FieldChildren(fields)) changed = true;
      if (reorderWebTextBlockV2ShellChildren(block)) changed = true;
      if (normalizeWebTextBlockV2VisibilityAttrs(block)) changed = true;
      const tbSync = block.querySelector(":scope > .page-web-text-block-v2-toolbar") as HTMLElement | null;
      if (tbSync) syncWebTextBlockV2ElementsMenuState(tbSync);
    });
    return changed;
  }

  function ensureWebArticleTextToolbarInEditor(root: HTMLElement): boolean {
    let changed = false;
    root.querySelectorAll(".page-web-article-text").forEach((n) => {
      const block = n as HTMLElement;
      if (block.getAttribute("contenteditable") !== "false") {
        block.setAttribute("contenteditable", "false");
        changed = true;
      }
      let toolbar = block.querySelector(":scope > .page-web-article-text-toolbar") as HTMLElement | null;
      if (!toolbar) {
        const tmp = document.createElement("div");
        tmp.innerHTML = getWebArticleTextToolbarHtml();
        toolbar = tmp.firstElementChild as HTMLElement;
        block.insertBefore(toolbar, block.firstChild);
        changed = true;
      } else if (toolbar.parentElement !== block || block.firstElementChild !== toolbar) {
        block.insertBefore(toolbar, block.firstChild);
        changed = true;
      }
      toolbar = block.querySelector(":scope > .page-web-article-text-toolbar") as HTMLElement | null;
      if (
        toolbar &&
        (!toolbar.querySelector(".page-web-article-text-menu-trigger") ||
          !toolbar.querySelector('[data-toggle-article-field="title"]') ||
          !toolbar.querySelector('[data-toggle-article-field="body"]') ||
          !toolbar.querySelector(".page-web-article-text-menu-delete"))
      ) {
        const tmp = document.createElement("div");
        tmp.innerHTML = getWebArticleTextToolbarHtml();
        const fresh = tmp.firstElementChild as HTMLElement;
        toolbar.replaceWith(fresh);
        toolbar = fresh;
        changed = true;
      }
      let fields = block.querySelector(":scope > .page-web-article-text-fields") as HTMLElement | null;
      if (!fields) {
        const tmp = document.createElement("div");
        tmp.innerHTML = getArticleTextHtml();
        fields = tmp.querySelector(".page-web-article-text-fields") as HTMLElement | null;
        if (fields) {
          const body = block.querySelector(":scope > .page-web-article-text-body");
          if (body) block.insertBefore(fields, body);
          else block.appendChild(fields);
          changed = true;
        }
      }
      if (!block.querySelector(":scope > .page-web-article-text-body")) {
        const tmp = document.createElement("div");
        tmp.innerHTML = getArticleTextHtml();
        const sampleBody = tmp.querySelector(".page-web-article-text-body") as HTMLElement | null;
        if (sampleBody) {
          block.appendChild(sampleBody.cloneNode(true));
          changed = true;
        }
      }
      const existingBody = block.querySelector(":scope > .page-web-article-text-body") as HTMLElement | null;
      if (existingBody) {
        const bodyTextarea = existingBody.querySelector(
          "textarea.page-web-article-text-body-input, textarea.page-web-elements-description-input",
        ) as HTMLTextAreaElement | null;
        if (!bodyTextarea) {
          const legacyText = (existingBody.textContent || "").replace(/\u200b/g, "").trim();
          const tmp = document.createElement("div");
          tmp.innerHTML = getArticleTextHtml();
          const sampleBody = tmp.querySelector(".page-web-article-text-body") as HTMLElement | null;
          if (sampleBody) {
            const ta = sampleBody.querySelector(
              "textarea.page-web-article-text-body-input",
            ) as HTMLTextAreaElement | null;
            if (ta && legacyText) ta.value = legacyText;
            existingBody.replaceWith(sampleBody);
            changed = true;
          }
        } else {
          if (existingBody.getAttribute("contenteditable") !== "false") {
            existingBody.setAttribute("contenteditable", "false");
            changed = true;
          }
          if (!bodyTextarea.classList.contains("page-web-article-text-body-input")) {
            bodyTextarea.classList.add("page-web-article-text-body-input");
            changed = true;
          }
          if (bodyTextarea.getAttribute("rows") !== "1") {
            bodyTextarea.setAttribute("rows", "1");
            changed = true;
          }
          if (bodyTextarea.getAttribute("spellcheck") !== "true") {
            bodyTextarea.setAttribute("spellcheck", "true");
            changed = true;
          }
          if (!bodyTextarea.getAttribute("placeholder")) {
            bodyTextarea.setAttribute("placeholder", "Основной текст статьи");
            changed = true;
          }
        }
      }
      if (fields && !fields.querySelector(".page-web-elements-title")) {
        const tmp = document.createElement("div");
        tmp.innerHTML = getArticleTextHtml();
        const sampleTitle = tmp.querySelector(".page-web-elements-title") as HTMLElement | null;
        if (sampleTitle) {
          fields.appendChild(sampleTitle.cloneNode(true));
          changed = true;
        }
      }
      if (reorderWebArticleTextShellChildren(block)) changed = true;
      if (normalizeWebArticleTextVisibilityAttrs(block)) changed = true;
      const tbSync = block.querySelector(":scope > .page-web-article-text-toolbar") as HTMLElement | null;
      if (tbSync) syncWebArticleTextElementsMenuState(tbSync);
    });
    return changed;
  }

  function ensureWebAccordionToolbarInEditor(root: HTMLElement): boolean {
    let changed = false;
    root.querySelectorAll(".page-web-accordion").forEach((n) => {
      const block = n as HTMLElement;
      if (block.getAttribute("contenteditable") !== "false") {
        block.setAttribute("contenteditable", "false");
        changed = true;
      }
      let toolbar = block.querySelector(":scope > .page-web-accordion-toolbar") as HTMLElement | null;
      if (!toolbar) {
        const tmp = document.createElement("div");
        tmp.innerHTML = getWebAccordionToolbarHtml();
        toolbar = tmp.firstElementChild as HTMLElement;
        block.insertBefore(toolbar, block.firstChild);
        changed = true;
      } else if (toolbar.parentElement !== block || block.firstElementChild !== toolbar) {
        block.insertBefore(toolbar, block.firstChild);
        changed = true;
      }
      toolbar = block.querySelector(":scope > .page-web-accordion-toolbar") as HTMLElement | null;
      if (
        toolbar &&
        (!toolbar.querySelector(".page-web-accordion-menu-trigger") ||
          !toolbar.querySelector('[data-toggle-accordion-field="subtitle"]') ||
          !toolbar.querySelector('[data-toggle-accordion-field="title"]') ||
          !toolbar.querySelector('[data-toggle-accordion-field="description"]') ||
          !toolbar.querySelector(".page-web-accordion-menu-add-item") ||
          !toolbar.querySelector(".page-web-accordion-menu-remove-item") ||
          !toolbar.querySelector(".page-web-accordion-menu-delete"))
      ) {
        const tmp = document.createElement("div");
        tmp.innerHTML = getWebAccordionToolbarHtml();
        const fresh = tmp.firstElementChild as HTMLElement;
        toolbar.replaceWith(fresh);
        toolbar = fresh;
        changed = true;
      }
      let head = block.querySelector(":scope > .page-web-accordion-head") as HTMLElement | null;
      if (!head) {
        const tmp = document.createElement("div");
        tmp.innerHTML = getAccordionHtml();
        head = tmp.querySelector(".page-web-accordion-head") as HTMLElement | null;
        if (head) {
          const listProbe = block.querySelector(":scope > .page-web-accordion-list");
          if (listProbe) block.insertBefore(head.cloneNode(true), listProbe);
          else block.appendChild(head.cloneNode(true));
          changed = true;
        }
      } else if (head.getAttribute("contenteditable") !== "false") {
        head.setAttribute("contenteditable", "false");
        changed = true;
      }
      head = block.querySelector(":scope > .page-web-accordion-head") as HTMLElement | null;
      if (head && !head.querySelector(".page-web-elements-title-input")) {
        const subTa = head.querySelector("textarea.page-web-elements-subtitle-input") as HTMLTextAreaElement | null;
        const titleTa = head.querySelector("textarea.page-web-elements-title-input") as HTMLTextAreaElement | null;
        const descTa = head.querySelector("textarea.page-web-elements-description-input") as HTMLTextAreaElement | null;
        head.innerHTML = getWebAccordionHeadFieldsHtml({
          subtitle: subTa?.value,
          title: titleTa?.value,
          description: descTa?.value,
        });
        head.setAttribute("contenteditable", "false");
        changed = true;
      }
      let list = block.querySelector(":scope > .page-web-accordion-list") as HTMLElement | null;
      if (!list) {
        const tmp = document.createElement("div");
        tmp.innerHTML = getAccordionHtml();
        list = tmp.querySelector(".page-web-accordion-list") as HTMLElement | null;
        if (list) {
          block.appendChild(list.cloneNode(true));
          changed = true;
        }
      } else if (list.getAttribute("contenteditable") !== "false") {
        list.setAttribute("contenteditable", "false");
        changed = true;
      }
      list = block.querySelector(":scope > .page-web-accordion-list") as HTMLElement | null;
      if (list && list.querySelectorAll(":scope > .page-web-accordion-item").length === 0) {
        const tmp = document.createElement("div");
        tmp.innerHTML = getAccordionHtml();
        const sampleList = tmp.querySelector(".page-web-accordion-list") as HTMLElement | null;
        if (sampleList) {
          sampleList.querySelectorAll(":scope > .page-web-accordion-item").forEach((item) => {
            list!.appendChild(item.cloneNode(true));
          });
          changed = true;
        }
      }
      if (ensureWebAccordionFaqItemsInRoot(block)) changed = true;
      syncWebAccordionPanelsForEditor(block);
      block.querySelectorAll(":scope > .page-web-accordion-list > .page-web-accordion-item").forEach((itemNode) => {
        const item = itemNode as HTMLElement;
        if (item.getAttribute("contenteditable") !== "false") {
          item.setAttribute("contenteditable", "false");
          changed = true;
        }
        item.querySelectorAll("dt, .page-web-accordion-trigger, .page-web-accordion-question, .page-web-accordion-panel").forEach((el) => {
          if ((el as HTMLElement).getAttribute("contenteditable") !== "false") {
            (el as HTMLElement).setAttribute("contenteditable", "false");
            changed = true;
          }
        });
        const qTa = item.querySelector(
          "textarea.page-web-accordion-question-input, textarea.page-web-elements-title-input",
        ) as HTMLTextAreaElement | null;
        const aTa = item.querySelector(
          "textarea.page-web-accordion-answer-input, textarea.page-web-elements-description-input",
        ) as HTMLTextAreaElement | null;
        const qWrap = item.querySelector(".page-web-accordion-question") as HTMLElement | null;
        if (qWrap) {
          if (qWrap.classList.contains("page-web-elements-title") || qWrap.classList.contains("page-web-elements")) {
            qWrap.classList.remove("page-web-elements", "page-web-elements-title");
            changed = true;
          }
        }
        if (qTa) {
          if (qTa.classList.contains("page-web-elements-title-input")) {
            qTa.classList.remove("page-web-elements-title-input");
            changed = true;
          }
          if (!qTa.classList.contains("page-web-accordion-question-input")) {
            qTa.classList.add("page-web-accordion-question-input");
            changed = true;
          }
          if (qTa.getAttribute("rows") !== "1") {
            qTa.setAttribute("rows", "1");
            changed = true;
          }
          if (!qTa.getAttribute("placeholder")) {
            qTa.setAttribute("placeholder", "Вопрос");
            changed = true;
          }
        }
        if (aTa) {
          if (!aTa.classList.contains("page-web-accordion-answer-input")) {
            aTa.classList.add("page-web-accordion-answer-input");
            changed = true;
          }
          if (aTa.getAttribute("rows") !== "1") {
            aTa.setAttribute("rows", "1");
            changed = true;
          }
          if (!aTa.getAttribute("placeholder")) {
            aTa.setAttribute("placeholder", "Ответ");
            changed = true;
          }
        }
      });
      if (reorderWebAccordionShellChildren(block)) changed = true;
      if (normalizeWebAccordionVisibilityAttrs(block)) changed = true;
      const tbSync = block.querySelector(":scope > .page-web-accordion-toolbar") as HTMLElement | null;
      if (tbSync) syncWebAccordionElementsMenuState(tbSync);
    });
    return changed;
  }

  function ensureWebSpacerToolbarInEditor(root: HTMLElement): boolean {
    let changed = false;
    root.querySelectorAll(".page-web-spacer").forEach((n) => {
      const block = n as HTMLElement;
      if (block.getAttribute("contenteditable") !== "false") {
        block.setAttribute("contenteditable", "false");
        changed = true;
      }
      const sizeRaw = block.getAttribute("data-spacer-size");
      if (sizeRaw !== "sm" && sizeRaw !== "md" && sizeRaw !== "lg") {
        block.setAttribute("data-spacer-size", "md");
        changed = true;
      }
      let toolbar = block.querySelector(":scope > .page-web-spacer-toolbar") as HTMLElement | null;
      if (!toolbar) {
        const tmp = document.createElement("div");
        tmp.innerHTML = getWebSpacerToolbarHtml();
        toolbar = tmp.firstElementChild as HTMLElement;
        block.insertBefore(toolbar, block.firstChild);
        changed = true;
      } else if (toolbar.parentElement !== block || block.firstElementChild !== toolbar) {
        block.insertBefore(toolbar, block.firstChild);
        changed = true;
      }
      toolbar = block.querySelector(".page-web-spacer-toolbar") as HTMLElement | null;
      if (
        toolbar &&
        (!toolbar.querySelector(".page-web-spacer-menu-trigger") ||
          !toolbar.querySelector(".page-web-block-move-up") ||
          !toolbar.querySelector(".page-web-block-move-down") ||
          !toolbar.querySelector('[data-set-spacer-size="sm"]') ||
          !toolbar.querySelector('[data-set-spacer-size="md"]') ||
          !toolbar.querySelector('[data-set-spacer-size="lg"]') ||
          !toolbar.querySelector(".page-web-spacer-menu-delete"))
      ) {
        const tmp = document.createElement("div");
        tmp.innerHTML = getWebSpacerToolbarHtml();
        const fresh = tmp.firstElementChild as HTMLElement;
        toolbar.replaceWith(fresh);
        toolbar = fresh;
        changed = true;
      }
      if (toolbar) {
        const size = (block.getAttribute("data-spacer-size") || "md") as "sm" | "md" | "lg";
        toolbar.querySelectorAll(".page-web-spacer-menu-size[data-set-spacer-size]").forEach((btn) => {
          const selected = (btn as HTMLElement).getAttribute("data-set-spacer-size") === size;
          (btn as HTMLElement).setAttribute("aria-checked", selected ? "true" : "false");
        });
      }
    });
    return changed;
  }

  function ensureWebInsertHandlesInEditor(root: HTMLElement): boolean {
    let changed = false;
    root.querySelectorAll(WEB_BLOCK_SHELL_SELECTOR).forEach((node) => {
      const block = node as HTMLElement;
      let handle = block.querySelector(":scope > .page-web-insert-handle") as HTMLElement | null;
      if (!handle) {
        handle = document.createElement("div");
        handle.className = "page-web-insert-handle";
        handle.setAttribute("contenteditable", "false");
        changed = true;
      }
      let btn = handle.querySelector(":scope > .page-web-insert-handle-btn") as HTMLButtonElement | null;
      if (!btn) {
        handle.innerHTML =
          '<button type="button" class="page-web-insert-handle-btn" contenteditable="false" tabindex="-1" data-insert-web-after="1" aria-label="Добавить блок после текущего" title="Добавить блок"></button>';
        btn = handle.querySelector(":scope > .page-web-insert-handle-btn") as HTMLButtonElement | null;
        changed = true;
      }
      if (!btn?.textContent?.trim()) {
        if (btn) btn.textContent = "Добавить";
      }
      if (handle.parentElement !== block || block.lastElementChild !== handle) {
        block.appendChild(handle);
        changed = true;
      }
    });
    return changed;
  }

  /** Явный contenteditable=false на частях карусели — иначе каретка родителя «протекает» в слайды и мигает. */
  function ensureWebCarouselShellNonEditableInEditor(root: HTMLElement): boolean {
    let changed = false;
    const setFalse = (el: HTMLElement) => {
      if (el.getAttribute("contenteditable") !== "false") {
        el.setAttribute("contenteditable", "false");
        changed = true;
      }
    };
    root.querySelectorAll(".page-web-carousel").forEach((c) => {
      const carousel = c as HTMLElement;
      setFalse(carousel);
      carousel.querySelectorAll(".page-web-carousel-viewport").forEach((n) => setFalse(n as HTMLElement));
      carousel.querySelectorAll(".page-web-carousel-strip").forEach((n) => setFalse(n as HTMLElement));
      carousel.querySelectorAll(".page-web-carousel-slide").forEach((n) => setFalse(n as HTMLElement));
      carousel.querySelectorAll(".page-web-carousel-slide-inner").forEach((n) => setFalse(n as HTMLElement));
      carousel.querySelectorAll(".page-web-carousel-placeholder").forEach((n) => setFalse(n as HTMLElement));
      carousel.querySelectorAll(".page-web-carousel-img").forEach((n) => setFalse(n as HTMLElement));
    });
    return changed;
  }

  function normalizeWebCoverAspectAttributes(root: HTMLElement): boolean {
    let changed = false;
    root.querySelectorAll(".page-web-cover").forEach((n) => {
      const h = n as HTMLElement;
      if (!h.hasAttribute("data-cover-aspect")) {
        h.setAttribute("data-cover-aspect", "16-9");
        changed = true;
      }
    });
    return changed;
  }

  function normalizeWebCoverTypeAttributes(root: HTMLElement): boolean {
    let changed = false;
    root.querySelectorAll(".page-web-cover").forEach((n) => {
      const h = n as HTMLElement;
      const current = h.getAttribute("data-cover-type");
      if (current === "hero" || current === "image" || current === "split") {
        if (current === "split" && h.classList.contains("page-web-cover-has-bg")) {
          const before = `${h.style.getPropertyValue("--cover-bg-image")}|${h.style.getPropertyValue("--cover-bg-pos")}`;
          ensureCoverBackgroundCssVars(h);
          const after = `${h.style.getPropertyValue("--cover-bg-image")}|${h.style.getPropertyValue("--cover-bg-pos")}`;
          if (before !== after) changed = true;
        }
        return;
      }
      const inferred = h.classList.contains("page-web-cover-has-bg") ? "image" : "hero";
      h.setAttribute("data-cover-type", inferred);
      changed = true;
    });
    return changed;
  }

  function normalizeWebCarouselAspectAttributes(root: HTMLElement): boolean {
    let changed = false;
    root.querySelectorAll(".page-web-carousel").forEach((n) => {
      const h = n as HTMLElement;
      const current = h.getAttribute("data-carousel-aspect");
      if (current !== "vertical" && current !== "horizontal" && current !== "square") {
        h.setAttribute("data-carousel-aspect", "horizontal");
        changed = true;
      }
    });
    return changed;
  }

  /** Убирает элементы интерфейса редактора из HTML перед отправкой на сервер. */
  function stripCoverEditorChromeFromHtml(html: string): string {
    if (typeof document === "undefined") return html;
    try {
      const wrap = document.createElement("div");
      wrap.innerHTML = html;
      wrap.querySelectorAll(`[${PAGE_EDITOR_FOCUS_TARGET_ATTR}]`).forEach((n) =>
        (n as HTMLElement).removeAttribute(PAGE_EDITOR_FOCUS_TARGET_ATTR),
      );
      wrap.querySelectorAll(".page-web-cover-toolbar").forEach((n) => n.remove());
      wrap.querySelectorAll(".page-web-insert-handle").forEach((n) => n.remove());
      wrap.querySelectorAll(".page-web-cover-delete").forEach((n) => n.remove());
      wrap.querySelectorAll(".page-web-cover-bg").forEach((n) => n.remove());
      wrap.querySelectorAll(".page-web-cover-blob-layer").forEach((n) => n.remove());
      wrap.querySelectorAll(".page-web-cover").forEach((n) => (n as HTMLElement).removeAttribute("contenteditable"));
      wrap.querySelectorAll(".page-web-cover-inner").forEach((n) => {
        const h = n as HTMLElement;
        h.removeAttribute("contenteditable");
        h.removeAttribute("data-cover-unlocked");
        h.removeAttribute("title");
      });
      wrap.querySelectorAll(".page-web-carousel-toolbar").forEach((n) => n.remove());
      wrap.querySelectorAll(".page-web-carousel").forEach((n) => {
        (n as HTMLElement).removeAttribute("contenteditable");
      });
      wrap.querySelectorAll(".page-web-timeline-toolbar").forEach((n) => n.remove());
      wrap.querySelectorAll(".page-web-timeline").forEach((n) => {
        (n as HTMLElement).removeAttribute("contenteditable");
      });
      wrap.querySelectorAll(".page-web-text-media-toolbar").forEach((n) => n.remove());
      wrap.querySelectorAll(".page-web-text-media").forEach((n) => {
        (n as HTMLElement).removeAttribute("contenteditable");
      });
      wrap.querySelectorAll(".page-web-text-media-col").forEach((n) => {
        (n as HTMLElement).removeAttribute("contenteditable");
      });
      wrap.querySelectorAll(".page-web-text-block-toolbar").forEach((n) => n.remove());
      wrap.querySelectorAll(".page-web-text-block-v2-toolbar").forEach((n) => n.remove());
      wrap.querySelectorAll(".page-web-article-text-toolbar").forEach((n) => n.remove());
      wrap.querySelectorAll(".page-web-accordion-toolbar").forEach((n) => n.remove());
      wrap.querySelectorAll(".page-web-text-block").forEach((n) => {
        (n as HTMLElement).removeAttribute("contenteditable");
      });
      wrap.querySelectorAll(".page-web-text-block-v2").forEach((n) => {
        (n as HTMLElement).removeAttribute("contenteditable");
      });
      wrap.querySelectorAll(".page-web-article-text").forEach((n) => {
        (n as HTMLElement).removeAttribute("contenteditable");
      });
      wrap.querySelectorAll(".page-web-article-text-body").forEach((n) => {
        (n as HTMLElement).removeAttribute("contenteditable");
      });
      wrap.querySelectorAll(".page-web-accordion").forEach((n) => {
        (n as HTMLElement).removeAttribute("contenteditable");
      });
      normalizeWebAccordionFaqForPublish(wrap);
      wrap.querySelectorAll(".page-web-spacer-toolbar").forEach((n) => n.remove());
      wrap.querySelectorAll(".page-web-spacer").forEach((n) => {
        (n as HTMLElement).removeAttribute("contenteditable");
      });
      wrap.querySelectorAll(".page-web-text-block-content").forEach((n) => {
        const h = n as HTMLElement;
        h.removeAttribute("contenteditable");
        h.classList.remove("page-web-text-block-content");
      });
      wrap.querySelectorAll(".page-web-text-block-v2-content").forEach((n) => n.remove());
      wrap.querySelectorAll(".page-web-carousel-slide[data-carousel-active]").forEach((n) => {
        (n as HTMLElement).removeAttribute("data-carousel-active");
      });
      wrap.querySelectorAll(".page-web-carousel-arrow").forEach((n) => {
        (n as HTMLElement).removeAttribute("tabindex");
      });
      return wrap.innerHTML;
    } catch {
      return html;
    }
  }

  /** True if caret is at the effective start of block (incl. nested div/span), not only at the shallow first boundary. */
  function rangeCollapsedAtEditableBlockStart(range: Range, block: HTMLElement): boolean {
    if (!range.collapsed) return false;
    try {
      if (!block.contains(range.startContainer)) return false;
      const blockStart = document.createRange();
      blockStart.selectNodeContents(block);
      blockStart.collapse(true);
      const probe = document.createRange();
      probe.setStart(blockStart.startContainer, blockStart.startOffset);
      probe.setEnd(range.startContainer, range.startOffset);
      const text = probe.toString().replace(/\u200b/g, "").replace(/\ufeff/g, "");
      // NBSP (U+00A0) is not removed by String#trim — treat as ignorable for “line start”.
      if (text.length > 0 && /[^\s\u00a0]/.test(text)) return false;
      const frag = probe.cloneContents();
      if (
        frag.querySelector(
          "img,table,hr,iframe,video,audio,object,embed,svg,canvas,button,input,textarea",
        )
      )
        return false;
      return true;
    } catch {
      return false;
    }
  }

  function isIgnorableSpacerBeforeCover(el: HTMLElement): boolean {
    if (el.classList.contains("page-web-cover")) return false;
    if (el.classList.contains("page-web-carousel")) return false;
    const tag = el.tagName;
    if (tag === "BR") return true;
    if (tag !== "DIV" && tag !== "P") return false;
    if (el.querySelector("img,table,hr,iframe,video,ol,ul,li,.page-web-cover,.page-web-carousel")) return false;
    const text = el.innerText.replace(/\u200b/g, "").replace(/\u00a0/g, " ").trim();
    return text.length === 0;
  }

  /** Ближайшая к точке `.page-web-cover`, которая в документе строго до `point` (если walk по siblings дал null). */
  function findDeepestWebCoverBeforePoint(ed: HTMLElement, point: Node): HTMLElement | null {
    if (!ed.contains(point)) return null;
    const covers = Array.from(ed.querySelectorAll(".page-web-cover")) as HTMLElement[];
    let best: HTMLElement | null = null;
    for (const c of covers) {
      if (c.contains(point)) continue;
      const rel = c.compareDocumentPosition(point);
      if (!(rel & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
      if (!best) {
        best = c;
        continue;
      }
      if (best.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING) {
        best = c;
      }
    }
    return best;
  }

  /**
   * Браузер при слиянии может вставить абзац прямым потомком `.page-web-cover` — тогда обложка не удаляется целиком и текст «течёт» в блок.
   * Оставляем только кнопку удаления и `.page-web-cover-inner`, остальное переносим после обложки.
   */
  function sanitizeLeakedNodesOutOfWebCovers(root: HTMLElement): boolean {
    let changed = false;
    root.querySelectorAll(".page-web-cover").forEach((cov) => {
      const cover = cov as HTMLElement;
      const parent = cover.parentNode;
      if (!parent) return;
      const movable: Node[] = [];
      for (const ch of Array.from(cover.childNodes)) {
        if (ch.nodeType === Node.ELEMENT_NODE) {
          const hel = ch as HTMLElement;
          if (hel.classList.contains("page-web-cover-toolbar")) continue;
          if (hel.classList.contains("page-web-cover-delete")) continue;
          if (hel.classList.contains("page-web-cover-bg")) continue;
          if (hel.classList.contains("page-web-cover-blob-layer")) continue;
          if (hel.classList.contains("page-web-cover-inner")) continue;
          if (hel.classList.contains("page-web-insert-handle")) continue;
          movable.push(ch);
        } else if (ch.nodeType === Node.TEXT_NODE) {
          if ((ch.textContent || "").replace(/\u200b/g, "").trim()) movable.push(ch);
        }
      }
      if (movable.length === 0) return;
      const frag = document.createDocumentFragment();
      for (const ch of movable) {
        frag.appendChild(ch);
      }
      parent.insertBefore(frag, cover.nextSibling);
      changed = true;
    });
    return changed;
  }

  /** Слайды внутри viewport оборачиваем в `.page-web-carousel-strip` (grid-лента; колонки от 100cqi ≈ треть видимой области). */
  function normalizeWebCarouselStripInEditor(root: HTMLElement): boolean {
    let changed = false;
    root.querySelectorAll(".page-web-carousel-viewport").forEach((vp) => {
      const viewport = vp as HTMLElement;
      if (viewport.querySelector(":scope > .page-web-carousel-strip")) return;
      const slides = Array.from(viewport.querySelectorAll(":scope > .page-web-carousel-slide"));
      if (slides.length === 0) return;
      const strip = document.createElement("div");
      strip.className = "page-web-carousel-strip";
      for (const s of slides) {
        strip.appendChild(s);
      }
      viewport.appendChild(strip);
      changed = true;
    });
    return changed;
  }

  /** Синхронизируем внутреннюю ширину viewport и фиксированную ширину одной карточки. */
  function syncWebCarouselViewportInnerPx(root: HTMLElement) {
    root.querySelectorAll(".page-web-carousel-viewport").forEach((node) => {
      const vp = node as HTMLElement;
      if (!vp.querySelector(":scope > .page-web-carousel-strip")) {
        vp.style.removeProperty("--carousel-inner-px");
        vp.style.removeProperty("--carousel-slide-px");
        return;
      }
      const cs = getComputedStyle(vp);
      const pl = parseFloat(cs.paddingLeft) || 0;
      const pr = parseFloat(cs.paddingRight) || 0;
      const inner = Math.max(0, vp.clientWidth - pl - pr);
      const slidePx = getCarouselSlideWidthPx(inner, getCarouselVisibleSlides(vp));
      vp.style.setProperty("--carousel-inner-px", `${inner}px`);
      vp.style.setProperty("--carousel-slide-px", `${slidePx}px`);
      const strip = vp.querySelector(":scope > .page-web-carousel-strip") as HTMLElement | null;
      strip?.style.removeProperty("width");
      refreshCarouselStripTranslateAfterLayout(vp);
    });
  }

  /** Лента двигается через transform (как SAB-AUTO), не через scrollLeft. */
  function alignWebCarouselViewportToActive(vp: HTMLElement) {
    if (!vp.querySelector(":scope > .page-web-carousel-strip")) return;
    const slides = Array.from(vp.querySelectorAll(".page-web-carousel-slide")) as HTMLElement[];
    if (slides.length === 0) return;
    const active = vp.querySelector(".page-web-carousel-slide[data-carousel-active]") as HTMLElement | null;
    const idx = active ? slides.indexOf(active) : 0;
    const visibleSlides = getCarouselVisibleSlides(vp);
    const lastStart = Math.max(0, slides.length - visibleSlides);
    /* Левое окно из VISIBLE слайдов, в котором виден активный (минимальный сдвиг, без «уезда влево» без нужды). */
    const startIdx = Math.max(0, Math.min(lastStart, idx - (visibleSlides - 1)));
    alignCarouselStripToStartSlideIndex(vp, startIdx);
  }

  function alignAllWebCarouselViewportsInEditor(root: HTMLElement) {
    root.querySelectorAll(".page-web-carousel-viewport").forEach((node) => {
      alignWebCarouselViewportToActive(node as HTMLElement);
    });
  }

  /** Посторонние узлы прямым потомком `.page-web-carousel` переносим после блока. */
  function sanitizeLeakedNodesOutOfWebCarousels(root: HTMLElement): boolean {
    let changed = false;
    root.querySelectorAll(".page-web-carousel").forEach((cov) => {
      const carousel = cov as HTMLElement;
      const parent = carousel.parentNode;
      if (!parent) return;
      const movable: Node[] = [];
      for (const ch of Array.from(carousel.childNodes)) {
        if (ch.nodeType === Node.ELEMENT_NODE) {
          const hel = ch as HTMLElement;
          if (hel.classList.contains("page-web-carousel-toolbar")) continue;
          if (hel.classList.contains("page-web-carousel-arrow")) continue;
          if (hel.classList.contains("page-web-carousel-viewport")) continue;
          if (hel.classList.contains("page-web-insert-handle")) continue;
          movable.push(ch);
        } else if (ch.nodeType === Node.TEXT_NODE) {
          if ((ch.textContent || "").replace(/\u200b/g, "").trim()) movable.push(ch);
        }
      }
      if (movable.length === 0) return;
      const frag = document.createDocumentFragment();
      for (const ch of movable) {
        frag.appendChild(ch);
      }
      parent.insertBefore(frag, carousel.nextSibling);
      changed = true;
    });
    return changed;
  }

  /** Посторонние узлы прямым потомком `.page-web-text-media` переносим после блока. */
  function sanitizeLeakedNodesOutOfWebTextMedia(root: HTMLElement): boolean {
    let changed = false;
    root.querySelectorAll(".page-web-text-media").forEach((cov) => {
      const block = cov as HTMLElement;
      const parent = block.parentNode;
      if (!parent) return;
      const movable: Node[] = [];
      for (const ch of Array.from(block.childNodes)) {
        if (ch.nodeType === Node.ELEMENT_NODE) {
          const hel = ch as HTMLElement;
          if (hel.classList.contains("page-web-text-media-toolbar")) continue;
          if (hel.classList.contains("page-web-text-media-col--text")) continue;
          if (hel.classList.contains("page-web-text-media-col--media")) continue;
          if (hel.classList.contains("page-web-insert-handle")) continue;
          movable.push(ch);
        } else if (ch.nodeType === Node.TEXT_NODE) {
          if ((ch.textContent || "").replace(/\u200b/g, "").trim()) movable.push(ch);
        }
      }
      if (movable.length === 0) return;
      const frag = document.createDocumentFragment();
      for (const ch of movable) frag.appendChild(ch);
      parent.insertBefore(frag, block.nextSibling);
      changed = true;
    });
    return changed;
  }

  /** Посторонние узлы прямым потомком `.page-web-text-block` переносим после блока. */
  function sanitizeLeakedNodesOutOfWebTextBlocks(root: HTMLElement): boolean {
    let changed = false;
    root.querySelectorAll(".page-web-text-block").forEach((cov) => {
      const block = cov as HTMLElement;
      const parent = block.parentNode;
      if (!parent) return;
      const movable: Node[] = [];
      for (const ch of Array.from(block.childNodes)) {
        if (ch.nodeType === Node.ELEMENT_NODE) {
          const hel = ch as HTMLElement;
          if (hel.classList.contains("page-web-text-block-toolbar")) continue;
          if (hel.classList.contains("page-web-text-block-fields")) continue;
          if (hel.classList.contains("page-web-text-block-content")) continue;
          if (hel.classList.contains("page-web-insert-handle")) continue;
          movable.push(ch);
        } else if (ch.nodeType === Node.TEXT_NODE) {
          if ((ch.textContent || "").replace(/\u200b/g, "").trim()) movable.push(ch);
        }
      }
      if (movable.length === 0) return;
      const frag = document.createDocumentFragment();
      for (const ch of movable) frag.appendChild(ch);
      parent.insertBefore(frag, block.nextSibling);
      changed = true;
    });
    return changed;
  }

  /** Посторонние узлы прямым потомком `.page-web-text-block-v2` переносим после блока. */
  function sanitizeLeakedNodesOutOfWebTextBlockV2(root: HTMLElement): boolean {
    let changed = false;
    root.querySelectorAll(".page-web-text-block-v2").forEach((cov) => {
      const block = cov as HTMLElement;
      const parent = block.parentNode;
      if (!parent) return;
      const movable: Node[] = [];
      for (const ch of Array.from(block.childNodes)) {
        if (ch.nodeType === Node.ELEMENT_NODE) {
          const hel = ch as HTMLElement;
          if (hel.classList.contains("page-web-text-block-v2-toolbar")) continue;
          if (hel.classList.contains("page-web-article-text-toolbar")) continue;
          if (hel.classList.contains("page-web-accordion-toolbar")) continue;
          if (hel.classList.contains("page-web-text-block-v2-fields")) continue;
          if (hel.classList.contains("page-web-insert-handle")) continue;
          movable.push(ch);
        } else if (ch.nodeType === Node.TEXT_NODE) {
          if ((ch.textContent || "").replace(/\u200b/g, "").trim()) movable.push(ch);
        }
      }
      if (movable.length === 0) return;
      const frag = document.createDocumentFragment();
      for (const ch of movable) frag.appendChild(ch);
      parent.insertBefore(frag, block.nextSibling);
      changed = true;
    });
    return changed;
  }

  /** Посторонние узлы прямым потомком `.page-web-accordion` переносим после блока. */
  function sanitizeLeakedNodesOutOfWebAccordions(root: HTMLElement): boolean {
    let changed = false;
    root.querySelectorAll(".page-web-accordion").forEach((cov) => {
      const block = cov as HTMLElement;
      const parent = block.parentNode;
      if (!parent) return;
      const movable: Node[] = [];
      for (const ch of Array.from(block.childNodes)) {
        if (ch.nodeType === Node.ELEMENT_NODE) {
          const hel = ch as HTMLElement;
          if (hel.classList.contains("page-web-accordion-toolbar")) continue;
          if (hel.classList.contains("page-web-accordion-head")) continue;
          if (hel.classList.contains("page-web-accordion-list")) continue;
          if (hel.classList.contains("page-web-insert-handle")) continue;
          movable.push(ch);
        } else if (ch.nodeType === Node.TEXT_NODE) {
          if ((ch.textContent || "").replace(/\u200b/g, "").trim()) movable.push(ch);
        }
      }
      if (movable.length === 0) return;
      const frag = document.createDocumentFragment();
      for (const ch of movable) frag.appendChild(ch);
      parent.insertBefore(frag, block.nextSibling);
      changed = true;
    });
    return changed;
  }

  /** Посторонние узлы прямым потомком `.page-web-spacer` переносим после блока. */
  function sanitizeLeakedNodesOutOfWebSpacers(root: HTMLElement): boolean {
    let changed = false;
    root.querySelectorAll(".page-web-spacer").forEach((cov) => {
      const block = cov as HTMLElement;
      const parent = block.parentNode;
      if (!parent) return;
      const movable: Node[] = [];
      for (const ch of Array.from(block.childNodes)) {
        if (ch.nodeType === Node.ELEMENT_NODE) {
          const hel = ch as HTMLElement;
          if (hel.classList.contains("page-web-spacer-toolbar")) continue;
          if (hel.classList.contains("page-web-insert-handle")) continue;
          movable.push(ch);
        } else if (ch.nodeType === Node.TEXT_NODE) {
          if ((ch.textContent || "").replace(/\u200b/g, "").trim()) movable.push(ch);
        }
      }
      if (movable.length === 0) return;
      const frag = document.createDocumentFragment();
      for (const ch of movable) frag.appendChild(ch);
      parent.insertBefore(frag, block.nextSibling);
      changed = true;
    });
    return changed;
  }

  /** Walk up from the caret: on each ancestor, scan previous element siblings for a cover (skips empty div/p). */
  function findPrecedingWebCoverFromCaret(ed: HTMLElement, range: Range): HTMLElement | null {
    let cur: Node | null = range.startContainer;
    if (cur.nodeType === Node.TEXT_NODE) cur = cur.parentNode;
    while (cur && cur !== ed) {
      if (cur.nodeType === Node.ELEMENT_NODE) {
        let sib: Element | null = (cur as Element).previousElementSibling;
        while (sib) {
          if (sib.classList.contains("page-web-cover")) return sib as HTMLElement;
          if (sib instanceof HTMLElement && isIgnorableSpacerBeforeCover(sib)) {
            sib = sib.previousElementSibling;
            continue;
          }
          break;
        }
      }
      cur = cur.parentNode;
    }
    return null;
  }

  /**
   * Caret at the first editable position after this cover (same parent branch), without treating the cover subtree
   * as “prefix” (avoids false negatives when cover+content share a wrapper and the probe would include the × button).
   */
  function rangeCollapsedImmediatelyAfterCover(range: Range, cover: HTMLElement): boolean {
    if (!range.collapsed) return false;
    if (cover.contains(range.startContainer)) return false;
    try {
      const parent = cover.parentElement;
      if (!parent || !parent.contains(range.startContainer)) return false;
      const boundary = document.createRange();
      boundary.setStartAfter(cover);
      boundary.collapse(true);
      // -1 = boundary before caret (normal: caret in content after cover); 0 = at caret; 1 = boundary after caret (invalid).
      const cmp = range.comparePoint(boundary.startContainer, boundary.startOffset);
      if (cmp > 0) return false;
      const probe = document.createRange();
      probe.setStart(boundary.startContainer, boundary.startOffset);
      probe.setEnd(range.startContainer, range.startOffset);
      const text = probe.toString().replace(/\u200b/g, "").replace(/\ufeff/g, "");
      if (text.length > 0 && /[^\s\u00a0]/.test(text)) return false;
      const frag = probe.cloneContents();
      if (
        frag.querySelector(
          "img,table,hr,iframe,video,audio,object,embed,svg,canvas,button,input,textarea",
        )
      )
        return false;
      return true;
    } catch {
      return false;
    }
  }

  /** Collapsed caret at the effective end of block (nested div/span), mirror of rangeCollapsedAtEditableBlockStart. */
  function rangeCollapsedAtEditableBlockEnd(range: Range, block: HTMLElement): boolean {
    if (!range.collapsed) return false;
    try {
      if (!block.contains(range.startContainer)) return false;
      const blockEnd = document.createRange();
      blockEnd.selectNodeContents(block);
      blockEnd.collapse(false);
      const probe = document.createRange();
      probe.setStart(range.startContainer, range.startOffset);
      probe.setEnd(blockEnd.startContainer, blockEnd.startOffset);
      const text = probe.toString().replace(/\u200b/g, "").replace(/\ufeff/g, "");
      if (text.length > 0 && /[^\s\u00a0]/.test(text)) return false;
      const frag = probe.cloneContents();
      if (
        frag.querySelector(
          "img,table,hr,iframe,video,audio,object,embed,svg,canvas,button,input,textarea",
        )
      )
        return false;
      return true;
    } catch {
      return false;
    }
  }

  function hasMeaningfulContentAfterCoverInner(inner: HTMLElement): boolean {
    const cover = inner.closest(".page-web-cover");
    if (!cover?.parentNode) return false;
    let n: ChildNode | null = cover.nextSibling;
    while (n) {
      if (n.nodeType === Node.TEXT_NODE) {
        if ((n.textContent || "").replace(/\u200b/g, "").replace(/\u00a0/g, " ").trim().length) return true;
      } else if (n.nodeType === Node.ELEMENT_NODE) {
        const hel = n as HTMLElement;
        if (isIgnorableSpacerBeforeCover(hel)) {
          n = n.nextSibling;
          continue;
        }
        return true;
      }
      n = n.nextSibling;
    }
    return false;
  }

  /** Block Delete / forward-delete that would pull the next block into the cover inner. */
  function tryHandleWebCoverForwardBlock(ed: HTMLElement, range: Range): boolean {
    if (!range.collapsed) return false;
    const coverInner = (range.startContainer.nodeType === Node.TEXT_NODE
      ? range.startContainer.parentElement
      : (range.startContainer as Element)
    )?.closest?.(".page-web-cover-inner") as HTMLElement | null;
    if (!coverInner || !ed.contains(coverInner)) return false;
    if (!rangeCollapsedAtEditableBlockEnd(range, coverInner)) return false;
    return hasMeaningfulContentAfterCoverInner(coverInner);
  }

  function selectionTouchesLockedCoverInner(ed: HTMLElement, range: Range): boolean {
    const inner = (range.startContainer.nodeType === Node.TEXT_NODE
      ? range.startContainer.parentElement
      : (range.startContainer as Element)
    )?.closest?.(".page-web-cover-inner") as HTMLElement | null;
    if (!inner || !ed.contains(inner)) return false;
    if (inner.getAttribute("data-cover-unlocked") === "1") return false;
    return true;
  }

  /** Каретка на градиенте обложки / вне зоны текста — ввод запрещён (только .page-web-cover-inner). */
  function selectionIsOnCoverOutsideInner(ed: HTMLElement, range: Range): boolean {
    const cover = (range.startContainer.nodeType === Node.TEXT_NODE
      ? range.startContainer.parentElement
      : (range.startContainer as Element)
    )?.closest?.(".page-web-cover") as HTMLElement | null;
    if (!cover || !ed.contains(cover)) return false;
    const inner = cover.querySelector(".page-web-cover-inner");
    if (inner && inner.contains(range.startContainer)) return false;
    const toolbar = cover.querySelector(".page-web-cover-toolbar");
    if (toolbar && toolbar.contains(range.startContainer)) return false;
    return true;
  }

  function selectionInsideNonEditableWebShell(ed: HTMLElement, range: Range): boolean {
    let node: Node | null = range.commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) node = (node as Text).parentElement;
    const el = node instanceof Element ? node : null;
    const shell = el?.closest?.(".page-web-carousel");
    return !!(shell && ed.contains(shell));
  }

  /** Пока обложка не разблокирована кликом — не вставлять текст, не форматировать и т.д. */
  function tryPreventWebCoverNonDeleteInput(ed: HTMLElement, range: Range, inputType: string): boolean {
    if (inputType === "deleteContentBackward" || inputType === "deleteContentForward") return false;
    if (selectionInsideNonEditableWebShell(ed, range)) return true;
    if (selectionIsOnCoverOutsideInner(ed, range)) return true;
    return selectionTouchesLockedCoverInner(ed, range);
  }

  function normalizeWebCoverInnerEditability(root: HTMLElement) {
    root.querySelectorAll(".page-web-cover-inner").forEach((n) => {
      const h = n as HTMLElement;
      if (h.getAttribute("data-cover-unlocked") === "1") {
        h.setAttribute("contenteditable", "true");
      } else {
        h.setAttribute("contenteditable", "false");
      }
    });
  }

  function normalizeWebTextBlockContentEditability(root: HTMLElement) {
    root.querySelectorAll(".page-web-text-block-content").forEach((n) => {
      const h = n as HTMLElement;
      if (h.getAttribute("contenteditable") !== "true") {
        h.setAttribute("contenteditable", "true");
      }
      if (h.hasAttribute("data-text-block-unlocked")) {
        h.removeAttribute("data-text-block-unlocked");
      }
    });
  }

  /** Высота полей v2 по содержимому; ширина заголовков — по тексту (`layoutWebElementsTextareaSize`). */
  function layoutWebTextBlockV2TextareaHeightOnly(textarea: HTMLTextAreaElement) {
    layoutWebElementsTextareaSize(textarea);
  }

  function autosizeWebTextBlockV2Textareas(root: HTMLElement) {
    clearTimelineTextareaInlineWidthsInRoot(root);
    root.querySelectorAll(WEB_ELEMENTS_V2_TEXTAREA_LAYOUT_SELECTOR).forEach((n) => {
      if (!(n instanceof HTMLTextAreaElement)) return;
      layoutWebTextBlockV2TextareaHeightOnly(n);
    });
    clearTimelineTextareaInlineWidthsInRoot(root);
    layoutWebElementsAnnouncementInputsInRoot(root);
    root.querySelectorAll(".page-web-timeline").forEach((t) => {
      applyTimelineLineGeometry(t as HTMLElement);
    });
  }

  function normalizeWebCoverElementPlaceholders(root: HTMLElement): boolean {
    let changed = false;
    root
      .querySelectorAll(
        ".page-web-cover .page-web-cover-inner > .page-web-elements.page-web-elements-title, .page-web-cover .page-web-cover-inner > .page-web-elements.page-web-elements-announcement, .page-web-cover .page-web-cover-inner > .page-web-elements.page-web-elements-description, .page-web-cover .page-web-cover-el-subtitle, .page-web-cover .page-web-cover-inner > .page-web-elements-actions, .page-web-cover .page-web-cover-el-button-wrap",
      )
      .forEach((n) => {
        const el = n as HTMLElement;
        const isTitle =
          el.classList.contains("page-web-elements-title") && el.classList.contains("page-web-elements");
        const isAnnouncement =
          el.classList.contains("page-web-elements-announcement") && el.classList.contains("page-web-elements");
        const isDescription =
          el.classList.contains("page-web-elements-description") && el.classList.contains("page-web-elements");
        const isButton =
          el.classList.contains("page-web-cover-el-button-wrap") || el.classList.contains("page-web-elements-actions");
        const titleTa = isTitle
          ? (el.querySelector(":scope textarea.page-web-elements-title-input") as HTMLTextAreaElement | null)
          : null;
        if (titleTa) {
          const ph = "Здесь вы можете написать заголовок";
          if (titleTa.getAttribute("placeholder") !== ph) {
            titleTa.setAttribute("placeholder", ph);
            changed = true;
          }
          if (el.getAttribute("data-placeholder") !== ph) {
            el.setAttribute("data-placeholder", ph);
            changed = true;
          }
          const visible = (titleTa.value || "").replace(/[\u200b\s]+/g, "").length === 0 ? "1" : "0";
          if (el.getAttribute("data-placeholder-visible") !== visible) {
            el.setAttribute("data-placeholder-visible", visible);
            changed = true;
          }
          return;
        }
        const descTa = isDescription
          ? (el.querySelector(":scope textarea.page-web-elements-description-input") as HTMLTextAreaElement | null)
          : null;
        if (descTa) {
          const ph = "Здесь вы можете написать подзаголовок и описание";
          if (descTa.getAttribute("placeholder") !== ph) {
            descTa.setAttribute("placeholder", ph);
            changed = true;
          }
          if (el.getAttribute("data-placeholder") !== ph) {
            el.setAttribute("data-placeholder", ph);
            changed = true;
          }
          const visible = (descTa.value || "").replace(/[\u200b\s]+/g, "").length === 0 ? "1" : "0";
          if (el.getAttribute("data-placeholder-visible") !== visible) {
            el.setAttribute("data-placeholder-visible", visible);
            changed = true;
          }
          return;
        }
        if (isAnnouncement) {
          const annInput = el.querySelector(
            ":scope .page-web-elements-announcement-input",
          ) as HTMLElement | null;
          if (!annInput) return;
          const ph = annInput.getAttribute("data-placeholder") || "Анонс";
          const raw = (annInput.textContent || "").replace(/\u200b/g, "");
          const visible = raw.replace(/[\s\u00a0]+/g, "").length === 0 ? "1" : "0";
          if (annInput.getAttribute("data-placeholder-visible") !== visible) {
            annInput.setAttribute("data-placeholder-visible", visible);
            changed = true;
          }
          if (el.getAttribute("data-placeholder") !== ph) {
            el.setAttribute("data-placeholder", ph);
            changed = true;
          }
          if (el.getAttribute("data-placeholder-visible") !== visible) {
            el.setAttribute("data-placeholder-visible", visible);
            changed = true;
          }
          return;
        }
        if (el.classList.contains("page-web-elements-actions")) {
          const cta =
            (el.querySelector(".page-web-elements-cta-button") as HTMLElement | null) ??
            (el.querySelector("a.page-web-elements-cta-button") as HTMLElement | null);
          if (!cta) return;
          const ph = "Здесь вы можете написать текст кнопки";
          if (el.getAttribute("data-placeholder") !== ph) {
            el.setAttribute("data-placeholder", ph);
            changed = true;
          }
          const raw = (cta.textContent || "").replace(/\u200b/g, "");
          const visible = raw.replace(/[\s\u00a0]+/g, "").length === 0 ? "1" : "0";
          if (el.getAttribute("data-placeholder-visible") !== visible) {
            el.setAttribute("data-placeholder-visible", visible);
            changed = true;
          }
          return;
        }
        const placeholder = isTitle
          ? "Здесь вы можете написать заголовок"
          : isButton
            ? "Здесь вы можете написать текст кнопки"
            : "Здесь вы можете написать подзаголовок и описание";
        if (el.getAttribute("data-placeholder") !== placeholder) {
          el.setAttribute("data-placeholder", placeholder);
          changed = true;
        }
        const text = (el.textContent || "").replace(/[\u200b\s]+/g, "");
        const visible = text.length === 0 ? "1" : "0";
        if (el.getAttribute("data-placeholder-visible") !== visible) {
          el.setAttribute("data-placeholder-visible", visible);
          changed = true;
        }
      });
    return changed;
  }

  /**
   * В contenteditable ссылка-кнопка ломает ввод (остаётся одна буква). В редакторе — span; при сохранении
   * span[data-href] снова становится <a> для публикации.
   */
  function normalizeWebCoverButtonAnchorsToSpans(root: HTMLElement): boolean {
    let changed = false;
    root
      .querySelectorAll(
        "a.page-web-cover-el-button, a.page-web-cover-el-announcement-learn-more, a.page-web-cover-el-learn-more, a.page-web-elements-announcement-learn-more, a.page-web-elements-cta-button, a.page-web-elements-cta-button-secondary",
      )
      .forEach((node) => {
      const a = node as HTMLAnchorElement;
      const span = document.createElement("span");
      span.className = a.className;
      span.setAttribute("role", "button");
      const href = (a.getAttribute("href") || "").trim();
      if (href && href !== "#" && !href.toLowerCase().startsWith("javascript:")) {
        span.setAttribute("data-href", href);
      }
      if (
        span.classList.contains("page-web-elements-announcement-learn-more") ||
        span.classList.contains("page-web-elements-cta-button") ||
        span.classList.contains("page-web-elements-cta-button-secondary")
      ) {
        span.setAttribute("contenteditable", "false");
        span.setAttribute("tabindex", "-1");
      }
      if (a.hasAttribute(CTA_LINK_EDIT_ATTR)) {
        span.setAttribute(CTA_LINK_EDIT_ATTR, a.getAttribute(CTA_LINK_EDIT_ATTR) || "1");
      }
      while (a.firstChild) span.appendChild(a.firstChild);
      a.parentNode?.replaceChild(span, a);
      changed = true;
    });
    root.querySelectorAll("a.page-web-feature-grid-link").forEach((node) => {
      const a = node as HTMLAnchorElement;
      if (!a.closest(".page-web-feature-grid-item-body")) return;
      const span = document.createElement("span");
      span.className = "page-web-elements-announcement-learn-more";
      span.setAttribute("role", "button");
      span.setAttribute("contenteditable", "false");
      span.setAttribute("tabindex", "-1");
      const href = (a.getAttribute("href") || "").trim();
      if (href && href !== "#" && !href.toLowerCase().startsWith("javascript:")) {
        span.setAttribute("data-href", href);
      }
      let label = (a.textContent ?? "").replace(/\s+/g, " ").trim();
      label = label.replace(/→.*$/, "").trim();
      if (/^learn\s+more/i.test(label)) label = "";
      span.textContent = label || "Подробнее";
      a.parentNode?.replaceChild(span, a);
      changed = true;
    });
    return changed;
  }

  /** Перед сохранением: реальная ссылка из data-href для публичной страницы. */
  function rewriteCoverButtonSpansToAnchorsForPublish(html: string): string {
    if (typeof document === "undefined") return html;
    try {
      const wrap = document.createElement("div");
      wrap.innerHTML = html;
      wrap
        .querySelectorAll(
          "span.page-web-cover-el-button[data-href], span.page-web-cover-el-announcement-learn-more[data-href], span.page-web-cover-el-learn-more[data-href], span.page-web-elements-announcement-learn-more[data-href], span.page-web-elements-cta-button, span.page-web-elements-cta-button-secondary",
        )
        .forEach((node) => {
        const span = node as HTMLSpanElement;
        const hrefRaw = (span.getAttribute("data-href") || "").trim();
        const href =
          hrefRaw && !hrefRaw.toLowerCase().startsWith("javascript:")
            ? hrefRaw
            : "#";
        const a = document.createElement("a");
        a.className = span.className;
        a.setAttribute("href", href);
        while (span.firstChild) a.appendChild(span.firstChild);
        span.parentNode?.replaceChild(a, span);
      });
      return wrap.innerHTML;
    } catch {
      return html;
    }
  }

  function tryHandleWebCoverBackspace(ed: HTMLElement, range: Range): boolean {
    if (!range.collapsed) return false;

    const hostCover = (range.startContainer.nodeType === Node.TEXT_NODE
      ? range.startContainer.parentElement
      : (range.startContainer as Element)
    )?.closest?.(".page-web-cover") as HTMLElement | null;
    if (hostCover && ed.contains(hostCover)) {
      const innerEl = hostCover.querySelector(".page-web-cover-inner");
      const inInner = !!innerEl && (innerEl === range.startContainer || innerEl.contains(range.startContainer));
      if (!inInner) {
        const leakHost =
          range.startContainer.nodeType === Node.TEXT_NODE
            ? (range.startContainer.parentElement as HTMLElement | null)
            : (range.startContainer as HTMLElement);
        if (
          leakHost &&
          hostCover.contains(leakHost) &&
          (!innerEl || !innerEl.contains(leakHost)) &&
          rangeCollapsedAtEditableBlockStart(range, leakHost)
        ) {
          removeWebCoverBlock(hostCover);
          return true;
        }
      }
    }

    const coverInner = (range.startContainer.nodeType === Node.TEXT_NODE
      ? range.startContainer.parentElement
      : (range.startContainer as Element)
    )?.closest?.(".page-web-cover-inner") as HTMLElement | null;
    if (coverInner && ed.contains(coverInner)) {
      const cover = coverInner.closest(".page-web-cover") as HTMLElement | null;
      if (
        cover &&
        isCoverInnerEffectivelyEmpty(coverInner) &&
        rangeCollapsedAtEditableBlockStart(range, coverInner)
      ) {
        removeWebCoverBlock(cover);
        return true;
      }
    }

    let coverBefore = findPrecedingWebCoverFromCaret(ed, range);
    if (!coverBefore) {
      coverBefore = findDeepestWebCoverBeforePoint(ed, range.startContainer);
    }
    if (coverBefore && ed.contains(coverBefore) && rangeCollapsedImmediatelyAfterCover(range, coverBefore)) {
      removeWebCoverBlock(coverBefore);
      return true;
    }
    return false;
  }

  function isCoverInnerEffectivelyEmpty(inner: HTMLElement): boolean {
    const text = inner.innerText.replace(/\u200b/g, "").trim();
    if (text.length > 0) return false;
    for (const ch of Array.from(inner.childNodes)) {
      if (ch.nodeType === Node.TEXT_NODE && (ch.textContent || "").replace(/\u200b/g, "").trim()) return false;
      if (ch.nodeName === "BR") continue;
      if (ch.nodeType === Node.ELEMENT_NODE && (ch as HTMLElement).innerText.replace(/\u200b/g, "").trim()) return false;
    }
    return true;
  }

  function removeWebCoverBlock(cover: HTMLElement) {
    const el = editorRef.current;
    if (!el || !el.contains(cover)) return;
    const parent = cover.parentNode;
    const next = cover.nextSibling;
    cover.remove();
    setContentHtml(el.innerHTML);
    syncMarkerBold();
    const selection = window.getSelection();
    const r = document.createRange();
    if (next) {
      if (next.nodeType === Node.TEXT_NODE) {
        r.setStart(next, 0);
      } else if (next.nodeType === Node.ELEMENT_NODE) {
        r.selectNodeContents(next);
        r.collapse(true);
      } else {
        r.setStart(parent ?? el, 0);
        r.collapse(true);
      }
    } else {
      const pad = document.createElement("div");
      pad.innerHTML = "<br>";
      parent?.appendChild(pad);
      r.setStart(pad, 0);
      r.collapse(true);
    }
    r.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(r);
    savedRangeRef.current = r.cloneRange();
    el.focus();
    setTimeout(() => updateToolbarState(), 0);
  }

  function removeWebCarouselBlock(carousel: HTMLElement) {
    const el = editorRef.current;
    if (!el || !el.contains(carousel)) return;
    const parent = carousel.parentNode;
    const next = carousel.nextSibling;
    carousel.remove();
    setContentHtml(el.innerHTML);
    syncMarkerBold();
    const selection = window.getSelection();
    const r = document.createRange();
    if (next) {
      if (next.nodeType === Node.TEXT_NODE) {
        r.setStart(next, 0);
      } else if (next.nodeType === Node.ELEMENT_NODE) {
        r.selectNodeContents(next);
        r.collapse(true);
      } else {
        r.setStart(parent ?? el, 0);
        r.collapse(true);
      }
    } else {
      const pad = document.createElement("div");
      pad.innerHTML = "<br>";
      parent?.appendChild(pad);
      r.setStart(pad, 0);
      r.collapse(true);
    }
    r.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(r);
    savedRangeRef.current = r.cloneRange();
    el.focus();
    setTimeout(() => updateToolbarState(), 0);
  }

  function removeWebTimelineBlock(timeline: HTMLElement) {
    const el = editorRef.current;
    if (!el || !el.contains(timeline)) return;
    const parent = timeline.parentNode;
    const next = timeline.nextSibling;
    timeline.remove();
    setContentHtml(el.innerHTML);
    syncMarkerBold();
    const selection = window.getSelection();
    const r = document.createRange();
    if (next) {
      if (next.nodeType === Node.TEXT_NODE) {
        r.setStart(next, 0);
      } else if (next.nodeType === Node.ELEMENT_NODE) {
        r.selectNodeContents(next);
        r.collapse(true);
      } else {
        r.setStart(parent ?? el, 0);
        r.collapse(true);
      }
    } else {
      const pad = document.createElement("div");
      pad.innerHTML = "<br>";
      parent?.appendChild(pad);
      r.setStart(pad, 0);
      r.collapse(true);
    }
    r.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(r);
    savedRangeRef.current = r.cloneRange();
    el.focus();
    setTimeout(() => updateToolbarState(), 0);
  }

  function removeWebTextMediaBlock(block: HTMLElement) {
    const el = editorRef.current;
    if (!el || !el.contains(block)) return;
    const parent = block.parentNode;
    const next = block.nextSibling;
    block.remove();
    setContentHtml(el.innerHTML);
    syncMarkerBold();
    const selection = window.getSelection();
    const r = document.createRange();
    if (next) {
      if (next.nodeType === Node.TEXT_NODE) {
        r.setStart(next, 0);
      } else if (next.nodeType === Node.ELEMENT_NODE) {
        r.selectNodeContents(next);
        r.collapse(true);
      } else {
        r.setStart(parent ?? el, 0);
        r.collapse(true);
      }
    } else {
      const pad = document.createElement("div");
      pad.innerHTML = "<br>";
      parent?.appendChild(pad);
      r.setStart(pad, 0);
      r.collapse(true);
    }
    r.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(r);
    savedRangeRef.current = r.cloneRange();
    el.focus();
    setTimeout(() => updateToolbarState(), 0);
  }

  function removeWebTextBlock(block: HTMLElement) {
    const el = editorRef.current;
    if (!el || !el.contains(block)) return;
    const parent = block.parentNode;
    const next = block.nextSibling;
    block.remove();
    setContentHtml(el.innerHTML);
    syncMarkerBold();
    const selection = window.getSelection();
    const r = document.createRange();
    if (next) {
      if (next.nodeType === Node.TEXT_NODE) {
        r.setStart(next, 0);
      } else if (next.nodeType === Node.ELEMENT_NODE) {
        r.selectNodeContents(next);
        r.collapse(true);
      } else {
        r.setStart(parent ?? el, 0);
        r.collapse(true);
      }
    } else {
      const pad = document.createElement("div");
      pad.innerHTML = "<br>";
      parent?.appendChild(pad);
      r.setStart(pad, 0);
      r.collapse(true);
    }
    r.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(r);
    savedRangeRef.current = r.cloneRange();
    el.focus();
    setTimeout(() => updateToolbarState(), 0);
  }

  function removeWebTextBlockV2(block: HTMLElement) {
    const el = editorRef.current;
    if (!el || !el.contains(block)) return;
    const parent = block.parentNode;
    const next = block.nextSibling;
    block.remove();
    setContentHtml(el.innerHTML);
    syncMarkerBold();
    const selection = window.getSelection();
    const r = document.createRange();
    if (next) {
      if (next.nodeType === Node.TEXT_NODE) {
        r.setStart(next, 0);
      } else if (next.nodeType === Node.ELEMENT_NODE) {
        r.selectNodeContents(next);
        r.collapse(true);
      } else {
        r.setStart(parent ?? el, 0);
        r.collapse(true);
      }
    } else {
      const pad = document.createElement("div");
      pad.innerHTML = "<br>";
      parent?.appendChild(pad);
      r.setStart(pad, 0);
      r.collapse(true);
    }
    r.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(r);
    savedRangeRef.current = r.cloneRange();
    el.focus();
    setTimeout(() => updateToolbarState(), 0);
  }

  function removeWebAccordionBlock(block: HTMLElement) {
    const el = editorRef.current;
    if (!el || !el.contains(block)) return;
    const parent = block.parentNode;
    const next = block.nextSibling;
    block.remove();
    setContentHtml(el.innerHTML);
    syncMarkerBold();
    const selection = window.getSelection();
    const r = document.createRange();
    if (next) {
      if (next.nodeType === Node.TEXT_NODE) {
        r.setStart(next, 0);
      } else if (next.nodeType === Node.ELEMENT_NODE) {
        r.selectNodeContents(next);
        r.collapse(true);
      } else {
        r.setStart(parent ?? el, 0);
        r.collapse(true);
      }
    } else if (parent) {
      r.selectNodeContents(parent);
      r.collapse(false);
    } else {
      r.selectNodeContents(el);
      r.collapse(false);
    }
    selection?.removeAllRanges();
    selection?.addRange(r);
    savedRangeRef.current = r.cloneRange();
    el.focus();
    setTimeout(() => updateToolbarState(), 0);
  }

  function removeWebArticleTextBlock(block: HTMLElement) {
    const el = editorRef.current;
    if (!el || !el.contains(block)) return;
    const parent = block.parentNode;
    const next = block.nextSibling;
    block.remove();
    setContentHtml(el.innerHTML);
    syncMarkerBold();
    const selection = window.getSelection();
    const r = document.createRange();
    if (next) {
      if (next.nodeType === Node.TEXT_NODE) {
        r.setStart(next, 0);
      } else if (next.nodeType === Node.ELEMENT_NODE) {
        r.selectNodeContents(next);
        r.collapse(true);
      } else {
        r.setStart(parent ?? el, 0);
        r.collapse(true);
      }
    } else {
      const pad = document.createElement("div");
      pad.innerHTML = "<br>";
      parent?.appendChild(pad);
      r.setStart(pad, 0);
      r.collapse(true);
    }
    r.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(r);
    savedRangeRef.current = r.cloneRange();
    el.focus();
    setTimeout(() => updateToolbarState(), 0);
  }

  const WEB_MENU_DEBUG = true;

  function getWebMenuToolbarDebugState(toolbar: HTMLElement) {
    const openSubs = Array.from(toolbar.querySelectorAll("[data-submenu-open='1']")) as HTMLElement[];
    const rect = toolbar.getBoundingClientRect();
    return {
      toolbarClass: toolbar.className,
      variant: toolbar.getAttribute("data-text-block-variant") || "",
      menuOpen: toolbar.getAttribute("data-menu-open") === "1",
      openSubmenuCount: openSubs.length,
      openSubmenuClasses: openSubs.map((n) => n.className),
      rect: {
        left: Math.round(rect.left),
        top: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
    };
  }

  function logWebMenuDebug(event: string, toolbar: HTMLElement, extra?: Record<string, unknown>) {
    if (!WEB_MENU_DEBUG) return;
    try {
      console.log("[web-menu-debug]", event, {
        ...getWebMenuToolbarDebugState(toolbar),
        ...(extra || {}),
      });
    } catch {
      // Ignore debug logging failures.
    }
  }

  function clearToolbarDropdownVerticalPlacement(toolbar: HTMLElement) {
    toolbar.removeAttribute("data-menu-drop");
  }

  function positionToolbarDropdownVerticalPlacement(toolbar: HTMLElement) {
    const dropdown = toolbar.querySelector(":scope > [role='menu']") as HTMLElement | null;
    if (!dropdown) return;
    const apply = () => {
      clearToolbarDropdownVerticalPlacement(toolbar);
      toolbar.setAttribute("data-menu-drop", "down");
      const viewportGap = 8;
      const ddRect = dropdown.getBoundingClientRect();
      if (ddRect.bottom <= window.innerHeight - viewportGap) return;
      const trigger = toolbar.querySelector(
        ".page-web-cover-menu-trigger, .page-web-carousel-menu-trigger, .page-web-timeline-menu-trigger, .page-web-text-media-menu-trigger, .page-web-text-block-menu-trigger, .page-web-text-block-v2-menu-trigger, .page-web-article-text-menu-trigger, .page-web-accordion-menu-trigger, .page-web-spacer-menu-trigger",
      ) as HTMLElement | null;
      if (!trigger) {
        toolbar.setAttribute("data-menu-drop", "up");
        return;
      }
      const triggerRect = trigger.getBoundingClientRect();
      const spaceBelow = window.innerHeight - triggerRect.bottom - viewportGap;
      const spaceAbove = triggerRect.top - viewportGap;
      toolbar.setAttribute("data-menu-drop", spaceAbove > spaceBelow ? "up" : "down");
    };
    requestAnimationFrame(() => requestAnimationFrame(apply));
  }

  function positionToolbarSubmenuVerticalPlacement(toolbar: HTMLElement) {
    const apply = () => {
      const openSubs = Array.from(
        toolbar.querySelectorAll(
          ".page-web-cover-menu-sub[data-submenu-open='1'], .page-web-carousel-menu-sub[data-submenu-open='1'], .page-web-text-block-menu-sub[data-submenu-open='1']",
        ),
      ) as HTMLElement[];
      const viewportGap = 8;
      openSubs.forEach((sub) => {
        sub.removeAttribute("data-submenu-drop");
        const trigger = sub.querySelector(":scope > .page-web-cover-menu-sub-trigger, :scope > .page-web-carousel-menu-sub-trigger, :scope > .page-web-text-block-menu-sub-trigger") as HTMLElement | null;
        const panel = sub.querySelector(":scope > .page-web-cover-menu-sub-panel, :scope > .page-web-carousel-menu-sub-panel, :scope > .page-web-text-block-menu-sub-panel") as HTMLElement | null;
        if (!trigger || !panel) return;
        sub.setAttribute("data-submenu-drop", "down");
        const panelRect = panel.getBoundingClientRect();
        if (panelRect.bottom <= window.innerHeight - viewportGap) return;
        const triggerRect = trigger.getBoundingClientRect();
        const spaceBelow = window.innerHeight - triggerRect.top - viewportGap;
        const spaceAbove = triggerRect.bottom - viewportGap;
        sub.setAttribute("data-submenu-drop", spaceAbove > spaceBelow ? "up" : "down");
      });
    };
    requestAnimationFrame(() => requestAnimationFrame(apply));
  }

  function resetCarouselMenuDropdownStyles(toolbar: HTMLElement) {
    const dd = toolbar.querySelector(".page-web-carousel-menu-dropdown") as HTMLElement | null;
    if (!dd) return;
    dd.style.removeProperty("position");
    dd.style.removeProperty("left");
    dd.style.removeProperty("top");
    dd.style.removeProperty("right");
    dd.style.removeProperty("transform");
    dd.style.removeProperty("z-index");
    dd.style.removeProperty("min-width");
  }

  function resetCoverMenuDropdownStyles(toolbar: HTMLElement) {
    const dd = toolbar.querySelector(".page-web-cover-menu-dropdown") as HTMLElement | null;
    if (dd) {
      dd.style.removeProperty("position");
      dd.style.removeProperty("left");
      dd.style.removeProperty("top");
      dd.style.removeProperty("right");
      dd.style.removeProperty("transform");
      dd.style.removeProperty("z-index");
      dd.style.removeProperty("min-width");
    }
    toolbar.querySelectorAll(".page-web-cover-menu-sub-panel").forEach((node) => {
      const panel = node as HTMLElement;
      panel.style.removeProperty("position");
      panel.style.removeProperty("left");
      panel.style.removeProperty("top");
      panel.style.removeProperty("right");
      panel.style.removeProperty("transform");
      panel.style.removeProperty("z-index");
    });
    toolbar.querySelectorAll(".page-web-cover-menu-sub").forEach((node) => {
      (node as HTMLElement).removeAttribute("data-submenu-drop");
    });
  }

  function resetTextBlockMenuDropdownStyles(toolbar: HTMLElement) {
    const dd = toolbar.querySelector(".page-web-text-block-menu-dropdown") as HTMLElement | null;
    if (dd) {
      dd.style.removeProperty("display");
      dd.style.removeProperty("visibility");
      dd.style.removeProperty("opacity");
      dd.style.removeProperty("pointer-events");
      dd.removeAttribute("data-force-hidden");
    }
    toolbar.querySelectorAll(".page-web-text-block-menu-sub-panel").forEach((node) => {
      const panel = node as HTMLElement;
      panel.style.removeProperty("display");
      panel.style.removeProperty("visibility");
      panel.style.removeProperty("opacity");
      panel.style.removeProperty("pointer-events");
      panel.removeAttribute("data-force-hidden");
    });
    toolbar.querySelectorAll(".page-web-text-block-menu-sub").forEach((node) => {
      (node as HTMLElement).removeAttribute("data-submenu-drop");
    });
  }

  /** Возвращаем баннерное меню к CSS-якорю рядом с кнопкой ⋮ (absolute от тулбара). */
  function positionCoverMenuDropdownFixed(toolbar: HTMLElement) {
    resetCoverMenuDropdownStyles(toolbar);
  }

  function positionCoverSubmenuPanelsFixed(toolbar: HTMLElement) {
    toolbar.querySelectorAll(".page-web-cover-menu-sub-panel").forEach((node) => {
      const panel = node as HTMLElement;
      panel.style.removeProperty("position");
      panel.style.removeProperty("left");
      panel.style.removeProperty("top");
      panel.style.removeProperty("right");
      panel.style.removeProperty("bottom");
      panel.style.removeProperty("transform");
      panel.style.removeProperty("z-index");
    });
  }

  /** Меню ⋮ в слое fixed — иначе слайды/stacking перекрывают absolute-выпадашку. */
  function positionCarouselMenuDropdownFixed(toolbar: HTMLElement) {
    const dd = toolbar.querySelector(".page-web-carousel-menu-dropdown") as HTMLElement | null;
    const trig = toolbar.querySelector(".page-web-carousel-menu-trigger") as HTMLElement | null;
    if (!dd || !trig) return;
    const apply = () => {
      const r = trig.getBoundingClientRect();
      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;
      dd.style.position = "fixed";
      dd.style.left = `${r.right + 4}px`;
      dd.style.top = `${r.top}px`;
      dd.style.right = "auto";
      dd.style.transform = "none";
      dd.style.zIndex = "10000";
      dd.style.minWidth = "12rem";
      const ddRect = dd.getBoundingClientRect();
      const leftIfRight = r.right + 4;
      const leftIfLeft = r.left - ddRect.width - 4;
      const clampedLeft = leftIfRight + ddRect.width <= viewportW - 8
        ? leftIfRight
        : Math.max(8, leftIfLeft);
      const clampedTop = Math.max(8, Math.min(r.top, viewportH - ddRect.height - 8));
      dd.style.left = `${clampedLeft}px`;
      dd.style.top = `${clampedTop}px`;
    };
    requestAnimationFrame(() => {
      requestAnimationFrame(apply);
    });
  }

  function closeCarouselToolbarMenus(toolbar: HTMLElement) {
    logWebMenuDebug("close-carousel:start", toolbar);
    toolbar.querySelectorAll('.page-web-carousel-menu-sub[data-submenu-open="1"]').forEach((s) => {
      (s as HTMLElement).removeAttribute("data-submenu-open");
    });
    toolbar.querySelectorAll(".page-web-carousel-menu-sub").forEach((s) => {
      (s as HTMLElement).removeAttribute("data-submenu-drop");
    });
    toolbar.querySelectorAll(".page-web-carousel-menu-sub-trigger").forEach((tr) => {
      (tr as HTMLElement).setAttribute("aria-expanded", "false");
    });
    toolbar.removeAttribute("data-menu-open");
    clearToolbarDropdownVerticalPlacement(toolbar);
    resetCarouselMenuDropdownStyles(toolbar);
    logWebMenuDebug("close-carousel:end", toolbar);
  }

  function closeTimelineToolbarMenus(toolbar: HTMLElement) {
    toolbar.removeAttribute("data-menu-open");
    clearToolbarDropdownVerticalPlacement(toolbar);
  }

  function closeTextMediaToolbarMenus(toolbar: HTMLElement) {
    logWebMenuDebug("close-text-media:start", toolbar);
    toolbar.removeAttribute("data-menu-open");
    clearToolbarDropdownVerticalPlacement(toolbar);
    logWebMenuDebug("close-text-media:end", toolbar);
  }

  function closeTextBlockV2ToolbarMenus(toolbar: HTMLElement) {
    logWebMenuDebug("close-text-block-v2:start", toolbar);
    // Сначала вложения (панель «Элементы»), затем основное меню — иначе на один кадр/правило панель может остаться видимой.
    toolbar.querySelectorAll('.page-web-text-block-menu-sub[data-submenu-open="1"]').forEach((s) => {
      (s as HTMLElement).removeAttribute("data-submenu-open");
    });
    toolbar.querySelectorAll(".page-web-text-block-menu-sub").forEach((node) => {
      (node as HTMLElement).removeAttribute("data-submenu-drop");
    });
    toolbar.querySelectorAll(".page-web-text-block-menu-sub-panel").forEach((node) => {
      const panel = node as HTMLElement;
      panel.style.removeProperty("display");
      panel.style.removeProperty("visibility");
      panel.style.removeProperty("opacity");
      panel.style.removeProperty("pointer-events");
      panel.removeAttribute("data-force-hidden");
      panel.style.removeProperty("position");
      panel.style.removeProperty("left");
      panel.style.removeProperty("top");
      panel.style.removeProperty("right");
      panel.style.removeProperty("transform");
      panel.style.removeProperty("z-index");
    });
    toolbar.querySelectorAll(".page-web-text-block-menu-sub-trigger").forEach((tr) => {
      (tr as HTMLElement).setAttribute("aria-expanded", "false");
    });
    void toolbar.offsetHeight;
    const dd = toolbar.querySelector(".page-web-text-block-v2-menu-dropdown") as HTMLElement | null;
    if (dd) {
      dd.style.removeProperty("display");
      dd.style.removeProperty("visibility");
      dd.style.removeProperty("opacity");
      dd.style.removeProperty("pointer-events");
      dd.removeAttribute("data-force-hidden");
    }
    toolbar.removeAttribute("data-menu-open");
    clearToolbarDropdownVerticalPlacement(toolbar);
    void toolbar.offsetHeight;
    logWebMenuDebug("close-text-block-v2:end", toolbar);
  }

  function closeArticleTextToolbarMenus(toolbar: HTMLElement) {
    logWebMenuDebug("close-article-text:start", toolbar);
    toolbar.querySelectorAll('.page-web-text-block-menu-sub[data-submenu-open="1"]').forEach((s) => {
      (s as HTMLElement).removeAttribute("data-submenu-open");
    });
    toolbar.querySelectorAll(".page-web-text-block-menu-sub").forEach((node) => {
      (node as HTMLElement).removeAttribute("data-submenu-drop");
    });
    toolbar.querySelectorAll(".page-web-text-block-menu-sub-panel").forEach((node) => {
      const panel = node as HTMLElement;
      panel.style.removeProperty("display");
      panel.style.removeProperty("visibility");
      panel.style.removeProperty("opacity");
      panel.style.removeProperty("pointer-events");
      panel.removeAttribute("data-force-hidden");
      panel.style.removeProperty("position");
      panel.style.removeProperty("left");
      panel.style.removeProperty("top");
      panel.style.removeProperty("right");
      panel.style.removeProperty("transform");
      panel.style.removeProperty("z-index");
    });
    toolbar.querySelectorAll(".page-web-text-block-menu-sub-trigger").forEach((tr) => {
      (tr as HTMLElement).setAttribute("aria-expanded", "false");
    });
    void toolbar.offsetHeight;
    const dd = toolbar.querySelector(".page-web-article-text-menu-dropdown") as HTMLElement | null;
    if (dd) {
      dd.style.removeProperty("display");
      dd.style.removeProperty("visibility");
      dd.style.removeProperty("opacity");
      dd.style.removeProperty("pointer-events");
      dd.removeAttribute("data-force-hidden");
    }
    toolbar.removeAttribute("data-menu-open");
    clearToolbarDropdownVerticalPlacement(toolbar);
    void toolbar.offsetHeight;
    logWebMenuDebug("close-article-text:end", toolbar);
  }

  function closeAccordionToolbarMenus(toolbar: HTMLElement) {
    toolbar.querySelectorAll('.page-web-text-block-menu-sub[data-submenu-open="1"]').forEach((s) => {
      (s as HTMLElement).removeAttribute("data-submenu-open");
    });
    toolbar.querySelectorAll(".page-web-text-block-menu-sub").forEach((node) => {
      (node as HTMLElement).removeAttribute("data-submenu-drop");
    });
    toolbar.querySelectorAll(".page-web-text-block-menu-sub-panel").forEach((node) => {
      const panel = node as HTMLElement;
      panel.style.removeProperty("display");
      panel.style.removeProperty("visibility");
      panel.style.removeProperty("opacity");
      panel.style.removeProperty("pointer-events");
      panel.removeAttribute("data-force-hidden");
      panel.style.removeProperty("position");
      panel.style.removeProperty("left");
      panel.style.removeProperty("top");
      panel.style.removeProperty("right");
      panel.style.removeProperty("transform");
      panel.style.removeProperty("z-index");
    });
    toolbar.querySelectorAll(".page-web-text-block-menu-sub-trigger").forEach((tr) => {
      (tr as HTMLElement).setAttribute("aria-expanded", "false");
    });
    const dd = toolbar.querySelector(".page-web-accordion-menu-dropdown") as HTMLElement | null;
    if (dd) {
      dd.style.removeProperty("display");
      dd.style.removeProperty("visibility");
      dd.style.removeProperty("opacity");
      dd.style.removeProperty("pointer-events");
      dd.removeAttribute("data-force-hidden");
    }
    toolbar.removeAttribute("data-menu-open");
    clearToolbarDropdownVerticalPlacement(toolbar);
    void toolbar.offsetHeight;
  }

  function closeTextBlockToolbarMenus(toolbar: HTMLElement) {
    logWebMenuDebug("close-text-block:start", toolbar);
    const dd = toolbar.querySelector(".page-web-text-block-menu-dropdown") as HTMLElement | null;
    if (dd) {
      dd.style.display = "none";
      dd.style.visibility = "hidden";
      dd.style.opacity = "0";
      dd.style.pointerEvents = "none";
      dd.setAttribute("data-force-hidden", "1");
    }
    toolbar.querySelectorAll(".page-web-text-block-menu-sub-panel").forEach((node) => {
      const panel = node as HTMLElement;
      panel.style.display = "none";
      panel.style.visibility = "hidden";
      panel.style.opacity = "0";
      panel.style.pointerEvents = "none";
      panel.setAttribute("data-force-hidden", "1");
    });
    toolbar.querySelectorAll('.page-web-text-block-menu-sub[data-submenu-open="1"]').forEach((s) => {
      (s as HTMLElement).removeAttribute("data-submenu-open");
    });
    toolbar.querySelectorAll(".page-web-text-block-menu-sub-trigger").forEach((tr) => {
      (tr as HTMLElement).setAttribute("aria-expanded", "false");
    });
    toolbar.removeAttribute("data-menu-open");
    clearToolbarDropdownVerticalPlacement(toolbar);
    // Safari repaint workaround: force synchronous layout after hiding overlay layers.
    void toolbar.offsetHeight;
    logWebMenuDebug("close-text-block:end", toolbar);
  }

  function closeSpacerToolbarMenus(toolbar: HTMLElement) {
    toolbar.removeAttribute("data-menu-open");
    clearToolbarDropdownVerticalPlacement(toolbar);
  }

  function closeAllOpenWebBlockMenus(ed: HTMLElement) {
    if (WEB_MENU_DEBUG) {
      console.log("[web-menu-debug] close-all:start", {
        cover: ed.querySelectorAll(".page-web-cover-toolbar").length,
        carousel: ed.querySelectorAll(".page-web-carousel-toolbar").length,
        timeline: ed.querySelectorAll(".page-web-timeline-toolbar").length,
        textMedia: ed.querySelectorAll(".page-web-text-media-toolbar").length,
        textBlock: ed.querySelectorAll(".page-web-text-block-toolbar").length,
        textBlockV2: ed.querySelectorAll(".page-web-text-block-v2-toolbar").length,
        articleText: ed.querySelectorAll(".page-web-article-text-toolbar").length,
        accordion: ed.querySelectorAll(".page-web-accordion-toolbar").length,
      });
    }
    ed.querySelectorAll(".page-web-cover-toolbar").forEach((node) => {
      closeCoverToolbarMenus(node as HTMLElement);
    });
    ed.querySelectorAll(".page-web-carousel-toolbar").forEach((node) => {
      closeCarouselToolbarMenus(node as HTMLElement);
    });
    ed.querySelectorAll(".page-web-timeline-toolbar").forEach((node) => {
      closeTimelineToolbarMenus(node as HTMLElement);
    });
    ed.querySelectorAll(".page-web-text-media-toolbar").forEach((node) => {
      closeTextMediaToolbarMenus(node as HTMLElement);
    });
    ed.querySelectorAll(".page-web-text-block-toolbar").forEach((node) => {
      closeTextBlockToolbarMenus(node as HTMLElement);
    });
    ed.querySelectorAll(".page-web-text-block-v2-toolbar").forEach((node) => {
      closeTextBlockV2ToolbarMenus(node as HTMLElement);
    });
    ed.querySelectorAll(".page-web-article-text-toolbar").forEach((node) => {
      closeArticleTextToolbarMenus(node as HTMLElement);
    });
    ed.querySelectorAll(".page-web-accordion-toolbar").forEach((node) => {
      closeAccordionToolbarMenus(node as HTMLElement);
    });
    ed.querySelectorAll(".page-web-spacer-toolbar").forEach((node) => {
      closeSpacerToolbarMenus(node as HTMLElement);
    });
    if (WEB_MENU_DEBUG) {
      console.log("[web-menu-debug] close-all:end");
    }
  }

  useEffect(() => {
    const onDocMouseDown = (event: MouseEvent) => {
      const ed = editorRef.current;
      if (!ed) return;
      const raw = event.target as EventTarget | null;
      const target = raw instanceof Element ? raw : (raw as Node | null)?.parentElement ?? null;
      const insideMenuSurface = !!target?.closest(
        [
          ".page-web-cover-menu-trigger",
          ".page-web-cover-menu-sub-trigger",
          ".page-web-cover-menu-dropdown",
          ".page-web-cover-menu-sub-panel",
          ".page-web-carousel-menu-trigger",
          ".page-web-carousel-menu-sub-trigger",
          ".page-web-carousel-menu-dropdown",
          ".page-web-carousel-menu-sub-panel",
          ".page-web-timeline-menu-trigger",
          ".page-web-timeline-menu-dropdown",
          ".page-web-text-media-menu-trigger",
          ".page-web-text-media-menu-dropdown",
          ".page-web-text-block-menu-trigger",
          ".page-web-text-block-menu-sub-trigger",
          ".page-web-text-block-menu-dropdown",
          ".page-web-text-block-menu-sub-panel",
          ".page-web-text-block-v2-menu-trigger",
          ".page-web-text-block-v2-menu-dropdown",
          ".page-web-article-text-menu-trigger",
          ".page-web-article-text-menu-dropdown",
          ".page-web-accordion-menu-trigger",
          ".page-web-accordion-menu-dropdown",
          ".page-web-spacer-menu-trigger",
          ".page-web-spacer-menu-dropdown",
        ].join(", "),
      );
      if (insideMenuSurface) {
        if (WEB_MENU_DEBUG) {
          console.log("[web-menu-debug] doc-mousedown:inside-menu", {
            targetClass: target?.className || "",
          });
        }
        return;
      }
      if (WEB_MENU_DEBUG) {
        console.log("[web-menu-debug] doc-mousedown:outside-menu", {
          targetClass: target?.className || "",
        });
      }
      closeAllOpenWebBlockMenus(ed);
    };
    document.addEventListener("mousedown", onDocMouseDown, true);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown, true);
    };
  }, []);

  function getActiveCarouselSlide(carousel: HTMLElement): HTMLElement | null {
    const active = carousel.querySelector(".page-web-carousel-slide[data-carousel-active]") as HTMLElement | null;
    if (active) return active;
    return carousel.querySelector(".page-web-carousel-slide") as HTMLElement | null;
  }

  function buildCarouselPreviewSession(carousel: HTMLElement, preferredSlide?: HTMLElement | null): CarouselPreviewSessionState | null {
    const slides = Array.from(carousel.querySelectorAll(".page-web-carousel-slide")) as HTMLElement[];
    if (slides.length === 0) return null;
    const pref = preferredSlide && slides.includes(preferredSlide) ? preferredSlide : getActiveCarouselSlide(carousel);
    const idx = pref ? Math.max(0, slides.indexOf(pref)) : 0;
    const aspectRaw = carousel.getAttribute("data-carousel-aspect");
    const aspect: CarouselPreviewSessionState["aspect"] =
      aspectRaw === "vertical" || aspectRaw === "square" || aspectRaw === "a4"
        ? aspectRaw
        : "horizontal";
    return {
      aspect,
      index: idx,
      slides: slides.map((slide, i) => {
        const img = slide.querySelector(".page-web-carousel-img") as HTMLImageElement | null;
        const placeholder = slide.querySelector(".page-web-carousel-placeholder") as HTMLElement | null;
        const fallback = `Слайд ${i + 1}`;
        return {
          src: img?.getAttribute("src") || null,
          label: (placeholder?.textContent || "").trim() || fallback,
        };
      }),
    };
  }

  function ensureWebCarouselStripInViewport(viewport: HTMLElement): HTMLElement {
    let strip = viewport.querySelector(":scope > .page-web-carousel-strip") as HTMLElement | null;
    if (strip) return strip;
    strip = document.createElement("div");
    strip.className = "page-web-carousel-strip";
    for (const s of Array.from(viewport.querySelectorAll(":scope > .page-web-carousel-slide"))) {
      strip.appendChild(s);
    }
    viewport.appendChild(strip);
    return strip;
  }

  function insertWebPageElement(kind: string) {
    const html = getWebElementHtml(kind);
    if (!html) return;
    const el = editorRef.current;
    if (!el) return;
    const targetBlock = insertWebAfterBlockRef.current;
    if (targetBlock && targetBlock.isConnected && el.contains(targetBlock)) {
      targetBlock.insertAdjacentHTML("afterend", html);
    } else {
      el.insertAdjacentHTML("beforeend", html);
    }
    insertWebAfterBlockRef.current = null;
    setContentHtml(el.innerHTML);
    setAddElementDialogOpen(false);
    syncMarkerBold();
    setTimeout(updateToolbarState, 0);
  }

  function openAddElementDialog(afterBlock: HTMLElement | null) {
    insertWebAfterBlockRef.current = afterBlock;
    setAddElementDialogOpen(true);
  }

  function closeAddElementDialog() {
    insertWebAfterBlockRef.current = null;
    setAddElementDialogOpen(false);
  }

  const STRUCTURED_EDITABLE_SELECTOR =
    '.page-web-cover-inner[data-cover-unlocked="1"], .page-web-timeline-head, .page-web-timeline-subtitle, .page-web-timeline-heading, .page-web-timeline-description, .page-web-timeline-term, .page-web-timeline-text, .page-web-text-media-col, .page-web-text-block-content, table.page-editor-table td[data-cell-editing]';

  function getStructuredEditableContainer(ed: HTMLElement, node: Node | null): HTMLElement | null {
    if (!node) return null;
    let probe: Node | null = node;
    if (probe.nodeType === Node.TEXT_NODE) probe = probe.parentElement;
    if (!(probe instanceof Element)) return null;
    const container = probe.closest(STRUCTURED_EDITABLE_SELECTOR) as HTMLElement | null;
    return container && ed.contains(container) ? container : null;
  }

  function getCoverEditableLeaf(node: Node | null): HTMLElement | null {
    if (!node) return null;
    let probe: Node | null = node;
    if (probe.nodeType === Node.TEXT_NODE) probe = probe.parentElement;
    if (!(probe instanceof Element)) return null;
    const coverInner = probe.closest(".page-web-cover-inner");
    if (coverInner) {
      const titleIsland = coverInner.querySelector(
        ":scope > .page-web-elements.page-web-elements-title",
      ) as HTMLElement | null;
      if (titleIsland && (titleIsland === probe || titleIsland.contains(probe))) {
        if (probe instanceof HTMLTextAreaElement && probe.classList.contains("page-web-elements-title-input")) {
          return probe;
        }
        return titleIsland;
      }
      const descWrap = coverInner.querySelector(
        ":scope > .page-web-elements.page-web-elements-description",
      ) as HTMLElement | null;
      if (descWrap && (descWrap === probe || descWrap.contains(probe))) {
        if (probe instanceof HTMLTextAreaElement && probe.classList.contains("page-web-elements-description-input")) {
          return probe;
        }
        return (
          (descWrap.querySelector("textarea.page-web-elements-description-input") as HTMLTextAreaElement | null) ??
          descWrap
        );
      }
      const annWrap = coverInner.querySelector(
        ":scope > .page-web-elements.page-web-elements-announcement",
      ) as HTMLElement | null;
      if (annWrap && (annWrap === probe || annWrap.contains(probe))) {
        if (probe instanceof HTMLElement && probe.classList.contains("page-web-elements-announcement-input")) {
          return probe;
        }
        return (
          (annWrap.querySelector(".page-web-elements-announcement-input") as HTMLElement | null) ?? annWrap
        );
      }
      const actionsWrap = coverInner.querySelector(":scope > .page-web-elements-actions") as HTMLElement | null;
      if (actionsWrap && (actionsWrap === probe || actionsWrap.contains(probe))) {
        if (
          probe instanceof HTMLElement &&
          (probe.matches(".page-web-elements-cta-button") ||
            probe.matches("a.page-web-elements-cta-button") ||
            probe.matches(".page-web-elements-cta-button-secondary") ||
            probe.matches("a.page-web-elements-cta-button-secondary"))
        ) {
          return probe;
        }
        return (
          (actionsWrap.querySelector(
            ".page-web-elements-cta-button, a.page-web-elements-cta-button, .page-web-elements-cta-button-secondary, a.page-web-elements-cta-button-secondary",
          ) as HTMLElement | null) ?? actionsWrap
        );
      }
    }
    return probe.closest(
      ".page-web-cover-el-subtitle, .page-web-cover-el-button-wrap, .page-web-cover-el-announcement-wrap, .page-web-cover-el-learn-more, .page-web-cover-el-announcement-learn-more, .page-web-elements.page-web-elements-description, .page-web-elements-description-input, .page-web-elements-actions, .page-web-elements-actions-cluster, .page-web-elements-cta-button, a.page-web-elements-cta-button",
    ) as HTMLElement | null;
  }

  function resolveBoundaryCoverLeaf(range: Range, atStart: boolean): HTMLElement | null {
    const container = atStart ? range.startContainer : range.endContainer;
    const offset = atStart ? range.startOffset : range.endOffset;
    const direct = getCoverEditableLeaf(container);
    if (direct) return direct;

    if (container.nodeType === Node.ELEMENT_NODE) {
      const el = container as Element;
      const childCount = el.childNodes.length;
      const idx = Math.max(0, Math.min(offset, childCount));
      const preferred =
        atStart
          ? el.childNodes[idx] ?? el.childNodes[idx - 1] ?? null
          : el.childNodes[idx - 1] ?? el.childNodes[idx] ?? null;
      const byChild = getCoverEditableLeaf(preferred);
      if (byChild) return byChild;
    }

    return null;
  }

  function getGenericEditableLeaf(node: Node | null): HTMLElement | null {
    if (!node) return null;
    let probe: Node | null = node;
    if (probe.nodeType === Node.TEXT_NODE) probe = probe.parentElement;
    if (!(probe instanceof Element)) return null;
    return probe.closest(
      "h1, h2, h3, h4, h5, h6, p, li, dt, dd, blockquote, textarea.page-web-elements-title-input, textarea.page-web-elements-title2-input, textarea.page-web-elements-subtitle-input, textarea.page-web-elements-description-input, .page-web-feature-grid-item-title, .page-web-timeline-term, .page-web-timeline-text, .wti, .wty, .wsx, .wsy, .page-web-elements-cta-button",
    ) as HTMLElement | null;
  }

  function resolveBoundaryGenericLeaf(range: Range, atStart: boolean, root: HTMLElement): HTMLElement | null {
    const container = atStart ? range.startContainer : range.endContainer;
    const offset = atStart ? range.startOffset : range.endOffset;
    const direct = getGenericEditableLeaf(container);
    if (direct && root.contains(direct)) return direct;

    if (container.nodeType === Node.ELEMENT_NODE) {
      const el = container as Element;
      const childCount = el.childNodes.length;
      const idx = Math.max(0, Math.min(offset, childCount));
      const preferred =
        atStart
          ? el.childNodes[idx] ?? el.childNodes[idx - 1] ?? null
          : el.childNodes[idx - 1] ?? el.childNodes[idx] ?? null;
      const byChild = getGenericEditableLeaf(preferred);
      if (byChild && root.contains(byChild)) return byChild;
    }

    return null;
  }

  function getRangeEditScope(ed: HTMLElement, range: Range, atStart: boolean): HTMLElement | null {
    const container = atStart ? range.startContainer : range.endContainer;
    const structured = getStructuredEditableContainer(ed, container);
    if (!structured) return null;
    if (structured.classList.contains("page-web-cover-inner")) {
      return resolveBoundaryCoverLeaf(range, atStart) ?? null;
    }
    if (
      structured.classList.contains("page-web-text-block-content") ||
      structured.classList.contains("page-web-text-media-col")
    ) {
      return resolveBoundaryGenericLeaf(range, atStart, structured) ?? structured;
    }
    return structured;
  }

  function isRangeWithinSingleEditScope(ed: HTMLElement, range: Range): boolean {
    const startScope = getRangeEditScope(ed, range, true);
    const endScope = getRangeEditScope(ed, range, false);
    return !!startScope && !!endScope && startScope === endScope;
  }

  function clampRangeInsideScopeContents(range: Range, scope: HTMLElement): Range {
    const next = range.cloneRange();
    const scopeStart = document.createRange();
    scopeStart.selectNodeContents(scope);
    scopeStart.collapse(true);
    const scopeEnd = document.createRange();
    scopeEnd.selectNodeContents(scope);
    scopeEnd.collapse(false);

    try {
      if (!scope.contains(next.startContainer) && next.startContainer !== scope) {
        next.setStart(scopeStart.startContainer, scopeStart.startOffset);
      }
      if (!scope.contains(next.endContainer) && next.endContainer !== scope) {
        next.setEnd(scopeEnd.endContainer, scopeEnd.endOffset);
      }
      if (next.compareBoundaryPoints(Range.START_TO_START, scopeStart) < 0) {
        next.setStart(scopeStart.startContainer, scopeStart.startOffset);
      }
      if (next.compareBoundaryPoints(Range.END_TO_END, scopeEnd) > 0) {
        next.setEnd(scopeEnd.endContainer, scopeEnd.endOffset);
      }
    } catch {
      return scopeStart;
    }

    return next;
  }

  function isRangeInsideStructuredTextBlock(ed: HTMLElement, range: Range): boolean {
    if (!ed.contains(range.commonAncestorContainer)) return false;
    return Boolean(getStructuredEditableContainer(ed, range.startContainer));
  }

  function tryKeepCaretInsideEmptyTextBlockContent(ed: HTMLElement, range: Range): boolean {
    if (!range.collapsed) return false;
    let node: Node | null = range.startContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    if (!node || !(node instanceof Element)) return false;
    const content = node.closest(".page-web-text-block-content") as HTMLElement | null;
    if (!content || !ed.contains(content)) return false;

    const hasText = (content.textContent || "").replace(/\u200b/g, "").trim().length > 0;
    const hasStructuredPayload = !!content.querySelector(
      "img, table.page-editor-table, .page-editor-image-wrapper, .page-web-feature-grid, .page-web-work-pricing",
    );
    if (hasText || hasStructuredPayload) return false;

    if (content.childNodes.length === 0) {
      content.appendChild(document.createElement("br"));
    }
    const sel = window.getSelection();
    if (sel) {
      const next = document.createRange();
      next.selectNodeContents(content);
      next.collapse(true);
      sel.removeAllRanges();
      sel.addRange(next);
    }
    return true;
  }

  function tryKeepEmptyTextBlockHeading(ed: HTMLElement, range: Range): boolean {
    if (!range.collapsed) return false;
    let node: Node | null = range.startContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    if (!node || !(node instanceof Element)) return false;
    const heading = node.closest("h1, h2, h3, h4, h5, h6") as HTMLElement | null;
    const featureGridCardTitle = node.closest(".page-web-feature-grid-item-title") as HTMLElement | null;
    const target = heading ?? featureGridCardTitle;
    if (!target) return false;
    const content = target.closest(".page-web-text-block-content") as HTMLElement | null;
    if (!content || !ed.contains(content) || !content.contains(target)) return false;
    if (!isRangeAtElementStart(range, target) && !isRangeAtElementStartLenient(range, target)) return false;
    const text = (target.textContent || "").replace(/[\u200b\u00a0\s]+/g, "");
    const hasStructuredPayload = !!target.querySelector("img, table, ul, ol, iframe, video");
    const isFeatureGridCardTitle = target.classList.contains("page-web-feature-grid-item-title");
    if (text.length > 0 || (!isFeatureGridCardTitle && hasStructuredPayload)) return false;
    if (target.childNodes.length === 0) {
      target.appendChild(document.createElement("br"));
    }
    const sel = window.getSelection();
    if (sel) {
      const keep = document.createRange();
      keep.selectNodeContents(target);
      keep.collapse(true);
      sel.removeAllRanges();
      sel.addRange(keep);
    }
    return true;
  }

  function isRangeAtElementStart(range: Range, element: HTMLElement): boolean {
    if (!range.collapsed) return false;
    const atStart = document.createRange();
    atStart.selectNodeContents(element);
    atStart.collapse(true);
    return range.compareBoundaryPoints(Range.START_TO_START, atStart) === 0;
  }

  function isRangeAtElementStartLenient(range: Range, element: HTMLElement): boolean {
    if (!range.collapsed) return false;
    if (!element.contains(range.startContainer) && range.startContainer !== element) return false;
    try {
      const probe = document.createRange();
      probe.selectNodeContents(element);
      probe.setEnd(range.startContainer, range.startOffset);
      const text = probe.toString().replace(/[\u200b\s]+/g, "");
      if (text.length > 0) return false;
      const frag = probe.cloneContents();
      const walker = document.createTreeWalker(frag, NodeFilter.SHOW_ELEMENT);
      let n: Node | null = walker.nextNode();
      while (n) {
        const tag = (n as Element).tagName;
        if (tag !== "BR" && tag !== "WBR") return false;
        n = walker.nextNode();
      }
      return true;
    } catch {
      return false;
    }
  }

  function tryPreventCoverElementBackspaceMerge(ed: HTMLElement, range: Range): boolean {
    if (!range.collapsed) return false;
    let node: Node | null = range.startContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    if (!node || !(node instanceof Element)) return false;

    const inner = node.closest(".page-web-cover-inner[data-cover-unlocked='1']") as HTMLElement | null;
    if (!inner || !ed.contains(inner)) return false;

    let current = node.closest(
      ".page-web-cover-el-subtitle, .page-web-cover-el-button-wrap, .page-web-cover-el-button, .page-web-cover-el-announcement-wrap, .page-web-cover-el-learn-more, .page-web-cover-el-announcement-learn-more, .page-web-cover-el-announcement-text, .page-web-elements.page-web-elements-announcement, .page-web-elements-announcement-input, .page-web-elements-announcement-learn-more, .page-web-elements.page-web-elements-description, .page-web-elements-description-input, .page-web-elements-actions, .page-web-elements-actions-cluster, .page-web-elements-cta-button, a.page-web-elements-cta-button",
    ) as HTMLElement | null;
    if (!current && range.startContainer === inner) {
      const offset = Math.max(0, Math.min(range.startOffset, inner.childNodes.length));
      for (let i = offset; i < inner.childNodes.length; i += 1) {
        const ch = inner.childNodes[i];
        if (ch.nodeType === Node.TEXT_NODE) {
          if ((ch.textContent || "").replace(/[\u200b\s]+/g, "") === "") continue;
          break;
        }
        if (ch.nodeType !== Node.ELEMENT_NODE) break;
        const elCh = ch as HTMLElement;
        if (
          elCh.matches(
            ".page-web-cover-el-subtitle, .page-web-cover-el-button-wrap, .page-web-cover-el-announcement-wrap, .page-web-cover-el-learn-more, .page-web-cover-el-announcement-learn-more, .page-web-cover-el-announcement-text, .page-web-elements.page-web-elements-announcement, .page-web-elements.page-web-elements-description, .page-web-elements-actions",
          )
        ) {
          current = elCh;
        }
        break;
      }
    }
    if (!current || !inner.contains(current)) return false;
    const buttonInCurrent = current.matches(".page-web-cover-el-button")
      ? current
      : current.matches(".page-web-elements-cta-button") || current.matches("a.page-web-elements-cta-button")
        ? current
        : ((current.querySelector(".page-web-cover-el-button") as HTMLElement | null) ??
          (current.querySelector(
            ".page-web-elements-cta-button, a.page-web-elements-cta-button, .page-web-elements-cta-button-secondary, a.page-web-elements-cta-button-secondary",
          ) as HTMLElement | null));
    const atCurrentStart = isRangeAtElementStart(range, current) || isRangeAtElementStartLenient(range, current);
    const atButtonStart = !!buttonInCurrent && (
      isRangeAtElementStart(range, buttonInCurrent) || isRangeAtElementStartLenient(range, buttonInCurrent)
    );
    if (!atCurrentStart && !atButtonStart) return false;
    const keepTarget = atButtonStart ? (buttonInCurrent as HTMLElement) : current;

    const sel = window.getSelection();
    if (sel) {
      const keep = document.createRange();
      keep.selectNodeContents(keepTarget);
      keep.collapse(true);
      sel.removeAllRanges();
      sel.addRange(keep);
      savedRangeRef.current = keep.cloneRange();
    }
    return true;
  }

  function tryPreventTextBlockSiblingBackspaceMerge(ed: HTMLElement, range: Range): boolean {
    if (!range.collapsed) return false;
    let node: Node | null = range.startContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    if (!node || !(node instanceof Element)) return false;

    const content = node.closest(".page-web-text-block-content") as HTMLElement | null;
    if (!content || !ed.contains(content)) return false;
    const keepCaretAtStart = (target: HTMLElement): boolean => {
      const sel = window.getSelection();
      if (sel) {
        const keep = document.createRange();
        keep.selectNodeContents(target);
        keep.collapse(true);
        sel.removeAllRanges();
        sel.addRange(keep);
        savedRangeRef.current = keep.cloneRange();
      }
      return true;
    };
    const isAtElementTextStart = (target: HTMLElement): boolean => {
      if (!target.contains(range.startContainer)) return false;
      if (isRangeAtElementStart(range, target) || isRangeAtElementStartLenient(range, target)) return true;
      try {
        const before = document.createRange();
        before.selectNodeContents(target);
        before.setEnd(range.startContainer, range.startOffset);
        const textBefore = (before.toString() || "").replace(/[\u200b\u00a0\s]+/g, "");
        return textBefore.length === 0;
      } catch {
        return false;
      }
    };

    const currentLi = node.closest("li") as HTMLElement | null;
    if (currentLi && content.contains(currentLi)) {
      if (isRangeAtElementStart(range, currentLi) || isRangeAtElementStartLenient(range, currentLi)) {
        const list = currentLi.parentElement;
        const isFirstItem = !currentLi.previousElementSibling;
        const immediatePrev = (list?.previousElementSibling as HTMLElement | null) ?? null;
        const prevIsHeading =
          !!immediatePrev &&
          (/^H[1-6]$/.test(immediatePrev.tagName) || immediatePrev.classList.contains("page-web-feature-grid-item-title"));
        if (isFirstItem && prevIsHeading) return keepCaretAtStart(currentLi);
      }
    }

    const currentParagraph = node.closest("p") as HTMLElement | null;
    if (currentParagraph && content.contains(currentParagraph)) {
      const parentDd = currentParagraph.closest("dd") as HTMLElement | null;
      if (parentDd && content.contains(parentDd)) {
        const atParagraphStart =
          isRangeAtElementStart(range, currentParagraph) || isRangeAtElementStartLenient(range, currentParagraph);
        const firstMeaningfulInDd = (() => {
          let ch: Element | null = parentDd.firstElementChild;
          while (ch) {
            if (ch.tagName === "BR") {
              ch = ch.nextElementSibling;
              continue;
            }
            return ch;
          }
          return null;
        })();
        if (atParagraphStart && firstMeaningfulInDd === currentParagraph) {
          const immediatePrev = parentDd.previousElementSibling as HTMLElement | null;
          const prevIsHeading =
            !!immediatePrev &&
            (/^H[1-6]$/.test(immediatePrev.tagName) || immediatePrev.classList.contains("page-web-feature-grid-item-title"));
          if (prevIsHeading) return keepCaretAtStart(currentParagraph);
        }
      }
    }

    const featureGridTitle = node.closest(".page-web-feature-grid-item-title") as HTMLElement | null;
    if (featureGridTitle && content.contains(featureGridTitle)) {
      if (isAtElementTextStart(featureGridTitle)) return keepCaretAtStart(featureGridTitle);
    }

    const featureGridBody = node.closest(".page-web-feature-grid-item-body") as HTMLElement | null;
    if (featureGridBody && content.contains(featureGridBody)) {
      const featureGridLearnMore =
        (node.closest(".page-web-elements-announcement-learn-more") as HTMLElement | null) ||
        (node.closest(".page-web-feature-grid-link") as HTMLElement | null);
      if (featureGridLearnMore && featureGridBody.contains(featureGridLearnMore)) {
        if (isAtElementTextStart(featureGridLearnMore)) return keepCaretAtStart(featureGridLearnMore);
      }

      const bodyParagraph = node.closest("p") as HTMLElement | null;
      if (
        bodyParagraph &&
        bodyParagraph.parentElement === featureGridBody &&
        !bodyParagraph.classList.contains("page-web-feature-grid-item-link-wrap")
      ) {
        if (isAtElementTextStart(bodyParagraph)) return keepCaretAtStart(bodyParagraph);
      }
    }

    const timelineLockedTarget = (
      node.closest(
        ".page-web-timeline-heading, .page-web-timeline-subtitle, .page-web-timeline-description, .page-web-timeline-term, .page-web-timeline-text",
      ) as HTMLElement | null
    );
    if (timelineLockedTarget && content.contains(timelineLockedTarget)) {
      if (
        timelineLockedTarget.querySelector(
          "textarea.page-web-elements-subtitle-input, textarea.page-web-elements-description-input",
        )
      ) {
        return false;
      }
      if (isAtElementTextStart(timelineLockedTarget)) return keepCaretAtStart(timelineLockedTarget);
    }

    const workPricingRoot = node.closest(".page-web-work-pricing") as HTMLElement | null;
    if (workPricingRoot && content.contains(workPricingRoot)) {
      const workPricingTarget = node.closest(WORK_PRICING_EDITABLE_LEAF_SELECTOR) as HTMLElement | null;
      if (
        workPricingTarget &&
        workPricingRoot.contains(workPricingTarget) &&
        !(workPricingTarget instanceof HTMLTextAreaElement || workPricingTarget instanceof HTMLInputElement) &&
        isAtElementTextStart(workPricingTarget)
      ) {
        return keepCaretAtStart(workPricingTarget);
      }
    }

    const current = node.closest(
      "h1, h2, h3, h4, h5, h6, p, dt, dd",
    ) as HTMLElement | null;
    if (!current || !content.contains(current)) return false;
    if (current.closest("li")) return false;
    if (!isRangeAtElementStart(range, current) && !isRangeAtElementStartLenient(range, current)) return false;

    const immediatePrev = current.previousElementSibling as HTMLElement | null;
    if (immediatePrev && immediatePrev.tagName !== "BR") {
      const isHeadingShell =
        /^H[1-6]$/.test(immediatePrev.tagName) || immediatePrev.classList.contains("page-web-feature-grid-item-title");
      if (isHeadingShell) {
        return keepCaretAtStart(current);
      }
    }

    let prev: Element | null = current.previousElementSibling;
    while (prev) {
      const tag = prev.tagName;
      if (tag === "BR") {
        prev = prev.previousElementSibling;
        continue;
      }
      const prevText = (prev.textContent || "").replace(/[\u200b\s]+/g, "");
      if (prevText.length === 0 && !prev.querySelector("img, table, ul, ol")) {
        prev = prev.previousElementSibling;
        continue;
      }
      break;
    }
    if (!prev) return false;

    return keepCaretAtStart(current);
  }

  function getCellsToApplyBorder(): HTMLTableCellElement[] {
    const el = editorRef.current;
    if (!el) return [];
    const selected = Array.from(el.querySelectorAll(".page-editor-table td[data-cell-selected]")) as HTMLTableCellElement[];
    if (selected.length > 0) return selected;
    const cell = selectedCellRef.current ?? (() => {
      const range = savedRangeRef.current;
      if (!range || !el.contains(range.commonAncestorContainer)) return null;
      const node = range.startContainer.nodeType === Node.TEXT_NODE ? range.startContainer.parentElement : range.startContainer;
      return (node as Element)?.closest?.("table.page-editor-table td") as HTMLTableCellElement | null;
    })();
    return cell ? [cell] : [];
  }

  function applyBorderToCell(cell: HTMLTableCellElement, style: string, color: string, width: string) {
    if (style === "none") {
      cell.style.border = "none";
      cell.setAttribute("data-cell-border", "none");
      cell.removeAttribute("data-cell-border-color");
      cell.removeAttribute("data-cell-border-width");
    } else {
      const w = style === "double" ? (width === "1" ? "3" : width) : width;
      cell.style.border = `${w}px ${style} ${color}`;
      cell.setAttribute("data-cell-border", style);
      cell.setAttribute("data-cell-border-color", color);
      cell.setAttribute("data-cell-border-width", width);
    }
  }

  function setTableBorder(value: string) {
    const el = editorRef.current;
    if (!el) return;
    const cells = getCellsToApplyBorder();
    if (cells.length === 0) return;
    cells.forEach((cell) => applyBorderToCell(cell, value, tableBorderColor, tableBorderWidth));
    setContentHtml(el.innerHTML);
    setTableBorderStyle(value);
    setTableBorderOpen(false);
  }

  function applyTableBorderColor(value: string) {
    const el = editorRef.current;
    if (!el) return;
    const cells = getCellsToApplyBorder();
    if (cells.length === 0) return;
    cells.forEach((cell) => applyBorderToCell(cell, tableBorderStyle, value, tableBorderWidth));
    setContentHtml(el.innerHTML);
    setTableBorderColor(value);
  }

  function applyTableBorderWidth(value: string) {
    const el = editorRef.current;
    if (!el) return;
    const cells = getCellsToApplyBorder();
    if (cells.length === 0) return;
    cells.forEach((cell) => applyBorderToCell(cell, tableBorderStyle, tableBorderColor, value));
    setContentHtml(el.innerHTML);
    setTableBorderWidth(value);
  }

  function getCurrentTable(): HTMLTableElement | null {
    const el = editorRef.current;
    const range = savedRangeRef.current;
    if (el && range && el.contains(range.commonAncestorContainer)) {
      const node =
        range.startContainer.nodeType === Node.TEXT_NODE
          ? range.startContainer.parentElement
          : range.startContainer;
      const t = (node as Element)?.closest?.("table.page-editor-table");
      if (t) return t as HTMLTableElement;
    }
    return selectedCellRef.current?.closest?.("table.page-editor-table") as HTMLTableElement | null;
  }

  function applyTableWidth(value: string) {
    const el = editorRef.current;
    if (!el) return;
    let selected = Array.from(el.querySelectorAll(".page-editor-table td[data-cell-selected]")) as HTMLTableCellElement[];
    if (selected.length === 0) {
      const currentCell =
        selectedCellRef.current ??
        getSelectedTableCell() ??
        (el.querySelector(".page-editor-table td") as HTMLTableCellElement | null);
      if (currentCell) {
        selected = [currentCell];
      }
    }
    if (selected.length === 0) return;
    const table = selected[0].closest("table.page-editor-table") as HTMLTableElement | null;
    const tbody = table?.querySelector("tbody");
    const rows = tbody?.querySelectorAll("tr");
    const colsToUpdate = new Set<number>();
    selected.forEach((cell) => {
      const pos = getCellPosition(cell);
      if (pos) colsToUpdate.add(pos.col);
    });
    const applyToCell = (cell: HTMLTableCellElement) => {
      if (value === "auto") {
        cell.removeAttribute("data-cell-width");
        cell.style.width = "";
        cell.style.minWidth = "";
        cell.style.maxWidth = "";
      } else {
        const pxValue = /^\d+$/.test(value) ? `${value}px` : value;
        cell.setAttribute("data-cell-width", pxValue);
        cell.style.width = pxValue;
        cell.style.minWidth = pxValue;
        cell.style.maxWidth = pxValue;
      }
    };
    if (value === "auto") {
      table?.querySelectorAll("td").forEach((td) => applyToCell(td as HTMLTableCellElement));
    } else if (table) {
      selected.forEach(applyToCell);
      const rowCount = rows?.length ?? 0;
      for (let r = 0; r < rowCount; r++) {
        for (const col of colsToUpdate) {
          const cell = getCellAtPosition(table, r, col);
          if (cell && !selected.includes(cell)) applyToCell(cell);
        }
      }
    }
    table && syncTableColgroup(table);
    setContentHtml(el.innerHTML);
    setTableWidth(value === "auto" ? "auto" : (/^\d+$/.test(value) ? `${value}px` : value));
    setCellMenuOpen(false);
  }

  function applyTableRowHeight(value: string) {
    const el = editorRef.current;
    if (!el) return;
    const selected = Array.from(el.querySelectorAll(".page-editor-table td[data-cell-selected]")) as HTMLTableCellElement[];
    if (selected.length === 0) return;
    selected.forEach((cell) => {
      if (value === "auto") {
        cell.removeAttribute("data-cell-height");
        const s = (cell.getAttribute("style") || "").replace(/\bheight:\s*[^;]*;?/g, "").trim();
        if (s) cell.setAttribute("style", s); else cell.removeAttribute("style");
      } else {
        cell.setAttribute("data-cell-height", value);
        const s = (cell.getAttribute("style") || "").replace(/\bheight:\s*[^;]*;?/g, "").trim();
        cell.setAttribute("style", (s ? s + " " : "") + `height: ${value};`);
      }
    });
    setContentHtml(el.innerHTML);
    setTableRowHeight(value);
    setCellMenuOpen(false);
  }

  /** Обложка: выравнивание контента относительно всего баннера (не ячейки таблицы внутри обложки). */
  function getWebCoverForContentLayout(el: HTMLElement, range: Range | null): HTMLElement | null {
    if (!range || !el.contains(range.commonAncestorContainer)) return null;
    let node: Node | null = range.commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) node = (node as Text).parentElement;
    if (!node || !(node instanceof Element)) return null;
    const inner = node.closest(".page-web-cover-inner") as HTMLElement | null;
    if (!inner || !el.contains(inner)) return null;
    if (inner.closest("table.page-editor-table")) return null;
    return inner.closest(".page-web-cover") as HTMLElement | null;
  }

  function getRangeForCoverLayout(el: HTMLElement): Range | null {
    const liveSelection = window.getSelection();
    const liveRange = liveSelection && liveSelection.rangeCount > 0 ? liveSelection.getRangeAt(0) : null;
    const commandRange = commandRangeRef.current;
    const savedRange = savedRangeRef.current;
    if (commandRange && el.contains(commandRange.commonAncestorContainer)) return commandRange.cloneRange();
    if (liveRange && el.contains(liveRange.commonAncestorContainer)) return liveRange.cloneRange();
    if (savedRange && el.contains(savedRange.commonAncestorContainer)) return savedRange.cloneRange();
    return null;
  }

  function applyCoverVerticalAlign(value: "top" | "middle" | "bottom") {
    const el = editorRef.current;
    if (!el) return;
    const range = getRangeForCoverLayout(el);
    const cover = getWebCoverForContentLayout(el, range);
    if (!cover) return;
    cover.setAttribute("data-cover-valign", value);
    setContentHtml(el.innerHTML);
    setCoverVerticalAlign(value);
    setTimeout(() => updateToolbarState(), 0);
  }

  function applyTableVerticalAlign(value: "top" | "middle" | "bottom") {
    const el = editorRef.current;
    if (!el) return;
    let selected = Array.from(el.querySelectorAll(".page-editor-table td[data-cell-selected]")) as HTMLTableCellElement[];
    if (selected.length === 0) {
      const currentCell =
        selectedCellRef.current ??
        getSelectedTableCell() ??
        (el.querySelector(".page-editor-table td") as HTMLTableCellElement | null);
      if (currentCell) selected = [currentCell];
    }
    if (selected.length === 0) return;
    selected.forEach((cell) => {
      cell.setAttribute("data-cell-valign", value);
      const s = (cell.getAttribute("style") || "").replace(/\bvertical-align:\s*[^;]*;?/g, "").trim();
      cell.setAttribute("style", (s ? s + " " : "") + `vertical-align: ${value};`);
    });
    setContentHtml(el.innerHTML);
    setTableVerticalAlign(value);
    setCellMenuOpen(false);
  }

  function applyTableHorizontalAlign(value: WebElementsTextAlign) {
    const el = editorRef.current;
    if (!el) return;
    let selected = Array.from(el.querySelectorAll(".page-editor-table td[data-cell-selected]")) as HTMLTableCellElement[];
    if (selected.length > 0) {
      const firstTable = selected[0].closest("table.page-editor-table");
      const sameTable = !!firstTable && selected.every((cell) => cell.closest("table.page-editor-table") === firstTable);
      if (firstTable && sameTable) {
        const totalCells = firstTable.querySelectorAll("tbody td").length;
        if (totalCells > 0 && selected.length === totalCells) {
          (firstTable as HTMLElement).setAttribute("data-table-align", value);
          setContentHtml(el.innerHTML);
          setAlignment(value);
          return;
        }
      }
    }
    if (selected.length === 0) {
      const currentCell =
        selectedCellRef.current ??
        getSelectedTableCell() ??
        (el.querySelector(".page-editor-table td") as HTMLTableCellElement | null);
      if (currentCell) selected = [currentCell];
    }
    if (selected.length === 0) return;
    selected.forEach((cell) => {
      cell.setAttribute("data-cell-align", value);
      const s = (cell.getAttribute("style") || "").replace(/\btext-align:\s*[^;]*;?/g, "").trim();
      cell.setAttribute("style", (s ? s + " " : "") + `text-align: ${value};`);
    });
    setContentHtml(el.innerHTML);
    setAlignment(value);
  }

  function applySelectedImageHorizontalAlign(value: "left" | "center" | "right"): boolean {
    const el = editorRef.current;
    const wrapper = selectedImageWrapperRef.current;
    if (!el || !wrapper || !el.contains(wrapper)) return false;
    const inTableCell = wrapper.closest("td");
    if (inTableCell) return false;
    wrapper.setAttribute("data-image-align", value);
    wrapper.style.display = "block";
    wrapper.style.width = "fit-content";
    wrapper.style.maxWidth = "100%";
    if (value === "center") {
      wrapper.style.marginLeft = "auto";
      wrapper.style.marginRight = "auto";
    } else if (value === "right") {
      wrapper.style.marginLeft = "auto";
      wrapper.style.marginRight = "0";
    } else {
      wrapper.style.marginLeft = "0";
      wrapper.style.marginRight = "auto";
    }
    setContentHtml(el.innerHTML);
    setAlignment(value);
    return true;
  }

  function getActiveTextInputInsideEditor(el: HTMLElement): HTMLInputElement | HTMLTextAreaElement | HTMLElement | null {
    const active = document.activeElement as Element | null;
    if (!active || !el.contains(active)) return null;
    if (
      !active.matches(
        ".page-web-text-block-subtitle-input, .page-web-text-block-title-input, .page-web-text-block-lead-input, .page-web-elements-announcement-input, .page-web-elements-title-input, .page-web-elements-title2-input, .page-web-elements-subtitle-input, .page-web-elements-description-input, .page-web-accordion-question-input, .page-web-accordion-answer-input",
      )
    ) {
      return null;
    }
    if (
      active instanceof HTMLInputElement ||
      active instanceof HTMLTextAreaElement ||
      (active instanceof HTMLElement &&
        active.matches(".page-web-elements-announcement-input") &&
        active.getAttribute("contenteditable") === "true")
    ) {
      return active as HTMLInputElement | HTMLTextAreaElement | HTMLElement;
    }
    return null;
  }

  function getSelectedTableCell(): HTMLTableCellElement | null {
    const el = editorRef.current;
    const range = savedRangeRef.current;
    if (!el || !range || !el.contains(range.commonAncestorContainer)) return null;
    const node =
      range.startContainer.nodeType === Node.TEXT_NODE
        ? range.startContainer.parentElement
        : range.startContainer;
    return (node as Element)?.closest?.("table.page-editor-table td") as HTMLTableCellElement | null;
  }

  function tableCellAction(
    action: "insertRowAbove" | "insertRowBelow" | "insertColLeft" | "insertColRight" | "deleteRow" | "deleteCol"
  ) {
    const el = editorRef.current;
    if (!el) return;
    let cell = selectedCellRef.current ?? getSelectedTableCell();
    if (!cell || !el.contains(cell)) {
      cell = el.querySelector(".page-editor-table td[data-cell-selected]") as HTMLTableCellElement | null;
    }
    if (!cell) return;
    const table = cell.closest("table.page-editor-table") as HTMLTableElement | null;
    if (!table) return;
    const tbody = table.querySelector("tbody");
    if (!tbody) return;
    const rows = tbody.querySelectorAll("tr");
    const colCount = getTableColumnCount(table);
    const pos = getCellPosition(cell);
    const rowIndex = pos?.row ?? Array.from(rows).findIndex((tr) => tr.contains(cell));
    const gridCol = pos?.col ?? 0;
    if (rowIndex < 0) return;

    const rowCount = selectedCellRange.rows;
    const colCountSel = selectedCellRange.cols;

    if (action === "insertRowAbove") {
      for (let i = 0; i < rowCount; i++) {
        const newRow = document.createElement("tr");
        for (let j = 0; j < colCount; j++) {
          const td = document.createElement("td");
          td.setAttribute("contenteditable", "false");
          td.innerHTML = "<br>";
          newRow.appendChild(td);
        }
        tbody.insertBefore(newRow, rows[rowIndex]);
      }
    } else if (action === "insertRowBelow") {
      let insertBefore = rows[rowIndex + rowCount - 1]?.nextSibling ?? null;
      for (let i = 0; i < rowCount; i++) {
        const newRow = document.createElement("tr");
        for (let j = 0; j < colCount; j++) {
          const td = document.createElement("td");
          td.setAttribute("contenteditable", "false");
          td.innerHTML = "<br>";
          newRow.appendChild(td);
        }
        tbody.insertBefore(newRow, insertBefore);
        insertBefore = newRow.nextSibling;
      }
    } else if (action === "insertColLeft") {
      for (let k = 0; k < colCountSel; k++) {
        for (let r = 0; r < rows.length; r++) {
          const td = document.createElement("td");
          td.setAttribute("contenteditable", "false");
          td.innerHTML = "<br>";
          const insertBeforeCell = getCellAtPosition(table, r, gridCol);
          const tr = rows[r];
          if (insertBeforeCell) {
            tr.insertBefore(td, insertBeforeCell);
          } else {
            tr.appendChild(td);
          }
        }
      }
    } else if (action === "insertColRight") {
      for (let k = 0; k < colCountSel; k++) {
        for (let r = 0; r < rows.length; r++) {
          const td = document.createElement("td");
          td.setAttribute("contenteditable", "false");
          td.innerHTML = "<br>";
          const insertBeforeCell = getCellAtPosition(table, r, gridCol + colCountSel + k);
          const tr = rows[r];
          if (insertBeforeCell) {
            tr.insertBefore(td, insertBeforeCell);
          } else {
            tr.appendChild(td);
          }
        }
      }
    } else if (action === "deleteRow") {
      if (rows.length <= rowCount) return;
      for (let i = 0; i < rowCount; i++) {
        rows[rowIndex]?.remove();
      }
    } else if (action === "deleteCol") {
      if (colCount <= colCountSel) return;
      for (let k = 0; k < colCountSel; k++) {
        for (let r = 0; r < rows.length; r++) {
          const cellToRemove = getCellAtPosition(table, r, gridCol);
          cellToRemove?.remove();
        }
      }
    }
    el.querySelectorAll(".page-editor-table").forEach((t) => syncTableColgroup(t as HTMLTableElement));
    setContentHtml(el.innerHTML);
    normalizeTableCells();
    setCellMenuOpen(false);
    setTimeout(() => {
      highlightSelectedTableCells();
      updateToolbarState();
    }, 0);
  }

function getFirstCharacterStyle(container: HTMLElement): { fontSize: string; lineHeight: string; color: string } {
    const range = document.createRange();
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
    let textNode: Text | null = walker.nextNode() as Text | null;
    while (textNode) {
      if (textNode.textContent && textNode.textContent.trim().length > 0) {
        range.setStart(textNode, 0);
        range.setEnd(textNode, 1);
        const parent = range.startContainer.parentElement;
        if (parent) {
          const style = getComputedStyle(parent);
          return { fontSize: style.fontSize, lineHeight: style.lineHeight, color: style.color };
        }
      }
      textNode = walker.nextNode() as Text | null;
    }
    const style = getComputedStyle(container);
  return { fontSize: style.fontSize, lineHeight: style.lineHeight, color: style.color };
  }

  function syncMarkerBold() {
    const el = editorRef.current;
    if (!el) return;
    el.querySelectorAll("ol li, ul li").forEach((li) => {
      const liEl = li as HTMLElement;
      const hasBold = (li as Element).querySelector("b, strong") !== null;
      if (hasBold) liEl.setAttribute("data-marker-bold", "true");
      else liEl.removeAttribute("data-marker-bold");
      const { fontSize, lineHeight, color } = getFirstCharacterStyle(liEl);
      liEl.style.setProperty("--marker-font-size", fontSize);
      liEl.style.setProperty("--marker-line-height", lineHeight);
      liEl.style.setProperty("--marker-color", color);
    });
  }

  function saveSelectionFromEditor() {
    const el = editorRef.current;
    const sel = window.getSelection();
    if (!el || !sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    try {
      if (el.contains(range.commonAncestorContainer)) {
        const snapshot = range.cloneRange();
        savedRangeRef.current = snapshot;
        commandRangeRef.current = snapshot.cloneRange();
      }
    } catch {
      // ignore and keep previous valid snapshot
    }
  }

  const LIST_NUMBER_PATTERN = /^(\s*\d+\.\s+|\s*\d+\)\s*|\s*[aA]\.\s*|\s*[iI]+\.\s*)/;

  function stripLeadingNumberFromLi(li: Element): boolean {
    const walker = document.createTreeWalker(li, NodeFilter.SHOW_TEXT, null);
    let textNode: Text | null = walker.nextNode() as Text | null;
    while (textNode) {
      const text = textNode.textContent ?? "";
      const match = text.match(LIST_NUMBER_PATTERN);
      if (match) {
        const stripped = text.slice(match[0].length);
        if (stripped !== text) {
          textNode.textContent = stripped;
          return true;
        }
      }
      textNode = walker.nextNode() as Text | null;
    }
    return false;
  }

  function normalizeListContent() {
    const el = editorRef.current;
    if (!el) return;
    el.querySelectorAll("ol li, ul li").forEach((li) => stripLeadingNumberFromLi(li));
  }

  function normalizeImages() {
    const el = editorRef.current;
    if (!el) return;
    el.querySelectorAll(".page-editor-image-wrapper").forEach((wrapper) => {
      const handles = wrapper.querySelectorAll(".page-editor-image-resize");
      if (handles.length >= 8) return;
      handles.forEach((h) => h.remove());
      ["n", "s", "e", "w", "ne", "nw", "se", "sw"].forEach((h) => {
        const handle = document.createElement("span");
        handle.className = `page-editor-image-resize page-editor-image-resize-${h}`;
        handle.setAttribute("data-resize", h);
        handle.setAttribute("aria-label", "Изменить размер");
        wrapper.appendChild(handle);
      });
    });
    el.querySelectorAll("img:not(.page-editor-image)").forEach((img) => {
      const htmlImg = img as HTMLImageElement;
      if (htmlImg.closest(".page-editor-image-wrapper")) return;
      // Карусель: свои классы и object-fit; обёртка редактора ломает слайд (на секунду фото, потом «пустой» блок).
      if (htmlImg.classList.contains("page-web-carousel-img") || htmlImg.closest(".page-web-carousel-slide-inner")) {
        return;
      }
      const wrapper = document.createElement("span");
      wrapper.className = "page-editor-image-wrapper";
      wrapper.setAttribute("contenteditable", "false");
      const handles = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];
      htmlImg.classList.add("page-editor-image");
      if (!htmlImg.style.width) htmlImg.style.width = "300px";
      if (!htmlImg.style.height) htmlImg.style.height = "auto";
      htmlImg.style.display = "block";
      htmlImg.parentNode?.insertBefore(wrapper, htmlImg);
      wrapper.appendChild(htmlImg);
      handles.forEach((h) => {
        const handle = document.createElement("span");
        handle.className = `page-editor-image-resize page-editor-image-resize-${h}`;
        handle.setAttribute("data-resize", h);
        handle.setAttribute("aria-label", "Изменить размер");
        wrapper.appendChild(handle);
      });
    });
  }

  function normalizeTableCells() {
    const el = editorRef.current;
    if (!el) return;
    el.querySelectorAll(".page-editor-table td").forEach((td) => {
      const cell = td as HTMLElement;
      if (!cell.hasAttribute("data-cell-editing")) {
        cell.setAttribute("contenteditable", "false");
      }
    });
  }

  function formatOlMarker(n: number, styleType: string): string {
    if (styleType === "lower-alpha") return String.fromCharCode(96 + Math.min(26, Math.max(1, n))) + ".";
    if (styleType === "upper-alpha") return String.fromCharCode(64 + Math.min(26, Math.max(1, n))) + ".";
    if (styleType === "lower-roman") return toRoman(n).toLowerCase() + ".";
    if (styleType === "upper-roman") return toRoman(n) + ".";
    return n + ".";
  }

  function toRoman(n: number): string {
    const v = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
    const s = ["M", "CM", "D", "CD", "C", "XC", "L", "XL", "X", "IX", "V", "IV", "I"];
    let r = "";
    for (let i = 0; i < v.length; i++) {
      while (n >= v[i]) {
        r += s[i];
        n -= v[i];
      }
    }
    return r;
  }

  /** Same style + color → treat adjacent top-level <ol> as one numbered sequence (Word often emits many <ol>). */
  function olContinuationSignature(ol: HTMLElement): string {
    const st = ol.style?.listStyleType || "decimal";
    const c = ol.getAttribute("data-list-color") || "black";
    return `${st}|${c}`;
  }

  /**
   * Пересчитывает <ol start> сверху вниз: вставка нового списка между другими сдвигает номера у всех
   * последующих. Старые start из HTML не сохраняем (кроме якоря data-list-restart из диалога).
   *
   * - Соседние <ol> с тем же стилем/цветом — одна цепочка.
   * - Строки вида "5. текст" в div/p поднимают счётчик.
   * - data-list-restart: явное начало (диалог); глобальный хвост документа не уменьшаем — следующий
   *   авто-список после такого блока продолжает с max(было, конец блока)+1.
   */
  function normalizeTopLevelOlStartContinuation() {
    const el = editorRef.current;
    if (!el) return;
    let running = 0;
    let chainEnd = 0;
    let chainSig: string | null = null;

    const bumpRunningFromPlainBlock = (block: Element) => {
      const segments = getLineSegmentsFromBlock(block);
      for (const seg of segments) {
        const lineN = getLeadingNumberFromLineNodes(seg.nodes);
        if (typeof lineN === "number" && Number.isFinite(lineN)) {
          running = Math.max(running, lineN);
        }
      }
    };

    for (const child of Array.from(el.children)) {
      if (child.tagName === "OL") {
        const ol = child as HTMLElement;
        const lis = ol.querySelectorAll(":scope > li");
        const n = lis.length;
        if (n === 0) continue;

        const sig = olContinuationSignature(ol);
        const userRestart = ol.getAttribute("data-list-restart") === "1";

        if (chainEnd > 0 && chainSig === sig) {
          const nextStart = chainEnd + 1;
          ol.setAttribute("start", String(nextStart));
          chainEnd = nextStart + n - 1;
          running = chainEnd;
        } else {
          chainSig = sig;
          if (userRestart) {
            const base = Math.max(1, parseInt(ol.getAttribute("start") || "1", 10) || 1);
            ol.setAttribute("start", String(base));
            chainEnd = base + n - 1;
            running = Math.max(running, chainEnd);
          } else {
            const nextStart = running + 1;
            ol.setAttribute("start", String(nextStart));
            chainEnd = nextStart + n - 1;
            running = chainEnd;
          }
        }
      } else if (child.tagName === "DIV" || child.tagName === "P") {
        chainEnd = 0;
        chainSig = null;
        bumpRunningFromPlainBlock(child);
      } else {
        chainEnd = 0;
        chainSig = null;
      }
    }
  }

  function normalizeOlStartNumbers() {
    const el = editorRef.current;
    if (!el) return;
    normalizeTopLevelOlStartContinuation();
    const allOl = Array.from(el.querySelectorAll("ol"));
    for (const list of allOl) {
      const lis = (list as Element).querySelectorAll(":scope > li");
      const rawStart = parseInt((list as HTMLElement).getAttribute("start") || "1", 10);
      const start = Number.isFinite(rawStart) && rawStart > 0 ? rawStart : 1;
      const styleType = (list as HTMLElement).style?.listStyleType || "decimal";
      lis.forEach((li, i) => {
        (li as HTMLElement).setAttribute("data-list-num", formatOlMarker(start + i, styleType));
      });
    }
  }

  function getLineSegmentsFromBlock(block: Element): { start: number; end: number; nodes: Node[] }[] {
    const childNodes = Array.from(block.childNodes);
    const segments: { start: number; end: number; nodes: Node[] }[] = [];
    let segStart = 0;
    for (let i = 0; i <= childNodes.length; i++) {
      if (i === childNodes.length || childNodes[i].nodeName === "BR") {
        segments.push({ start: segStart, end: i, nodes: childNodes.slice(segStart, i) });
        segStart = i + 1;
      }
    }
    return segments;
  }

  function getLeadingNumberFromLineNodes(lineNodes: Node[]): number | null {
    const firstContentNode = lineNodes.find((n) => {
      if (n.nodeName === "BR") return false;
      if (n.nodeType === Node.TEXT_NODE) return (n.textContent || "").length > 0;
      return true;
    });
    if (!firstContentNode) return null;
    const readText = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) return (node.textContent || "");
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      const textNode = walker.nextNode() as Text | null;
      return textNode?.data || "";
    };
    const value = readText(firstContentNode);
    const match = value.match(/^\s*(\d+)\.\s+/);
    return match ? parseInt(match[1], 10) : null;
  }

  function getNextOrderedListStart(referenceNode: Node, referenceLineStartIdx?: number): number {
    const el = editorRef.current;
    if (!el) return 1;
    let referenceBlock: Node | null = referenceNode;
    while (
      referenceBlock &&
      referenceBlock !== el &&
      (referenceBlock as Element).parentElement !== el
    ) {
      referenceBlock = (referenceBlock as Element).parentElement;
    }
    const topBlocks = Array.from(el.children);
    let running = 0;
    let chainEnd = 0;
    let chainSig: string | null = null;

    for (const block of topBlocks) {
      if (block.tagName === "OL") {
        const ol = block as HTMLElement;
        const itemsCount = ol.querySelectorAll(":scope > li").length;
        if (itemsCount > 0) {
          const sig = olContinuationSignature(ol);
          const userRestart = ol.getAttribute("data-list-restart") === "1";

          if (chainEnd > 0 && chainSig === sig) {
            const nextStart = chainEnd + 1;
            chainEnd = nextStart + itemsCount - 1;
            running = chainEnd;
          } else {
            chainSig = sig;
            if (userRestart) {
              const base = Math.max(1, parseInt(ol.getAttribute("start") || "1", 10) || 1);
              chainEnd = base + itemsCount - 1;
              running = Math.max(running, chainEnd);
            } else {
              const nextStart = running + 1;
              chainEnd = nextStart + itemsCount - 1;
              running = chainEnd;
            }
          }
        }
      } else if (block.tagName === "DIV" || block.tagName === "P") {
        chainEnd = 0;
        chainSig = null;
        const segments = getLineSegmentsFromBlock(block);
        for (const seg of segments) {
          if (
            block === referenceBlock &&
            typeof referenceLineStartIdx === "number" &&
            seg.start >= referenceLineStartIdx
          ) {
            break;
          }
          const n = getLeadingNumberFromLineNodes(seg.nodes);
          if (typeof n === "number" && Number.isFinite(n)) {
            running = Math.max(running, n);
          }
        }
      } else {
        chainEnd = 0;
        chainSig = null;
      }

      if (block === referenceBlock) {
        break;
      }
    }

    return Math.max(1, running + 1);
  }

  function stripLeadingNumericPrefixInLine(lineNodes: Node[]) {
    const firstContentNode = lineNodes.find((n) => {
      if (n.nodeName === "BR") return false;
      if (n.nodeType === Node.TEXT_NODE) return (n.textContent || "").length > 0;
      return true;
    });
    if (!firstContentNode) return;
    const stripPrefix = (value: string) => value.replace(/^\s*\d+\.\s+/, "");
    if (firstContentNode.nodeType === Node.TEXT_NODE) {
      (firstContentNode as Text).data = stripPrefix((firstContentNode as Text).data);
      return;
    }
    const walker = document.createTreeWalker(firstContentNode, NodeFilter.SHOW_TEXT);
    const textNode = walker.nextNode() as Text | null;
    if (textNode) {
      textNode.data = stripPrefix(textNode.data);
    }
  }

  function splitMultiLineListItems() {
    const el = editorRef.current;
    if (!el) return;
    el.querySelectorAll("ol li, ul li").forEach((li) => {
      const brs = Array.from(li.querySelectorAll("br"));
      if (brs.length === 0) return;
      const list = li.closest("ol, ul");
      if (!list) return;
      const segments: Node[][] = [];
      let current: Node[] = [];
      for (const child of Array.from(li.childNodes)) {
        if (child.nodeName === "BR") {
          if (current.length > 0) segments.push(current);
          current = [];
        } else {
          current.push(child);
        }
      }
      if (current.length > 0) segments.push(current);
      if (segments.length <= 1) return;
      const firstLi = li as HTMLElement;
      while (firstLi.firstChild) firstLi.removeChild(firstLi.firstChild);
      segments[0].forEach((n) => firstLi.appendChild(n));
      if (firstLi.childNodes.length === 0) firstLi.appendChild(document.createElement("br"));
      let insertBefore: Node | null = firstLi.nextSibling;
      for (let i = 1; i < segments.length; i++) {
        const newLi = document.createElement("li");
        segments[i].forEach((n) => newLi.appendChild(n));
        if (newLi.childNodes.length === 0) newLi.appendChild(document.createElement("br"));
        list.insertBefore(newLi, insertBefore);
        insertBefore = newLi.nextSibling;
      }
    });
  }

  function getLineContainingSelection(block: Element, range: Range): { nodes: Node[]; startIdx: number; endIdx: number } {
    const startNode = range.startContainer;
    const childNodes = Array.from(block.childNodes);
    const segments: { start: number; end: number }[] = [];
    let segStart = 0;
    for (let i = 0; i <= childNodes.length; i++) {
      if (i === childNodes.length || childNodes[i].nodeName === "BR") {
        segments.push({ start: segStart, end: i });
        segStart = i + 1;
      }
    }

    // Cursor can be positioned directly on block (offset between child nodes),
    // for example right after <br>. In this case map offset to the exact segment.
    if (startNode === block) {
      const rawOffset = range.startOffset;
      let offset = Math.max(0, Math.min(childNodes.length, rawOffset));
      // In contenteditable, caret at the visual start of the next line may point to the <br> node.
      // Bias to the following segment so numbering applies to the clicked line, not the previous one.
      if (offset < childNodes.length && childNodes[offset]?.nodeName === "BR") {
        offset += 1;
      }
      for (const seg of segments) {
        if (offset >= seg.start && offset <= seg.end) {
          return { nodes: childNodes, startIdx: seg.start, endIdx: seg.end };
        }
      }
      const last = segments[segments.length - 1];
      if (last) return { nodes: childNodes, startIdx: last.start, endIdx: last.end };
    }

    for (const seg of segments) {
      for (let j = seg.start; j < seg.end; j++) {
        const n = childNodes[j];
        if (n === startNode || (n.nodeType === Node.ELEMENT_NODE && (n as Element).contains(startNode))) {
          return { nodes: childNodes, startIdx: seg.start, endIdx: seg.end };
        }
      }
    }
    return { nodes: childNodes, startIdx: 0, endIdx: childNodes.length };
  }

  function getBlockAtSelection(): Element | null {
    const el = editorRef.current;
    const range = savedRangeRef.current;
    if (!el || !range || !el.contains(range.commonAncestorContainer)) return null;
    let node: Node | null = range.startContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    while (node && node !== el) {
      if (node.parentElement === el) return node as Element;
      node = node.parentElement;
    }
    return null;
  }

  function getTopLevelBlockFromRange(range: Range): Element | null {
    const el = editorRef.current;
    if (!el || !el.contains(range.commonAncestorContainer)) return null;

    let node: Node | null = range.startContainer;
    if (node === el) {
      const child = el.childNodes[range.startOffset] ?? el.childNodes[Math.max(0, range.startOffset - 1)] ?? null;
      node = child;
    }
    if (!node) return null;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;

    while (node && node !== el) {
      if ((node as Element).parentElement === el) return node as Element;
      node = (node as Element).parentElement;
    }
    return null;
  }

  function normalizeRawNewlinesToBr(block: Element) {
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    let current = walker.nextNode() as Text | null;
    while (current) {
      if ((current.data || "").includes("\n")) textNodes.push(current);
      current = walker.nextNode() as Text | null;
    }
    textNodes.forEach((textNode) => {
      const value = textNode.data;
      if (!value.includes("\n")) return;
      const parts = value.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
      const frag = document.createDocumentFragment();
      parts.forEach((part, idx) => {
        if (part.length > 0) frag.appendChild(document.createTextNode(part));
        if (idx < parts.length - 1) frag.appendChild(document.createElement("br"));
      });
      textNode.parentNode?.replaceChild(frag, textNode);
    });
  }

  function runCommand(command: string, value?: string) {
    const el = editorRef.current;
    if (!el) return;
    const alignFromToolbar = toolbarAlignFromCommand(command);
    if (alignFromToolbar) {
      const align = alignFromToolbar;
      const activeActions =
        getActiveWebElementsActionsInsideEditor(el) ??
        (selectedWebElementsActionsRef.current && el.contains(selectedWebElementsActionsRef.current)
          ? selectedWebElementsActionsRef.current
          : null);
      if (activeActions) {
        const outer = getWebElementsActionsOuterFromFocus(activeActions);
        if (outer) {
          applyWebElementsActionsAlign(outer, align);
          setAlignment(align);
          scheduleEditorHtmlStateSync(el.innerHTML);
        }
        return;
      }
      const activeInput = getActiveTextInputInsideEditor(el);
      if (activeInput) {
        if (
          activeInput.matches(".page-web-elements-announcement-input") &&
          activeInput.getAttribute("contenteditable") === "true"
        ) {
          const row = activeInput.closest(".page-web-elements-announcement-row") as HTMLElement | null;
          if (row) {
            row.style.textAlign = align;
            activeInput.style.removeProperty("text-align");
          } else {
            activeInput.style.textAlign = align;
          }
        } else if (
          activeInput instanceof HTMLTextAreaElement &&
          (activeInput.matches(".page-web-elements-subtitle-input") ||
            activeInput.matches(".page-web-elements-title-input") ||
            activeInput.matches(".page-web-elements-title2-input") ||
            activeInput.matches(".page-web-elements-description-input"))
        ) {
          const coverBanner = activeInput.closest(".page-web-cover") as HTMLElement | null;
          const inCoverBanner =
            !!coverBanner &&
            el.contains(coverBanner) &&
            !!activeInput.closest(".page-web-cover-inner");
          if (inCoverBanner && coverBanner) {
            const row = activeInput.closest(".page-web-elements-field-row") as HTMLElement | null;
            if (activeInput.matches(".page-web-elements-title-input")) {
              const titleIsland = activeInput.closest(".page-web-elements.page-web-elements-title") as HTMLElement | null;
              titleIsland?.setAttribute("data-cover-title-halign", align);
              if (row) {
                row.style.removeProperty("text-align");
                webElementsFieldRowClearFlexJustify(row);
              }
              activeInput.style.textAlign = align;
              if (align === "justify" && activeInput instanceof HTMLTextAreaElement) {
                activeInput.style.width = "100%";
                activeInput.style.maxWidth = "100%";
              }
            } else {
              applyWebElementsFieldTextAlign(row, activeInput, align);
            }
          } else {
            const row = activeInput.closest(".page-web-elements-field-row") as HTMLElement | null;
            const wpAlignWrap = activeInput.closest(WORK_PRICING_WEB_ELEMENTS_ALIGN_WRAP_SELECTOR) as HTMLElement | null;
            if (wpAlignWrap?.closest(".page-web-work-pricing")) {
              wpAlignWrap.setAttribute(WORK_PRICING_WEB_ELEMENTS_HALIGN_ATTR, align);
              applyWebElementsFieldTextAlign(row, activeInput, align);
            } else {
              applyWebElementsFieldTextAlign(row, activeInput, align);
            }
            const leadRow = activeInput.closest(".page-web-feature-grid-lead-row") as HTMLElement | null;
            if (
              leadRow?.querySelector(":scope > .page-web-feature-grid-message") &&
              activeInput.closest(".page-web-feature-grid-message") &&
              align !== "justify"
            ) {
              leadRow.setAttribute("data-web-elements-halign", align);
            }
          }
          scheduleEditorHtmlStateSync(el.innerHTML);
        } else {
          activeInput.style.textAlign = align;
        }
        setAlignment(align);
        return;
      }
    }

    el.focus();

    const liveSelection = window.getSelection();
    const liveRange =
      liveSelection && liveSelection.rangeCount > 0 ? liveSelection.getRangeAt(0) : null;
    const commandRange = commandRangeRef.current;
    const savedRange = savedRangeRef.current;
    const effectiveRange =
      commandRange && el.contains(commandRange.commonAncestorContainer)
        ? commandRange.cloneRange()
        : liveRange && el.contains(liveRange.commonAncestorContainer)
          ? liveRange.cloneRange()
          : savedRange && el.contains(savedRange.commonAncestorContainer)
            ? savedRange.cloneRange()
            : null;

    if (effectiveRange) {
      try {
        const sel = window.getSelection();
        if (sel) {
          sel.removeAllRanges();
          sel.addRange(effectiveRange);
        }
      } catch {
        // ignore
      }
      savedRangeRef.current = effectiveRange.cloneRange();
    }
    const range = effectiveRange;

    if (alignFromToolbar) {
      const align = alignFromToolbar;
      if (align !== "justify" && applySelectedImageHorizontalAlign(align)) {
        updateToolbarState();
        return;
      }
      const inTableSelection = !!(
        selectedCellRef.current ||
        getSelectedTableCell() ||
        el.querySelector(".page-editor-table td[data-cell-selected]")
      );
      if (inTableSelection) {
        applyTableHorizontalAlign(align);
        updateToolbarState();
        return;
      }
      const cover = getWebCoverForContentLayout(el, range ?? null);
      if (cover) {
        const inner = cover.querySelector(".page-web-cover-inner") as HTMLElement | null;
        let probeNode: Node | null = range?.commonAncestorContainer ?? null;
        if (probeNode?.nodeType === Node.TEXT_NODE) probeNode = (probeNode as Text).parentElement;
        const probeEl = probeNode instanceof Element ? probeNode : null;
        const actionsOuterFromRange =
          probeEl && inner?.contains(probeEl)
            ? (probeEl.closest(".page-web-elements-actions") as HTMLElement | null)
            : null;
        if (
          actionsOuterFromRange &&
          inner?.contains(actionsOuterFromRange) &&
          actionsOuterFromRange.closest(".page-web-cover") === cover
        ) {
          applyWebElementsActionsAlign(actionsOuterFromRange, align);
          setAlignment(align);
          scheduleEditorHtmlStateSync(el.innerHTML);
          updateToolbarState();
          return;
        }
        cover.setAttribute("data-cover-halign", align);
        setContentHtml(el.innerHTML);
        updateToolbarState();
        return;
      }
    }

    if (command === "insertUnorderedList" || command === "insertOrderedList") {
      const listRange =
        commandRange && el.contains(commandRange.commonAncestorContainer)
          ? commandRange.cloneRange()
          : liveRange && el.contains(liveRange.commonAncestorContainer)
            ? liveRange.cloneRange()
            : savedRange && el.contains(savedRange.commonAncestorContainer)
              ? savedRange.cloneRange()
            : null;
      if (!listRange) return;
      commandRangeRef.current = null;
      const block = getTopLevelBlockFromRange(listRange);
      const tag = command === "insertOrderedList" ? "OL" : "UL";
      const li = block?.closest?.("li");
      const list = li?.closest?.("ol, ul");
      if (list && list.tagName === tag) {
        const fragment = document.createDocumentFragment();
        Array.from(list.children).forEach((item) => {
          const div = document.createElement("div");
          while (item.firstChild) div.appendChild(item.firstChild);
          if (div.childNodes.length === 0) div.appendChild(document.createElement("br"));
          fragment.appendChild(div);
        });
        list.parentNode?.replaceChild(fragment, list);
      } else if (block && block.tagName !== "LI" && (block.tagName === "DIV" || block.tagName === "P")) {
        normalizeRawNewlinesToBr(block);
        const newLi = document.createElement("li");
        const hasMultipleLines = block.querySelector("br") !== null;
        let selectedLineNodes: Node[] | null = null;
        let selectedLineStartIdx: number | null = null;
        let beforeLineNodes: Node[] | null = null;
        let afterLineNodes: Node[] | null = null;
        if (hasMultipleLines) {
          const { nodes, startIdx, endIdx } = getLineContainingSelection(block, listRange);
          selectedLineStartIdx = startIdx;
          beforeLineNodes = nodes.slice(0, startIdx);
          selectedLineNodes = nodes.slice(startIdx, endIdx);
          afterLineNodes = nodes.slice(endIdx);
          if (tag === "OL" && selectedLineNodes) {
            stripLeadingNumericPrefixInLine(selectedLineNodes);
          }
          selectedLineNodes.forEach((n) => newLi.appendChild(n));
        } else {
          if (tag === "OL") {
            const lineNodes = Array.from(block.childNodes);
            stripLeadingNumericPrefixInLine(lineNodes);
          }
          while (block.firstChild) newLi.appendChild(block.firstChild);
        }
        if (newLi.childNodes.length === 0) {
          newLi.appendChild(document.createElement("br"));
        }

        const newList = document.createElement(tag.toLowerCase());
        newList.setAttribute("data-list-color", "black");
        if (tag === "OL") {
          const nextStart = getNextOrderedListStart(block, selectedLineStartIdx ?? undefined);
          newList.setAttribute("start", String(nextStart));
        }
        newList.appendChild(newLi);

        let prevList: Element | null = null;
        let nextList: Element | null = null;
        const lists = el.querySelectorAll(tag);
        for (let i = 0; i < lists.length; i++) {
          const listEl = lists[i];
          const pos = block.compareDocumentPosition(listEl);
          if (pos & Node.DOCUMENT_POSITION_PRECEDING) prevList = listEl;
          else if (pos & Node.DOCUMENT_POSITION_FOLLOWING && !nextList) nextList = listEl;
        }
        const targetList = prevList ?? nextList;
        if (targetList) {
          if (prevList) {
            prevList.appendChild(newLi);
            if (nextList) {
              while (nextList.firstChild) prevList.appendChild(nextList.firstChild);
              nextList.remove();
            }
          } else {
            (nextList as Element).insertBefore(newLi, (nextList as Element).firstChild);
          }
          if (!hasMultipleLines || block.childNodes.length === 0) {
            block.remove();
          } else if (hasMultipleLines && block.firstChild?.nodeName === "BR") {
            block.firstChild.remove();
          }
          const sel = window.getSelection();
          if (sel) {
            const r = document.createRange();
            r.selectNodeContents(newLi);
            r.collapse(false);
            sel.removeAllRanges();
            sel.addRange(r);
          }
        } else {
          if (block.childNodes.length === 0) {
            block.parentNode?.replaceChild(newList, block);
          } else {
            if (hasMultipleLines && block.firstChild?.nodeName === "BR") block.firstChild.remove();
            block.parentNode?.insertBefore(newList, block);
          }
        }
      } else {
    document.execCommand(command, false, value);
      }
    } else {
      document.execCommand(command, false, value);
    }

    if (command === "insertUnorderedList" || command === "insertOrderedList") {
      const removeTrailingEmpty = () => {
        const lists = el.querySelectorAll("ol, ul");
        lists.forEach((list) => {
          const next = list.nextSibling;
          if (
            next &&
            next.nodeType === Node.ELEMENT_NODE &&
            (next as Element).tagName === "DIV" &&
            (next as HTMLElement).childNodes.length === 1 &&
            (next as HTMLElement).firstChild?.nodeName === "BR"
          ) {
            next.remove();
          }
        });
        while (el.children.length > 1) {
          const last = el.children[el.children.length - 1];
          const prev = el.children[el.children.length - 2];
          if (
            last.tagName === "DIV" &&
            (last.childNodes.length === 0 || (last.childNodes.length === 1 && last.firstChild?.nodeName === "BR")) &&
            (prev?.tagName === "OL" || prev?.tagName === "UL")
          ) {
            last.remove();
          } else {
            break;
          }
        }
      };
      removeTrailingEmpty();
      el.querySelectorAll("ol, ul").forEach((list) => {
        if (!(list as HTMLElement).hasAttribute("data-list-color")) {
          (list as HTMLElement).setAttribute("data-list-color", "black");
        }
      });
      splitMultiLineListItems();
      normalizeListContent();
      normalizeOlStartNumbers();
    }
    setContentHtml(el.innerHTML);
    syncMarkerBold();
    setTimeout(() => {
      const markerNodes = Array.from(el.querySelectorAll("[data-exit-cursor]"));
      const target = markerNodes.length > 0 ? markerNodes[markerNodes.length - 1] : null;
      if (target) {
        markerNodes.forEach((node) => node.removeAttribute("data-exit-cursor"));
        const sel = window.getSelection();
        if (sel) {
          const r = document.createRange();
          r.selectNodeContents(target);
          r.collapse(false);
          sel.removeAllRanges();
          sel.addRange(r);
        }
        target.scrollIntoView({ block: "nearest" });
        el.focus();
      }
      updateToolbarState();
    }, 0);
  }

  function isListItemEmpty(li: Element): boolean {
    const text = (li as HTMLElement).innerText?.trim() ?? "";
    return text.length === 0;
  }

  function exitListAtEmptyLi(li: Element): void {
    const el = editorRef.current;
    if (!el) return;
    const list = li.closest("ol, ul");
    if (!list) return;
    const newDiv = document.createElement("div");
    newDiv.appendChild(document.createElement("br"));
    newDiv.setAttribute("data-exit-cursor", "1");
    if (list.children.length === 1) {
      list.parentNode?.replaceChild(newDiv, list);
    } else {
      const idx = Array.from(list.children).indexOf(li);
      const itemsAfter = Array.from(list.children).slice(idx + 1);
      li.remove();
      if (idx === 0) {
        list.parentNode?.insertBefore(newDiv, list);
      } else if (itemsAfter.length > 0) {
        const newList = document.createElement(list.tagName.toLowerCase());
        const parentList = list as HTMLElement;
        const rawStart = parseInt(parentList.getAttribute("start") || "1", 10);
        const S = Number.isFinite(rawStart) && rawStart > 0 ? rawStart : 1;
        parentList.getAttributeNames().forEach((name) => {
          if (name.toLowerCase() === "start") return;
          newList.setAttribute(name, parentList.getAttribute(name) ?? "");
        });
        // Tail list must continue numbering: item that was at (idx+1) had value S+idx+1.
        if (newList.tagName === "OL") {
          newList.setAttribute("start", String(S + idx + 1));
        }
        itemsAfter.forEach((item) => newList.appendChild(item));
        list.parentNode?.insertBefore(newDiv, list.nextSibling);
        list.parentNode?.insertBefore(newList, newDiv.nextSibling);
      } else {
        list.parentNode?.insertBefore(newDiv, list.nextSibling);
      }
    }
    setContentHtml(el.innerHTML);
    syncMarkerBold();
    setTimeout(() => {
      const target = el.querySelector("[data-exit-cursor]");
      if (target) {
        target.removeAttribute("data-exit-cursor");
        const sel = window.getSelection();
        if (sel) {
          const range = document.createRange();
          range.setStart(target, 0);
          range.setEnd(target, 0);
          sel.removeAllRanges();
          sel.addRange(range);
        }
        el.focus();
      }
      updateToolbarState();
    }, 0);
  }

  function showCellMenuForCell(cell: HTMLTableCellElement) {
    const rect = cell.getBoundingClientRect();
    const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 600;
    const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 800;
    const spaceBelow = typeof window !== "undefined" ? window.innerHeight - rect.bottom : 300;
    setCellMenuViewport({
      top: rect.top + rect.height / 2 - 14,
      left: Math.max(8, Math.min(rect.left - 32, viewportWidth - 40)),
      topBtn: {
        top: Math.max(8, Math.min(rect.top - 28, viewportHeight - 40)),
        left: rect.left + rect.width / 2 - 14,
      },
      openUp: spaceBelow < 280,
      selectionBadge: { top: rect.top, right: rect.right },
    });
  }

  function handleTableCellMouseDown(e: React.MouseEvent) {
    const target = (e.target as HTMLElement).closest?.("table.page-editor-table td");
    if (!target) return;
    const cell = target as HTMLTableCellElement;
    if (cell.getAttribute("contenteditable") === "true") return;
    const table = cell.closest("table.page-editor-table") as HTMLTableElement | null;
    if (!table) return;
    setCellMenuOpen(false);
    cellDragStartRef.current = { cell, table };
    const range = document.createRange();
    range.setStart(cell, 0);
    range.collapse(true);
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
      savedRangeRef.current = range.cloneRange();
    }
    highlightSelectedTableCells();
    updateToolbarState();
    showCellMenuForCell(cell);
    setTimeout(() => {
      highlightSelectedTableCells();
      const el = editorRef.current;
      const selected = el?.querySelector(".page-editor-table td[data-cell-selected]") as HTMLTableCellElement | null;
      if (selected) showCellMenuForCell(selected);
    }, 0);
  }

  function handleTableCellDoubleClick(e: React.MouseEvent) {
    const target = (e.target as HTMLElement).closest?.("table.page-editor-table td");
    if (!target) return;
    const cell = target as HTMLElement;
    cell.setAttribute("contenteditable", "true");
    cell.setAttribute("data-cell-editing", "true");
    cell.focus();
    const range = document.createRange();
    range.selectNodeContents(cell);
    range.collapse(true);
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
    setContentHtml(editorRef.current?.innerHTML ?? "");
    setTimeout(() => {
      highlightSelectedTableCells();
      updateToolbarState();
    }, 0);
  }

  function handleCoverButtonDoubleClick(e: React.MouseEvent): boolean {
    const target = (e.target as HTMLElement).closest?.(
      ".page-web-cover-el-button, .page-web-cover-el-announcement-learn-more, .page-web-cover-el-learn-more, .page-web-elements-announcement-learn-more, .page-web-elements-cta-button, a.page-web-elements-cta-button, .page-web-elements-cta-button-secondary, a.page-web-elements-cta-button-secondary, .page-web-feature-grid-link, .page-web-work-pricing a.wrg.wri.wro.wsf.wsl.wsq.wst.wsw.wtc.wtg.wtr.wts.wua.wub.wuc.wue",
    ) as HTMLElement | null;
    const ed = editorRef.current;
    if (!target || !ed || !ed.contains(target)) return false;
    e.preventDefault();
    e.stopPropagation();
    openCtaButtonLinkModal(target);
    return true;
  }

  function handleFeatureGridIconDoubleClick(e: React.MouseEvent): boolean {
    const target = (e.target as HTMLElement).closest?.(".page-web-feature-grid-icon-wrap") as HTMLElement | null;
    const ed = editorRef.current;
    if (!target || !ed || !ed.contains(target)) return false;
    if (!target.closest(".page-web-feature-grid-item-title")) return false;
    e.preventDefault();
    e.stopPropagation();
    ed.querySelectorAll('.page-web-feature-grid-icon-wrap[data-feature-grid-icon-target="1"]').forEach((n) => {
      (n as HTMLElement).removeAttribute("data-feature-grid-icon-target");
    });
    target.setAttribute("data-feature-grid-icon-target", "1");
    featureGridIconPickerTargetRef.current = target;
    setFeatureGridIconPickerValue(detectFeatureGridIconPresetId(target));
    setFeatureGridIconPickerOpen(true);
    return true;
  }

  function handleFeatureGridImageDoubleClick(_e: React.MouseEvent): boolean {
    // Загрузка изображений feature-grid только через кнопку в меню блока.
    return false;
  }

  function closeFeatureGridIconPicker() {
    const ed = editorRef.current;
    if (ed) {
      ed.querySelectorAll('.page-web-feature-grid-icon-wrap[data-feature-grid-icon-target="1"]').forEach((n) => {
        (n as HTMLElement).removeAttribute("data-feature-grid-icon-target");
      });
    }
    featureGridIconPickerTargetRef.current = null;
    setFeatureGridIconPickerOpen(false);
  }

  function applyCoverButtonLinkAndClose() {
    const ed = editorRef.current;
    let target = coverButtonLinkTargetRef.current;
    if (ed) {
      if (!target || !ed.contains(target)) {
        target =
          (ed.querySelector(`[${CTA_LINK_EDIT_ATTR}="1"]`) as HTMLElement | null) ??
          null;
      }
      if (target && !ed.contains(target)) target = null;
    }
    if (!ed || !target) {
      if (ed) clearCtaLinkEditMarkers(ed);
      setCoverButtonLinkModalOpen(false);
      return;
    }
    const href = coverButtonLinkModalValue.trim();
    if (target.tagName === "A") {
      if (href) target.setAttribute("href", href);
      else target.setAttribute("href", "#");
    } else {
      if (href) target.setAttribute("data-href", href);
      else target.removeAttribute("data-href");
    }
    applyCoverButtonLinkLabelToDom(target, coverButtonLinkModalLabelValue);
    target.removeAttribute(CTA_LINK_EDIT_ATTR);
    coverButtonLinkTargetRef.current = null;
    commitEditorDomToContentHtml();
    setCoverButtonLinkModalOpen(false);
  }

  useEffect(() => {
    if (coverButtonLinkModalOpen) return;
    const ed = editorRef.current;
    if (!ed) return;
    clearCtaLinkEditMarkers(ed);
    coverButtonLinkTargetRef.current = null;
  }, [coverButtonLinkModalOpen]);

  useLayoutEffect(() => {
    if (!coverButtonLinkModalOpen) return;
    const id = window.requestAnimationFrame(() => {
      const el = coverButtonLinkModalLabelInputRef.current;
      if (!el) return;
      el.focus();
      el.select();
    });
    return () => window.cancelAnimationFrame(id);
  }, [coverButtonLinkModalOpen]);

  useEffect(() => {
    if (!coverButtonLinkModalOpen) return;
    let cancelled = false;
    setCtaLinkModalDocumentsLoading(true);
    void apiGet<{ settings?: { documents?: unknown } }>("/api/pages/site-settings")
      .then((data) => {
        if (cancelled) return;
        setCtaLinkModalDocuments(normalizeSiteDocumentsList(data?.settings?.documents));
      })
      .catch(() => {
        if (!cancelled) setCtaLinkModalDocuments([]);
      })
      .finally(() => {
        if (!cancelled) setCtaLinkModalDocumentsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [coverButtonLinkModalOpen]);

  function applyFeatureGridIconAndClose(nextId?: FeatureGridIconPreset["id"]) {
    const ed = editorRef.current;
    const marked = ed?.querySelector(
      '.page-web-feature-grid-icon-wrap[data-feature-grid-icon-target="1"]',
    ) as HTMLElement | null;
    const refTarget = featureGridIconPickerTargetRef.current;
    const target =
      marked && ed?.contains(marked)
        ? marked
        : refTarget && ed?.contains(refTarget)
          ? refTarget
          : null;
    if (!ed || !target) {
      closeFeatureGridIconPicker();
      return;
    }
    const iconId = (nextId ?? featureGridIconPickerValue) as FeatureGridIconPreset["id"];
    target.outerHTML = getFeatureGridIconWrapHtml(iconId);
    commitEditorDomToContentHtml();
    closeFeatureGridIconPicker();
  }

  function handleEditorFocusOut(e: React.FocusEvent) {
    const relatedTarget = e.relatedTarget as Node | null;
    const el = editorRef.current;
    if (!el) return;
    const active = (typeof document !== "undefined" ? document.activeElement : null) as Node | null;
    const stillInsideEditor = !!(active && el.contains(active));
    const editorSelectionInside = (): boolean => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return false;
      return el.contains(sel.getRangeAt(0).commonAncestorContainer);
    };
    const selectionInside = (container: HTMLElement): boolean => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return false;
      const range = sel.getRangeAt(0);
      return container.contains(range.commonAncestorContainer);
    };
    el.querySelectorAll(".page-editor-table td[data-cell-editing]").forEach((td) => {
      const cell = td as HTMLElement;
      if (selectionInside(cell)) return;
      if (!relatedTarget && stillInsideEditor && active && cell.contains(active)) return;
      if (!relatedTarget || !cell.contains(relatedTarget)) {
        cell.removeAttribute("data-cell-editing");
        cell.setAttribute("contenteditable", "false");
      }
    });
    el.querySelectorAll('.page-web-cover-inner[data-cover-unlocked="1"]').forEach((n) => {
      const inner = n as HTMLElement;
      if (selectionInside(inner)) return;
      if (!relatedTarget && stillInsideEditor && active && inner.contains(active)) return;
      if (relatedTarget && inner.contains(relatedTarget)) return;
      inner.removeAttribute("data-cover-unlocked");
      inner.setAttribute("contenteditable", "false");
    });
    el.querySelectorAll(".page-web-text-block-content").forEach((n) => {
      const content = n as HTMLElement;
      if (selectionInside(content)) return;
      if (!relatedTarget && stillInsideEditor && active && content.contains(active)) return;
      if (relatedTarget && content.contains(relatedTarget)) return;
    });
    el.querySelectorAll(`[${PAGE_EDITOR_FOCUS_TARGET_ATTR}]`).forEach((n) =>
      n.removeAttribute(PAGE_EDITOR_FOCUS_TARGET_ATTR),
    );
    if (!stillInsideEditor && !editorSelectionInside()) {
      syncWebTextBlockV2FieldValuesForSerialization(el, { flushAnnouncementText: true });
      setContentHtml(el.innerHTML);
    }
  }

  /** Нативные поля + анонс (contenteditable): не перехватывать beforeinput/paste/keydown логикой полотна. */
  function isEditorNativeFormTextControl(ed: HTMLElement | null, eventTarget: EventTarget | null): boolean {
    if (!ed) return false;
    const node = eventTarget instanceof Node ? eventTarget : null;
    if (!node) return false;
    if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) return ed.contains(node);
  const elNode = node.nodeType === Node.TEXT_NODE ? (node as Text).parentElement : (node as Element);
    const ann = elNode?.closest?.(".page-web-elements-announcement-input") ?? null;
    return (
      ann instanceof HTMLElement &&
      ann.getAttribute("contenteditable") === "true" &&
      ed.contains(ann)
    );
  }

  function handleEditorBeforeInput(e: React.FormEvent<HTMLDivElement>) {
    const native = e.nativeEvent as InputEvent;
    const inputType =
      typeof native.inputType === "string" && native.inputType.trim() !== ""
        ? native.inputType
        : typeof native.data === "string"
          ? "insertText"
          : "";
    const ed = editorRef.current;
    if (!ed) return;
    if (
      isEditorNativeFormTextControl(ed, native.target) ||
      isEditorNativeFormTextControl(ed, typeof document !== "undefined" ? document.activeElement : null)
    ) {
      return;
    }
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (!ed.contains(range.commonAncestorContainer)) return;
    if (inputType.startsWith("insert") && !isRangeInsideStructuredTextBlock(ed, range)) {
      e.preventDefault();
      return;
    }
    if (tryPreventWebCoverNonDeleteInput(ed, range, inputType)) {
      e.preventDefault();
      return;
    }
    if (
      (inputType === "deleteContentBackward" || inputType === "deleteContentForward") &&
      !range.collapsed &&
      !isRangeWithinSingleEditScope(ed, range)
    ) {
      e.preventDefault();
      return;
    }
    if (inputType === "deleteContentBackward" && range.collapsed) {
      if (tryKeepEmptyTextBlockHeading(ed, range)) {
        e.preventDefault();
        return;
      }
      if (tryPreventTextBlockSiblingBackspaceMerge(ed, range)) {
        e.preventDefault();
        return;
      }
      if (tryPreventCoverElementBackspaceMerge(ed, range)) {
        e.preventDefault();
        return;
      }
      if (tryKeepCaretInsideEmptyTextBlockContent(ed, range)) {
        e.preventDefault();
        return;
      }
      if (tryHandleWebCoverBackspace(ed, range)) e.preventDefault();
      return;
    }
    if (inputType === "deleteContentForward" && range.collapsed) {
      if (tryHandleWebCoverForwardBlock(ed, range)) e.preventDefault();
    }
  }

  function handleCoverSurfaceMouseDown(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    if (target.closest?.(".page-web-cover-inner") || target.closest?.(".page-web-cover-toolbar")) return;
    const cover = target.closest?.(".page-web-cover") as HTMLElement | null;
    const ed = editorRef.current;
    if (!cover || !ed?.contains(cover)) return;
    e.preventDefault();
    e.stopPropagation();
  }

  function handleCoverInnerMouseDown(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    if (target.closest?.(".page-web-cover-toolbar")) return;
    const inner = target.closest?.(".page-web-cover-inner") as HTMLElement | null;
    const ed = editorRef.current;
    if (!inner || !ed?.contains(inner)) return;
    const coverCtaBtn = target.closest(CTA_LINK_MODAL_BUTTON_SELECTOR) as HTMLElement | null;
    if (coverCtaBtn && inner.contains(coverCtaBtn)) {
      e.preventDefault();
      e.stopPropagation();
      inner.setAttribute("data-cover-unlocked", "1");
      inner.setAttribute("contenteditable", "true");
      openCtaButtonLinkModal(coverCtaBtn);
      return;
    }
    if (inner.getAttribute("data-cover-unlocked") === "1") return;
    const clickX = e.clientX;
    const clickY = e.clientY;
    const clickedEditableElement = target.closest(
      ".page-web-elements.page-web-elements-title, .page-web-elements.page-web-elements-description, .page-web-elements.page-web-elements-announcement, .page-web-cover-el-subtitle, .page-web-cover-el-button-wrap, .page-web-cover-el-announcement-wrap, .page-web-cover-el-learn-more, .page-web-cover-el-announcement-learn-more, .page-web-elements-announcement-learn-more, .page-web-elements-actions, .page-web-elements-actions-cluster, .page-web-elements-cta-button, a.page-web-elements-cta-button, .page-web-elements-cta-button-secondary, a.page-web-elements-cta-button-secondary",
    ) as HTMLElement | null;
    e.preventDefault();
    inner.setAttribute("data-cover-unlocked", "1");
    inner.setAttribute("contenteditable", "true");

    const titleIsland = inner.querySelector(":scope > .page-web-elements.page-web-elements-title") as HTMLElement | null;
    const titleTa =
      titleIsland &&
      clickedEditableElement &&
      (titleIsland === clickedEditableElement || titleIsland.contains(clickedEditableElement))
        ? (titleIsland.querySelector(":scope textarea.page-web-elements-title-input") as HTMLTextAreaElement | null)
        : null;
    if (titleTa) {
      requestAnimationFrame(() => {
        titleTa.focus();
        const len = titleTa.value.length;
        titleTa.setSelectionRange(len, len);
        savedRangeRef.current = null;
        setTimeout(() => updateToolbarState(), 0);
      });
      return;
    }

    const descIsland = inner.querySelector(
      ":scope > .page-web-elements.page-web-elements-description",
    ) as HTMLElement | null;
    const descTa =
      descIsland &&
      clickedEditableElement &&
      (descIsland === clickedEditableElement || descIsland.contains(clickedEditableElement))
        ? (descIsland.querySelector(":scope textarea.page-web-elements-description-input") as HTMLTextAreaElement | null)
        : null;
    if (descTa) {
      requestAnimationFrame(() => {
        descTa.focus();
        const len = descTa.value.length;
        descTa.setSelectionRange(len, len);
        savedRangeRef.current = null;
        setTimeout(() => updateToolbarState(), 0);
      });
      return;
    }

    const annIsland = inner.querySelector(
      ":scope > .page-web-elements.page-web-elements-announcement",
    ) as HTMLElement | null;
    const annInput =
      annIsland &&
      clickedEditableElement &&
      (annIsland === clickedEditableElement || annIsland.contains(clickedEditableElement))
        ? (annIsland.querySelector(":scope .page-web-elements-announcement-input") as HTMLElement | null)
        : null;
    if (annInput) {
      requestAnimationFrame(() => {
        annInput.focus();
        const sel = window.getSelection();
        if (sel && ed.contains(annInput)) {
          const r = document.createRange();
          r.selectNodeContents(annInput);
          r.collapse(false);
          sel.removeAllRanges();
          try {
            sel.addRange(r);
          } catch {
            // ignore
          }
        }
        savedRangeRef.current = null;
        setTimeout(() => updateToolbarState(), 0);
      });
      return;
    }

    inner.focus();
    requestAnimationFrame(() => {
      const r = document.createRange();
      const sel = window.getSelection();
      if (!sel || !ed.contains(inner)) return;
      let positionedByPoint = false;
      if (clickedEditableElement && inner.contains(clickedEditableElement)) {
        const docAny = document as Document & {
          caretRangeFromPoint?: (x: number, y: number) => Range | null;
          caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
        };
        const byRange = docAny.caretRangeFromPoint?.(clickX, clickY) ?? null;
        if (byRange && inner.contains(byRange.startContainer)) {
          r.setStart(byRange.startContainer, byRange.startOffset);
          r.collapse(true);
          positionedByPoint = true;
        } else {
          const byPos = docAny.caretPositionFromPoint?.(clickX, clickY) ?? null;
          if (byPos && inner.contains(byPos.offsetNode)) {
            r.setStart(byPos.offsetNode, byPos.offset);
            r.collapse(true);
            positionedByPoint = true;
          }
        }
      }
      if (!positionedByPoint) {
        const hasText = inner.innerText.replace(/\u200b/g, "").trim().length > 0;
        if (hasText) {
          if (clickedEditableElement && inner.contains(clickedEditableElement)) {
            r.selectNodeContents(clickedEditableElement);
          } else {
            r.selectNodeContents(inner);
          }
          r.collapse(false);
        } else {
        const first = inner.firstChild;
        if (first?.nodeName === "BR") {
          r.setStart(inner, 0);
          r.collapse(true);
        } else if (first?.nodeType === Node.TEXT_NODE) {
          r.setStart(first, 0);
          r.collapse(true);
        } else if (first) {
          r.setStartBefore(first);
          r.collapse(true);
        } else {
          r.setStart(inner, 0);
          r.collapse(true);
        }
      }
      }
      sel.removeAllRanges();
      try {
        sel.addRange(r);
      } catch {
        // ignore
      }
      savedRangeRef.current = r.cloneRange();
      setTimeout(() => updateToolbarState(), 0);
    });
  }

  function handleWebInsertHandleMouseDown(e: React.MouseEvent): boolean {
    const rawTarget = e.target as EventTarget | null;
    const target = rawTarget instanceof Element ? rawTarget : (rawTarget as Node | null)?.parentElement ?? null;
    const trigger = target?.closest?.("[data-insert-web-after]") as HTMLElement | null;
    const ed = editorRef.current;
    if (!trigger || !ed?.contains(trigger)) return false;
    const block = trigger.closest(WEB_BLOCK_SHELL_SELECTOR) as HTMLElement | null;
    if (!block || !ed.contains(block)) return false;
    e.preventDefault();
    e.stopPropagation();
    const native = e.nativeEvent as MouseEvent & { stopImmediatePropagation?: () => void };
    native.stopImmediatePropagation?.();
    closeAllOpenWebBlockMenus(ed);
    openAddElementDialog(block);
    setTableOpen(false);
    return true;
  }

  function handleCoverToolbarMouseDown(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    const ed = editorRef.current;
    const toolbar = target.closest?.(".page-web-cover-toolbar") as HTMLElement | null;
    if (!toolbar || !ed?.contains(toolbar)) return;
    e.stopPropagation();
    const native = e.nativeEvent as MouseEvent & { stopImmediatePropagation?: () => void };
    native.stopImmediatePropagation?.();

    const moveBtn = target.closest?.("[data-move-web-block]") as HTMLElement | null;
    if (moveBtn && toolbar.contains(moveBtn)) {
      e.preventDefault();
      const dir = moveBtn.getAttribute("data-move-web-block");
      if ((dir === "up" || dir === "down") && moveWebBlockByToolbar(toolbar, dir, ed)) {
        closeCoverToolbarMenus(toolbar);
        setContentHtml(ed.innerHTML);
        setTimeout(() => updateToolbarState(), 0);
      }
      return;
    }

    const aspectBtn = target.closest?.("[data-set-cover-aspect]") as HTMLElement | null;
    if (aspectBtn && toolbar.contains(aspectBtn)) {
      e.preventDefault();
      e.stopPropagation();
      const v = aspectBtn.getAttribute("data-set-cover-aspect");
      const cover = toolbar.closest(".page-web-cover") as HTMLElement | null;
      if (cover && v && COVER_ASPECT_PRESETS.some((p) => p.id === v) && ed.contains(cover)) {
        cover.setAttribute("data-cover-aspect", v);
        closeCoverToolbarMenus(toolbar);
        setContentHtml(ed.innerHTML);
        setTimeout(() => updateToolbarState(), 0);
      }
      return;
    }

    const typeBtn = target.closest?.("[data-set-cover-type]") as HTMLElement | null;
    if (typeBtn && toolbar.contains(typeBtn)) {
      e.preventDefault();
      e.stopPropagation();
      const rawType = typeBtn.getAttribute("data-set-cover-type");
      const cover = toolbar.closest(".page-web-cover") as HTMLElement | null;
      const nextType: CoverTypePresetId | null =
        rawType === "hero" || rawType === "image" || rawType === "split" ? rawType : null;
      if (cover && nextType && ed.contains(cover)) {
        cover.setAttribute("data-cover-type", nextType);
        if (nextType === "split") {
          cover.setAttribute("data-cover-halign", "left");
          cover.setAttribute("data-cover-valign", "middle");
          cover.setAttribute("data-cover-aspect", "1-8");
          ensureCoverBackgroundCssVars(cover);
        } else if (nextType === "image") {
          cover.setAttribute("data-cover-halign", "center");
          cover.setAttribute("data-cover-valign", "middle");
          cover.setAttribute("data-cover-aspect", "1-8");
        } else {
          cover.setAttribute("data-cover-halign", "center");
          cover.setAttribute("data-cover-valign", "middle");
          cover.setAttribute("data-cover-aspect", "1-8");
          // Hero mode must not keep uploaded image background.
          cover.classList.remove("page-web-cover-has-bg");
          cover.style.background = "";
          cover.style.removeProperty("--cover-bg-image");
          cover.style.removeProperty("--cover-bg-pos");
        }
        toolbar
          .querySelectorAll(".page-web-cover-menu-type[data-set-cover-type]")
          .forEach((btn) => {
            const selected = (btn as HTMLElement).getAttribute("data-set-cover-type") === nextType;
            (btn as HTMLElement).setAttribute("aria-checked", selected ? "true" : "false");
          });
        closeCoverToolbarMenus(toolbar);
        setContentHtml(ed.innerHTML);
        setTimeout(() => updateToolbarState(), 0);
      }
      return;
    }

    const insertCoverElBtn = target.closest?.("[data-insert-cover-element]") as HTMLElement | null;
    if (insertCoverElBtn && toolbar.contains(insertCoverElBtn)) {
      e.preventDefault();
      e.stopPropagation();
      const raw = insertCoverElBtn.getAttribute("data-insert-cover-element") ?? "";
      const cover = toolbar.closest(".page-web-cover") as HTMLElement | null;
      if (!cover || !ed.contains(cover)) return;
      if (raw === "title" || raw === "subtitle" || raw === "button" || raw === "announcement") {
        const changed = toggleCoverBlockElement(cover, raw, ed);
        closeCoverToolbarMenus(toolbar);
        if (changed) {
          setContentHtml(ed.innerHTML);
          setTimeout(() => updateToolbarState(), 0);
        }
      }
      return;
    }

    const coverButton2Toggle = target.closest?.("[data-toggle-cover-button2]") as HTMLElement | null;
    if (coverButton2Toggle && toolbar.contains(coverButton2Toggle)) {
      e.preventDefault();
      e.stopPropagation();
      const cover = toolbar.closest(".page-web-cover") as HTMLElement | null;
      if (!cover || !ed.contains(cover)) return;
      const inner = cover.querySelector(".page-web-cover-inner") as HTMLElement | null;
      const cluster = inner?.querySelector(".page-web-elements-actions .page-web-elements-actions-cluster");
      if (!inner || !cluster?.querySelector(".page-web-elements-button2")) return;
      const v = inner.getAttribute("data-cover-show-button2");
      const visible = v !== "0";
      inner.setAttribute("data-cover-show-button2", visible ? "0" : "1");
      syncCoverButton2Toggle(toolbar);
      closeCoverToolbarMenus(toolbar);
      setContentHtml(ed.innerHTML);
      setTimeout(() => updateToolbarState(), 0);
      return;
    }

    const subTrigger = target.closest?.(".page-web-cover-menu-sub-trigger") as HTMLElement | null;
    if (subTrigger && toolbar.contains(subTrigger)) {
      e.preventDefault();
      e.stopPropagation();
      const sub = subTrigger.closest(".page-web-cover-menu-sub") as HTMLElement | null;
      if (sub) {
        const wasOpen = sub.getAttribute("data-submenu-open") === "1";
        toolbar.querySelectorAll('.page-web-cover-menu-sub[data-submenu-open="1"]').forEach((node) => {
          if (node !== sub) (node as HTMLElement).removeAttribute("data-submenu-open");
        });
        if (wasOpen) sub.removeAttribute("data-submenu-open");
        else sub.setAttribute("data-submenu-open", "1");
        toolbar.querySelectorAll(".page-web-cover-menu-sub-trigger").forEach((tr) => {
          const parent = tr.closest(".page-web-cover-menu-sub");
          const open = parent?.getAttribute("data-submenu-open") === "1";
          (tr as HTMLElement).setAttribute("aria-expanded", open ? "true" : "false");
        });
        positionCoverSubmenuPanelsFixed(toolbar);
        positionToolbarSubmenuVerticalPlacement(toolbar);
      }
      return;
    }

    const uploadBtn = target.closest?.(".page-web-cover-menu-upload") as HTMLElement | null;
    if (uploadBtn && toolbar.contains(uploadBtn)) {
      e.preventDefault();
      e.stopPropagation();
      const cover = toolbar.closest(".page-web-cover") as HTMLElement | null;
      if (!cover || !ed.contains(cover)) return;
      webShellImageUploadPendingRef.current = { kind: "cover", cover };
      webShellImageInputRef.current?.click();
      return;
    }

    const del = target.closest?.(".page-web-cover-menu-delete");
    if (del) {
      e.preventDefault();
      e.stopPropagation();
      closeCoverToolbarMenus(toolbar);
      const cover = toolbar.closest(".page-web-cover");
      if (cover && ed.contains(cover)) removeWebCoverBlock(cover as HTMLElement);
      return;
    }

    if (target.closest?.(".page-web-cover-menu-trigger")) {
      e.preventDefault();
      e.stopPropagation();
      const wasOpen = toolbar.getAttribute("data-menu-open") === "1";
      logWebMenuDebug("cover-trigger:click", toolbar, { wasOpen });
      ed.querySelectorAll(".page-web-cover-toolbar").forEach((node) => {
        closeCoverToolbarMenus(node as HTMLElement);
      });
      if (!wasOpen) {
        syncCoverElementsMenuLabels(toolbar);
        syncCoverButton2Toggle(toolbar);
        syncCoverTypeMenuState(toolbar);
        toolbar.setAttribute("data-menu-open", "1");
        positionCoverMenuDropdownFixed(toolbar);
        positionToolbarDropdownVerticalPlacement(toolbar);
        logWebMenuDebug("cover-trigger:opened", toolbar);
      }
    }
  }

  function handleCarouselToolbarMouseDown(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    const ed = editorRef.current;
    const toolbar = target.closest?.(".page-web-carousel-toolbar") as HTMLElement | null;
    if (!toolbar || !ed?.contains(toolbar)) return;

    const moveBtn = target.closest?.("[data-move-web-block]") as HTMLElement | null;
    if (moveBtn && toolbar.contains(moveBtn)) {
      e.preventDefault();
      e.stopPropagation();
      const dir = moveBtn.getAttribute("data-move-web-block");
      if ((dir === "up" || dir === "down") && moveWebBlockByToolbar(toolbar, dir, ed)) {
        closeCarouselToolbarMenus(toolbar);
        setContentHtml(ed.innerHTML);
        setTimeout(() => updateToolbarState(), 0);
      }
      return;
    }

    const aspectBtn = target.closest?.("[data-set-carousel-aspect]") as HTMLElement | null;
    if (aspectBtn && toolbar.contains(aspectBtn)) {
      e.preventDefault();
      e.stopPropagation();
      const v = aspectBtn.getAttribute("data-set-carousel-aspect");
      const carousel = toolbar.closest(".page-web-carousel") as HTMLElement | null;
      if (carousel && v && CAROUSEL_IMAGE_TYPE_PRESETS.some((p) => p.id === v) && ed.contains(carousel)) {
        carousel.setAttribute("data-carousel-aspect", v);
        toolbar
          .querySelectorAll(".page-web-carousel-menu-image-type[data-set-carousel-aspect]")
          .forEach((btn) => {
            const selected = (btn as HTMLElement).getAttribute("data-set-carousel-aspect") === v;
            (btn as HTMLElement).setAttribute("aria-checked", selected ? "true" : "false");
          });
        closeCarouselToolbarMenus(toolbar);
        setContentHtml(ed.innerHTML);
        setTimeout(() => updateToolbarState(), 0);
      }
      return;
    }

    const subTrigger = target.closest?.(".page-web-carousel-menu-sub-trigger") as HTMLElement | null;
    if (subTrigger && toolbar.contains(subTrigger)) {
      e.preventDefault();
      e.stopPropagation();
      const sub = subTrigger.closest(".page-web-carousel-menu-sub") as HTMLElement | null;
      if (sub) {
        const wasOpen = sub.getAttribute("data-submenu-open") === "1";
        toolbar.querySelectorAll('.page-web-carousel-menu-sub[data-submenu-open="1"]').forEach((node) => {
          if (node !== sub) (node as HTMLElement).removeAttribute("data-submenu-open");
        });
        if (wasOpen) sub.removeAttribute("data-submenu-open");
        else sub.setAttribute("data-submenu-open", "1");
        toolbar.querySelectorAll(".page-web-carousel-menu-sub-trigger").forEach((tr) => {
          const parent = tr.closest(".page-web-carousel-menu-sub");
          const open = parent?.getAttribute("data-submenu-open") === "1";
          (tr as HTMLElement).setAttribute("aria-expanded", open ? "true" : "false");
        });
        positionToolbarSubmenuVerticalPlacement(toolbar);
      }
      return;
    }

    const fullPreviewBtn = target.closest?.(".page-web-carousel-menu-fullscreen");
    if (fullPreviewBtn) {
      e.preventDefault();
      e.stopPropagation();
      const carousel = toolbar.closest(".page-web-carousel") as HTMLElement | null;
      if (!carousel || !ed.contains(carousel)) return;
      const session = buildCarouselPreviewSession(carousel, getActiveCarouselSlide(carousel));
      if (!session) return;
      closeCarouselToolbarMenus(toolbar);
      setCarouselPreviewSession(session);
      return;
    }

    const uploadSlide = target.closest?.(".page-web-carousel-menu-upload-slide");
    if (uploadSlide) {
      e.preventDefault();
      e.stopPropagation();
      const carousel = toolbar.closest(".page-web-carousel") as HTMLElement | null;
      if (!carousel || !ed.contains(carousel)) return;
      const slide = getActiveCarouselSlide(carousel);
      if (!slide) return;
      webShellImageUploadPendingRef.current = { kind: "carousel", carousel, slide };
      webShellImageInputRef.current?.click();
      return;
    }

    const addSlide = target.closest?.(".page-web-carousel-menu-add-slide");
    if (addSlide) {
      e.preventDefault();
      e.stopPropagation();
      const carousel = toolbar.closest(".page-web-carousel") as HTMLElement | null;
      if (!carousel || !ed.contains(carousel)) return;
      const viewport = carousel.querySelector(".page-web-carousel-viewport") as HTMLElement | null;
      if (!viewport) return;
      const strip = ensureWebCarouselStripInViewport(viewport);
      const n = strip.querySelectorAll(".page-web-carousel-slide").length + 1;
      const prevActive = getActiveCarouselSlide(carousel);
      const wrap = document.createElement("div");
      wrap.innerHTML =
        '<div class="page-web-carousel-slide" contenteditable="false">' +
        '<div class="page-web-carousel-slide-inner" contenteditable="false">' +
        '<div class="page-web-carousel-placeholder" contenteditable="false">Слайд ' +
        n +
        "</div></div></div>";
      const newSlide = wrap.firstElementChild as HTMLElement;
      strip.appendChild(newSlide);
      /* Не переключаем активный слайд на новый — иначе при 4+ слайдах окно сдвигается к хвосту и «съезжает влево». */
      if (prevActive && strip.contains(prevActive)) {
        strip.querySelectorAll(".page-web-carousel-slide[data-carousel-active]").forEach((s) => {
          (s as HTMLElement).removeAttribute("data-carousel-active");
        });
        prevActive.setAttribute("data-carousel-active", "1");
      } else {
        strip.querySelectorAll(".page-web-carousel-slide[data-carousel-active]").forEach((s) => {
          (s as HTMLElement).removeAttribute("data-carousel-active");
        });
        newSlide.setAttribute("data-carousel-active", "1");
      }
      closeCarouselToolbarMenus(toolbar);
      webCarouselScrollAlignPendingRef.current = true;
      setContentHtml(ed.innerHTML);
      setTimeout(() => updateToolbarState(), 0);
      return;
    }

    const removeSlide = target.closest?.(".page-web-carousel-menu-remove-slide");
    if (removeSlide) {
      e.preventDefault();
      e.stopPropagation();
      const carousel = toolbar.closest(".page-web-carousel") as HTMLElement | null;
      if (!carousel || !ed.contains(carousel)) return;
      const viewport = carousel.querySelector(".page-web-carousel-viewport") as HTMLElement | null;
      if (!viewport) return;
      const slides = viewport.querySelectorAll(".page-web-carousel-slide");
      if (slides.length <= 1) {
        closeCarouselToolbarMenus(toolbar);
        removeWebCarouselBlock(carousel);
        return;
      }
      const active = getActiveCarouselSlide(carousel);
      const toRemove = active ?? (slides[0] as HTMLElement);
      const nextFocus = toRemove.nextElementSibling ?? toRemove.previousElementSibling;
      toRemove.remove();
      if (nextFocus?.classList.contains("page-web-carousel-slide")) {
        (nextFocus as HTMLElement).setAttribute("data-carousel-active", "1");
      } else {
        viewport.querySelector(".page-web-carousel-slide")?.setAttribute("data-carousel-active", "1");
      }
      closeCarouselToolbarMenus(toolbar);
      webCarouselScrollAlignPendingRef.current = true;
      setContentHtml(ed.innerHTML);
      setTimeout(() => updateToolbarState(), 0);
      return;
    }

    const del = target.closest?.(".page-web-carousel-menu-delete");
    if (del) {
      e.preventDefault();
      e.stopPropagation();
      const c = toolbar.closest(".page-web-carousel") as HTMLElement | null;
      closeCarouselToolbarMenus(toolbar);
      if (c && ed.contains(c)) removeWebCarouselBlock(c);
      return;
    }

    if (target.closest?.(".page-web-carousel-menu-trigger")) {
      e.preventDefault();
      e.stopPropagation();
      const wasOpen = toolbar.getAttribute("data-menu-open") === "1";
      ed.querySelectorAll(".page-web-carousel-toolbar").forEach((node) => {
        closeCarouselToolbarMenus(node as HTMLElement);
      });
      if (!wasOpen) {
        toolbar.setAttribute("data-menu-open", "1");
        const carousel = toolbar.closest(".page-web-carousel") as HTMLElement | null;
        const current = carousel?.getAttribute("data-carousel-aspect") || "horizontal";
        toolbar
          .querySelectorAll(".page-web-carousel-menu-image-type[data-set-carousel-aspect]")
          .forEach((btn) => {
            const selected = (btn as HTMLElement).getAttribute("data-set-carousel-aspect") === current;
            (btn as HTMLElement).setAttribute("aria-checked", selected ? "true" : "false");
          });
        positionCarouselMenuDropdownFixed(toolbar);
      }
    }
  }

  function handleTimelineToolbarMouseDown(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    const ed = editorRef.current;
    const toolbar = target.closest?.(".page-web-timeline-toolbar") as HTMLElement | null;
    if (!toolbar || !ed?.contains(toolbar)) return;
    // Запрещаем показ каретки внутри панели ⋮ таймлайна.
    e.preventDefault();
    e.stopPropagation();
    const timeline = toolbar.closest(".page-web-timeline") as HTMLElement | null;
    if (!timeline || !ed.contains(timeline)) return;

    const moveBtn = target.closest?.("[data-move-web-block]") as HTMLElement | null;
    if (moveBtn && toolbar.contains(moveBtn)) {
      const dir = moveBtn.getAttribute("data-move-web-block");
      if ((dir === "up" || dir === "down") && moveWebBlockByToolbar(toolbar, dir, ed)) {
        closeTimelineToolbarMenus(toolbar);
        setContentHtml(ed.innerHTML);
        setTimeout(() => updateToolbarState(), 0);
      }
      return;
    }

    const addBtn = target.closest?.(".page-web-timeline-menu-add-step");
    if (addBtn) {
      const n = timeline.querySelectorAll(".page-web-timeline-item").length + 1;
      const wrap = document.createElement("div");
      wrap.innerHTML =
        '<div class="page-web-timeline-item">' +
        getWebTimelineItemTermHtml("1 неделя") +
        '<div class="page-web-timeline-dot" aria-hidden="true"></div>' +
        '<div class="page-web-timeline-content">' +
        getWebTimelineItemTitle2Html("Этап " + n + ". Новый этап") +
        getWebTimelineItemStepDescriptionHtml("Опишите, что происходит на этом этапе.") +
        "</div></div>";
      const newItem = wrap.firstElementChild as HTMLElement;
      timeline.appendChild(newItem);
      timeline.style.setProperty("--timeline-cols", String(Math.max(1, timeline.querySelectorAll(".page-web-timeline-item").length)));
      closeTimelineToolbarMenus(toolbar);
      setContentHtml(ed.innerHTML);
      setTimeout(() => updateToolbarState(), 0);
      return;
    }

    const removeBtn = target.closest?.(".page-web-timeline-menu-remove-step");
    if (removeBtn) {
      const items = timeline.querySelectorAll(".page-web-timeline-item");
      if (items.length <= 1) {
        closeTimelineToolbarMenus(toolbar);
        removeWebTimelineBlock(timeline);
        return;
      }
      const last = items[items.length - 1] as HTMLElement;
      last.remove();
      timeline.style.setProperty("--timeline-cols", String(Math.max(1, timeline.querySelectorAll(".page-web-timeline-item").length)));
      closeTimelineToolbarMenus(toolbar);
      setContentHtml(ed.innerHTML);
      setTimeout(() => updateToolbarState(), 0);
      return;
    }

    const toggleElementBtn = target.closest?.("[data-toggle-timeline-element]") as HTMLElement | null;
    if (toggleElementBtn) {
      const kind = toggleElementBtn.getAttribute("data-toggle-timeline-element");
      if (kind === "term" || kind === "title" || kind === "text") {
        const attrName =
          kind === "term" ? "data-timeline-show-term" : kind === "title" ? "data-timeline-show-title" : "data-timeline-show-text";
        const currentlyShown = timeline.getAttribute(attrName) !== "0";
        timeline.setAttribute(attrName, currentlyShown ? "0" : "1");
        syncTimelineToolbarMenuState(toolbar);
        closeTimelineToolbarMenus(toolbar);
        setContentHtml(ed.innerHTML);
        setTimeout(() => updateToolbarState(), 0);
      }
      return;
    }

    const delBtn = target.closest?.(".page-web-timeline-menu-delete");
    if (delBtn) {
      closeTimelineToolbarMenus(toolbar);
      removeWebTimelineBlock(timeline);
      return;
    }

    if (target.closest?.(".page-web-timeline-menu-trigger")) {
      const wasOpen = toolbar.getAttribute("data-menu-open") === "1";
      ed.querySelectorAll(".page-web-timeline-toolbar").forEach((node) => {
        closeTimelineToolbarMenus(node as HTMLElement);
      });
      if (!wasOpen) {
        toolbar.setAttribute("data-menu-open", "1");
        syncTimelineToolbarMenuState(toolbar);
        positionToolbarDropdownVerticalPlacement(toolbar);
      }
    }
  }

  function handleTextBlockV2ToolbarMouseDown(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    const ed = editorRef.current;
    const toolbar = target.closest?.(".page-web-text-block-v2-toolbar") as HTMLElement | null;
    if (!toolbar || !ed?.contains(toolbar)) return;
    e.preventDefault();
    e.stopPropagation();
    const block = toolbar.closest(".page-web-text-block-v2") as HTMLElement | null;
    if (!block || !ed.contains(block)) return;

    const moveBtn = target.closest?.("[data-move-web-block]") as HTMLElement | null;
    if (moveBtn && toolbar.contains(moveBtn)) {
      const dir = moveBtn.getAttribute("data-move-web-block");
      if ((dir === "up" || dir === "down") && moveWebBlockByToolbar(toolbar, dir, ed)) {
        closeTextBlockV2ToolbarMenus(toolbar);
        setContentHtml(ed.innerHTML);
        setTimeout(() => updateToolbarState(), 0);
      }
      return;
    }

    const delBtn = target.closest?.(".page-web-text-block-v2-menu-delete");
    if (delBtn) {
      closeTextBlockV2ToolbarMenus(toolbar);
      removeWebTextBlockV2(block);
      return;
    }

    const subTrigger = target.closest?.(".page-web-text-block-menu-sub-trigger") as HTMLElement | null;
    if (subTrigger && toolbar.contains(subTrigger)) {
      const sub = subTrigger.closest(".page-web-text-block-menu-sub") as HTMLElement | null;
      if (sub && toolbar.contains(sub)) {
        const wasOpen = sub.getAttribute("data-submenu-open") === "1";
        const sameLevelContainer = sub.parentElement;
        if (sameLevelContainer) {
          Array.from(sameLevelContainer.children).forEach((node) => {
            const el = node as HTMLElement;
            if (!el.classList?.contains("page-web-text-block-menu-sub")) return;
            if (el !== sub) el.removeAttribute("data-submenu-open");
          });
        }
        if (wasOpen) sub.removeAttribute("data-submenu-open");
        else sub.setAttribute("data-submenu-open", "1");
        toolbar.querySelectorAll(".page-web-text-block-menu-sub-trigger").forEach((tr) => {
          const parent = tr.closest(".page-web-text-block-menu-sub");
          const open = parent?.getAttribute("data-submenu-open") === "1";
          (tr as HTMLElement).setAttribute("aria-expanded", open ? "true" : "false");
        });
        positionToolbarSubmenuVerticalPlacement(toolbar);
      }
      return;
    }

    const v2LearnMoreToggle = target.closest?.("[data-toggle-v2-announcement-learn-more]") as HTMLElement | null;
    if (v2LearnMoreToggle && toolbar.contains(v2LearnMoreToggle)) {
      if (!isWebTextBlockV2FieldVisible(block, "announcement")) {
        syncWebTextBlockV2ElementsMenuState(toolbar);
      } else if (toggleWebTextBlockV2AnnouncementLearnMore(block)) {
        syncWebTextBlockV2ElementsMenuState(toolbar);
        setContentHtml(ed.innerHTML);
        setTimeout(() => updateToolbarState(), 0);
      } else {
        syncWebTextBlockV2ElementsMenuState(toolbar);
      }
      closeTextBlockV2ToolbarMenus(toolbar);
      return;
    }

    const v2FieldToggle = target.closest?.("[data-toggle-v2-field]") as HTMLElement | null;
    if (v2FieldToggle && toolbar.contains(v2FieldToggle)) {
      const raw = v2FieldToggle.getAttribute("data-toggle-v2-field");
      if (isWebTextBlockV2FieldKey(raw) && toggleWebTextBlockV2Field(block, raw)) {
        syncWebTextBlockV2ElementsMenuState(toolbar);
        setContentHtml(ed.innerHTML);
        setTimeout(() => updateToolbarState(), 0);
      } else {
        syncWebTextBlockV2ElementsMenuState(toolbar);
      }
      closeTextBlockV2ToolbarMenus(toolbar);
      return;
    }

    if (target.closest?.(".page-web-text-block-v2-menu-trigger")) {
      const wasOpen = toolbar.getAttribute("data-menu-open") === "1";
      ed.querySelectorAll(".page-web-text-block-v2-toolbar").forEach((node) => {
        closeTextBlockV2ToolbarMenus(node as HTMLElement);
      });
      ed.querySelectorAll(".page-web-article-text-toolbar").forEach((node) => {
        closeArticleTextToolbarMenus(node as HTMLElement);
      });
      ed.querySelectorAll(".page-web-accordion-toolbar").forEach((node) => {
        closeAccordionToolbarMenus(node as HTMLElement);
      });
      ed.querySelectorAll(".page-web-text-block-toolbar").forEach((node) => {
        closeTextBlockToolbarMenus(node as HTMLElement);
      });
      ed.querySelectorAll(".page-web-spacer-toolbar").forEach((node) => {
        closeSpacerToolbarMenus(node as HTMLElement);
      });
      if (!wasOpen) {
        toolbar.setAttribute("data-menu-open", "1");
        syncWebTextBlockV2ElementsMenuState(toolbar);
        positionToolbarDropdownVerticalPlacement(toolbar);
      }
    }
  }

  function handleArticleTextToolbarMouseDown(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    const ed = editorRef.current;
    const toolbar = target.closest?.(".page-web-article-text-toolbar") as HTMLElement | null;
    if (!toolbar || !ed?.contains(toolbar)) return;
    e.preventDefault();
    e.stopPropagation();
    const block = toolbar.closest(".page-web-article-text") as HTMLElement | null;
    if (!block || !ed.contains(block)) return;

    const moveBtn = target.closest?.("[data-move-web-block]") as HTMLElement | null;
    if (moveBtn && toolbar.contains(moveBtn)) {
      const dir = moveBtn.getAttribute("data-move-web-block");
      if ((dir === "up" || dir === "down") && moveWebBlockByToolbar(toolbar, dir, ed)) {
        closeArticleTextToolbarMenus(toolbar);
        setContentHtml(ed.innerHTML);
        setTimeout(() => updateToolbarState(), 0);
      }
      return;
    }

    const delBtn = target.closest?.(".page-web-article-text-menu-delete");
    if (delBtn) {
      closeArticleTextToolbarMenus(toolbar);
      removeWebArticleTextBlock(block);
      return;
    }

    const subTrigger = target.closest?.(".page-web-text-block-menu-sub-trigger") as HTMLElement | null;
    if (subTrigger && toolbar.contains(subTrigger)) {
      const sub = subTrigger.closest(".page-web-text-block-menu-sub") as HTMLElement | null;
      if (sub && toolbar.contains(sub)) {
        const wasOpen = sub.getAttribute("data-submenu-open") === "1";
        const sameLevelContainer = sub.parentElement;
        if (sameLevelContainer) {
          Array.from(sameLevelContainer.children).forEach((node) => {
            const el = node as HTMLElement;
            if (!el.classList?.contains("page-web-text-block-menu-sub")) return;
            if (el !== sub) el.removeAttribute("data-submenu-open");
          });
        }
        if (wasOpen) sub.removeAttribute("data-submenu-open");
        else sub.setAttribute("data-submenu-open", "1");
        toolbar.querySelectorAll(".page-web-text-block-menu-sub-trigger").forEach((tr) => {
          const parent = tr.closest(".page-web-text-block-menu-sub");
          const open = parent?.getAttribute("data-submenu-open") === "1";
          (tr as HTMLElement).setAttribute("aria-expanded", open ? "true" : "false");
        });
        positionToolbarSubmenuVerticalPlacement(toolbar);
      }
      return;
    }

    const fieldToggle = target.closest?.("[data-toggle-article-field]") as HTMLElement | null;
    if (fieldToggle && toolbar.contains(fieldToggle)) {
      const raw = fieldToggle.getAttribute("data-toggle-article-field");
      if (isWebArticleTextFieldKey(raw) && toggleWebArticleTextField(block, raw)) {
        syncWebArticleTextElementsMenuState(toolbar);
        setContentHtml(ed.innerHTML);
        setTimeout(() => updateToolbarState(), 0);
      } else {
        syncWebArticleTextElementsMenuState(toolbar);
      }
      closeArticleTextToolbarMenus(toolbar);
      return;
    }

    if (target.closest?.(".page-web-article-text-menu-trigger")) {
      const wasOpen = toolbar.getAttribute("data-menu-open") === "1";
      ed.querySelectorAll(".page-web-article-text-toolbar").forEach((node) => {
        closeArticleTextToolbarMenus(node as HTMLElement);
      });
      ed.querySelectorAll(".page-web-text-block-v2-toolbar").forEach((node) => {
        closeTextBlockV2ToolbarMenus(node as HTMLElement);
      });
      ed.querySelectorAll(".page-web-text-block-toolbar").forEach((node) => {
        closeTextBlockToolbarMenus(node as HTMLElement);
      });
      ed.querySelectorAll(".page-web-accordion-toolbar").forEach((node) => {
        closeAccordionToolbarMenus(node as HTMLElement);
      });
      ed.querySelectorAll(".page-web-spacer-toolbar").forEach((node) => {
        closeSpacerToolbarMenus(node as HTMLElement);
      });
      if (!wasOpen) {
        toolbar.setAttribute("data-menu-open", "1");
        syncWebArticleTextElementsMenuState(toolbar);
        positionToolbarDropdownVerticalPlacement(toolbar);
      }
    }
  }

  function handleAccordionToolbarMouseDown(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    const ed = editorRef.current;
    const toolbar = target.closest?.(".page-web-accordion-toolbar") as HTMLElement | null;
    if (!toolbar || !ed?.contains(toolbar)) return;
    e.preventDefault();
    e.stopPropagation();
    const block = toolbar.closest(".page-web-accordion") as HTMLElement | null;
    if (!block || !ed.contains(block)) return;

    const moveBtn = target.closest?.("[data-move-web-block]") as HTMLElement | null;
    if (moveBtn && toolbar.contains(moveBtn)) {
      const dir = moveBtn.getAttribute("data-move-web-block");
      if ((dir === "up" || dir === "down") && moveWebBlockByToolbar(toolbar, dir, ed)) {
        closeAccordionToolbarMenus(toolbar);
        setContentHtml(ed.innerHTML);
        setTimeout(() => updateToolbarState(), 0);
      }
      return;
    }

    const delBtn = target.closest?.(".page-web-accordion-menu-delete");
    if (delBtn) {
      closeAccordionToolbarMenus(toolbar);
      removeWebAccordionBlock(block);
      return;
    }

    const addBtn = target.closest?.(".page-web-accordion-menu-add-item");
    if (addBtn) {
      const list = block.querySelector(":scope > .page-web-accordion-list") as HTMLElement | null;
      if (list) {
        const tmp = document.createElement("div");
        tmp.innerHTML = getWebAccordionItemHtml("Новый вопрос", "Ответ на вопрос.");
        const item = tmp.firstElementChild;
        if (item) list.appendChild(item);
        setContentHtml(ed.innerHTML);
        setTimeout(() => updateToolbarState(), 0);
      }
      closeAccordionToolbarMenus(toolbar);
      return;
    }

    const removeBtn = target.closest?.(".page-web-accordion-menu-remove-item");
    if (removeBtn) {
      const items = block.querySelectorAll(":scope > .page-web-accordion-list > .page-web-accordion-item");
      if (items.length > 1) {
        items[items.length - 1]?.remove();
        setContentHtml(ed.innerHTML);
        setTimeout(() => updateToolbarState(), 0);
      }
      closeAccordionToolbarMenus(toolbar);
      return;
    }

    const subTrigger = target.closest?.(".page-web-text-block-menu-sub-trigger") as HTMLElement | null;
    if (subTrigger && toolbar.contains(subTrigger)) {
      const sub = subTrigger.closest(".page-web-text-block-menu-sub") as HTMLElement | null;
      if (sub && toolbar.contains(sub)) {
        const wasOpen = sub.getAttribute("data-submenu-open") === "1";
        const sameLevelContainer = sub.parentElement;
        if (sameLevelContainer) {
          Array.from(sameLevelContainer.children).forEach((node) => {
            const el = node as HTMLElement;
            if (!el.classList?.contains("page-web-text-block-menu-sub")) return;
            if (el !== sub) el.removeAttribute("data-submenu-open");
          });
        }
        if (wasOpen) sub.removeAttribute("data-submenu-open");
        else sub.setAttribute("data-submenu-open", "1");
        toolbar.querySelectorAll(".page-web-text-block-menu-sub-trigger").forEach((tr) => {
          const parent = tr.closest(".page-web-text-block-menu-sub");
          const open = parent?.getAttribute("data-submenu-open") === "1";
          (tr as HTMLElement).setAttribute("aria-expanded", open ? "true" : "false");
        });
        positionToolbarSubmenuVerticalPlacement(toolbar);
      }
      return;
    }

    const fieldToggle = target.closest?.("[data-toggle-accordion-field]") as HTMLElement | null;
    if (fieldToggle && toolbar.contains(fieldToggle)) {
      const raw = fieldToggle.getAttribute("data-toggle-accordion-field");
      if (isWebAccordionHeadFieldKey(raw) && toggleWebAccordionHeadField(block, raw)) {
        syncWebAccordionElementsMenuState(toolbar);
        setContentHtml(ed.innerHTML);
        setTimeout(() => updateToolbarState(), 0);
      } else {
        syncWebAccordionElementsMenuState(toolbar);
      }
      closeAccordionToolbarMenus(toolbar);
      return;
    }

    if (target.closest?.(".page-web-accordion-menu-trigger")) {
      const wasOpen = toolbar.getAttribute("data-menu-open") === "1";
      ed.querySelectorAll(".page-web-accordion-toolbar").forEach((node) => {
        closeAccordionToolbarMenus(node as HTMLElement);
      });
      ed.querySelectorAll(".page-web-article-text-toolbar").forEach((node) => {
        closeArticleTextToolbarMenus(node as HTMLElement);
      });
      ed.querySelectorAll(".page-web-text-block-v2-toolbar").forEach((node) => {
        closeTextBlockV2ToolbarMenus(node as HTMLElement);
      });
      ed.querySelectorAll(".page-web-text-block-toolbar").forEach((node) => {
        closeTextBlockToolbarMenus(node as HTMLElement);
      });
      ed.querySelectorAll(".page-web-spacer-toolbar").forEach((node) => {
        closeSpacerToolbarMenus(node as HTMLElement);
      });
      if (!wasOpen) {
        toolbar.setAttribute("data-menu-open", "1");
        syncWebAccordionElementsMenuState(toolbar);
        positionToolbarDropdownVerticalPlacement(toolbar);
      }
    }
  }

  function handleTextMediaToolbarMouseDown(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    const ed = editorRef.current;
    const toolbar = target.closest?.(".page-web-text-media-toolbar") as HTMLElement | null;
    if (!toolbar || !ed?.contains(toolbar)) return;
    e.preventDefault();
    e.stopPropagation();
    const block = toolbar.closest(".page-web-text-media") as HTMLElement | null;
    if (!block || !ed.contains(block)) return;

    const moveBtn = target.closest?.("[data-move-web-block]") as HTMLElement | null;
    if (moveBtn && toolbar.contains(moveBtn)) {
      const dir = moveBtn.getAttribute("data-move-web-block");
      if ((dir === "up" || dir === "down") && moveWebBlockByToolbar(toolbar, dir, ed)) {
        closeTextMediaToolbarMenus(toolbar);
        setContentHtml(ed.innerHTML);
        setTimeout(() => updateToolbarState(), 0);
      }
      return;
    }

    const delBtn = target.closest?.(".page-web-text-media-menu-delete");
    if (delBtn) {
      closeTextMediaToolbarMenus(toolbar);
      removeWebTextMediaBlock(block);
      return;
    }

    if (target.closest?.(".page-web-text-media-menu-trigger")) {
      const wasOpen = toolbar.getAttribute("data-menu-open") === "1";
      ed.querySelectorAll(".page-web-text-media-toolbar").forEach((node) => {
        closeTextMediaToolbarMenus(node as HTMLElement);
      });
      if (!wasOpen) {
        toolbar.setAttribute("data-menu-open", "1");
        positionToolbarDropdownVerticalPlacement(toolbar);
      }
    }
  }

  function handleTextBlockToolbarMouseDown(e: React.MouseEvent) {
    const rawTarget = e.target as EventTarget | null;
    const target = (rawTarget instanceof Element
      ? rawTarget
      : (rawTarget as Node | null)?.parentElement ?? null) as HTMLElement | null;
    if (!target) return;
    const ed = editorRef.current;
    const toolbar = target.closest?.(".page-web-text-block-toolbar") as HTMLElement | null;
    if (!toolbar || !ed?.contains(toolbar)) return;
    e.preventDefault();
    e.stopPropagation();
    const block = toolbar.closest(".page-web-text-block") as HTMLElement | null;
    if (!block || !ed.contains(block)) return;

    const moveBtn = target.closest?.("[data-move-web-block]") as HTMLElement | null;
    if (moveBtn && toolbar.contains(moveBtn)) {
      const dir = moveBtn.getAttribute("data-move-web-block");
      if ((dir === "up" || dir === "down") && moveWebBlockByToolbar(toolbar, dir, ed)) {
        closeTextBlockToolbarMenus(toolbar);
        setContentHtml(ed.innerHTML);
        setTimeout(() => updateToolbarState(), 0);
      }
      return;
    }

    const subTrigger = target.closest?.(".page-web-text-block-menu-sub-trigger") as HTMLElement | null;
    if (subTrigger) {
      const sub = subTrigger.closest(".page-web-text-block-menu-sub") as HTMLElement | null;
      if (sub) {
        const wasOpen = sub.getAttribute("data-submenu-open") === "1";
        logWebMenuDebug("text-block-sub-trigger:click", toolbar, {
          wasOpen,
          subClass: sub.className,
        });
        const sameLevelContainer = sub.parentElement;
        if (sameLevelContainer) {
          Array.from(sameLevelContainer.children).forEach((node) => {
            const el = node as HTMLElement;
            if (!el.classList?.contains("page-web-text-block-menu-sub")) return;
            if (el !== sub) el.removeAttribute("data-submenu-open");
          });
        }
        if (wasOpen) sub.removeAttribute("data-submenu-open");
        else sub.setAttribute("data-submenu-open", "1");
        toolbar.querySelectorAll(".page-web-text-block-menu-sub-trigger").forEach((tr) => {
          const parent = tr.closest(".page-web-text-block-menu-sub");
          const open = parent?.getAttribute("data-submenu-open") === "1";
          (tr as HTMLElement).setAttribute("aria-expanded", open ? "true" : "false");
        });
        positionToolbarSubmenuVerticalPlacement(toolbar);
        logWebMenuDebug("text-block-sub-trigger:after", toolbar, {
          subIsOpenNow: sub.getAttribute("data-submenu-open") === "1",
        });
      }
      return;
    }

    const elementBtn = target.closest?.("[data-toggle-feature-grid-element]") as HTMLElement | null;
    if (elementBtn) {
      const raw = elementBtn.getAttribute("data-toggle-feature-grid-element");
      if (isFeatureGridElementKind(raw) && block.getAttribute("data-text-block-variant") === "feature-grid") {
        if (toggleFeatureGridTextBlockElement(block, raw)) {
          syncFeatureGridElementsMenuState(toolbar);
          setContentHtml(ed.innerHTML);
          setTimeout(() => updateToolbarState(), 0);
        }
      }
      closeTextBlockToolbarMenus(toolbar);
      return;
    }

    const featureGridBlockToggleBtn = target.closest?.("[data-feature-grid-block-toggle]") as HTMLElement | null;
    if (featureGridBlockToggleBtn) {
      const raw = featureGridBlockToggleBtn.getAttribute("data-feature-grid-block-toggle");
      if (raw === "cards" && block.getAttribute("data-text-block-variant") === "feature-grid") {
        const content = block.querySelector(":scope > .page-web-text-block-content") as HTMLElement | null;
        const root = content?.querySelector(".page-web-feature-grid") as HTMLElement | null;
        if (root) {
          toggleFeatureGridBlockCardsList(root);
          syncFeatureGridElementsMenuState(toolbar);
          setContentHtml(ed.innerHTML);
          setTimeout(() => updateToolbarState(), 0);
        }
      }
      closeTextBlockToolbarMenus(toolbar);
      return;
    }

    const messagePosBtn = target.closest?.("[data-feature-grid-message-position]") as HTMLElement | null;
    if (messagePosBtn) {
      if (block.getAttribute("data-text-block-variant") === "feature-grid") {
        const positionRaw = messagePosBtn.getAttribute("data-feature-grid-message-position");
        const content = block.querySelector(":scope > .page-web-text-block-content") as HTMLElement | null;
        const root = content?.querySelector(".page-web-feature-grid") as HTMLElement | null;
        if (root && isFeatureGridMessagePosition(positionRaw)) {
          const changed = positionRaw === "none"
            ? clearFeatureGridMessage(root)
            : ensureFeatureGridMessage(root, positionRaw);
          syncFeatureGridElementsMenuState(toolbar);
          if (changed) {
            setContentHtml(ed.innerHTML);
            setTimeout(() => updateToolbarState(), 0);
          }
        }
      }
      closeTextBlockToolbarMenus(toolbar);
      return;
    }

    const messageColorBtn = target.closest?.("[data-feature-grid-message-color]") as HTMLElement | null;
    if (messageColorBtn) {
      if (block.getAttribute("data-text-block-variant") === "feature-grid") {
        const colorRaw = messageColorBtn.getAttribute("data-feature-grid-message-color");
        const content = block.querySelector(":scope > .page-web-text-block-content") as HTMLElement | null;
        const root = content?.querySelector(".page-web-feature-grid") as HTMLElement | null;
        if (root && isFeatureGridMessageColor(colorRaw)) {
          const changed = setFeatureGridMessageColor(root, colorRaw);
          syncFeatureGridElementsMenuState(toolbar);
          if (changed) {
            setContentHtml(ed.innerHTML);
            setTimeout(() => updateToolbarState(), 0);
          }
        }
      }
      closeTextBlockToolbarMenus(toolbar);
      return;
    }

    const imageDisplayBtn = target.closest?.("[data-feature-grid-image-display]") as HTMLElement | null;
    if (imageDisplayBtn) {
      if (block.getAttribute("data-text-block-variant") === "feature-grid") {
        const displayRaw = imageDisplayBtn.getAttribute("data-feature-grid-image-display");
        const content = block.querySelector(":scope > .page-web-text-block-content") as HTMLElement | null;
        const root = content?.querySelector(".page-web-feature-grid") as HTMLElement | null;
        if (root && isFeatureGridImageDisplay(displayRaw)) {
          const changed = setFeatureGridImageDisplay(root, displayRaw);
          syncFeatureGridElementsMenuState(toolbar);
          if (changed) {
            setContentHtml(ed.innerHTML);
            setTimeout(() => updateToolbarState(), 0);
          }
        }
      }
      closeTextBlockToolbarMenus(toolbar);
      return;
    }

    const imagePosBtn = target.closest?.("[data-feature-grid-image-position]") as HTMLElement | null;
    if (imagePosBtn) {
      if (block.getAttribute("data-text-block-variant") === "feature-grid") {
        const positionRaw = imagePosBtn.getAttribute("data-feature-grid-image-position");
        const content = block.querySelector(":scope > .page-web-text-block-content") as HTMLElement | null;
        const root = content?.querySelector(".page-web-feature-grid") as HTMLElement | null;
        if (root && isFeatureGridImagePosition(positionRaw)) {
          const changed = setFeatureGridImagePosition(root, positionRaw);
          syncFeatureGridElementsMenuState(toolbar);
          if (changed) {
            setContentHtml(ed.innerHTML);
            setTimeout(() => updateToolbarState(), 0);
          }
        }
      }
      closeTextBlockToolbarMenus(toolbar);
      return;
    }

    const uploadFeatureGridImageBtn = target.closest?.("[data-feature-grid-upload-image]") as HTMLElement | null;
    if (uploadFeatureGridImageBtn) {
      if (block.getAttribute("data-text-block-variant") === "feature-grid") {
        const content = block.querySelector(":scope > .page-web-text-block-content") as HTMLElement | null;
        const root = content?.querySelector(".page-web-feature-grid") as HTMLElement | null;
        const imageBox = root?.querySelector(":scope > .page-web-feature-grid-image") as HTMLElement | null;
        const imagePosition = root ? getFeatureGridImagePosition(root) : "none";
        if (imageBox && imagePosition !== "none") {
          webShellImageUploadPendingRef.current = { kind: "feature-grid-image", imageBox };
          closeTextBlockToolbarMenus(toolbar);
          webShellImageInputRef.current?.click();
          return;
        }
      }
      closeTextBlockToolbarMenus(toolbar);
      return;
    }

    const cardsActionBtn = target.closest?.("[data-feature-grid-cards-action]") as HTMLElement | null;
    if (cardsActionBtn) {
      if (block.getAttribute("data-text-block-variant") === "feature-grid") {
        const action = cardsActionBtn.getAttribute("data-feature-grid-cards-action");
        const content = block.querySelector(":scope > .page-web-text-block-content") as HTMLElement | null;
        const root = content?.querySelector(".page-web-feature-grid") as HTMLElement | null;
        if (root && (action === "add" || action === "remove")) {
          const changed = action === "add" ? addOneFeatureGridCard(root) : removeOneFeatureGridCard(root);
          if (changed) {
            syncFeatureGridElementsMenuState(toolbar);
            setContentHtml(ed.innerHTML);
            setTimeout(() => updateToolbarState(), 0);
          }
        }
      }
      closeTextBlockToolbarMenus(toolbar);
      return;
    }

    const setColsBtn = target.closest?.("[data-feature-grid-set-cols]") as HTMLElement | null;
    if (setColsBtn) {
      if (block.getAttribute("data-text-block-variant") === "feature-grid") {
        const colsRaw = setColsBtn.getAttribute("data-feature-grid-set-cols");
        const content = block.querySelector(":scope > .page-web-text-block-content") as HTMLElement | null;
        const root = content?.querySelector(".page-web-feature-grid") as HTMLElement | null;
        if (root && (colsRaw === "2" || colsRaw === "3" || colsRaw === "4")) {
          const changed = setFeatureGridCols(root, Number(colsRaw) as 2 | 3 | 4);
          if (changed) {
            syncFeatureGridElementsMenuState(toolbar);
            setContentHtml(ed.innerHTML);
            setTimeout(() => updateToolbarState(), 0);
          } else {
            syncFeatureGridElementsMenuState(toolbar);
          }
        }
      }
      closeTextBlockToolbarMenus(toolbar);
      return;
    }

    const cardFieldToggleBtn = target.closest?.("[data-feature-grid-card-field-toggle]") as HTMLElement | null;
    if (cardFieldToggleBtn) {
      if (block.getAttribute("data-text-block-variant") === "feature-grid") {
        const raw = cardFieldToggleBtn.getAttribute("data-feature-grid-card-field-toggle");
        const content = block.querySelector(":scope > .page-web-text-block-content") as HTMLElement | null;
        const root = content?.querySelector(".page-web-feature-grid") as HTMLElement | null;
        if (root && isFeatureGridCardFieldToggleKey(raw)) {
          const changed = applyFeatureGridCardFieldToggle(root, raw);
          if (changed) {
            syncFeatureGridElementsMenuState(toolbar);
            setContentHtml(ed.innerHTML);
            setTimeout(() => updateToolbarState(), 0);
          }
        }
      }
      closeTextBlockToolbarMenus(toolbar);
      return;
    }

    const cardDecorationBtn = target.closest?.("[data-feature-grid-card-decoration]") as HTMLElement | null;
    if (cardDecorationBtn) {
      if (block.getAttribute("data-text-block-variant") === "feature-grid") {
        const raw = cardDecorationBtn.getAttribute("data-feature-grid-card-decoration");
        const content = block.querySelector(":scope > .page-web-text-block-content") as HTMLElement | null;
        const root = content?.querySelector(".page-web-feature-grid") as HTMLElement | null;
        if (root && isFeatureGridCardDecorationKey(raw)) {
          const changed = setFeatureGridCardDecoration(root, raw);
          if (changed) {
            syncFeatureGridElementsMenuState(toolbar);
            setContentHtml(ed.innerHTML);
            setTimeout(() => updateToolbarState(), 0);
          } else {
            syncFeatureGridElementsMenuState(toolbar);
          }
        }
      }
      closeTextBlockToolbarMenus(toolbar);
      return;
    }

    const plainFieldBtn = target.closest?.("[data-plain-text-block-field]") as HTMLElement | null;
    if (plainFieldBtn) {
      if (!block.getAttribute("data-text-block-variant")) {
        const raw = plainFieldBtn.getAttribute("data-plain-text-block-field");
        const field =
          raw === "subtitle" || raw === "title" || raw === "lead"
            ? raw
            : null;
        if (field && applyPlainTextBlockFieldToggle(block, field)) {
          syncTextBlockToolbarVariantState(toolbar);
          setContentHtml(ed.innerHTML);
          setTimeout(() => updateToolbarState(), 0);
        }
      }
      closeTextBlockToolbarMenus(toolbar);
      return;
    }

    const workPricingItemsActionBtn = target.closest?.("[data-work-pricing-items-action]") as HTMLElement | null;
    if (workPricingItemsActionBtn) {
      if (block.getAttribute("data-text-block-variant") === "work-pricing") {
        const action = workPricingItemsActionBtn.getAttribute("data-work-pricing-items-action");
        const changed = action === "add"
          ? addOneWorkPricingItem(block)
          : action === "remove"
            ? removeOneWorkPricingItem(block)
            : false;
        syncTextBlockToolbarVariantState(toolbar);
        if (changed) {
          setContentHtml(ed.innerHTML);
          setTimeout(() => updateToolbarState(), 0);
        }
      }
      closeTextBlockToolbarMenus(toolbar);
      return;
    }

    const delBtn = target.closest?.(".page-web-text-block-menu-delete");
    if (delBtn) {
      closeTextBlockToolbarMenus(toolbar);
      removeWebTextBlock(block);
      return;
    }

    if (target.closest?.(".page-web-text-block-menu-trigger")) {
      const wasOpen = toolbar.getAttribute("data-menu-open") === "1";
      logWebMenuDebug("text-block-trigger:click", toolbar, { wasOpen });
      ed.querySelectorAll(".page-web-text-block-toolbar").forEach((node) => {
        closeTextBlockToolbarMenus(node as HTMLElement);
      });
      ed.querySelectorAll(".page-web-text-block-v2-toolbar").forEach((node) => {
        closeTextBlockV2ToolbarMenus(node as HTMLElement);
      });
    ed.querySelectorAll(".page-web-spacer-toolbar").forEach((node) => {
      closeSpacerToolbarMenus(node as HTMLElement);
    });
      if (!wasOpen) {
        resetTextBlockMenuDropdownStyles(toolbar);
        toolbar.setAttribute("data-menu-open", "1");
        syncTextBlockToolbarVariantState(toolbar);
        positionToolbarDropdownVerticalPlacement(toolbar);
        logWebMenuDebug("text-block-trigger:opened", toolbar);
      }
    }
  }

  function handleSpacerToolbarMouseDown(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    const ed = editorRef.current;
    const toolbar = target.closest?.(".page-web-spacer-toolbar") as HTMLElement | null;
    if (!toolbar || !ed?.contains(toolbar)) return;
    e.preventDefault();
    e.stopPropagation();
    const block = toolbar.closest(".page-web-spacer") as HTMLElement | null;
    if (!block || !ed.contains(block)) return;

    const moveBtn = target.closest?.("[data-move-web-block]") as HTMLElement | null;
    if (moveBtn && toolbar.contains(moveBtn)) {
      const dir = moveBtn.getAttribute("data-move-web-block");
      if ((dir === "up" || dir === "down") && moveWebBlockByToolbar(toolbar, dir, ed)) {
        closeSpacerToolbarMenus(toolbar);
        setContentHtml(ed.innerHTML);
        setTimeout(() => updateToolbarState(), 0);
      }
      return;
    }

    const sizeBtn = target.closest?.("[data-set-spacer-size]") as HTMLElement | null;
    if (sizeBtn && toolbar.contains(sizeBtn)) {
      const size = sizeBtn.getAttribute("data-set-spacer-size");
      if (size === "sm" || size === "md" || size === "lg") {
        block.setAttribute("data-spacer-size", size);
        toolbar.querySelectorAll(".page-web-spacer-menu-size[data-set-spacer-size]").forEach((btn) => {
          const selected = (btn as HTMLElement).getAttribute("data-set-spacer-size") === size;
          (btn as HTMLElement).setAttribute("aria-checked", selected ? "true" : "false");
        });
        closeSpacerToolbarMenus(toolbar);
        setContentHtml(ed.innerHTML);
        setTimeout(() => updateToolbarState(), 0);
      }
      return;
    }

    const delBtn = target.closest?.(".page-web-spacer-menu-delete");
    if (delBtn) {
      block.remove();
      closeSpacerToolbarMenus(toolbar);
      setContentHtml(ed.innerHTML);
      setTimeout(() => updateToolbarState(), 0);
      return;
    }

    if (target.closest?.(".page-web-spacer-menu-trigger")) {
      const wasOpen = toolbar.getAttribute("data-menu-open") === "1";
      ed.querySelectorAll(".page-web-spacer-toolbar").forEach((node) => {
        closeSpacerToolbarMenus(node as HTMLElement);
      });
      if (!wasOpen) {
        toolbar.setAttribute("data-menu-open", "1");
        positionToolbarDropdownVerticalPlacement(toolbar);
      }
    }
  }

  function handleCarouselEditorMouseDown(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    const carousel = target.closest?.(".page-web-carousel") as HTMLElement | null;
    const ed = editorRef.current;
    if (!carousel || !ed?.contains(carousel)) return;

    if (target.closest?.(".page-web-carousel-toolbar")) {
      handleCarouselToolbarMouseDown(e);
      return;
    }

    // Вся карусель вне меню — не даём contentEditable-родителю показать каретку (в т.ч. клик по полосе прокрутки).
    e.preventDefault();
    e.stopPropagation();

    if (target.closest?.(".page-web-carousel-prev") || target.closest?.(".page-web-carousel-next")) {
      const arrowBtn = target.closest(".page-web-carousel-arrow") as HTMLButtonElement | null;
      if (arrowBtn?.disabled) return;
      const viewport = carousel.querySelector(".page-web-carousel-viewport") as HTMLElement | null;
      if (!viewport) return;
      const dir = target.closest(".page-web-carousel-prev") ? -1 : 1;
      shiftCarouselStripBySlide(viewport, dir as -1 | 1);
      return;
    }

    const slide = target.closest?.(".page-web-carousel-slide") as HTMLElement | null;
    if (slide && carousel.contains(slide)) {
      carousel.querySelectorAll(".page-web-carousel-slide[data-carousel-active]").forEach((s) => {
        (s as HTMLElement).removeAttribute("data-carousel-active");
      });
      slide.setAttribute("data-carousel-active", "1");
      const viewport = carousel.querySelector(".page-web-carousel-viewport") as HTMLElement | null;
      if (viewport) {
        requestAnimationFrame(() => alignWebCarouselViewportToActive(viewport));
      }
    }
  }

  function handleTextMediaEditorMouseDown(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    const block = target.closest?.(".page-web-text-media") as HTMLElement | null;
    const ed = editorRef.current;
    if (!block || !ed?.contains(block)) return;
    if (target.closest?.(".page-web-text-media-toolbar")) {
      handleTextMediaToolbarMouseDown(e);
      return;
    }
  }

  function pickTextareaInSubtreeFromPoint(
    doc: Document,
    clientX: number,
    clientY: number,
    subtreeRoot: HTMLElement,
    ed: HTMLElement,
    ownerFeatureGridItem?: HTMLElement | null,
  ): HTMLTextAreaElement | null {
    for (const node of doc.elementsFromPoint(clientX, clientY)) {
      if (!(node instanceof HTMLTextAreaElement)) continue;
      if (!ed.contains(node) || !subtreeRoot.contains(node)) continue;
      if (ownerFeatureGridItem) {
        const item = node.closest(".page-web-feature-grid-item") as HTMLElement | null;
        if (item !== ownerFeatureGridItem) continue;
      }
      return node;
    }
    return null;
  }

  function getFeatureGridListFromBlock(block: HTMLElement): HTMLElement | null {
    const content = block.querySelector(":scope > .page-web-text-block-content") as HTMLElement | null;
    if (!content) return null;
    const grid = content.querySelector(":scope > .page-web-feature-grid") as HTMLElement | null;
    if (!grid) return null;
    return grid.querySelector(".page-web-feature-grid-list") as HTMLElement | null;
  }

  function findFeatureGridItemUnderPoint(
    block: HTMLElement,
    clientX: number,
    clientY: number,
  ): HTMLElement | null {
    const list = getFeatureGridListFromBlock(block);
    if (!list) return null;
    const doc = list.ownerDocument ?? document;
    for (const node of doc.elementsFromPoint(clientX, clientY)) {
      if (!(node instanceof Element)) continue;
      const item = node.closest(".page-web-feature-grid-item") as HTMLElement | null;
      if (item && list.contains(item)) return item;
    }
    const items = Array.from(list.querySelectorAll(":scope > .page-web-feature-grid-item")).filter(
      (n): n is HTMLElement => n instanceof HTMLElement,
    );
    for (let i = items.length - 1; i >= 0; i -= 1) {
      const r = items[i].getBoundingClientRect();
      if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) return items[i];
    }
    const lr = list.getBoundingClientRect();
    if (clientX < lr.left || clientX > lr.right || clientY < lr.top || clientY > lr.bottom) return null;
    let best: HTMLElement | null = null;
    let bestD = Infinity;
    for (const n of items) {
      const r = n.getBoundingClientRect();
      const cx = Math.min(Math.max(clientX, r.left), r.right);
      const cy = Math.min(Math.max(clientY, r.top), r.bottom);
      const d = (clientX - cx) ** 2 + (clientY - cy) ** 2;
      if (d < bestD) {
        bestD = d;
        best = n;
      }
    }
    return best;
  }

  function isFeatureGridTextBlockShell(block: HTMLElement): boolean {
    if (block.getAttribute("data-text-block-variant") === "feature-grid") return true;
    return !!block.querySelector(":scope > .page-web-text-block-content > .page-web-feature-grid");
  }

  /** When the head stack paints above the card, `elementsFromPoint` may never list the card textarea; use geometry + DOM fallback. */
  function pickFeatureGridCardTextareaFromPoint(
    doc: Document,
    clientX: number,
    clientY: number,
    hitItem: HTMLElement,
    ed: HTMLElement,
  ): HTMLTextAreaElement | null {
    const rectContains = (el: HTMLElement, x: number, y: number) => {
      const r = el.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    };
    const body = hitItem.querySelector(":scope > .page-web-feature-grid-item-body") as HTMLElement | null;
    const title = hitItem.querySelector(":scope > .page-web-feature-grid-item-title") as HTMLElement | null;
    const descWrap = body?.querySelector(
      ":scope > .page-web-elements.page-web-elements-description",
    ) as HTMLElement | null;
    if (descWrap && rectContains(descWrap, clientX, clientY)) {
      const fromPoint = pickTextareaInSubtreeFromPoint(doc, clientX, clientY, descWrap, ed, hitItem);
      if (fromPoint) return fromPoint;
      return descWrap.querySelector(
        "textarea.page-web-elements-description-input",
      ) as HTMLTextAreaElement | null;
    }
    if (body && rectContains(body, clientX, clientY)) {
      const fromPoint = pickTextareaInSubtreeFromPoint(doc, clientX, clientY, body, ed, hitItem);
      if (fromPoint) return fromPoint;
      return (
        (body.querySelector("textarea.page-web-elements-description-input") as HTMLTextAreaElement | null) ??
        (body.querySelector("textarea") as HTMLTextAreaElement | null)
      );
    }
    const title2Wrap = title?.querySelector(
      ":scope > .page-web-elements.page-web-elements-title2",
    ) as HTMLElement | null;
    if (title2Wrap && rectContains(title2Wrap, clientX, clientY)) {
      const fromPoint = pickTextareaInSubtreeFromPoint(doc, clientX, clientY, title2Wrap, ed, hitItem);
      if (fromPoint) return fromPoint;
      return title2Wrap.querySelector(
        "textarea.page-web-elements-title2-input",
      ) as HTMLTextAreaElement | null;
    }
    if (title && rectContains(title, clientX, clientY)) {
      const fromPoint = pickTextareaInSubtreeFromPoint(doc, clientX, clientY, title, ed, hitItem);
      if (fromPoint) return fromPoint;
      return (
        (title.querySelector("textarea.page-web-elements-title2-input") as HTMLTextAreaElement | null) ??
        (title.querySelector("textarea") as HTMLTextAreaElement | null)
      );
    }
    const any = pickTextareaInSubtreeFromPoint(doc, clientX, clientY, hitItem, ed, hitItem);
    if (any) return any;
    return (
      (hitItem.querySelector(
        ".page-web-feature-grid-item-body textarea.page-web-elements-description-input",
      ) as HTMLTextAreaElement | null) ?? (hitItem.querySelector("textarea") as HTMLTextAreaElement | null)
    );
  }

  /**
   * Runs in capture phase before default focus on textarea: event target can be the head field while the
   * pointer is over a card. Do not wrap in `withPreservedEditorScroll` here — restoring scroll after the head
   * textarea loses focus fights layout height changes and feels like a jump upward.
   */
  function tryFixFeatureGridCardMousedown(
    e: React.MouseEvent,
    t: Element | null,
    ed: HTMLElement | null,
  ): boolean {
    if (!ed || !t || !ed.contains(t)) return false;
    const block = t.closest(".page-web-text-block") as HTMLElement | null;
    if (!block || !ed.contains(block) || !isFeatureGridTextBlockShell(block)) return false;
    if (t.closest(".page-web-text-block-toolbar")) return false;
    if (
      t.closest(
        "a.page-web-feature-grid-link, a.page-web-elements-cta-button, button, [role='button']",
      )
    ) {
      return false;
    }
    const hitItem = findFeatureGridItemUnderPoint(block, e.clientX, e.clientY);
    if (!hitItem) return false;
    const doc = ed.ownerDocument ?? document;
    const taPick = pickFeatureGridCardTextareaFromPoint(doc, e.clientX, e.clientY, hitItem, ed);
    if (!taPick) return false;
    const taFromTarget = t.closest?.("textarea") as HTMLTextAreaElement | null;
    if (taFromTarget && hitItem.contains(taFromTarget) && taPick === taFromTarget) {
      e.preventDefault();
      taFromTarget.focus({ preventScroll: true });
      setTimeout(() => updateToolbarState(), 0);
      return true;
    }
    e.preventDefault();
    taPick.focus({ preventScroll: true });
    try {
      const len = taPick.value.length;
      taPick.setSelectionRange(len, len);
    } catch {
      // ignore
    }
    setTimeout(() => updateToolbarState(), 0);
    return true;
  }

  function isWorkPricingTextBlockShell(block: HTMLElement): boolean {
    if (block.getAttribute("data-text-block-variant") === "work-pricing") return true;
    return !!block.querySelector(":scope > .page-web-text-block-content > .page-web-work-pricing");
  }

  function getWorkPricingListUl(block: HTMLElement): HTMLUListElement | null {
    const content = block.querySelector(":scope > .page-web-text-block-content") as HTMLElement | null;
    if (!content) return null;
    const root = (content.querySelector(":scope > .page-web-work-pricing") ??
      content.querySelector(".page-web-work-pricing")) as HTMLElement | null;
    if (!root) return null;
    return root.querySelector(":scope ul.wrf") as HTMLUListElement | null;
  }

  /**
   * Resolves which checklist row the pointer belongs to: paint stack first (overlapping title fields),
   * then li bounds, then nearest li when the click lands in ul padding / grid gaps.
   */
  function resolveWorkPricingListItemHit(
    doc: Document,
    ed: HTMLElement,
    block: HTMLElement,
    clientX: number,
    clientY: number,
  ): HTMLElement | null {
    const ul = getWorkPricingListUl(block);
    if (!ul || !ed.contains(ul)) return null;
    const lis = Array.from(ul.children).filter((c): c is HTMLElement => c.tagName === "LI");

    for (const node of doc.elementsFromPoint(clientX, clientY)) {
      if (!(node instanceof Element) || !ed.contains(node)) continue;
      const li = node.closest("li");
      if (li && li.parentElement === ul) return li as HTMLElement;
    }

    for (let i = lis.length - 1; i >= 0; i -= 1) {
      const n = lis[i];
      const r = n.getBoundingClientRect();
      if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) return n;
    }

    const ur = ul.getBoundingClientRect();
    if (clientX < ur.left || clientX > ur.right || clientY < ur.top || clientY > ur.bottom) return null;
    let best: HTMLElement | null = null;
    let bestD = Infinity;
    for (const n of lis) {
      const r = n.getBoundingClientRect();
      const cx = Math.min(Math.max(clientX, r.left), r.right);
      const cy = Math.min(Math.max(clientY, r.top), r.bottom);
      const d = (clientX - cx) ** 2 + (clientY - cy) ** 2;
      if (d < bestD) {
        bestD = d;
        best = n;
      }
    }
    return best;
  }

  function pickWorkPricingListItemTextareaFromPoint(
    doc: Document,
    clientX: number,
    clientY: number,
    hitLi: HTMLElement,
    ed: HTMLElement,
  ): HTMLTextAreaElement | null {
    const fromPoint = pickTextareaInSubtreeFromPoint(doc, clientX, clientY, hitLi, ed);
    if (fromPoint) return fromPoint;
    return (
      (hitLi.querySelector("textarea.page-web-elements-description-input") as HTMLTextAreaElement | null) ??
      (hitLi.querySelector("textarea") as HTMLTextAreaElement | null)
    );
  }

  function tryFixWorkPricingMousedown(
    e: React.MouseEvent,
    t: Element | null,
    ed: HTMLElement | null,
  ): boolean {
    if (!ed || !t || !ed.contains(t)) return false;
    const block = t.closest(".page-web-text-block") as HTMLElement | null;
    if (!block || !ed.contains(block) || !isWorkPricingTextBlockShell(block)) return false;
    if (t.closest(".page-web-text-block-toolbar")) return false;
    if (
      t.closest(
        "a.page-web-elements-cta-button, a.page-web-elements-cta-button-secondary, span.page-web-elements-cta-button, span.page-web-elements-cta-button-secondary, button, [role='button'], [data-work-pricing-items-action]",
      )
    ) {
      return false;
    }
    const content = block.querySelector(":scope > .page-web-text-block-content") as HTMLElement | null;
    const wp = (content?.querySelector(":scope > .page-web-work-pricing") ??
      content?.querySelector(".page-web-work-pricing")) as HTMLElement | null;
    if (!wp) return false;

    const doc = ed.ownerDocument ?? document;
    let taPick: HTMLTextAreaElement | null = null;
    let hitLi: HTMLElement | null = null;
    const ul = getWorkPricingListUl(block);
    if (ul) {
      hitLi = resolveWorkPricingListItemHit(doc, ed, block, e.clientX, e.clientY);
      if (hitLi) {
        taPick = pickWorkPricingListItemTextareaFromPoint(doc, e.clientX, e.clientY, hitLi, ed);
      }
    }
    if (!taPick) {
      taPick = pickTextareaInSubtreeFromPoint(doc, e.clientX, e.clientY, wp, ed);
    }
    if (!taPick) return false;

    const taFromTarget = t.closest?.("textarea") as HTMLTextAreaElement | null;
    if (taFromTarget && taPick === taFromTarget) {
      if (editorLayoutDebugOn()) {
        const sc = editorScrollRef.current;
        logPageEditorLayout("workPricingMousedown:direct-hit-no-intercept", {
          client: { x: e.clientX, y: e.clientY },
          ta: summarizeLayoutElement(taPick),
          hitLi: summarizeLayoutElement(hitLi),
          ...layoutScrollSnapshot(sc, taPick),
        });
      }
      return false;
    }
    if (editorLayoutDebugOn()) {
      const sc = editorScrollRef.current;
      logPageEditorLayout("workPricingMousedown:redirect-focus", {
        client: { x: e.clientX, y: e.clientY },
        from: summarizeLayoutElement(taFromTarget),
        to: summarizeLayoutElement(taPick),
        hitLi: summarizeLayoutElement(hitLi),
        ...layoutScrollSnapshot(sc, taPick),
      });
    }
    e.preventDefault();
    taPick.focus({ preventScroll: true });
    try {
      const len = taPick.value.length;
      taPick.setSelectionRange(len, len);
    } catch {
      // ignore
    }
    setTimeout(() => updateToolbarState(), 0);
    return true;
  }

  function handleTextBlockEditorMouseDown(e: React.MouseEvent) {
    const rawTarget = e.target as EventTarget | null;
    const target = (rawTarget instanceof Element
      ? rawTarget
      : (rawTarget as Node | null)?.parentElement ?? null) as HTMLElement | null;
    if (!target) return;
    const block = target.closest?.(".page-web-text-block") as HTMLElement | null;
    const ed = editorRef.current;
    if (!block || !ed?.contains(block)) return;
    const doc = ed.ownerDocument ?? document;
    if (target.closest?.(".page-web-text-block-toolbar")) {
      handleTextBlockToolbarMouseDown(e);
      return;
    }

    if (isWorkPricingTextBlockShell(block)) {
      const content = block.querySelector(":scope > .page-web-text-block-content") as HTMLElement | null;
      const wp = (content?.querySelector(":scope > .page-web-work-pricing") ??
        content?.querySelector(".page-web-work-pricing")) as HTMLElement | null;
      const wpCtaBtn = target.closest(CTA_LINK_MODAL_BUTTON_SELECTOR) as HTMLElement | null;
      if (wp && wpCtaBtn && wp.contains(wpCtaBtn)) {
        e.preventDefault();
        e.stopPropagation();
        openCtaButtonLinkModal(wpCtaBtn);
        return;
      }
    }

    const cardItem = target.closest?.(".page-web-feature-grid-item") as HTMLElement | null;
    if (cardItem && block.contains(cardItem) && ed.contains(cardItem)) {
      const focusCardTextarea = (ta: HTMLTextAreaElement, moveCaretToEnd = false) => {
        e.preventDefault();
        ta.focus({ preventScroll: true });
        if (moveCaretToEnd) {
          try {
            const len = ta.value.length;
            ta.setSelectionRange(len, len);
          } catch {
            // ignore
          }
        }
        setTimeout(() => updateToolbarState(), 0);
      };
      const clickedTa = target.closest("textarea");
      if (clickedTa instanceof HTMLTextAreaElement && cardItem.contains(clickedTa)) {
        e.preventDefault();
        clickedTa.focus({ preventScroll: true });
        setTimeout(() => updateToolbarState(), 0);
        return;
      }
      const descWrap = target.closest(
        ".page-web-feature-grid-item-body .page-web-elements.page-web-elements-description",
      ) as HTMLElement | null;
      if (descWrap && cardItem.contains(descWrap)) {
        const ta = descWrap.querySelector(
          "textarea.page-web-elements-description-input",
        ) as HTMLTextAreaElement | null;
        if (ta) {
          focusCardTextarea(ta, true);
          return;
        }
      }
      const title2Wrap = target.closest(
        ".page-web-feature-grid-item-title .page-web-elements.page-web-elements-title2",
      ) as HTMLElement | null;
      if (title2Wrap && cardItem.contains(title2Wrap)) {
        const ta = title2Wrap.querySelector(
          "textarea.page-web-elements-title2-input",
        ) as HTMLTextAreaElement | null;
        if (ta) {
          focusCardTextarea(ta, true);
          return;
        }
      }
    }

    const head = target.closest?.(".page-web-feature-grid-head") as HTMLElement | null;
    if (head && block.contains(head) && ed.contains(head)) {
      const clickedTa = target.closest?.("textarea");
      if (!(clickedTa instanceof HTMLTextAreaElement) || !head.contains(clickedTa)) {
        const stack = doc.elementsFromPoint(e.clientX, e.clientY);
        for (const node of stack) {
          if (!(node instanceof HTMLTextAreaElement)) continue;
          if (!head.contains(node) || !block.contains(node)) continue;
          withPreservedEditorScroll(() => {
            node.focus({ preventScroll: true });
            const len = node.value.length;
            try {
              node.setSelectionRange(len, len);
            } catch {
              // ignore
            }
          });
          setTimeout(() => updateToolbarState(), 0);
          return;
        }
      }
    }
    setTimeout(() => updateToolbarState(), 0);
  }

  function handleArticleTextEditorMouseDown(e: React.MouseEvent) {
    const rawTarget = e.target as EventTarget | null;
    const target = (rawTarget instanceof Element
      ? rawTarget
      : (rawTarget as Node | null)?.parentElement ?? null) as HTMLElement | null;
    if (!target) return;
    const block = target.closest?.(".page-web-article-text") as HTMLElement | null;
    const ed = editorRef.current;
    if (!block || !ed?.contains(block)) return;
    if (target.closest?.(".page-web-article-text-toolbar")) {
      handleArticleTextToolbarMouseDown(e);
      return;
    }
    setTimeout(() => updateToolbarState(), 0);
  }

  function handleAccordionEditorMouseDown(e: React.MouseEvent) {
    const rawTarget = e.target as EventTarget | null;
    const target = (rawTarget instanceof Element
      ? rawTarget
      : (rawTarget as Node | null)?.parentElement ?? null) as HTMLElement | null;
    if (!target) return;
    const block = target.closest?.(".page-web-accordion") as HTMLElement | null;
    const ed = editorRef.current;
    if (!block || !ed?.contains(block)) return;
    if (target.closest?.(".page-web-accordion-toolbar")) {
      handleAccordionToolbarMouseDown(e);
      return;
    }
    if (target.closest("textarea") && target.closest(".page-web-accordion-trigger")) {
      e.preventDefault();
      setTimeout(() => updateToolbarState(), 0);
      return;
    }
    if (handleWebAccordionFaqEditorPointer(target, {})) {
      e.preventDefault();
      e.stopPropagation();
    }
    setTimeout(() => updateToolbarState(), 0);
  }

  function handleTextBlockV2EditorMouseDown(e: React.MouseEvent) {
    const rawTarget = e.target as EventTarget | null;
    const target = (rawTarget instanceof Element
      ? rawTarget
      : (rawTarget as Node | null)?.parentElement ?? null) as HTMLElement | null;
    if (!target) return;
    const block = target.closest?.(".page-web-text-block-v2") as HTMLElement | null;
    const ed = editorRef.current;
    if (!block || !ed?.contains(block)) return;
    if (target.closest?.(".page-web-text-block-v2-toolbar")) {
      handleTextBlockV2ToolbarMouseDown(e);
      return;
    }
    const v2CtaBtn = target.closest(CTA_LINK_MODAL_BUTTON_SELECTOR) as HTMLElement | null;
    if (v2CtaBtn && block.contains(v2CtaBtn)) {
      e.preventDefault();
      e.stopPropagation();
      openCtaButtonLinkModal(v2CtaBtn);
      return;
    }
    const actionsOuter = target.closest?.(".page-web-elements-actions") as HTMLElement | null;
    if (actionsOuter && block.contains(actionsOuter) && ed) {
      e.preventDefault();
      window.getSelection()?.removeAllRanges();
      ensureWebElementsActionsCluster(actionsOuter);
      const cluster = actionsOuter.querySelector(
        ":scope > .page-web-elements-actions-cluster",
      ) as HTMLElement | null;
      const focusEl = cluster ?? actionsOuter;
      clearPageEditorFocusTargets(ed);
      selectedWebElementsActionsRef.current = focusEl;
      focusEl.focus({ preventScroll: true });
      focusEl.setAttribute(PAGE_EDITOR_FOCUS_TARGET_ATTR, "1");
      setTimeout(() => updateToolbarState(), 0);
      return;
    }
    setTimeout(() => updateToolbarState(), 0);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    const el = editorRef.current;
    if (!el) return;
    const kdTarget = e.target instanceof HTMLElement ? e.target : null;
    const ann = kdTarget?.closest?.(".page-web-elements-announcement-input") ?? null;
    if (
      ann instanceof HTMLElement &&
      ann.getAttribute("contenteditable") === "true" &&
      el.contains(ann) &&
      e.key === "Enter"
    ) {
      e.preventDefault();
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && ann.contains(sel.getRangeAt(0).commonAncestorContainer)) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode("\n"));
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      }
      syncWebTextBlockV2FieldValuesForSerialization(el);
      scheduleEditorHtmlStateSync(el.innerHTML);
      autosizeWebTextBlockV2Textareas(el);
      updateToolbarState();
      return;
    }
    if (
      isEditorNativeFormTextControl(el, e.target) ||
      isEditorNativeFormTextControl(el, typeof document !== "undefined" ? document.activeElement : null)
    ) {
      return;
    }
    if (e.key === "Backspace" || e.key === "Delete") {
      const selectedImage = selectedImageWrapperRef.current;
      if (selectedImage && el.contains(selectedImage)) {
        e.preventDefault();
        const parent = selectedImage.parentNode;
        const nextSibling = selectedImage.nextSibling;
        const prevSibling = selectedImage.previousSibling;
        selectedImage.remove();
        selectedImageWrapperRef.current = null;
        const selection = window.getSelection();
        if (selection && parent) {
          const r = document.createRange();
          const target = nextSibling ?? prevSibling;
          if (target) {
            if (target.nodeType === Node.TEXT_NODE) {
              const textNode = target as Text;
              r.setStart(textNode, textNode.textContent?.length ?? 0);
            } else {
              r.selectNodeContents(target);
              r.collapse(false);
            }
          } else {
            r.selectNodeContents(parent);
            r.collapse(false);
          }
          selection.removeAllRanges();
          selection.addRange(r);
        }
        setContentHtml(el.innerHTML);
        syncMarkerBold();
        setTimeout(() => updateToolbarState(), 0);
        return;
      }
    }
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);

    if ((e.key === "Backspace" || e.key === "Delete") && !range.collapsed && !isRangeWithinSingleEditScope(el, range)) {
      e.preventDefault();
      return;
    }

    if (e.key === "Backspace" && range.collapsed) {
      if (tryKeepEmptyTextBlockHeading(el, range)) {
        e.preventDefault();
        return;
      }
      if (tryPreventTextBlockSiblingBackspaceMerge(el, range)) {
        e.preventDefault();
        return;
      }
      if (tryPreventCoverElementBackspaceMerge(el, range)) {
        e.preventDefault();
        return;
      }
      if (tryKeepCaretInsideEmptyTextBlockContent(el, range)) {
        e.preventDefault();
        return;
      }
      if (tryHandleWebCoverBackspace(el, range)) {
        e.preventDefault();
        return;
      }
    }

    if (e.key === "Delete" && range.collapsed) {
      if (tryHandleWebCoverForwardBlock(el, range)) {
        e.preventDefault();
        return;
      }
    }

    let node: Node | null = range.startContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    const li = (node as Element)?.closest?.("li");
    const inList = li && el.contains(li);
    const emptyLi = inList && li && isListItemEmpty(li);

    if (e.key === "Enter" && inList) {
      e.preventDefault();
      if (emptyLi) {
        exitListAtEmptyLi(li!);
      } else {
        const list = li!.closest("ol, ul");
        if (!list) return;
        if (caretDebugOn()) {
          logPageEditorCaret("keydown Enter (list):before-split", {
            listTag: list.nodeName,
            liPreview: (li as HTMLElement).outerHTML?.slice(0, 160),
          });
          snapshotSelection("keydown Enter (list):before-split", el);
        }
        const range = sel.getRangeAt(0);
        const endBoundary = document.createRange();
        endBoundary.selectNodeContents(li!);
        endBoundary.collapse(false);
        const tailRange = document.createRange();
        tailRange.setStart(range.startContainer, range.startOffset);
        tailRange.setEnd(endBoundary.endContainer, endBoundary.endOffset);
        const newLi = document.createElement("li");
        newLi.appendChild(tailRange.extractContents());
        if (newLi.childNodes.length === 0) newLi.appendChild(document.createElement("br"));
        if (li!.childNodes.length === 0) li!.appendChild(document.createElement("br"));
        li!.parentNode?.insertBefore(newLi, li!.nextSibling);
        const caretId = `ec-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        newLi.setAttribute("data-editor-caret", caretId);
        pendingEditorCaretRef.current = caretId;
        if (caretDebugOn()) {
          logPageEditorCaret("keydown Enter (list):after-DOM", {
            caretId,
            newLiPreview: newLi.outerHTML?.slice(0, 200),
            prevLiPreview: (li as HTMLElement).outerHTML?.slice(0, 200),
          });
          snapshotSelection("keydown Enter (list):after-extractContents", el);
        }
        // Synchronous caret: invalid selection after extractContents + React commit often paints
        // the caret at the top of the contenteditable (above padded text) until layout runs.
        placeCaretAtLiStart(newLi, "keydown-Enter-list");
        syncMarkerBold();
        setContentHtml(el.innerHTML);
        if (caretDebugOn()) {
          snapshotSelection("keydown Enter (list):after-setContentHtml", el);
          queueMicrotask(() => snapshotSelection("keydown Enter (list):microtask-after-setState", el));
          requestAnimationFrame(() => snapshotSelection("keydown Enter (list):rAF-after-setState", el));
        }
        setTimeout(() => updateToolbarState(), 0);
      }
      return;
    }

    if (e.key === "Backspace" && inList && emptyLi) {
      e.preventDefault();
      exitListAtEmptyLi(li!);
      return;
    }

    if (e.key === "Backspace") {
      const selectedCells = Array.from(el.querySelectorAll(".page-editor-table td[data-cell-selected]")) as HTMLElement[];
      if (selectedCells.length > 0) {
        const table = selectedCells[0].closest("table.page-editor-table");
        if (table) {
          const totalCells = table.querySelectorAll("td").length;
          if (selectedCells.length === totalCells) {
            e.preventDefault();
            const placeholder = document.createElement("div");
            placeholder.innerHTML = "<br>";
            table.parentNode?.replaceChild(placeholder, table);
            const r = document.createRange();
            r.setStart(placeholder, 0);
            r.collapse(true);
            sel.removeAllRanges();
            sel.addRange(r);
            el.querySelectorAll(".page-editor-table td[data-cell-selected]").forEach((td) =>
              td.removeAttribute("data-cell-selected")
            );
            setContentHtml(el.innerHTML);
            syncMarkerBold();
            setCellMenuOpen(false);
            clearTableSelection();
            setTimeout(() => updateToolbarState(), 0);
          }
        }
      }
    }
  }

  function insertImage(src: string) {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (!sel) return;
    const range = savedRangeRef.current;
    if (range) {
      try {
        if (el.contains(range.commonAncestorContainer)) {
          sel.removeAllRanges();
          sel.addRange(range);
        }
      } catch {
        // ignore
      }
    }
    const node =
      range?.startContainer.nodeType === Node.TEXT_NODE
        ? range.startContainer.parentElement
        : (range?.startContainer as Element | null);
    const inTableCell = !!node?.closest?.("table.page-editor-table td");
    const escaped = src.replace(/"/g, "&quot;");
    const handles = ["n","s","e","w","ne","nw","se","sw"].map((h)=>`<span class="page-editor-image-resize page-editor-image-resize-${h}" data-resize="${h}" aria-label="Изменить размер"></span>`).join("");
    const imageStyle = inTableCell
      ? "width:auto;max-width:100%;height:auto;display:block"
      : "width:300px;height:auto;display:block";
    const html = `<span class="page-editor-image-wrapper" contenteditable="false"><img class="page-editor-image" src="${escaped}" alt="" style="${imageStyle}">${handles}</span>`;
    document.execCommand("insertHTML", false, html);
    normalizeListContent();
    normalizeTableCells();
    normalizeImages();
    setContentHtml(el.innerHTML);
    syncMarkerBold();
    el.dispatchEvent(new Event("input", { bubbles: true }));
    setTimeout(updateToolbarState, 0);
  }

  function clearCoverBackground(cover: HTMLElement) {
    cover.classList.remove("page-web-cover-has-bg");
    cover.style.background = "";
    cover.removeAttribute("data-cover-bg-x");
    cover.removeAttribute("data-cover-bg-y");
    cover.style.removeProperty("--cover-bg-image");
    cover.style.removeProperty("--cover-bg-pos");
  }

  function restoreCoverBgRevert(cover: HTMLElement, revert: CoverBgAdjustRevertSnapshot) {
    if (!revert.hasBgClass && !revert.background) {
      clearCoverBackground(cover);
      return;
    }
    cover.style.background = revert.background;
    if (revert.hasBgClass) cover.classList.add("page-web-cover-has-bg");
    else cover.classList.remove("page-web-cover-has-bg");
    if (revert.dataX != null) cover.setAttribute("data-cover-bg-x", revert.dataX);
    else cover.removeAttribute("data-cover-bg-x");
    if (revert.dataY != null) cover.setAttribute("data-cover-bg-y", revert.dataY);
    else cover.removeAttribute("data-cover-bg-y");
    if (revert.coverBgImageVar) cover.style.setProperty("--cover-bg-image", revert.coverBgImageVar);
    else cover.style.removeProperty("--cover-bg-image");
    if (revert.coverBgPosVar) cover.style.setProperty("--cover-bg-pos", revert.coverBgPosVar);
    else cover.style.removeProperty("--cover-bg-pos");
  }

  function applyCoverBackgroundImage(cover: HTMLElement, dataUrl: string, posX = 50, posY = 50) {
    cover.classList.add("page-web-cover-has-bg");
    const safe = dataUrl.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const x = clampPercent(posX);
    const y = clampPercent(posY);
    cover.style.background = `url("${safe}") ${x}% ${y}% / cover no-repeat`;
    cover.style.setProperty("--cover-bg-image", `url("${safe}")`);
    cover.style.setProperty("--cover-bg-pos", `${x}% ${y}%`);
    cover.setAttribute("data-cover-bg-x", String(x));
    cover.setAttribute("data-cover-bg-y", String(y));
  }

  const updateCoverBgAdjustPos = useCallback((x: number, y: number) => {
    setCoverBgAdjustSession((s) => (s ? { ...s, posX: x, posY: y } : null));
  }, []);

  const handleCoverBgAdjustCommit = useCallback(() => {
    setCoverBgAdjustSession((s) => {
      if (!s) return null;
      coverBgAdjustingRef.current = false;
      const ed = editorRef.current;
      if (ed?.contains(s.mount)) {
        applyCoverBackgroundImage(s.mount, s.imageSrc, s.posX, s.posY);
        setTimeout(() => {
          if (editorRef.current) setContentHtml(editorRef.current.innerHTML);
          updateToolbarState();
        }, 0);
      }
      return null;
    });
  }, []);

  const handleCoverBgAdjustCancel = useCallback(() => {
    setCoverBgAdjustSession((s) => {
      if (!s) return null;
      coverBgAdjustingRef.current = false;
      const ed = editorRef.current;
      if (ed?.contains(s.mount)) {
        restoreCoverBgRevert(s.mount, s.revert);
        setTimeout(() => {
          if (editorRef.current) setContentHtml(editorRef.current.innerHTML);
          updateToolbarState();
        }, 0);
      }
      return null;
    });
  }, []);

  function closeCoverToolbarMenus(toolbar: HTMLElement) {
    logWebMenuDebug("close-cover:start", toolbar);
    toolbar.querySelectorAll('.page-web-cover-menu-sub[data-submenu-open="1"]').forEach((s) => {
      (s as HTMLElement).removeAttribute("data-submenu-open");
    });
    toolbar.querySelectorAll(".page-web-cover-menu-sub-trigger").forEach((tr) => {
      (tr as HTMLElement).setAttribute("aria-expanded", "false");
    });
    toolbar.removeAttribute("data-menu-open");
    clearToolbarDropdownVerticalPlacement(toolbar);
    resetCoverMenuDropdownStyles(toolbar);
    logWebMenuDebug("close-cover:end", toolbar);
  }

  useEffect(() => {
    let rafId: number | null = null;
    const closeOnViewportChange = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        const ed = editorRef.current;
        if (!ed) return;
        if (WEB_MENU_DEBUG) {
          console.log("[web-menu-debug] viewport-change:close-all");
        }
        closeAllOpenWebBlockMenus(ed);
      });
    };
    window.addEventListener("scroll", closeOnViewportChange, { passive: true, capture: true });
    window.addEventListener("resize", closeOnViewportChange);
    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", closeOnViewportChange, true);
      window.removeEventListener("resize", closeOnViewportChange);
    };
  }, []);

  async function convertImageFileToWebpDataUrl(file: File): Promise<string | null> {
    const fileDataUrl = await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string) || null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
    if (!fileDataUrl) return null;

    const img = await new Promise<HTMLImageElement | null>((resolve) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = fileDataUrl;
    });
    if (!img) return fileDataUrl;

    const maxSide = 1600;
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const targetW = Math.max(1, Math.round(img.width * scale));
    const targetH = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return fileDataUrl;
    ctx.drawImage(img, 0, 0, targetW, targetH);
    const webpDataUrl = canvas.toDataURL("image/webp", 0.82);
    return webpDataUrl || fileDataUrl;
  }

  async function convertImageDataUrlToWebpDataUrl(dataUrl: string): Promise<string> {
    if (!/^data:image\//i.test(dataUrl) || /^data:image\/webp/i.test(dataUrl)) {
      return dataUrl;
    }
    const img = await new Promise<HTMLImageElement | null>((resolve) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = dataUrl;
    });
    if (!img) return dataUrl;
    const maxSide = 1600;
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const targetW = Math.max(1, Math.round(img.width * scale));
    const targetH = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, targetW, targetH);
    const webpDataUrl = canvas.toDataURL("image/webp", 0.82);
    return webpDataUrl || dataUrl;
  }

  async function normalizeHtmlInlineImagesToWebp(html: string): Promise<string> {
    const dataUrlRe =
      /data:image\/(?:png|jpeg|jpg|bmp|gif|tiff|webp);base64,[A-Za-z0-9+/=]+/gi;
    const allMatches = Array.from(html.matchAll(dataUrlRe)).map((m) => m[0]);
    if (allMatches.length === 0) return html;

    const uniqueMatches = Array.from(new Set(allMatches));
    let nextHtml = html;
    let changed = false;
    for (const src of uniqueMatches) {
      if (!src || /^data:image\/webp/i.test(src)) continue;
      const webp = await convertImageDataUrlToWebpDataUrl(src);
      if (webp && webp !== src) {
        nextHtml = nextHtml.split(src).join(webp);
        changed = true;
      }
    }
    return changed ? nextHtml : html;
  }

  async function processAndInsertImage(file: File) {
    const webpDataUrl = await convertImageFileToWebpDataUrl(file);
    if (webpDataUrl) insertImage(webpDataUrl);
  }

  function handleImageInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    void processAndInsertImage(file);
  }

  function handleWebShellImageInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const pending = webShellImageUploadPendingRef.current;
    webShellImageUploadPendingRef.current = null;
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/"));
    e.target.value = "";
    if (files.length === 0 || !pending) return;
    const ed = editorRef.current;
    if (!ed) return;

    if (pending.kind === "cover") {
      const cover = pending.cover;
      if (!ed.contains(cover)) return;
      void (async () => {
        const file = files[0];
        const webp = await convertImageFileToWebpDataUrl(file);
        if (!webp) return;
        // Prevent a transient editor resync from dropping freshly applied cover background.
        coverBgAdjustingRef.current = true;
        applyCoverBackgroundImage(cover, webp, 50, 50);
        const tb = cover.querySelector(".page-web-cover-toolbar") as HTMLElement | null;
        if (tb) closeCoverToolbarMenus(tb);
        setContentHtml(ed.innerHTML);
        setTimeout(() => {
          coverBgAdjustingRef.current = false;
        }, 0);
        setTimeout(() => updateToolbarState(), 0);
      })();
      return;
    }

    if (pending.kind === "feature-grid-image") {
      const imageBox = pending.imageBox;
      if (!ed.contains(imageBox)) return;
      void (async () => {
        const file = files[0];
        const webp = await convertImageFileToWebpDataUrl(file);
        if (!webp) return;
        imageBox.style.backgroundImage = `url("${webp.replace(/"/g, '\\"')}")`;
        imageBox.style.backgroundSize = "cover";
        imageBox.style.backgroundPosition = "center";
        imageBox.style.backgroundRepeat = "no-repeat";
        imageBox.setAttribute("data-feature-grid-image-has-src", "1");
        const gridRoot = imageBox.closest(".page-web-feature-grid") as HTMLElement | null;
        if (gridRoot) ensureFeatureGridImageDisplay(gridRoot);
        setContentHtml(ed.innerHTML);
        setTimeout(() => updateToolbarState(), 0);
      })();
      return;
    }

    const { carousel, slide } = pending;
    if (!ed.contains(carousel) || !ed.contains(slide)) return;
    void (async () => {
      const viewport = carousel.querySelector(".page-web-carousel-viewport") as HTMLElement | null;
      if (!viewport) return;
      const strip = ensureWebCarouselStripInViewport(viewport);
      const makeSlide = (n: number): HTMLElement => {
        const wrap = document.createElement("div");
        wrap.innerHTML =
          '<div class="page-web-carousel-slide" contenteditable="false">' +
          '<div class="page-web-carousel-slide-inner" contenteditable="false">' +
          '<div class="page-web-carousel-placeholder" contenteditable="false">Слайд ' +
          n +
          "</div></div></div>";
        return wrap.firstElementChild as HTMLElement;
      };
      const putImage = (targetSlide: HTMLElement, dataUrl: string) => {
        const inner = targetSlide.querySelector(".page-web-carousel-slide-inner") as HTMLElement | null;
        if (!inner) return;
        inner.innerHTML = "";
        const img = document.createElement("img");
        img.className = "page-web-carousel-img";
        img.setAttribute("src", dataUrl);
        img.setAttribute("alt", "");
        img.setAttribute("contenteditable", "false");
        img.setAttribute("draggable", "false");
        inner.appendChild(img);
      };

      const slides = Array.from(strip.querySelectorAll(".page-web-carousel-slide")) as HTMLElement[];
      let cursor = Math.max(0, slides.indexOf(slide));
      for (const file of files) {
        const webp = await convertImageFileToWebpDataUrl(file);
        if (!webp) continue;
        let target = slides[cursor];
        if (!target) {
          const n = slides.length + 1;
          target = makeSlide(n);
          strip.appendChild(target);
          slides.push(target);
        }
        putImage(target, webp);
        cursor += 1;
      }

      if (cursor > slides.length) cursor = slides.length;
      webCarouselScrollAlignPendingRef.current = true;
      const tb = carousel.querySelector(".page-web-carousel-toolbar") as HTMLElement | null;
      if (tb) closeCarouselToolbarMenus(tb);
      setContentHtml(ed.innerHTML);
      setTimeout(() => updateToolbarState(), 0);
    })();
  }

  function handlePaste(e: React.ClipboardEvent) {
    const el = editorRef.current;
    if (!el) return;
    const rawTarget = e.nativeEvent.target ?? e.target;
    const ann =
      rawTarget instanceof Node
        ? (rawTarget instanceof Element ? rawTarget : (rawTarget as Text).parentElement)?.closest?.(
            ".page-web-elements-announcement-input",
          )
        : null;
    if (
      ann instanceof HTMLElement &&
      ann.getAttribute("contenteditable") === "true" &&
      el.contains(ann)
    ) {
      e.preventDefault();
      let text = e.clipboardData?.getData("text/plain") || "";
      text = text
        .replace(/\u00A0/g, " ")
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .replace(/\u2028|\u2029/g, "\n");
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      if (!ann.contains(range.commonAncestorContainer)) return;
      range.deleteContents();
      range.insertNode(document.createTextNode(text));
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
      syncWebTextBlockV2FieldValuesForSerialization(el);
      scheduleEditorHtmlStateSync(el.innerHTML);
      autosizeWebTextBlockV2Textareas(el);
      updateToolbarState();
      return;
    }
    if (isEditorNativeFormTextControl(el, rawTarget)) return;
    const selPaste = window.getSelection();
    const currentPasteRangeRaw =
      selPaste && selPaste.rangeCount > 0 ? selPaste.getRangeAt(0).cloneRange() : null;
    const fallbackRangeRaw = savedRangeRef.current ? savedRangeRef.current.cloneRange() : null;
    const currentPasteRange = currentPasteRangeRaw ?? fallbackRangeRaw;
    if (selPaste && selPaste.rangeCount > 0 && selectionInsideNonEditableWebShell(el, selPaste.getRangeAt(0))) {
      e.preventDefault();
      return;
    }
    if (selPaste && selPaste.rangeCount > 0 && !isRangeInsideStructuredTextBlock(el, selPaste.getRangeAt(0))) {
      e.preventDefault();
      return;
    }
    const items = e.clipboardData?.items;
    if (items) {
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            void processAndInsertImage(file);
          }
          return;
        }
      }
    }
    e.preventDefault();
    const plainFromClipboard = e.clipboardData.getData("text/plain") || "";
    const htmlFromClipboard = e.clipboardData.getData("text/html") || "";
    let text = plainFromClipboard;
    if (!text && htmlFromClipboard) {
      const tmp = document.createElement("div");
      tmp.innerHTML = htmlFromClipboard;
      text = tmp.innerText || tmp.textContent || "";
    }
    // Hard sanitize pasted payload: keep only printable text and line breaks.
    text = text
      .replace(/\u00A0/g, " ")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/\u2028|\u2029/g, "\n");

    const selection = window.getSelection();
    if (!selection) return;
    if (
      currentPasteRange &&
      el.contains(currentPasteRange.commonAncestorContainer) &&
      isRangeInsideStructuredTextBlock(el, currentPasteRange) &&
      isRangeWithinSingleEditScope(el, currentPasteRange)
    ) {
      try {
        const scope = getRangeEditScope(el, currentPasteRange, true);
        const safeRange = scope
          ? clampRangeInsideScopeContents(currentPasteRange, scope)
          : currentPasteRange;
        selection.removeAllRanges();
        selection.addRange(safeRange);
      } catch {
        // ignore
      }
    } else {
      // Never paste into a stale saved range: this can move insertion into another block.
      return;
    }
    if (selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    range.deleteContents();

    const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const lines = normalized.split("\n");
    const fragment = document.createDocumentFragment();
    let lastInserted: Node | null = null;
    lines.forEach((line, idx) => {
      if (line.length > 0) {
        const textNode = document.createTextNode(line);
        fragment.appendChild(textNode);
        lastInserted = textNode;
      }
      if (idx < lines.length - 1) {
        const br = document.createElement("br");
        fragment.appendChild(br);
        lastInserted = br;
      }
    });
    if (!lastInserted) {
      lastInserted = document.createElement("br");
      fragment.appendChild(lastInserted);
    }
    range.insertNode(fragment);
    selection.removeAllRanges();
    const caretRange = document.createRange();
    caretRange.setStartAfter(lastInserted);
    caretRange.collapse(true);
    selection.addRange(caretRange);
    savedRangeRef.current = caretRange.cloneRange();

    normalizeListContent();
    normalizeOlStartNumbers();
    normalizeTableCells();
    setContentHtml(el.innerHTML);
    syncMarkerBold();
    el.dispatchEvent(new Event("input", { bubbles: true }));
    setTimeout(updateToolbarState, 0);
  }

  async function handleSave() {
    if (!title.trim() || !slug.trim()) {
      setError("Введите название и служебный адрес");
      return;
    }

    try {
      flushScheduledEditorHtmlStateSync();
      if (editorRef.current) syncWebTextBlockV2FieldValuesForSerialization(editorRef.current, { flushAnnouncementText: true });
      const liveHtml = editorRef.current?.innerHTML ?? contentHtml;
      let liveHtmlWebp = liveHtml;
      try {
        liveHtmlWebp = await normalizeHtmlInlineImagesToWebp(liveHtml);
        if (liveHtmlWebp !== liveHtml) {
          setContentHtml(liveHtmlWebp);
        }
      } catch (webpErr) {
        console.warn("[page-editor] normalizeHtmlInlineImagesToWebp on save failed, sending raw HTML", webpErr);
      }
      const textPayload = stripCoverEditorChromeFromHtml(
        rewriteCoverButtonSpansToAnchorsForPublish(liveHtmlWebp),
      );
      const putBody = {
        title: title.trim(),
        slug: slug.trim(),
        text: textPayload,
      };
      const putTimeoutMs = computeApiPayloadTimeoutMs(JSON.stringify(putBody).length);
      setSaving(true);
      setError(null);
      setSuccess(null);
      await apiPut(`/api/pages/${pageId}`, putBody, putTimeoutMs);
      setSuccess("Изменения сохранены");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("[page-editor] save failed", err);
      setError(formatApiErrorForUi(err, "Не удалось сохранить страницу"));
    } finally {
      setSaving(false);
    }
  }


  useLayoutEffect(() => {
    webCoverNativeInputRef.current.beforeInput = (e: InputEvent) => {
      const inputType =
        typeof e.inputType === "string" && e.inputType.trim() !== ""
          ? e.inputType
          : typeof e.data === "string"
            ? "insertText"
            : "";
      const ed = editorRef.current;
      if (!ed) return;
      if (
        isEditorNativeFormTextControl(ed, e.target) ||
        isEditorNativeFormTextControl(ed, typeof document !== "undefined" ? document.activeElement : null)
      ) {
        return;
      }
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      if (!ed.contains(range.commonAncestorContainer)) return;
      if (inputType.startsWith("insert") && !isRangeInsideStructuredTextBlock(ed, range)) {
        e.preventDefault();
        return;
      }
      if (tryPreventWebCoverNonDeleteInput(ed, range, inputType)) {
        e.preventDefault();
        return;
      }
      if (inputType === "deleteContentBackward" && range.collapsed) {
        if (tryHandleWebCoverBackspace(ed, range)) e.preventDefault();
        return;
      }
      if (inputType === "deleteContentForward" && range.collapsed) {
        if (tryHandleWebCoverForwardBlock(ed, range)) e.preventDefault();
      }
    };
    webCoverNativeInputRef.current.keyDown = (e: KeyboardEvent) => {
      if (e.key !== "Backspace" && e.key !== "Delete") return;
      const ed = editorRef.current;
      if (!ed) return;
      if (
        isEditorNativeFormTextControl(ed, e.target) ||
        isEditorNativeFormTextControl(ed, typeof document !== "undefined" ? document.activeElement : null)
      ) {
        return;
      }
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      if (!range.collapsed) return;
      if (!ed.contains(range.commonAncestorContainer)) return;
      if (e.key === "Backspace") {
        if (tryKeepEmptyTextBlockHeading(ed, range)) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        if (tryPreventTextBlockSiblingBackspaceMerge(ed, range)) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        if (tryPreventCoverElementBackspaceMerge(ed, range)) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        if (tryKeepCaretInsideEmptyTextBlockContent(ed, range)) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        if (tryHandleWebCoverBackspace(ed, range)) {
          e.preventDefault();
          e.stopPropagation();
        }
        return;
      }
      if (tryHandleWebCoverForwardBlock(ed, range)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
  });

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const onBeforeInput = (e: Event) => webCoverNativeInputRef.current.beforeInput(e as InputEvent);
    const onKeyDown = (e: Event) => webCoverNativeInputRef.current.keyDown(e as KeyboardEvent);
    el.addEventListener("beforeinput", onBeforeInput, { capture: true });
    el.addEventListener("keydown", onKeyDown, { capture: true });
    return () => {
      el.removeEventListener("beforeinput", onBeforeInput, { capture: true });
      el.removeEventListener("keydown", onKeyDown, { capture: true });
    };
  }, []);

  const addElementDialogItems = WEB_PAGE_ELEMENTS.filter((item) => item.tab === addElementDialogTab);

  return (
    <div className="min-h-screen bg-white">
      {success && (
        <div
          className="fixed right-6 top-[4.5rem] z-50 flex items-center gap-2 rounded border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 shadow-md"
          role="status"
          aria-live="polite"
        >
          <span>{success}</span>
          <button
            type="button"
            onClick={() => setSuccess(null)}
            className="-mr-1 rounded p-0.5 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-900"
            aria-label="Закрыть"
          >
            <XMarkIcon className="h-3 w-3 [stroke-width:2.2]" />
          </button>
        </div>
      )}
      {addElementDialogOpen && (
        <div
          className="fixed inset-0 z-[20020] flex items-center justify-center bg-slate-900/40 p-3 backdrop-blur-sm"
          onClick={() => closeAddElementDialog()}
          role="dialog"
          aria-modal="true"
          aria-label="Добавить блок"
        >
          <div
            className="relative w-full max-w-xl rounded-2xl bg-white p-4 shadow-xl ring-1 ring-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded text-slate-500 transition-colors hover:bg-slate-100 hover:text-[#496db3]"
              onClick={() => closeAddElementDialog()}
              aria-label="Закрыть"
            >
              <XMarkIcon className="h-4 w-4 [stroke-width:2.2]" />
            </button>
            <div className="mb-3 flex items-center gap-2">
              <span className="h-px flex-1 bg-slate-200" aria-hidden="true" />
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
                onMouseDown={(e) => e.preventDefault()}
              >
                <PlusIcon className="h-3.5 w-3.5" />
                Добавить
              </button>
              <span className="h-px flex-1 bg-slate-200" aria-hidden="true" />
            </div>
            <div className="mb-3 inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  addElementDialogTab === "media"
                    ? "bg-white text-[#496db3] shadow-sm ring-1 ring-[#496db3]/20"
                    : "text-slate-600 hover:text-slate-800"
                }`}
                onClick={() => setAddElementDialogTab("media")}
              >
                Медиа
              </button>
              <button
                type="button"
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  addElementDialogTab === "text"
                    ? "bg-white text-[#496db3] shadow-sm ring-1 ring-[#496db3]/20"
                    : "text-slate-600 hover:text-slate-800"
                }`}
                onClick={() => setAddElementDialogTab("text")}
              >
                Текст
              </button>
              <button
                type="button"
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  addElementDialogTab === "decor"
                    ? "bg-white text-[#496db3] shadow-sm ring-1 ring-[#496db3]/20"
                    : "text-slate-600 hover:text-slate-800"
                }`}
                onClick={() => setAddElementDialogTab("decor")}
              >
                Декоративный элемент
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {addElementDialogItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="flex w-full flex-col items-start gap-0.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left transition-colors hover:border-[#496db3]/40 hover:bg-slate-50"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertWebPageElement(item.id)}
                >
                  <span className="text-xs font-semibold text-slate-900">{item.label}</span>
                  <span className="text-[11px] text-slate-500">{item.description}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {tableWidthModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-3 backdrop-blur-sm"
          onClick={() => setTableWidthModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Ширина столбцов"
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl ring-1 ring-slate-200 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <span
              className="absolute right-2 top-2 inline-flex h-5 w-5 cursor-pointer items-center justify-center text-slate-500 transition-colors hover:text-[#496db3]"
              onClick={() => setTableWidthModalOpen(false)}
              role="button"
              aria-label="Закрыть"
            >
              <XMarkIcon className="h-4 w-4 [stroke-width:2.2]" />
            </span>
            <div className="mt-4 grid grid-cols-1 gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-semibold text-slate-700">Ширина столбцов</span>
                <input
                  ref={tableWidthModalInputRef}
                  value={tableWidthModalValue}
                  onChange={(e) => setTableWidthModalValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (tableWidthModalValue.trim()) {
                        applyTableWidth(tableWidthModalValue.trim());
                        setTableWidthModalOpen(false);
                      }
                    }
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#496db3] focus:ring-1 focus:ring-[#496db3]"
                  placeholder="Например: 150"
                />
              </label>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                onClick={() => setTableWidthModalOpen(false)}
              >
                Отмена
              </button>
              <button
                type="button"
                className="inline-flex rounded-full bg-[#496db3] px-4 py-1.5 text-xs font-medium text-white hover:brightness-105 disabled:opacity-60"
                onClick={() => {
                  if (tableWidthModalValue.trim()) {
                    applyTableWidth(tableWidthModalValue.trim());
                    setTableWidthModalOpen(false);
                  }
                }}
                disabled={!tableWidthModalValue.trim()}
              >
                Применить
              </button>
            </div>
          </div>
        </div>
      )}
      {coverButtonLinkModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-3 backdrop-blur-sm"
          onClick={() => setCoverButtonLinkModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Ссылка и название кнопки"
        >
          <div
            className="relative w-full max-w-md rounded-2xl bg-white p-4 shadow-xl ring-1 ring-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <span
              className="absolute right-2 top-2 inline-flex h-5 w-5 cursor-pointer items-center justify-center text-slate-500 transition-colors hover:text-[#496db3]"
              onClick={() => setCoverButtonLinkModalOpen(false)}
              role="button"
              aria-label="Закрыть"
            >
              <XMarkIcon className="h-4 w-4 [stroke-width:2.2]" />
            </span>
            <div className="mt-4 grid grid-cols-1 gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-semibold text-slate-700">Название кнопки</span>
                <input
                  ref={coverButtonLinkModalLabelInputRef}
                  value={coverButtonLinkModalLabelValue}
                  onChange={(e) => setCoverButtonLinkModalLabelValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      applyCoverButtonLinkAndClose();
                    }
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#496db3] focus:ring-1 focus:ring-[#496db3]"
                  placeholder="Текст на кнопке"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-semibold text-slate-700">Ссылка кнопки</span>
                <input
                  ref={coverButtonLinkModalInputRef}
                  value={coverButtonLinkModalValue}
                  onChange={(e) => setCoverButtonLinkModalValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      applyCoverButtonLinkAndClose();
                    }
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#496db3] focus:ring-1 focus:ring-[#496db3]"
                  placeholder="https://example.com, callback://open или document://0"
                />
              </label>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  className="inline-flex w-fit rounded-full border border-[#496db3]/30 bg-[#496db3]/5 px-3 py-1.5 text-xs font-semibold text-[#496db3] hover:bg-[#496db3]/10"
                  onClick={() => setCoverButtonLinkModalValue(CALLBACK_FORM_LINK)}
                >
                  Подключить форму обратной связи
                </button>
                <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-2.5">
                  <p className="text-xs font-semibold text-slate-700">Документ из «Настройки сайта»</p>
                  {ctaLinkModalDocumentsLoading ? (
                    <p className="mt-1.5 text-xs text-slate-500">Загрузка списка…</p>
                  ) : ctaLinkModalDocuments.length > 0 ? (
                    <div className="mt-1.5 flex flex-col gap-1">
                      {ctaLinkModalDocuments.map((doc, index) => {
                        const link = buildSiteDocumentLink(index);
                        const selected = parseSiteDocumentLinkIndex(coverButtonLinkModalValue) === index;
                        return (
                          <button
                            key={`${doc.name}-${index}`}
                            type="button"
                            className={`inline-flex w-full rounded-md border px-2.5 py-1.5 text-left text-xs font-medium transition ${
                              selected
                                ? "border-[#496db3]/50 bg-[#496db3]/10 text-[#496db3]"
                                : "border-slate-200 bg-white text-slate-700 hover:border-[#496db3]/35 hover:bg-slate-50"
                            }`}
                            onClick={() => setCoverButtonLinkModalValue(link)}
                          >
                            {siteDocumentDisplayName(doc.name)}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mt-1.5 text-xs text-slate-500">
                      Нет загруженных HTML-документов. Добавьте их в «Настройки сайта» → Документы.
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                onClick={() => setCoverButtonLinkModalOpen(false)}
              >
                Отмена
              </button>
              <button
                type="button"
                className="inline-flex rounded-full bg-[#496db3] px-4 py-1.5 text-xs font-medium text-white hover:brightness-105"
                onClick={applyCoverButtonLinkAndClose}
              >
                Применить
              </button>
            </div>
          </div>
        </div>
      )}
      {featureGridIconPickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-3 backdrop-blur-sm"
          onClick={closeFeatureGridIconPicker}
          role="dialog"
          aria-modal="true"
          aria-label="Выбор иконки карточки"
        >
          <div
            className="relative w-full max-w-md rounded-2xl bg-white p-4 shadow-xl ring-1 ring-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <span
              className="absolute right-2 top-2 inline-flex h-5 w-5 cursor-pointer items-center justify-center text-slate-500 transition-colors hover:text-[#496db3]"
              onClick={closeFeatureGridIconPicker}
              role="button"
              aria-label="Закрыть"
            >
              <XMarkIcon className="h-4 w-4 [stroke-width:2.2]" />
            </span>
            <div className="mt-2">
              <p className="text-sm font-semibold text-slate-800">Иконка карточки</p>
              <p className="mt-1 text-xs text-slate-500">Выберите иконку для выбранной карточки.</p>
            </div>
            <div className="mt-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Обычные</p>
              <div className="grid grid-cols-3 gap-2">
                {FEATURE_GRID_ICON_PRESETS.filter((preset) => !FEATURE_GRID_PROBLEM_ICON_IDS.has(preset.id)).map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs transition-colors ${
                      featureGridIconPickerValue === preset.id
                        ? "border-[#496db3]/50 bg-[#496db3]/10 text-[#496db3]"
                        : "border-slate-200 bg-white text-slate-700 hover:border-[#496db3]/35 hover:bg-slate-50"
                    }`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setFeatureGridIconPickerValue(preset.id)}
                  >
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#496db3]/12 text-[#496db3]">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                        <path d={preset.path} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <span>{preset.label}</span>
                  </button>
                ))}
              </div>
              <p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wide text-rose-600">Проблемы</p>
              <div className="grid grid-cols-3 gap-2">
                {FEATURE_GRID_ICON_PRESETS.filter((preset) => FEATURE_GRID_PROBLEM_ICON_IDS.has(preset.id)).map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs transition-colors ${
                      featureGridIconPickerValue === preset.id
                        ? "border-rose-500/50 bg-rose-50 text-rose-700"
                        : "border-slate-200 bg-white text-slate-700 hover:border-rose-300 hover:bg-rose-50/60"
                    }`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setFeatureGridIconPickerValue(preset.id)}
                  >
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                        <path d={preset.path} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <span>{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                onClick={closeFeatureGridIconPicker}
              >
                Отмена
              </button>
              <button
                type="button"
                className="inline-flex rounded-full bg-[#496db3] px-4 py-1.5 text-xs font-medium text-white hover:brightness-105"
                onClick={() => applyFeatureGridIconAndClose()}
              >
                Применить
              </button>
            </div>
          </div>
        </div>
      )}
      {tableRowHeightModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-3 backdrop-blur-sm"
          onClick={() => setTableRowHeightModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Высота строки"
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl ring-1 ring-slate-200 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <span
              className="absolute right-2 top-2 inline-flex h-5 w-5 cursor-pointer items-center justify-center text-slate-500 transition-colors hover:text-[#496db3]"
              onClick={() => setTableRowHeightModalOpen(false)}
              role="button"
              aria-label="Закрыть"
            >
              <XMarkIcon className="h-4 w-4 [stroke-width:2.2]" />
            </span>
            <div className="mt-4 grid grid-cols-1 gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-semibold text-slate-700">Высота строки</span>
                <input
                  ref={tableRowHeightModalInputRef}
                  value={tableRowHeightModalValue}
                  onChange={(e) => setTableRowHeightModalValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (tableRowHeightModalValue.trim()) {
                        applyTableRowHeight(tableRowHeightModalValue.trim());
                        setTableRowHeightModalOpen(false);
                      }
                    }
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#496db3] focus:ring-1 focus:ring-[#496db3]"
                  placeholder="Например: 36px, 2em"
                />
              </label>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                onClick={() => setTableRowHeightModalOpen(false)}
              >
                Отмена
              </button>
              <button
                type="button"
                className="inline-flex rounded-full bg-[#496db3] px-4 py-1.5 text-xs font-medium text-white hover:brightness-105 disabled:opacity-60"
                onClick={() => {
                  if (tableRowHeightModalValue.trim()) {
                    applyTableRowHeight(tableRowHeightModalValue.trim());
                    setTableRowHeightModalOpen(false);
                  }
                }}
                disabled={!tableRowHeightModalValue.trim()}
              >
                Применить
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        ${getSharedWebBlocksCss(".page-editor")}
        ${getTimelineRenderCss(".page-editor")}
        .page-editor ul { --list-marker-color: #000000; }
        ${LIST_COLORS.filter((c) => c.value).map(
          (c) => `.page-editor ul[data-list-color="${c.value}"] { --list-marker-color: ${c.hex}; }`
        ).join("\n")}
        .page-editor ul:not([data-list-style]), .page-editor ul[data-list-style="disc"] { list-style: none; padding-left: 1.5em; }
        .page-editor ul:not([data-list-style]) li::before, .page-editor ul[data-list-style="disc"] li::before { content: ""; display: inline-block; width: 1em; height: 1em; margin-right: 0.35em; margin-left: -1.5em; vertical-align: -0.15em; font-size: var(--marker-font-size, 1em); background-color: var(--list-marker-color); -webkit-mask-image: url("data:image/svg+xml,${LIST_MARKER_SVG.disc}"); mask-image: url("data:image/svg+xml,${LIST_MARKER_SVG.disc}"); -webkit-mask-size: contain; mask-size: contain; -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat; -webkit-mask-position: center; mask-position: center; }
        .page-editor ul[data-list-style="circle"] { list-style: none; padding-left: 1.5em; }
        .page-editor ul[data-list-style="circle"] li::before { content: ""; display: inline-block; width: 1em; height: 1em; margin-right: 0.35em; margin-left: -1.5em; vertical-align: -0.15em; font-size: var(--marker-font-size, 1em); background-color: var(--list-marker-color); -webkit-mask-image: url("data:image/svg+xml,${LIST_MARKER_SVG.circle}"); mask-image: url("data:image/svg+xml,${LIST_MARKER_SVG.circle}"); -webkit-mask-size: contain; mask-size: contain; -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat; -webkit-mask-position: center; mask-position: center; }
        .page-editor ul[data-list-style="square"] { list-style: none; padding-left: 1.5em; }
        .page-editor ul[data-list-style="square"] li::before { content: ""; display: inline-block; width: 1em; height: 1em; margin-right: 0.35em; margin-left: -1.5em; vertical-align: -0.15em; font-size: var(--marker-font-size, 1em); background-color: var(--list-marker-color); -webkit-mask-image: url("data:image/svg+xml,${LIST_MARKER_SVG.square}"); mask-image: url("data:image/svg+xml,${LIST_MARKER_SVG.square}"); -webkit-mask-size: contain; mask-size: contain; -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat; -webkit-mask-position: center; mask-position: center; }
        .page-editor ul[data-list-style="check"] { list-style: none; padding-left: 1.5em; }
        .page-editor ul[data-list-style="check"] li::before { content: ""; display: inline-block; width: 1em; height: 1em; margin-right: 0.35em; margin-left: -1.5em; vertical-align: -0.15em; font-size: var(--marker-font-size, 1em); background-color: var(--list-marker-color); -webkit-mask-image: url("data:image/svg+xml,${LIST_MARKER_SVG.check}"); mask-image: url("data:image/svg+xml,${LIST_MARKER_SVG.check}"); -webkit-mask-size: contain; mask-size: contain; -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat; -webkit-mask-position: center; mask-position: center; }
        .page-editor ul[data-list-style="check-circle"] { list-style: none; padding-left: 1.5em; }
        .page-editor ul[data-list-style="check-circle"] li::before { content: ""; display: inline-block; width: 1em; height: 1em; margin-right: 0.35em; margin-left: -1.5em; vertical-align: -0.15em; font-size: var(--marker-font-size, 1em); background-color: var(--list-marker-color); -webkit-mask-image: url("data:image/svg+xml,${LIST_MARKER_SVG["check-circle"]}"); mask-image: url("data:image/svg+xml,${LIST_MARKER_SVG["check-circle"]}"); -webkit-mask-size: contain; mask-size: contain; -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat; -webkit-mask-position: center; mask-position: center; }
        .page-editor ul[data-list-style="dash"] { list-style: none; padding-left: 1.5em; }
        .page-editor ul[data-list-style="dash"] li::before { content: ""; display: inline-block; width: 1em; height: 1em; margin-right: 0.35em; margin-left: -1.5em; vertical-align: -0.15em; font-size: var(--marker-font-size, 1em); background-color: var(--list-marker-color); -webkit-mask-image: url("data:image/svg+xml,${LIST_MARKER_SVG.dash}"); mask-image: url("data:image/svg+xml,${LIST_MARKER_SVG.dash}"); -webkit-mask-size: contain; mask-size: contain; -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat; -webkit-mask-position: center; mask-position: center; }
        .page-editor ul[data-list-style="arrow"] { list-style: none; padding-left: 1.5em; }
        .page-editor ul[data-list-style="arrow"] li::before { content: ""; display: inline-block; width: 1em; height: 1em; margin-right: 0.35em; margin-left: -1.5em; vertical-align: -0.15em; font-size: var(--marker-font-size, 1em); background-color: var(--list-marker-color); -webkit-mask-image: url("data:image/svg+xml,${LIST_MARKER_SVG.arrow}"); mask-image: url("data:image/svg+xml,${LIST_MARKER_SVG.arrow}"); -webkit-mask-size: contain; mask-size: contain; -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat; -webkit-mask-position: center; mask-position: center; }
        .page-editor ul[data-list-style="arrow-right"] { list-style: none; padding-left: 1.5em; }
        .page-editor ul[data-list-style="arrow-right"] li::before { content: ""; display: inline-block; width: 1em; height: 1em; margin-right: 0.35em; margin-left: -1.5em; vertical-align: -0.15em; font-size: var(--marker-font-size, 1em); background-color: var(--list-marker-color); -webkit-mask-image: url("data:image/svg+xml,${LIST_MARKER_SVG["arrow-right"]}"); mask-image: url("data:image/svg+xml,${LIST_MARKER_SVG["arrow-right"]}"); -webkit-mask-size: contain; mask-size: contain; -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat; -webkit-mask-position: center; mask-position: center; }
        .page-editor ul[data-list-style="star"] { list-style: none; padding-left: 1.5em; }
        .page-editor ul[data-list-style="star"] li::before { content: ""; display: inline-block; width: 1em; height: 1em; margin-right: 0.35em; margin-left: -1.5em; vertical-align: -0.15em; font-size: var(--marker-font-size, 1em); background-color: var(--list-marker-color); -webkit-mask-image: url("data:image/svg+xml,${LIST_MARKER_SVG.star}"); mask-image: url("data:image/svg+xml,${LIST_MARKER_SVG.star}"); -webkit-mask-size: contain; mask-size: contain; -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat; -webkit-mask-position: center; mask-position: center; }
        .page-editor ul[data-list-style="heart"] { list-style: none; padding-left: 1.5em; }
        .page-editor ul[data-list-style="heart"] li::before { content: ""; display: inline-block; width: 1em; height: 1em; margin-right: 0.35em; margin-left: -1.5em; vertical-align: -0.15em; font-size: var(--marker-font-size, 1em); background-color: var(--list-marker-color); -webkit-mask-image: url("data:image/svg+xml,${LIST_MARKER_SVG.heart}"); mask-image: url("data:image/svg+xml,${LIST_MARKER_SVG.heart}"); -webkit-mask-size: contain; mask-size: contain; -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat; -webkit-mask-position: center; mask-position: center; }
        .page-editor ul[data-list-style="bolt"] { list-style: none; padding-left: 1.5em; }
        .page-editor ul[data-list-style="bolt"] li::before { content: ""; display: inline-block; width: 1em; height: 1em; margin-right: 0.35em; margin-left: -1.5em; vertical-align: -0.15em; font-size: var(--marker-font-size, 1em); background-color: var(--list-marker-color); -webkit-mask-image: url("data:image/svg+xml,${LIST_MARKER_SVG.bolt}"); mask-image: url("data:image/svg+xml,${LIST_MARKER_SVG.bolt}"); -webkit-mask-size: contain; mask-size: contain; -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat; -webkit-mask-position: center; mask-position: center; }
        .page-editor ul[data-list-style="none"] { list-style: none; padding-left: 1.5em; }
        .page-editor ul[data-list-style="none"] li::before { content: none; }
        .page-editor ol { list-style: none; padding-left: 0; margin: 0.35em 0; margin-left: 0; --list-marker-color: #000000; }
        ${LIST_COLORS.filter((c) => c.value).map(
          (c) => `.page-editor ol[data-list-color="${c.value}"] { --list-marker-color: ${c.hex}; }`
        ).join("\n")}
        .page-editor ol > li { position: relative; list-style: none; padding-left: 2.75em; margin: 0.12em 0; min-height: 1.35em; box-sizing: border-box; }
        .page-editor ol > li::before { position: absolute; left: 0; top: 0; width: 2.35em; text-align: right; padding-right: 0.45em; box-sizing: border-box; content: attr(data-list-num); color: var(--marker-color, var(--list-marker-color)); font-size: var(--marker-font-size, 1em); line-height: inherit; font-weight: inherit; pointer-events: none; }
        .page-editor ol > li[data-marker-bold]::before { font-weight: bold; }
        .page-editor .page-editor-table { border-collapse: collapse; width: 100%; margin: 0.5em 0; table-layout: auto; }
        .page-editor .page-editor-table:has(td[data-cell-width]) { table-layout: fixed; width: auto; max-width: 100%; }
        .page-editor .page-editor-table:has(td[data-cell-width]) td { min-width: 0; }
        .page-editor .page-editor-table tr { height: auto; }
        .page-editor .page-editor-table td { padding: 0.25rem 0.5rem; min-width: 4rem; user-select: none; -webkit-user-select: none; box-sizing: border-box; }
        .page-editor .page-editor-table td[contenteditable="true"] { user-select: text; -webkit-user-select: text; }
        .page-editor .page-editor-table:not([data-table-border]) td,
        .page-editor .page-editor-table[data-table-border="solid"] td { border: var(--table-border-width, 1px) solid var(--table-border-color, #e2e8f0); }
        .page-editor .page-editor-table[data-table-border="dashed"] td { border: var(--table-border-width, 1px) dashed var(--table-border-color, #e2e8f0); }
        .page-editor .page-editor-table[data-table-border="dotted"] td { border: var(--table-border-width, 1px) dotted var(--table-border-color, #e2e8f0); }
        .page-editor .page-editor-table[data-table-border="double"] td { border: var(--table-border-width, 3px) double var(--table-border-color, #e2e8f0); }
        .page-editor .page-editor-table[data-table-border="none"] td { border: none; }
        .page-editor .page-editor-table td[data-cell-selected] { background-color: #e0e7ff; }
        .page-editor .page-editor-table[data-table-align="left"] { margin-left: 0; margin-right: auto; }
        .page-editor .page-editor-table[data-table-align="center"] { margin-left: auto; margin-right: auto; }
        .page-editor .page-editor-table[data-table-align="right"] { margin-left: auto; margin-right: 0; }
        .page-editor .page-editor-image-wrapper { display: inline-block; position: relative; margin: 0.25em 0; max-width: 100%; overflow: visible; }
        .page-editor .page-editor-image-wrapper[data-image-align="left"] { display: block; width: fit-content; max-width: 100%; margin-left: 0; margin-right: auto; }
        .page-editor .page-editor-image-wrapper[data-image-align="center"] { display: block; width: fit-content; max-width: 100%; margin-left: auto; margin-right: auto; }
        .page-editor .page-editor-image-wrapper[data-image-align="right"] { display: block; width: fit-content; max-width: 100%; margin-left: auto; margin-right: 0; }
        .page-editor .page-editor-table td .page-editor-image-wrapper { display: inline-block; width: auto; max-width: 100%; margin: 0; box-sizing: border-box; vertical-align: top; }
        .page-editor .page-editor-table td .page-editor-image-wrapper .page-editor-image { max-width: 100% !important; height: auto; }
        .page-editor .page-editor-table td .page-editor-image-resize-n { top: 0; }
        .page-editor .page-editor-table td .page-editor-image-resize-s { bottom: 0; }
        .page-editor .page-editor-table td .page-editor-image-resize-e { right: 0; }
        .page-editor .page-editor-table td .page-editor-image-resize-w { left: 0; }
        .page-editor .page-editor-table td .page-editor-image-resize-ne { top: 0; right: 0; }
        .page-editor .page-editor-table td .page-editor-image-resize-nw { top: 0; left: 0; }
        .page-editor .page-editor-table td .page-editor-image-resize-se { bottom: 0; right: 0; }
        .page-editor .page-editor-table td .page-editor-image-resize-sw { bottom: 0; left: 0; }
        .page-editor .page-editor-image-wrapper::after { content: ""; position: absolute; inset: 0; border: 2px solid #2563eb; border-radius: 2px; pointer-events: none; opacity: 0; }
        .page-editor .page-editor-image-wrapper[data-image-selected]::after { opacity: 1; }
        .page-editor .page-editor-image-wrapper .page-editor-image { vertical-align: bottom; }
        .page-editor .page-editor-image-resize { position: absolute; width: 10px; height: 10px; background: #496db3; border: 1px solid white; border-radius: 50%; opacity: 0; pointer-events: none; box-shadow: 0 0 2px rgba(0,0,0,0.3); }
        .page-editor .page-editor-image-wrapper[data-image-selected] .page-editor-image-resize { opacity: 0.9; pointer-events: auto; }
        .page-editor .page-editor-image-wrapper[data-image-selected] .page-editor-image-resize:hover { opacity: 1; }
        .page-editor .page-editor-image-resize-n { top: -5px; left: 50%; margin-left: -5px; cursor: n-resize; }
        .page-editor .page-editor-image-resize-s { bottom: -5px; left: 50%; margin-left: -5px; cursor: s-resize; }
        .page-editor .page-editor-image-resize-e { right: -5px; top: 50%; margin-top: -5px; cursor: e-resize; }
        .page-editor .page-editor-image-resize-w { left: -5px; top: 50%; margin-top: -5px; cursor: w-resize; }
        .page-editor .page-editor-image-resize-ne { top: -5px; right: -5px; cursor: ne-resize; }
        .page-editor .page-editor-image-resize-nw { top: -5px; left: -5px; cursor: nw-resize; }
        .page-editor .page-editor-image-resize-se { bottom: -5px; right: -5px; cursor: se-resize; }
        .page-editor .page-editor-image-resize-sw { bottom: -5px; left: -5px; cursor: sw-resize; }
        ${getPageShowRenderCss(".page-editor")}
        /* Публичный getPageShowRenderCss рассчитан на .page-content с боковыми отступами: margin -1rem и width +2rem компенсируют их. На полотне редактора этих отступов нет — обложка уезжает влево вместе со стрелками и меню. */
        .page-editor .page-web-cover {
          width: 100% !important;
          max-width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          border-radius: 0 !important;
        }
        .page-editor .page-web-timeline[data-timeline-show-term="0"] .page-web-timeline-term { display: none !important; }
        .page-editor .page-web-timeline[data-timeline-show-title="0"] .page-web-timeline-content > .page-web-elements.page-web-elements-title2 { display: none !important; }
        .page-editor .page-web-timeline[data-timeline-show-text="0"] .page-web-timeline-text { display: none !important; }
        .page-editor .page-web-timeline { --timeline-dot-size: 0.8rem; --timeline-line-size: 2px; --timeline-gap: 0.9rem; position: relative; width: 100%; margin: 0 0 1rem; padding-top: 1rem; display: grid; grid-template-columns: repeat(var(--timeline-cols, 3), minmax(0, 1fr)); gap: 0.7rem var(--timeline-gap); box-sizing: border-box; }
        .page-editor .page-web-timeline-head { grid-column: 1 / -1; margin: 0 0 0.6rem; display: grid; gap: 0; text-align: center; }
        /* Красный подзаголовок: чуть выше + больше зона клика; z-index выше синего — иначе отрицательный margin у заголовка перехватывает нажатия */
        .page-editor .page-web-timeline-subtitle {
          margin: 0;
          margin-top: -0.2rem;
          padding: 0.15em 0 0.55em;
          color: #b91c1c;
          font-size: 1rem;
          line-height: 1;
          font-weight: 600;
          position: relative;
          z-index: 2;
          display: inline-block;
          max-width: 100%;
          box-sizing: border-box;
        }
        .page-editor .page-web-feature-grid-head > .page-web-elements-subtitle {
          position: relative;
          z-index: 2;
          width: 100%;
          min-width: 0;
          margin-top: -0.2rem;
          padding: 0.15em 0 0.55em;
          box-sizing: border-box;
        }
        .page-editor .page-web-feature-grid-head .page-web-elements-subtitle-input {
          max-width: 100%;
        }
        /* Карточки: клик в свою ячейку — JS (ownerFeatureGridItem); отступы как на сайте (shared CSS) */
        .page-editor .page-web-feature-grid-list > .page-web-feature-grid-item {
          position: relative;
          isolation: isolate;
          overflow: visible;
        }
        .page-editor .page-web-feature-grid-item-title,
        .page-editor .page-web-feature-grid-item-body {
          min-width: 0;
          overflow: visible;
        }
        .page-editor .page-web-feature-grid-item-body textarea.page-web-elements-description-input[data-editor-focus-target="1"],
        .page-editor .page-web-feature-grid-item-title textarea.page-web-elements-title2-input[data-editor-focus-target="1"] {
          box-shadow:
            inset 0 0 0 2px rgba(73, 109, 179, 0.42),
            0 0 0 1px rgba(73, 109, 179, 0.14);
        }
        .page-editor .page-web-feature-grid-item-body > .page-web-elements.page-web-elements-description {
          width: 100%;
          max-width: 100%;
          cursor: text;
        }
        .page-editor .page-web-timeline-heading { margin: 0; color: #496db3; font-size: 2.25rem; line-height: 1; font-weight: 600; letter-spacing: -0.02em; position: relative; z-index: 1; }
        .page-editor .page-web-timeline-subtitle + .page-web-timeline-heading { margin-top: var(--site-red-blue-gap, -0.375rem); }
        .page-editor .page-web-timeline-description { margin: 0; color: #64748b; font-size: inherit; line-height: 1.5; }
        .page-editor .page-web-timeline-heading + .page-web-timeline-description { margin-top: 1rem; }
        .page-editor .page-web-timeline-head > .page-web-text-block-v2-fields > .page-web-elements.page-web-elements-subtitle {
          position: relative;
          z-index: 2;
          width: 100%;
          min-width: 0;
          margin: 0;
          margin-top: -0.2rem;
          padding: 0.15em 0 0.55em;
          box-sizing: border-box;
        }
        .page-editor .page-web-timeline-head > .page-web-text-block-v2-fields > .page-web-elements.page-web-elements-title {
          margin: 0;
          position: relative;
          z-index: 1;
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
        }
        .page-editor .page-web-timeline-head > .page-web-text-block-v2-fields > .page-web-elements.page-web-elements-subtitle + .page-web-elements.page-web-elements-title {
          margin-top: var(--site-red-blue-gap, -0.375rem);
        }
        .page-editor .page-web-timeline-head > .page-web-text-block-v2-fields > .page-web-elements.page-web-elements-description {
          margin: 0;
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
        }
        .page-editor .page-web-timeline-head > .page-web-text-block-v2-fields > .page-web-elements.page-web-elements-title + .page-web-elements.page-web-elements-description {
          margin-top: 1rem;
        }
        .page-editor .page-web-timeline-item {
          position: relative;
          min-height: 0;
          display: grid;
          grid-template-rows: minmax(8.5rem, 1fr) var(--timeline-dot-size) minmax(8.5rem, 1fr);
          row-gap: 0.4rem;
          align-content: stretch;
          align-items: stretch;
        }
        .page-editor .page-web-timeline-item::before { content: none; display: none; }
        .page-editor .page-web-timeline-item[data-timeline-has-next="1"]::before { content: ""; display: block; position: absolute; left: 50%; top: 50%; transform: translateY(-50%); width: calc(100% + var(--timeline-gap, 0.9rem)); height: var(--timeline-line-size); background: #cbd5e1; pointer-events: none; z-index: 1; }
        .page-editor .page-web-timeline-item[data-timeline-has-next="0"]::before { content: none !important; display: none !important; width: 0 !important; height: 0 !important; }
        .page-editor .page-web-timeline-term {
          position: static;
          margin: 0;
          padding: 0;
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
          align-items: flex-end;
          justify-content: center;
          width: fit-content;
          max-width: 100%;
          min-height: 0;
          height: auto;
        }
        .page-editor .page-web-timeline-dot { position: relative; left: auto; top: auto; transform: none; width: var(--timeline-dot-size); height: var(--timeline-dot-size); border-radius: 9999px; background: #496db3; box-shadow: 0 0 0 3px #e2e8f0; z-index: 2; grid-row: 2; justify-self: center; align-self: center; }
        .page-editor .page-web-timeline-content {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          justify-content: flex-start;
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
        .page-editor .page-web-timeline-item:nth-of-type(odd):not(:first-of-type) > .page-web-timeline-term {
          grid-row: 3;
          align-self: start;
          justify-self: center;
          margin: 0;
          align-items: flex-start;
        }
        .page-editor .page-web-timeline-item:nth-of-type(odd):not(:first-of-type) > .page-web-timeline-content {
          grid-row: 1;
          align-self: stretch;
          margin: 0;
        }
        .page-editor .page-web-timeline-content > .page-web-elements.page-web-elements-title2 { margin: 0; width: 100%; min-width: 0; max-width: 100%; box-sizing: border-box; }
        .page-editor .page-web-timeline-content .page-web-elements-title2-input { text-align: center; margin: 0; padding: 0; }
        .page-editor .page-web-timeline-content > .page-web-elements.page-web-elements-title2 { margin: 0; padding: 0; }
        .page-editor .page-web-timeline-item > .page-web-timeline-term.page-web-elements-subtitle .page-web-elements-subtitle-input { color: #64748b !important; font-weight: 600; width: 100%; min-width: 0; max-width: 100%; box-sizing: border-box; margin: 0; padding: 0; background: transparent; border: none; resize: none; text-align: inherit; }
        .page-editor .page-web-timeline-content > .page-web-elements.page-web-elements-description.page-web-timeline-text { margin: 0; width: 100%; min-width: 0; max-width: 100%; box-sizing: border-box; }
        .page-editor .page-web-timeline-content .page-web-elements-description.page-web-timeline-text .page-web-elements-description-input { width: 100%; min-width: 0; margin: 0; padding: 0; background: transparent; border: none; resize: none; color: #475569; box-sizing: border-box; font-size: inherit; line-height: inherit; }
        .page-editor .page-web-timeline-text { margin: 0; font-size: inherit; color: #475569; line-height: 1.5; text-align: center; }
        .page-editor .page-web-timeline textarea.page-web-elements-subtitle-input,
        .page-editor .page-web-timeline textarea.page-web-elements-title2-input,
        .page-editor .page-web-timeline textarea.page-web-elements-description-input {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          overflow-wrap: break-word !important;
          word-break: normal !important;
        }
        @media (max-width: 1205px) {
          .page-editor .page-web-timeline-item[data-timeline-has-next="1"]::before,
          .page-editor .page-web-timeline-item[data-timeline-has-next="0"]::before {
            content: none !important;
            display: none !important;
            width: 0 !important;
            height: 0 !important;
          }
          .page-editor .page-web-timeline-content { align-items: flex-start; }
          .page-editor .page-web-timeline-content .page-web-elements-title2-input { text-align: left; }
        }
        .page-editor .page-web-timeline-toolbar { position: absolute; left: 0.75rem; right: auto; top: 50%; width: max-content; pointer-events: auto; user-select: none; -webkit-user-select: none; transform: translateY(-50%); }
        .page-editor .page-web-cover-toolbar,
        .page-editor .page-web-carousel-toolbar,
        .page-editor .page-web-timeline-toolbar,
        .page-editor .page-web-text-media-toolbar,
        .page-editor .page-web-text-block-toolbar,
        .page-editor .page-web-text-block-v2-toolbar,
        .page-editor .page-web-article-text-toolbar,
        .page-editor .page-web-accordion-toolbar,
        .page-editor .page-web-spacer-toolbar { display: flex; flex-direction: column; align-items: center; gap: 4px; }
        .page-editor .page-web-cover,
        .page-editor .page-web-carousel,
        .page-editor .page-web-timeline,
        .page-editor .page-web-text-media,
        .page-editor .page-web-text-block,
        .page-editor .page-web-text-block-v2,
        .page-editor .page-web-article-text,
        .page-editor .page-web-accordion,
        .page-editor .page-web-spacer { position: relative; }
        .page-editor .page-web-insert-handle { position: absolute; left: 50%; bottom: -14px; transform: translateX(-50%); z-index: 75; opacity: 0; pointer-events: none; transition: opacity 0.15s ease; }
        .page-editor .page-web-insert-handle-btn { pointer-events: auto; display: inline-flex; align-items: center; gap: 6px; border-radius: 9999px; border: 1px solid #cbd5e1; background: rgba(255,255,255,0.98); color: #475569; font-size: 11px; font-weight: 600; line-height: 1; padding: 5px 10px; box-shadow: 0 4px 12px rgba(15,23,42,0.08); cursor: pointer; white-space: nowrap; }
        .page-editor .page-web-insert-handle-btn::before { content: "+"; font-size: 14px; font-weight: 700; line-height: 1; color: #496db3; }
        .page-editor .page-web-insert-handle-btn:hover { border-color: #94a3b8; color: #0f172a; background: #fff; }
        .page-editor .page-web-cover:hover > .page-web-insert-handle,
        .page-editor .page-web-cover:focus-within > .page-web-insert-handle,
        .page-editor .page-web-carousel:hover > .page-web-insert-handle,
        .page-editor .page-web-carousel:focus-within > .page-web-insert-handle,
        .page-editor .page-web-timeline:hover > .page-web-insert-handle,
        .page-editor .page-web-timeline:focus-within > .page-web-insert-handle,
        .page-editor .page-web-text-media:hover > .page-web-insert-handle,
        .page-editor .page-web-text-media:focus-within > .page-web-insert-handle,
        .page-editor .page-web-text-block:hover > .page-web-insert-handle,
        .page-editor .page-web-text-block:focus-within > .page-web-insert-handle,
        .page-editor .page-web-text-block-v2:hover > .page-web-insert-handle,
        .page-editor .page-web-text-block-v2:focus-within > .page-web-insert-handle,
        .page-editor .page-web-article-text:hover > .page-web-insert-handle,
        .page-editor .page-web-article-text:focus-within > .page-web-insert-handle,
        .page-editor .page-web-accordion:hover > .page-web-insert-handle,
        .page-editor .page-web-accordion:focus-within > .page-web-insert-handle,
        .page-editor .page-web-spacer:hover > .page-web-insert-handle,
        .page-editor .page-web-spacer:focus-within > .page-web-insert-handle { opacity: 1; }
        .page-editor .page-web-block-move-btn { display: flex; width: 28px; height: 28px; align-items: center; justify-content: center; border-radius: 6px; border: 1px solid #cbd5e1; background: rgba(255,255,255,0.95); color: #64748b; cursor: pointer; padding: 0; }
        .page-editor .page-web-block-move-btn:hover { border-color: #94a3b8; color: #0f172a; background: #fff; }
        .page-editor .page-web-block-move-icon { width: 14px; height: 14px; display: block; }
        .page-editor .page-web-timeline-menu-trigger { display: flex; width: 28px; height: 28px; align-items: center; justify-content: center; border-radius: 6px; border: 1px solid #cbd5e1; background: rgba(255,255,255,0.95); color: #64748b; cursor: pointer; padding: 0; }
        .page-editor .page-web-timeline-menu-trigger:hover { border-color: #94a3b8; color: #0f172a; background: #fff; }
        .page-editor .page-web-timeline-menu-dots::before { content: "\\22EE"; font-size: 1rem; line-height: 1; }
        .page-editor .page-web-timeline-menu-dropdown { display: none; position: absolute; left: calc(100% + 4px); right: auto; top: 32px; min-width: 14rem; padding: 4px 0; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 10px 24px rgba(15,23,42,0.12); z-index: 130; }
        .page-editor .page-web-timeline-toolbar[data-menu-open="1"] .page-web-timeline-menu-dropdown { display: block; }
        .page-editor .page-web-cover-toolbar[data-menu-drop="up"] > .page-web-cover-menu-dropdown,
        .page-editor .page-web-timeline-toolbar[data-menu-drop="up"] > .page-web-timeline-menu-dropdown,
        .page-editor .page-web-text-media-toolbar[data-menu-drop="up"] > .page-web-text-media-menu-dropdown,
        .page-editor .page-web-text-block-toolbar[data-menu-drop="up"] > .page-web-text-block-menu-dropdown,
        .page-editor .page-web-text-block-v2-toolbar[data-menu-drop="up"] > .page-web-text-block-v2-menu-dropdown,
        .page-editor .page-web-article-text-toolbar[data-menu-drop="up"] > .page-web-article-text-menu-dropdown,
        .page-editor .page-web-accordion-toolbar[data-menu-drop="up"] > .page-web-accordion-menu-dropdown,
        .page-editor .page-web-spacer-toolbar[data-menu-drop="up"] > .page-web-spacer-menu-dropdown {
          top: auto !important;
          bottom: 32px !important;
        }
        .page-editor .page-web-cover-toolbar[data-menu-drop="down"] > .page-web-cover-menu-dropdown,
        .page-editor .page-web-timeline-toolbar[data-menu-drop="down"] > .page-web-timeline-menu-dropdown,
        .page-editor .page-web-text-media-toolbar[data-menu-drop="down"] > .page-web-text-media-menu-dropdown,
        .page-editor .page-web-text-block-toolbar[data-menu-drop="down"] > .page-web-text-block-menu-dropdown,
        .page-editor .page-web-text-block-v2-toolbar[data-menu-drop="down"] > .page-web-text-block-v2-menu-dropdown,
        .page-editor .page-web-article-text-toolbar[data-menu-drop="down"] > .page-web-article-text-menu-dropdown,
        .page-editor .page-web-accordion-toolbar[data-menu-drop="down"] > .page-web-accordion-menu-dropdown,
        .page-editor .page-web-spacer-toolbar[data-menu-drop="down"] > .page-web-spacer-menu-dropdown {
          top: 32px;
          bottom: auto;
        }
        .page-editor .page-web-timeline-menu-add-step,
        .page-editor .page-web-timeline-menu-remove-step,
        .page-editor .page-web-timeline-menu-toggle-element { display: block; width: 100%; box-sizing: border-box; text-align: left; padding: 8px 12px; font-size: 13px; font-weight: 500; color: #0f172a; background: transparent; border: none; cursor: pointer; border-radius: 4px; white-space: nowrap; }
        .page-editor .page-web-timeline-menu-add-step:hover,
        .page-editor .page-web-timeline-menu-remove-step:hover,
        .page-editor .page-web-timeline-menu-toggle-element:hover { background: #f1f5f9; }
        .page-editor .page-web-timeline-menu-sep { height: 1px; margin: 6px 8px; background: #e2e8f0; pointer-events: none; }
        .page-editor .page-web-timeline-menu-delete { display: block; width: 100%; box-sizing: border-box; text-align: left; padding: 8px 12px; font-size: 13px; font-weight: 500; color: #b91c1c; background: transparent; border: none; cursor: pointer; border-radius: 4px; white-space: nowrap; }
        .page-editor .page-web-timeline-menu-delete:hover { background: #fef2f2; }
        /* Поверх градиента обложки, вне потока — не сдвигает текст редактора */
        .page-editor .page-web-cover-toolbar { position: absolute; left: 0.75rem; top: 50%; right: auto; margin: 0; padding: 0; z-index: 10040; transform: translateY(-50%); width: max-content; pointer-events: auto; user-select: none; -webkit-user-select: none; align-items: flex-start; }
        .page-editor .page-web-cover-toolbar[data-menu-open="1"] { z-index: 10150; }
        .page-editor .page-web-cover-toolbar[data-menu-open="1"] .page-web-cover-menu-dropdown,
        .page-editor .page-web-cover-toolbar[data-menu-open="1"] .page-web-cover-menu-sub-panel {
          z-index: 10100;
        }
        .page-editor .page-web-cover-menu-trigger { display: flex; width: 28px; height: 28px; align-items: center; justify-content: center; border-radius: 6px; border: 1px solid #cbd5e1; background: rgba(255,255,255,0.95); color: #64748b; cursor: pointer; user-select: none; -webkit-user-select: none; padding: 0; }
        .page-editor .page-web-cover-menu-trigger:hover { border-color: #94a3b8; color: #0f172a; background: #fff; }
        .page-editor .page-web-cover-menu-dots { display: inline-block; font-size: 1rem; line-height: 1; transform: translateY(-1px); }
        .page-editor .page-web-cover-menu-dots::before { content: "\u22EE"; }
        .page-editor .page-web-cover-menu-dropdown { display: none; position: absolute; left: calc(100% + 4px); top: 32px; width: max-content; min-width: 0; max-width: min(14rem, calc(100vw - 2rem)); padding: 4px 0; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 10px 24px rgba(15,23,42,0.12); z-index: 10050; }
        .page-editor .page-web-cover-toolbar[data-menu-open="1"] .page-web-cover-menu-dropdown { display: block; }
        .page-editor .page-web-cover-menu-sub { position: relative; }
        .page-editor .page-web-cover-menu-sub-trigger { display: flex; width: 100%; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 12px; font-size: 13px; font-weight: 500; color: #0f172a; background: transparent; border: none; cursor: pointer; border-radius: 4px; text-align: left; }
        .page-editor .page-web-cover-menu-sub-trigger:hover { background: #f1f5f9; }
        .page-editor .page-web-cover-menu-sub-label { flex: 1; min-width: 0; }
        .page-editor .page-web-cover-menu-chevron { flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; width: 1.25rem; color: #64748b; font-size: 1rem; line-height: 1; transition: transform 0.15s ease; }
        .page-editor .page-web-cover-menu-chevron::before { content: "\\203A"; }
        .page-editor .page-web-cover-toolbar[data-menu-open="1"] .page-web-cover-menu-sub[data-submenu-open="1"] > .page-web-cover-menu-sub-trigger .page-web-cover-menu-chevron { transform: rotate(90deg); }
        .page-editor .page-web-cover-menu-sub-panel { display: none; position: absolute; left: calc(100% + 4px); top: 0; padding: 10px; min-width: 0; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 10px 24px rgba(15,23,42,0.12); z-index: 10060; }
        .page-editor .page-web-cover-toolbar[data-menu-open="1"] .page-web-cover-menu-sub[data-submenu-open="1"] > .page-web-cover-menu-sub-panel { display: block; }
        .page-editor .page-web-cover-menu-sub[data-submenu-drop="up"] > .page-web-cover-menu-sub-panel { top: auto; bottom: 0; }
        .page-editor .page-web-cover-menu-sub[data-submenu-drop="down"] > .page-web-cover-menu-sub-panel { top: 0; bottom: auto; }
        .page-editor .page-web-cover-type-panel { display: none; flex-direction: column; gap: 2px; padding: 6px; min-width: 14.5rem; box-sizing: border-box; }
        .page-editor .page-web-cover-toolbar[data-menu-open="1"] .page-web-cover-menu-sub[data-submenu-open="1"] > .page-web-cover-menu-sub-panel .page-web-cover-type-panel { display: flex; }
        .page-editor .page-web-cover-menu-type { display: flex; width: 100%; box-sizing: border-box; align-items: center; gap: 8px; text-align: left; padding: 8px 10px; font-size: 13px; font-weight: 500; color: #0f172a; background: transparent; border: none; cursor: pointer; border-radius: 6px; white-space: nowrap; }
        .page-editor .page-web-cover-menu-type:hover { background: #f1f5f9; }
        .page-editor .page-web-cover-menu-type-radio { width: 14px; height: 14px; border-radius: 9999px; border: 1.5px solid #94a3b8; box-sizing: border-box; background: #fff; flex-shrink: 0; }
        .page-editor .page-web-cover-menu-type[aria-checked="true"] .page-web-cover-menu-type-radio { border-color: #496db3; box-shadow: inset 0 0 0 3px #496db3; }
        .page-editor .page-web-cover-menu-type-label { flex: 1; min-width: 0; }
        .page-editor .page-web-cover-elements-panel { display: none; flex-direction: column; gap: 2px; padding: 6px; min-width: 11rem; box-sizing: border-box; }
        .page-editor .page-web-cover-toolbar[data-menu-open="1"] .page-web-cover-menu-sub[data-submenu-open="1"] > .page-web-cover-menu-sub-panel .page-web-cover-elements-panel { display: flex; }
        .page-editor .page-web-cover-menu-insert-cover-el { display: flex; width: 100%; box-sizing: border-box; align-items: center; gap: 8px; text-align: left; padding: 8px 10px; font-size: 13px; font-weight: 500; color: #0f172a; background: transparent; border: none; cursor: pointer; border-radius: 6px; white-space: nowrap; }
        .page-editor .page-web-cover-menu-insert-cover-el:hover { background: #f1f5f9; }
        .page-editor .page-web-cover .page-web-cover-inner > .page-web-elements.page-web-elements-title[data-placeholder-visible="1"],
        .page-editor .page-web-cover .page-web-cover-inner > .page-web-elements.page-web-elements-description[data-placeholder-visible="1"],
        .page-editor .page-web-cover .page-web-cover-inner > .page-web-elements-actions[data-placeholder-visible="1"],
        .page-editor .page-web-cover .page-web-cover-el-subtitle[data-placeholder-visible="1"],
        .page-editor .page-web-cover .page-web-cover-el-button-wrap[data-placeholder-visible="1"] {
          position: relative;
        }
        .page-editor .page-web-cover .page-web-cover-inner > .page-web-elements.page-web-elements-title[data-placeholder-visible="1"]::before,
        .page-editor .page-web-cover .page-web-cover-inner > .page-web-elements.page-web-elements-description[data-placeholder-visible="1"]::before,
        .page-editor .page-web-cover .page-web-cover-inner > .page-web-elements-actions[data-placeholder-visible="1"]::before,
        .page-editor .page-web-cover .page-web-cover-el-subtitle[data-placeholder-visible="1"]::before,
        .page-editor .page-web-cover .page-web-cover-el-button-wrap[data-placeholder-visible="1"]::before {
          content: attr(data-placeholder);
          color: #94a3b8;
          font-weight: 500;
          pointer-events: none;
        }
        .page-editor .page-web-cover .page-web-cover-inner > .page-web-elements.page-web-elements-title:has(textarea.page-web-elements-title-input)::before,
        .page-editor .page-web-cover .page-web-cover-inner > .page-web-elements.page-web-elements-description:has(textarea.page-web-elements-description-input)::before,
        .page-editor .page-web-cover .page-web-cover-inner > .page-web-elements-actions:has(.page-web-elements-cta-button)::before,
        .page-editor .page-web-cover .page-web-cover-inner > .page-web-elements-actions:has(a.page-web-elements-cta-button)::before {
          content: none !important;
        }
        .page-editor .page-web-cover-inner[data-cover-unlocked="1"] { outline: none !important; box-shadow: none !important; }
        .page-editor .page-web-cover-inner[data-cover-unlocked="1"],
        .page-editor .page-web-text-block-content,
        .page-editor .page-web-text-media-col,
        .page-editor .page-web-timeline-subtitle,
        .page-editor .page-web-timeline-heading,
        .page-editor .page-web-timeline-description,
        .page-editor .page-web-timeline-head > .page-web-text-block-v2-fields > .page-web-elements.page-web-elements-subtitle,
        .page-editor .page-web-timeline-head > .page-web-text-block-v2-fields > .page-web-elements.page-web-elements-title,
        .page-editor .page-web-timeline-head > .page-web-text-block-v2-fields > .page-web-elements.page-web-elements-description,
        .page-editor .page-web-timeline-term,
        .page-editor .page-web-timeline-content > .page-web-elements.page-web-elements-title2,
        .page-editor .page-web-timeline-text {
          min-width: 0;
          max-width: 100%;
          box-sizing: border-box;
          overflow-wrap: anywhere;
          word-break: break-word;
        }
        .page-editor .page-web-cover-inner[data-cover-unlocked="1"] > *,
        .page-editor .page-web-text-block-content > *,
        .page-editor .page-web-text-media-col > *,
        .page-editor .page-web-timeline-subtitle > *,
        .page-editor .page-web-timeline-heading > *,
        .page-editor .page-web-timeline-description > *,
        .page-editor .page-web-timeline-head > .page-web-text-block-v2-fields > .page-web-elements.page-web-elements-subtitle > *,
        .page-editor .page-web-timeline-head > .page-web-text-block-v2-fields > .page-web-elements.page-web-elements-title > *,
        .page-editor .page-web-timeline-head > .page-web-text-block-v2-fields > .page-web-elements.page-web-elements-description > *,
        .page-editor .page-web-timeline-term > *,
        .page-editor .page-web-timeline-content > .page-web-elements.page-web-elements-title2 > *,
        .page-editor .page-web-timeline-text > * {
          max-width: 100%;
          box-sizing: border-box;
        }
        /* Активная область редактирования: один атрибут data-editor-focus-target + переменные на .page-editor */
        .page-editor .page-web-cover-inner [data-editor-focus-target="1"]:not(textarea):not(input):not(.page-web-elements-actions-cluster):not(.page-web-elements-cta-button):not(.page-web-elements-cta-button-secondary):not(a.page-web-elements-cta-button):not(a.page-web-elements-cta-button-secondary),
        .page-editor .page-web-text-block-subtitle-input[data-editor-focus-target="1"],
        .page-editor .page-web-text-block-title-input[data-editor-focus-target="1"],
        .page-editor .page-web-text-block-lead-input[data-editor-focus-target="1"],
        .page-editor .page-web-text-block-content [data-editor-focus-target="1"]:not(textarea):not(input):not(a.page-web-elements-cta-button):not(a.page-web-elements-cta-button-secondary):not(span.page-web-elements-cta-button):not(span.page-web-elements-cta-button-secondary):not(p.page-web-elements-cta-wrap),
        .page-editor .page-web-article-text-body[data-editor-focus-target="1"],
        .page-editor .page-web-article-text-body [data-editor-focus-target="1"]:not(textarea):not(input):not(a.page-web-elements-cta-button):not(a.page-web-elements-cta-button-secondary):not(span.page-web-elements-cta-button):not(span.page-web-elements-cta-button-secondary):not(p.page-web-elements-cta-wrap),
        .page-editor .page-web-work-pricing [data-editor-focus-target="1"]:not(textarea):not(input):not(a.page-web-elements-cta-button):not(a.page-web-elements-cta-button-secondary):not(span.page-web-elements-cta-button):not(span.page-web-elements-cta-button-secondary):not(p.page-web-elements-cta-wrap),
        .page-editor .page-web-text-media-col[data-editor-focus-target="1"],
        .page-editor .page-web-text-media-col [data-editor-focus-target="1"],
        .page-editor .page-web-timeline [data-editor-focus-target="1"] {
          padding-inline: var(--page-editor-focus-pad-inline);
          padding-block: var(--page-editor-focus-pad-block);
          margin-inline: var(--page-editor-focus-margin-inline);
          margin-block: var(--page-editor-focus-margin-block);
          box-shadow: var(--page-editor-focus-shadow);
          border-radius: var(--page-editor-focus-radius);
          transition: box-shadow 0.12s ease;
        }
        .page-editor a.page-web-elements-cta-button[data-editor-focus-target="1"],
        .page-editor a.page-web-elements-cta-button-secondary[data-editor-focus-target="1"],
        .page-editor span.page-web-elements-cta-button[data-editor-focus-target="1"],
        .page-editor span.page-web-elements-cta-button-secondary[data-editor-focus-target="1"] {
          outline: none !important;
          border-radius: 0.625rem;
          box-shadow: var(--page-editor-focus-shadow);
          transition: box-shadow 0.12s ease;
        }
        .page-editor .page-web-text-block-content { outline: none !important; }
        .page-editor .page-web-timeline [data-editor-focus-target="1"] {
          outline: none !important;
          text-decoration: none !important;
          box-decoration-break: clone;
          -webkit-box-decoration-break: clone;
        }
        .page-editor .page-web-text-block-subtitle-input[data-editor-focus-target="1"],
        .page-editor .page-web-text-block-title-input[data-editor-focus-target="1"],
        .page-editor .page-web-text-block-lead-input[data-editor-focus-target="1"],
        .page-editor .page-web-elements-title2-input[data-editor-focus-target="1"],
        .page-editor .page-web-elements-subtitle-input[data-editor-focus-target="1"],
        .page-editor .page-web-elements-description-input[data-editor-focus-target="1"] {
          padding: 0.25rem 0.45rem;
          margin: 0;
          border-radius: 8px;
          box-sizing: border-box;
          box-shadow: var(--page-editor-focus-shadow);
          transition: box-shadow 0.12s ease;
        }
        .page-editor .page-web-elements-title-input[data-editor-focus-target="1"] {
          padding: 0.15rem 0.45rem;
          margin: 0;
          border-radius: 8px;
          box-sizing: border-box;
          line-height: 1.2 !important;
          box-shadow: var(--page-editor-focus-shadow);
          transition: box-shadow 0.12s ease;
        }
        .page-editor .page-web-accordion-question-input[data-editor-focus-target="1"],
        .page-editor .page-web-accordion-item textarea.page-web-accordion-question-input[data-editor-focus-target="1"] {
          padding: 0.15rem 0.45rem !important;
          margin: 0;
          border-radius: 8px;
          box-sizing: border-box;
          line-height: 1.6 !important;
          box-shadow: var(--page-editor-focus-shadow);
          transition: box-shadow 0.12s ease;
        }
        .page-editor .page-web-accordion-answer-input[data-editor-focus-target="1"],
        .page-editor .page-web-accordion-item textarea.page-web-accordion-answer-input[data-editor-focus-target="1"] {
          padding: 0.25rem 0.45rem !important;
          margin: 0;
          border-radius: 8px;
          box-sizing: border-box;
          box-shadow: var(--page-editor-focus-shadow);
          transition: box-shadow 0.12s ease;
        }
        .page-editor .page-web-feature-grid-message textarea.page-web-elements-title2-input.page-web-feature-grid-message-title[data-editor-focus-target="1"],
        .page-editor .page-web-feature-grid-message textarea.page-web-elements-description-input.page-web-feature-grid-message-body[data-editor-focus-target="1"] {
          padding: 0 !important;
        }
        .page-editor .page-web-work-pricing textarea.page-web-elements-title-input[data-editor-focus-target="1"] {
          padding: 0.15rem 0.45rem;
          margin: 0;
          border-radius: 8px;
          box-sizing: border-box;
          line-height: 1.2 !important;
          outline: none !important;
          box-shadow: var(--page-editor-focus-shadow);
          transition: box-shadow 0.12s ease;
        }
        .page-editor .page-web-work-pricing textarea.page-web-elements-title2-input[data-editor-focus-target="1"],
        .page-editor .page-web-work-pricing textarea.page-web-elements-subtitle-input[data-editor-focus-target="1"],
        .page-editor .page-web-work-pricing textarea.page-web-elements-description-input[data-editor-focus-target="1"] {
          padding: 0.25rem 0.45rem;
          margin: 0;
          border-radius: 8px;
          box-sizing: border-box;
          outline: none !important;
          box-shadow: var(--page-editor-focus-shadow);
          transition: box-shadow 0.12s ease;
        }
        .page-editor .page-web-elements-actions-cluster[data-editor-focus-target="1"] {
          outline: none !important;
          padding: 0.2rem 0.35rem;
          margin: 0;
          box-shadow: var(--page-editor-focus-shadow);
          border-radius: 8px;
          transition: box-shadow 0.12s ease;
          box-sizing: border-box;
        }
        .page-editor .page-web-elements-actions-cluster .page-web-elements-cta-button:focus,
        .page-editor .page-web-elements-actions-cluster a.page-web-elements-cta-button:focus,
        .page-editor .page-web-elements-actions-cluster a.page-web-elements-cta-button-secondary:focus {
          outline: none !important;
        }
        .page-editor .page-web-elements-actions[data-editor-focus-target="1"]:not(:has(.page-web-elements-actions-cluster)) {
          outline: none !important;
          box-shadow: var(--page-editor-focus-shadow);
          border-radius: 8px;
          transition: box-shadow 0.12s ease;
          box-sizing: border-box;
        }
        .page-editor .page-web-timeline .page-web-timeline-subtitle[data-editor-focus-target="1"],
        .page-editor .page-web-timeline .page-web-timeline-heading[data-editor-focus-target="1"] {
          display: inline-block;
        }
        .page-editor .page-web-cover-aspect-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; width: 156px; box-sizing: border-box; }
        .page-editor .page-web-cover-menu-aspect { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; width: 100%; box-sizing: border-box; margin: 0; padding: 6px 2px; text-align: center; font-size: 10px; font-weight: 600; line-height: 1.1; color: #0f172a; background: transparent; border: none; cursor: pointer; border-radius: 6px; }
        .page-editor .page-web-cover-menu-aspect:hover { background: #f1f5f9; }
        .page-editor .page-web-cover-menu-aspect-preview { display: flex; align-items: center; justify-content: center; width: 100%; min-height: 30px; }
        .page-editor .page-web-cover-menu-aspect-svg { display: block; flex-shrink: 0; }
        .page-editor .page-web-cover-menu-aspect-label { display: block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 10px; font-weight: 600; color: #334155; }
        .page-editor .page-web-cover[data-cover-aspect="16-9"] .page-web-cover-menu-aspect[data-set-cover-aspect="16-9"],
        .page-editor .page-web-cover[data-cover-aspect="4-3"] .page-web-cover-menu-aspect[data-set-cover-aspect="4-3"],
        .page-editor .page-web-cover[data-cover-aspect="21-9"] .page-web-cover-menu-aspect[data-set-cover-aspect="21-9"],
        .page-editor .page-web-cover[data-cover-aspect="1-1"] .page-web-cover-menu-aspect[data-set-cover-aspect="1-1"],
        .page-editor .page-web-cover[data-cover-aspect="1-8"] .page-web-cover-menu-aspect[data-set-cover-aspect="1-8"],
        .page-editor .page-web-cover[data-cover-aspect="1-4"] .page-web-cover-menu-aspect[data-set-cover-aspect="1-4"],
        .page-editor .page-web-cover[data-cover-aspect="3-1"] .page-web-cover-menu-aspect[data-set-cover-aspect="3-1"],
        .page-editor .page-web-cover[data-cover-aspect="6-1"] .page-web-cover-menu-aspect[data-set-cover-aspect="6-1"] { background: #f1f5f9; box-shadow: inset 0 0 0 1px #496db3; }
        .page-editor .page-web-cover[data-cover-type="hero"] .page-web-cover-menu-type[data-set-cover-type="hero"],
        .page-editor .page-web-cover[data-cover-type="image"] .page-web-cover-menu-type[data-set-cover-type="image"],
        .page-editor .page-web-cover[data-cover-type="split"] .page-web-cover-menu-type[data-set-cover-type="split"] { background: #f1f5f9; }
        .page-editor .page-web-cover-menu-sep { height: 1px; margin: 6px 8px; background: #e2e8f0; pointer-events: none; }
        .page-editor .page-web-cover-menu-upload { display: block; width: 100%; box-sizing: border-box; text-align: left; padding: 8px 12px; font-size: 13px; font-weight: 500; color: #0f172a; background: transparent; border: none; cursor: pointer; border-radius: 4px; white-space: nowrap; }
        .page-editor .page-web-cover-menu-upload:hover { background: #f1f5f9; }
        .page-editor .page-web-cover-menu-delete { display: block; width: 100%; box-sizing: border-box; text-align: left; padding: 8px 12px; font-size: 13px; font-weight: 500; color: #b91c1c; background: transparent; border: none; cursor: pointer; border-radius: 4px; white-space: nowrap; }
        .page-editor .page-web-cover-menu-delete:hover { background: #fef2f2; }
        .page-editor .page-web-text-media { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 1rem; width: 100%; margin: 1rem 0; }
        .page-editor .page-web-text-media-toolbar { position: absolute; left: 0.75rem; top: 50%; z-index: 80; width: max-content; pointer-events: auto; user-select: none; -webkit-user-select: none; transform: translateY(-50%); }
        .page-editor .page-web-text-media-menu-trigger { display: flex; width: 28px; height: 28px; align-items: center; justify-content: center; border-radius: 6px; border: 1px solid #cbd5e1; background: rgba(255,255,255,0.95); color: #64748b; cursor: pointer; padding: 0; }
        .page-editor .page-web-text-media-menu-trigger:hover { border-color: #94a3b8; color: #0f172a; background: #fff; }
        .page-editor .page-web-text-media-menu-dots::before { content: "\\22EE"; font-size: 1rem; line-height: 1; }
        .page-editor .page-web-text-media-menu-dropdown { display: none; position: absolute; left: calc(100% + 4px); right: auto; top: 32px; min-width: 11.5rem; padding: 4px 0; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 10px 24px rgba(15,23,42,0.12); z-index: 90; }
        .page-editor .page-web-text-media-toolbar[data-menu-open="1"] .page-web-text-media-menu-dropdown { display: block; }
        .page-editor .page-web-text-media-menu-delete { display: block; width: 100%; box-sizing: border-box; text-align: left; padding: 8px 12px; font-size: 13px; font-weight: 500; color: #b91c1c; background: transparent; border: none; cursor: pointer; border-radius: 4px; white-space: nowrap; }
        .page-editor .page-web-text-media-menu-delete:hover { background: #fef2f2; }
        .page-editor .page-web-text-block { position: relative; width: 100%; margin: 1rem 0; border-radius: 12px; border: 1px solid #e2e8f0; background: #fff; padding: 1rem; box-sizing: border-box; overflow: visible; }
        .page-editor .page-web-text-block:has(> .page-web-text-block-toolbar[data-menu-open="1"]) { z-index: 100; }
        .page-editor .page-web-text-block-toolbar { position: absolute; left: 0.75rem; top: 50%; z-index: 10040; width: max-content; pointer-events: auto; user-select: none; -webkit-user-select: none; transform: translateY(-50%); }
        .page-editor .page-web-text-block-toolbar[data-menu-open="1"] { z-index: 10150; }
        .page-editor .page-web-text-block-toolbar[data-menu-open="1"] .page-web-text-block-menu-dropdown,
        .page-editor .page-web-text-block-toolbar[data-menu-open="1"] .page-web-text-block-menu-sub-panel { z-index: 10100; }
        .page-editor .page-web-text-block-menu-trigger { display: flex; width: 28px; height: 28px; align-items: center; justify-content: center; border-radius: 6px; border: 1px solid #cbd5e1; background: rgba(255,255,255,0.95); color: #64748b; cursor: pointer; padding: 0; }
        .page-editor .page-web-text-block-menu-trigger:hover { border-color: #94a3b8; color: #0f172a; background: #fff; }
        .page-editor .page-web-text-block-menu-dots::before { content: "\\22EE"; font-size: 1rem; line-height: 1; }
        .page-editor .page-web-text-block-menu-dropdown { display: none; position: absolute; left: calc(100% + 4px); right: auto; top: 32px; min-width: 11.5rem; padding: 4px 0; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 10px 24px rgba(15,23,42,0.12); z-index: 90; transform: translateZ(0); -webkit-transform: translateZ(0); backface-visibility: hidden; -webkit-backface-visibility: hidden; }
        .page-editor .page-web-text-block-menu-dropdown[data-force-hidden="1"] { display: none !important; visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; }
        .page-editor .page-web-text-block-toolbar[data-menu-open="1"] .page-web-text-block-menu-dropdown { display: block; }
        .page-editor .page-web-text-block-toolbar[data-text-block-variant="feature-grid"] .page-web-text-block-menu-sub--feature-grid-block-elements,
        .page-editor .page-web-text-block-toolbar[data-text-block-variant="feature-grid"] .page-web-text-block-menu-sub--feature-grid-card-elements,
        .page-editor .page-web-text-block-toolbar[data-text-block-variant="feature-grid"] .page-web-text-block-menu-sub--feature-grid-extra { display: block; }
        .page-editor .page-web-text-block-menu-sub { position: relative; display: none; }
        .page-editor .page-web-text-block-menu-plain-fields,
        .page-editor .page-web-text-block-menu-sep--plain-fields { display: none; }
        .page-editor .page-web-text-block-toolbar[data-text-block-variant=""] .page-web-text-block-menu-plain-fields,
        .page-editor .page-web-text-block-toolbar[data-text-block-variant=""] .page-web-text-block-menu-sep--plain-fields { display: block; }
        .page-editor .page-web-text-block-fields { display: flex; flex-direction: column; gap: 0.65rem; margin: 0 0 0.85rem; box-sizing: border-box; }
        .page-editor .page-web-text-block-subtitle-input,
        .page-editor .page-web-text-block-title-input,
        .page-editor .page-web-text-block-lead-input {
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          margin: 0;
          font: inherit;
          color: #0f172a;
          background: #fff;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 0.25rem 0.45rem;
          outline: none;
        }
        .page-editor .page-web-text-block-subtitle-input {
          font-size: 1rem;
          font-weight: 600;
          line-height: 1.2;
          color: #b91c1c;
        }
        .page-editor .page-web-text-block-title-input {
          font-size: 1.2rem;
          font-weight: 600;
          line-height: 1.25;
          color: #0f172a;
        }
        .page-editor .page-web-text-block-lead-input {
          line-height: 1.5;
          color: #475569;
        }
        .page-editor .page-web-text-block[data-text-block-has-subtitle="0"] .page-web-text-block-subtitle-field-wrap { display: none !important; }
        .page-editor .page-web-text-block[data-text-block-has-title="0"] .page-web-text-block-title-field-wrap { display: none !important; }
        .page-editor .page-web-text-block[data-text-block-has-lead="0"] .page-web-text-block-lead-field-wrap { display: none !important; }
        .page-editor .page-web-text-block[data-text-block-has-subtitle="0"] .page-web-elements-subtitle { display: none !important; }
        .page-editor .page-web-text-block[data-text-block-has-title="0"] .page-web-elements-title { display: none !important; }
        .page-editor .page-web-text-block[data-text-block-has-lead="0"] .page-web-elements-description { display: none !important; }
        .page-editor .page-web-text-block-menu-sub-panel .page-web-text-block-menu-sub { display: block; }
        .page-editor .page-web-text-block-menu-sub-trigger { display: flex; width: 100%; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 12px; font-size: 13px; font-weight: 500; color: #0f172a; background: transparent; border: none; cursor: pointer; border-radius: 4px; text-align: left; }
        .page-editor .page-web-text-block-menu-sub-trigger:hover { background: #f1f5f9; }
        .page-editor .page-web-text-block-menu-sub-label { flex: 1; min-width: 0; }
        .page-editor .page-web-text-block-menu-chevron { flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; width: 1.25rem; color: #64748b; font-size: 1rem; line-height: 1; transition: transform 0.15s ease; }
        .page-editor .page-web-text-block-menu-chevron::before { content: "\\203A"; }
        .page-editor .page-web-text-block-toolbar[data-menu-open="1"] .page-web-text-block-menu-sub[data-submenu-open="1"] > .page-web-text-block-menu-sub-trigger .page-web-text-block-menu-chevron { transform: rotate(90deg); }
        .page-editor .page-web-text-block-menu-sub-panel { display: none; position: absolute; left: calc(100% + 4px); top: 0; padding: 6px; min-width: 12rem; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 10px 24px rgba(15,23,42,0.12); z-index: 120; transform: translateZ(0); -webkit-transform: translateZ(0); backface-visibility: hidden; -webkit-backface-visibility: hidden; }
        .page-editor .page-web-text-block-menu-sub-panel[data-force-hidden="1"] { display: none !important; visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; }
        .page-editor .page-web-text-block-toolbar[data-menu-open="1"] .page-web-text-block-menu-sub[data-submenu-open="1"] > .page-web-text-block-menu-sub-panel { display: block; }
        .page-editor .page-web-text-block-menu-sub[data-submenu-drop="up"] > .page-web-text-block-menu-sub-panel { top: auto; bottom: 0; }
        .page-editor .page-web-text-block-menu-sub[data-submenu-drop="down"] > .page-web-text-block-menu-sub-panel { top: 0; bottom: auto; }
        .page-editor .page-web-text-block-menu-element { display: block; width: 100%; box-sizing: border-box; text-align: left; padding: 8px 10px; font-size: 13px; font-weight: 500; color: #0f172a; background: transparent; border: none; cursor: pointer; border-radius: 6px; white-space: nowrap; }
        .page-editor .page-web-text-block-menu-element:hover { background: #f1f5f9; }
        .page-editor .page-web-text-block-menu-element[disabled] { opacity: 0.45; cursor: not-allowed; }
        .page-editor .page-web-text-block-menu-element[disabled]:hover { background: transparent; }
        .page-editor .page-web-text-block-menu-grid-option { display: flex; width: 100%; box-sizing: border-box; align-items: center; gap: 8px; text-align: left; padding: 8px 10px; font-size: 13px; font-weight: 500; color: #0f172a; background: transparent; border: none; cursor: pointer; border-radius: 6px; white-space: nowrap; }
        .page-editor .page-web-text-block-menu-grid-option:hover { background: #f1f5f9; }
        .page-editor .page-web-text-block-menu-grid-option-radio { width: 14px; height: 14px; border-radius: 9999px; border: 1.5px solid #94a3b8; box-sizing: border-box; background: #fff; flex-shrink: 0; }
        .page-editor .page-web-text-block-menu-grid-option[aria-checked="true"] .page-web-text-block-menu-grid-option-radio { border-color: #496db3; box-shadow: inset 0 0 0 3px #496db3; }
        .page-editor .page-web-text-block-menu-grid-option-label { flex: 1; min-width: 0; }
        .page-editor .page-web-text-block-menu-sep { height: 1px; margin: 6px 8px; background: #e2e8f0; pointer-events: none; display: none; }
        .page-editor .page-web-text-block-toolbar[data-text-block-variant="feature-grid"] .page-web-text-block-menu-sep--feature-grid { display: block; }
        .page-editor .page-web-text-block-toolbar[data-text-block-variant="work-pricing"] .page-web-text-block-menu-sep--work-pricing { display: block; }
        .page-editor .page-web-text-block-menu-element--work-pricing { display: none; }
        .page-editor .page-web-text-block-toolbar[data-text-block-variant="work-pricing"] .page-web-text-block-menu-element--work-pricing { display: block; }
        .page-editor .page-web-text-block-menu-sub-panel .page-web-text-block-menu-sep { display: block; margin: 6px 0; }
        .page-editor .page-web-text-block-menu-delete { display: block; width: 100%; box-sizing: border-box; text-align: left; padding: 8px 12px; font-size: 13px; font-weight: 500; color: #b91c1c; background: transparent; border: none; cursor: pointer; border-radius: 4px; white-space: nowrap; }
        .page-editor .page-web-text-block-menu-delete:hover { background: #fef2f2; }
        .page-editor .page-web-text-block-v2 { position: relative; width: 100%; margin: 1rem 0; border: none; background: transparent; padding: 1rem; box-sizing: border-box; overflow: visible; }
        .page-editor .page-web-text-block-v2:has(> .page-web-text-block-v2-toolbar[data-menu-open="1"]) { z-index: 100; }
        .page-editor .page-web-text-block-v2-toolbar { position: absolute; left: 0.75rem; top: 50%; z-index: 10040; width: max-content; pointer-events: auto; user-select: none; -webkit-user-select: none; transform: translateY(-50%); }
        .page-editor .page-web-text-block-v2-toolbar[data-menu-open="1"] { z-index: 10150; }
        .page-editor .page-web-text-block-v2-toolbar[data-menu-open="1"] .page-web-text-block-v2-menu-dropdown,
        .page-editor .page-web-text-block-v2-toolbar[data-menu-open="1"] .page-web-text-block-menu-sub-panel { z-index: 10100; }
        .page-editor .page-web-text-block-v2-menu-trigger { display: flex; width: 28px; height: 28px; align-items: center; justify-content: center; border-radius: 6px; border: 1px solid #cbd5e1; background: rgba(255,255,255,0.95); color: #64748b; cursor: pointer; padding: 0; }
        .page-editor .page-web-text-block-v2-menu-trigger:hover { border-color: #94a3b8; color: #0f172a; background: #fff; }
        .page-editor .page-web-text-block-v2-menu-dots::before { content: "\\22EE"; font-size: 1rem; line-height: 1; }
        .page-editor .page-web-text-block-v2-menu-dropdown { display: none; position: absolute; left: calc(100% + 4px); right: auto; top: 32px; min-width: 11.5rem; padding: 4px 0; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 10px 24px rgba(15,23,42,0.12); z-index: 90; }
        .page-editor .page-web-text-block-v2-toolbar[data-menu-open="1"] .page-web-text-block-v2-menu-dropdown { display: block; }
        .page-editor .page-web-text-block-v2-menu-delete { display: block; width: 100%; box-sizing: border-box; text-align: left; padding: 8px 12px; font-size: 13px; font-weight: 500; color: #b91c1c; background: transparent; border: none; cursor: pointer; border-radius: 4px; white-space: nowrap; }
        .page-editor .page-web-text-block-v2-menu-delete:hover { background: #fef2f2; }
        .page-editor .page-web-text-block-v2-toolbar .page-web-text-block-menu-sub--v2-elements { display: block; }
        .page-editor .page-web-text-block-v2-toolbar:not([data-menu-open="1"]) .page-web-text-block-menu-sub-panel {
          display: none !important;
          visibility: hidden !important;
          pointer-events: none !important;
        }
        .page-editor .page-web-text-block-v2-toolbar[data-menu-open="1"] .page-web-text-block-menu-sub:not([data-submenu-open="1"]) > .page-web-text-block-menu-sub-panel {
          display: none !important;
        }
        .page-editor .page-web-text-block-v2-toolbar[data-menu-open="1"] .page-web-text-block-menu-sub[data-submenu-open="1"] > .page-web-text-block-menu-sub-panel { display: block; }
        .page-editor .page-web-text-block-v2-toolbar[data-menu-open="1"] .page-web-text-block-menu-sub[data-submenu-open="1"] > .page-web-text-block-menu-sub-trigger .page-web-text-block-menu-chevron { transform: rotate(90deg); }
        .page-editor .page-web-text-block-v2-menu-sep { display: block; margin: 6px 8px; }
        .page-editor .page-web-article-text { position: relative; width: 100%; margin: 1rem 0; border: none; background: transparent; padding: 1rem; box-sizing: border-box; overflow: visible; }
        .page-editor .page-web-article-text:has(> .page-web-article-text-toolbar[data-menu-open="1"]) { z-index: 100; }
        .page-editor .page-web-article-text-toolbar { position: absolute; left: 0.75rem; top: 50%; z-index: 10040; width: max-content; pointer-events: auto; user-select: none; -webkit-user-select: none; transform: translateY(-50%); }
        .page-editor .page-web-article-text-toolbar[data-menu-open="1"] { z-index: 10150; }
        .page-editor .page-web-article-text-toolbar[data-menu-open="1"] .page-web-article-text-menu-dropdown,
        .page-editor .page-web-article-text-toolbar[data-menu-open="1"] .page-web-text-block-menu-sub-panel { z-index: 10100; }
        .page-editor .page-web-article-text-menu-trigger { display: flex; width: 28px; height: 28px; align-items: center; justify-content: center; border-radius: 6px; border: 1px solid #cbd5e1; background: rgba(255,255,255,0.95); color: #64748b; cursor: pointer; padding: 0; }
        .page-editor .page-web-article-text-menu-trigger:hover { border-color: #94a3b8; color: #0f172a; background: #fff; }
        .page-editor .page-web-article-text-menu-dots::before { content: "\\22EE"; font-size: 1rem; line-height: 1; }
        .page-editor .page-web-article-text-menu-dropdown { display: none; position: absolute; left: calc(100% + 4px); right: auto; top: 32px; min-width: 11.5rem; padding: 4px 0; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 10px 24px rgba(15,23,42,0.12); z-index: 90; }
        .page-editor .page-web-article-text-toolbar[data-menu-open="1"] .page-web-article-text-menu-dropdown { display: block; }
        .page-editor .page-web-article-text-menu-delete { display: block; width: 100%; box-sizing: border-box; text-align: left; padding: 8px 12px; font-size: 13px; font-weight: 500; color: #b91c1c; background: transparent; border: none; cursor: pointer; border-radius: 4px; white-space: nowrap; }
        .page-editor .page-web-article-text-menu-delete:hover { background: #fef2f2; }
        .page-editor .page-web-article-text-toolbar .page-web-text-block-menu-sub--article-elements { display: block; }
        .page-editor .page-web-article-text-toolbar:not([data-menu-open="1"]) .page-web-text-block-menu-sub-panel {
          display: none !important;
          visibility: hidden !important;
          pointer-events: none !important;
        }
        .page-editor .page-web-article-text-toolbar[data-menu-open="1"] .page-web-text-block-menu-sub:not([data-submenu-open="1"]) > .page-web-text-block-menu-sub-panel {
          display: none !important;
        }
        .page-editor .page-web-article-text-toolbar[data-menu-open="1"] .page-web-text-block-menu-sub[data-submenu-open="1"] > .page-web-text-block-menu-sub-panel { display: block; }
        .page-editor .page-web-article-text-toolbar[data-menu-open="1"] .page-web-text-block-menu-sub[data-submenu-open="1"] > .page-web-text-block-menu-sub-trigger .page-web-text-block-menu-chevron { transform: rotate(90deg); }
        .page-editor .page-web-article-text-menu-sep { display: block; margin: 6px 8px; }
        .page-editor .page-web-article-text-fields { display: flex; flex-direction: column; gap: 0; margin: 0 0 0.85rem; box-sizing: border-box; width: 100%; }
        .page-editor .page-web-article-text .page-web-elements-title-input {
          padding: 0.25rem 0.45rem;
          font-size: 1rem !important;
          line-height: 1.6 !important;
          font-weight: inherit !important;
          color: #496db3;
        }
        .page-editor .page-web-article-text .page-web-elements-title-input[data-editor-focus-target="1"] {
          padding: 0.25rem 0.45rem !important;
          font-size: 1rem !important;
          line-height: 1.6 !important;
          font-weight: inherit !important;
        }
        .page-editor .page-web-article-text-body {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          width: 100%;
          max-width: 100%;
          min-width: 0;
          margin: 0;
          min-height: 0;
          line-height: inherit;
          color: #334155;
          box-sizing: border-box;
          outline: none;
        }
        .page-editor .page-web-article-text[data-article-show-title="0"] .page-web-elements-title { display: none !important; }
        .page-editor .page-web-article-text[data-article-show-body="0"] .page-web-article-text-body { display: none !important; }
        .page-editor .page-web-article-text .page-web-elements-field-row > textarea.page-web-article-text-body-input,
        .page-editor .page-web-article-text .page-web-elements-field-row > textarea.page-web-article-text-body-input[data-editor-focus-target="1"] {
          min-width: 32ch !important;
        }
        .page-editor .page-web-article-text .page-web-elements-field-row > textarea.page-web-elements-title-input,
        .page-editor .page-web-article-text .page-web-elements-field-row > textarea.page-web-elements-title-input[data-editor-focus-target="1"] {
          min-width: 32ch !important;
        }
        .page-editor .page-web-accordion { position: relative; width: 100%; margin: 1rem 0; padding: 1rem; box-sizing: border-box; overflow: visible; }
        .page-editor .page-web-accordion:has(> .page-web-accordion-toolbar[data-menu-open="1"]) { z-index: 100; }
        .page-editor .page-web-accordion-toolbar { position: absolute; left: 0.75rem; top: 50%; z-index: 10040; width: max-content; pointer-events: auto; user-select: none; -webkit-user-select: none; transform: translateY(-50%); }
        .page-editor .page-web-accordion-toolbar[data-menu-open="1"] { z-index: 10150; }
        .page-editor .page-web-accordion-toolbar[data-menu-open="1"] .page-web-accordion-menu-dropdown { z-index: 10100; }
        .page-editor .page-web-accordion-menu-trigger { display: flex; width: 28px; height: 28px; align-items: center; justify-content: center; border-radius: 6px; border: 1px solid #cbd5e1; background: rgba(255,255,255,0.95); color: #64748b; cursor: pointer; padding: 0; }
        .page-editor .page-web-accordion-menu-trigger:hover { border-color: #94a3b8; color: #0f172a; background: #fff; }
        .page-editor .page-web-accordion-menu-dots::before { content: "\\22EE"; font-size: 1rem; line-height: 1; }
        .page-editor .page-web-accordion-menu-dropdown { display: none; position: absolute; left: calc(100% + 4px); right: auto; top: 32px; min-width: 11.5rem; padding: 4px 0; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 10px 24px rgba(15,23,42,0.12); z-index: 90; }
        .page-editor .page-web-accordion-toolbar[data-menu-open="1"] .page-web-accordion-menu-dropdown { display: block; }
        .page-editor .page-web-accordion-menu-add-item,
        .page-editor .page-web-accordion-menu-remove-item { display: block; width: 100%; box-sizing: border-box; text-align: left; padding: 8px 12px; font-size: 13px; font-weight: 500; color: #0f172a; background: transparent; border: none; cursor: pointer; border-radius: 4px; white-space: nowrap; }
        .page-editor .page-web-accordion-menu-add-item:hover,
        .page-editor .page-web-accordion-menu-remove-item:hover { background: #f1f5f9; }
        .page-editor .page-web-accordion-menu-sep { height: 1px; margin: 6px 8px; background: #e2e8f0; pointer-events: none; }
        .page-editor .page-web-accordion-menu-delete { display: block; width: 100%; box-sizing: border-box; text-align: left; padding: 8px 12px; font-size: 13px; font-weight: 500; color: #b91c1c; background: transparent; border: none; cursor: pointer; border-radius: 4px; white-space: nowrap; }
        .page-editor .page-web-accordion-menu-delete:hover { background: #fef2f2; }
        .page-editor .page-web-accordion-toolbar .page-web-text-block-menu-sub--accordion-elements { display: block; }
        .page-editor .page-web-accordion-toolbar:not([data-menu-open="1"]) .page-web-text-block-menu-sub-panel {
          display: none !important;
          visibility: hidden !important;
          pointer-events: none !important;
        }
        .page-editor .page-web-accordion-toolbar[data-menu-open="1"] .page-web-text-block-menu-sub:not([data-submenu-open="1"]) > .page-web-text-block-menu-sub-panel {
          display: none !important;
        }
        .page-editor .page-web-accordion-toolbar[data-menu-open="1"] .page-web-text-block-menu-sub[data-submenu-open="1"] > .page-web-text-block-menu-sub-panel { display: block; }
        .page-editor .page-web-accordion-toolbar[data-menu-open="1"] .page-web-text-block-menu-sub[data-submenu-open="1"] > .page-web-text-block-menu-sub-trigger .page-web-text-block-menu-chevron { transform: rotate(90deg); }
        .page-editor .page-web-accordion-toolbar[data-menu-open="1"] .page-web-accordion-menu-dropdown,
        .page-editor .page-web-accordion-toolbar[data-menu-open="1"] .page-web-text-block-menu-sub-panel { z-index: 10100; }
        .page-editor .page-web-accordion-head { width: 100%; margin: 0 0 0.85rem; box-sizing: border-box; }
        .page-editor .page-web-accordion-head > .page-web-text-block-v2-fields { display: flex; flex-direction: column; gap: 0; width: 100%; margin: 0; box-sizing: border-box; }
        .page-editor .page-web-accordion[data-accordion-show-subtitle="0"] .page-web-accordion-head .page-web-elements-subtitle { display: none !important; }
        .page-editor .page-web-accordion[data-accordion-show-title="0"] .page-web-accordion-head .page-web-elements-title { display: none !important; }
        .page-editor .page-web-accordion[data-accordion-show-description="0"] .page-web-accordion-head .page-web-elements-description { display: none !important; }
        .page-editor .page-web-accordion-list {
          display: block;
          width: 100%;
          max-width: 48rem;
          margin-inline: auto;
          padding: 0;
          box-sizing: border-box;
        }
        .page-editor .page-web-accordion-item { margin: 0; padding: 0; border: none; border-radius: 0; background: transparent; box-sizing: border-box; }
        .page-editor .page-web-accordion-list > .page-web-accordion-item + .page-web-accordion-item { border-top: 1px solid #e2e8f0; }
        .page-editor .page-web-accordion-item > dt,
        .page-editor .page-web-accordion-item > dd { margin: 0; padding: 0; }
        .page-editor .page-web-accordion-trigger {
          display: flex;
          width: 100%;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          padding: 1rem 0;
          border: none;
          background: transparent;
          text-align: left;
          cursor: pointer;
          font: inherit;
          color: inherit;
          box-sizing: border-box;
        }
        .page-editor .page-web-accordion-question { flex: 1; min-width: 0; margin: 0; }
        .page-editor .page-web-accordion-item textarea.page-web-accordion-question-input,
        .page-editor .page-web-accordion-question .page-web-accordion-question-input,
        .page-editor .page-web-accordion-question .page-web-elements-title-input {
          font-size: 1.1875rem !important;
          line-height: 1.6 !important;
          font-weight: 600 !important;
          letter-spacing: -0.02em !important;
          color: #496db3 !important;
          padding: 0 !important;
        }
        .page-editor .page-web-accordion-icons { display: inline-flex; flex-shrink: 0; align-items: center; width: 1.5rem; height: 1.5rem; color: #0f172a; }
        .page-editor .page-web-accordion-icon { width: 1.5rem; height: 1.5rem; }
        .page-editor .page-web-accordion-panel { display: block; padding: 0 0 1rem; color: #475569; box-sizing: border-box; }
        .page-editor .page-web-accordion-panel[data-collapsed="1"] { display: none !important; }
        .page-editor .page-web-accordion-panel .page-web-elements-description-input {
          width: 100% !important;
          max-width: 100% !important;
          min-height: 1.25em;
          color: #475569 !important;
          overflow: visible;
        }
        .page-editor .page-web-accordion .page-web-elements-field-row > textarea.page-web-accordion-question-input,
        .page-editor .page-web-accordion .page-web-elements-field-row > textarea.page-web-accordion-answer-input {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
        }
        .page-editor .page-web-text-block-menu-element.page-web-text-block-v2-field-toggle {
          display: flex !important;
          flex-direction: row;
          flex-wrap: nowrap;
          align-items: center;
          white-space: nowrap;
        }
        .page-editor .page-web-text-block-v2-field-toggle[aria-checked="true"] .page-web-text-block-v2-field-toggle-box {
          border-color: #496db3;
          background-color: #496db3;
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12);
        }
        .page-editor .page-web-text-block-v2-field-toggle[aria-checked="true"] .page-web-text-block-v2-field-toggle-box::after {
          content: "";
          display: block;
          width: 4px;
          height: 8px;
          border: solid #fff;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg) translate(-0.5px, -1px);
        }
        .page-editor .page-web-text-block-v2-field-toggle:focus-visible {
          outline: 2px solid #496db3;
          outline-offset: 2px;
        }
        .page-editor .page-web-text-block-v2-fields { display: flex; flex-direction: column; gap: 0; margin: 0; box-sizing: border-box; width: 100%; }
        .page-editor .page-web-elements-announcement {
          display: block;
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
        }
        .page-editor .page-web-elements-announcement-row {
          display: block;
          width: 100%;
          margin: 0;
          padding: 0.25rem 0;
          box-sizing: border-box;
        }
        .page-editor .page-web-elements-field-row {
          display: block;
          width: 100%;
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          text-align: left;
        }
        .page-editor .page-web-elements-announcement-input-shell {
          display: block;
          width: 100%;
          min-height: calc(1.5em + 0.35rem);
          box-sizing: border-box;
          padding: 0.15rem 0;
          text-align: inherit;
          background: transparent;
          border: none;
          cursor: text;
        }
        .page-editor .page-web-elements-announcement-strip {
          display: inline-flex;
          flex-wrap: nowrap;
          align-items: center;
          gap: 0.35rem 0.12rem;
          width: max-content;
          max-width: 100%;
          box-sizing: border-box;
          vertical-align: baseline;
          padding: 0.18em 0.6em;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 9999px;
        }
        .page-editor .page-web-elements-announcement-strip:has(.page-web-elements-announcement-input[contenteditable="true"]:focus) {
          box-shadow: var(--page-editor-focus-shadow);
          transition: box-shadow 0.12s ease;
        }
        .page-editor .page-web-elements-announcement-learn-more {
          display: inline-flex;
          align-items: center;
          flex-shrink: 0;
          margin: 0;
          padding: 0;
          border: none;
          font-size: 1rem;
          line-height: 1.5;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: #496db3;
          cursor: pointer;
          user-select: none;
          -webkit-user-select: none;
          transition: color 0.12s ease;
        }
        .page-editor .page-web-elements-announcement-learn-more:hover {
          color: #b91c1c;
        }
        .page-editor .page-web-elements-subtitle,
        .page-editor .page-web-elements-title,
        .page-editor .page-web-elements-title2,
        .page-editor .page-web-elements-description,
        .page-editor .page-web-elements-button,
        .page-editor .page-web-elements-button2 {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
        }
        .page-editor .page-web-elements-actions {
          display: block;
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
          margin: 0.4rem 0 0;
          padding: 0;
          text-align: left;
        }
        .page-editor .page-web-elements-actions-cluster {
          display: inline-flex;
          flex-direction: row;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.5rem;
          max-width: 100%;
          min-width: 0;
          box-sizing: border-box;
          vertical-align: baseline;
        }
        .page-editor .page-web-elements-actions .page-web-elements-button,
        .page-editor .page-web-elements-actions .page-web-elements-button2 {
          width: auto;
          flex: 0 0 auto;
          max-width: 100%;
        }
        .page-editor .page-web-cover-inner > .page-web-elements-actions .page-web-elements-button,
        .page-editor .page-web-cover-inner > .page-web-elements-actions .page-web-elements-button2 {
          width: auto;
          max-width: 100%;
          align-self: inherit;
        }
        .page-editor .page-web-elements-actions .page-web-elements-cta-wrap {
          margin: 0;
        }
        .page-editor .page-web-elements-title-input,
        .page-editor .page-web-elements-title2-input,
        .page-editor .page-web-elements-subtitle-input {
          display: inline-block;
          min-width: 0;
          width: max-content;
          max-width: 100%;
          box-sizing: border-box;
          margin: 0;
          font: inherit;
          color: #0f172a;
          background: transparent;
          border: none;
          border-radius: 0;
          padding: 0.25rem 0.45rem;
          outline: none;
          box-shadow: none;
          appearance: none;
          -webkit-appearance: none;
          resize: none;
          overflow: hidden;
          vertical-align: top;
          white-space: pre-wrap;
          word-break: break-word;
          overflow-wrap: anywhere;
        }
        .page-editor .page-web-elements-subtitle-input {
          font-size: 1rem;
          font-weight: 600;
          line-height: 1.2;
          color: #b91c1c;
        }
        .page-editor .page-web-elements-title-input {
          padding-top: 0;
          padding-bottom: 0.25rem;
          font-size: var(--site-blue-title-fs) !important;
          font-weight: 600;
          line-height: var(--site-blue-title-lh) !important;
          letter-spacing: -0.02em;
          color: #496db3;
          text-wrap: wrap;
        }
        .page-editor .page-web-accordion-item .page-web-accordion-question textarea,
        .page-editor .page-web-accordion-item textarea.page-web-accordion-question-input {
          font-size: 1.1875rem !important;
          line-height: 1.6 !important;
          font-weight: 600 !important;
          letter-spacing: -0.02em !important;
          color: #496db3 !important;
          padding: 0 !important;
        }
        .page-editor .page-web-elements-title2-input {
          font-size: 1rem;
          font-weight: 600;
          line-height: 1.2;
          color: #0f172a;
        }
        .page-editor .page-web-elements-description-input {
          display: inline-block;
          min-width: 0;
          width: max-content;
          max-width: 100%;
          box-sizing: border-box;
          margin: 0;
          padding: 0.25rem 0.45rem;
          font: inherit;
          font-size: 1rem;
          line-height: 1.5;
          color: #475569;
          background: transparent;
          border: none;
          border-radius: 0;
          outline: none;
          box-shadow: none;
          appearance: none;
          -webkit-appearance: none;
          resize: none;
          overflow: hidden;
          vertical-align: top;
          white-space: pre-wrap;
          word-break: break-word;
          overflow-wrap: anywhere;
        }
        .page-editor .page-web-elements-field-row[style*="text-align: justify"] textarea.page-web-elements-subtitle-input,
        .page-editor .page-web-elements-field-row[style*="text-align: justify"] textarea.page-web-elements-title-input,
        .page-editor .page-web-elements-field-row[style*="text-align: justify"] textarea.page-web-elements-title2-input,
        .page-editor .page-web-elements-field-row[style*="text-align: justify"] textarea.page-web-elements-description-input,
        .page-editor textarea.page-web-elements-subtitle-input[style*="text-align: justify"],
        .page-editor textarea.page-web-elements-title-input[style*="text-align: justify"],
        .page-editor textarea.page-web-elements-title2-input[style*="text-align: justify"],
        .page-editor textarea.page-web-elements-description-input[style*="text-align: justify"] {
          width: 100% !important;
          max-width: 100% !important;
          text-align: justify !important;
          -webkit-hyphens: auto;
          hyphens: auto;
          text-wrap: wrap;
          word-break: normal;
          overflow-wrap: break-word;
        }
        .page-editor .page-editor-table td[data-cell-align="justify"],
        .page-editor .page-editor-table[data-table-align="justify"] td {
          text-align: justify !important;
          -webkit-hyphens: auto;
          hyphens: auto;
        }
        .page-editor .page-web-feature-grid-message .page-web-elements-title2-input.page-web-feature-grid-message-title {
          color: var(--feature-grid-message-text);
        }
        .page-editor .page-web-feature-grid-message textarea.page-web-elements-description-input.page-web-feature-grid-message-body {
          color: var(--feature-grid-message-text);
        }
        .page-editor .page-web-elements-cta-wrap {
          margin: 0.4rem 0 0;
          padding: 0;
          max-width: 100%;
          box-sizing: border-box;
        }
        .page-editor .page-web-elements-cta-button,
        .page-editor .page-web-elements-cta-button-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
          margin: 0;
          padding: 0.65rem 1.35rem;
          font-size: 1.0625rem;
          font-weight: 600;
          line-height: 1.3;
          text-decoration: none;
          border-radius: 0.625rem;
          cursor: pointer;
          user-select: none;
          -webkit-user-select: none;
          transition: background-color 0.12s ease, color 0.12s ease, border-color 0.12s ease;
        }
        .page-editor .page-web-elements-cta-button {
          color: #fff;
          background: #496db3;
          border: 1px solid #3d5fa0;
        }
        .page-editor .page-web-elements-cta-button:hover {
          background: #3d5fa0;
          border-color: #35548f;
        }
        .page-editor .page-web-elements-cta-button-secondary {
          color: #496db3;
          background: #fff;
          border: 1px solid #bfdbfe;
        }
        .page-editor .page-web-elements-cta-button-secondary:hover {
          background: #eff6ff;
          border-color: #93c5fd;
        }
        .page-editor .page-web-elements-announcement-input {
          display: inline-block;
          width: auto;
          min-width: min-content;
          max-width: none;
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          vertical-align: baseline;
          font: inherit;
          font-size: 1rem;
          line-height: 1.5;
          font-weight: 500;
          letter-spacing: -0.02em;
          color: #496db3;
          white-space: pre;
          word-break: normal;
          overflow-wrap: normal;
          background: transparent;
          border: none;
          border-radius: 0;
          outline: none;
          box-shadow: none;
          cursor: text;
        }
        .page-editor .page-web-elements-announcement-strip > .page-web-elements-announcement-input {
          flex: 0 0 auto;
          min-width: auto;
        }
        .page-editor .page-web-elements-announcement-input[data-placeholder-visible="1"]::before,
        .page-editor .page-web-elements-announcement-input:empty::before {
          content: attr(data-placeholder);
          color: rgba(73, 109, 179, 0.42);
          pointer-events: none;
        }
        .page-editor .page-web-elements-announcement-input[contenteditable="true"]:focus {
          background: transparent;
          border: none;
          border-radius: 0;
          box-shadow: none;
        }
        .page-editor .page-web-spacer { width: 100%; margin: 0.5rem 0; border: none; border-radius: 0; background: transparent; box-sizing: border-box; }
        .page-editor .page-web-spacer[data-spacer-size="sm"] { height: 1.5rem; }
        .page-editor .page-web-spacer[data-spacer-size="md"] { height: 2.5rem; }
        .page-editor .page-web-spacer[data-spacer-size="lg"] { height: 4rem; }
        .page-editor .page-web-spacer-toolbar { position: absolute; left: 0.75rem; top: 50%; z-index: 80; width: max-content; pointer-events: auto; user-select: none; -webkit-user-select: none; transform: translateY(-50%); }
        .page-editor .page-web-spacer-menu-trigger { display: flex; width: 28px; height: 28px; align-items: center; justify-content: center; border-radius: 6px; border: 1px solid #cbd5e1; background: rgba(255,255,255,0.95); color: #64748b; cursor: pointer; padding: 0; }
        .page-editor .page-web-spacer-menu-trigger:hover { border-color: #94a3b8; color: #0f172a; background: #fff; }
        .page-editor .page-web-spacer-menu-dots::before { content: "\\22EE"; font-size: 1rem; line-height: 1; }
        .page-editor .page-web-spacer-menu-dropdown { display: none; position: absolute; left: calc(100% + 4px); right: auto; top: 32px; min-width: 11.5rem; padding: 4px; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 10px 24px rgba(15,23,42,0.12); z-index: 90; }
        .page-editor .page-web-spacer-toolbar[data-menu-open="1"] .page-web-spacer-menu-dropdown { display: block; }
        .page-editor .page-web-spacer-menu-size { display: flex; width: 100%; box-sizing: border-box; align-items: center; gap: 8px; text-align: left; padding: 8px 10px; font-size: 13px; font-weight: 500; color: #0f172a; background: transparent; border: none; cursor: pointer; border-radius: 6px; white-space: nowrap; }
        .page-editor .page-web-spacer-menu-size:hover { background: #f1f5f9; }
        .page-editor .page-web-spacer-menu-size-radio { width: 14px; height: 14px; border-radius: 9999px; border: 1.5px solid #94a3b8; box-sizing: border-box; background: #fff; flex-shrink: 0; }
        .page-editor .page-web-spacer-menu-size[aria-checked="true"] .page-web-spacer-menu-size-radio { border-color: #496db3; box-shadow: inset 0 0 0 3px #496db3; }
        .page-editor .page-web-spacer-menu-size-label { flex: 1; min-width: 0; }
        .page-editor .page-web-spacer-menu-sep { height: 1px; margin: 6px 8px; background: #e2e8f0; pointer-events: none; }
        .page-editor .page-web-spacer-menu-delete { display: block; width: 100%; box-sizing: border-box; text-align: left; padding: 8px 10px; font-size: 13px; font-weight: 500; color: #b91c1c; background: transparent; border: none; cursor: pointer; border-radius: 6px; white-space: nowrap; }
        .page-editor .page-web-spacer-menu-delete:hover { background: #fef2f2; }
        .page-editor .page-web-text-block-content { outline: none; }
        .page-editor .page-web-text-block-content > h1,
        .page-editor .page-web-text-block-content > h2,
        .page-editor .page-web-text-block-content > h3,
        .page-editor .page-web-text-block-content > h4,
        .page-editor .page-web-text-block-content > h5,
        .page-editor .page-web-text-block-content > h6 { margin: 0 0 0.55rem; font-size: 1.2rem; line-height: 1.2; color: #0f172a; }
        .page-editor .page-web-text-block-content p:not(.page-web-elements-cta-wrap) { margin: 0 0 0.5rem; color: #475569; line-height: 1.55; }
        .page-editor .page-web-text-block-content p:not(.page-web-elements-cta-wrap):last-child { margin-bottom: 0; }
        .page-editor .page-web-text-block-content p.page-web-elements-cta-wrap { margin: 0.4rem 0 0; color: inherit; line-height: normal; }
        ${getWorkPricingRenderCss(".page-editor")}
        /* Рамка .wtt с радиусом: overflow:hidden обрезает дочерний фон по скруглению; иначе .wrd перекрывает дугу синей обводки по углам. В редакторе — лёгкий padding, чтобы тень фокуса не резалась. */
        .page-editor .page-web-work-pricing .wrc.wse.wtt {
          overflow: hidden;
          box-sizing: border-box;
          padding: 3px;
        }
        .page-editor .page-web-work-pricing .wsp > .page-web-elements.page-web-elements-title { position: relative; z-index: 0; }
        .page-editor .page-web-work-pricing .wsp ul.wrf { position: relative; z-index: 2; }
        .page-editor .page-web-work-pricing .page-web-elements.page-web-elements-title,
        .page-editor .page-web-work-pricing .page-web-elements.page-web-elements-title2,
        .page-editor .page-web-work-pricing .page-web-elements.page-web-elements-subtitle,
        .page-editor .page-web-work-pricing .page-web-elements.page-web-elements-description {
          min-width: 0;
          max-width: 100%;
          box-sizing: border-box;
        }
        .page-editor .page-web-work-pricing .page-web-elements-field-row {
          min-width: 0;
          max-width: 100%;
        }
        .page-editor .page-web-work-pricing textarea.page-web-elements-title-input,
        .page-editor .page-web-work-pricing textarea.page-web-elements-title2-input,
        .page-editor .page-web-work-pricing textarea.page-web-elements-subtitle-input {
          display: inline-block;
          width: max-content;
          min-width: 0;
          max-width: 100%;
          box-sizing: border-box;
        }
        .page-editor .page-web-work-pricing textarea.page-web-elements-description-input {
          display: inline-block;
          width: max-content;
          min-width: 0;
          max-width: 100%;
          box-sizing: border-box;
        }
        .page-editor .page-web-text-media-col { min-height: 210px; border-radius: 12px; border: 1px solid #e2e8f0; background: #fff; padding: 1rem; box-sizing: border-box; outline: none; }
        .page-editor .page-web-text-media-col--media { background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%); display: flex; align-items: center; justify-content: center; text-align: center; color: #64748b; }
        .page-editor .page-web-text-media-col h3 { margin: 0 0 0.55rem; font-size: 1.2rem; line-height: 1.2; color: #0f172a; }
        .page-editor .page-web-text-media-col p { margin: 0; color: #475569; line-height: 1.55; }
        .page-editor .page-web-text-media-placeholder { color: #64748b; font-size: 0.9rem; }
        @media (max-width: 1205px) {
          .page-editor .page-web-text-media { grid-template-columns: 1fr; }
          .page-editor .page-web-text-media-col { min-height: 160px; }
        }
        .page-editor .page-web-carousel { position: relative; width: 100%; max-width: 100%; min-width: 0; margin: 1rem 0; padding-top: 2.25rem; box-sizing: border-box; display: flex; flex-direction: row; flex-wrap: nowrap; align-items: center; gap: 10px; background: transparent; border: none; overflow: visible; user-select: none; -webkit-user-select: none; min-height: 0; caret-color: transparent; }
        .page-editor .page-web-carousel-viewport,
        .page-editor .page-web-carousel-strip,
        .page-editor .page-web-carousel-slide,
        .page-editor .page-web-carousel-slide-inner,
        .page-editor .page-web-carousel-placeholder,
        .page-editor .page-web-carousel-img { user-select: none; -webkit-user-select: none; caret-color: transparent; cursor: default; }
        .page-editor .page-web-carousel-toolbar { position: absolute; left: 0; top: 0; right: auto; z-index: 100; width: max-content; pointer-events: auto; }
        .page-editor .page-web-carousel-menu-trigger { display: flex; width: 28px; height: 28px; align-items: center; justify-content: center; border-radius: 6px; border: 1px solid #cbd5e1; background: rgba(255,255,255,0.95); color: #64748b; cursor: pointer; padding: 0; }
        .page-editor .page-web-carousel-menu-trigger:hover { border-color: #94a3b8; color: #0f172a; background: #fff; }
        .page-editor .page-web-carousel-menu-dots::before { content: "\\22EE"; font-size: 1rem; line-height: 1; }
        .page-editor .page-web-carousel-menu-dropdown { display: none; position: absolute; left: calc(100% + 4px); right: auto; top: 32px; min-width: 12rem; padding: 4px 0; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 10px 24px rgba(15,23,42,0.12); z-index: 110; }
        .page-editor .page-web-carousel-toolbar[data-menu-open="1"] .page-web-carousel-menu-dropdown { display: block; }
        .page-editor .page-web-carousel-menu-sub { position: relative; }
        .page-editor .page-web-carousel-menu-sub-trigger { display: flex; width: 100%; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 12px; font-size: 13px; font-weight: 500; color: #0f172a; background: transparent; border: none; cursor: pointer; border-radius: 4px; text-align: left; }
        .page-editor .page-web-carousel-menu-sub-trigger:hover { background: #f1f5f9; }
        .page-editor .page-web-carousel-menu-sub-label { flex: 1; min-width: 0; }
        .page-editor .page-web-carousel-menu-chevron { flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; width: 1.25rem; color: #64748b; font-size: 1rem; line-height: 1; transition: transform 0.15s ease; }
        .page-editor .page-web-carousel-menu-chevron::before { content: "\\203A"; }
        .page-editor .page-web-carousel-toolbar[data-menu-open="1"] .page-web-carousel-menu-sub[data-submenu-open="1"] > .page-web-carousel-menu-sub-trigger .page-web-carousel-menu-chevron { transform: rotate(90deg); }
        .page-editor .page-web-carousel-menu-sub-panel { display: none; position: absolute; left: calc(100% + 4px); top: 0; padding: 6px; min-width: 12rem; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 10px 24px rgba(15,23,42,0.12); z-index: 120; }
        .page-editor .page-web-carousel-toolbar[data-menu-open="1"] .page-web-carousel-menu-sub[data-submenu-open="1"] > .page-web-carousel-menu-sub-panel { display: block; }
        .page-editor .page-web-carousel-menu-sub[data-submenu-drop="up"] > .page-web-carousel-menu-sub-panel { top: auto; bottom: 0; }
        .page-editor .page-web-carousel-menu-sub[data-submenu-drop="down"] > .page-web-carousel-menu-sub-panel { top: 0; bottom: auto; }
        .page-editor .page-web-carousel-menu-image-type { display: flex; width: 100%; box-sizing: border-box; align-items: center; gap: 8px; text-align: left; padding: 8px 10px; font-size: 13px; font-weight: 500; color: #0f172a; background: transparent; border: none; cursor: pointer; border-radius: 6px; white-space: nowrap; }
        .page-editor .page-web-carousel-menu-image-type:hover { background: #f1f5f9; }
        .page-editor .page-web-carousel-menu-image-type-radio { width: 14px; height: 14px; border-radius: 9999px; border: 1.5px solid #94a3b8; box-sizing: border-box; background: #fff; flex-shrink: 0; }
        .page-editor .page-web-carousel-menu-image-type[aria-checked="true"] .page-web-carousel-menu-image-type-radio { border-color: #496db3; box-shadow: inset 0 0 0 3px #496db3; }
        .page-editor .page-web-carousel-menu-image-type-label { flex: 1; min-width: 0; }
        .page-editor .page-web-carousel-menu-fullscreen,
        .page-editor .page-web-carousel-menu-upload-slide,
        .page-editor .page-web-carousel-menu-add-slide,
        .page-editor .page-web-carousel-menu-remove-slide { display: block; width: 100%; box-sizing: border-box; text-align: left; padding: 8px 12px; font-size: 13px; font-weight: 500; color: #0f172a; background: transparent; border: none; cursor: pointer; border-radius: 4px; white-space: nowrap; }
        .page-editor .page-web-carousel-menu-fullscreen:hover,
        .page-editor .page-web-carousel-menu-upload-slide:hover,
        .page-editor .page-web-carousel-menu-add-slide:hover,
        .page-editor .page-web-carousel-menu-remove-slide:hover { background: #f1f5f9; }
        .page-editor .page-web-carousel-menu-sep { height: 1px; margin: 6px 8px; background: #e2e8f0; pointer-events: none; }
        .page-editor .page-web-carousel-menu-delete { display: block; width: 100%; box-sizing: border-box; text-align: left; padding: 8px 12px; font-size: 13px; font-weight: 500; color: #b91c1c; background: transparent; border: none; cursor: pointer; border-radius: 4px; white-space: nowrap; }
        .page-editor .page-web-carousel-menu-delete:hover { background: #fef2f2; }
        .page-editor .page-web-carousel-arrow { position: relative; flex-shrink: 0; z-index: 1; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 9999px; border: 1px solid #cbd5e1; background: #fff; color: #334155; font-size: 1.25rem; line-height: 1; cursor: pointer; padding: 0; box-shadow: 0 1px 4px rgba(15,23,42,0.08); }
        .page-editor .page-web-carousel-arrow:hover { background: #f8fafc; color: #0f172a; border-color: #94a3b8; }
        .page-editor .page-web-carousel-arrow:disabled { opacity: 0.45; cursor: not-allowed; background: #f8fafc; color: #94a3b8; border-color: #e2e8f0; box-shadow: none; }
        .page-editor .page-web-carousel-prev { order: 1; }
        .page-editor .page-web-carousel-next { order: 3; }
        .page-editor .page-web-carousel-viewport { order: 2; position: relative; z-index: 0; flex: 1 1 0; min-width: 0; width: 100%; max-width: 100%; margin: 0; box-sizing: border-box; border-radius: 8px; background: transparent; min-height: 160px; display: grid; grid-auto-flow: column; grid-auto-columns: calc((100% - 16px) / 3); gap: 8px; overflow-x: auto; overflow-y: visible; scrollbar-width: thin; scrollbar-color: rgba(100, 116, 139, 0.45) transparent; }
        .page-editor .page-web-carousel-viewport:not(:has(.page-web-carousel-strip)) { scroll-snap-type: x mandatory; scroll-snap-stop: always; -webkit-overflow-scrolling: touch; }
        .page-editor .page-web-carousel-viewport:has(.page-web-carousel-strip) { display: block; padding: 14px 0; container-type: inline-size; container-name: web-carousel-vp; overflow-x: hidden; overflow-y: visible; -webkit-overflow-scrolling: touch; scroll-snap-type: none; }
        /* --carousel-inner-px = clientWidth − padding (ставит sync): 3×колонка + 2×gap 8px = ровно видимая ширина. 100cqi — запас, часто ≠ той же области. */
        .page-editor .page-web-carousel-strip { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, var(--carousel-slide-px, calc((max(0px, var(--carousel-inner-px, 100cqi)) - 16px) / 3))); align-items: stretch; gap: 8px; width: max-content; min-width: 100%; box-sizing: border-box; min-height: 0; }
        .page-editor .page-web-carousel[data-carousel-aspect="vertical"] .page-web-carousel-viewport,
        .page-editor .page-web-carousel[data-carousel-aspect="square"] .page-web-carousel-viewport,
        .page-editor .page-web-carousel[data-carousel-aspect="a4"] .page-web-carousel-viewport { grid-auto-columns: calc((100% - 24px) / 4); }
        .page-editor .page-web-carousel[data-carousel-aspect="vertical"] .page-web-carousel-strip,
        .page-editor .page-web-carousel[data-carousel-aspect="square"] .page-web-carousel-strip,
        .page-editor .page-web-carousel[data-carousel-aspect="a4"] .page-web-carousel-strip { grid-auto-columns: minmax(0, var(--carousel-slide-px, calc((max(0px, var(--carousel-inner-px, 100cqi)) - 24px) / 4))); }
        @media (max-width: 1023px) {
          .page-editor .page-web-carousel-viewport { grid-auto-columns: calc((100% - 8px) / 2); }
          .page-editor .page-web-carousel-strip { grid-auto-columns: minmax(0, var(--carousel-slide-px, calc((max(0px, var(--carousel-inner-px, 100cqi)) - 8px) / 2))); }
          .page-editor .page-web-carousel[data-carousel-aspect="vertical"] .page-web-carousel-viewport,
          .page-editor .page-web-carousel[data-carousel-aspect="square"] .page-web-carousel-viewport,
          .page-editor .page-web-carousel[data-carousel-aspect="a4"] .page-web-carousel-viewport { grid-auto-columns: calc((100% - 16px) / 3); }
          .page-editor .page-web-carousel[data-carousel-aspect="vertical"] .page-web-carousel-strip,
          .page-editor .page-web-carousel[data-carousel-aspect="square"] .page-web-carousel-strip,
          .page-editor .page-web-carousel[data-carousel-aspect="a4"] .page-web-carousel-strip { grid-auto-columns: minmax(0, var(--carousel-slide-px, calc((max(0px, var(--carousel-inner-px, 100cqi)) - 16px) / 3))); }
        }
        @media (max-width: 1205px) {
          .page-editor .page-web-carousel-viewport { grid-auto-columns: 100%; }
          .page-editor .page-web-carousel-strip { grid-auto-columns: minmax(0, var(--carousel-slide-px, max(0px, var(--carousel-inner-px, 100cqi)))); }
          .page-editor .page-web-carousel[data-carousel-aspect="vertical"] .page-web-carousel-viewport,
          .page-editor .page-web-carousel[data-carousel-aspect="square"] .page-web-carousel-viewport,
          .page-editor .page-web-carousel[data-carousel-aspect="a4"] .page-web-carousel-viewport { grid-auto-columns: calc((100% - 8px) / 2); }
          .page-editor .page-web-carousel[data-carousel-aspect="vertical"] .page-web-carousel-strip,
          .page-editor .page-web-carousel[data-carousel-aspect="square"] .page-web-carousel-strip,
          .page-editor .page-web-carousel[data-carousel-aspect="a4"] .page-web-carousel-strip { grid-auto-columns: minmax(0, var(--carousel-slide-px, calc((max(0px, var(--carousel-inner-px, 100cqi)) - 8px) / 2))); }
        }
        .page-editor .page-web-carousel-slide { position: relative; z-index: 2; box-sizing: border-box; padding: 0; }
        .page-editor .page-web-carousel-viewport:not(:has(.page-web-carousel-strip)) .page-web-carousel-slide { min-width: 0; scroll-snap-align: start; scroll-snap-stop: always; width: auto; max-width: none; }
        .page-editor .page-web-carousel-strip .page-web-carousel-slide { min-width: 0; width: 100%; max-width: none; scroll-snap-align: start; scroll-snap-stop: always; }
        .page-editor .page-web-carousel-slide[data-carousel-active="1"] { position: relative; border-radius: 8px; box-shadow: none; }
        .page-editor .page-web-carousel-slide[data-carousel-active="1"] .page-web-carousel-slide-inner::after { content: ""; position: absolute; inset: 0; border-radius: 6px; box-shadow: inset 0 0 0 2px #496db3; pointer-events: none; z-index: 2; }
        .page-editor .page-web-carousel-slide-inner { position: relative; z-index: 3; width: 100%; aspect-ratio: 16 / 9; min-height: 0; border-radius: 6px; overflow: hidden; background: #e2e8f0; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 2px rgba(15,23,42,0.06), 0 4px 12px rgba(15,23,42,0.08), 0 0 0 1px rgba(15,23,42,0.06); }
        .page-editor .page-web-carousel[data-carousel-aspect="vertical"] .page-web-carousel-slide-inner { aspect-ratio: 9 / 16; }
        .page-editor .page-web-carousel[data-carousel-aspect="square"] .page-web-carousel-slide-inner { aspect-ratio: 1 / 1; }
        .page-editor .page-web-carousel[data-carousel-aspect="a4"] .page-web-carousel-slide-inner { aspect-ratio: 210 / 297; }
        .page-editor .page-web-carousel[data-carousel-aspect="vertical"] .page-web-carousel-menu-image-type[data-set-carousel-aspect="vertical"],
        .page-editor .page-web-carousel[data-carousel-aspect="horizontal"] .page-web-carousel-menu-image-type[data-set-carousel-aspect="horizontal"],
        .page-editor .page-web-carousel:not([data-carousel-aspect]) .page-web-carousel-menu-image-type[data-set-carousel-aspect="horizontal"],
        .page-editor .page-web-carousel[data-carousel-aspect="square"] .page-web-carousel-menu-image-type[data-set-carousel-aspect="square"],
        .page-editor .page-web-carousel[data-carousel-aspect="a4"] .page-web-carousel-menu-image-type[data-set-carousel-aspect="a4"] { background: #f1f5f9; }
        .page-editor .page-web-carousel-slide-inner:has(.page-web-carousel-img) { background: transparent; }
        .page-editor .page-web-carousel-placeholder { position: relative; z-index: 0; padding: 1rem; text-align: center; font-size: 13px; color: #64748b; }
        .page-editor .page-web-carousel-slide-inner:has(.page-web-carousel-img) .page-web-carousel-placeholder { display: none; }
        .page-editor .page-web-carousel-img { position: absolute; inset: 0; z-index: 1; display: block; width: 100%; height: 100%; object-fit: cover; object-position: center; margin: 0; border-radius: 6px; }
        .page-editor .page-web-carousel-viewport::-webkit-scrollbar { height: 5px; width: 5px; }
        .page-editor .page-web-carousel-viewport::-webkit-scrollbar-track { background: transparent; }
        .page-editor .page-web-carousel-viewport::-webkit-scrollbar-thumb { background-color: rgba(100, 116, 139, 0.35); border-radius: 999px; }
        .page-editor .page-web-carousel-viewport::-webkit-scrollbar-thumb:hover { background-color: rgba(71, 85, 105, 0.5); }
        .editor-ui-scale-75 { zoom: 0.8; }
        /* Editor: larger blue headings and consistent red->blue spacing in all blocks */
        .page-editor {
          --site-blue-title-fs: 2.25rem;
          --site-blue-title-lh: 2.25rem;
          --site-red-blue-gap: -0.375rem;
          --page-editor-focus-pad-inline: 0.2em;
          --page-editor-focus-pad-block: 0.2em;
          --page-editor-focus-margin-inline: -0.2em;
          --page-editor-focus-margin-block: -0.2em;
          --page-editor-focus-radius: 9px;
          --page-editor-focus-shadow:
            0 0 0 6px rgba(73, 109, 179, 0.12),
            0 0 16px rgba(73, 109, 179, 0.3),
            0 0 26px rgba(73, 109, 179, 0.22);
        }
        @media (min-width: 640px) {
          .page-editor {
            --site-blue-title-fs: 3.5rem;
            --site-blue-title-lh: 1;
            --site-red-blue-gap: -0.5rem;
          }
        }
        .page-editor .page-web-cover .page-web-cover-inner > .page-web-elements.page-web-elements-title,
        .page-editor .page-web-cover .page-web-cover-inner > .page-web-elements.page-web-elements-title textarea.page-web-elements-title-input,
        .page-editor .page-web-feature-grid-head .page-web-elements-title-input,
        .page-editor .page-web-timeline .page-web-timeline-heading,
        .page-editor .page-web-timeline-head .page-web-text-block-v2-fields .page-web-elements.page-web-elements-title textarea.page-web-elements-title-input,
        .page-editor .page-web-work-pricing .page-web-elements-title .page-web-elements-title-input,
        .page-editor .page-web-work-pricing .wsx,
        .page-editor .page-web-work-pricing .wsy,
        .page-editor .page-web-text-block h3,
        .page-editor .page-web-text-media .page-web-text-media-col h3 {
          font-size: var(--site-blue-title-fs) !important;
          line-height: var(--site-blue-title-lh) !important;
        }
        .page-editor .page-web-feature-grid-head > .page-web-elements-subtitle + .page-web-elements-title,
        .page-editor .page-web-timeline-subtitle + .page-web-timeline-heading,
        .page-editor .page-web-timeline-head > .page-web-text-block-v2-fields > .page-web-elements.page-web-elements-subtitle + .page-web-elements.page-web-elements-title {
          margin-top: var(--site-red-blue-gap, -0.375rem) !important;
        }
        .page-editor .page-web-feature-grid-head > .page-web-elements-title {
          position: relative;
          z-index: 1;
        }
        /* В textarea line-height: 1 (как у синего заголовка сайта) даёт лишний верх и «провал» строки вниз; blur/focus совпадают с блоком ниже. */
        .page-editor .page-web-cover .page-web-cover-inner > .page-web-elements.page-web-elements-title textarea.page-web-elements-title-input {
          line-height: 1 !important;
          padding: 0.15rem 0.45rem !important;
          text-wrap: wrap !important;
        }
        .page-editor .page-web-feature-grid-head .page-web-elements.page-web-elements-title textarea.page-web-elements-title-input,
        .page-editor .page-web-work-pricing .page-web-elements.page-web-elements-title textarea.page-web-elements-title-input,
        .page-editor .page-web-elements.page-web-elements-title textarea.page-web-elements-title-input {
          line-height: 1.2 !important;
          padding: 0.15rem 0.45rem !important;
          text-wrap: wrap !important;
        }
        /* В article-text заголовок должен быть по высоте как обычный текст, не как site-blue заголовок. */
        .page-editor .page-web-article-text .page-web-elements.page-web-elements-title textarea.page-web-elements-title-input,
        .page-editor .page-web-article-text .page-web-elements.page-web-elements-title textarea.page-web-elements-title-input[data-editor-focus-target="1"] {
          font-size: 1.16rem !important;
          line-height: 1.6 !important;
          font-weight: 700 !important;
          padding: 0.25rem 0.45rem !important;
        }
        ${getPageEditorWebToolbarCss()}
      `}</style>
      <div
        className="flex min-h-screen transition-[filter] duration-150"
        style={carouselPreviewSession ? { filter: "blur(8px)" } : undefined}
      >
        <AdminSidebar />

        <div className="flex min-h-0 flex-1 flex-col lg:ml-64 h-screen overflow-hidden">
          <AdminTopBar />

          <main className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-6 lg:px-6">
            <div className="flex min-h-0 flex-1 flex-col gap-4 rounded-2xl border border-slate-200 bg-white py-6 px-4 sm:px-5 lg:px-6">
              <div className="flex shrink-0 items-center justify-between">
                <h1 className="text-sm font-semibold text-slate-900">
                  {title || "Без названия"}
                </h1>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                       if (!Number.isFinite(pageId)) return;
                       window.open(`/admin/page_show/${pageId}`, "_blank", "noopener,noreferrer");
                    }}
                     disabled={!Number.isFinite(pageId)}
                    className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Просмотр
                  </button>
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving || loading}
                  className="inline-flex items-center rounded-full bg-[#496db3] px-4 py-1.5 text-xs font-medium text-white hover:brightness-105 disabled:opacity-60"
                >
                  {saving ? "Сохранение…" : "Сохранить"}
                </button>
                </div>
              </div>

              {error ? (
                <div className="shrink-0 space-y-2 text-xs text-red-600">
                  <p>{error}</p>
                  {pageMissingInDb ? (
                    <p>
                      <Link
                        href="/admin/page"
                        className="font-medium text-[#496db3] underline decoration-[#496db3]/40 underline-offset-2 hover:decoration-[#496db3]"
                      >
                        Перейти к списку страниц
                      </Link>
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="editor-ui-scale-75 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div
                  ref={toolbarRef}
                  className="relative z-30 flex shrink-0 flex-wrap items-center gap-1.5 border-b border-slate-200 bg-white p-2"
                >
                  {!PAGE_EDITOR_FORMAT_TOOLBAR_MINIMAL && (
                    <>
                      <button
                        type="button"
                        className={`inline-flex h-8 w-8 items-center justify-center rounded transition-colors hover:text-[#496db3] ${
                          isBold ? "bg-slate-200 text-[#496db3]" : "text-slate-600"
                        }`}
                        onMouseDown={(e) => {
                          saveSelectionFromEditor();
                          e.preventDefault();
                        }}
                        onClick={() => runCommand("bold")}
                        aria-label="Жирный"
                      >
                        <BoldIcon className={ICON_SIZE} />
                      </button>
                      <button
                        type="button"
                        className={`inline-flex h-8 w-8 items-center justify-center rounded transition-colors hover:text-[#496db3] ${
                          isItalic ? "bg-slate-200 text-[#496db3]" : "text-slate-600"
                        }`}
                        onMouseDown={(e) => {
                          saveSelectionFromEditor();
                          e.preventDefault();
                        }}
                        onClick={() => runCommand("italic")}
                        aria-label="Курсив"
                      >
                        <ItalicIcon className={ICON_SIZE} />
                      </button>
                      <button
                        type="button"
                        className={`inline-flex h-8 w-8 items-center justify-center rounded transition-colors hover:text-[#496db3] ${
                          isUnderline ? "bg-slate-200 text-[#496db3]" : "text-slate-600"
                        }`}
                        onMouseDown={(e) => {
                          saveSelectionFromEditor();
                          e.preventDefault();
                        }}
                        onClick={() => runCommand("underline")}
                        aria-label="Подчеркнутый"
                      >
                        <UnderlineIcon className={ICON_SIZE} />
                      </button>

                      <div className="h-6 w-px shrink-0 bg-slate-200" aria-hidden="true" />
                    </>
                  )}

                  {!PAGE_EDITOR_FORMAT_TOOLBAR_MINIMAL && (
                    <>
                      <div ref={fontSizeDropdownRef} className="relative">
                        <button
                          type="button"
                          className="flex h-8 min-w-[4rem] items-center justify-between gap-1 rounded border border-slate-200 bg-white px-2 text-xs text-slate-700 transition-colors hover:border-slate-300"
                          onMouseDown={(e) => {
                            saveSelectionFromEditor();
                            e.preventDefault();
                          }}
                          onClick={() => setFontSizeOpen((v) => !v)}
                          aria-label="Размер шрифта"
                          aria-expanded={fontSizeOpen}
                        >
                          <span className="truncate">
                            {FONT_SIZES.find((s) => s.value === fontSize)?.label ?? "16px"}
                          </span>
                          <ChevronDownIcon
                            className={`${ICON_SIZE} shrink-0 text-slate-500 transition-transform ${fontSizeOpen ? "rotate-180" : ""}`}
                          />
                        </button>
                        {fontSizeOpen && (
                          <div
                            className="absolute left-0 top-full z-10 mt-1 min-w-full rounded border border-slate-200 bg-white py-1 shadow-lg"
                            role="listbox"
                          >
                            {FONT_SIZES.map(({ value, label }) => (
                              <button
                                key={value}
                                type="button"
                                role="option"
                                aria-selected={fontSize === value}
                                className={`w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100 ${
                                  fontSize === value ? "bg-slate-100 text-[#496db3]" : ""
                                }`}
                                onMouseDown={(e) => {
                                  saveSelectionFromEditor();
                                  e.preventDefault();
                                }}
                                onClick={() => {
                                  runCommand("fontSize", value);
                                  setFontSizeOpen(false);
                                }}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div ref={fontColorDropdownRef} className="relative">
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-200 bg-white transition-colors hover:border-slate-300"
                          onMouseDown={(e) => {
                            saveSelectionFromEditor();
                            e.preventDefault();
                          }}
                          onClick={() => setFontColorOpen((v) => !v)}
                          aria-label="Цвет шрифта"
                          aria-expanded={fontColorOpen}
                        >
                          <span className="h-4 w-4 rounded border border-slate-200" style={{ backgroundColor: fontColor }} />
                        </button>
                        {fontColorOpen && (
                          <div
                            className="absolute left-0 top-full z-10 mt-1 rounded border border-slate-200 bg-white p-2 shadow-lg"
                            style={{ width: 112, minWidth: 112 }}
                            role="listbox"
                          >
                            <div className="grid grid-cols-4 gap-1.5">
                              {BANNERS_FONT_COLOR_PRESETS.map((hex) => {
                                const isSelected = fontColor.toLowerCase() === hex.toLowerCase();
                                const luminance = (() => {
                                  const r = parseInt(hex.slice(1, 3), 16);
                                  const g = parseInt(hex.slice(3, 5), 16);
                                  const b = parseInt(hex.slice(5, 7), 16);
                                  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
                                })();
                                const iconLight = luminance < 0.6;
                                return (
                                  <button
                                    key={`font-color-${hex}`}
                                    type="button"
                                    role="option"
                                    aria-selected={isSelected}
                                    title={hex}
                                    className={`flex aspect-square w-full items-center justify-center rounded border border-slate-200 transition-colors hover:ring-2 hover:ring-[#496db3] hover:ring-offset-1 ${
                                      isSelected ? "ring-2 ring-[#496db3] ring-offset-1" : ""
                                    }`}
                                    style={{ backgroundColor: hex }}
                                    onMouseDown={(e) => {
                                      saveSelectionFromEditor();
                                      e.preventDefault();
                                    }}
                                    onClick={() => {
                                      runCommand("foreColor", hex);
                                      setFontColor(hex);
                                      setFontColorOpen(false);
                                    }}
                                  >
                                    {isSelected && (
                                      <CheckIcon className={`h-3 w-3 ${iconLight ? "text-white drop-shadow-[0_0_1px_rgba(0,0,0,0.5)]" : "text-slate-800"}`} />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="h-6 w-px shrink-0 bg-slate-200" aria-hidden="true" />
                    </>
                  )}

                  <button
                    type="button"
                    className={`inline-flex h-8 w-8 items-center justify-center rounded transition-colors hover:text-[#496db3] ${
                      alignment === "left" ? "bg-slate-200 text-[#496db3]" : "text-slate-600"
                    }`}
                    onMouseDown={(e) => { saveSelectionFromEditor(); e.preventDefault(); }}
                    onClick={() => (isInTable ? applyTableHorizontalAlign("left") : runCommand("justifyLeft"))}
                    aria-label="Выравнивание слева"
                  >
                    <Bars3BottomLeftIcon className={ICON_SIZE} />
                  </button>
                  <button
                    type="button"
                    className={`inline-flex h-8 w-8 items-center justify-center rounded transition-colors hover:text-[#496db3] ${
                      alignment === "center" ? "bg-slate-200 text-[#496db3]" : "text-slate-600"
                    }`}
                    onMouseDown={(e) => { saveSelectionFromEditor(); e.preventDefault(); }}
                    onClick={() => (isInTable ? applyTableHorizontalAlign("center") : runCommand("justifyCenter"))}
                    aria-label="Выравнивание по центру"
                  >
                    <AlignCenterIcon className={ICON_SIZE} />
                  </button>
                  <button
                    type="button"
                    className={`inline-flex h-8 w-8 items-center justify-center rounded transition-colors hover:text-[#496db3] ${
                      alignment === "right" ? "bg-slate-200 text-[#496db3]" : "text-slate-600"
                    }`}
                    onMouseDown={(e) => { saveSelectionFromEditor(); e.preventDefault(); }}
                    onClick={() => (isInTable ? applyTableHorizontalAlign("right") : runCommand("justifyRight"))}
                    aria-label="Выравнивание справа"
                  >
                    <Bars3BottomRightIcon className={ICON_SIZE} />
                  </button>
                  <button
                    type="button"
                    className={`inline-flex h-8 w-8 items-center justify-center rounded transition-colors hover:text-[#496db3] ${
                      alignment === "justify" ? "bg-slate-200 text-[#496db3]" : "text-slate-600"
                    }`}
                    onMouseDown={(e) => { saveSelectionFromEditor(); e.preventDefault(); }}
                    onClick={() => (isInTable ? applyTableHorizontalAlign("justify") : runCommand("justifyFull"))}
                    aria-label="Выравнивание по ширине"
                    title="Выравнивание по ширине"
                  >
                    <AlignJustifyIcon className={ICON_SIZE} />
                  </button>
                  <button
                    type="button"
                    className={`inline-flex h-8 w-8 items-center justify-center rounded transition-colors ${
                      !hyphensApplicable
                        ? "cursor-not-allowed text-slate-300"
                        : hyphensEnabled
                          ? "bg-slate-200 text-[#496db3]"
                          : "text-slate-600 hover:text-[#496db3]"
                    }`}
                    onMouseDown={(e) => {
                      saveSelectionFromEditor();
                      e.preventDefault();
                    }}
                    onClick={() => toggleWebElementsHyphens()}
                    aria-label="Автоперенос по слогам"
                    aria-pressed={hyphensEnabled}
                    disabled={!hyphensApplicable}
                    title="Автоперенос по слогам"
                  >
                    <HyphensAutoIcon className={ICON_SIZE} />
                  </button>
                  {!PAGE_EDITOR_FORMAT_TOOLBAR_MINIMAL && (
                    <>
                      <button
                        type="button"
                        className={`inline-flex h-8 w-8 items-center justify-center rounded transition-colors ${
                          !isInTable && !isInWebCoverContent
                            ? "cursor-not-allowed text-slate-300"
                            : (isInTable ? tableVerticalAlign : coverVerticalAlign) === "top"
                              ? "bg-slate-200 text-[#496db3]"
                              : "text-slate-600 hover:text-[#496db3]"
                        }`}
                        onMouseDown={(e) => {
                          saveSelectionFromEditor();
                          e.preventDefault();
                        }}
                        onClick={() => {
                          if (isInTable) applyTableVerticalAlign("top");
                          else if (isInWebCoverContent) applyCoverVerticalAlign("top");
                        }}
                        aria-label="Выравнивание по верху"
                        disabled={!isInTable && !isInWebCoverContent}
                      >
                        <AlignVerticalTopIcon className={ICON_SIZE} />
                      </button>
                      <button
                        type="button"
                        className={`inline-flex h-8 w-8 items-center justify-center rounded transition-colors ${
                          !isInTable && !isInWebCoverContent
                            ? "cursor-not-allowed text-slate-300"
                            : (isInTable ? tableVerticalAlign : coverVerticalAlign) === "middle"
                              ? "bg-slate-200 text-[#496db3]"
                              : "text-slate-600 hover:text-[#496db3]"
                        }`}
                        onMouseDown={(e) => {
                          saveSelectionFromEditor();
                          e.preventDefault();
                        }}
                        onClick={() => {
                          if (isInTable) applyTableVerticalAlign("middle");
                          else if (isInWebCoverContent) applyCoverVerticalAlign("middle");
                        }}
                        aria-label="Выравнивание по центру по высоте"
                        disabled={!isInTable && !isInWebCoverContent}
                      >
                        <AlignVerticalMiddleIcon className={ICON_SIZE} />
                      </button>
                      <button
                        type="button"
                        className={`inline-flex h-8 w-8 items-center justify-center rounded transition-colors ${
                          !isInTable && !isInWebCoverContent
                            ? "cursor-not-allowed text-slate-300"
                            : (isInTable ? tableVerticalAlign : coverVerticalAlign) === "bottom"
                              ? "bg-slate-200 text-[#496db3]"
                              : "text-slate-600 hover:text-[#496db3]"
                        }`}
                        onMouseDown={(e) => {
                          saveSelectionFromEditor();
                          e.preventDefault();
                        }}
                        onClick={() => {
                          if (isInTable) applyTableVerticalAlign("bottom");
                          else if (isInWebCoverContent) applyCoverVerticalAlign("bottom");
                        }}
                        aria-label="Выравнивание по низу"
                        disabled={!isInTable && !isInWebCoverContent}
                      >
                        <AlignVerticalBottomIcon className={ICON_SIZE} />
                      </button>

                      <div className="h-6 w-px shrink-0 bg-slate-200" aria-hidden="true" />

                      <button
                        type="button"
                        className={`inline-flex h-8 w-8 items-center justify-center rounded transition-colors hover:text-[#496db3] ${
                          isUnorderedList ? "bg-slate-200 text-[#496db3]" : "text-slate-600"
                        }`}
                        onMouseDown={(e) => {
                          saveSelectionFromEditor();
                          e.preventDefault();
                        }}
                        onClick={() => runCommand("insertUnorderedList")}
                        aria-label="Маркированный список"
                      >
                        <ListBulletIcon className={ICON_SIZE} />
                      </button>
                      <button
                        type="button"
                        className={`inline-flex h-8 w-8 items-center justify-center rounded transition-colors hover:text-[#496db3] ${
                          isOrderedList ? "bg-slate-200 text-[#496db3]" : "text-slate-600"
                        }`}
                        onMouseDown={(e) => {
                          saveSelectionFromEditor();
                          e.preventDefault();
                        }}
                        onClick={() => runCommand("insertOrderedList")}
                        aria-label="Нумерованный список"
                      >
                        <NumberedListIcon className={ICON_SIZE} />
                      </button>
                    </>
                  )}

                  {!PAGE_EDITOR_FORMAT_TOOLBAR_MINIMAL && (isUnorderedList || isOrderedList) && (
                    <div ref={listStyleDropdownRef} className="relative">
                      <button
                        type="button"
                        className="flex h-8 min-w-[3rem] items-center justify-between gap-1 rounded border border-slate-200 bg-white px-2 text-xs text-slate-700 transition-colors hover:border-slate-300"
                        onMouseDown={(e) => {
                          saveSelectionFromEditor();
                          e.preventDefault();
                        }}
                        onClick={() => {
                          if (!listStyleButtonMousedownRef.current) return;
                          setListStyleOpen((v) => !v);
                        }}
                        aria-label="Стиль маркера"
                        aria-expanded={listStyleOpen}
                      >
                        <span className="flex items-center gap-1 truncate" style={{ color: LIST_COLORS.find((c) => c.value === listColor)?.hex ?? "#000000" }}>
                          {isOrderedList ? (
                            LIST_STYLE_OL.find((s) => s.value === listStyleType)?.label ?? "1."
                          ) : (
                            (() => {
                              const item = LIST_STYLE_UL.find((s) => s.value === listStyleType);
                              const Icon = item?.Icon ?? ListDiscIcon;
                              return <Icon className={ICON_SIZE} />;
                            })()
                          )}
                        </span>
                        <ChevronDownIcon
                          className={`${ICON_SIZE} shrink-0 text-slate-500 transition-transform ${listStyleOpen ? "rotate-180" : ""}`}
                        />
                      </button>
                      {listStyleOpen && (
                        <div
                          className="absolute left-0 top-full z-10 mt-1 rounded border border-slate-200 bg-white p-3 shadow-lg"
                          style={{ width: 140, minWidth: 140 }}
                          role="listbox"
                        >
                          {(() => {
                            const iconColor = LIST_COLORS.find((c) => c.value === listColor)?.hex ?? "#000000";
                            return (
                              <div className="grid grid-cols-3 gap-2" style={{ width: 104 }}>
                                {isOrderedList
                                  ? LIST_STYLE_OL.map(({ value, label }) => (
                                      <button
                                        key={value}
                                        type="button"
                                        role="option"
                                        aria-selected={listStyleType === value}
                                        className={`flex aspect-square w-full items-center justify-center rounded text-xs transition-colors hover:bg-slate-100 ${
                                          listStyleType === value ? "bg-slate-100 ring-1 ring-[#496db3]" : ""
                                        }`}
                                        style={{ color: iconColor }}
                                        onMouseDown={(e) => {
                                          saveSelectionFromEditor();
                                          e.preventDefault();
                                        }}
                                        onClick={() => applyListStyle(value)}
                                      >
                                        {label}
                                      </button>
                                    ))
                                  : LIST_STYLE_UL.map(({ value, Icon }) => (
                                      <button
                                        key={value}
                                        type="button"
                                        role="option"
                                        aria-selected={listStyleType === value}
                                        className={`flex aspect-square w-full items-center justify-center rounded transition-colors hover:bg-slate-100 ${
                                          listStyleType === value ? "bg-slate-100 ring-1 ring-[#496db3]" : ""
                                        }`}
                                        style={{ color: iconColor }}
                                        onMouseDown={(e) => {
                                          saveSelectionFromEditor();
                                          e.preventDefault();
                                        }}
                                        onClick={() => applyListStyle(value)}
                                      >
                                        <Icon className="h-5 w-5" />
                                      </button>
                                    ))}
                </div>
                            );
                          })()}
                          {isOrderedList && (
                            <div className="mt-3 border-t border-slate-200 pt-3">
                              <div className="mb-2 flex flex-nowrap items-center gap-2">
                                <span className="whitespace-nowrap text-xs text-slate-600">Начать с:</span>
                                <input
                                  type="number"
                                  min={1}
                                  max={9999}
                                  value={listStart}
                                  onChange={(e) => {
                                    const v = parseInt(e.target.value, 10);
                                    if (!Number.isNaN(v) && v >= 1 && v <= 9999) {
                                      applyListStart(v);
                                    }
                                  }}
                                  className="w-16 rounded border border-slate-200 px-2 py-1 text-xs text-slate-700"
                                  onMouseDown={(e) => {
                                    saveSelectionFromEditor();
                                    e.preventDefault();
                                  }}
                                />
                              </div>
                            </div>
                          )}
                          <div className="mt-3 border-t border-slate-200 pt-3">
                            <div className="mb-2 flex flex-nowrap items-center gap-2">
                              <span className="whitespace-nowrap text-xs text-slate-600">Цвет значков:</span>
                              <button
                                type="button"
                                className="h-5 w-5 shrink-0 rounded border border-slate-200 transition-colors hover:ring-2 hover:ring-[#496db3] hover:ring-offset-1"
                                style={{ backgroundColor: LIST_COLORS.find((c) => c.value === listColor)?.hex ?? "#000000" }}
                                onMouseDown={(e) => {
                                  saveSelectionFromEditor();
                                  e.preventDefault();
                                }}
                                onClick={() => setListColorOpen((v) => !v)}
                                aria-label="Выбрать цвет"
                                aria-expanded={listColorOpen}
                              />
                            </div>
                            {listColorOpen && (
                              <div className="grid grid-cols-4 gap-1.5" style={{ width: 104 }}>
                                {LIST_COLORS.map(({ value, label, hex }) => {
                                  const isSelected = listColor === value || (listColor === "" && value === "black");
                                  const luminance = (() => {
                                    const r = parseInt(hex.slice(1, 3), 16);
                                    const g = parseInt(hex.slice(3, 5), 16);
                                    const b = parseInt(hex.slice(5, 7), 16);
                                    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
                                  })();
                                  const iconLight = luminance < 0.6;
                                  return (
                                    <button
                                      key={value}
                                      type="button"
                                      role="option"
                                      aria-selected={isSelected}
                                      title={label}
                                      className={`flex aspect-square w-full items-center justify-center rounded border border-slate-200 transition-colors hover:ring-2 hover:ring-[#496db3] hover:ring-offset-1 ${
                                        isSelected ? "ring-2 ring-[#496db3] ring-offset-1" : ""
                                      }`}
                                      style={{ backgroundColor: hex }}
                                      onMouseDown={(e) => {
                                        saveSelectionFromEditor();
                                        e.preventDefault();
                                      }}
                                      onClick={() => applyListColor(value)}
                                    >
                                      {isSelected && (
                                        <CheckIcon className={`h-3 w-3 ${iconLight ? "text-white drop-shadow-[0_0_1px_rgba(0,0,0,0.5)]" : "text-slate-800"}`} />
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {!PAGE_EDITOR_FORMAT_TOOLBAR_MINIMAL && (
                    <>
                      <div className="h-6 w-px shrink-0 bg-slate-200" aria-hidden="true" />

                      <div ref={tableDropdownRef} className="relative">
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded text-slate-600 transition-colors hover:text-[#496db3]"
                          onMouseDown={(e) => {
                            saveSelectionFromEditor();
                            e.preventDefault();
                          }}
                          onClick={() => {
                            setTableOpen((v) => !v);
                            closeAddElementDialog();
                          }}
                          aria-label="Вставить таблицу"
                          aria-expanded={tableOpen}
                        >
                          <TableCellsIcon className={ICON_SIZE} />
                        </button>
                    {isInTable && (
                      <>
                      <div ref={tableBorderDropdownRef} className="relative ml-0.5 inline-block">
                        <button
                          type="button"
                          className="flex h-8 min-w-[3rem] items-center justify-between gap-1 rounded border border-slate-200 bg-white px-2 text-slate-700 transition-colors hover:border-slate-300"
                          onMouseDown={(e) => {
                            saveSelectionFromEditor();
                            e.preventDefault();
                          }}
                          onClick={() => setTableBorderOpen((v) => !v)}
                          aria-label="Контур таблицы"
                          aria-expanded={tableBorderOpen}
                        >
                          <TableBorderPreview value={tableBorderStyle} isSelected={false} size="sm" />
                          <ChevronDownIcon
                            className={`h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform ${tableBorderOpen ? "rotate-180" : ""}`}
                          />
                        </button>
                        {tableBorderOpen && (
                          <div
                            className="absolute left-0 top-full z-10 mt-1 rounded border border-slate-200 bg-white p-3 shadow-lg"
                            style={{ width: 140, minWidth: 140 }}
                            role="listbox"
                          >
                            <div className="grid grid-cols-3 gap-2" style={{ width: 104 }}>
                              {TABLE_BORDER_STYLES.map((opt) => (
                                <button
                                  key={opt.value}
                                  type="button"
                                  role="option"
                                  aria-selected={tableBorderStyle === opt.value}
                                  className={`flex aspect-square w-full items-center justify-center rounded transition-colors hover:bg-slate-100 ${
                                    tableBorderStyle === opt.value ? "bg-slate-100 ring-1 ring-[#496db3]" : ""
                                  }`}
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => setTableBorder(opt.value)}
                                  title={opt.label}
                                >
                                  <TableBorderPreview value={opt.value} isSelected={tableBorderStyle === opt.value} />
                                </button>
                              ))}
                            </div>
                            <div className="mt-3 border-t border-slate-200 pt-3">
                              <div className="mb-2 flex flex-nowrap items-center gap-2">
                                <span className="whitespace-nowrap text-xs text-slate-600">Толщина:</span>
                                <button
                                  type="button"
                                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-slate-200 transition-colors hover:ring-2 hover:ring-[#496db3] hover:ring-offset-1"
                                  onMouseDown={(e) => {
                                    saveSelectionFromEditor();
                                    e.preventDefault();
                                  }}
                                  onClick={() => setTableBorderWidthOpen((v) => !v)}
                                  aria-label="Выбрать толщину"
                                  aria-expanded={tableBorderWidthOpen}
                                >
                                  <div
                                    className="rounded-sm bg-slate-600"
                                    style={{ height: Math.max(1, parseInt(tableBorderWidth, 10) * 2), width: 10 }}
                                  />
                                </button>
                              </div>
                              {tableBorderWidthOpen && (
                                <div className="mt-1 flex flex-col gap-1.5" style={{ width: 104 }}>
                                  {TABLE_BORDER_WIDTHS.map((w) => {
                                    const isSelected = tableBorderWidth === w.value;
                                    return (
                                      <button
                                        key={w.value}
                                        type="button"
                                        role="menuitem"
                                        aria-selected={isSelected}
                                        title={w.label}
                                        className={`flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-xs ${
                                          isSelected
                                            ? "bg-slate-100 text-[#496db3]"
                                            : "text-slate-700 hover:bg-slate-100"
                                        }`}
                                        onMouseDown={(e) => {
                                          saveSelectionFromEditor();
                                          e.preventDefault();
                                        }}
                                        onClick={() => {
                                          applyTableBorderWidth(w.value);
                                          setTableBorderWidthOpen(false);
                                        }}
                                      >
                                        <div
                                          className="rounded-sm bg-slate-600"
                                          style={{ height: Math.max(1, parseInt(w.value, 10) * 2), width: 10 }}
                                        />
                                        {w.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                            <div className="mt-3 border-t border-slate-200 pt-3">
                              <div className="mb-2 flex flex-nowrap items-center gap-2">
                                <span className="whitespace-nowrap text-xs text-slate-600">Цвет контура:</span>
                                <button
                                  type="button"
                                  className="h-5 w-5 shrink-0 rounded border border-slate-200 transition-colors hover:ring-2 hover:ring-[#496db3] hover:ring-offset-1"
                                  style={{ backgroundColor: tableBorderColor }}
                                  onMouseDown={(e) => {
                                    saveSelectionFromEditor();
                                    e.preventDefault();
                                  }}
                                  onClick={() => setTableBorderColorOpen((v) => !v)}
                                  aria-label="Выбрать цвет"
                                  aria-expanded={tableBorderColorOpen}
                                />
                              </div>
                              {tableBorderColorOpen && (
                                <div className="grid grid-cols-4 gap-1.5" style={{ width: 104 }}>
                                  {LIST_COLORS.map(({ value, label, hex }) => {
                                    const isSelected = tableBorderColor === hex || (tableBorderColor === "" && value === "black");
                                    const luminance = (() => {
                                      const r = parseInt(hex.slice(1, 3), 16);
                                      const g = parseInt(hex.slice(3, 5), 16);
                                      const b = parseInt(hex.slice(5, 7), 16);
                                      return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
                                    })();
                                    const iconLight = luminance < 0.6;
                                    return (
                                      <button
                                        key={value}
                                        type="button"
                                        role="option"
                                        aria-selected={isSelected}
                                        title={label}
                                        className={`flex aspect-square w-full items-center justify-center rounded border border-slate-200 transition-colors hover:ring-2 hover:ring-[#496db3] hover:ring-offset-1 ${
                                          isSelected ? "ring-2 ring-[#496db3] ring-offset-1" : ""
                                        }`}
                                        style={{ backgroundColor: hex }}
                                        onMouseDown={(e) => {
                                          saveSelectionFromEditor();
                                          e.preventDefault();
                                        }}
                                        onClick={() => applyTableBorderColor(hex)}
                                      >
                                        {isSelected && (
                                          <CheckIcon className={`h-3 w-3 ${iconLight ? "text-white drop-shadow-[0_0_1px_rgba(0,0,0,0.5)]" : "text-slate-800"}`} />
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      </>
                    )}
                    {tableOpen && (
                      <div
                        className="absolute left-0 top-full z-10 mt-1 min-w-[180px] rounded border border-slate-200 bg-white p-3 shadow-lg"
                        role="menu"
                        onMouseLeave={() => setTableHover(null)}
                      >
                        <div className="mb-2 text-xs font-medium text-slate-600">
                          {tableHover ? `${tableHover.rows}×${tableHover.cols}` : "Размер таблицы"}
                        </div>
                        <div className="grid grid-cols-6 gap-1.5">
                          {Array.from({ length: 6 }, (_, rowIndex) =>
                            Array.from({ length: 6 }, (_, colIndex) => {
                              const rows = rowIndex + 1;
                              const cols = colIndex + 1;
                              const isHighlighted =
                                tableHover && rowIndex < tableHover.rows && colIndex < tableHover.cols;
                              return (
                                <button
                                  key={`${rowIndex}-${colIndex}`}
                                  type="button"
                                  role="menuitem"
                                  className={`h-5 w-5 rounded-sm border transition-colors ${
                                    isHighlighted
                                      ? "border-[#496db3] bg-[#496db3]/20"
                                      : "border-slate-200 bg-slate-100 hover:border-slate-300"
                                  }`}
                                  onMouseDown={(e) => e.preventDefault()}
                                  onMouseEnter={() => setTableHover({ rows, cols })}
                                  onClick={() => insertTable(rows, cols)}
                                  title={`${rows}×${cols}`}
                                />
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                    </>
                  )}

                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageInputChange}
                  />
                  <input
                    ref={webShellImageInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleWebShellImageInputChange}
                    aria-hidden="true"
                  />

                  {!PAGE_EDITOR_FORMAT_TOOLBAR_MINIMAL && (
                    <>
                      <div className="h-6 w-px shrink-0 bg-slate-200" aria-hidden="true" />

                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded text-slate-600 transition-colors hover:text-[#496db3]"
                        onMouseDown={(e) => {
                          saveSelectionFromEditor();
                          e.preventDefault();
                        }}
                        onClick={() => imageInputRef.current?.click()}
                        aria-label="Вставить картинку"
                      >
                        <PhotoIcon className={ICON_SIZE} />
                      </button>

                      <div className="h-6 w-px shrink-0 bg-slate-200" aria-hidden="true" />
                    </>
                  )}

                </div>

                <div
                  ref={editorScrollRef}
                  className="relative z-0 min-h-0 flex-1 overflow-y-auto [overflow-anchor:none]"
                >
                  <div
                    ref={editorWrapperRef}
                    className="page-editor relative min-h-[calc(100vh-12rem)] w-full px-0 pb-4 pt-0 text-[12px] text-slate-900 outline-none [&_ul]:list-disc [&_ul]:list-outside [&_ul]:pl-6 [&_ul]:my-0 [&_ol]:pl-6 [&_ol]:my-0 [&_ol_ol]:pl-6 [&_ol_ol_ol]:pl-6 [&_li]:pl-1 [&_li]:my-0"
                  >
                    <div
                      ref={editorRef}
                      suppressContentEditableWarning
                      onMouseDownCapture={(e) => {
                        const ed = editorRef.current;
                        const rawTarget = e.target as EventTarget | null;
                        const t =
                          rawTarget instanceof Element
                            ? rawTarget
                            : (rawTarget as Node | null)?.parentElement ?? null;
                        if (tryFixFeatureGridCardMousedown(e, t, ed)) return;
                        if (tryFixWorkPricingMousedown(e, t, ed)) return;
                      }}
                      onMouseDown={(e) => {
                        if (handleWebInsertHandleMouseDown(e)) return;
                        const ed = editorRef.current;
                        const rawTarget = e.target as EventTarget | null;
                        const t =
                          rawTarget instanceof Element
                            ? rawTarget
                            : (rawTarget as Node | null)?.parentElement ?? null;
                        if (!t?.closest?.(".page-web-elements-actions")) {
                          selectedWebElementsActionsRef.current = null;
                        }
                        if (ed && isEditorNativeFormTextControl(ed, t)) {
                          setTimeout(() => updateToolbarState(), 0);
                          return;
                        }
                        const nativePath =
                          typeof e.nativeEvent.composedPath === "function"
                            ? e.nativeEvent.composedPath()
                            : [];
                        const inCoverToolbarFromPath = nativePath.some((node) => {
                          if (!(node instanceof Element)) return false;
                          return !!node.closest?.(".page-web-cover-toolbar");
                        });
                        if (ed && !inCoverToolbarFromPath && !t?.closest?.(".page-web-cover-toolbar")) {
                          ed.querySelectorAll(".page-web-cover-toolbar").forEach((node) => {
                            closeCoverToolbarMenus(node as HTMLElement);
                          });
                        }
                        if (ed && !t?.closest?.(".page-web-carousel-toolbar")) {
                          ed.querySelectorAll(".page-web-carousel-toolbar").forEach((node) => {
                            closeCarouselToolbarMenus(node as HTMLElement);
                          });
                        }
                        if (ed && !t?.closest?.(".page-web-timeline-toolbar")) {
                          ed.querySelectorAll(".page-web-timeline-toolbar").forEach((node) => {
                            closeTimelineToolbarMenus(node as HTMLElement);
                          });
                        }
                        if (ed && !t?.closest?.(".page-web-text-media-toolbar")) {
                          ed.querySelectorAll(".page-web-text-media-toolbar").forEach((node) => {
                            closeTextMediaToolbarMenus(node as HTMLElement);
                          });
                        }
                        if (ed && !t?.closest?.(".page-web-text-block-toolbar")) {
                          ed.querySelectorAll(".page-web-text-block-toolbar").forEach((node) => {
                            closeTextBlockToolbarMenus(node as HTMLElement);
                          });
                        }
                        if (ed && !t?.closest?.(".page-web-text-block-v2-toolbar")) {
                          ed.querySelectorAll(".page-web-text-block-v2-toolbar").forEach((node) => {
                            closeTextBlockV2ToolbarMenus(node as HTMLElement);
                          });
                        }
                        if (ed && !t?.closest?.(".page-web-article-text-toolbar")) {
                          ed.querySelectorAll(".page-web-article-text-toolbar").forEach((node) => {
                            closeArticleTextToolbarMenus(node as HTMLElement);
                          });
                        }
                        if (ed && !t?.closest?.(".page-web-accordion-toolbar")) {
                          ed.querySelectorAll(".page-web-accordion-toolbar").forEach((node) => {
                            closeAccordionToolbarMenus(node as HTMLElement);
                          });
                        }
                        if (ed && !t?.closest?.(".page-web-spacer-toolbar")) {
                          ed.querySelectorAll(".page-web-spacer-toolbar").forEach((node) => {
                            closeSpacerToolbarMenus(node as HTMLElement);
                          });
                        }
                        handleCarouselEditorMouseDown(e);
                        handleTimelineToolbarMouseDown(e);
                        handleTextMediaEditorMouseDown(e);
                        handleTextBlockEditorMouseDown(e);
                        handleTextBlockV2EditorMouseDown(e);
                        handleArticleTextEditorMouseDown(e);
                        handleAccordionEditorMouseDown(e);
                        handleSpacerToolbarMouseDown(e);
                        handleCoverSurfaceMouseDown(e);
                        handleCoverToolbarMouseDown(e);
                        handleCoverInnerMouseDown(e);
                        handleTableCellMouseDown(e);
                      }}
                      onDoubleClick={(e) => {
                        if (handleCoverButtonDoubleClick(e)) return;
                        if (handleFeatureGridImageDoubleClick(e)) return;
                        if (handleFeatureGridIconDoubleClick(e)) return;
                        handleTableCellDoubleClick(e);
                      }}
                      onBlur={handleEditorFocusOut}
                      onFocusCapture={(e) => {
                        const ed = editorRef.current;
                        if (ed && isEditorNativeFormTextControl(ed, e.target)) {
                          const target = e.target as EventTarget | null;
                          if (isFeatureGridCardTextarea(target)) {
                            layoutWebTextBlockV2TextareaHeightOnly(target);
                            updateToolbarState();
                            return;
                          }
                          const anchor =
                            e.target instanceof HTMLElement
                              ? e.target
                              : ((e.target as Node | null)?.parentElement ?? null);
                          const autosizeRoot = resolveWebBlockAutosizeRoot(anchor, ed);
                          withPreservedScrollPortAnchor(
                            anchor,
                            () => {
                              if (editorLayoutDebugOn()) {
                                logPageEditorLayout("focusCapture:autosize-start", {
                                  anchor: summarizeLayoutElement(anchor),
                                  autosizeRoot: summarizeLayoutElement(autosizeRoot),
                                  textareasInScope: autosizeRoot.querySelectorAll(
                                    WEB_ELEMENTS_V2_TEXTAREA_LAYOUT_SELECTOR,
                                  ).length,
                                  inWorkPricing: !!anchor?.closest?.(".page-web-work-pricing"),
                                });
                              }
                              if (target instanceof HTMLTextAreaElement) {
                                target.style.height = "auto";
                                target.style.height = `${target.scrollHeight}px`;
                              }
                              autosizeWebTextBlockV2Textareas(autosizeRoot);
                              if (editorLayoutDebugOn() && target instanceof HTMLTextAreaElement) {
                                logPageEditorLayout("focusCapture:autosize-done", {
                                  styleHeight: target.style.height,
                                  scrollHeight: target.scrollHeight,
                                });
                              }
                            },
                            "focusCapture-native",
                          );
                          updateToolbarState();
                        }
                      }}
                      onBeforeInput={handleEditorBeforeInput}
                      onKeyDown={handleKeyDown}
                      onPaste={handlePaste}
                      onInput={(e) => {
                        const ed = e.currentTarget;
                        if (isEditorNativeFormTextControl(ed, e.target)) {
                          syncWebTextBlockV2FieldValuesForSerialization(ed);
                          scheduleEditorHtmlStateSync(ed.innerHTML);
                          const target = e.target as EventTarget | null;
                          if (isFeatureGridCardTextarea(target)) {
                            withPreservedScrollPortAnchor(
                              target,
                              () => {
                                target.style.height = "auto";
                                target.style.height = `${target.scrollHeight}px`;
                                layoutWebTextBlockV2TextareaHeightOnly(target);
                              },
                              "input-native-feature-grid-card",
                            );
                            updateToolbarState();
                            return;
                          }
                          const anchor =
                            e.target instanceof HTMLElement
                              ? e.target
                              : ((e.target as Node | null)?.parentElement ?? null);
                          const autosizeRoot = resolveWebBlockAutosizeRoot(anchor, ed);
                          withPreservedScrollPortAnchor(
                            anchor,
                            () => {
                              if (editorLayoutDebugOn()) {
                                logPageEditorLayout("input-native:autosize-start", {
                                  anchor: summarizeLayoutElement(anchor),
                                  autosizeRoot: summarizeLayoutElement(autosizeRoot),
                                  textareasInScope: autosizeRoot.querySelectorAll(
                                    WEB_ELEMENTS_V2_TEXTAREA_LAYOUT_SELECTOR,
                                  ).length,
                                  inWorkPricing: !!anchor?.closest?.(".page-web-work-pricing"),
                                });
                              }
                              if (target instanceof HTMLTextAreaElement) {
                                target.style.height = "auto";
                                target.style.height = `${target.scrollHeight}px`;
                              }
                              autosizeWebTextBlockV2Textareas(autosizeRoot);
                            },
                            "input-native",
                          );
                          updateToolbarState();
                          return;
                        }
                        ensureWorkPricingListItemCheckmarks(ed);
                        scheduleEditorHtmlStateSync(ed.innerHTML);
                        syncMarkerBold();
                      }}
                      onKeyUp={(e) => {
                        const ed = editorRef.current;
                        if (ed && isEditorNativeFormTextControl(ed, e.target)) return;
                        saveSelectionFromEditor();
                        updateToolbarState();
                      }}
                      onMouseUp={(e) => {
                        const ed = editorRef.current;
                        if (ed && isEditorNativeFormTextControl(ed, e.target)) return;
                        saveSelectionFromEditor();
                        updateToolbarState();
                      }}
                      className="w-full"
                    />
                    {!hasWebBlocksInCanvas ? (
                      <div className="mt-3 flex items-center justify-center">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:border-[#496db3]/40 hover:text-[#496db3]"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => openAddElementDialog(null)}
                          aria-label="Добавить первый блок"
                        >
                          <PlusIcon className="h-3.5 w-3.5" />
                          Добавить первый блок
                        </button>
                      </div>
                    ) : null}
                    {cellMenuViewport &&
                      cellMenuViewport.topBtn &&
                      typeof document !== "undefined" &&
                      createPortal(
                        <div ref={cellMenuRef} className="fixed z-[9999]">
                          {cellMenuViewport.selectionBadge && (
                            <div
                              className="pointer-events-none absolute rounded border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 shadow-sm"
                              style={{
                                top: cellMenuViewport.selectionBadge.top - 28,
                                left: cellMenuViewport.selectionBadge.right,
                                transform: "translateX(-100%)",
                                position: "fixed",
                              }}
                            >
                              {selectedCellRange.rows} × {selectedCellRange.cols}
                            </div>
                          )}
                          <div
                            className="z-[110] flex gap-1"
                            style={{
                              top: cellMenuViewport.top,
                              left: cellMenuViewport.left,
                              position: "fixed",
                            }}
                          >
                            <button
                              type="button"
                              className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 bg-white text-slate-600 shadow-md transition-colors hover:bg-slate-50 hover:text-[#496db3]"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setCellMenuAnchor("left");
                                setCellMenuOpen((v) => !v);
                                setTableWidthSubmenuOpen(false);
                                setTableRowHeightSubmenuOpen(false);
                              }}
                              aria-label="Меню ячейки (слева)"
                              aria-expanded={cellMenuOpen && cellMenuAnchor === "left"}
                            >
                              <EllipsisVerticalIcon className="h-4 w-4" />
                            </button>
                            {cellMenuOpen && cellMenuAnchor === "left" && (
                              <div
                                className={`absolute left-0 z-10 min-w-[200px] rounded border border-slate-200 bg-white py-1 shadow-lg ${
                                  cellMenuViewport.openUp ? "bottom-full mb-1" : "top-full mt-1"
                                }`}
                                role="menu"
                              >
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-100"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => tableCellAction("insertRowAbove")}
                                >
                                  <PlusIcon className="h-4 w-4" />
                                  Добавить {pluralRowsInsert(selectedCellRange.rows)} выше
                                </button>
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-100"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => tableCellAction("insertRowBelow")}
                                >
                                  <PlusIcon className="h-4 w-4" />
                                  Добавить {pluralRowsInsert(selectedCellRange.rows)} ниже
                                </button>
                                <div className="my-1 border-t border-slate-200" />
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => tableCellAction("deleteRow")}
                                >
                                  <TrashIcon className="h-4 w-4" />
                                  Удалить {pluralRowsDelete(selectedCellRange.rows)}
                                </button>
                                <div className="my-1 border-t border-slate-200" />
                                <div className="relative">
                                  <button
                                    type="button"
                                    role="menuitem"
                                    className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs ${
                                      tableRowHeightSubmenuOpen ? "bg-slate-100 text-[#496db3]" : "text-slate-700 hover:bg-slate-100"
                                    }`}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => setTableRowHeightSubmenuOpen((v) => !v)}
                                  >
                                    Задать высоту ячеек
                                    <ChevronRightIcon className="h-3.5 w-3.5 shrink-0" />
                                  </button>
                                  {tableRowHeightSubmenuOpen && (
                                    <div
                                      className={`absolute left-full z-20 ml-0.5 min-w-[100px] rounded border border-slate-200 bg-white py-1 shadow-lg ${
                                        cellMenuViewport.openUp ? "bottom-0" : "top-0"
                                      }`}
                                      role="menu"
                                    >
                                      {TABLE_ROW_HEIGHT_PRESETS.map((opt) => (
                                        <button
                                          key={opt.value}
                                          type="button"
                                          role="menuitem"
                                          className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs ${
                                            tableRowHeight === opt.value ? "bg-slate-100 text-[#496db3]" : "text-slate-700 hover:bg-slate-100"
                                          }`}
                                          onMouseDown={(e) => e.preventDefault()}
                                          onClick={() => {
                                            applyTableRowHeight(opt.value);
                                            setTableRowHeightSubmenuOpen(false);
                                          }}
                                        >
                                          {opt.label}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                          <div
                            className="z-[100] flex gap-1"
                            style={{
                              top: cellMenuViewport.topBtn.top,
                              left: cellMenuViewport.topBtn.left,
                              position: "fixed",
                            }}
                          >
                            <button
                              type="button"
                              className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 bg-white text-slate-600 shadow-md transition-colors hover:bg-slate-50 hover:text-[#496db3]"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setCellMenuAnchor("top");
                                setCellMenuOpen((v) => !v);
                                setTableWidthSubmenuOpen(false);
                                setTableRowHeightSubmenuOpen(false);
                              }}
                              aria-label="Меню ячейки (сверху)"
                              aria-expanded={cellMenuOpen && cellMenuAnchor === "top"}
                            >
                              <EllipsisHorizontalIcon className="h-4 w-4" />
                            </button>
                            {cellMenuOpen && cellMenuAnchor === "top" && (
                              <div
                                className={`absolute left-1/2 z-10 min-w-[200px] -translate-x-1/2 rounded border border-slate-200 bg-white py-1 shadow-lg ${
                                  cellMenuViewport.openUp ? "bottom-full mb-1" : "top-full mt-1"
                                }`}
                                role="menu"
                              >
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-100"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => tableCellAction("insertColLeft")}
                                >
                                  <PlusIcon className="h-4 w-4" />
                                  Добавить {pluralColsInsert(selectedCellRange.cols)} слева
                                </button>
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-100"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => tableCellAction("insertColRight")}
                                >
                                  <PlusIcon className="h-4 w-4" />
                                  Добавить {pluralColsInsert(selectedCellRange.cols)} справа
                                </button>
                                <div className="my-1 border-t border-slate-200" />
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => tableCellAction("deleteCol")}
                                >
                                  <TrashIcon className="h-4 w-4" />
                                  Удалить {pluralColsDelete(selectedCellRange.cols)}
                                </button>
                                <div className="my-1 border-t border-slate-200" />
                                <div className="relative">
                                  <button
                                    type="button"
                                    role="menuitem"
                                    className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs ${
                                      tableWidthSubmenuOpen ? "bg-slate-100 text-[#496db3]" : "text-slate-700 hover:bg-slate-100"
                                    }`}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => setTableWidthSubmenuOpen((v) => !v)}
                                  >
                                    Задать ширину ячеек
                                    <ChevronRightIcon className="h-3.5 w-3.5 shrink-0" />
                                  </button>
                                  {tableWidthSubmenuOpen && (
                                    <div
                                      className={`absolute left-full z-20 ml-0.5 min-w-[100px] rounded border border-slate-200 bg-white py-1 shadow-lg ${
                                        cellMenuViewport.openUp ? "bottom-0" : "top-0"
                                      }`}
                                      role="menu"
                                    >
                                      {TABLE_WIDTH_PRESETS.map((opt) => (
                                        <button
                                          key={opt.value}
                                          type="button"
                                          role="menuitem"
                                          className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs ${
                                            tableWidth === opt.value ? "bg-slate-100 text-[#496db3]" : "text-slate-700 hover:bg-slate-100"
                                          }`}
                                          onMouseDown={(e) => e.preventDefault()}
                                          onClick={() => {
                                            applyTableWidth(opt.value);
                                            setTableWidthSubmenuOpen(false);
                                          }}
                                        >
                                          {opt.label}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>,
                        document.body
                      )}
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
      {coverBgAdjustSession && typeof document !== "undefined" && (
        <CoverBackgroundAdjustOverlay
          coverEl={coverBgAdjustSession.mount}
          imageSrc={coverBgAdjustSession.imageSrc}
          posX={coverBgAdjustSession.posX}
          posY={coverBgAdjustSession.posY}
          onPositionChange={updateCoverBgAdjustPos}
          onCommit={handleCoverBgAdjustCommit}
          onCancel={handleCoverBgAdjustCancel}
        />
      )}
      {carouselPreviewSession && typeof document !== "undefined" &&
        createPortal(
          <CarouselFullPreviewOverlay
            session={carouselPreviewSession}
            onClose={() => setCarouselPreviewSession(null)}
            onPrev={() =>
              setCarouselPreviewSession((s) => (s ? { ...s, index: Math.max(0, s.index - 1) } : s))
            }
            onNext={() =>
              setCarouselPreviewSession((s) =>
                s ? { ...s, index: Math.min(s.slides.length - 1, s.index + 1) } : s
              )
            }
          />,
          document.body
        )}
    </div>
  );
}

