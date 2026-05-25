/** Обёртка шапки и карточек feature-grid для вертикального центрирования относительно изображения. */

export function getFeatureGridContentWrap(root: HTMLElement): HTMLElement | null {
  return root.querySelector(":scope > .page-web-feature-grid-content") as HTMLElement | null;
}

export function ensureFeatureGridContentWrap(root: HTMLElement): boolean {
  let changed = false;
  let content = getFeatureGridContentWrap(root);
  const directHead = root.querySelector(":scope > .page-web-feature-grid-head") as HTMLElement | null;
  const directList = root.querySelector(":scope > .page-web-feature-grid-list") as HTMLElement | null;
  const image = root.querySelector(":scope > .page-web-feature-grid-image") as HTMLElement | null;

  if (!content && !directHead && !directList) return false;

  if (!content) {
    content = document.createElement("div");
    content.className = "page-web-feature-grid-content";
    content.setAttribute("contenteditable", "false");
    const insertBefore = directHead ?? directList ?? image;
    if (insertBefore) root.insertBefore(content, insertBefore);
    else root.appendChild(content);
    changed = true;
  }

  if (content.getAttribute("contenteditable") !== "false") {
    content.setAttribute("contenteditable", "false");
    changed = true;
  }

  if (directHead && directHead.parentElement === root) {
    content.appendChild(directHead);
    changed = true;
  }
  if (directList && directList.parentElement === root) {
    content.appendChild(directList);
    changed = true;
  }

  const head = content.querySelector(":scope > .page-web-feature-grid-head") as HTMLElement | null;
  const list = content.querySelector(":scope > .page-web-feature-grid-list") as HTMLElement | null;
  if (head && list && head.nextElementSibling !== list) {
    content.insertBefore(head, list);
    changed = true;
  }

  if (image && image.previousElementSibling !== content) {
    root.appendChild(image);
    changed = true;
  }

  return changed;
}

export function normalizeFeatureGridContentWrapInRoot(rootEl: HTMLElement): boolean {
  let changed = false;
  rootEl.querySelectorAll(".page-web-feature-grid").forEach((node) => {
    const grid = node as HTMLElement;
    if (ensureFeatureGridContentWrap(grid)) changed = true;
    if (ensureFeatureGridImageDisplay(grid)) changed = true;
  });
  return changed;
}

function isFeatureGridImagePosition(value: string | null): value is "none" | "left" | "right" | "bottom" {
  return value === "none" || value === "left" || value === "right" || value === "bottom";
}

export function featureGridImagePositionSupportsDisplay(
  pos: "none" | "left" | "right" | "bottom",
): boolean {
  return pos === "left" || pos === "right" || pos === "bottom";
}

/** Режим «фон» / «отдельно» — для изображения слева, справа или снизу. */
export function ensureFeatureGridImageDisplay(root: HTMLElement): boolean {
  const posRaw = root.getAttribute("data-feature-grid-image-position");
  const pos = isFeatureGridImagePosition(posRaw) ? posRaw : "none";
  if (!featureGridImagePositionSupportsDisplay(pos)) {
    if (!root.hasAttribute("data-feature-grid-image-display")) return false;
    root.removeAttribute("data-feature-grid-image-display");
    return true;
  }
  const raw = root.getAttribute("data-feature-grid-image-display");
  if (raw === "background" || raw === "separate") return false;
  root.setAttribute("data-feature-grid-image-display", "separate");
  return true;
}
