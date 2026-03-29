"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEqualizeFolderCardSlots } from "@/hooks/useEqualizeFolderCardSlots";
import { sanitizePublicAssetUrl } from "@/lib/publicAssetUrl";
import styles from "./HomeServicesFolderCards.module.css";

export type HomeServicesFolderCard = {
  slugPath: string;
  label: string;
  description?: string;
  /** URL превью папки (фон карточки при активном превью) */
  preview?: string;
};

type Props = {
  cards: HomeServicesFolderCard[];
  /** По умолчанию 12 (главная); для хаба папки можно передать больше */
  limit?: number;
  /** Текст ссылки внизу карточки */
  ctaLabel?: string;
  /** Если у карточки нет превью, показывать это изображение (по умолчанию лого сайта) */
  fallbackPreviewSrc?: string;
  /** Карточки в ряду одной высоты (главная) */
  equalHeight?: boolean;
  /** Слайд карусели: сетка на всю ширину колонки без max-width 75rem */
  embedInCarousel?: boolean;
  /** Вместо why-us-grid (на главной: services-home-grid — 1 колонка на мобильных) */
  gridClassName?: string;
  /** Выровнять все слоты по высоте самой высокой карточки (DOM, см. useEqualizeFolderCardSlots) */
  syncHeightsToTallest?: boolean;
  /** Превью на фоне всегда (без наведения / удержания) — редкий режим */
  alwaysShowPreview?: boolean;
};

const DEFAULT_FALLBACK_PREVIEW = "/logo_1.svg";

const CARD_SELECTOR = "[data-service-folder-card]";

function FolderCard({
  c,
  displaySrc,
  isLogoFallback,
  ctaLabel,
  equalHeight,
  alwaysShowPreview,
  touchActiveSlug,
  setTouchActiveSlug,
}: {
  c: HomeServicesFolderCard;
  displaySrc: string;
  isLogoFallback: boolean;
  ctaLabel: string;
  equalHeight: boolean;
  alwaysShowPreview: boolean;
  touchActiveSlug: string | null;
  setTouchActiveSlug: (slug: string | null) => void;
}) {
  const href = `/${c.slugPath}`;
  const touchHeld = !alwaysShowPreview && touchActiveSlug === c.slugPath;

  const activatePreviewTouch = useCallback(
    (target: EventTarget | null) => {
      if (alwaysShowPreview) return;
      const el = target instanceof Element ? target : null;
      if (el?.closest?.("a")) return;
      setTouchActiveSlug(c.slugPath);
    },
    [alwaysShowPreview, c.slugPath, setTouchActiveSlug],
  );

  /** pointerdown приходит на мобильных не всегда сразу; touchstart даёт лёгкое касание без «сильного» нажатия */
  const onCardPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (e.pointerType === "mouse") return;
      activatePreviewTouch(e.target);
    },
    [activatePreviewTouch],
  );

  const onCardTouchStart = useCallback(
    (e: React.TouchEvent<HTMLElement>) => {
      activatePreviewTouch(e.target);
    },
    [activatePreviewTouch],
  );

  return (
    <div
      data-service-folder-card=""
      className={`${equalHeight ? "h-full min-h-0" : "h-auto"} ${styles.cardRoot} ${equalHeight ? styles.cardRootStretch : ""} ${alwaysShowPreview ? styles.cardPreviewAlways : ""}`}
      {...(alwaysShowPreview ? { "data-preview-always": "" } : {})}
      {...(touchHeld ? { "data-preview-touch": "" } : {})}
      onPointerDown={onCardPointerDown}
      onTouchStart={onCardTouchStart}
    >
      <div className={styles.cardBgStack} aria-hidden>
        <div className={styles.cardBgImageWrap}>
          <img
            key={`${c.slugPath}-${displaySrc.length}-${isLogoFallback ? "logo" : "pv"}`}
            src={displaySrc}
            alt=""
            className={`${styles.cardBgImg} ${isLogoFallback ? styles.cardBgImgLogo : ""}`}
            decoding="async"
          />
        </div>
        <div className={styles.cardBgDim} />
        <div className={styles.cardBgGradient} />
      </div>
      <div className={`${styles.content} ${equalHeight ? styles.contentGrow : ""}`}>
        <p className={styles.title}>{c.label}</p>
        {c.description?.trim() ? (
          <p className={styles.description}>{c.description.trim()}</p>
        ) : null}
      </div>
      <div className={`${styles.footer} ${equalHeight ? styles.footerStick : ""}`}>
        <Link
          href={href}
          className={styles.link}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}

