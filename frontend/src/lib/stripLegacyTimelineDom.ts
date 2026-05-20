/**
 * Removes pre–web-elements timeline markup (headings / paragraphs) and ensures
 * the v2 field shells exist with empty textareas. Used when legacy HTML
 * migrations are disabled but stored HTML still contains old nodes.
 */

function escapeWebBlockHtmlText(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getWebTimelineHeadFieldsEmptyHtml(): string {
  const t = escapeWebBlockHtmlText("");
  return (
    '<div class="page-web-text-block-v2-fields" contenteditable="false">' +
    '<div class="page-web-elements page-web-elements-subtitle">' +
    '<div class="page-web-elements-field-row">' +
    '<textarea class="page-web-elements-subtitle-input" spellcheck="true" placeholder="Подзаголовок" rows="1">' +
    t +
    "</textarea></div></div>" +
    '<div class="page-web-elements page-web-elements-title">' +
    '<div class="page-web-elements-field-row">' +
    '<textarea class="page-web-elements-title-input" spellcheck="true" placeholder="Заголовок 1" rows="1">' +
    t +
    "</textarea></div></div>" +
    '<div class="page-web-elements page-web-elements-description">' +
    '<div class="page-web-elements-field-row">' +
    '<textarea class="page-web-elements-description-input" spellcheck="true" placeholder="Короткое описание" rows="1">' +
    t +
    "</textarea></div></div>" +
    "</div>"
  );
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

function normalizeTimelineHead(head: HTMLElement): boolean {
  let changed = false;
  const legacySel = ".page-web-timeline-subtitle, .page-web-timeline-heading, .page-web-timeline-description";
  const hadLegacyNodes =
    Boolean(head.querySelector(legacySel)) ||
    Boolean(head.querySelector(":scope > p, :scope > h1, :scope > h2, :scope > h3"));
  head.querySelectorAll(legacySel).forEach((n) => {
    n.remove();
    changed = true;
  });
  head.querySelectorAll(":scope > p, :scope > h1, :scope > h2, :scope > h3").forEach((n) => {
    n.remove();
    changed = true;
  });
  const shell = head.querySelector(":scope > .page-web-text-block-v2-fields");
  const hasAll =
    Boolean(shell?.querySelector("textarea.page-web-elements-subtitle-input")) &&
    Boolean(shell?.querySelector("textarea.page-web-elements-title-input")) &&
    Boolean(shell?.querySelector("textarea.page-web-elements-description-input"));
  if (!hasAll) {
    head.innerHTML = getWebTimelineHeadFieldsEmptyHtml();
    head.setAttribute("contenteditable", "false");
    changed = true;
  } else if (hadLegacyNodes && shell) {
    shell.querySelectorAll("textarea").forEach((n) => {
      if (n instanceof HTMLTextAreaElement && n.value) {
        n.value = "";
        changed = true;
      }
    });
  }
  return changed;
}

function normalizeTimelineItem(item: HTMLElement): boolean {
  let changed = false;
  const hadLegacyTermP = Boolean(item.querySelector(":scope > p.page-web-timeline-term"));
  const content = item.querySelector(":scope > .page-web-timeline-content") as HTMLElement | null;
  const legacyContentSel =
    ":scope > .page-web-timeline-title, :scope > p.page-web-timeline-text, :scope > p, :scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6";
  const hadLegacyBody = Boolean(content?.querySelector(legacyContentSel));
  item.querySelectorAll(":scope > p.page-web-timeline-term").forEach((n) => {
    n.remove();
    changed = true;
  });
  if (content) {
    content.querySelectorAll(legacyContentSel).forEach((n) => {
      n.remove();
      changed = true;
    });
    const hasTitle2 = Boolean(content.querySelector(":scope textarea.page-web-elements-title2-input"));
    const hasDesc = Boolean(
      content.querySelector(
        ":scope > .page-web-elements.page-web-elements-description.page-web-timeline-text textarea.page-web-elements-description-input",
      ),
    );
    if (!hasTitle2 && !hasDesc) {
      content.innerHTML = getWebTimelineItemTitle2Html("") + getWebTimelineItemStepDescriptionHtml("");
      changed = true;
    } else {
      if (!hasTitle2) {
        const tmp = document.createElement("div");
        tmp.innerHTML = getWebTimelineItemTitle2Html("");
        const first = tmp.firstElementChild;
        if (first) {
          content.insertBefore(first, content.firstChild);
          changed = true;
        }
      }
      if (!hasDesc) {
        const tmp = document.createElement("div");
        tmp.innerHTML = getWebTimelineItemStepDescriptionHtml("");
        const first = tmp.firstElementChild;
        if (first) {
          content.appendChild(first);
          changed = true;
        }
      }
    }
  }
  if (
    hadLegacyTermP &&
    !item.querySelector(":scope > .page-web-elements.page-web-timeline-term")
  ) {
    const tmp = document.createElement("div");
    tmp.innerHTML = getWebTimelineItemTermHtml("");
    const termNode = tmp.firstElementChild;
    if (termNode) {
      item.insertBefore(termNode, item.firstChild);
      changed = true;
    }
  }
  if (hadLegacyBody && content) {
    content.querySelectorAll("textarea.page-web-elements-title2-input, textarea.page-web-elements-description-input").forEach((n) => {
      if (n instanceof HTMLTextAreaElement && n.value) {
        n.value = "";
        changed = true;
      }
    });
  }
  if (hadLegacyTermP) {
    item
      .querySelectorAll(
        ":scope > .page-web-elements.page-web-timeline-term textarea.page-web-elements-subtitle-input",
      )
      .forEach((n) => {
        if (n instanceof HTMLTextAreaElement && n.value) {
          n.value = "";
          changed = true;
        }
      });
  }
  return changed;
}

/** Returns true if the timeline DOM was mutated. */
export function stripLegacyTimelineDom(timeline: HTMLElement): boolean {
  let changed = false;
  const head = timeline.querySelector(":scope > .page-web-timeline-head") as HTMLElement | null;
  if (head && normalizeTimelineHead(head)) changed = true;
  timeline.querySelectorAll(".page-web-timeline-item").forEach((it) => {
    const item = it as HTMLElement;
    const hadLegacyItem =
      item.querySelector(":scope > p.page-web-timeline-term") ||
      item.querySelector(
        ":scope > .page-web-timeline-content > .page-web-timeline-title, :scope > .page-web-timeline-content > p.page-web-timeline-text, :scope > .page-web-timeline-content > p, :scope > .page-web-timeline-content > h1, :scope > .page-web-timeline-content > h2, :scope > .page-web-timeline-content > h3, :scope > .page-web-timeline-content > h4, :scope > .page-web-timeline-content > h5, :scope > .page-web-timeline-content > h6",
      );
    const content = item.querySelector(":scope > .page-web-timeline-content") as HTMLElement | null;
    const missingIslands =
      content &&
      (!content.querySelector(":scope textarea.page-web-elements-title2-input") ||
        !content.querySelector(
          ":scope > .page-web-elements.page-web-elements-description.page-web-timeline-text textarea.page-web-elements-description-input",
        ));
    if (hadLegacyItem || missingIslands) {
      if (normalizeTimelineItem(item)) changed = true;
    }
  });
  return changed;
}

export function stripLegacyTimelineDomInRoot(root: HTMLElement): boolean {
  let changed = false;
  root.querySelectorAll(".page-web-timeline").forEach((t) => {
    if (stripLegacyTimelineDom(t as HTMLElement)) changed = true;
  });
  return changed;
}
