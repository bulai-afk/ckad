/** Класс обёртки для HTML правовых документов (диалог и предпросмотр в админке). */
export const POLICY_HTML_DOCUMENT_CLASS =
  "policy-html-document min-w-0 w-full max-w-full text-slate-700 [overflow-wrap:break-word] [&_*]:max-w-full [&_*]:box-border";

/** Язык для автоматического переноса по слогам (`hyphens: auto` в CSS). */
export const POLICY_HTML_DOCUMENT_LANG = "ru";

function isEmptyWordParagraph(paragraphHtml: string): boolean {
  const inner = paragraphHtml
    .replace(/^<p\b[^>]*>/i, "")
    .replace(/<\/p>\s*$/i, "")
    .replace(/<br\s*\/?>/gi, "")
    .replace(/<o:p>[\s\S]*?<\/o:p>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;|\u00a0/g, " ")
    .trim();
  return inner.length === 0;
}

function appendClassNameToAttrs(attrs: string, className: string): string {
  const classMatch = attrs.match(/\bclass\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/i);
  if (classMatch) {
    const quote = classMatch[0].includes('"') ? '"' : classMatch[0].includes("'") ? "'" : "";
    const existing = (classMatch[1] || classMatch[2] || classMatch[3] || "").trim();
    if (existing.split(/\s+/).includes(className)) return attrs;
    const joined = existing ? `${existing} ${className}` : className;
    if (quote) {
      return attrs.replace(classMatch[0], `class=${quote}${joined}${quote}`);
    }
    return attrs.replace(classMatch[0], `class="${joined}"`);
  }
  return `${attrs} class="${className}"`;
}

/** Пустой абзац Word (Enter без текста) — видимая пустая строка в документе. */
function formatWordEmptyLineSpacer(attrs: string): string {
  return `<p${appendClassNameToAttrs(attrs, "word-doc-spacer")}>&nbsp;</p>`;
}

/** Сохраняет намеренные пустые строки Word между заголовками и абзацами. */
function preserveWordEmptyLineParagraphs(html: string): string {
  return html.replace(/<p\b([^>]*)>([\s\S]*?)<\/p>/gi, (full, attrs: string) => {
    if (!isEmptyWordParagraph(full)) return full;
    return formatWordEmptyLineSpacer(attrs);
  });
}

const PRESERVE_HTML_BLOCK_PLACEHOLDER = "\uE000PHB";
const WORD_LIST_MARKER_PLACEHOLDER = "\uE000WLM";

/** Не трогаем &lt;style&gt;/&lt;script&gt; — иначе &lt;br&gt; попадают в CSS и ломают отступы Word. */
function maskNonTextHtmlBlocks(html: string): { html: string; blocks: string[] } {
  const blocks: string[] = [];
  const masked = html.replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, (block) => {
    const index = blocks.length;
    blocks.push(block);
    return `${PRESERVE_HTML_BLOCK_PLACEHOLDER}${index}\uE001`;
  });
  return { html: masked, blocks };
}

function unmaskNonTextHtmlBlocks(html: string, blocks: string[]): string {
  if (!blocks.length) return html;
  return html.replace(
    new RegExp(`${PRESERVE_HTML_BLOCK_PLACEHOLDER}(\\d+)\uE001`, "g"),
    (_full, index: string) => blocks[Number(index)] ?? "",
  );
}

