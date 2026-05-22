"use client";

import {
  Bars3BottomLeftIcon,
  Bars3BottomRightIcon,
} from "@heroicons/react/20/solid";
import type { BannerCoverFocusField, BannerCoverEditorSlideModel } from "@/components/admin/BannerCoverEditorSlide";
import type { BannerHAlign } from "@/lib/bannerElementPosition";
import { COVER_ASPECT_PRESETS, type CoverAspectPresetId } from "@/lib/bannerCoverPresets";

const ICON_SIZE = "h-4 w-4";

function AlignCenterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 6h18v2H3V6zm4 5h10v2H7v-2zm-5 5h20v2H2v-2z" />
    </svg>
  );
}

type BannerCoverFormatBarProps = {
  focusField: BannerCoverFocusField;
  slide: BannerCoverEditorSlideModel;
  onChange: (patch: Partial<BannerCoverEditorSlideModel>) => void;
  coverAspect: CoverAspectPresetId;
  onCoverAspectChange?: (aspect: CoverAspectPresetId) => void;
  onAddSlide?: () => void;
  onRemoveSlide?: () => void;
  canRemoveSlide?: boolean;
};

export function BannerCoverFormatBar({
  focusField,
  slide,
  onChange,
  coverAspect,
  onCoverAspectChange,
  onAddSlide,
  onRemoveSlide,
  canRemoveSlide = false,
}: BannerCoverFormatBarProps) {
  const activeField = focusField ?? "title";

  const applyHAlign = (align: BannerHAlign) => {
    if (activeField === "title") {
      onChange({ titleAlign: align });
      return;
    }
    if (activeField === "description") {
      onChange({ subtitleAlign: align });
      return;
    }
    if (activeField === "actions") {
      onChange({ buttonAlign: align });
      return;
    }
    if (activeField === "announcement") {
      onChange({ align });
    }
  };

  const currentH: BannerHAlign =
    activeField === "title"
      ? (slide.titleAlign ?? "center")
      : activeField === "description"
        ? (slide.subtitleAlign ?? "center")
        : activeField === "actions"
          ? (slide.buttonAlign ?? "center")
          : (slide.align ?? "center");

  return (
    <div className="banner-cover-format-bar" contentEditable={false}>
      <span className="banner-cover-format-label">Форматирование</span>
      <button
        type="button"
        className={`inline-flex h-7 w-7 items-center justify-center rounded transition-colors hover:text-[#496db3] ${
          currentH === "left" ? "bg-slate-200 text-[#496db3]" : "text-slate-600"
        }`}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={() => applyHAlign("left")}
        aria-label="Выравнивание слева"
      >
        <Bars3BottomLeftIcon className={ICON_SIZE} />
      </button>
      <button
        type="button"
        className={`inline-flex h-7 w-7 items-center justify-center rounded transition-colors hover:text-[#496db3] ${
          currentH === "center" ? "bg-slate-200 text-[#496db3]" : "text-slate-600"
        }`}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={() => applyHAlign("center")}
        aria-label="Выравнивание по центру"
      >
        <AlignCenterIcon className={ICON_SIZE} />
      </button>
      <button
        type="button"
        className={`inline-flex h-7 w-7 items-center justify-center rounded transition-colors hover:text-[#496db3] ${
          currentH === "right" ? "bg-slate-200 text-[#496db3]" : "text-slate-600"
        }`}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={() => applyHAlign("right")}
        aria-label="Выравнивание справа"
      >
        <Bars3BottomRightIcon className={ICON_SIZE} />
      </button>
      <div className="banner-cover-format-sep" aria-hidden="true" />
      <label className="banner-cover-format-label" htmlFor="banner-cover-aspect-select">
        Размер
      </label>
      <select
        id="banner-cover-aspect-select"
        className="banner-cover-format-aspect-select"
        value={coverAspect}
        aria-label="Размер баннера"
        onChange={(e) => onCoverAspectChange?.(e.target.value as CoverAspectPresetId)}
      >
        {COVER_ASPECT_PRESETS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
      {onAddSlide || onRemoveSlide ? (
        <>
          <div className="banner-cover-format-sep" aria-hidden="true" />
          {onAddSlide ? (
            <button
              type="button"
              className="banner-cover-format-slide-btn"
              onClick={onAddSlide}
            >
              Добавить слайд
            </button>
          ) : null}
          {onRemoveSlide ? (
            <button
              type="button"
              className="banner-cover-format-slide-btn banner-cover-format-slide-btn--danger"
              disabled={!canRemoveSlide}
              onClick={onRemoveSlide}
            >
              Удалить слайд
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
