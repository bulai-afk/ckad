/** Класс обёртки для HTML правовых документов (диалог и предпросмотр в админке). */
export const POLICY_HTML_DOCUMENT_CLASS =
  "policy-html-document min-w-0 w-full max-w-full text-sm leading-relaxed text-slate-700 [overflow-wrap:anywhere] [&_*]:max-w-full [&_*]:[overflow-wrap:anywhere] [&_*]:!ml-0 [&_*]:!mr-0 [&_*]:!left-auto [&_*]:!right-auto [&_*]:!translate-x-0 [&_*]:!transform-none";

function isEmptyWordParagraph(paragraphHtml: string): boolean {
  const inner = paragraphHtml
    .replace(/^<p\b[^>]*>/i, "")
    .replace(/<\/p>\s*$/i, "")
    .replace(/<o:p>[\s\S]*?<\/o:p>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;|\u00a0/g, " ")
    .trim();
  return inner.length === 0;
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

/** Стили и разметка Word HTML → то, что понимают браузеры. */
function enhanceWordExportedHtml(html: string): string {
  let out = inlineStylesheetTextAlign(html);
  out = convertLegacyAlignAttributes(out);
  out = normalizeInlineStyleAttributes(out);
  out = out
    .replace(/mso-bidi-font-weight\s*:\s*bold\b/gi, "font-weight:bold")
    .replace(/<o:p>\s*(?:&nbsp;|\u00a0)?\s*<\/o:p>/gi, "")
    .replace(/<o:p>\s*<\/o:p>/gi, "");
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
