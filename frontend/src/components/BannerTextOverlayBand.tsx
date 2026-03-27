"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  bannerVerticalJustifyContent,
  parseBannerTextBand,
  type BannerTextBand,
} from "@/lib/bannerElementPosition";

type BannerTextOverlayBandProps = {
  textBand?: BannerTextBand | unknown;
  verticalAlign?: "top" | "middle" | "bottom";
  /** Tailwind padding, напр. px-6 md:px-10 (главная) или px-6 (админ-превью). */
  paddingClassName?: string;
  className?: string;
  children: ReactNode;
};

/**
 * Обёртка текстового слоя банера: на всю ширину или в левой/правой половине.
 * Базовый шрифт — от **размера баннера** (cqw/cqh), с умеренным верхним пределом,
 * чтобы заголовок / подзаголовок / кнопка масштабировались, но не перегружали блок.
 */
export function BannerTextOverlayBand({
  textBand: textBandRaw,
  verticalAlign,
  paddingClassName = "px-6 md:px-10",
  className = "",
  children,
}: BannerTextOverlayBandProps) {
  const band = parseBannerTextBand(textBandRaw);
  const vJustify = bannerVerticalJustifyContent(verticalAlign);

  // min(cqw, k·cqh): текст растёт с баннером, но умеренно (между старым потолком 16px и завышенным ~34px).
  const colStyle: CSSProperties = {
    fontSize: "clamp(10px, min(2.05cqw, 4.8cqh), 21px)",
    justifyContent: vJustify,
    alignItems: "stretch",
    minHeight: "100%",
    width: "100%",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
  };

  const extra = className.trim();

  if (band === "full") {
    return (
      <div
        className={`absolute inset-0 z-20 ${extra}`.trim()}
        style={{ containerType: "size" }}
      >
        <div
          className={`flex h-full w-full flex-col ${paddingClassName}`.trim()}
          style={colStyle}
        >
          {children}
        </div>
      </div>
    );
  }

  /* Левая/правая половина — ровно 50% ширины баннера. */
  const positionStyle: CSSProperties =
    band === "left"
      ? { left: 0, width: "50%" }
      : { right: 0, width: "50%" };

  return (
    <div
      className={`absolute inset-0 z-20 ${extra}`.trim()}
      style={{ containerType: "size" }}
    >
      <div
        className={`absolute top-0 box-border flex flex-col ${paddingClassName}`.trim()}
        style={{
          ...colStyle,
          ...positionStyle,
          height: "100%",
        }}
      >
        {children}
      </div>
    </div>
  );
}