export function HomeServicesFolderCards({
  cards,
  limit = 12,
  ctaLabel = "Перейти в раздел",
  fallbackPreviewSrc = DEFAULT_FALLBACK_PREVIEW,
  equalHeight = false,
  embedInCarousel = false,
  gridClassName,
  syncHeightsToTallest = false,
  alwaysShowPreview = false,
}: Props) {
  const items = (cards || [])
    .filter((c) => c?.slugPath && c?.label?.trim())
    .slice(0, limit);

  const [touchActiveSlug, setTouchActiveSlug] = useState<string | null>(null);

  useEffect(() => {
    const onDocPointerDown = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.(CARD_SELECTOR);
      if (!el) setTouchActiveSlug(null);
    };
    document.addEventListener("pointerdown", onDocPointerDown, true);
    return () => document.removeEventListener("pointerdown", onDocPointerDown, true);
  }, []);

  useEffect(() => {
    if (touchActiveSlug === null) return;
    const clear = () => setTouchActiveSlug(null);
    window.addEventListener("pointerup", clear);
    window.addEventListener("pointercancel", clear);
    window.addEventListener("touchend", clear, { passive: true });
    window.addEventListener("touchcancel", clear, { passive: true });
    return () => {
      window.removeEventListener("pointerup", clear);
      window.removeEventListener("pointercancel", clear);
      window.removeEventListener("touchend", clear);
      window.removeEventListener("touchcancel", clear);
    };
  }, [touchActiveSlug]);

  const containerRef = useRef<HTMLDivElement>(null);
  const itemsKey = useMemo(
    () => `${items.map((i) => i.slugPath).join("\0")}|pv${alwaysShowPreview ? "1" : "0"}`,
    [items, alwaysShowPreview],
  );

  const runEqualizeSlots =
    syncHeightsToTallest && equalHeight && !embedInCarousel && items.length > 1;

  useEqualizeFolderCardSlots(containerRef, runEqualizeSlots, itemsKey);

  const listStyle: CSSProperties = {
    fontSize: "clamp(13px, 0.7vw, 14px)",
  };

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-slate-200/80 bg-slate-50 px-4 py-6 text-center text-[14px] font-semibold text-[#496db3]/70 shadow-[0_6px_24px_rgba(73,109,179,0.12)]">
        Разделы услуг скоро появятся.
      </p>
    );
  }

  return (
    <div
      ref={containerRef}
      role="list"
      className={`grid gap-3 ${equalHeight ? "items-stretch" : "items-start"} ${styles.list} ${equalHeight ? styles.listEqualHeight : ""} ${embedInCarousel ? `${styles.listEmbed} ${styles.gridCarousel}` : gridClassName ?? "why-us-grid"}`}
      style={listStyle}
    >
      {items.map((c) => {
        const previewUrl = sanitizePublicAssetUrl(c.preview?.trim() || "");
        const isLogoFallback = !previewUrl;
        const displaySrc = previewUrl || fallbackPreviewSrc;
        return (
          <div
            key={c.slugPath}
            role="listitem"
            data-folder-card-slot
            className={`${styles.itemSlot} ${equalHeight ? `${styles.itemSlotStretch} h-full min-h-0` : ""}`}
          >
            <FolderCard
              c={c}
              displaySrc={displaySrc}
              isLogoFallback={isLogoFallback}
              ctaLabel={ctaLabel}
              equalHeight={equalHeight}
              alwaysShowPreview={alwaysShowPreview}
              touchActiveSlug={touchActiveSlug}
              setTouchActiveSlug={setTouchActiveSlug}
            />
          </div>
        );
      })}
    </div>
  );
}