/** Текстовый узел без видимых символов (в т.ч. &amp;nbsp; как пробелы Word). */
function htmlTextNodeIsWhitespaceOnly(text: string): boolean {
  const normalized = text
    .replace(/&nbsp;/gi, " ")
    .replace(/&#x0*a0;/gi, " ")
    .replace(/&#160;/g, " ")
    .replace(/\u00a0/g, " ");
  return !/[^\s]/.test(normalized);
}

/**
 * Word переносит длинные строки в .html файле через \\r\\n — это не Shift+Enter.
 * В потоковом тексте заменяем на пробел, иначе ломается выравнивание по ширине.
 */
function collapseWordHtmlSourceLineWraps(html: string): string {
  const { html: masked, blocks } = maskNonTextHtmlBlocks(html);
  const { html: masked2, markers } = maskWordListMarkerSpans(masked);
  const out = masked2.replace(/>([^<]*?)</g, (_full, text: string) => {
    if (!/[\r\n\u2028\u2029]/.test(text)) return _full;
    if (htmlTextNodeIsWhitespaceOnly(text)) return _full;
    const next = text.replace(/[\r\n\u2028\u2029]+/g, " ");
    return `>${next}<`;
  });
  return unmaskWordListMarkerSpans(unmaskNonTextHtmlBlocks(out, blocks), markers);
}

/** Пустые закладки Word между абзацами дают лишние строки при <br> между тегами. */
function stripWordBookmarkSpans(html: string): string {
  return html.replace(/<span\b[^>]*\bmso-bookmark:[^>]*>\s*<\/span>/gi, "");
}

/** Убирает &lt;br&gt;, вставленные между блочными абзацами при экспорте Word. */
function collapseLineBreaksBetweenParagraphs(html: string): string {
  return html.replace(/<\/p>(?:\s*<br\s*\/?>\s*)+(?=<p\b)/gi, "</p>");
}

function isCenteredBlockAttrs(attrs: string): boolean {
  return (
    /\balign\s*=\s*(?:"center"|'center'|center\b)/i.test(attrs) ||
    /text-align\s*:\s*center/i.test(attrs)
  );
}

/** У центрированных блоков Word не должно быть text-indent — иначе «пустое место» справа. */
function stripTextIndentOnCenteredBlocks(html: string): string {
  return html.replace(/<(p|h[1-6])\b([^>]*)>/gi, (full, tag: string, attrs: string) => {
    if (!isCenteredBlockAttrs(attrs) || !/text-indent\s*:/i.test(attrs)) return full;
    const newAttrs = attrs.replace(/text-indent\s*:\s*[^;]+;?/gi, "text-indent:0;");
    return `<${tag}${newAttrs}>`;
  });
}

/**
 * В заголовках и центрированных строках \\r\\n из HTML-файла — не Shift+Enter:
 * в Word это одна строка с переносом по ширине, не принудительный &lt;br&gt;.
 */
function normalizeCenteredAndHeadingLineBreaks(html: string): string {
  return html.replace(/<(h[1-6]|p)\b([^>]*)>([\s\S]*?)<\/\1>/gi, (full, tag: string, attrs: string, inner: string) => {
    const centered = isCenteredBlockAttrs(attrs);
    const isHeading = /^h[1-6]$/i.test(tag);
    if (!centered && !isHeading) return full;

    let fixed = inner
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/>([^<]*?)</g, (segment, text: string) => {
        if (!/[\r\n\u2028\u2029]/.test(text)) return segment;
        if (htmlTextNodeIsWhitespaceOnly(text)) return segment;
        return `>${text.replace(/[\r\n\u2028\u2029]+/g, " ")}<`;
      })
      .replace(/\s{2,}/g, " ");

    if (centered) {
      fixed = fixed.replace(/\s+$/g, "");
    }

    return `<${tag}${attrs}>${fixed}</${tag}>`;
  });
}

/** Word: &lt;o:p&gt; и &lt;br&gt; — только явный Shift+Enter; хвостовой &lt;o:p&gt; у абзаца не трогаем. */
function convertWordLineBreakTags(html: string): string {
  const endOfRun = String.raw`(\s*(?:</span>|</a>|</b>|</strong>|</p>))`;
  return html
    .replace(/<br\b[^>]*>/gi, "<br />")
    .replace(new RegExp(`<o:p>\\s*(?:&nbsp;|\\u00a0)?\\s*</o:p>${endOfRun}`, "gi"), "$1")
    .replace(new RegExp(`<o:p>\\s*</o:p>${endOfRun}`, "gi"), "$1")
    .replace(/<o:p>\s*(?:&nbsp;|\u00a0)?\s*<\/o:p>/gi, "<br />")
    .replace(/<o:p>\s*<\/o:p>/gi, "<br />");
}

/** Лишний &lt;br&gt; в конце обычного абзаца (после &lt;o:p&gt; Word) ломает justify. */
function stripTrailingBreaksInFlowParagraphs(html: string): string {
  return html.replace(/<p\b([^>]*)>([\s\S]*?)<\/p>/gi, (full, attrs: string, inner: string) => {
    if (isCenteredBlockAttrs(attrs)) return full;
    const fixed = inner
      .replace(/<br\s*\/?>(\s*(?:<\/span>|<\/a>|<\/b>|<\/strong>))+(?=\s*<\/p>)/gi, "$1")
      .replace(/<br\s*\/?>\s*$/i, "");
    const next = fixed === inner ? full : `<p${attrs}>${fixed}</p>`;
    if (isEmptyWordParagraph(next)) return formatWordEmptyLineSpacer(attrs);
    return next;
  });
}

/** Маркеры списков Word (1. + цепочка &amp;nbsp;) — не трогать при обработке переносов. */
function maskWordListMarkerSpans(html: string): { html: string; markers: string[] } {
  const markers: string[] = [];
  const masked = html.replace(/<span\b[^>]*\bmso-list:Ignore\b[^>]*>[\s\S]*?<\/span>/gi, (span) => {
    const index = markers.length;
    markers.push(span);
    return `${WORD_LIST_MARKER_PLACEHOLDER}${index}\uE001`;
  });
  return { html: masked, markers };
}

function unmaskWordListMarkerSpans(html: string, markers: string[]): string {
  if (!markers.length) return html;
  return html.replace(
    new RegExp(`${WORD_LIST_MARKER_PLACEHOLDER}(\\d+)\uE001`, "g"),
    (_full, index: string) => sanitizeWordListMarkerSpan(markers[Number(index)] ?? ""),
  );
}

/** Word: `font:7.0pt "Times New Roman"` — не валидный CSS; без этого nbsp-табуляция рендерится крупным шрифтом пункта. */
function expandWordFontShorthandInStyle(style: string): string {
  return style.replace(
    /\bfont:\s*([\d.]+)pt(?:\s+("[^"]*"|'[^']*'|([^;"']+)))?/gi,
    (_full, pt: string, quoted?: string, bare?: string) => {
      const famRaw = (quoted || (bare ? `"${bare.trim()}"` : '"Times New Roman"')).trim();
      return `font-size:${pt}pt;font-family:${famRaw}`;
    },
  );
}

function normalizeWordFontShorthandInStyles(html: string): string {
  return html.replace(/\bstyle\s*=\s*(['"])([\s\S]*?)\1/gi, (full, quote: string, styleBody: string) => {
    if (!/\bfont:\s*[\d.]+pt/i.test(styleBody)) return full;
    return `style=${quote}${expandWordFontShorthandInStyle(styleBody)}${quote}`;
  });
}

/**
 * Word: между «1.» и текстом — цепочка &amp;nbsp; в узком span 7pt (табуляция списка).
 * Убираем служебные \\r\\n; приводим font:7pt к font-size для браузера.
 */
function sanitizeWordListMarkerSpan(span: string): string {
  let out = span.replace(/<br\s*\/?>/gi, "");
  out = out.replace(/\bstyle\s*=\s*(['"])([\s\S]*?)\1/gi, (full, quote: string, styleBody: string) => {
    if (!/\bfont:\s*[\d.]+pt/i.test(styleBody) && !/\bfont-size:\s*7/i.test(styleBody)) return full;
    return `style=${quote}${expandWordFontShorthandInStyle(styleBody)}${quote}`;
  });
  out = out.replace(
    /(<span\b[^>]*\bfont-size:\s*7(?:\.0)?pt[^>]*>)([\s\S]*?)(<\/span>)/gi,
    (_full, open: string, inner: string, close: string) => {
      const cleaned = inner
        .replace(/[\r\n\u2028\u2029\t\f\v]+/g, "")
        .replace(/(?:&nbsp;|\u00a0)\s*(?:&nbsp;|\u00a0)/g, (m: string) =>
          m.replace(/\s+/g, ""),
        );
      return `${open}${cleaned}${close}`;
    },
  );
  return out.replace(/>([^<]*?)</g, (full, text: string) => {
    if (!/[\r\n\u2028\u2029]/.test(text)) return full;
    const cleaned = text.replace(/[\r\n\u2028\u2029]+/g, "");
    return cleaned === text ? full : `>${cleaned}<`;
  });
}

function applyLineBreakTransforms(html: string): string {
  let out = collapseWordHtmlSourceLineWraps(html);
  const { html: masked, markers } = maskWordListMarkerSpans(out);
  out = convertWordLineBreakTags(masked);
  return unmaskWordListMarkerSpans(out, markers);
}

function stripLeadingEmptyWordParagraphs(html: string): string {
  let out = html.trim();
  let changed = true;
  while (changed) {
    changed = false;
    const match = out.match(/^[\s\r\n]*(<p\b[^>]*>[\s\S]*?<\/p>)/i);
    if (match && isEmptyWordParagraph(match[1])) {
      out = out.slice(match[0].length).trimStart();
      changed = true;
    }
  }
  return out;
}

function mapWordAlignValue(value: string): string | null {
  const normalized = value.trim().toLowerCase();
  if (normalized === "both") return "justify";
  if (normalized === "left" || normalized === "center" || normalized === "right" || normalized === "justify") {
    return normalized;
  }
  return null;
}

/** Сворачивает пробелы в style и нормализует text-align (в т.ч. переносы строк из Word). */
function normalizeInlineStyleAttributes(html: string): string {
  return html.replace(/\bstyle\s*=\s*(['"])([\s\S]*?)\1/gi, (_full, quote: string, styleBody: string) => {
    let style = styleBody
      .replace(/[\r\n]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\s*;\s*/g, ";")
      .replace(/\s*:\s*/g, ":");

    style = style.replace(/text-align:both\b/gi, "text-align:justify");
    return `style=${quote}${style}${quote}`;
  });
}

type WordAlignRule = {
  tag?: string;
  className?: string;
  align: string;
};

function parseWordStylesheetAlignRules(css: string): WordAlignRule[] {
  const rules: WordAlignRule[] = [];
  const cleaned = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const ruleRe = /([^{]+)\{([^{}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = ruleRe.exec(cleaned)) !== null) {
    const alignMatch = match[2].match(/text-align\s*:\s*([a-z-]+)/i);
    if (!alignMatch) continue;
    const align = mapWordAlignValue(alignMatch[1]);
    if (!align) continue;
    for (const rawSelector of match[1].split(",")) {
      const selector = rawSelector.trim();
      if (!selector || /[#\s>+~[\]]/.test(selector)) continue;
      const tagClass = selector.match(/^([a-z][a-z0-9]*)?\.([A-Za-z0-9_-]+)$/i);
      const tagOnly = selector.match(/^([a-z][a-z0-9]*)$/i);
      const classOnly = selector.match(/^\.([A-Za-z0-9_-]+)$/);
      if (tagClass) {
        rules.push({
          tag: tagClass[1].toLowerCase(),
          className: tagClass[2],
          align,
        });
      } else if (tagOnly) {
        rules.push({ tag: tagOnly[1].toLowerCase(), align });
      } else if (classOnly) {
        rules.push({ className: classOnly[1], align });
      }
    }
  }
  return rules;
}

function elementMatchesWordAlignRule(tag: string, classAttr: string, rule: WordAlignRule): boolean {
  if (rule.tag && rule.tag !== tag.toLowerCase()) return false;
  if (rule.className) {
    const classes = classAttr.split(/\s+/).filter(Boolean);
    if (!classes.includes(rule.className)) return false;
  }
  return true;
}

function appendTextAlignToAttrs(attrs: string, align: string): string {
  if (/\btext-align\s*:/i.test(attrs)) return attrs;
  const styleMatch = attrs.match(/\bstyle\s*=\s*(['"])([\s\S]*?)\1/i);
  if (styleMatch) {
    const quote = styleMatch[1];
    const styleBody = styleMatch[2].trim().replace(/;?\s*$/, "");
    const newStyle = styleBody ? `${styleBody};text-align:${align}` : `text-align:${align}`;
    return attrs.replace(styleMatch[0], `style=${quote}${newStyle}${quote}`);
  }
  return `${attrs} style="text-align:${align}"`;
}

/** text-align из &lt;style&gt; Word (p.MsoNormal, h1, …) → inline style на тегах. */
function inlineStylesheetTextAlign(html: string): string {
  const styleBlocks = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
  if (!styleBlocks.length) return html;
  const rules = styleBlocks.flatMap(parseWordStylesheetAlignRules);
  if (!rules.length) return html;

  return html.replace(/<(p|h[1-6]|div|li|td|th)\b([^>]*)>/gi, (full, tag: string, attrs: string) => {
    const classMatch = attrs.match(/\bclass\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/i);
    const classAttr = classMatch?.[1] || classMatch?.[2] || classMatch?.[3] || "";
    let align: string | null = null;
    for (const rule of rules) {
      if (elementMatchesWordAlignRule(tag, classAttr, rule)) align = rule.align;
    }
    if (!align) return full;
    return `<${tag}${appendTextAlignToAttrs(attrs, align)}>`;
  });
}

/** Устаревший align="center|left|right|justify" → text-align в style. */
function convertLegacyAlignAttributes(html: string): string {
  return html.replace(
    /<(p|h[1-6]|div|li|td|th)\b([^>]*?)>/gi,
    (full, tag: string, attrs: string) => {
      const alignMatch = attrs.match(/\balign\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/i);
      if (!alignMatch) return full;
      const alignValue = mapWordAlignValue(alignMatch[1] || alignMatch[2] || alignMatch[3] || "");
      if (!alignValue) return full;
      if (/\btext-align\s*:/i.test(attrs)) return full;

      const styleMatch = attrs.match(/\bstyle\s*=\s*(['"])([\s\S]*?)\1/i);
      if (styleMatch) {
        const quote = styleMatch[1];
        const styleBody = styleMatch[2].trim().replace(/;?\s*$/, "");
        const newStyle = styleBody ? `${styleBody};text-align:${alignValue}` : `text-align:${alignValue}`;
        const newAttrs = attrs.replace(styleMatch[0], `style=${quote}${newStyle}${quote}`);
        return `<${tag}${newAttrs}>`;
      }
      return `<${tag}${attrs} style="text-align:${alignValue}">`;
    },
  );
}

const WORD_BLUE_TITLE_COLOR = /#4472C4/i;
const WORD_BLUE_TITLE_RGB = /rgb\s*\(\s*68\s*,\s*114\s*,\s*196\s*\)/i;

function paragraphContainsWordBlueTitle(attrs: string, inner: string): boolean {
  const blob = `${attrs}${inner}`;
  return WORD_BLUE_TITLE_COLOR.test(blob) || WORD_BLUE_TITLE_RGB.test(blob);
}

/** Синие заголовки Word (#4472C4) — отдельный класс для переноса по слогам в CSS. */
function markWordBlueTitleBlocks(html: string): string {
  return html.replace(/<(p|h[1-6])\b([^>]*)>([\s\S]*?)<\/\1>/gi, (full, tag: string, attrs: string, inner: string) => {
    if (!paragraphContainsWordBlueTitle(attrs, inner)) return full;
    return `<${tag}${appendClassNameToAttrs(attrs, "word-doc-blue-title")}>${inner}</${tag}>`;
  });
}

/** Стили и разметка Word HTML → то, что понимают браузеры. */
function enhanceWordExportedHtml(html: string): string {
  let out = inlineStylesheetTextAlign(html);
  out = convertLegacyAlignAttributes(out);
  out = normalizeInlineStyleAttributes(out);
  out = normalizeWordFontShorthandInStyles(out);
  out = applyLineBreakTransforms(out);
  out = stripTrailingBreaksInFlowParagraphs(out);
  out = stripTextIndentOnCenteredBlocks(out);
  out = normalizeCenteredAndHeadingLineBreaks(out);
  out = markWordBlueTitleBlocks(out);
  out = stripWordBookmarkSpans(out);
  out = collapseLineBreaksBetweenParagraphs(out);
  out = out.replace(/mso-bidi-font-weight\s*:\s*bold\b/gi, "font-weight:bold");
  out = preserveWordEmptyLineParagraphs(out);
  out = stripLeadingEmptyWordParagraphs(out);
  return out.trim();
}

function absolutizeStylesheetHrefTag(tag: string, baseOrigin: string): string {
  if (!baseOrigin) return tag;
  return tag.replace(
    /\bhref\s*=\s*(['"])([^'"]+)\1/i,
    (_full, quote: string, href: string) => {
      const rawHref = String(href || "").trim();
      if (!rawHref) return _full;
      try {
        const absoluteHref = new URL(rawHref, baseOrigin).toString();
        return `href=${quote}${absoluteHref}${quote}`;
      } catch {
        return _full;
      }
    },
  );
}

/** Единая нормализация HTML-правовых документов (политика и согласие) для сохранения и показа в диалоге. */
export function normalizePolicyHtml(html: string, baseOrigin = ""): string {
  const raw = String(html || "").trim();
  if (!raw) return "";
  const bodyMatch = raw.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch?.[1]) {
    const headMatch = raw.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
    const head = headMatch?.[1] ?? "";
    const styleTags = head.match(/<style\b[^>]*>[\s\S]*?<\/style>/gi) ?? [];
    const stylesheetLinkTags = (head.match(/<link\b[^>]*>/gi) ?? [])
      .filter((tag) => /\brel\s*=\s*(['"])stylesheet\1/i.test(tag) || /\brel\s*=\s*stylesheet\b/i.test(tag))
      .map((tag) => absolutizeStylesheetHrefTag(tag, baseOrigin));
    return enhanceWordExportedHtml(
      [...styleTags, ...stylesheetLinkTags, bodyMatch[1].trim()].join("\n"),
    );
  }
  return enhanceWordExportedHtml(raw);
}
