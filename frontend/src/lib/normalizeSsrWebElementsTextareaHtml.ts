/**
 * Поля web-elements в сохранённом HTML часто имеют `rows>1` и инлайновый `height`
 * после автолэйаута в редакторе. На SSR до гидрации это даёт лишнюю высоту и
 * большой зазор между заголовком и описанием на обложке — нормализуем строку HTML.
 */
const WEB_ELEMENTS_TEXTAREA_CLASS =
  /\bpage-web-elements-(?:title|title2|description|subtitle)-input\b/;

function stripMeasurementFromStyleValue(style: string): string {
  return style
    .replace(/\s*height\s*:\s*[^;]+;?/gi, "")
    .replace(/\s*min-height\s*:\s*[^;]+;?/gi, "")
    .replace(/\s*width\s*:\s*[^;]+;?/gi, "")
    .replace(/\s*min-width\s*:\s*[^;]+;?/gi, "")
    .replace(/\s*max-width\s*:\s*[^;]+;?/gi, "")
    .trim();
}

function patchTextareaOpeningAttrs(attrs: string): string {
  let a = attrs;
  a = a.replace(/\srows\s*=\s*"[^"]*"/gi, "");
  a = a.replace(/\srows\s*=\s*'[^']*'/gi, "");
  a = a.replace(/\srows\s*=\s*[^\s/>]+/gi, "");
  a = a.replace(/\sstyle\s*=\s*"([^"]*)"/gi, (_, st: string) => {
    const cleaned = stripMeasurementFromStyleValue(st);
    if (!cleaned) return "";
    return ` style="${cleaned}"`;
  });
  a = a.replace(/\sstyle\s*=\s*'([^']*)'/gi, (_, st: string) => {
    const cleaned = stripMeasurementFromStyleValue(st);
    if (!cleaned) return "";
    return ` style='${cleaned}'`;
  });
  return ` rows="1"${a}`;
}

export function normalizeSsrWebElementsTextareaHtml(html: string): string {
  if (!html.includes("textarea") || !html.includes("page-web-elements-")) return html;
  return html.replace(/<textarea(\s[^>]*?)>/gi, (_, attrs: string) => {
    if (!WEB_ELEMENTS_TEXTAREA_CLASS.test(attrs)) return `<textarea${attrs}>`;
    return `<textarea${patchTextareaOpeningAttrs(attrs)}>`;
  });
}
