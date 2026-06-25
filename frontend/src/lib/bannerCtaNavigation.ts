import type { MouseEvent, PointerEvent } from "react";
import {
  CALLBACK_FORM_LINK,
  isCallbackFormLink,
  parseSiteDocumentLinkIndex,
  SITE_DOCUMENT_LINK_PREFIX,
} from "@/lib/siteDocumentLink";
import { YM_TRACKABLE_CTA_SELECTOR } from "@/lib/yandexMetrika";

/** Ссылки CTA на публичных страницах из редактора (совпадает с селектором целей Метрики). */
export const PUBLIC_WEB_CTA_LINK_SELECTOR = YM_TRACKABLE_CTA_SELECTOR;

export function readWebCtaHref(link: HTMLAnchorElement): string {
  return (link.getAttribute("href") || link.getAttribute("data-href") || "").trim();
}

export function applyPublicWebCtaLinkTargets(root: ParentNode): void {
  root.querySelectorAll(PUBLIC_WEB_CTA_LINK_SELECTOR).forEach((node) => {
    if (!(node instanceof HTMLAnchorElement)) return;
    const href = readWebCtaHref(node);
    const props = bannerCtaLinkTargetProps(href);
    if (props.target) {
      node.setAttribute("target", props.target);
      node.setAttribute("rel", props.rel);
    } else {
      node.removeAttribute("target");
      node.removeAttribute("rel");
    }
  });
}

export function normalizeBannerCtaHref(href: string): string {
  const trimmed = href.trim();
  if (!trimmed || trimmed === "#") return "";
  if (
    trimmed.startsWith("/") ||
    /^https?:\/\//i.test(trimmed) ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("tel:")
  ) {
    return trimmed;
  }
  if (trimmed.startsWith(CALLBACK_FORM_LINK) || trimmed.startsWith(SITE_DOCUMENT_LINK_PREFIX)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export function isBannerCtaInPageAction(href: string): boolean {
  const normalized = normalizeBannerCtaHref(href);
  if (!normalized) return true;
  if (parseSiteDocumentLinkIndex(normalized) !== null) return true;
  if (isCallbackFormLink(normalized)) return true;
  return false;
}

export function bannerCtaLinkTargetProps(href: string): { target: "_blank"; rel: "noopener noreferrer" } | Record<string, never> {
  return isBannerCtaInPageAction(href) ? {} : { target: "_blank", rel: "noopener noreferrer" };
}

export function handleBannerCtaClick(
  e: MouseEvent<HTMLElement>,
  href: string,
  handlers?: {
    onPrimaryClick?: () => void;
    onDocumentClick?: (index: number) => void;
  },
): void {
  const normalized = normalizeBannerCtaHref(href);
  if (!normalized) {
    e.preventDefault();
    return;
  }

  const docIndex = parseSiteDocumentLinkIndex(normalized);
  if (docIndex !== null) {
    e.preventDefault();
    handlers?.onDocumentClick?.(docIndex);
    return;
  }

  if (isCallbackFormLink(normalized)) {
    e.preventDefault();
    handlers?.onPrimaryClick?.();
    return;
  }

  e.preventDefault();
  window.open(normalized, "_blank", "noopener,noreferrer");
}

export function stopCarouselPointerOnCta(e: PointerEvent<HTMLAnchorElement>): void {
  e.stopPropagation();
}
