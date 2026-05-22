/** Позиционирование меню баннера в viewport (portal на body). */

const MENU_GAP_PX = 4;
const VIEWPORT_GAP_PX = 8;

export function resetCoverMenuDropdownStyles(dropdown: HTMLElement): void {
  dropdown.style.removeProperty("position");
  dropdown.style.removeProperty("left");
  dropdown.style.removeProperty("top");
  dropdown.style.removeProperty("right");
  dropdown.style.removeProperty("bottom");
  dropdown.style.removeProperty("transform");
  dropdown.style.removeProperty("z-index");
  dropdown.style.removeProperty("min-width");
  dropdown.style.removeProperty("max-width");
}

export function resetCoverSubmenuPanelStyles(root: ParentNode): void {
  root.querySelectorAll(".page-web-cover-menu-sub-panel").forEach((node) => {
    resetCoverSubmenuPanelStyle(node as HTMLElement);
  });
}

function resetCoverSubmenuPanelStyle(panel: HTMLElement): void {
  panel.style.removeProperty("left");
  panel.style.removeProperty("top");
  panel.style.removeProperty("right");
  panel.style.removeProperty("bottom");
  panel.style.removeProperty("transform");
  panel.style.removeProperty("display");
}

export function positionCoverMenuDropdownNearTrigger(
  trigger: HTMLElement,
  dropdown: HTMLElement,
): void {
  const apply = () => {
    const tr = trigger.getBoundingClientRect();
    dropdown.style.position = "fixed";
    dropdown.style.left = `${tr.right + MENU_GAP_PX}px`;
    dropdown.style.top = `${tr.top}px`;
    dropdown.style.right = "auto";
    dropdown.style.bottom = "auto";
    dropdown.style.transform = "none";
    dropdown.style.zIndex = "20050";
    dropdown.style.minWidth = "12.5rem";
    dropdown.style.maxWidth = `min(14rem, calc(100vw - ${VIEWPORT_GAP_PX * 2}px))`;
    dropdown.style.display = "block";

    const ddRect = dropdown.getBoundingClientRect();
    if (ddRect.right > window.innerWidth - VIEWPORT_GAP_PX) {
      dropdown.style.left = `${Math.max(VIEWPORT_GAP_PX, tr.left - ddRect.width - MENU_GAP_PX)}px`;
    }
    if (ddRect.bottom > window.innerHeight - VIEWPORT_GAP_PX) {
      dropdown.style.top = `${Math.max(VIEWPORT_GAP_PX, window.innerHeight - ddRect.height - VIEWPORT_GAP_PX)}px`;
    }
    if (ddRect.top < VIEWPORT_GAP_PX) {
      dropdown.style.top = `${VIEWPORT_GAP_PX}px`;
    }
  };
  apply();
}

/** Только подменю — не трогает якорь главного выпадающего меню. */
export function positionCoverSubmenuPanelsNearTriggers(root: ParentNode): void {
  root.querySelectorAll(".page-web-cover-menu-sub-panel").forEach((node) => {
    const panel = node as HTMLElement;
    const sub = panel.closest(".page-web-cover-menu-sub") as HTMLElement | null;
    const isOpen = sub?.getAttribute("data-submenu-open") === "1";
    if (!isOpen || !sub) {
      resetCoverSubmenuPanelStyle(panel);
      return;
    }

    const trigger = sub.querySelector(":scope > .page-web-cover-menu-sub-trigger") as HTMLElement | null;
    if (!trigger) return;

    const tr = trigger.getBoundingClientRect();
    panel.style.position = "fixed";
    panel.style.zIndex = "20060";
    panel.style.left = `${tr.right + MENU_GAP_PX}px`;
    panel.style.top = `${tr.top}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
    panel.style.transform = "none";
    panel.style.display = "block";

    const pr = panel.getBoundingClientRect();
    if (pr.right > window.innerWidth - VIEWPORT_GAP_PX) {
      panel.style.left = `${Math.max(VIEWPORT_GAP_PX, tr.left - pr.width - MENU_GAP_PX)}px`;
    }
    if (pr.bottom > window.innerHeight - VIEWPORT_GAP_PX) {
      panel.style.top = `${Math.max(VIEWPORT_GAP_PX, window.innerHeight - pr.height - VIEWPORT_GAP_PX)}px`;
    }
    if (pr.top < VIEWPORT_GAP_PX) {
      panel.style.top = `${VIEWPORT_GAP_PX}px`;
    }
  });
}

export function positionBannerCoverMenuPortal(
  trigger: HTMLElement,
  dropdown: HTMLElement,
  menuOpen: boolean,
): void {
  if (!menuOpen) {
    resetCoverMenuDropdownStyles(dropdown);
    resetCoverSubmenuPanelStyles(dropdown);
    return;
  }
  positionCoverMenuDropdownNearTrigger(trigger, dropdown);
  positionCoverSubmenuPanelsNearTriggers(dropdown);
}
