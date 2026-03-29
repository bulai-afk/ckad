"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useMemo, useRef } from "react";
import { useEqualizeFolderCardSlots } from "@/hooks/useEqualizeFolderCardSlots";
import styles from "./HomeServicesFolderCards.module.css";

export type HomeServicesFolderCard = {
  slugPath: string;
  label: string;
  description?: string;
  /** URL превью папки (фон карточки при наведении) */
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
  /** Вместо why-us-grid (на главной: services-home-grid — 2 колонки на мобильных) */
  gridClassName?: string;
  /** Выровнять все слоты по высоте самой высокой карточки (DOM, см. useEqualizeFolderCardSlots) */
  syncHeightsToTallest?: boolean;
  /** Превью на фоне карточки всегда (как при hover), без наведения — для статей */
  alwaysShowPreview?: boolean;
};

const DEFAULT_FALLBACK_PREVIEW = "/logo_1.svg";

function FolderCard({
  c,
  displaySrc,
  isLogoFallback,
  ctaLabel,
  equalHeight,
  alwaysShowPreview,
}: {
  c: HomeServicesFolderCard;
  displaySrc: string;
  isLogoFallback: boolean;
  ctaLabel: string;
  equalHeight: boolean;
  alwaysShowPreview: boolean;
}) {
  return (
    <div
      className={`${equalHeight ? "h-full min-h-0" : "h-auto"} ${styles.cardRoot} ${equalHeight ? styles.cardRootStretch : ""} ${alwaysShowPreview ? styles.cardPreviewAlways : ""}`}
      {...(alwaysShowPreview ? { "data-preview-always": "" } : {})}
    >
      <div className={styles.cardBgStack} aria-hidden>
        <div className={styles.cardBgImageWrap}>
          <img
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
        <Link href={`/${c.slugPath}`} className={styles.link}>
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
        const previewUrl = c.preview?.trim() || "";
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
            />
          </div>
        );
      })}
    </div>
  );
}
