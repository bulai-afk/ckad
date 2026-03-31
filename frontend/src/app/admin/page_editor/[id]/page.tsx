"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useParams } from "next/navigation";
import { apiGet, apiPut } from "@/lib/api";
import {
  alignCarouselStripToStartSlideIndex,
  getCarouselSlideWidthPx,
  getCarouselVisibleSlides,
  refreshCarouselStripTranslateAfterLayout,
  shiftCarouselStripBySlide,
} from "@/lib/pageWebCarouselTranslate";
import { AdminSidebar } from "@/components/admin/Sidebar";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import {
  CarouselFullPreviewOverlay,
  type CarouselPreviewSessionState,
} from "@/components/CarouselFullPreviewOverlay";
import {
  ArrowRightIcon,
  Bars3BottomLeftIcon,
  Bars3BottomRightIcon,
  BoldIcon,
  BoltIcon,
  CheckCircleIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  EllipsisHorizontalIcon,
  EllipsisVerticalIcon,
  HeartIcon,
  ItalicIcon,
  ListBulletIcon,
  MinusIcon,
  NoSymbolIcon,
  NumberedListIcon,
  PhotoIcon,
  PlusIcon,
  StarIcon,
  StopIcon,
  GlobeAltIcon,
  TableCellsIcon,
  TrashIcon,
  UnderlineIcon,
  XMarkIcon,
} from "@heroicons/react/20/solid";

const ICON_SIZE = "h-4 w-4";

/** Вставка из панели «Web»: расширяйте список и getWebElementHtml. */
const WEB_PAGE_ELEMENTS = [
  { id: "cover", label: "Обложка", description: "Пустая область под титул и оформление" },
  { id: "carousel", label: "Карусель", description: "Слайды с изображениями, прокрутка на сайте" },
  { id: "timeline", label: "Таймлайн", description: "Этапы работы по шкале времени" },
] as const;

/** Соотношение сторон обложки (сохраняется в data-cover-aspect на .page-web-cover). arW/arH — как в CSS редактора (превью в меню). */
const COVER_ASPECT_PRESETS = [
  { id: "16-9", label: "16∶9", arW: 16, arH: 9 },
  { id: "4-3", label: "4∶3", arW: 4, arH: 3 },
  { id: "21-9", label: "21∶9", arW: 21, arH: 9 },
  { id: "1-1", label: "1∶1", arW: 1, arH: 1 },
  { id: "1-8", label: "1∶8", arW: 2, arH: 1 },
  { id: "1-4", label: "1∶4", arW: 4, arH: 1 },
  { id: "3-1", label: "3∶1", arW: 3, arH: 1 },
  { id: "8-1", label: "8∶1", arW: 8, arH: 1 },
] as const;

/** Тип изображения в карусели (сохраняется в data-carousel-aspect на .page-web-carousel). */
const CAROUSEL_IMAGE_TYPE_PRESETS = [
  { id: "vertical", label: "Вертикальное" },
  { id: "horizontal", label: "Горизонтальное" },
  { id: "square", label: "Квадратное" },
  { id: "a4", label: "А4 (210∶297)" },
] as const;

function getCoverAspectPreviewSvg(arW: number, arH: number): string {
  const pad = 10;
  const box = 100 - pad * 2;
  const r = arW / arH;
  let rw: number;
  let rh: number;
  let rx: number;
  let ry: number;
  if (r >= 1) {
    rw = box;
    rh = box / r;
    rx = pad;
    ry = pad + (box - rh) / 2;
  } else {
    rh = box;
    rw = box * r;
    ry = pad;
    rx = pad + (box - rw) / 2;
  }
  return (
    '<svg class="page-web-cover-menu-aspect-svg" viewBox="0 0 100 100" width="28" height="28" aria-hidden="true">' +
    '<rect x="' +
    rx.toFixed(2) +
    '" y="' +
    ry.toFixed(2) +
    '" width="' +
    rw.toFixed(2) +
    '" height="' +
    rh.toFixed(2) +
    '" rx="3" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5"/>' +
    "</svg>"
  );
}

const FONT_SIZES = [
  { value: "1", label: "10px" },
  { value: "2", label: "13px" },
  { value: "3", label: "16px" },
  { value: "4", label: "18px" },
  { value: "5", label: "24px" },
  { value: "6", label: "32px" },
  { value: "7", label: "48px" },
] as const;

const LIST_STYLE_UL = [
  { value: "disc", Icon: ListDiscIcon },
  { value: "circle", Icon: ListCircleIcon },
  { value: "square", Icon: StopIcon },
  { value: "check", Icon: CheckIcon },
  { value: "check-circle", Icon: CheckCircleIcon },
  { value: "dash", Icon: MinusIcon },
  { value: "arrow", Icon: ChevronRightIcon },
  { value: "arrow-right", Icon: ArrowRightIcon },
  { value: "star", Icon: StarIcon },
  { value: "heart", Icon: HeartIcon },
  { value: "bolt", Icon: BoltIcon },
  { value: "none", Icon: NoSymbolIcon },
] as const;

const CUSTOM_LIST_STYLES = ["disc", "circle", "square", "check", "check-circle", "dash", "arrow", "arrow-right", "star", "heart", "bolt"];

const LIST_MARKER_SVG = {
  disc: encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="white"><circle cx="10" cy="10" r="3.5"/></svg>'),
  circle: encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="white" stroke-width="2"><circle cx="10" cy="10" r="3.5"/></svg>'),
  square: encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="white"><path d="M5.25 3A2.25 2.25 0 0 0 3 5.25v9.5A2.25 2.25 0 0 0 5.25 17h9.5A2.25 2.25 0 0 0 17 14.75v-9.5A2.25 2.25 0 0 0 14.75 3h-9.5Z"/></svg>'),
  check: encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="white"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd"/></svg>'),
  "check-circle": encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="white"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clip-rule="evenodd"/></svg>'),
  dash: encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="white"><path fill-rule="evenodd" d="M4 10a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H4.75A.75.75 0 0 1 4 10Z" clip-rule="evenodd"/></svg>'),
  arrow: encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="white"><path fill-rule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"/></svg>'),
  "arrow-right": encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="white"><path fill-rule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clip-rule="evenodd"/></svg>'),
  star: encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="white"><path fill-rule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z" clip-rule="evenodd"/></svg>'),
  heart: encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="white"><path d="m9.653 16.915-.005-.003-.019-.01a20.759 20.759 0 0 1-1.162-.682 22.045 22.045 0 0 1-2.582-1.9C4.045 12.733 2 10.352 2 7.5a4.5 4.5 0 0 1 8-2.828A4.5 4.5 0 0 1 18 7.5c0 2.852-2.044 5.233-3.885 6.82a22.049 22.049 0 0 1-3.744 2.582l-.019.01-.005.003h-.002a.739.739 0 0 1-.69.001l-.002-.001Z"/></svg>'),
  bolt: encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="white"><path d="M11.983 1.907a.75.75 0 0 0-1.292-.657l-8.5 9.5A.75.75 0 0 0 2.75 12h6.572l-1.305 6.093a.75.75 0 0 0 1.292.657l8.5-9.5A.75.75 0 0 0 17.25 8h-6.572l1.305-6.093Z"/></svg>'),
};

const LIST_COLORS = [
  { value: "black", label: "Черный", hex: "#000000" },
  { value: "slate", label: "Slate", hex: "#64748b" },
  { value: "gray", label: "Gray", hex: "#6b7280" },
  { value: "zinc", label: "Zinc", hex: "#71717a" },
  { value: "red", label: "Red", hex: "#ef4444" },
  { value: "orange", label: "Orange", hex: "#f97316" },
  { value: "amber", label: "Amber", hex: "#f59e0b" },
  { value: "yellow", label: "Yellow", hex: "#eab308" },
  { value: "lime", label: "Lime", hex: "#84cc16" },
  { value: "green", label: "Green", hex: "#22c55e" },
  { value: "emerald", label: "Emerald", hex: "#10b981" },
  { value: "teal", label: "Teal", hex: "#14b8a6" },
  { value: "cyan", label: "Cyan", hex: "#06b6d4" },
  { value: "sky", label: "Sky", hex: "#0ea5e9" },
  { value: "blue", label: "Blue", hex: "#3b82f6" },
  { value: "indigo", label: "Indigo", hex: "#6366f1" },
  { value: "violet", label: "Violet", hex: "#8b5cf6" },
  { value: "purple", label: "Purple", hex: "#a855f7" },
  { value: "fuchsia", label: "Fuchsia", hex: "#d946ef" },
  { value: "pink", label: "Pink", hex: "#ec4899" },
  { value: "rose", label: "Rose", hex: "#f43f5e" },
] as const;

// Палитра цветов как на `admin/banners` (выпадающее меню "Цвет шрифта").
const BANNERS_FONT_COLOR_PRESETS = [
  "#ffffff",
  "#f8fafc",
  "#000000",
  "#1e293b",
  "#496db3",
  "#2563eb",
  "#16a34a",
  "#dc2626",
  "#f59e0b",
  "#7c3aed",
] as const;

const LIST_STYLE_OL = [
  { value: "decimal", label: "1." },
  { value: "lower-alpha", label: "a." },
  { value: "upper-alpha", label: "A." },
  { value: "lower-roman", label: "i." },
  { value: "upper-roman", label: "I." },
] as const;

const CALLBACK_FORM_LINK = "callback://open";

function pluralRowsInsert(n: number): string {
  if (n === 1) return "1 строку";
  if (n >= 2 && n <= 4) return `${n} строки`;
  return `${n} строк`;
}
function pluralColsInsert(n: number): string {
  if (n === 1) return "1 столбец";
  if (n >= 2 && n <= 4) return `${n} столбца`;
  return `${n} столбцов`;
}
function pluralRowsDelete(n: number): string {
  if (n === 1) return "1 строку";
  if (n >= 2 && n <= 4) return `${n} строки`;
  return `${n} строк`;
}
function pluralColsDelete(n: number): string {
  if (n === 1) return "1 столбец";
  if (n >= 2 && n <= 4) return `${n} столбца`;
  return `${n} столбцов`;
}

type CoverBgAdjustRevertSnapshot = {
  background: string;
  hasBgClass: boolean;
  dataX: string | null;
  dataY: string | null;
};

/** Один общий `<input type="file">` для фона обложки и слайдов карусели (два отдельных input ломали диалог/change в WebKit). */
type WebShellImageUploadPending =
  | { kind: "cover"; cover: HTMLElement }
  | { kind: "carousel"; carousel: HTMLElement; slide: HTMLElement };

function buildCoverBgRevertSnapshot(cover: HTMLElement): CoverBgAdjustRevertSnapshot {
  return {
    background: cover.style.background || "",
    hasBgClass: cover.classList.contains("page-web-cover-has-bg"),
    dataX: cover.getAttribute("data-cover-bg-x"),
    dataY: cover.getAttribute("data-cover-bg-y"),
  };
}

/** Достаёт data URL из inline `background: url("...")` обложки. */
function extractCoverBackgroundDataUrl(cover: HTMLElement): string | null {
  const bg = cover.style?.background || "";
  if (!bg.includes("url(")) return null;
  const start = bg.indexOf("url(");
  let s = bg.slice(start + 4).trim();
  if (s.startsWith('"')) {
    const end = s.indexOf('"', 1);
    if (end < 0) return null;
    return s.slice(1, end).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
  if (s.startsWith("'")) {
    const end = s.indexOf("'", 1);
    if (end < 0) return null;
    return s.slice(1, end);
  }
  const end = s.indexOf(")");
  return end >= 0 ? s.slice(0, end).trim() : null;
}

type CoverBgAdjustSessionState = {
  mount: HTMLElement;
  imageSrc: string;
  posX: number;
  posY: number;
  revert: CoverBgAdjustRevertSnapshot;
};

function clampPercent(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n * 10) / 10));
}

/** Затемнение вокруг обложки + окно с перетаскиванием background-position (как кадрирование). */
function CoverBackgroundAdjustOverlay({
  coverEl,
  imageSrc,
  posX,
  posY,
  onPositionChange,
  onCommit,
  onCancel,
}: {
  coverEl: HTMLElement;
  imageSrc: string;
  posX: number;
  posY: number;
  onPositionChange: (x: number, y: number) => void;
  onCommit: () => void;
  onCancel: () => void;
}) {
  const [, bump] = useState(0);
  const dragRef = useRef<{
    active: boolean;
    sx: number;
    sy: number;
    px: number;
    py: number;
    w: number;
    h: number;
  } | null>(null);
  const layerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const tick = () => bump((n) => n + 1);
    const ro = new ResizeObserver(tick);
    ro.observe(coverEl);
    window.addEventListener("scroll", tick, true);
    window.addEventListener("resize", tick);
    const scrollParents: HTMLElement[] = [];
    let p: HTMLElement | null = coverEl.parentElement;
    while (p) {
      const st = typeof getComputedStyle !== "undefined" ? getComputedStyle(p) : { overflowY: "visible" };
      const oy = st.overflowY;
      if (oy === "auto" || oy === "scroll") {
        p.addEventListener("scroll", tick);
        scrollParents.push(p);
      }
      p = p.parentElement;
    }
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", tick, true);
      window.removeEventListener("resize", tick);
      scrollParents.forEach((el) => el.removeEventListener("scroll", tick));
    };
  }, [coverEl]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d?.active) return;
      const dx = e.clientX - d.sx;
      const dy = e.clientY - d.sy;
      const factor = 0.55;
      const nx = clampPercent(d.px - (dx / d.w) * 100 * factor);
      const ny = clampPercent(d.py - (dy / d.h) * 100 * factor);
      onPositionChange(nx, ny);
    };
    const onUp = () => {
      if (dragRef.current) dragRef.current.active = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [onPositionChange]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onCancel]);

  const rect = coverEl.getBoundingClientRect();
  const br = typeof getComputedStyle !== "undefined" ? getComputedStyle(coverEl).borderRadius : "12px";
  const escaped = imageSrc.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const el = layerRef.current?.parentElement;
    if (!el) return;
    const r = el.getBoundingClientRect();
    dragRef.current = {
      active: true,
      sx: e.clientX,
      sy: e.clientY,
      px: posX,
      py: posY,
      w: Math.max(r.width, 1),
      h: Math.max(r.height, 1),
    };
  };

  const topH = Math.max(0, rect.top);
  const leftW = Math.max(0, rect.left);
  const bottomTop = rect.top + rect.height;
  const rightLeft = rect.left + rect.width;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[100] pointer-events-none" aria-hidden>
        <div className="pointer-events-auto fixed left-0 right-0 top-0 bg-slate-900/60" style={{ height: topH }} />
        <div
          className="pointer-events-auto fixed bg-slate-900/60"
          style={{ top: rect.top, left: 0, width: leftW, height: rect.height }}
        />
        <div
          className="pointer-events-auto fixed bg-slate-900/60"
          style={{ top: rect.top, left: rightLeft, right: 0, height: rect.height }}
        />
        <div
          className="pointer-events-auto fixed left-0 right-0 bottom-0 bg-slate-900/60"
          style={{ top: bottomTop }}
        />
      </div>
      <div
        className="fixed z-[101] overflow-hidden shadow-xl ring-2 ring-white/90"
        style={{
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          borderRadius: br,
        }}
      >
        <div className="relative h-full w-full overflow-hidden" style={{ borderRadius: br }}>
          <div
            ref={layerRef}
            role="presentation"
            className="absolute inset-0 cursor-grab select-none active:cursor-grabbing"
            style={{
              borderRadius: br,
              backgroundImage: `url("${escaped}")`,
              backgroundSize: "cover",
              backgroundPosition: `${posX}% ${posY}%`,
              backgroundRepeat: "no-repeat",
            }}
            onMouseDown={onMouseDown}
          />
        </div>
      </div>
      <div
        className="pointer-events-auto fixed z-[102] flex justify-center gap-2"
        style={{
          top: rect.top + rect.height + 8,
          left: rect.left,
          width: rect.width,
        }}
      >
        <button
          type="button"
          className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-md hover:bg-slate-100"
          onClick={onCommit}
        >
          Готово
        </button>
        <button
          type="button"
          className="rounded-md border border-slate-300 bg-white/95 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-md hover:bg-slate-50"
          onClick={onCancel}
        >
          Отмена
        </button>
      </div>
    </>,
    document.body,
  );
}

const TABLE_BORDER_STYLES = [
  { value: "solid", label: "Сплошная" },
  { value: "dashed", label: "Пунктир" },
  { value: "dotted", label: "Точки" },
  { value: "double", label: "Двойная" },
  { value: "none", label: "Без рамки" },
] as const;

const TABLE_BORDER_WIDTHS = [
  { value: "1", label: "1px" },
  { value: "2", label: "2px" },
  { value: "3", label: "3px" },
] as const;

function TableBorderPreview({
  value,
  isSelected,
  size = "md",
}: {
  value: string;
  isSelected: boolean;
  size?: "sm" | "md";
}) {
  const opt = TABLE_BORDER_STYLES.find((s) => s.value === value);
  const boxClass = size === "sm" ? "h-3 w-4" : "h-5 w-6";
  return (
    <div
      className={`flex items-center justify-center rounded-sm ${size === "sm" ? "h-4 w-5" : "h-6 w-7"} ${isSelected ? "ring-2 ring-[#496db3] ring-offset-1" : ""}`}
      title={opt?.label}
    >
      {value === "none" ? (
        <div className={`${boxClass} rounded bg-slate-100`} />
      ) : (
        <div
          className={`${boxClass} rounded`}
          style={{
            border: value === "double" ? "2px double #94a3b8" : `1px ${value} #94a3b8`,
          }}
        />
      )}
    </div>
  );
}

const TABLE_WIDTH_PRESETS = [
  { value: "auto", label: "Авто" },
  { value: "15%", label: "15%" },
  { value: "25%", label: "25%" },
  { value: "50%", label: "50%" },
  { value: "75%", label: "75%" },
  { value: "100%", label: "100%" },
] as const;

const TABLE_ROW_HEIGHT_PRESETS = [
  { value: "auto", label: "Авто" },
  { value: "24px", label: "24px" },
  { value: "32px", label: "32px" },
  { value: "40px", label: "40px" },
  { value: "48px", label: "48px" },
] as const;

function ListDiscIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className ?? ICON_SIZE} aria-hidden="true" data-slot="icon">
      <circle cx="10" cy="10" r="3.5" />
    </svg>
  );
}

function ListCircleIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className ?? ICON_SIZE} aria-hidden="true" data-slot="icon">
      <circle cx="10" cy="10" r="3.5" />
    </svg>
  );
}

function AlignCenterIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className ?? ICON_SIZE}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75Zm5 5.5a.75.75 0 0 1 .75-.75h5.5a.75.75 0 0 1 0 1.5h-5.5A.75.75 0 0 1 7 10.25Zm-5 5a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function AlignVerticalTopIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className ?? ICON_SIZE} aria-hidden="true">
      <path d="M3 3.75A.75.75 0 0 1 3.75 3h12.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 3.75Z" />
      <path d="M7.75 7A.75.75 0 0 0 7 7.75v8.5c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-8.5a.75.75 0 0 0-.75-.75h-4.5Z" />
    </svg>
  );
}

function AlignVerticalMiddleIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className ?? ICON_SIZE} aria-hidden="true">
      <path d="M3 10a.75.75 0 0 1 .75-.75h12.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 10Z" />
      <path d="M7.75 5A.75.75 0 0 0 7 5.75v8.5c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-8.5a.75.75 0 0 0-.75-.75h-4.5Z" />
    </svg>
  );
}

function AlignVerticalBottomIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className ?? ICON_SIZE} aria-hidden="true">
      <path d="M3 16.25a.75.75 0 0 1 .75-.75h12.5a.75.75 0 0 1 0 1.5H3.75a.75.75 0 0 1-.75-.75Z" />
      <path d="M7.75 3A.75.75 0 0 0 7 3.75v8.5c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-8.5a.75.75 0 0 0-.75-.75h-4.5Z" />
    </svg>
  );
}

function normalizeCommandColor(value: string | null | undefined): string {
  if (!value) return "#000000";
  const raw = String(value).trim().toLowerCase();
  if (raw.startsWith("#")) {
    if (raw.length === 4) {
      return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`;
    }
    return raw;
  }
  const rgb = raw.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgb) {
    const r = Math.max(0, Math.min(255, parseInt(rgb[1], 10)));
    const g = Math.max(0, Math.min(255, parseInt(rgb[2], 10)));
    const b = Math.max(0, Math.min(255, parseInt(rgb[3], 10)));
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  }
  return "#000000";
}

type PageBlock = {
  id: number;
  type: string;
  order: number;
  data: { text?: string; src?: string };
};

type PageDetails = {
  id: number;
  title: string;
  slug: string;
  status: "DRAFT" | "PUBLISHED";
  blocks: PageBlock[];
};

/** Логи каретки: префикс `[page-editor-caret]`. Выключить: `false`. Без пересборки: `localStorage.setItem('debugPageEditorCaret','0')`. */
const DEBUG_PAGE_EDITOR_CARET = true;

function caretDebugOn(): boolean {
  if (!DEBUG_PAGE_EDITOR_CARET) return false;
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem("debugPageEditorCaret") !== "0";
  } catch {
    return true;
  }
}

function describeNodeForCaretLog(n: Node | null): string {
  if (!n) return "null";
  if (n.nodeType === Node.TEXT_NODE) {
    const t = (n as Text).data;
    const preview = t.length > 60 ? `${t.slice(0, 60)}…` : t;
    return `#text(len=${t.length}) "${preview.replace(/\n/g, "\\n")}"`;
  }
  if (n.nodeType === Node.ELEMENT_NODE) {
    const el = n as Element;
    const tag = el.tagName.toLowerCase();
    const dc = el.getAttribute("data-editor-caret");
    const attrs = dc ? ` data-editor-caret="${dc}"` : "";
    return `<${tag}${attrs}>`;
  }
  return n.nodeName;
}

function pathFromEditorRoot(root: Element | null, n: Node | null): string {
  if (!n || !root) return "";
  const parts: string[] = [];
  let cur: Node | null = n;
  let depth = 0;
  while (cur && cur !== root && depth < 40) {
    if (cur.nodeType === Node.ELEMENT_NODE) {
      const el = cur as Element;
      const tag = el.tagName.toLowerCase();
      const dc = el.getAttribute("data-editor-caret");
      parts.unshift(dc ? `${tag}ⓒ` : tag);
    } else {
      parts.unshift(describeNodeForCaretLog(cur));
    }
    cur = cur.parentNode;
    depth += 1;
  }
  return parts.length ? parts.join(" ← ") : "(outside root)";
}

function logPageEditorCaret(phase: string, payload: Record<string, unknown>) {
  if (!caretDebugOn()) return;
  console.log(`[page-editor-caret] ${phase}`, payload);
}

function snapshotSelection(phase: string, root: HTMLElement | null) {
  if (!caretDebugOn()) return;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) {
    logPageEditorCaret(phase, { selection: "none", rangeCount: sel?.rangeCount ?? 0 });
    return;
  }
  const r = sel.getRangeAt(0);
  let rect: { top: number; left: number; width: number; height: number } | null = null;
  let clientRects = 0;
  try {
    clientRects = r.getClientRects().length;
    if (clientRects > 0) {
      const b = r.getBoundingClientRect();
      rect = { top: b.top, left: b.left, width: b.width, height: b.height };
    }
  } catch {
    rect = null;
  }
  const rootRect = root?.getBoundingClientRect();
  logPageEditorCaret(phase, {
    collapsed: r.collapsed,
    start: { node: describeNodeForCaretLog(r.startContainer), offset: r.startOffset, path: pathFromEditorRoot(root, r.startContainer) },
    end: { node: describeNodeForCaretLog(r.endContainer), offset: r.endOffset },
    focusNode: describeNodeForCaretLog(sel.focusNode),
    focusOffset: sel.focusOffset,
    rangeClientRects: clientRects,
    rangeBoundingRect: rect,
    rootBoundingRect: rootRect
      ? { top: rootRect.top, left: rootRect.left, width: rootRect.width, height: rootRect.height }
      : null,
    /** Положение курсора относительно верхнего левого угла редактора (видно «улет в паддинг») */
    caretRelativeToEditor:
      rect && rootRect ? { dTop: rect.top - rootRect.top, dLeft: rect.left - rootRect.left } : null,
    activeElement: document.activeElement?.nodeName ?? null,
    activeElementIsEditor: !!(root && document.activeElement === root),
  });
}

export default function PageEditorDetailsPage() {
  const params = useParams<{ id: string }>();
  const pageId = useMemo(() => Number(params?.id), [params]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [contentHtml, setContentHtml] = useState("");

  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [alignment, setAlignment] = useState<"left" | "center" | "right">("left");
  const [isUnorderedList, setIsUnorderedList] = useState(false);
  const [isOrderedList, setIsOrderedList] = useState(false);
  const [listStyleType, setListStyleType] = useState<string>("");
  const [listStyleOpen, setListStyleOpen] = useState(false);
  const [listColor, setListColor] = useState<string>("");
  const [listColorOpen, setListColorOpen] = useState(false);
  const [listStart, setListStart] = useState<number>(1);
  const [tableOpen, setTableOpen] = useState(false);
  const [webElementsOpen, setWebElementsOpen] = useState(false);
  const [tableHover, setTableHover] = useState<{ rows: number; cols: number } | null>(null);
  const [isInTable, setIsInTable] = useState(false);
  const [tableBorderStyle, setTableBorderStyle] = useState<string>("solid");
  const [tableBorderColor, setTableBorderColor] = useState<string>("#e2e8f0");
  const [tableBorderWidth, setTableBorderWidth] = useState<string>("1");
  const [tableBorderOpen, setTableBorderOpen] = useState(false);
  const [tableBorderColorOpen, setTableBorderColorOpen] = useState(false);
  const [tableBorderWidthOpen, setTableBorderWidthOpen] = useState(false);
  const [tableWidth, setTableWidth] = useState<string>("auto");
  const [tableRowHeight, setTableRowHeight] = useState<string>("auto");
  const [tableWidthModalOpen, setTableWidthModalOpen] = useState(false);
  const [tableWidthModalValue, setTableWidthModalValue] = useState("");
  const [coverButtonLinkModalOpen, setCoverButtonLinkModalOpen] = useState(false);
  const [coverButtonLinkModalValue, setCoverButtonLinkModalValue] = useState("");
  const [tableWidthSubmenuOpen, setTableWidthSubmenuOpen] = useState(false);
  const [tableRowHeightSubmenuOpen, setTableRowHeightSubmenuOpen] = useState(false);
  const [tableVerticalAlign, setTableVerticalAlign] = useState<"top" | "middle" | "bottom">("middle");
  /** Каретка в зоне текста обложки (не в таблице) — вертикальное выравнивание блока контента относительно всего баннера. */
  const [isInWebCoverContent, setIsInWebCoverContent] = useState(false);
  const [coverVerticalAlign, setCoverVerticalAlign] = useState<"top" | "middle" | "bottom">("top");
  const [tableRowHeightModalOpen, setTableRowHeightModalOpen] = useState(false);
  const [tableRowHeightModalValue, setTableRowHeightModalValue] = useState("");
  const [cellMenuOpen, setCellMenuOpen] = useState(false);
  const [cellMenuAnchor, setCellMenuAnchor] = useState<"left" | "top">("left");
  const [cellMenuRect, setCellMenuRect] = useState<{ top: number; left: number; height: number } | null>(null);
  const [cellMenuViewport, setCellMenuViewport] = useState<{
    top: number;
    left: number;
    topBtn: { top: number; left: number };
    openUp?: boolean;
    selectionBadge?: { top: number; right: number };
  } | null>(null);
  const [fontSize, setFontSize] = useState("");
  const [fontSizeOpen, setFontSizeOpen] = useState(false);
  const [fontColor, setFontColor] = useState<string>("#000000");
  const [fontColorOpen, setFontColorOpen] = useState(false);

  const editorRef = useRef<HTMLDivElement | null>(null);
  const inputSyncTimerRef = useRef<number | null>(null);
  const pendingInputHtmlRef = useRef<string | null>(null);
  const fontSizeDropdownRef = useRef<HTMLDivElement | null>(null);
  const fontColorDropdownRef = useRef<HTMLDivElement | null>(null);
  const listStyleDropdownRef = useRef<HTMLDivElement | null>(null);
  const listStyleButtonMousedownRef = useRef(false);
  const tableDropdownRef = useRef<HTMLDivElement | null>(null);
  const webElementsDropdownRef = useRef<HTMLDivElement | null>(null);
  const tableBorderDropdownRef = useRef<HTMLDivElement | null>(null);
  const tableWidthModalInputRef = useRef<HTMLInputElement | null>(null);
  const coverButtonLinkModalInputRef = useRef<HTMLInputElement | null>(null);
  const tableRowHeightModalInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  /** Обложка + карусель: один file input вне contentEditable (см. WebShellImageUploadPending). */
  const webShellImageInputRef = useRef<HTMLInputElement | null>(null);
  const webShellImageUploadPendingRef = useRef<WebShellImageUploadPending | null>(null);
  /** После add/remove слайда пересчитывается ширина колонки — без выравнивания scrollLeft «плывёт» и виден кусок соседнего слайда. */
  const webCarouselScrollAlignPendingRef = useRef(false);
  const coverBgAdjustingRef = useRef(false);
  const [coverBgAdjustSession, setCoverBgAdjustSession] = useState<CoverBgAdjustSessionState | null>(null);
  const [carouselPreviewSession, setCarouselPreviewSession] = useState<CarouselPreviewSessionState | null>(null);
  const imageResizeRef = useRef<{
    img: HTMLImageElement;
    wrapper: HTMLElement;
    handle: string;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
    aspectRatio: number;
  } | null>(null);
  const selectedImageWrapperRef = useRef<HTMLElement | null>(null);
  const cellMenuRef = useRef<HTMLDivElement | null>(null);
  const preserveTableSelectionRef = useRef(false);
  const editorScrollRef = useRef<HTMLDivElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const editorWrapperRef = useRef<HTMLDivElement | null>(null);
  const selectedCellRef = useRef<HTMLTableCellElement | null>(null);
  const [selectedCellRange, setSelectedCellRange] = useState<{ rows: number; cols: number }>({ rows: 1, cols: 1 });
  const cellDragStartRef = useRef<{ cell: HTMLTableCellElement; table: HTMLTableElement } | null>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const coverButtonLinkTargetRef = useRef<HTMLElement | null>(null);
  const commandRangeRef = useRef<Range | null>(null);
  /** After setContentHtml, selection is restored in the contentHtml effect using this marker id. */
  const pendingEditorCaretRef = useRef<string | null>(null);
  /** Native capture listeners need the latest cover/backspace logic (React synthetic events can be too late on WebKit). */
  const webCoverNativeInputRef = useRef<{
    beforeInput: (e: InputEvent) => void;
    keyDown: (e: KeyboardEvent) => void;
  }>({
    beforeInput: () => {},
    keyDown: () => {},
  });

  /** Collapsed range at the start of a list item (shared by Enter handler + layout effect). */
  const placeCaretAtLiStart = useCallback((target: HTMLElement, source = "unknown") => {
    const ed = editorRef.current;
    const first = target.firstChild;
    let branch: "textNode0" | "setStartBeforeFirst" | "emptyLiOffset0" = "emptyLiOffset0";
    if (first?.nodeType === Node.TEXT_NODE) branch = "textNode0";
    else if (first) branch = "setStartBeforeFirst";

    if (caretDebugOn()) {
      logPageEditorCaret("placeCaretAtLiStart:before", {
        source,
        targetPreview: target.outerHTML?.slice(0, 200),
        branch,
        firstChild: describeNodeForCaretLog(first),
        editorExists: !!ed,
      });
      snapshotSelection("placeCaretAtLiStart:selection-before", ed);
    }

    if (!ed) return;
    const sel = window.getSelection();
    if (!sel) return;
    const r = document.createRange();
    if (first?.nodeType === Node.TEXT_NODE) {
      r.setStart(first, 0);
    } else if (first) {
      r.setStartBefore(first);
    } else {
      r.setStart(target, 0);
    }
    r.collapse(true);
    sel.removeAllRanges();
    try {
      sel.addRange(r);
    } catch (err) {
      logPageEditorCaret("placeCaretAtLiStart:addRange-FAILED", { source, err: String(err) });
      return;
    }
    savedRangeRef.current = r.cloneRange();
    ed.focus({ preventScroll: true });

    if (caretDebugOn()) {
      logPageEditorCaret("placeCaretAtLiStart:range-applied", {
        source,
        branch,
        rangeStart: { node: describeNodeForCaretLog(r.startContainer), offset: r.startOffset },
      });
      snapshotSelection("placeCaretAtLiStart:selection-after", ed);
    }
  }, []);

  const clearTableSelection = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    el.querySelectorAll(".page-editor-table td[data-cell-selected]").forEach((td) =>
      td.removeAttribute("data-cell-selected")
    );
    setCellMenuRect(null);
    setCellMenuViewport(null);
    setSelectedCellRange({ rows: 1, cols: 1 });
    selectedCellRef.current = null;
  }, []);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      const toggleBtn = listStyleDropdownRef.current?.querySelector('button[aria-label="Стиль маркера"]');
      listStyleButtonMousedownRef.current = !!(toggleBtn?.contains(target));
    };
    document.addEventListener("mousedown", handleMouseDown, true);
    return () => document.removeEventListener("mousedown", handleMouseDown, true);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (fontSizeOpen && fontSizeDropdownRef.current && !fontSizeDropdownRef.current.contains(target)) {
        setFontSizeOpen(false);
      }
      if (fontColorOpen && fontColorDropdownRef.current && !fontColorDropdownRef.current.contains(target)) {
        setFontColorOpen(false);
      }
      if (listStyleOpen && listStyleDropdownRef.current && !listStyleDropdownRef.current.contains(target)) {
        setListStyleOpen(false);
        setListColorOpen(false);
      }
      if (tableOpen && tableDropdownRef.current && !tableDropdownRef.current.contains(target)) {
        setTableOpen(false);
      }
      if (webElementsOpen && webElementsDropdownRef.current && !webElementsDropdownRef.current.contains(target)) {
        setWebElementsOpen(false);
      }
      if (tableBorderOpen && tableBorderDropdownRef.current && !tableBorderDropdownRef.current.contains(target)) {
        setTableBorderOpen(false);
        setTableBorderColorOpen(false);
        setTableBorderWidthOpen(false);
      }
      if (cellMenuOpen && cellMenuRef.current && !cellMenuRef.current.contains(target)) {
        setCellMenuOpen(false);
        setTableWidthSubmenuOpen(false);
        setTableRowHeightSubmenuOpen(false);
      }
    };
    const cellMenuHandler = (e: MouseEvent) => {
      const target = e.target as Node;
      const inCellMenu = cellMenuRef.current?.contains(target);
      const inToolbar = toolbarRef.current?.contains(target);
      const el = editorRef.current;
      const editingCell = (target as Element)?.closest?.("table.page-editor-table td[data-cell-editing]");
      if (!editingCell && !inToolbar && !inCellMenu && el) {
        let hadEditing = false;
        el.querySelectorAll(".page-editor-table td[data-cell-editing]").forEach((td) => {
          const cell = td as HTMLElement;
          cell.removeAttribute("data-cell-editing");
          cell.setAttribute("contenteditable", "false");
          hadEditing = true;
        });
        if (hadEditing) {
          setContentHtml(el.innerHTML);
        }
      }
      if (inToolbar || inCellMenu) {
        preserveTableSelectionRef.current = true;
        const clearPreserve = () => {
          setTimeout(() => {
            preserveTableSelectionRef.current = false;
          }, 0);
        };
        document.addEventListener("mouseup", clearPreserve, { once: true });
        document.addEventListener("click", clearPreserve, { once: true });
      }
      if (cellMenuOpen && cellMenuRef.current && !cellMenuRef.current.contains(target)) {
        setCellMenuOpen(false);
        setTableWidthSubmenuOpen(false);
        setTableRowHeightSubmenuOpen(false);
      }
      const inTableCell = (target as Element)?.closest?.("table.page-editor-table td");
      if (!inTableCell && !inCellMenu && !inToolbar && editorRef.current) {
        const hasSelection = editorRef.current.querySelector(".page-editor-table td[data-cell-selected]");
        if (hasSelection) {
          clearTableSelection();
        }
      }
    };
    document.addEventListener("click", handler);
    document.addEventListener("mousedown", cellMenuHandler);
    return () => {
      document.removeEventListener("click", handler);
      document.removeEventListener("mousedown", cellMenuHandler);
    };
  }, [fontSizeOpen, fontColorOpen, listStyleOpen, tableOpen, webElementsOpen, tableBorderOpen, cellMenuOpen, clearTableSelection]);

  useEffect(() => {
    function setSelectedImageWrapper(next: HTMLElement | null) {
      if (selectedImageWrapperRef.current && selectedImageWrapperRef.current !== next) {
        selectedImageWrapperRef.current.removeAttribute("data-image-selected");
      }
      if (next) next.setAttribute("data-image-selected", "true");
      selectedImageWrapperRef.current = next;
    }

    function handleImageResizeMove(e: MouseEvent) {
      const state = imageResizeRef.current;
      if (!state) return;
      e.preventDefault();
      const dx = e.clientX - state.startX;
      const dy = e.clientY - state.startY;
      const { handle } = state;
      let newWidth = state.startWidth;
      let newHeight = state.startHeight;
      let offsetX = 0;
      let offsetY = 0;
      if (handle.includes("e")) newWidth = state.startWidth + dx;
      if (handle.includes("w")) {
        newWidth = state.startWidth - dx;
        offsetX = -dx;
      }
      if (handle.includes("s")) newHeight = state.startHeight + dy;
      if (handle.includes("n")) {
        newHeight = state.startHeight - dy;
        offsetY = -dy;
      }
      newWidth = Math.max(50, newWidth);
      newHeight = Math.max(30, newHeight);
      if (e.shiftKey) {
        const scale = Math.min(newWidth / state.startWidth, newHeight / state.startHeight);
        newWidth = state.startWidth * scale;
        newHeight = state.startHeight * scale;
        if (handle.includes("w")) offsetX = state.startWidth - newWidth;
        if (handle.includes("n")) offsetY = state.startHeight - newHeight;
      }
      if (offsetX < 0) offsetX = 0;
      if (offsetY < 0) offsetY = 0;
      state.img.style.width = `${newWidth}px`;
      state.img.style.height = `${newHeight}px`;
      state.img.style.maxWidth = state.img.closest("td") ? "100%" : "none";
      state.wrapper.style.marginLeft = offsetX ? `-${offsetX}px` : "";
      state.wrapper.style.marginTop = offsetY ? `-${offsetY}px` : "";
    }
    function handleImageResizeUp() {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      const state = imageResizeRef.current;
      if (state) {
        const img = state.img;
        const w = parseFloat(img.style.width) || state.startWidth;
        const h = parseFloat(img.style.height) || state.startHeight;
        const ml = state.wrapper.style.marginLeft;
        const mt = state.wrapper.style.marginTop;
        img.style.width = `${Math.max(50, Math.round(w))}px`;
        img.style.height = `${Math.max(30, Math.round(h))}px`;
        img.style.maxWidth = img.closest("td") ? "100%" : "none";
        state.wrapper.style.marginLeft = ml;
        state.wrapper.style.marginTop = mt;
        const el = editorRef.current;
        if (el) setContentHtml(el.innerHTML);
        imageResizeRef.current = null;
      }
      document.removeEventListener("mousemove", handleImageResizeMove);
      document.removeEventListener("mouseup", handleImageResizeUp);
    }
    function handleImageResizeDown(e: MouseEvent) {
      const target = (e.target as Element)?.closest?.(".page-editor-image-resize");
      if (!target) return;
      const handle = (target as HTMLElement).getAttribute("data-resize");
      if (!handle) return;
      const wrapper = target.closest(".page-editor-image-wrapper") as HTMLElement | null;
      const img = wrapper?.querySelector(".page-editor-image") as HTMLImageElement | null;
      if (!img || !wrapper) return;
      setSelectedImageWrapper(wrapper);
      e.preventDefault();
      e.stopPropagation();
      wrapper.style.marginLeft = "";
      wrapper.style.marginTop = "";
      const rect = img.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      imageResizeRef.current = {
        img,
        wrapper,
        handle,
        startX: e.clientX,
        startY: e.clientY,
        startWidth: w,
        startHeight: h,
        aspectRatio: w / h,
      };
      const cursorMap: Record<string, string> = { n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize", ne: "nesw-resize", nw: "nwse-resize", se: "nwse-resize", sw: "nesw-resize" };
      document.body.style.cursor = cursorMap[handle] || "nwse-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", handleImageResizeMove);
      document.addEventListener("mouseup", handleImageResizeUp);
    }
    function handleImageWrapperDown(e: MouseEvent) {
      const target = e.target as Element;
      const wrapper = target?.closest?.(".page-editor-image-wrapper") as HTMLElement | null;
      if (wrapper) {
        setSelectedImageWrapper(wrapper);
      } else if (!target?.closest?.(".page-editor-image-resize")) {
        setSelectedImageWrapper(null);
      }
    }
    const wrapper = editorWrapperRef.current;
    if (!wrapper) return;
    wrapper.addEventListener("mousedown", handleImageResizeDown);
    wrapper.addEventListener("mousedown", handleImageWrapperDown);
    return () => {
      wrapper.removeEventListener("mousedown", handleImageResizeDown);
      wrapper.removeEventListener("mousedown", handleImageWrapperDown);
      document.removeEventListener("mousemove", handleImageResizeMove);
      document.removeEventListener("mouseup", handleImageResizeUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setSelectedImageWrapper(null);
    };
  }, []);

  function updateToolbarState() {
    const el = editorRef.current;
    if (!el || !document.contains(el)) return;

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    if (!el.contains(range.commonAncestorContainer)) return;

    try {
      if (!range.collapsed) {
        setListStyleOpen(false);
        setListColorOpen(false);
      }
      const snapshot = range.cloneRange();
      savedRangeRef.current = snapshot;
      commandRangeRef.current = snapshot.cloneRange();

      setIsBold(document.queryCommandState("bold"));
      setIsItalic(document.queryCommandState("italic"));
      setIsUnderline(document.queryCommandState("underline"));

      const selectedImage = selectedImageWrapperRef.current;
      if (selectedImage && el.contains(selectedImage)) {
        const imageAlign = (selectedImage.getAttribute("data-image-align") || "").toLowerCase();
        if (imageAlign === "center" || imageAlign === "right" || imageAlign === "left") setAlignment(imageAlign);
        else if (document.queryCommandState("justifyCenter")) setAlignment("center");
        else if (document.queryCommandState("justifyRight")) setAlignment("right");
        else setAlignment("left");
      } else if (document.queryCommandState("justifyCenter")) setAlignment("center");
      else if (document.queryCommandState("justifyRight")) setAlignment("right");
      else setAlignment("left");

      setIsUnorderedList(document.queryCommandState("insertUnorderedList"));
      setIsOrderedList(document.queryCommandState("insertOrderedList"));

      let ls = "";
      if (document.queryCommandState("insertUnorderedList") || document.queryCommandState("insertOrderedList")) {
        try {
          const node =
            range.startContainer.nodeType === Node.TEXT_NODE
              ? range.startContainer.parentElement
              : range.startContainer;
          const list = (node as Element)?.closest?.("ol, ul");
          if (list) {
            const dataStyle = (list as HTMLElement).getAttribute?.("data-list-style");
            if (dataStyle) ls = dataStyle;
            else if (list.tagName === "OL") {
              const val = (list as HTMLElement).style?.listStyleType;
              ls = val && val !== "none" ? val : "decimal";
            } else {
              const style = getComputedStyle(list).listStyleType;
              const val = (list as HTMLElement).style?.listStyleType || style;
              ls = val && val !== "none" ? val : "disc";
            }
          }
        } catch {
          // ignore
        }
      }
      setListStyleType(ls);

      let lc = "";
      let lsStart = 1;
      if (document.queryCommandState("insertUnorderedList") || document.queryCommandState("insertOrderedList")) {
        try {
          const node =
            range.startContainer.nodeType === Node.TEXT_NODE
              ? range.startContainer.parentElement
              : range.startContainer;
          const list = (node as Element)?.closest?.("ol, ul");
          if (list) {
            lc = (list as HTMLElement).getAttribute?.("data-list-color") ?? "";
            if (list.tagName === "OL") {
              const startAttr = (list as HTMLElement).getAttribute?.("start");
              lsStart = startAttr ? Math.max(1, parseInt(startAttr, 10) || 1) : 1;
            }
          }
        } catch {
          // ignore
        }
      }
      setListColor(lc);
      setListStart(lsStart);

      let fs = document.queryCommandValue("fontSize");
      if (!fs || !/^[1-7]$/.test(fs)) {
        try {
          const node =
            range.startContainer.nodeType === Node.TEXT_NODE
              ? range.startContainer.parentElement
              : range.startContainer;
          const target =
            node?.nodeType === Node.ELEMENT_NODE ? node : (node as Node)?.parentElement;
          if (target && target instanceof HTMLElement) {
            const px = parseInt(getComputedStyle(target).fontSize, 10);
            const map: Record<number, string> = {
              10: "1", 13: "2", 16: "3", 18: "4", 24: "5", 32: "6", 48: "7",
            };
            fs = map[px] ?? "";
          }
        } catch {
          fs = "";
        }
      }
      setFontSize(fs || "");
      setFontColor(normalizeCommandColor(document.queryCommandValue("foreColor")));

      let inTable = false;
      let tblBorder = "solid";
      try {
        const node =
          range.startContainer.nodeType === Node.TEXT_NODE
            ? range.startContainer.parentElement
            : range.startContainer;
        const table = (node as Element)?.closest?.("table.page-editor-table");
        if (table) {
          inTable = true;
          const cell = (node as Element)?.closest?.("table.page-editor-table td") as HTMLElement | null;
          const selCells = Array.from(el.querySelectorAll(".page-editor-table td[data-cell-selected]")) as HTMLElement[];
          const srcCell = (selCells.length > 0 ? selCells[0] : cell) as HTMLElement | null;
          if (srcCell?.hasAttribute?.("data-cell-border")) {
            tblBorder = srcCell.getAttribute("data-cell-border") ?? "solid";
            const c = srcCell.getAttribute("data-cell-border-color");
            if (c) setTableBorderColor(c);
            const w = srcCell.getAttribute("data-cell-border-width");
            if (w) setTableBorderWidth(w);
          } else {
            tblBorder = (table as HTMLElement).getAttribute?.("data-table-border") ?? "solid";
            const tblColor = (table as HTMLElement).style?.getPropertyValue?.("--table-border-color")?.trim();
            if (tblColor) setTableBorderColor(tblColor);
            const tblWidth = (table as HTMLElement).style?.getPropertyValue?.("--table-border-width")?.trim();
            if (tblWidth) setTableBorderWidth(tblWidth.replace(/px$/, "") || "1");
          }
          const cellAlign = (srcCell?.getAttribute?.("data-cell-align") || srcCell?.style?.textAlign || "").toLowerCase();
          if (cellAlign === "center" || cellAlign === "right" || cellAlign === "left") setAlignment(cellAlign);
          else {
            const tblAlign = (table as HTMLElement).getAttribute?.("data-table-align");
            if (tblAlign === "center" || tblAlign === "right" || tblAlign === "left") setAlignment(tblAlign);
            else setAlignment("left");
          }
          const tw = (cell?.getAttribute?.("data-cell-width") || cell?.style?.width) || ((table as HTMLElement).getAttribute?.("data-table-width") ?? (table as HTMLElement).style?.width ?? "");
          setTableWidth(tw || "auto");
          const trh = (cell?.getAttribute?.("data-cell-height") || cell?.style?.height) || ((table as HTMLElement).getAttribute?.("data-table-row-height") ?? (table as HTMLElement).style?.getPropertyValue?.("--table-row-height")?.trim() ?? "");
          setTableRowHeight(trh || "auto");
          const tva = (cell?.getAttribute?.("data-cell-valign") || cell?.style?.verticalAlign || "").toLowerCase();
          if (tva === "top" || tva === "middle" || tva === "bottom") setTableVerticalAlign(tva);
          else setTableVerticalAlign("middle");
        }
      } catch {
        // ignore
      }
      setIsInTable(inTable);
      setTableBorderStyle(tblBorder);

      let inWebCoverLayouts = false;
      if (!inTable) {
        try {
          const node =
            range.startContainer.nodeType === Node.TEXT_NODE
              ? range.startContainer.parentElement
              : range.startContainer;
          const inner = (node as Element)?.closest?.(".page-web-cover-inner") as HTMLElement | null;
          if (inner && el.contains(inner) && !inner.closest("table.page-editor-table")) {
            const cover = inner.closest(".page-web-cover") as HTMLElement | null;
            if (cover && el.contains(cover)) {
              inWebCoverLayouts = true;
              const ha = (cover.getAttribute("data-cover-halign") || "left").toLowerCase();
              const va = (cover.getAttribute("data-cover-valign") || "top").toLowerCase();
              setCoverVerticalAlign(va === "middle" || va === "bottom" ? va : "top");
              const selectedImage = selectedImageWrapperRef.current;
              const anchor = range.commonAncestorContainer;
              const inSelectedImage =
                selectedImage &&
                el.contains(selectedImage) &&
                (selectedImage === anchor || selectedImage.contains(anchor));
              if (!inSelectedImage) {
                setAlignment(ha === "center" || ha === "right" ? ha : "left");
              }
            }
          }
        } catch {
          // ignore
        }
      }
      setIsInWebCoverContent(inWebCoverLayouts);
    } catch {
      // ignore
    }
  }

  function getCellPosition(cell: HTMLTableCellElement): { row: number; col: number } | null {
    const table = cell.closest("table.page-editor-table") as HTMLTableElement | null;
    if (!table) return null;
    const tbody = table.querySelector("tbody");
    if (!tbody) return null;
    const rows = tbody.querySelectorAll("tr");
    for (let r = 0; r < rows.length; r++) {
      const cells = rows[r].querySelectorAll("td");
      let col = 0;
      for (const td of cells) {
        if (td === cell) return { row: r, col };
        col += parseInt((td as HTMLTableCellElement).getAttribute("colspan") || "1", 10);
      }
    }
    return null;
  }

  function getCellAtPosition(table: HTMLTableElement, row: number, col: number): HTMLTableCellElement | null {
    const tbody = table.querySelector("tbody");
    if (!tbody) return null;
    const rows = tbody.querySelectorAll("tr");
    const tr = rows[row];
    if (!tr) return null;
    const cells = tr.querySelectorAll("td");
    let c = 0;
    for (const cell of cells) {
      const colspan = parseInt((cell as HTMLTableCellElement).getAttribute("colspan") || "1", 10);
      if (col >= c && col < c + colspan) return cell as HTMLTableCellElement;
      c += colspan;
    }
    return null;
  }

  function getTableColumnCount(table: HTMLTableElement): number {
    const tbody = table.querySelector("tbody");
    const firstRow = tbody?.querySelector("tr");
    if (!firstRow) return 0;
    let count = 0;
    firstRow.querySelectorAll("td").forEach((td) => {
      count += parseInt((td as HTMLTableCellElement).getAttribute("colspan") || "1", 10);
    });
    return count;
  }

  function syncTableColgroup(table: HTMLTableElement) {
    const colCount = getTableColumnCount(table);
    if (colCount === 0) return;
    const widths: (string | null)[] = [];
    for (let col = 0; col < colCount; col++) {
      const cell = getCellAtPosition(table, 0, col);
      const w = cell?.getAttribute("data-cell-width") || (cell as HTMLElement)?.style?.width || null;
      widths.push(w);
    }
    const hasAnyWidth = widths.some((w) => w != null && w !== "");
    let colgroup = table.querySelector("colgroup");
    if (!hasAnyWidth) {
      colgroup?.remove();
      return;
    }
    if (!colgroup) {
      colgroup = document.createElement("colgroup");
      table.insertBefore(colgroup, table.querySelector("tbody"));
    }
    colgroup.innerHTML = "";
    widths.forEach((w) => {
      const col = document.createElement("col");
      if (w) col.style.width = w;
      colgroup!.appendChild(col);
    });
  }

  function highlightCellsInRect(
    table: HTMLTableElement,
    startRow: number,
    startCol: number,
    endRow: number,
    endCol: number
  ) {
    const rMin = Math.min(startRow, endRow);
    const rMax = Math.max(startRow, endRow);
    const cMin = Math.min(startCol, endCol);
    const cMax = Math.max(startCol, endCol);
    const seen = new Set<HTMLTableCellElement>();
    for (let r = rMin; r <= rMax; r++) {
      for (let c = cMin; c <= cMax; c++) {
        const cell = getCellAtPosition(table, r, c);
        if (cell && !seen.has(cell)) {
          seen.add(cell);
          cell.setAttribute("data-cell-selected", "true");
        }
      }
    }
  }

  function highlightSelectedTableCells() {
    const el = editorRef.current;
    const wrapper = editorWrapperRef.current;
    if (!el) return;
    const existing = Array.from(el.querySelectorAll(".page-editor-table td[data-cell-selected]")) as HTMLElement[];
    const sel = window.getSelection();
    let selectedCells: HTMLElement[] = [];
    let selectionInTable = false;
    const range = sel?.rangeCount ? sel.getRangeAt(0) : null;
    const focusNode = range?.commonAncestorContainer;
    const focusEl = focusNode?.nodeType === Node.TEXT_NODE ? focusNode.parentElement : focusNode;
    const activeEl = typeof document !== "undefined" ? document.activeElement : null;
    const inToolbar =
      !!(toolbarRef.current?.contains(focusEl as Node) || (activeEl && toolbarRef.current?.contains(activeEl)));
    const inCellMenu =
      !!(cellMenuRef.current?.contains(focusEl as Node) || (activeEl && cellMenuRef.current?.contains(activeEl)));
    const preserveSelection =
      (preserveTableSelectionRef.current || inToolbar || inCellMenu) && existing.length > 1;
    if (sel && sel.rangeCount > 0 && range) {
      try {
        const node = range.commonAncestorContainer.nodeType === Node.TEXT_NODE
          ? range.commonAncestorContainer.parentElement
          : range.commonAncestorContainer;
        selectionInTable = !!(node && (node as Element).closest?.("table.page-editor-table"));
        if (selectionInTable && el.contains(range.commonAncestorContainer) && !preserveSelection) {
          el.querySelectorAll(".page-editor-table td").forEach((td) => {
            if (range.intersectsNode(td)) {
              selectedCells.push(td as HTMLElement);
            }
          });
        }
      } catch {
        // ignore
      }
    }
    if (!selectionInTable && existing.length > 0) {
      if (!inToolbar && !inCellMenu) {
        clearTableSelection();
        return;
      }
    }
    if (preserveSelection || (cellDragStartRef.current && existing.length > 1)) {
      selectedCells = existing;
    } else if (selectedCells.length === 0 && existing.length > 0) {
      selectedCells = existing;
    }
    if (selectedCells.length === 0) {
      clearTableSelection();
      return;
    }
    el.querySelectorAll(".page-editor-table td[data-cell-selected]").forEach((td) =>
      td.removeAttribute("data-cell-selected")
    );
    selectedCells.forEach((td) => td.setAttribute("data-cell-selected", "true"));
    selectedCellRef.current = null;
    try {
      if (selectedCells.length > 0) {
        const cell = selectedCells[0] as HTMLTableCellElement;
        selectedCellRef.current = cell;
        const table = cell.closest("table.page-editor-table");
        let rows = 1;
        let cols = 1;
        if (table) {
          const tbody = table.querySelector("tbody");
          if (tbody) {
            const allRows = tbody.querySelectorAll("tr");
            let rMin = Infinity;
            let rMax = -Infinity;
            let cMin = Infinity;
            let cMax = -Infinity;
            selectedCells.forEach((c) => {
              const pos = getCellPosition(c as HTMLTableCellElement);
              if (pos) {
                rMin = Math.min(rMin, pos.row);
                rMax = Math.max(rMax, pos.row);
                cMin = Math.min(cMin, pos.col);
                cMax = Math.max(cMax, pos.col);
              }
            });
            if (rMin !== Infinity) rows = rMax - rMin + 1;
            if (cMin !== Infinity) cols = cMax - cMin + 1;
            const positions = selectedCells.map((c) => getCellPosition(c as HTMLTableCellElement)).filter(Boolean) as { row: number; col: number }[];
            const allSameRow = positions.length > 0 && positions.every((p) => p.row === positions[0].row);
            const allSameCol = positions.length > 0 && positions.every((p) => p.col === positions[0].col);
            if (allSameRow) cols = Math.max(cols, selectedCells.length);
            if (allSameCol) rows = Math.max(rows, selectedCells.length);
          }
        }
        setSelectedCellRange({ rows, cols });
        if (table) {
          const tbl = table as HTMLElement;
          const cellWidths = selectedCells.map((c) => (c as HTMLElement).getAttribute?.("data-cell-width") || (c as HTMLElement).style?.width || "").filter(Boolean);
          const sameWidth = cellWidths.length > 0 && cellWidths.every((w) => w === cellWidths[0]);
          setTableWidth(sameWidth ? cellWidths[0]! : "auto");
          const cellHeights = selectedCells.map((c) => (c as HTMLElement).getAttribute?.("data-cell-height") || (c as HTMLElement).style?.height || "").filter(Boolean);
          const sameHeight = cellHeights.length > 0 && cellHeights.every((h) => h === cellHeights[0]);
          setTableRowHeight(sameHeight ? (cellHeights[0] || "auto") : "auto");
          const cellAligns = selectedCells.map((c) => ((c as HTMLElement).getAttribute?.("data-cell-align") || (c as HTMLElement).style?.textAlign || "left").toLowerCase());
          const sameAlign = cellAligns.length > 0 && cellAligns.every((a) => a === cellAligns[0]);
          const align = (sameAlign ? cellAligns[0] : "left") as "left" | "center" | "right";
          setAlignment(align);
          const cellVAligns = selectedCells.map((c) => ((c as HTMLElement).getAttribute?.("data-cell-valign") || (c as HTMLElement).style?.verticalAlign || "middle").toLowerCase());
          const sameVAlign = cellVAligns.length > 0 && cellVAligns.every((v) => v === cellVAligns[0]);
          const vAlign = (sameVAlign ? cellVAligns[0] : "middle") as "top" | "middle" | "bottom";
          setTableVerticalAlign(vAlign);
        }
        const cellRect = cell.getBoundingClientRect();
        const wrapperRect = wrapper?.getBoundingClientRect();
        const scrollTop = editorScrollRef.current?.scrollTop ?? 0;
        const scrollLeft = editorScrollRef.current?.scrollLeft ?? 0;
        if (wrapper && wrapperRect) {
          setCellMenuRect({
            top: cellRect.top - wrapperRect.top + scrollTop,
            left: cellRect.left - wrapperRect.left + scrollLeft,
            height: cellRect.height,
          });
        }
        const rects = selectedCells.map((c) => c.getBoundingClientRect());
        let rightmostTop = cellRect.top;
        let rightmostRight = cellRect.right;
        if (rects.length > 0) {
          const maxRight = Math.max(...rects.map((r) => r.right));
          const rightmostIdx = rects.findIndex((r) => r.right === maxRight);
          if (rightmostIdx >= 0) {
            rightmostTop = rects[rightmostIdx].top;
            rightmostRight = rects[rightmostIdx].right;
          }
        }
        const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 600;
        const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 800;
        const spaceBelow = typeof window !== "undefined" ? window.innerHeight - cellRect.bottom : 300;
        setCellMenuViewport({
          top: cellRect.top + cellRect.height / 2 - 14,
          left: Math.max(8, Math.min(cellRect.left - 32, viewportWidth - 40)),
          topBtn: {
            top: Math.max(8, Math.min(cellRect.top - 28, viewportHeight - 40)),
            left: cellRect.left + cellRect.width / 2 - 14,
          },
          openUp: spaceBelow < 280,
          selectionBadge: { top: rightmostTop, right: rightmostRight },
        });
      }
    } catch {
      // ignore
    }
  }

  function applyCellSelectionFromHighlight() {
    const el = editorRef.current;
    const wrapper = editorWrapperRef.current;
    if (!el) return;
    const selected = Array.from(el.querySelectorAll(".page-editor-table td[data-cell-selected]")) as HTMLTableCellElement[];
    if (selected.length === 0) return;
    const cell = selected[0];
    selectedCellRef.current = cell;
    const table = cell.closest("table.page-editor-table") as HTMLTableElement | null;
    let rows = 1;
    let cols = 1;
    if (table) {
      const tbody = table.querySelector("tbody");
      if (tbody) {
        let rMin = Infinity;
        let rMax = -Infinity;
        let cMin = Infinity;
        let cMax = -Infinity;
        selected.forEach((c) => {
          const pos = getCellPosition(c);
          if (pos) {
            rMin = Math.min(rMin, pos.row);
            rMax = Math.max(rMax, pos.row);
            cMin = Math.min(cMin, pos.col);
            cMax = Math.max(cMax, pos.col);
          }
        });
        if (rMin !== Infinity) rows = rMax - rMin + 1;
        if (cMin !== Infinity) cols = cMax - cMin + 1;
        const positions = selected.map((c) => getCellPosition(c)).filter(Boolean) as { row: number; col: number }[];
        const allSameRow = positions.length > 0 && positions.every((p) => p.row === positions[0].row);
        const allSameCol = positions.length > 0 && positions.every((p) => p.col === positions[0].col);
        if (allSameRow) cols = Math.max(cols, selected.length);
        if (allSameCol) rows = Math.max(rows, selected.length);
      }
    }
    setSelectedCellRange({ rows, cols });
    if (table) {
      const tbl = table as HTMLElement;
      const cellWidths = selected.map((c) => c.getAttribute?.("data-cell-width") || c.style?.width || "").filter(Boolean);
      const sameWidth = cellWidths.length > 0 && cellWidths.every((w) => w === cellWidths[0]);
      setTableWidth(sameWidth ? cellWidths[0]! : "auto");
      const cellHeights = selected.map((c) => c.getAttribute?.("data-cell-height") || c.style?.height || "").filter(Boolean);
      const sameHeight = cellHeights.length > 0 && cellHeights.every((h) => h === cellHeights[0]);
      setTableRowHeight(sameHeight ? (cellHeights[0] || "auto") : "auto");
      const cellAligns = selected.map((c) => (c.getAttribute?.("data-cell-align") || c.style?.textAlign || "left").toLowerCase());
      const sameAlign = cellAligns.length > 0 && cellAligns.every((a) => a === cellAligns[0]);
      const align = (sameAlign ? cellAligns[0] : "left") as "left" | "center" | "right";
      setAlignment(align);
      const cellVAligns = selected.map((c) => (c.getAttribute?.("data-cell-valign") || c.style?.verticalAlign || "middle").toLowerCase());
      const sameVAlign = cellVAligns.length > 0 && cellVAligns.every((v) => v === cellVAligns[0]);
      const vAlign = (sameVAlign ? cellVAligns[0] : "middle") as "top" | "middle" | "bottom";
      setTableVerticalAlign(vAlign);
    }
    const cellRect = cell.getBoundingClientRect();
    const wrapperRect = wrapper?.getBoundingClientRect();
    const scrollTop = editorScrollRef.current?.scrollTop ?? 0;
    const scrollLeft = editorScrollRef.current?.scrollLeft ?? 0;
    if (wrapper && wrapperRect) {
      setCellMenuRect({
        top: cellRect.top - wrapperRect.top + scrollTop,
        left: cellRect.left - wrapperRect.left + scrollLeft,
        height: cellRect.height,
      });
    }
    const rects = selected.map((c) => c.getBoundingClientRect());
    let rightmostTop = cellRect.top;
    let rightmostRight = cellRect.right;
    if (rects.length > 0) {
      const maxRight = Math.max(...rects.map((r) => r.right));
      const rightmostIdx = rects.findIndex((r) => r.right === maxRight);
      if (rightmostIdx >= 0) {
        rightmostTop = rects[rightmostIdx].top;
        rightmostRight = rects[rightmostIdx].right;
      }
    }
    const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 600;
    const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 800;
    const spaceBelow = typeof window !== "undefined" ? window.innerHeight - cellRect.bottom : 300;
    setCellMenuViewport({
      top: cellRect.top + cellRect.height / 2 - 14,
      left: Math.max(8, Math.min(cellRect.left - 32, viewportWidth - 40)),
      topBtn: {
        top: Math.max(8, Math.min(cellRect.top - 28, viewportHeight - 40)),
        left: cellRect.left + cellRect.width / 2 - 14,
      },
      openUp: spaceBelow < 280,
      selectionBadge: { top: rightmostTop, right: rightmostRight },
    });
  }

  useEffect(() => {
    if (!Number.isFinite(pageId)) return;

    void (async () => {
      try {
        setLoading(true);
        setError(null);
        const page = await apiGet<PageDetails>(`/api/pages/${pageId}`);
        setTitle(page.title || "");
        setSlug(page.slug || "");
        const firstText = page.blocks.find((b) => b.type === "text")?.data?.text;
        const initialHtml = typeof firstText === "string" ? firstText : "";
        const normalizedInitialHtml = await normalizeHtmlInlineImagesToWebp(initialHtml);
        setContentHtml(normalizedInitialHtml);
      } catch {
        setError("Не удалось загрузить страницу");
      } finally {
        setLoading(false);
      }
    })();
  }, [pageId]);

  useEffect(() => {
    return () => {
      if (inputSyncTimerRef.current !== null) {
        window.clearTimeout(inputSyncTimerRef.current);
        inputSyncTimerRef.current = null;
      }
    };
  }, []);

  function scheduleEditorHtmlStateSync(html: string) {
    pendingInputHtmlRef.current = html;
    if (inputSyncTimerRef.current !== null) window.clearTimeout(inputSyncTimerRef.current);
    inputSyncTimerRef.current = window.setTimeout(() => {
      inputSyncTimerRef.current = null;
      const pending = pendingInputHtmlRef.current;
      pendingInputHtmlRef.current = null;
      if (typeof pending === "string") {
        setContentHtml((prev) => (prev === pending ? prev : pending));
      }
    }, 120);
  }

  function flushScheduledEditorHtmlStateSync() {
    if (inputSyncTimerRef.current !== null) {
      window.clearTimeout(inputSyncTimerRef.current);
      inputSyncTimerRef.current = null;
    }
    const pending = pendingInputHtmlRef.current;
    pendingInputHtmlRef.current = null;
    if (typeof pending === "string") {
      setContentHtml((prev) => (prev === pending ? prev : pending));
    }
  }

  useLayoutEffect(() => {
    if (!editorRef.current) return;
    const root = editorRef.current;
    const pendingId = pendingEditorCaretRef.current;
    const safeId = pendingId ? pendingId.replace(/"/g, "") : "";
    // React re-renders can clear a contentEditable with no React children; the live marker then
    // disappears while contentHtml still holds the full HTML. We must re-apply innerHTML in that case.
    const markerStillInDom = !!pendingId && !!root.querySelector(`[data-editor-caret="${safeId}"]`);
    const skipDestructiveInnerHtmlSync = !!pendingId && markerStillInDom;
    const innerDiffers = root.innerHTML !== contentHtml;

    if (caretDebugOn()) {
      logPageEditorCaret("layoutEffect[contentHtml]:start", {
        pendingId,
        markerStillInDom,
        skipDestructiveInnerHtmlSync,
        innerDiffers,
        rootChildCount: root.childNodes.length,
        contentHtmlLength: contentHtml.length,
        rootInnerLength: root.innerHTML.length,
      });
      snapshotSelection("layoutEffect[contentHtml]:selection-start", root);
    }

    if (!skipDestructiveInnerHtmlSync && innerDiffers && !coverBgAdjustingRef.current) {
      if (caretDebugOn()) {
        logPageEditorCaret("layoutEffect[contentHtml]:assign-innerHTML", {
          reason: "sync from React state (marker missing or no pending caret)",
        });
      }
      root.innerHTML = contentHtml;
      if (caretDebugOn()) {
        snapshotSelection("layoutEffect[contentHtml]:after-innerHTML-assign", root);
      }
    }
    const before = root.innerHTML;
    normalizeListContent();
    normalizeOlStartNumbers();
    normalizeTableCells();
    normalizeImages();
    normalizeWebCoverInnerEditability(root);
    normalizeWebCoverButtonAnchorsToSpans(root);
    if (ensureWebCoverToolbarInEditor(root) && caretDebugOn()) {
      logPageEditorCaret("layoutEffect[contentHtml]:web-cover-toolbar-upgrade", {});
    }
    if (ensureWebCarouselToolbarInEditor(root) && caretDebugOn()) {
      logPageEditorCaret("layoutEffect[contentHtml]:web-carousel-toolbar-upgrade", {});
    }
    if (ensureWebTimelineToolbarInEditor(root) && caretDebugOn()) {
      logPageEditorCaret("layoutEffect[contentHtml]:web-timeline-toolbar-upgrade", {});
    }
    sanitizeLeakedNodesOutOfWebCovers(root);
    sanitizeLeakedNodesOutOfWebCarousels(root);
    if (normalizeWebCarouselStripInEditor(root) && caretDebugOn()) {
      logPageEditorCaret("layoutEffect[contentHtml]:web-carousel-strip-normalize", {});
    }
    if (ensureWebCarouselShellNonEditableInEditor(root) && caretDebugOn()) {
      logPageEditorCaret("layoutEffect[contentHtml]:web-carousel-shell-non-editable", {});
    }
    if (normalizeWebCarouselAspectAttributes(root) && caretDebugOn()) {
      logPageEditorCaret("layoutEffect[contentHtml]:carousel-aspect-default", {});
    }
    if (normalizeWebCoverAspectAttributes(root) && caretDebugOn()) {
      logPageEditorCaret("layoutEffect[contentHtml]:cover-aspect-default", {});
    }
    root.querySelectorAll(".page-editor-table").forEach((t) => syncTableColgroup(t as HTMLTableElement));
    if (root.innerHTML !== before) {
      if (caretDebugOn()) {
        logPageEditorCaret("layoutEffect[contentHtml]:normalize-changed-html", {
          beforeLen: before.length,
          afterLen: root.innerHTML.length,
        });
      }
      setContentHtml(root.innerHTML);
    }
    syncMarkerBold();
    updateToolbarState();
    highlightSelectedTableCells();

    const caretId = pendingEditorCaretRef.current;
    if (caretId) {
      const safeCaret = caretId.replace(/"/g, "");
      const tryRestore = (): boolean => {
        if (!editorRef.current) return false;
        const ed = editorRef.current;
        const target = ed.querySelector(`[data-editor-caret="${safeCaret}"]`) as HTMLElement | null;
        if (!target) {
          if (caretDebugOn()) {
            logPageEditorCaret("tryRestore:marker-NOT-FOUND", { safeCaret });
          }
          return false;
        }
        if (caretDebugOn()) {
          logPageEditorCaret("tryRestore:marker-FOUND", {
            liPreview: target.outerHTML?.slice(0, 180),
          });
        }
        target.removeAttribute("data-editor-caret");
        pendingEditorCaretRef.current = null;
        placeCaretAtLiStart(target, "layoutEffect-tryRestore");
        syncMarkerBold();
        // Critical: React state still had serialized HTML *with* data-editor-caret while the live DOM
        // no longer has it. Next layoutEffect pass would see innerHTML !== contentHtml and assign
        // root.innerHTML = contentHtml, recreating the whole editor tree and resetting the caret
        // (often to the first li or visually to the top padding).
        setContentHtml(ed.innerHTML);
        if (caretDebugOn()) {
          logPageEditorCaret("tryRestore:sync-state-after-marker-strip", {
            htmlLen: ed.innerHTML.length,
          });
        }
        return true;
      };
      if (!tryRestore()) {
        let rafAttempts = 0;
        const scheduleRetry = () => {
          requestAnimationFrame(() => {
            if (caretDebugOn()) {
              logPageEditorCaret("tryRestore:raf-retry", { attempt: rafAttempts + 1 });
            }
            if (tryRestore()) return;
            rafAttempts += 1;
            if (rafAttempts < 4) scheduleRetry();
            else {
              pendingEditorCaretRef.current = null;
              const edGiveUp = editorRef.current;
              edGiveUp?.querySelectorAll("[data-editor-caret]").forEach((n) => n.removeAttribute("data-editor-caret"));
              if (edGiveUp) setContentHtml(edGiveUp.innerHTML);
              if (caretDebugOn()) {
                logPageEditorCaret("tryRestore:GAVE-UP", { rafAttempts });
                snapshotSelection("layoutEffect[contentHtml]:after-give-up", editorRef.current);
              }
            }
          });
        };
        scheduleRetry();
      }
    }

    syncWebCarouselViewportInnerPx(root);
    if (webCarouselScrollAlignPendingRef.current) {
      alignAllWebCarouselViewportsInEditor(root);
    }
    requestAnimationFrame(() => {
      const ed2 = editorRef.current;
      if (ed2) {
        syncWebCarouselViewportInnerPx(ed2);
        if (webCarouselScrollAlignPendingRef.current) {
          alignAllWebCarouselViewportsInEditor(ed2);
        }
      }
      webCarouselScrollAlignPendingRef.current = false;
    });

    if (caretDebugOn()) {
      snapshotSelection("layoutEffect[contentHtml]:end", root);
      requestAnimationFrame(() => {
        snapshotSelection("layoutEffect[contentHtml]:rAF-after-1-frame", editorRef.current);
      });
    }
  }, [contentHtml, placeCaretAtLiStart]);

  useEffect(() => {
    const ed = editorRef.current;
    if (!ed) return;
    const runSyncOnly = () => syncWebCarouselViewportInnerPx(ed);
    const runSyncAndAlign = () => {
      syncWebCarouselViewportInnerPx(ed);
      alignAllWebCarouselViewportsInEditor(ed);
    };
    const ro = new ResizeObserver(runSyncAndAlign);
    ro.observe(ed);
    ed.querySelectorAll(".page-web-carousel-viewport").forEach((vp) => ro.observe(vp));
    runSyncOnly();
    return () => ro.disconnect();
  }, [contentHtml]);

  useEffect(() => {
    const onSelectionChange = () => {
      updateToolbarState();
      highlightSelectedTableCells();
    };
    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setCellMenuViewport(null);
      setCellMenuRect(null);
      setCellMenuOpen(false);
      const ed = editorRef.current;
      ed?.querySelectorAll('.page-web-carousel-toolbar[data-menu-open="1"]').forEach((node) => {
        closeCarouselToolbarMenus(node as HTMLElement);
      });
      ed?.querySelectorAll('.page-web-timeline-toolbar[data-menu-open="1"]').forEach((node) => {
        closeTimelineToolbarMenus(node as HTMLElement);
      });
    };
    const scrollEl = editorScrollRef.current;
    if (scrollEl) {
      scrollEl.addEventListener("scroll", onScroll, { passive: true });
    }
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    return () => {
      scrollEl?.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [contentHtml]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const drag = cellDragStartRef.current;
      if (!drag) return;
      const el = editorRef.current;
      if (!el) return;
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const endCell = (target as Element)?.closest?.("table.page-editor-table td") as HTMLTableCellElement | null;
      if (!endCell || endCell.closest("table") !== drag.table) return;
      if (endCell.getAttribute("contenteditable") === "true") return;
      const startPos = getCellPosition(drag.cell);
      const endPos = getCellPosition(endCell);
      if (!startPos || !endPos) return;
      el.querySelectorAll(".page-editor-table td[data-cell-selected]").forEach((td) =>
        td.removeAttribute("data-cell-selected")
      );
      setCellMenuRect(null);
      setCellMenuViewport(null);
      selectedCellRef.current = null;
      highlightCellsInRect(drag.table, startPos.row, startPos.col, endPos.row, endPos.col);
      applyCellSelectionFromHighlight();
    };
    const onMouseUp = () => {
      if (cellDragStartRef.current) {
        cellDragStartRef.current = null;
        updateToolbarState();
      }
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  function applyListStyle(value: string) {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const range = savedRangeRef.current;
    if (range) {
      try {
        if (el.contains(range.commonAncestorContainer)) {
          const sel = window.getSelection();
          if (sel) {
            sel.removeAllRanges();
            sel.addRange(range);
          }
        }
      } catch {
        // ignore
      }
    }
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const r = sel.getRangeAt(0);
    if (!el.contains(r.commonAncestorContainer)) return;
    const list = (r.commonAncestorContainer.nodeType === Node.TEXT_NODE
      ? r.commonAncestorContainer.parentElement
      : r.commonAncestorContainer) as Element | null;
    const listEl = list?.closest?.("ol, ul");
    if (listEl) {
      const html = listEl as HTMLElement;
      if (CUSTOM_LIST_STYLES.includes(value)) {
        html.style.listStyleType = "none";
        html.setAttribute("data-list-style", value);
      } else if (value === "none") {
        html.style.listStyleType = "none";
        html.setAttribute("data-list-style", "none");
      } else {
        html.style.listStyleType = value;
        html.removeAttribute("data-list-style");
      }
      splitMultiLineListItems();
      normalizeListContent();
      setContentHtml(el.innerHTML);
      setListStyleType(value);
    }
    setListStyleOpen(false);
  }

  function applyListColor(value: string) {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const range = savedRangeRef.current;
    if (range) {
      try {
        if (el.contains(range.commonAncestorContainer)) {
          const sel = window.getSelection();
          if (sel) {
            sel.removeAllRanges();
            sel.addRange(range);
          }
        }
      } catch {
        // ignore
      }
    }
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const r = sel.getRangeAt(0);
    if (!el.contains(r.commonAncestorContainer)) return;
    const list = (r.commonAncestorContainer.nodeType === Node.TEXT_NODE
      ? r.commonAncestorContainer.parentElement
      : r.commonAncestorContainer) as Element | null;
    const listEl = list?.closest?.("ol, ul");
    if (listEl) {
      const html = listEl as HTMLElement;
      if (value) html.setAttribute("data-list-color", value);
      else html.removeAttribute("data-list-color");
      splitMultiLineListItems();
      normalizeListContent();
      setContentHtml(el.innerHTML);
      setListColor(value);
    }
  }

  function applyListStart(value: number) {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const range = savedRangeRef.current;
    if (range) {
      try {
        if (el.contains(range.commonAncestorContainer)) {
          const sel = window.getSelection();
          if (sel) {
            sel.removeAllRanges();
            sel.addRange(range);
          }
        }
      } catch {
        // ignore
      }
    }
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const r = sel.getRangeAt(0);
    if (!el.contains(r.commonAncestorContainer)) return;
    const list = (r.commonAncestorContainer.nodeType === Node.TEXT_NODE
      ? r.commonAncestorContainer.parentElement
      : r.commonAncestorContainer) as Element | null;
    const listEl = list?.closest?.("ol");
    if (listEl) {
      const start = Math.max(1, Math.floor(value) || 1);
      const htmlList = listEl as HTMLElement;
      htmlList.setAttribute("start", String(start));
      // Якорь: не перетирать это значение глобальным пересчётом (любое число из диалога).
      htmlList.setAttribute("data-list-restart", "1");
      setContentHtml(el.innerHTML);
      setListStart(start);
    }
  }

  function insertTable(rows: number, cols: number) {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const range = savedRangeRef.current;
    if (range) {
      try {
        if (el.contains(range.commonAncestorContainer)) {
          const sel = window.getSelection();
          if (sel) {
            sel.removeAllRanges();
            sel.addRange(range);
          }
        }
      } catch {
        // ignore
      }
    }
    const r = Math.max(1, Math.min(10, rows));
    const c = Math.max(1, Math.min(10, cols));
    let html = '<table class="page-editor-table"><tbody>';
    for (let i = 0; i < r; i++) {
      html += "<tr>";
      for (let j = 0; j < c; j++) {
        html += '<td contenteditable="false"><br></td>';
      }
      html += "</tr>";
    }
    html += "</tbody></table>";
    document.execCommand("insertHTML", false, html);
    setContentHtml(el.innerHTML);
    setTableOpen(false);
    setTimeout(updateToolbarState, 0);
  }

  function getWebCoverAspectMenuHtml(): string {
    const cells = COVER_ASPECT_PRESETS.map((p) => {
      const svg = getCoverAspectPreviewSvg(p.arW, p.arH);
      return (
        '<button type="button" role="menuitem" class="page-web-cover-menu-aspect" contenteditable="false" tabindex="-1" data-set-cover-aspect="' +
        p.id +
        '" title="' +
        p.label +
        '">' +
        '<span class="page-web-cover-menu-aspect-preview">' +
        svg +
        '</span><span class="page-web-cover-menu-aspect-label">' +
        p.label +
        "</span></button>"
      );
    }).join("");
    return '<div class="page-web-cover-aspect-grid" role="group" aria-label="Соотношения сторон">' + cells + "</div>";
  }

  function getWebCoverElementsMenuHtml(): string {
    const items: { data: string; label: string }[] = [
      { data: "title", label: "Заголовок" },
      { data: "subtitle", label: "Подзаголовок" },
      { data: "button", label: "Кнопка" },
    ];
    return items
      .map(
        (it) =>
          '<button type="button" role="menuitem" class="page-web-cover-menu-insert-cover-el" contenteditable="false" tabindex="-1" data-insert-cover-element="' +
          it.data +
          '">' +
          it.label +
          "</button>"
      )
      .join("");
  }

  type CoverInsertBlockKind = "title" | "subtitle" | "button";

  function insertCoverBlockElement(cover: HTMLElement, kind: CoverInsertBlockKind, ed: HTMLElement) {
    const inner = cover.querySelector(".page-web-cover-inner") as HTMLElement | null;
    if (!inner || !ed.contains(inner)) return;

    inner.setAttribute("data-cover-unlocked", "1");
    inner.setAttribute("contenteditable", "true");

    const html =
      kind === "title"
        ? '<h2 class="page-web-cover-el-title">Заголовок</h2>'
        : kind === "subtitle"
          ? '<p class="page-web-cover-el-subtitle">Подзаголовок</p>'
          : '<p class="page-web-cover-el-button-wrap"><span class="page-web-cover-el-button" role="button">Кнопка</span></p>';

    const wrap = document.createElement("div");
    wrap.innerHTML = html.trim();
    const node = wrap.firstElementChild as HTMLElement;

    const onlyBr =
      inner.childNodes.length === 1 &&
      inner.firstChild?.nodeName === "BR" &&
      !(inner.textContent || "").replace(/\u200b/g, "").trim();
    if (onlyBr && inner.firstChild) inner.removeChild(inner.firstChild);

    inner.appendChild(node);

    requestAnimationFrame(() => {
      const sel = window.getSelection();
      if (!sel || !ed.contains(inner)) return;
      const r = document.createRange();
      if (kind === "button") {
        const btn = node.querySelector(".page-web-cover-el-button");
        if (btn?.firstChild?.nodeType === Node.TEXT_NODE) {
          r.selectNodeContents(btn.firstChild);
        } else if (btn) {
          r.selectNodeContents(btn);
          r.collapse(false);
        } else {
          r.selectNodeContents(node);
          r.collapse(false);
        }
      } else {
        r.selectNodeContents(node);
      }
      sel.removeAllRanges();
      try {
        sel.addRange(r);
      } catch {
        // ignore
      }
      inner.focus();
      setTimeout(() => updateToolbarState(), 0);
    });
  }

  function getWebCoverToolbarHtml(): string {
    return (
      '<div class="page-web-cover-toolbar" contenteditable="false">' +
      '<button type="button" class="page-web-cover-menu-trigger" tabindex="-1" aria-label="Меню обложки" aria-haspopup="true" title="Действия с обложкой">' +
      '<span class="page-web-cover-menu-dots" aria-hidden="true"></span></button>' +
      '<div role="menu" class="page-web-cover-menu-dropdown">' +
      '<div class="page-web-cover-menu-sub" contenteditable="false">' +
      '<button type="button" class="page-web-cover-menu-sub-trigger" tabindex="-1" aria-haspopup="true" aria-expanded="false">' +
      '<span class="page-web-cover-menu-sub-label">Размер обложки</span>' +
      '<span class="page-web-cover-menu-chevron" aria-hidden="true"></span></button>' +
      '<div role="menu" class="page-web-cover-menu-sub-panel">' +
      getWebCoverAspectMenuHtml() +
      "</div></div>" +
      '<div class="page-web-cover-menu-sub" contenteditable="false">' +
      '<button type="button" class="page-web-cover-menu-sub-trigger" tabindex="-1" aria-haspopup="true" aria-expanded="false">' +
      '<span class="page-web-cover-menu-sub-label">Элементы</span>' +
      '<span class="page-web-cover-menu-chevron" aria-hidden="true"></span></button>' +
      '<div role="menu" class="page-web-cover-menu-sub-panel page-web-cover-elements-panel">' +
      getWebCoverElementsMenuHtml() +
      "</div></div>" +
      '<button type="button" role="menuitem" class="page-web-cover-menu-upload" contenteditable="false" tabindex="-1">Загрузить изображение</button>' +
      '<button type="button" role="menuitem" class="page-web-cover-menu-align-bg" contenteditable="false" tabindex="-1">Положение фона</button>' +
      '<div class="page-web-cover-menu-sep" aria-hidden="true"></div>' +
      '<button type="button" role="menuitem" class="page-web-cover-menu-delete" contenteditable="false" tabindex="-1">Удалить обложку</button>' +
      "</div></div>"
    );
  }

  function getWebElementHtml(kind: string): string {
    if (kind === "cover") {
      // Панель с меню только в редакторе; перед сохранением вырезается из HTML.
      return (
        '<div class="page-web-cover" data-web-element="cover" data-cover-aspect="1-4" contenteditable="false">' +
        getWebCoverToolbarHtml() +
        '<div class="page-web-cover-inner" contenteditable="false" title="Нажмите, чтобы ввести текст на обложке"><br></div>' +
        "</div>"
      );
    }
    if (kind === "carousel") {
      const slide = (n: number, active: boolean) =>
        '<div class="page-web-carousel-slide" contenteditable="false"' +
        (active ? ' data-carousel-active="1"' : "") +
        ">" +
        '<div class="page-web-carousel-slide-inner" contenteditable="false">' +
        '<div class="page-web-carousel-placeholder" contenteditable="false">Слайд ' +
        n +
        "</div></div></div>";
      return (
        '<div class="page-web-carousel" data-web-element="carousel" data-carousel-aspect="horizontal" contenteditable="false">' +
        getWebCarouselToolbarHtml() +
        '<button type="button" class="page-web-carousel-prev page-web-carousel-arrow" tabindex="-1" aria-label="Предыдущий слайд" contenteditable="false">‹</button>' +
        '<button type="button" class="page-web-carousel-next page-web-carousel-arrow" tabindex="-1" aria-label="Следующий слайд" contenteditable="false">›</button>' +
        '<div class="page-web-carousel-viewport" contenteditable="false">' +
        '<div class="page-web-carousel-strip" contenteditable="false">' +
        slide(1, true) +
        slide(2, false) +
        slide(3, false) +
        "</div></div></div>"
      );
    }
    if (kind === "timeline") {
      return (
        '<div class="page-web-timeline" data-web-element="timeline">' +
        getWebTimelineToolbarHtml() +
        '<div class="page-web-timeline-item">' +
        '<div class="page-web-timeline-dot" aria-hidden="true"></div>' +
        '<div class="page-web-timeline-content">' +
        '<p class="page-web-timeline-title">Этап 1. Подготовка</p>' +
        '<p class="page-web-timeline-text">Сбор требований, анализ текущего процесса и постановка задач.</p>' +
        "</div></div>" +
        '<div class="page-web-timeline-item">' +
        '<p class="page-web-timeline-term">3 дня</p>' +
        '<div class="page-web-timeline-dot" aria-hidden="true"></div>' +
        '<div class="page-web-timeline-content">' +
        '<p class="page-web-timeline-title">Этап 2. Реализация</p>' +
        '<p class="page-web-timeline-text">Выполнение работ и регулярная синхронизация по статусу.</p>' +
        "</div></div>" +
        '<div class="page-web-timeline-item">' +
        '<p class="page-web-timeline-term">5 дней</p>' +
        '<div class="page-web-timeline-dot" aria-hidden="true"></div>' +
        '<div class="page-web-timeline-content">' +
        '<p class="page-web-timeline-title">Этап 3. Результат</p>' +
        '<p class="page-web-timeline-text">Проверка качества, финальные правки и передача результата.</p>' +
        "</div></div>" +
        "</div>"
      );
    }
    return "";
  }

  function getWebCarouselToolbarHtml(): string {
    const imageTypeItems = CAROUSEL_IMAGE_TYPE_PRESETS.map(
      (p) =>
        '<button type="button" role="menuitemradio" class="page-web-carousel-menu-image-type" contenteditable="false" tabindex="-1" data-set-carousel-aspect="' +
        p.id +
        '" aria-checked="false">' +
        '<span class="page-web-carousel-menu-image-type-radio" aria-hidden="true"></span>' +
        '<span class="page-web-carousel-menu-image-type-label">' +
        p.label +
        "</span></button>"
    ).join("");
    return (
      '<div class="page-web-carousel-toolbar" contenteditable="false">' +
      '<button type="button" class="page-web-carousel-menu-trigger" tabindex="-1" aria-label="Меню карусели" aria-haspopup="true" title="Действия с каруселью">' +
      '<span class="page-web-carousel-menu-dots" aria-hidden="true"></span></button>' +
      '<div role="menu" class="page-web-carousel-menu-dropdown">' +
      '<div class="page-web-carousel-menu-sub" contenteditable="false">' +
      '<button type="button" class="page-web-carousel-menu-sub-trigger" tabindex="-1" aria-haspopup="true" aria-expanded="false">' +
      '<span class="page-web-carousel-menu-sub-label">Тип изображения</span>' +
      '<span class="page-web-carousel-menu-chevron" aria-hidden="true"></span></button>' +
      '<div role="menu" class="page-web-carousel-menu-sub-panel">' +
      imageTypeItems +
      "</div></div>" +
      '<button type="button" role="menuitem" class="page-web-carousel-menu-fullscreen" contenteditable="false" tabindex="-1">Полный просмотр</button>' +
      '<button type="button" role="menuitem" class="page-web-carousel-menu-upload-slide" contenteditable="false" tabindex="-1">Изображение в активный слайд</button>' +
      '<button type="button" role="menuitem" class="page-web-carousel-menu-add-slide" contenteditable="false" tabindex="-1">Добавить слайд</button>' +
      '<button type="button" role="menuitem" class="page-web-carousel-menu-remove-slide" contenteditable="false" tabindex="-1">Удалить активный слайд</button>' +
      '<div class="page-web-carousel-menu-sep" aria-hidden="true"></div>' +
      '<button type="button" role="menuitem" class="page-web-carousel-menu-delete" contenteditable="false" tabindex="-1">Удалить карусель</button>' +
      "</div></div>"
    );
  }

  function getWebTimelineToolbarHtml(): string {
    return (
      '<div class="page-web-timeline-toolbar" contenteditable="false">' +
      '<button type="button" class="page-web-timeline-menu-trigger" tabindex="-1" aria-label="Меню таймлайна" aria-haspopup="true" title="Действия с таймлайном">' +
      '<span class="page-web-timeline-menu-dots" aria-hidden="true"></span></button>' +
      '<div role="menu" class="page-web-timeline-menu-dropdown">' +
      '<button type="button" role="menuitem" class="page-web-timeline-menu-add-step" contenteditable="false" tabindex="-1">Добавить этап</button>' +
      '<button type="button" role="menuitem" class="page-web-timeline-menu-remove-step" contenteditable="false" tabindex="-1">Удалить последний этап</button>' +
      '<div class="page-web-timeline-menu-sep" aria-hidden="true"></div>' +
      '<button type="button" role="menuitem" class="page-web-timeline-menu-delete" contenteditable="false" tabindex="-1">Удалить таймлайн</button>' +
      "</div></div>"
    );
  }

  /**
   * Одна панель ⋮ на обложку: старый «×», отсутствие панели, или панель не прямой потомок (тогда раньше
   * вставлялась вторая копия).
   */
  function ensureWebCoverToolbarInEditor(root: HTMLElement): boolean {
    let changed = false;
    root.querySelectorAll(".page-web-cover").forEach((cov) => {
      const cover = cov as HTMLElement;
      cover.querySelectorAll(".page-web-cover-delete").forEach((n) => n.remove());

      const bars = Array.from(cover.querySelectorAll(".page-web-cover-toolbar")) as HTMLElement[];
      if (bars.length > 1) {
        const keep = bars.find((b) => b.parentElement === cover) ?? bars[0];
        for (const b of bars) {
          if (b !== keep) {
            b.remove();
            changed = true;
          }
        }
      }

      let toolbar = cover.querySelector(".page-web-cover-toolbar") as HTMLElement | null;
      if (!toolbar) {
        const tmp = document.createElement("div");
        tmp.innerHTML = getWebCoverToolbarHtml();
        toolbar = tmp.firstElementChild as HTMLElement;
        cover.insertBefore(toolbar, cover.firstChild);
        changed = true;
      } else if (toolbar.parentElement !== cover) {
        cover.insertBefore(toolbar, cover.firstChild);
        changed = true;
      }

      toolbar = cover.querySelector(".page-web-cover-toolbar") as HTMLElement | null;
      const inner = cover.querySelector(":scope > .page-web-cover-inner");
      if (toolbar && inner && (inner.compareDocumentPosition(toolbar) & Node.DOCUMENT_POSITION_FOLLOWING)) {
        cover.insertBefore(toolbar, inner);
        changed = true;
      }

      toolbar = cover.querySelector(".page-web-cover-toolbar") as HTMLElement | null;
      if (
        toolbar &&
        (!toolbar.querySelector(".page-web-cover-menu-sub") ||
          !toolbar.querySelector(".page-web-cover-aspect-grid") ||
          !toolbar.querySelector("[data-set-cover-aspect]") ||
          !toolbar.querySelector(".page-web-cover-menu-upload") ||
          !toolbar.querySelector(".page-web-cover-menu-align-bg") ||
          !toolbar.querySelector("[data-insert-cover-element]"))
      ) {
        const tmp = document.createElement("div");
        tmp.innerHTML = getWebCoverToolbarHtml();
        const fresh = tmp.firstElementChild as HTMLElement;
        toolbar.replaceWith(fresh);
        changed = true;
      }
    });
    return changed;
  }

  function ensureWebCarouselToolbarInEditor(root: HTMLElement): boolean {
    let changed = false;
    root.querySelectorAll(".page-web-carousel").forEach((c) => {
      const carousel = c as HTMLElement;
      let toolbar = carousel.querySelector(":scope > .page-web-carousel-toolbar") as HTMLElement | null;
      if (!toolbar) {
        const tmp = document.createElement("div");
        tmp.innerHTML = getWebCarouselToolbarHtml();
        toolbar = tmp.firstElementChild as HTMLElement;
        carousel.insertBefore(toolbar, carousel.firstChild);
        changed = true;
      } else if (toolbar.parentElement !== carousel || carousel.firstElementChild !== toolbar) {
        carousel.insertBefore(toolbar, carousel.firstChild);
        changed = true;
      }
      toolbar = carousel.querySelector(".page-web-carousel-toolbar") as HTMLElement | null;
      if (
        toolbar &&
        (!toolbar.querySelector(".page-web-carousel-menu-sub") ||
          !toolbar.querySelector("[data-set-carousel-aspect]") ||
          !toolbar.querySelector(".page-web-carousel-menu-fullscreen") ||
          !toolbar.querySelector(".page-web-carousel-menu-upload-slide") ||
          !toolbar.querySelector(".page-web-carousel-menu-add-slide") ||
          !toolbar.querySelector(".page-web-carousel-menu-delete"))
      ) {
        const tmp = document.createElement("div");
        tmp.innerHTML = getWebCarouselToolbarHtml();
        const fresh = tmp.firstElementChild as HTMLElement;
        toolbar.replaceWith(fresh);
        changed = true;
      }
    });
    return changed;
  }

  function ensureWebTimelineToolbarInEditor(root: HTMLElement): boolean {
    let changed = false;
    root.querySelectorAll(".page-web-timeline").forEach((t) => {
      const timeline = t as HTMLElement;
      const items = Array.from(timeline.querySelectorAll(".page-web-timeline-item")) as HTMLElement[];
      const stepsCount = Math.max(1, items.length);
      if (timeline.style.getPropertyValue("--timeline-cols") !== String(stepsCount)) {
        timeline.style.setProperty("--timeline-cols", String(stepsCount));
        changed = true;
      }
      items.forEach((item, idx) => {
        const term = item.querySelector(":scope > .page-web-timeline-term") as HTMLElement | null;
        if (idx === 0) {
          if (term) {
            term.remove();
            changed = true;
          }
          return;
        }
        if (!term) {
          const termNode = document.createElement("p");
          termNode.className = "page-web-timeline-term";
          termNode.textContent = "1 неделя";
          item.insertBefore(termNode, item.firstChild);
          changed = true;
        }
      });
      let toolbar = timeline.querySelector(":scope > .page-web-timeline-toolbar") as HTMLElement | null;
      if (!toolbar) {
        const tmp = document.createElement("div");
        tmp.innerHTML = getWebTimelineToolbarHtml();
        toolbar = tmp.firstElementChild as HTMLElement;
        timeline.insertBefore(toolbar, timeline.firstChild);
        changed = true;
      } else if (toolbar.parentElement !== timeline || timeline.firstElementChild !== toolbar) {
        timeline.insertBefore(toolbar, timeline.firstChild);
        changed = true;
      }
      toolbar = timeline.querySelector(".page-web-timeline-toolbar") as HTMLElement | null;
      if (
        toolbar &&
        (!toolbar.querySelector(".page-web-timeline-menu-add-step") ||
          !toolbar.querySelector(".page-web-timeline-menu-remove-step") ||
          !toolbar.querySelector(".page-web-timeline-menu-delete"))
      ) {
        const tmp = document.createElement("div");
        tmp.innerHTML = getWebTimelineToolbarHtml();
        const fresh = tmp.firstElementChild as HTMLElement;
        toolbar.replaceWith(fresh);
        changed = true;
      }
    });
    return changed;
  }

  /** Явный contenteditable=false на частях карусели — иначе каретка родителя «протекает» в слайды и мигает. */
  function ensureWebCarouselShellNonEditableInEditor(root: HTMLElement): boolean {
    let changed = false;
    const setFalse = (el: HTMLElement) => {
      if (el.getAttribute("contenteditable") !== "false") {
        el.setAttribute("contenteditable", "false");
        changed = true;
      }
    };
    root.querySelectorAll(".page-web-carousel").forEach((c) => {
      const carousel = c as HTMLElement;
      setFalse(carousel);
      carousel.querySelectorAll(".page-web-carousel-viewport").forEach((n) => setFalse(n as HTMLElement));
      carousel.querySelectorAll(".page-web-carousel-strip").forEach((n) => setFalse(n as HTMLElement));
      carousel.querySelectorAll(".page-web-carousel-slide").forEach((n) => setFalse(n as HTMLElement));
      carousel.querySelectorAll(".page-web-carousel-slide-inner").forEach((n) => setFalse(n as HTMLElement));
      carousel.querySelectorAll(".page-web-carousel-placeholder").forEach((n) => setFalse(n as HTMLElement));
      carousel.querySelectorAll(".page-web-carousel-img").forEach((n) => setFalse(n as HTMLElement));
    });
    return changed;
  }

  function normalizeWebCoverAspectAttributes(root: HTMLElement): boolean {
    let changed = false;
    root.querySelectorAll(".page-web-cover").forEach((n) => {
      const h = n as HTMLElement;
      if (!h.hasAttribute("data-cover-aspect")) {
        h.setAttribute("data-cover-aspect", "16-9");
        changed = true;
      }
    });
    return changed;
  }

  function normalizeWebCarouselAspectAttributes(root: HTMLElement): boolean {
    let changed = false;
    root.querySelectorAll(".page-web-carousel").forEach((n) => {
      const h = n as HTMLElement;
      const current = h.getAttribute("data-carousel-aspect");
      if (current !== "vertical" && current !== "horizontal" && current !== "square") {
        h.setAttribute("data-carousel-aspect", "horizontal");
        changed = true;
      }
    });
    return changed;
  }

  /** Убирает элементы интерфейса редактора из HTML перед отправкой на сервер. */
  function stripCoverEditorChromeFromHtml(html: string): string {
    if (typeof document === "undefined") return html;
    try {
      const wrap = document.createElement("div");
      wrap.innerHTML = html;
      wrap.querySelectorAll(".page-web-cover-toolbar").forEach((n) => n.remove());
      wrap.querySelectorAll(".page-web-cover-delete").forEach((n) => n.remove());
      wrap.querySelectorAll(".page-web-cover").forEach((n) => (n as HTMLElement).removeAttribute("contenteditable"));
      wrap.querySelectorAll(".page-web-cover-inner").forEach((n) => {
        const h = n as HTMLElement;
        h.removeAttribute("contenteditable");
        h.removeAttribute("data-cover-unlocked");
        h.removeAttribute("title");
      });
      wrap.querySelectorAll(".page-web-carousel-toolbar").forEach((n) => n.remove());
      wrap.querySelectorAll(".page-web-carousel").forEach((n) => {
        (n as HTMLElement).removeAttribute("contenteditable");
      });
      wrap.querySelectorAll(".page-web-timeline-toolbar").forEach((n) => n.remove());
      wrap.querySelectorAll(".page-web-timeline").forEach((n) => {
        (n as HTMLElement).removeAttribute("contenteditable");
      });
      wrap.querySelectorAll(".page-web-carousel-slide[data-carousel-active]").forEach((n) => {
        (n as HTMLElement).removeAttribute("data-carousel-active");
      });
      wrap.querySelectorAll(".page-web-carousel-arrow").forEach((n) => {
        (n as HTMLElement).removeAttribute("tabindex");
      });
      return wrap.innerHTML;
    } catch {
      return html;
    }
  }

  /** True if caret is at the effective start of block (incl. nested div/span), not only at the shallow first boundary. */
  function rangeCollapsedAtEditableBlockStart(range: Range, block: HTMLElement): boolean {
    if (!range.collapsed) return false;
    try {
      if (!block.contains(range.startContainer)) return false;
      const blockStart = document.createRange();
      blockStart.selectNodeContents(block);
      blockStart.collapse(true);
      const probe = document.createRange();
      probe.setStart(blockStart.startContainer, blockStart.startOffset);
      probe.setEnd(range.startContainer, range.startOffset);
      const text = probe.toString().replace(/\u200b/g, "").replace(/\ufeff/g, "");
      // NBSP (U+00A0) is not removed by String#trim — treat as ignorable for “line start”.
      if (text.length > 0 && /[^\s\u00a0]/.test(text)) return false;
      const frag = probe.cloneContents();
      if (
        frag.querySelector(
          "img,table,hr,iframe,video,audio,object,embed,svg,canvas,button,input,textarea",
        )
      )
        return false;
      return true;
    } catch {
      return false;
    }
  }

  function isIgnorableSpacerBeforeCover(el: HTMLElement): boolean {
    if (el.classList.contains("page-web-cover")) return false;
    if (el.classList.contains("page-web-carousel")) return false;
    const tag = el.tagName;
    if (tag === "BR") return true;
    if (tag !== "DIV" && tag !== "P") return false;
    if (el.querySelector("img,table,hr,iframe,video,ol,ul,li,.page-web-cover,.page-web-carousel")) return false;
    const text = el.innerText.replace(/\u200b/g, "").replace(/\u00a0/g, " ").trim();
    return text.length === 0;
  }

  /** Ближайшая к точке `.page-web-cover`, которая в документе строго до `point` (если walk по siblings дал null). */
  function findDeepestWebCoverBeforePoint(ed: HTMLElement, point: Node): HTMLElement | null {
    if (!ed.contains(point)) return null;
    const covers = Array.from(ed.querySelectorAll(".page-web-cover")) as HTMLElement[];
    let best: HTMLElement | null = null;
    for (const c of covers) {
      if (c.contains(point)) continue;
      const rel = c.compareDocumentPosition(point);
      if (!(rel & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
      if (!best) {
        best = c;
        continue;
      }
      if (best.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING) {
        best = c;
      }
    }
    return best;
  }

  /**
   * Браузер при слиянии может вставить абзац прямым потомком `.page-web-cover` — тогда обложка не удаляется целиком и текст «течёт» в блок.
   * Оставляем только кнопку удаления и `.page-web-cover-inner`, остальное переносим после обложки.
   */
  function sanitizeLeakedNodesOutOfWebCovers(root: HTMLElement): boolean {
    let changed = false;
    root.querySelectorAll(".page-web-cover").forEach((cov) => {
      const cover = cov as HTMLElement;
      const parent = cover.parentNode;
      if (!parent) return;
      const movable: Node[] = [];
      for (const ch of Array.from(cover.childNodes)) {
        if (ch.nodeType === Node.ELEMENT_NODE) {
          const hel = ch as HTMLElement;
          if (hel.classList.contains("page-web-cover-toolbar")) continue;
          if (hel.classList.contains("page-web-cover-delete")) continue;
          if (hel.classList.contains("page-web-cover-inner")) continue;
          movable.push(ch);
        } else if (ch.nodeType === Node.TEXT_NODE) {
          if ((ch.textContent || "").replace(/\u200b/g, "").trim()) movable.push(ch);
        }
      }
      if (movable.length === 0) return;
      const frag = document.createDocumentFragment();
      for (const ch of movable) {
        frag.appendChild(ch);
      }
      parent.insertBefore(frag, cover.nextSibling);
      changed = true;
    });
    return changed;
  }

  /** Слайды внутри viewport оборачиваем в `.page-web-carousel-strip` (grid-лента; колонки от 100cqi ≈ треть видимой области). */
  function normalizeWebCarouselStripInEditor(root: HTMLElement): boolean {
    let changed = false;
    root.querySelectorAll(".page-web-carousel-viewport").forEach((vp) => {
      const viewport = vp as HTMLElement;
      if (viewport.querySelector(":scope > .page-web-carousel-strip")) return;
      const slides = Array.from(viewport.querySelectorAll(":scope > .page-web-carousel-slide"));
      if (slides.length === 0) return;
      const strip = document.createElement("div");
      strip.className = "page-web-carousel-strip";
      for (const s of slides) {
        strip.appendChild(s);
      }
      viewport.appendChild(strip);
      changed = true;
    });
    return changed;
  }

  /** Синхронизируем внутреннюю ширину viewport и фиксированную ширину одной карточки. */
  function syncWebCarouselViewportInnerPx(root: HTMLElement) {
    root.querySelectorAll(".page-web-carousel-viewport").forEach((node) => {
      const vp = node as HTMLElement;
      if (!vp.querySelector(":scope > .page-web-carousel-strip")) {
        vp.style.removeProperty("--carousel-inner-px");
        vp.style.removeProperty("--carousel-slide-px");
        return;
      }
      const cs = getComputedStyle(vp);
      const pl = parseFloat(cs.paddingLeft) || 0;
      const pr = parseFloat(cs.paddingRight) || 0;
      const inner = Math.max(0, vp.clientWidth - pl - pr);
      const slidePx = getCarouselSlideWidthPx(inner, getCarouselVisibleSlides(vp));
      vp.style.setProperty("--carousel-inner-px", `${inner}px`);
      vp.style.setProperty("--carousel-slide-px", `${slidePx}px`);
      const strip = vp.querySelector(":scope > .page-web-carousel-strip") as HTMLElement | null;
      strip?.style.removeProperty("width");
      refreshCarouselStripTranslateAfterLayout(vp);
    });
  }

  /** Лента двигается через transform (как SAB-AUTO), не через scrollLeft. */
  function alignWebCarouselViewportToActive(vp: HTMLElement) {
    if (!vp.querySelector(":scope > .page-web-carousel-strip")) return;
    const slides = Array.from(vp.querySelectorAll(".page-web-carousel-slide")) as HTMLElement[];
    if (slides.length === 0) return;
    const active = vp.querySelector(".page-web-carousel-slide[data-carousel-active]") as HTMLElement | null;
    const idx = active ? slides.indexOf(active) : 0;
    const visibleSlides = getCarouselVisibleSlides(vp);
    const lastStart = Math.max(0, slides.length - visibleSlides);
    /* Левое окно из VISIBLE слайдов, в котором виден активный (минимальный сдвиг, без «уезда влево» без нужды). */
    const startIdx = Math.max(0, Math.min(lastStart, idx - (visibleSlides - 1)));
    alignCarouselStripToStartSlideIndex(vp, startIdx);
  }

  function alignAllWebCarouselViewportsInEditor(root: HTMLElement) {
    root.querySelectorAll(".page-web-carousel-viewport").forEach((node) => {
      alignWebCarouselViewportToActive(node as HTMLElement);
    });
  }

  /** Посторонние узлы прямым потомком `.page-web-carousel` переносим после блока. */
  function sanitizeLeakedNodesOutOfWebCarousels(root: HTMLElement): boolean {
    let changed = false;
    root.querySelectorAll(".page-web-carousel").forEach((cov) => {
      const carousel = cov as HTMLElement;
      const parent = carousel.parentNode;
      if (!parent) return;
      const movable: Node[] = [];
      for (const ch of Array.from(carousel.childNodes)) {
        if (ch.nodeType === Node.ELEMENT_NODE) {
          const hel = ch as HTMLElement;
          if (hel.classList.contains("page-web-carousel-toolbar")) continue;
          if (hel.classList.contains("page-web-carousel-arrow")) continue;
          if (hel.classList.contains("page-web-carousel-viewport")) continue;
          movable.push(ch);
        } else if (ch.nodeType === Node.TEXT_NODE) {
          if ((ch.textContent || "").replace(/\u200b/g, "").trim()) movable.push(ch);
        }
      }
      if (movable.length === 0) return;
      const frag = document.createDocumentFragment();
      for (const ch of movable) {
        frag.appendChild(ch);
      }
      parent.insertBefore(frag, carousel.nextSibling);
      changed = true;
    });
    return changed;
  }

  /** Walk up from the caret: on each ancestor, scan previous element siblings for a cover (skips empty div/p). */
  function findPrecedingWebCoverFromCaret(ed: HTMLElement, range: Range): HTMLElement | null {
    let cur: Node | null = range.startContainer;
    if (cur.nodeType === Node.TEXT_NODE) cur = cur.parentNode;
    while (cur && cur !== ed) {
      if (cur.nodeType === Node.ELEMENT_NODE) {
        let sib: Element | null = (cur as Element).previousElementSibling;
        while (sib) {
          if (sib.classList.contains("page-web-cover")) return sib as HTMLElement;
          if (sib instanceof HTMLElement && isIgnorableSpacerBeforeCover(sib)) {
            sib = sib.previousElementSibling;
            continue;
          }
          break;
        }
      }
      cur = cur.parentNode;
    }
    return null;
  }

  /**
   * Caret at the first editable position after this cover (same parent branch), without treating the cover subtree
   * as “prefix” (avoids false negatives when cover+content share a wrapper and the probe would include the × button).
   */
  function rangeCollapsedImmediatelyAfterCover(range: Range, cover: HTMLElement): boolean {
    if (!range.collapsed) return false;
    if (cover.contains(range.startContainer)) return false;
    try {
      const parent = cover.parentElement;
      if (!parent || !parent.contains(range.startContainer)) return false;
      const boundary = document.createRange();
      boundary.setStartAfter(cover);
      boundary.collapse(true);
      // -1 = boundary before caret (normal: caret in content after cover); 0 = at caret; 1 = boundary after caret (invalid).
      const cmp = range.comparePoint(boundary.startContainer, boundary.startOffset);
      if (cmp > 0) return false;
      const probe = document.createRange();
      probe.setStart(boundary.startContainer, boundary.startOffset);
      probe.setEnd(range.startContainer, range.startOffset);
      const text = probe.toString().replace(/\u200b/g, "").replace(/\ufeff/g, "");
      if (text.length > 0 && /[^\s\u00a0]/.test(text)) return false;
      const frag = probe.cloneContents();
      if (
        frag.querySelector(
          "img,table,hr,iframe,video,audio,object,embed,svg,canvas,button,input,textarea",
        )
      )
        return false;
      return true;
    } catch {
      return false;
    }
  }

  /** Collapsed caret at the effective end of block (nested div/span), mirror of rangeCollapsedAtEditableBlockStart. */
  function rangeCollapsedAtEditableBlockEnd(range: Range, block: HTMLElement): boolean {
    if (!range.collapsed) return false;
    try {
      if (!block.contains(range.startContainer)) return false;
      const blockEnd = document.createRange();
      blockEnd.selectNodeContents(block);
      blockEnd.collapse(false);
      const probe = document.createRange();
      probe.setStart(range.startContainer, range.startOffset);
      probe.setEnd(blockEnd.startContainer, blockEnd.startOffset);
      const text = probe.toString().replace(/\u200b/g, "").replace(/\ufeff/g, "");
      if (text.length > 0 && /[^\s\u00a0]/.test(text)) return false;
      const frag = probe.cloneContents();
      if (
        frag.querySelector(
          "img,table,hr,iframe,video,audio,object,embed,svg,canvas,button,input,textarea",
        )
      )
        return false;
      return true;
    } catch {
      return false;
    }
  }

  function hasMeaningfulContentAfterCoverInner(inner: HTMLElement): boolean {
    const cover = inner.closest(".page-web-cover");
    if (!cover?.parentNode) return false;
    let n: ChildNode | null = cover.nextSibling;
    while (n) {
      if (n.nodeType === Node.TEXT_NODE) {
        if ((n.textContent || "").replace(/\u200b/g, "").replace(/\u00a0/g, " ").trim().length) return true;
      } else if (n.nodeType === Node.ELEMENT_NODE) {
        const hel = n as HTMLElement;
        if (isIgnorableSpacerBeforeCover(hel)) {
          n = n.nextSibling;
          continue;
        }
        return true;
      }
      n = n.nextSibling;
    }
    return false;
  }

  /** Block Delete / forward-delete that would pull the next block into the cover inner. */
  function tryHandleWebCoverForwardBlock(ed: HTMLElement, range: Range): boolean {
    if (!range.collapsed) return false;
    const coverInner = (range.startContainer.nodeType === Node.TEXT_NODE
      ? range.startContainer.parentElement
      : (range.startContainer as Element)
    )?.closest?.(".page-web-cover-inner") as HTMLElement | null;
    if (!coverInner || !ed.contains(coverInner)) return false;
    if (!rangeCollapsedAtEditableBlockEnd(range, coverInner)) return false;
    return hasMeaningfulContentAfterCoverInner(coverInner);
  }

  function selectionTouchesLockedCoverInner(ed: HTMLElement, range: Range): boolean {
    const inner = (range.startContainer.nodeType === Node.TEXT_NODE
      ? range.startContainer.parentElement
      : (range.startContainer as Element)
    )?.closest?.(".page-web-cover-inner") as HTMLElement | null;
    if (!inner || !ed.contains(inner)) return false;
    if (inner.getAttribute("data-cover-unlocked") === "1") return false;
    return true;
  }

  /** Каретка на градиенте обложки / вне зоны текста — ввод запрещён (только .page-web-cover-inner). */
  function selectionIsOnCoverOutsideInner(ed: HTMLElement, range: Range): boolean {
    const cover = (range.startContainer.nodeType === Node.TEXT_NODE
      ? range.startContainer.parentElement
      : (range.startContainer as Element)
    )?.closest?.(".page-web-cover") as HTMLElement | null;
    if (!cover || !ed.contains(cover)) return false;
    const inner = cover.querySelector(".page-web-cover-inner");
    if (inner && inner.contains(range.startContainer)) return false;
    const toolbar = cover.querySelector(".page-web-cover-toolbar");
    if (toolbar && toolbar.contains(range.startContainer)) return false;
    return true;
  }

  function selectionInsideNonEditableWebShell(ed: HTMLElement, range: Range): boolean {
    let node: Node | null = range.commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) node = (node as Text).parentElement;
    const el = node instanceof Element ? node : null;
    const shell = el?.closest?.(".page-web-carousel");
    return !!(shell && ed.contains(shell));
  }

  /** Пока обложка не разблокирована кликом — не вставлять текст, не форматировать и т.д. */
  function tryPreventWebCoverNonDeleteInput(ed: HTMLElement, range: Range, inputType: string): boolean {
    if (inputType === "deleteContentBackward" || inputType === "deleteContentForward") return false;
    if (selectionInsideNonEditableWebShell(ed, range)) return true;
    if (selectionIsOnCoverOutsideInner(ed, range)) return true;
    return selectionTouchesLockedCoverInner(ed, range);
  }

  function normalizeWebCoverInnerEditability(root: HTMLElement) {
    root.querySelectorAll(".page-web-cover-inner").forEach((n) => {
      const h = n as HTMLElement;
      if (h.getAttribute("data-cover-unlocked") === "1") {
        h.setAttribute("contenteditable", "true");
      } else {
        h.setAttribute("contenteditable", "false");
      }
    });
  }

  /**
   * В contenteditable ссылка-кнопка ломает ввод (остаётся одна буква). В редакторе — span; при сохранении
   * span[data-href] снова становится <a> для публикации.
   */
  function normalizeWebCoverButtonAnchorsToSpans(root: HTMLElement): boolean {
    let changed = false;
    root.querySelectorAll("a.page-web-cover-el-button").forEach((node) => {
      const a = node as HTMLAnchorElement;
      const span = document.createElement("span");
      span.className = a.className;
      span.setAttribute("role", "button");
      const href = (a.getAttribute("href") || "").trim();
      if (href && href !== "#" && !href.toLowerCase().startsWith("javascript:")) {
        span.setAttribute("data-href", href);
      }
      while (a.firstChild) span.appendChild(a.firstChild);
      a.parentNode?.replaceChild(span, a);
      changed = true;
    });
    return changed;
  }

  /** Перед сохранением: реальная ссылка из data-href для публичной страницы. */
  function rewriteCoverButtonSpansToAnchorsForPublish(html: string): string {
    if (typeof document === "undefined") return html;
    try {
      const wrap = document.createElement("div");
      wrap.innerHTML = html;
      wrap.querySelectorAll("span.page-web-cover-el-button[data-href]").forEach((node) => {
        const span = node as HTMLSpanElement;
        const href = (span.getAttribute("data-href") || "").trim();
        if (!href) return;
        const a = document.createElement("a");
        a.className = span.className;
        a.setAttribute("href", href);
        while (span.firstChild) a.appendChild(span.firstChild);
        span.parentNode?.replaceChild(a, span);
      });
      return wrap.innerHTML;
    } catch {
      return html;
    }
  }

  function tryHandleWebCoverBackspace(ed: HTMLElement, range: Range): boolean {
    if (!range.collapsed) return false;

    const hostCover = (range.startContainer.nodeType === Node.TEXT_NODE
      ? range.startContainer.parentElement
      : (range.startContainer as Element)
    )?.closest?.(".page-web-cover") as HTMLElement | null;
    if (hostCover && ed.contains(hostCover)) {
      const innerEl = hostCover.querySelector(".page-web-cover-inner");
      const inInner = !!innerEl && (innerEl === range.startContainer || innerEl.contains(range.startContainer));
      if (!inInner) {
        const leakHost =
          range.startContainer.nodeType === Node.TEXT_NODE
            ? (range.startContainer.parentElement as HTMLElement | null)
            : (range.startContainer as HTMLElement);
        if (
          leakHost &&
          hostCover.contains(leakHost) &&
          (!innerEl || !innerEl.contains(leakHost)) &&
          rangeCollapsedAtEditableBlockStart(range, leakHost)
        ) {
          removeWebCoverBlock(hostCover);
          return true;
        }
      }
    }

    const coverInner = (range.startContainer.nodeType === Node.TEXT_NODE
      ? range.startContainer.parentElement
      : (range.startContainer as Element)
    )?.closest?.(".page-web-cover-inner") as HTMLElement | null;
    if (coverInner && ed.contains(coverInner)) {
      const cover = coverInner.closest(".page-web-cover") as HTMLElement | null;
      if (
        cover &&
        isCoverInnerEffectivelyEmpty(coverInner) &&
        rangeCollapsedAtEditableBlockStart(range, coverInner)
      ) {
        removeWebCoverBlock(cover);
        return true;
      }
    }

    let coverBefore = findPrecedingWebCoverFromCaret(ed, range);
    if (!coverBefore) {
      coverBefore = findDeepestWebCoverBeforePoint(ed, range.startContainer);
    }
    if (coverBefore && ed.contains(coverBefore) && rangeCollapsedImmediatelyAfterCover(range, coverBefore)) {
      removeWebCoverBlock(coverBefore);
      return true;
    }
    return false;
  }

  function isCoverInnerEffectivelyEmpty(inner: HTMLElement): boolean {
    const text = inner.innerText.replace(/\u200b/g, "").trim();
    if (text.length > 0) return false;
    for (const ch of Array.from(inner.childNodes)) {
      if (ch.nodeType === Node.TEXT_NODE && (ch.textContent || "").replace(/\u200b/g, "").trim()) return false;
      if (ch.nodeName === "BR") continue;
      if (ch.nodeType === Node.ELEMENT_NODE && (ch as HTMLElement).innerText.replace(/\u200b/g, "").trim()) return false;
    }
    return true;
  }

  function removeWebCoverBlock(cover: HTMLElement) {
    const el = editorRef.current;
    if (!el || !el.contains(cover)) return;
    const parent = cover.parentNode;
    const next = cover.nextSibling;
    cover.remove();
    setContentHtml(el.innerHTML);
    syncMarkerBold();
    const selection = window.getSelection();
    const r = document.createRange();
    if (next) {
      if (next.nodeType === Node.TEXT_NODE) {
        r.setStart(next, 0);
      } else if (next.nodeType === Node.ELEMENT_NODE) {
        r.selectNodeContents(next);
        r.collapse(true);
      } else {
        r.setStart(parent ?? el, 0);
        r.collapse(true);
      }
    } else {
      const pad = document.createElement("div");
      pad.innerHTML = "<br>";
      parent?.appendChild(pad);
      r.setStart(pad, 0);
      r.collapse(true);
    }
    r.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(r);
    savedRangeRef.current = r.cloneRange();
    el.focus();
    setTimeout(() => updateToolbarState(), 0);
  }

  function removeWebCarouselBlock(carousel: HTMLElement) {
    const el = editorRef.current;
    if (!el || !el.contains(carousel)) return;
    const parent = carousel.parentNode;
    const next = carousel.nextSibling;
    carousel.remove();
    setContentHtml(el.innerHTML);
    syncMarkerBold();
    const selection = window.getSelection();
    const r = document.createRange();
    if (next) {
      if (next.nodeType === Node.TEXT_NODE) {
        r.setStart(next, 0);
      } else if (next.nodeType === Node.ELEMENT_NODE) {
        r.selectNodeContents(next);
        r.collapse(true);
      } else {
        r.setStart(parent ?? el, 0);
        r.collapse(true);
      }
    } else {
      const pad = document.createElement("div");
      pad.innerHTML = "<br>";
      parent?.appendChild(pad);
      r.setStart(pad, 0);
      r.collapse(true);
    }
    r.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(r);
    savedRangeRef.current = r.cloneRange();
    el.focus();
    setTimeout(() => updateToolbarState(), 0);
  }

  function removeWebTimelineBlock(timeline: HTMLElement) {
    const el = editorRef.current;
    if (!el || !el.contains(timeline)) return;
    const parent = timeline.parentNode;
    const next = timeline.nextSibling;
    timeline.remove();
    setContentHtml(el.innerHTML);
    syncMarkerBold();
    const selection = window.getSelection();
    const r = document.createRange();
    if (next) {
      if (next.nodeType === Node.TEXT_NODE) {
        r.setStart(next, 0);
      } else if (next.nodeType === Node.ELEMENT_NODE) {
        r.selectNodeContents(next);
        r.collapse(true);
      } else {
        r.setStart(parent ?? el, 0);
        r.collapse(true);
      }
    } else {
      const pad = document.createElement("div");
      pad.innerHTML = "<br>";
      parent?.appendChild(pad);
      r.setStart(pad, 0);
      r.collapse(true);
    }
    r.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(r);
    savedRangeRef.current = r.cloneRange();
    el.focus();
    setTimeout(() => updateToolbarState(), 0);
  }

  function resetCarouselMenuDropdownStyles(toolbar: HTMLElement) {
    const dd = toolbar.querySelector(".page-web-carousel-menu-dropdown") as HTMLElement | null;
    if (!dd) return;
    dd.style.removeProperty("position");
    dd.style.removeProperty("left");
    dd.style.removeProperty("top");
    dd.style.removeProperty("right");
    dd.style.removeProperty("transform");
    dd.style.removeProperty("z-index");
    dd.style.removeProperty("min-width");
  }

  /** Меню ⋮ в слое fixed — иначе слайды/stacking перекрывают absolute-выпадашку. */
  function positionCarouselMenuDropdownFixed(toolbar: HTMLElement) {
    const dd = toolbar.querySelector(".page-web-carousel-menu-dropdown") as HTMLElement | null;
    const trig = toolbar.querySelector(".page-web-carousel-menu-trigger") as HTMLElement | null;
    if (!dd || !trig) return;
    const apply = () => {
      const r = trig.getBoundingClientRect();
      dd.style.position = "fixed";
      dd.style.left = `${r.left}px`;
      dd.style.top = `${r.bottom + 4}px`;
      dd.style.right = "auto";
      dd.style.transform = "none";
      dd.style.zIndex = "10000";
      dd.style.minWidth = "12rem";
    };
    requestAnimationFrame(() => {
      requestAnimationFrame(apply);
    });
  }

  function closeCarouselToolbarMenus(toolbar: HTMLElement) {
    toolbar.removeAttribute("data-menu-open");
    toolbar.querySelectorAll('.page-web-carousel-menu-sub[data-submenu-open="1"]').forEach((s) => {
      (s as HTMLElement).removeAttribute("data-submenu-open");
    });
    toolbar.querySelectorAll(".page-web-carousel-menu-sub-trigger").forEach((tr) => {
      (tr as HTMLElement).setAttribute("aria-expanded", "false");
    });
    resetCarouselMenuDropdownStyles(toolbar);
  }

  function closeTimelineToolbarMenus(toolbar: HTMLElement) {
    toolbar.removeAttribute("data-menu-open");
  }

  function getActiveCarouselSlide(carousel: HTMLElement): HTMLElement | null {
    const active = carousel.querySelector(".page-web-carousel-slide[data-carousel-active]") as HTMLElement | null;
    if (active) return active;
    return carousel.querySelector(".page-web-carousel-slide") as HTMLElement | null;
  }

  function buildCarouselPreviewSession(carousel: HTMLElement, preferredSlide?: HTMLElement | null): CarouselPreviewSessionState | null {
    const slides = Array.from(carousel.querySelectorAll(".page-web-carousel-slide")) as HTMLElement[];
    if (slides.length === 0) return null;
    const pref = preferredSlide && slides.includes(preferredSlide) ? preferredSlide : getActiveCarouselSlide(carousel);
    const idx = pref ? Math.max(0, slides.indexOf(pref)) : 0;
    const aspectRaw = carousel.getAttribute("data-carousel-aspect");
    const aspect: CarouselPreviewSessionState["aspect"] =
      aspectRaw === "vertical" || aspectRaw === "square" || aspectRaw === "a4"
        ? aspectRaw
        : "horizontal";
    return {
      aspect,
      index: idx,
      slides: slides.map((slide, i) => {
        const img = slide.querySelector(".page-web-carousel-img") as HTMLImageElement | null;
        const placeholder = slide.querySelector(".page-web-carousel-placeholder") as HTMLElement | null;
        const fallback = `Слайд ${i + 1}`;
        return {
          src: img?.getAttribute("src") || null,
          label: (placeholder?.textContent || "").trim() || fallback,
        };
      }),
    };
  }

  function ensureWebCarouselStripInViewport(viewport: HTMLElement): HTMLElement {
    let strip = viewport.querySelector(":scope > .page-web-carousel-strip") as HTMLElement | null;
    if (strip) return strip;
    strip = document.createElement("div");
    strip.className = "page-web-carousel-strip";
    for (const s of Array.from(viewport.querySelectorAll(":scope > .page-web-carousel-slide"))) {
      strip.appendChild(s);
    }
    viewport.appendChild(strip);
    return strip;
  }

  function insertWebPageElement(kind: string) {
    const html = getWebElementHtml(kind);
    if (!html) return;
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const range = savedRangeRef.current;
    if (range) {
      try {
        if (el.contains(range.commonAncestorContainer)) {
          const sel = window.getSelection();
          if (sel) {
            sel.removeAllRanges();
            sel.addRange(range);
          }
        }
      } catch {
        // ignore
      }
    }
    document.execCommand("insertHTML", false, html);
    setContentHtml(el.innerHTML);
    setWebElementsOpen(false);
    syncMarkerBold();
    setTimeout(updateToolbarState, 0);
  }

  function getCellsToApplyBorder(): HTMLTableCellElement[] {
    const el = editorRef.current;
    if (!el) return [];
    const selected = Array.from(el.querySelectorAll(".page-editor-table td[data-cell-selected]")) as HTMLTableCellElement[];
    if (selected.length > 0) return selected;
    const cell = selectedCellRef.current ?? (() => {
      const range = savedRangeRef.current;
      if (!range || !el.contains(range.commonAncestorContainer)) return null;
      const node = range.startContainer.nodeType === Node.TEXT_NODE ? range.startContainer.parentElement : range.startContainer;
      return (node as Element)?.closest?.("table.page-editor-table td") as HTMLTableCellElement | null;
    })();
    return cell ? [cell] : [];
  }

  function applyBorderToCell(cell: HTMLTableCellElement, style: string, color: string, width: string) {
    if (style === "none") {
      cell.style.border = "none";
      cell.setAttribute("data-cell-border", "none");
      cell.removeAttribute("data-cell-border-color");
      cell.removeAttribute("data-cell-border-width");
    } else {
      const w = style === "double" ? (width === "1" ? "3" : width) : width;
      cell.style.border = `${w}px ${style} ${color}`;
      cell.setAttribute("data-cell-border", style);
      cell.setAttribute("data-cell-border-color", color);
      cell.setAttribute("data-cell-border-width", width);
    }
  }

  function setTableBorder(value: string) {
    const el = editorRef.current;
    if (!el) return;
    const cells = getCellsToApplyBorder();
    if (cells.length === 0) return;
    cells.forEach((cell) => applyBorderToCell(cell, value, tableBorderColor, tableBorderWidth));
    setContentHtml(el.innerHTML);
    setTableBorderStyle(value);
    setTableBorderOpen(false);
  }

  function applyTableBorderColor(value: string) {
    const el = editorRef.current;
    if (!el) return;
    const cells = getCellsToApplyBorder();
    if (cells.length === 0) return;
    cells.forEach((cell) => applyBorderToCell(cell, tableBorderStyle, value, tableBorderWidth));
    setContentHtml(el.innerHTML);
    setTableBorderColor(value);
  }

  function applyTableBorderWidth(value: string) {
    const el = editorRef.current;
    if (!el) return;
    const cells = getCellsToApplyBorder();
    if (cells.length === 0) return;
    cells.forEach((cell) => applyBorderToCell(cell, tableBorderStyle, tableBorderColor, value));
    setContentHtml(el.innerHTML);
    setTableBorderWidth(value);
  }

  function getCurrentTable(): HTMLTableElement | null {
    const el = editorRef.current;
    const range = savedRangeRef.current;
    if (el && range && el.contains(range.commonAncestorContainer)) {
      const node =
        range.startContainer.nodeType === Node.TEXT_NODE
          ? range.startContainer.parentElement
          : range.startContainer;
      const t = (node as Element)?.closest?.("table.page-editor-table");
      if (t) return t as HTMLTableElement;
    }
    return selectedCellRef.current?.closest?.("table.page-editor-table") as HTMLTableElement | null;
  }

  function applyTableWidth(value: string) {
    const el = editorRef.current;
    if (!el) return;
    let selected = Array.from(el.querySelectorAll(".page-editor-table td[data-cell-selected]")) as HTMLTableCellElement[];
    if (selected.length === 0) {
      const currentCell =
        selectedCellRef.current ??
        getSelectedTableCell() ??
        (el.querySelector(".page-editor-table td") as HTMLTableCellElement | null);
      if (currentCell) {
        selected = [currentCell];
      }
    }
    if (selected.length === 0) return;
    const table = selected[0].closest("table.page-editor-table") as HTMLTableElement | null;
    const tbody = table?.querySelector("tbody");
    const rows = tbody?.querySelectorAll("tr");
    const colsToUpdate = new Set<number>();
    selected.forEach((cell) => {
      const pos = getCellPosition(cell);
      if (pos) colsToUpdate.add(pos.col);
    });
    const applyToCell = (cell: HTMLTableCellElement) => {
      if (value === "auto") {
        cell.removeAttribute("data-cell-width");
        cell.style.width = "";
        cell.style.minWidth = "";
        cell.style.maxWidth = "";
      } else {
        const pxValue = /^\d+$/.test(value) ? `${value}px` : value;
        cell.setAttribute("data-cell-width", pxValue);
        cell.style.width = pxValue;
        cell.style.minWidth = pxValue;
        cell.style.maxWidth = pxValue;
      }
    };
    if (value === "auto") {
      table?.querySelectorAll("td").forEach((td) => applyToCell(td as HTMLTableCellElement));
    } else if (table) {
      selected.forEach(applyToCell);
      const rowCount = rows?.length ?? 0;
      for (let r = 0; r < rowCount; r++) {
        for (const col of colsToUpdate) {
          const cell = getCellAtPosition(table, r, col);
          if (cell && !selected.includes(cell)) applyToCell(cell);
        }
      }
    }
    table && syncTableColgroup(table);
    setContentHtml(el.innerHTML);
    setTableWidth(value === "auto" ? "auto" : (/^\d+$/.test(value) ? `${value}px` : value));
    setCellMenuOpen(false);
  }

  function applyTableRowHeight(value: string) {
    const el = editorRef.current;
    if (!el) return;
    const selected = Array.from(el.querySelectorAll(".page-editor-table td[data-cell-selected]")) as HTMLTableCellElement[];
    if (selected.length === 0) return;
    selected.forEach((cell) => {
      if (value === "auto") {
        cell.removeAttribute("data-cell-height");
        const s = (cell.getAttribute("style") || "").replace(/\bheight:\s*[^;]*;?/g, "").trim();
        if (s) cell.setAttribute("style", s); else cell.removeAttribute("style");
      } else {
        cell.setAttribute("data-cell-height", value);
        const s = (cell.getAttribute("style") || "").replace(/\bheight:\s*[^;]*;?/g, "").trim();
        cell.setAttribute("style", (s ? s + " " : "") + `height: ${value};`);
      }
    });
    setContentHtml(el.innerHTML);
    setTableRowHeight(value);
    setCellMenuOpen(false);
  }

  /** Обложка: выравнивание контента относительно всего баннера (не ячейки таблицы внутри обложки). */
  function getWebCoverForContentLayout(el: HTMLElement, range: Range | null): HTMLElement | null {
    if (!range || !el.contains(range.commonAncestorContainer)) return null;
    let node: Node | null = range.commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) node = (node as Text).parentElement;
    if (!node || !(node instanceof Element)) return null;
    const inner = node.closest(".page-web-cover-inner") as HTMLElement | null;
    if (!inner || !el.contains(inner)) return null;
    if (inner.closest("table.page-editor-table")) return null;
    return inner.closest(".page-web-cover") as HTMLElement | null;
  }

  function getRangeForCoverLayout(el: HTMLElement): Range | null {
    const liveSelection = window.getSelection();
    const liveRange = liveSelection && liveSelection.rangeCount > 0 ? liveSelection.getRangeAt(0) : null;
    const commandRange = commandRangeRef.current;
    const savedRange = savedRangeRef.current;
    if (commandRange && el.contains(commandRange.commonAncestorContainer)) return commandRange.cloneRange();
    if (liveRange && el.contains(liveRange.commonAncestorContainer)) return liveRange.cloneRange();
    if (savedRange && el.contains(savedRange.commonAncestorContainer)) return savedRange.cloneRange();
    return null;
  }

  function applyCoverVerticalAlign(value: "top" | "middle" | "bottom") {
    const el = editorRef.current;
    if (!el) return;
    const range = getRangeForCoverLayout(el);
    const cover = getWebCoverForContentLayout(el, range);
    if (!cover) return;
    cover.setAttribute("data-cover-valign", value);
    setContentHtml(el.innerHTML);
    setCoverVerticalAlign(value);
    setTimeout(() => updateToolbarState(), 0);
  }

  function applyTableVerticalAlign(value: "top" | "middle" | "bottom") {
    const el = editorRef.current;
    if (!el) return;
    let selected = Array.from(el.querySelectorAll(".page-editor-table td[data-cell-selected]")) as HTMLTableCellElement[];
    if (selected.length === 0) {
      const currentCell =
        selectedCellRef.current ??
        getSelectedTableCell() ??
        (el.querySelector(".page-editor-table td") as HTMLTableCellElement | null);
      if (currentCell) selected = [currentCell];
    }
    if (selected.length === 0) return;
    selected.forEach((cell) => {
      cell.setAttribute("data-cell-valign", value);
      const s = (cell.getAttribute("style") || "").replace(/\bvertical-align:\s*[^;]*;?/g, "").trim();
      cell.setAttribute("style", (s ? s + " " : "") + `vertical-align: ${value};`);
    });
    setContentHtml(el.innerHTML);
    setTableVerticalAlign(value);
    setCellMenuOpen(false);
  }

  function applyTableHorizontalAlign(value: "left" | "center" | "right") {
    const el = editorRef.current;
    if (!el) return;
    let selected = Array.from(el.querySelectorAll(".page-editor-table td[data-cell-selected]")) as HTMLTableCellElement[];
    if (selected.length > 0) {
      const firstTable = selected[0].closest("table.page-editor-table");
      const sameTable = !!firstTable && selected.every((cell) => cell.closest("table.page-editor-table") === firstTable);
      if (firstTable && sameTable) {
        const totalCells = firstTable.querySelectorAll("tbody td").length;
        if (totalCells > 0 && selected.length === totalCells) {
          (firstTable as HTMLElement).setAttribute("data-table-align", value);
          setContentHtml(el.innerHTML);
          setAlignment(value);
          return;
        }
      }
    }
    if (selected.length === 0) {
      const currentCell =
        selectedCellRef.current ??
        getSelectedTableCell() ??
        (el.querySelector(".page-editor-table td") as HTMLTableCellElement | null);
      if (currentCell) selected = [currentCell];
    }
    if (selected.length === 0) return;
    selected.forEach((cell) => {
      cell.setAttribute("data-cell-align", value);
      const s = (cell.getAttribute("style") || "").replace(/\btext-align:\s*[^;]*;?/g, "").trim();
      cell.setAttribute("style", (s ? s + " " : "") + `text-align: ${value};`);
    });
    setContentHtml(el.innerHTML);
    setAlignment(value);
  }

  function applySelectedImageHorizontalAlign(value: "left" | "center" | "right"): boolean {
    const el = editorRef.current;
    const wrapper = selectedImageWrapperRef.current;
    if (!el || !wrapper || !el.contains(wrapper)) return false;
    const inTableCell = wrapper.closest("td");
    if (inTableCell) return false;
    wrapper.setAttribute("data-image-align", value);
    wrapper.style.display = "block";
    wrapper.style.width = "fit-content";
    wrapper.style.maxWidth = "100%";
    if (value === "center") {
      wrapper.style.marginLeft = "auto";
      wrapper.style.marginRight = "auto";
    } else if (value === "right") {
      wrapper.style.marginLeft = "auto";
      wrapper.style.marginRight = "0";
    } else {
      wrapper.style.marginLeft = "0";
      wrapper.style.marginRight = "auto";
    }
    setContentHtml(el.innerHTML);
    setAlignment(value);
    return true;
  }

  function getSelectedTableCell(): HTMLTableCellElement | null {
    const el = editorRef.current;
    const range = savedRangeRef.current;
    if (!el || !range || !el.contains(range.commonAncestorContainer)) return null;
    const node =
      range.startContainer.nodeType === Node.TEXT_NODE
        ? range.startContainer.parentElement
        : range.startContainer;
    return (node as Element)?.closest?.("table.page-editor-table td") as HTMLTableCellElement | null;
  }

  function tableCellAction(
    action: "insertRowAbove" | "insertRowBelow" | "insertColLeft" | "insertColRight" | "deleteRow" | "deleteCol"
  ) {
    const el = editorRef.current;
    if (!el) return;
    let cell = selectedCellRef.current ?? getSelectedTableCell();
    if (!cell || !el.contains(cell)) {
      cell = el.querySelector(".page-editor-table td[data-cell-selected]") as HTMLTableCellElement | null;
    }
    if (!cell) return;
    const table = cell.closest("table.page-editor-table") as HTMLTableElement | null;
    if (!table) return;
    const tbody = table.querySelector("tbody");
    if (!tbody) return;
    const rows = tbody.querySelectorAll("tr");
    const colCount = getTableColumnCount(table);
    const pos = getCellPosition(cell);
    const rowIndex = pos?.row ?? Array.from(rows).findIndex((tr) => tr.contains(cell));
    const gridCol = pos?.col ?? 0;
    if (rowIndex < 0) return;

    const rowCount = selectedCellRange.rows;
    const colCountSel = selectedCellRange.cols;

    if (action === "insertRowAbove") {
      for (let i = 0; i < rowCount; i++) {
        const newRow = document.createElement("tr");
        for (let j = 0; j < colCount; j++) {
          const td = document.createElement("td");
          td.setAttribute("contenteditable", "false");
          td.innerHTML = "<br>";
          newRow.appendChild(td);
        }
        tbody.insertBefore(newRow, rows[rowIndex]);
      }
    } else if (action === "insertRowBelow") {
      let insertBefore = rows[rowIndex + rowCount - 1]?.nextSibling ?? null;
      for (let i = 0; i < rowCount; i++) {
        const newRow = document.createElement("tr");
        for (let j = 0; j < colCount; j++) {
          const td = document.createElement("td");
          td.setAttribute("contenteditable", "false");
          td.innerHTML = "<br>";
          newRow.appendChild(td);
        }
        tbody.insertBefore(newRow, insertBefore);
        insertBefore = newRow.nextSibling;
      }
    } else if (action === "insertColLeft") {
      for (let k = 0; k < colCountSel; k++) {
        for (let r = 0; r < rows.length; r++) {
          const td = document.createElement("td");
          td.setAttribute("contenteditable", "false");
          td.innerHTML = "<br>";
          const insertBeforeCell = getCellAtPosition(table, r, gridCol);
          const tr = rows[r];
          if (insertBeforeCell) {
            tr.insertBefore(td, insertBeforeCell);
          } else {
            tr.appendChild(td);
          }
        }
      }
    } else if (action === "insertColRight") {
      for (let k = 0; k < colCountSel; k++) {
        for (let r = 0; r < rows.length; r++) {
          const td = document.createElement("td");
          td.setAttribute("contenteditable", "false");
          td.innerHTML = "<br>";
          const insertBeforeCell = getCellAtPosition(table, r, gridCol + colCountSel + k);
          const tr = rows[r];
          if (insertBeforeCell) {
            tr.insertBefore(td, insertBeforeCell);
          } else {
            tr.appendChild(td);
          }
        }
      }
    } else if (action === "deleteRow") {
      if (rows.length <= rowCount) return;
      for (let i = 0; i < rowCount; i++) {
        rows[rowIndex]?.remove();
      }
    } else if (action === "deleteCol") {
      if (colCount <= colCountSel) return;
      for (let k = 0; k < colCountSel; k++) {
        for (let r = 0; r < rows.length; r++) {
          const cellToRemove = getCellAtPosition(table, r, gridCol);
          cellToRemove?.remove();
        }
      }
    }
    el.querySelectorAll(".page-editor-table").forEach((t) => syncTableColgroup(t as HTMLTableElement));
    setContentHtml(el.innerHTML);
    normalizeTableCells();
    setCellMenuOpen(false);
    setTimeout(() => {
      highlightSelectedTableCells();
      updateToolbarState();
    }, 0);
  }

function getFirstCharacterStyle(container: HTMLElement): { fontSize: string; lineHeight: string; color: string } {
    const range = document.createRange();
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
    let textNode: Text | null = walker.nextNode() as Text | null;
    while (textNode) {
      if (textNode.textContent && textNode.textContent.trim().length > 0) {
        range.setStart(textNode, 0);
        range.setEnd(textNode, 1);
        const parent = range.startContainer.parentElement;
        if (parent) {
          const style = getComputedStyle(parent);
          return { fontSize: style.fontSize, lineHeight: style.lineHeight, color: style.color };
        }
      }
      textNode = walker.nextNode() as Text | null;
    }
    const style = getComputedStyle(container);
  return { fontSize: style.fontSize, lineHeight: style.lineHeight, color: style.color };
  }

  function syncMarkerBold() {
    const el = editorRef.current;
    if (!el) return;
    el.querySelectorAll("ol li, ul li").forEach((li) => {
      const liEl = li as HTMLElement;
      const hasBold = (li as Element).querySelector("b, strong") !== null;
      if (hasBold) liEl.setAttribute("data-marker-bold", "true");
      else liEl.removeAttribute("data-marker-bold");
      const { fontSize, lineHeight, color } = getFirstCharacterStyle(liEl);
      liEl.style.setProperty("--marker-font-size", fontSize);
      liEl.style.setProperty("--marker-line-height", lineHeight);
      liEl.style.setProperty("--marker-color", color);
    });
  }

  function saveSelectionFromEditor() {
    const el = editorRef.current;
    const sel = window.getSelection();
    if (!el || !sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    try {
      if (el.contains(range.commonAncestorContainer)) {
        const snapshot = range.cloneRange();
        savedRangeRef.current = snapshot;
        commandRangeRef.current = snapshot.cloneRange();
      }
    } catch {
      // ignore and keep previous valid snapshot
    }
  }

  const LIST_NUMBER_PATTERN = /^(\s*\d+\.\s+|\s*\d+\)\s*|\s*[aA]\.\s*|\s*[iI]+\.\s*)/;

  function stripLeadingNumberFromLi(li: Element): boolean {
    const walker = document.createTreeWalker(li, NodeFilter.SHOW_TEXT, null);
    let textNode: Text | null = walker.nextNode() as Text | null;
    while (textNode) {
      const text = textNode.textContent ?? "";
      const match = text.match(LIST_NUMBER_PATTERN);
      if (match) {
        const stripped = text.slice(match[0].length);
        if (stripped !== text) {
          textNode.textContent = stripped;
          return true;
        }
      }
      textNode = walker.nextNode() as Text | null;
    }
    return false;
  }

  function normalizeListContent() {
    const el = editorRef.current;
    if (!el) return;
    el.querySelectorAll("ol li, ul li").forEach((li) => stripLeadingNumberFromLi(li));
  }

  function normalizeImages() {
    const el = editorRef.current;
    if (!el) return;
    el.querySelectorAll(".page-editor-image-wrapper").forEach((wrapper) => {
      const handles = wrapper.querySelectorAll(".page-editor-image-resize");
      if (handles.length >= 8) return;
      handles.forEach((h) => h.remove());
      ["n", "s", "e", "w", "ne", "nw", "se", "sw"].forEach((h) => {
        const handle = document.createElement("span");
        handle.className = `page-editor-image-resize page-editor-image-resize-${h}`;
        handle.setAttribute("data-resize", h);
        handle.setAttribute("aria-label", "Изменить размер");
        wrapper.appendChild(handle);
      });
    });
    el.querySelectorAll("img:not(.page-editor-image)").forEach((img) => {
      const htmlImg = img as HTMLImageElement;
      if (htmlImg.closest(".page-editor-image-wrapper")) return;
      // Карусель: свои классы и object-fit; обёртка редактора ломает слайд (на секунду фото, потом «пустой» блок).
      if (htmlImg.classList.contains("page-web-carousel-img") || htmlImg.closest(".page-web-carousel-slide-inner")) {
        return;
      }
      const wrapper = document.createElement("span");
      wrapper.className = "page-editor-image-wrapper";
      wrapper.setAttribute("contenteditable", "false");
      const handles = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];
      htmlImg.classList.add("page-editor-image");
      if (!htmlImg.style.width) htmlImg.style.width = "300px";
      if (!htmlImg.style.height) htmlImg.style.height = "auto";
      htmlImg.style.display = "block";
      htmlImg.parentNode?.insertBefore(wrapper, htmlImg);
      wrapper.appendChild(htmlImg);
      handles.forEach((h) => {
        const handle = document.createElement("span");
        handle.className = `page-editor-image-resize page-editor-image-resize-${h}`;
        handle.setAttribute("data-resize", h);
        handle.setAttribute("aria-label", "Изменить размер");
        wrapper.appendChild(handle);
      });
    });
  }

  function normalizeTableCells() {
    const el = editorRef.current;
    if (!el) return;
    el.querySelectorAll(".page-editor-table td").forEach((td) => {
      const cell = td as HTMLElement;
      if (!cell.hasAttribute("data-cell-editing")) {
        cell.setAttribute("contenteditable", "false");
      }
    });
  }

  function formatOlMarker(n: number, styleType: string): string {
    if (styleType === "lower-alpha") return String.fromCharCode(96 + Math.min(26, Math.max(1, n))) + ".";
    if (styleType === "upper-alpha") return String.fromCharCode(64 + Math.min(26, Math.max(1, n))) + ".";
    if (styleType === "lower-roman") return toRoman(n).toLowerCase() + ".";
    if (styleType === "upper-roman") return toRoman(n) + ".";
    return n + ".";
  }

  function toRoman(n: number): string {
    const v = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
    const s = ["M", "CM", "D", "CD", "C", "XC", "L", "XL", "X", "IX", "V", "IV", "I"];
    let r = "";
    for (let i = 0; i < v.length; i++) {
      while (n >= v[i]) {
        r += s[i];
        n -= v[i];
      }
    }
    return r;
  }

  /** Same style + color → treat adjacent top-level <ol> as one numbered sequence (Word often emits many <ol>). */
  function olContinuationSignature(ol: HTMLElement): string {
    const st = ol.style?.listStyleType || "decimal";
    const c = ol.getAttribute("data-list-color") || "black";
    return `${st}|${c}`;
  }

  /**
   * Пересчитывает <ol start> сверху вниз: вставка нового списка между другими сдвигает номера у всех
   * последующих. Старые start из HTML не сохраняем (кроме якоря data-list-restart из диалога).
   *
   * - Соседние <ol> с тем же стилем/цветом — одна цепочка.
   * - Строки вида "5. текст" в div/p поднимают счётчик.
   * - data-list-restart: явное начало (диалог); глобальный хвост документа не уменьшаем — следующий
   *   авто-список после такого блока продолжает с max(было, конец блока)+1.
   */
  function normalizeTopLevelOlStartContinuation() {
    const el = editorRef.current;
    if (!el) return;
    let running = 0;
    let chainEnd = 0;
    let chainSig: string | null = null;

    const bumpRunningFromPlainBlock = (block: Element) => {
      const segments = getLineSegmentsFromBlock(block);
      for (const seg of segments) {
        const lineN = getLeadingNumberFromLineNodes(seg.nodes);
        if (typeof lineN === "number" && Number.isFinite(lineN)) {
          running = Math.max(running, lineN);
        }
      }
    };

    for (const child of Array.from(el.children)) {
      if (child.tagName === "OL") {
        const ol = child as HTMLElement;
        const lis = ol.querySelectorAll(":scope > li");
        const n = lis.length;
        if (n === 0) continue;

        const sig = olContinuationSignature(ol);
        const userRestart = ol.getAttribute("data-list-restart") === "1";

        if (chainEnd > 0 && chainSig === sig) {
          const nextStart = chainEnd + 1;
          ol.setAttribute("start", String(nextStart));
          chainEnd = nextStart + n - 1;
          running = chainEnd;
        } else {
          chainSig = sig;
          if (userRestart) {
            const base = Math.max(1, parseInt(ol.getAttribute("start") || "1", 10) || 1);
            ol.setAttribute("start", String(base));
            chainEnd = base + n - 1;
            running = Math.max(running, chainEnd);
          } else {
            const nextStart = running + 1;
            ol.setAttribute("start", String(nextStart));
            chainEnd = nextStart + n - 1;
            running = chainEnd;
          }
        }
      } else if (child.tagName === "DIV" || child.tagName === "P") {
        chainEnd = 0;
        chainSig = null;
        bumpRunningFromPlainBlock(child);
      } else {
        chainEnd = 0;
        chainSig = null;
      }
    }
  }

  function normalizeOlStartNumbers() {
    const el = editorRef.current;
    if (!el) return;
    normalizeTopLevelOlStartContinuation();
    const allOl = Array.from(el.querySelectorAll("ol"));
    for (const list of allOl) {
      const lis = (list as Element).querySelectorAll(":scope > li");
      const rawStart = parseInt((list as HTMLElement).getAttribute("start") || "1", 10);
      const start = Number.isFinite(rawStart) && rawStart > 0 ? rawStart : 1;
      const styleType = (list as HTMLElement).style?.listStyleType || "decimal";
      lis.forEach((li, i) => {
        (li as HTMLElement).setAttribute("data-list-num", formatOlMarker(start + i, styleType));
      });
    }
  }

  function getLineSegmentsFromBlock(block: Element): { start: number; end: number; nodes: Node[] }[] {
    const childNodes = Array.from(block.childNodes);
    const segments: { start: number; end: number; nodes: Node[] }[] = [];
    let segStart = 0;
    for (let i = 0; i <= childNodes.length; i++) {
      if (i === childNodes.length || childNodes[i].nodeName === "BR") {
        segments.push({ start: segStart, end: i, nodes: childNodes.slice(segStart, i) });
        segStart = i + 1;
      }
    }
    return segments;
  }

  function getLeadingNumberFromLineNodes(lineNodes: Node[]): number | null {
    const firstContentNode = lineNodes.find((n) => {
      if (n.nodeName === "BR") return false;
      if (n.nodeType === Node.TEXT_NODE) return (n.textContent || "").length > 0;
      return true;
    });
    if (!firstContentNode) return null;
    const readText = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) return (node.textContent || "");
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      const textNode = walker.nextNode() as Text | null;
      return textNode?.data || "";
    };
    const value = readText(firstContentNode);
    const match = value.match(/^\s*(\d+)\.\s+/);
    return match ? parseInt(match[1], 10) : null;
  }

  function getNextOrderedListStart(referenceNode: Node, referenceLineStartIdx?: number): number {
    const el = editorRef.current;
    if (!el) return 1;
    let referenceBlock: Node | null = referenceNode;
    while (
      referenceBlock &&
      referenceBlock !== el &&
      (referenceBlock as Element).parentElement !== el
    ) {
      referenceBlock = (referenceBlock as Element).parentElement;
    }
    const topBlocks = Array.from(el.children);
    let running = 0;
    let chainEnd = 0;
    let chainSig: string | null = null;

    for (const block of topBlocks) {
      if (block.tagName === "OL") {
        const ol = block as HTMLElement;
        const itemsCount = ol.querySelectorAll(":scope > li").length;
        if (itemsCount > 0) {
          const sig = olContinuationSignature(ol);
          const userRestart = ol.getAttribute("data-list-restart") === "1";

          if (chainEnd > 0 && chainSig === sig) {
            const nextStart = chainEnd + 1;
            chainEnd = nextStart + itemsCount - 1;
            running = chainEnd;
          } else {
            chainSig = sig;
            if (userRestart) {
              const base = Math.max(1, parseInt(ol.getAttribute("start") || "1", 10) || 1);
              chainEnd = base + itemsCount - 1;
              running = Math.max(running, chainEnd);
            } else {
              const nextStart = running + 1;
              chainEnd = nextStart + itemsCount - 1;
              running = chainEnd;
            }
          }
        }
      } else if (block.tagName === "DIV" || block.tagName === "P") {
        chainEnd = 0;
        chainSig = null;
        const segments = getLineSegmentsFromBlock(block);
        for (const seg of segments) {
          if (
            block === referenceBlock &&
            typeof referenceLineStartIdx === "number" &&
            seg.start >= referenceLineStartIdx
          ) {
            break;
          }
          const n = getLeadingNumberFromLineNodes(seg.nodes);
          if (typeof n === "number" && Number.isFinite(n)) {
            running = Math.max(running, n);
          }
        }
      } else {
        chainEnd = 0;
        chainSig = null;
      }

      if (block === referenceBlock) {
        break;
      }
    }

    return Math.max(1, running + 1);
  }

  function stripLeadingNumericPrefixInLine(lineNodes: Node[]) {
    const firstContentNode = lineNodes.find((n) => {
      if (n.nodeName === "BR") return false;
      if (n.nodeType === Node.TEXT_NODE) return (n.textContent || "").length > 0;
      return true;
    });
    if (!firstContentNode) return;
    const stripPrefix = (value: string) => value.replace(/^\s*\d+\.\s+/, "");
    if (firstContentNode.nodeType === Node.TEXT_NODE) {
      (firstContentNode as Text).data = stripPrefix((firstContentNode as Text).data);
      return;
    }
    const walker = document.createTreeWalker(firstContentNode, NodeFilter.SHOW_TEXT);
    const textNode = walker.nextNode() as Text | null;
    if (textNode) {
      textNode.data = stripPrefix(textNode.data);
    }
  }

  function splitMultiLineListItems() {
    const el = editorRef.current;
    if (!el) return;
    el.querySelectorAll("ol li, ul li").forEach((li) => {
      const brs = Array.from(li.querySelectorAll("br"));
      if (brs.length === 0) return;
      const list = li.closest("ol, ul");
      if (!list) return;
      const segments: Node[][] = [];
      let current: Node[] = [];
      for (const child of Array.from(li.childNodes)) {
        if (child.nodeName === "BR") {
          if (current.length > 0) segments.push(current);
          current = [];
        } else {
          current.push(child);
        }
      }
      if (current.length > 0) segments.push(current);
      if (segments.length <= 1) return;
      const firstLi = li as HTMLElement;
      while (firstLi.firstChild) firstLi.removeChild(firstLi.firstChild);
      segments[0].forEach((n) => firstLi.appendChild(n));
      if (firstLi.childNodes.length === 0) firstLi.appendChild(document.createElement("br"));
      let insertBefore: Node | null = firstLi.nextSibling;
      for (let i = 1; i < segments.length; i++) {
        const newLi = document.createElement("li");
        segments[i].forEach((n) => newLi.appendChild(n));
        if (newLi.childNodes.length === 0) newLi.appendChild(document.createElement("br"));
        list.insertBefore(newLi, insertBefore);
        insertBefore = newLi.nextSibling;
      }
    });
  }

  function getLineContainingSelection(block: Element, range: Range): { nodes: Node[]; startIdx: number; endIdx: number } {
    const startNode = range.startContainer;
    const childNodes = Array.from(block.childNodes);
    const segments: { start: number; end: number }[] = [];
    let segStart = 0;
    for (let i = 0; i <= childNodes.length; i++) {
      if (i === childNodes.length || childNodes[i].nodeName === "BR") {
        segments.push({ start: segStart, end: i });
        segStart = i + 1;
      }
    }

    // Cursor can be positioned directly on block (offset between child nodes),
    // for example right after <br>. In this case map offset to the exact segment.
    if (startNode === block) {
      const rawOffset = range.startOffset;
      let offset = Math.max(0, Math.min(childNodes.length, rawOffset));
      // In contenteditable, caret at the visual start of the next line may point to the <br> node.
      // Bias to the following segment so numbering applies to the clicked line, not the previous one.
      if (offset < childNodes.length && childNodes[offset]?.nodeName === "BR") {
        offset += 1;
      }
      for (const seg of segments) {
        if (offset >= seg.start && offset <= seg.end) {
          return { nodes: childNodes, startIdx: seg.start, endIdx: seg.end };
        }
      }
      const last = segments[segments.length - 1];
      if (last) return { nodes: childNodes, startIdx: last.start, endIdx: last.end };
    }

    for (const seg of segments) {
      for (let j = seg.start; j < seg.end; j++) {
        const n = childNodes[j];
        if (n === startNode || (n.nodeType === Node.ELEMENT_NODE && (n as Element).contains(startNode))) {
          return { nodes: childNodes, startIdx: seg.start, endIdx: seg.end };
        }
      }
    }
    return { nodes: childNodes, startIdx: 0, endIdx: childNodes.length };
  }

  function getBlockAtSelection(): Element | null {
    const el = editorRef.current;
    const range = savedRangeRef.current;
    if (!el || !range || !el.contains(range.commonAncestorContainer)) return null;
    let node: Node | null = range.startContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    while (node && node !== el) {
      if (node.parentElement === el) return node as Element;
      node = node.parentElement;
    }
    return null;
  }

  function getTopLevelBlockFromRange(range: Range): Element | null {
    const el = editorRef.current;
    if (!el || !el.contains(range.commonAncestorContainer)) return null;

    let node: Node | null = range.startContainer;
    if (node === el) {
      const child = el.childNodes[range.startOffset] ?? el.childNodes[Math.max(0, range.startOffset - 1)] ?? null;
      node = child;
    }
    if (!node) return null;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;

    while (node && node !== el) {
      if ((node as Element).parentElement === el) return node as Element;
      node = (node as Element).parentElement;
    }
    return null;
  }

  function normalizeRawNewlinesToBr(block: Element) {
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    let current = walker.nextNode() as Text | null;
    while (current) {
      if ((current.data || "").includes("\n")) textNodes.push(current);
      current = walker.nextNode() as Text | null;
    }
    textNodes.forEach((textNode) => {
      const value = textNode.data;
      if (!value.includes("\n")) return;
      const parts = value.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
      const frag = document.createDocumentFragment();
      parts.forEach((part, idx) => {
        if (part.length > 0) frag.appendChild(document.createTextNode(part));
        if (idx < parts.length - 1) frag.appendChild(document.createElement("br"));
      });
      textNode.parentNode?.replaceChild(frag, textNode);
    });
  }

  function runCommand(command: string, value?: string) {
    const el = editorRef.current;
    if (!el) return;

    el.focus();

    const liveSelection = window.getSelection();
    const liveRange =
      liveSelection && liveSelection.rangeCount > 0 ? liveSelection.getRangeAt(0) : null;
    const commandRange = commandRangeRef.current;
    const savedRange = savedRangeRef.current;
    const effectiveRange =
      commandRange && el.contains(commandRange.commonAncestorContainer)
        ? commandRange.cloneRange()
        : liveRange && el.contains(liveRange.commonAncestorContainer)
          ? liveRange.cloneRange()
          : savedRange && el.contains(savedRange.commonAncestorContainer)
            ? savedRange.cloneRange()
            : null;

    if (effectiveRange) {
      try {
        const sel = window.getSelection();
        if (sel) {
          sel.removeAllRanges();
          sel.addRange(effectiveRange);
        }
      } catch {
        // ignore
      }
      savedRangeRef.current = effectiveRange.cloneRange();
    }
    const range = effectiveRange;

    if (command === "justifyLeft" || command === "justifyCenter" || command === "justifyRight") {
      const align = command === "justifyLeft" ? "left" : command === "justifyCenter" ? "center" : "right";
      if (applySelectedImageHorizontalAlign(align)) {
        updateToolbarState();
        return;
      }
      const inTableSelection = !!(
        selectedCellRef.current ||
        getSelectedTableCell() ||
        el.querySelector(".page-editor-table td[data-cell-selected]")
      );
      if (inTableSelection) {
        applyTableHorizontalAlign(align);
        updateToolbarState();
        return;
      }
      const cover = getWebCoverForContentLayout(el, range ?? null);
      if (cover) {
        cover.setAttribute("data-cover-halign", align);
        setContentHtml(el.innerHTML);
        updateToolbarState();
        return;
      }
    }

    if (command === "insertUnorderedList" || command === "insertOrderedList") {
      const listRange =
        commandRange && el.contains(commandRange.commonAncestorContainer)
          ? commandRange.cloneRange()
          : liveRange && el.contains(liveRange.commonAncestorContainer)
            ? liveRange.cloneRange()
            : savedRange && el.contains(savedRange.commonAncestorContainer)
              ? savedRange.cloneRange()
            : null;
      if (!listRange) return;
      commandRangeRef.current = null;
      const block = getTopLevelBlockFromRange(listRange);
      const tag = command === "insertOrderedList" ? "OL" : "UL";
      const li = block?.closest?.("li");
      const list = li?.closest?.("ol, ul");
      if (list && list.tagName === tag) {
        const fragment = document.createDocumentFragment();
        Array.from(list.children).forEach((item) => {
          const div = document.createElement("div");
          while (item.firstChild) div.appendChild(item.firstChild);
          if (div.childNodes.length === 0) div.appendChild(document.createElement("br"));
          fragment.appendChild(div);
        });
        list.parentNode?.replaceChild(fragment, list);
      } else if (block && block.tagName !== "LI" && (block.tagName === "DIV" || block.tagName === "P")) {
        normalizeRawNewlinesToBr(block);
        const newLi = document.createElement("li");
        const hasMultipleLines = block.querySelector("br") !== null;
        let selectedLineNodes: Node[] | null = null;
        let selectedLineStartIdx: number | null = null;
        let beforeLineNodes: Node[] | null = null;
        let afterLineNodes: Node[] | null = null;
        if (hasMultipleLines) {
          const { nodes, startIdx, endIdx } = getLineContainingSelection(block, listRange);
          selectedLineStartIdx = startIdx;
          beforeLineNodes = nodes.slice(0, startIdx);
          selectedLineNodes = nodes.slice(startIdx, endIdx);
          afterLineNodes = nodes.slice(endIdx);
          if (tag === "OL" && selectedLineNodes) {
            stripLeadingNumericPrefixInLine(selectedLineNodes);
          }
          selectedLineNodes.forEach((n) => newLi.appendChild(n));
        } else {
          if (tag === "OL") {
            const lineNodes = Array.from(block.childNodes);
            stripLeadingNumericPrefixInLine(lineNodes);
          }
          while (block.firstChild) newLi.appendChild(block.firstChild);
        }
        if (newLi.childNodes.length === 0) {
          newLi.appendChild(document.createElement("br"));
        }

        const newList = document.createElement(tag.toLowerCase());
        newList.setAttribute("data-list-color", "black");
        if (tag === "OL") {
          const nextStart = getNextOrderedListStart(block, selectedLineStartIdx ?? undefined);
          newList.setAttribute("start", String(nextStart));
        }
        newList.appendChild(newLi);

        let prevList: Element | null = null;
        let nextList: Element | null = null;
        const lists = el.querySelectorAll(tag);
        for (let i = 0; i < lists.length; i++) {
          const listEl = lists[i];
          const pos = block.compareDocumentPosition(listEl);
          if (pos & Node.DOCUMENT_POSITION_PRECEDING) prevList = listEl;
          else if (pos & Node.DOCUMENT_POSITION_FOLLOWING && !nextList) nextList = listEl;
        }
        const targetList = prevList ?? nextList;
        if (targetList) {
          if (prevList) {
            prevList.appendChild(newLi);
            if (nextList) {
              while (nextList.firstChild) prevList.appendChild(nextList.firstChild);
              nextList.remove();
            }
          } else {
            (nextList as Element).insertBefore(newLi, (nextList as Element).firstChild);
          }
          if (!hasMultipleLines || block.childNodes.length === 0) {
            block.remove();
          } else if (hasMultipleLines && block.firstChild?.nodeName === "BR") {
            block.firstChild.remove();
          }
          const sel = window.getSelection();
          if (sel) {
            const r = document.createRange();
            r.selectNodeContents(newLi);
            r.collapse(false);
            sel.removeAllRanges();
            sel.addRange(r);
          }
        } else {
          if (block.childNodes.length === 0) {
            block.parentNode?.replaceChild(newList, block);
          } else {
            if (hasMultipleLines && block.firstChild?.nodeName === "BR") block.firstChild.remove();
            block.parentNode?.insertBefore(newList, block);
          }
        }
      } else {
    document.execCommand(command, false, value);
      }
    } else {
      document.execCommand(command, false, value);
    }

    if (command === "insertUnorderedList" || command === "insertOrderedList") {
      const removeTrailingEmpty = () => {
        const lists = el.querySelectorAll("ol, ul");
        lists.forEach((list) => {
          const next = list.nextSibling;
          if (
            next &&
            next.nodeType === Node.ELEMENT_NODE &&
            (next as Element).tagName === "DIV" &&
            (next as HTMLElement).childNodes.length === 1 &&
            (next as HTMLElement).firstChild?.nodeName === "BR"
          ) {
            next.remove();
          }
        });
        while (el.children.length > 1) {
          const last = el.children[el.children.length - 1];
          const prev = el.children[el.children.length - 2];
          if (
            last.tagName === "DIV" &&
            (last.childNodes.length === 0 || (last.childNodes.length === 1 && last.firstChild?.nodeName === "BR")) &&
            (prev?.tagName === "OL" || prev?.tagName === "UL")
          ) {
            last.remove();
          } else {
            break;
          }
        }
      };
      removeTrailingEmpty();
      el.querySelectorAll("ol, ul").forEach((list) => {
        if (!(list as HTMLElement).hasAttribute("data-list-color")) {
          (list as HTMLElement).setAttribute("data-list-color", "black");
        }
      });
      splitMultiLineListItems();
      normalizeListContent();
      normalizeOlStartNumbers();
    }
    setContentHtml(el.innerHTML);
    syncMarkerBold();
    setTimeout(() => {
      const markerNodes = Array.from(el.querySelectorAll("[data-exit-cursor]"));
      const target = markerNodes.length > 0 ? markerNodes[markerNodes.length - 1] : null;
      if (target) {
        markerNodes.forEach((node) => node.removeAttribute("data-exit-cursor"));
        const sel = window.getSelection();
        if (sel) {
          const r = document.createRange();
          r.selectNodeContents(target);
          r.collapse(false);
          sel.removeAllRanges();
          sel.addRange(r);
        }
        target.scrollIntoView({ block: "nearest" });
        el.focus();
      }
      updateToolbarState();
    }, 0);
  }

  function isListItemEmpty(li: Element): boolean {
    const text = (li as HTMLElement).innerText?.trim() ?? "";
    return text.length === 0;
  }

  function exitListAtEmptyLi(li: Element): void {
    const el = editorRef.current;
    if (!el) return;
    const list = li.closest("ol, ul");
    if (!list) return;
    const newDiv = document.createElement("div");
    newDiv.appendChild(document.createElement("br"));
    newDiv.setAttribute("data-exit-cursor", "1");
    if (list.children.length === 1) {
      list.parentNode?.replaceChild(newDiv, list);
    } else {
      const idx = Array.from(list.children).indexOf(li);
      const itemsAfter = Array.from(list.children).slice(idx + 1);
      li.remove();
      if (idx === 0) {
        list.parentNode?.insertBefore(newDiv, list);
      } else if (itemsAfter.length > 0) {
        const newList = document.createElement(list.tagName.toLowerCase());
        const parentList = list as HTMLElement;
        const rawStart = parseInt(parentList.getAttribute("start") || "1", 10);
        const S = Number.isFinite(rawStart) && rawStart > 0 ? rawStart : 1;
        parentList.getAttributeNames().forEach((name) => {
          if (name.toLowerCase() === "start") return;
          newList.setAttribute(name, parentList.getAttribute(name) ?? "");
        });
        // Tail list must continue numbering: item that was at (idx+1) had value S+idx+1.
        if (newList.tagName === "OL") {
          newList.setAttribute("start", String(S + idx + 1));
        }
        itemsAfter.forEach((item) => newList.appendChild(item));
        list.parentNode?.insertBefore(newDiv, list.nextSibling);
        list.parentNode?.insertBefore(newList, newDiv.nextSibling);
      } else {
        list.parentNode?.insertBefore(newDiv, list.nextSibling);
      }
    }
    setContentHtml(el.innerHTML);
    syncMarkerBold();
    setTimeout(() => {
      const target = el.querySelector("[data-exit-cursor]");
      if (target) {
        target.removeAttribute("data-exit-cursor");
        const sel = window.getSelection();
        if (sel) {
          const range = document.createRange();
          range.setStart(target, 0);
          range.setEnd(target, 0);
          sel.removeAllRanges();
          sel.addRange(range);
        }
        el.focus();
      }
      updateToolbarState();
    }, 0);
  }

  function showCellMenuForCell(cell: HTMLTableCellElement) {
    const rect = cell.getBoundingClientRect();
    const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 600;
    const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 800;
    const spaceBelow = typeof window !== "undefined" ? window.innerHeight - rect.bottom : 300;
    setCellMenuViewport({
      top: rect.top + rect.height / 2 - 14,
      left: Math.max(8, Math.min(rect.left - 32, viewportWidth - 40)),
      topBtn: {
        top: Math.max(8, Math.min(rect.top - 28, viewportHeight - 40)),
        left: rect.left + rect.width / 2 - 14,
      },
      openUp: spaceBelow < 280,
      selectionBadge: { top: rect.top, right: rect.right },
    });
  }

  function handleTableCellMouseDown(e: React.MouseEvent) {
    const target = (e.target as HTMLElement).closest?.("table.page-editor-table td");
    if (!target) return;
    const cell = target as HTMLTableCellElement;
    if (cell.getAttribute("contenteditable") === "true") return;
    const table = cell.closest("table.page-editor-table") as HTMLTableElement | null;
    if (!table) return;
    setCellMenuOpen(false);
    cellDragStartRef.current = { cell, table };
    const range = document.createRange();
    range.setStart(cell, 0);
    range.collapse(true);
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
      savedRangeRef.current = range.cloneRange();
    }
    highlightSelectedTableCells();
    updateToolbarState();
    showCellMenuForCell(cell);
    setTimeout(() => {
      highlightSelectedTableCells();
      const el = editorRef.current;
      const selected = el?.querySelector(".page-editor-table td[data-cell-selected]") as HTMLTableCellElement | null;
      if (selected) showCellMenuForCell(selected);
    }, 0);
  }

  function handleTableCellDoubleClick(e: React.MouseEvent) {
    const target = (e.target as HTMLElement).closest?.("table.page-editor-table td");
    if (!target) return;
    const cell = target as HTMLElement;
    cell.setAttribute("contenteditable", "true");
    cell.setAttribute("data-cell-editing", "true");
    cell.focus();
    const range = document.createRange();
    range.selectNodeContents(cell);
    range.collapse(true);
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
    setContentHtml(editorRef.current?.innerHTML ?? "");
    setTimeout(() => {
      highlightSelectedTableCells();
      updateToolbarState();
    }, 0);
  }

  function handleCoverButtonDoubleClick(e: React.MouseEvent): boolean {
    const target = (e.target as HTMLElement).closest?.(".page-web-cover-el-button") as HTMLElement | null;
    const ed = editorRef.current;
    if (!target || !ed || !ed.contains(target)) return false;
    e.preventDefault();
    e.stopPropagation();
    coverButtonLinkTargetRef.current = target;
    setCoverButtonLinkModalValue((target.getAttribute("data-href") || "").trim());
    setCoverButtonLinkModalOpen(true);
    return true;
  }

  function applyCoverButtonLinkAndClose() {
    const ed = editorRef.current;
    const target = coverButtonLinkTargetRef.current;
    if (!ed || !target || !ed.contains(target)) {
      setCoverButtonLinkModalOpen(false);
      return;
    }
    const href = coverButtonLinkModalValue.trim();
    if (href) target.setAttribute("data-href", href);
    else target.removeAttribute("data-href");
    setContentHtml(ed.innerHTML);
    setCoverButtonLinkModalOpen(false);
  }

  function handleEditorFocusOut(e: React.FocusEvent) {
    const relatedTarget = e.relatedTarget as Node | null;
    const el = editorRef.current;
    if (!el) return;
    el.querySelectorAll(".page-editor-table td[data-cell-editing]").forEach((td) => {
      const cell = td as HTMLElement;
      if (!relatedTarget || !cell.contains(relatedTarget)) {
        cell.removeAttribute("data-cell-editing");
        cell.setAttribute("contenteditable", "false");
      }
    });
    el.querySelectorAll('.page-web-cover-inner[data-cover-unlocked="1"]').forEach((n) => {
      const inner = n as HTMLElement;
      if (relatedTarget && inner.contains(relatedTarget)) return;
      inner.removeAttribute("data-cover-unlocked");
      inner.setAttribute("contenteditable", "false");
    });
    setContentHtml(el.innerHTML);
  }

  function handleEditorBeforeInput(e: React.FormEvent<HTMLDivElement>) {
    const native = e.nativeEvent as InputEvent;
    const ed = editorRef.current;
    if (!ed) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (!ed.contains(range.commonAncestorContainer)) return;
    if (tryPreventWebCoverNonDeleteInput(ed, range, native.inputType)) {
      e.preventDefault();
      return;
    }
    if (native.inputType === "deleteContentBackward" && range.collapsed) {
      if (tryHandleWebCoverBackspace(ed, range)) e.preventDefault();
      return;
    }
    if (native.inputType === "deleteContentForward" && range.collapsed) {
      if (tryHandleWebCoverForwardBlock(ed, range)) e.preventDefault();
    }
  }

  function handleCoverSurfaceMouseDown(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    if (target.closest?.(".page-web-cover-inner") || target.closest?.(".page-web-cover-toolbar")) return;
    const cover = target.closest?.(".page-web-cover") as HTMLElement | null;
    const ed = editorRef.current;
    if (!cover || !ed?.contains(cover)) return;
    e.preventDefault();
    e.stopPropagation();
  }

  function handleCoverInnerMouseDown(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    if (target.closest?.(".page-web-cover-toolbar")) return;
    const inner = target.closest?.(".page-web-cover-inner") as HTMLElement | null;
    const ed = editorRef.current;
    if (!inner || !ed?.contains(inner)) return;
    if (inner.getAttribute("data-cover-unlocked") === "1") return;
    e.preventDefault();
    inner.setAttribute("data-cover-unlocked", "1");
    inner.setAttribute("contenteditable", "true");
    inner.focus();
    requestAnimationFrame(() => {
      const r = document.createRange();
      const sel = window.getSelection();
      if (!sel || !ed.contains(inner)) return;
      const hasText = inner.innerText.replace(/\u200b/g, "").trim().length > 0;
      if (hasText) {
        r.selectNodeContents(inner);
        r.collapse(false);
      } else {
        const first = inner.firstChild;
        if (first?.nodeName === "BR") {
          r.setStart(inner, 0);
          r.collapse(true);
        } else if (first?.nodeType === Node.TEXT_NODE) {
          r.setStart(first, 0);
          r.collapse(true);
        } else if (first) {
          r.setStartBefore(first);
          r.collapse(true);
        } else {
          r.setStart(inner, 0);
          r.collapse(true);
        }
      }
      sel.removeAllRanges();
      try {
        sel.addRange(r);
      } catch {
        // ignore
      }
      savedRangeRef.current = r.cloneRange();
      setTimeout(() => updateToolbarState(), 0);
    });
  }

  function handleCoverToolbarMouseDown(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    const ed = editorRef.current;
    const toolbar = target.closest?.(".page-web-cover-toolbar") as HTMLElement | null;
    if (!toolbar || !ed?.contains(toolbar)) return;

    const aspectBtn = target.closest?.("[data-set-cover-aspect]") as HTMLElement | null;
    if (aspectBtn && toolbar.contains(aspectBtn)) {
      e.preventDefault();
      e.stopPropagation();
      const v = aspectBtn.getAttribute("data-set-cover-aspect");
      const cover = toolbar.closest(".page-web-cover") as HTMLElement | null;
      if (cover && v && COVER_ASPECT_PRESETS.some((p) => p.id === v) && ed.contains(cover)) {
        cover.setAttribute("data-cover-aspect", v);
        toolbar.removeAttribute("data-menu-open");
        toolbar.querySelectorAll('.page-web-cover-menu-sub[data-submenu-open="1"]').forEach((s) => {
          (s as HTMLElement).removeAttribute("data-submenu-open");
        });
        toolbar.querySelectorAll(".page-web-cover-menu-sub-trigger").forEach((tr) => {
          (tr as HTMLElement).setAttribute("aria-expanded", "false");
        });
        setContentHtml(ed.innerHTML);
        setTimeout(() => updateToolbarState(), 0);
      }
      return;
    }

    const insertCoverElBtn = target.closest?.("[data-insert-cover-element]") as HTMLElement | null;
    if (insertCoverElBtn && toolbar.contains(insertCoverElBtn)) {
      e.preventDefault();
      e.stopPropagation();
      const raw = insertCoverElBtn.getAttribute("data-insert-cover-element") ?? "";
      const cover = toolbar.closest(".page-web-cover") as HTMLElement | null;
      if (!cover || !ed.contains(cover)) return;
      if (raw === "title" || raw === "subtitle" || raw === "button") {
        insertCoverBlockElement(cover, raw, ed);
        closeCoverToolbarMenus(toolbar);
        setContentHtml(ed.innerHTML);
        setTimeout(() => updateToolbarState(), 0);
      }
      return;
    }

    const subTrigger = target.closest?.(".page-web-cover-menu-sub-trigger") as HTMLElement | null;
    if (subTrigger && toolbar.contains(subTrigger)) {
      e.preventDefault();
      e.stopPropagation();
      const sub = subTrigger.closest(".page-web-cover-menu-sub") as HTMLElement | null;
      if (sub) {
        const wasOpen = sub.getAttribute("data-submenu-open") === "1";
        toolbar.querySelectorAll('.page-web-cover-menu-sub[data-submenu-open="1"]').forEach((node) => {
          if (node !== sub) (node as HTMLElement).removeAttribute("data-submenu-open");
        });
        if (wasOpen) sub.removeAttribute("data-submenu-open");
        else sub.setAttribute("data-submenu-open", "1");
        toolbar.querySelectorAll(".page-web-cover-menu-sub-trigger").forEach((tr) => {
          const parent = tr.closest(".page-web-cover-menu-sub");
          const open = parent?.getAttribute("data-submenu-open") === "1";
          (tr as HTMLElement).setAttribute("aria-expanded", open ? "true" : "false");
        });
      }
      return;
    }

    const uploadBtn = target.closest?.(".page-web-cover-menu-upload") as HTMLElement | null;
    if (uploadBtn && toolbar.contains(uploadBtn)) {
      e.preventDefault();
      e.stopPropagation();
      const cover = toolbar.closest(".page-web-cover") as HTMLElement | null;
      if (!cover || !ed.contains(cover)) return;
      webShellImageUploadPendingRef.current = { kind: "cover", cover };
      webShellImageInputRef.current?.click();
      return;
    }

    const alignBgBtn = target.closest?.(".page-web-cover-menu-align-bg") as HTMLElement | null;
    if (alignBgBtn && toolbar.contains(alignBgBtn)) {
      e.preventDefault();
      e.stopPropagation();
      const cover = toolbar.closest(".page-web-cover") as HTMLElement | null;
      if (!cover || !ed.contains(cover)) return;
      if (!cover.classList.contains("page-web-cover-has-bg")) return;
      const imageSrc = extractCoverBackgroundDataUrl(cover);
      if (!imageSrc) return;
      const posX = Number.parseFloat(cover.getAttribute("data-cover-bg-x") || "50");
      const posY = Number.parseFloat(cover.getAttribute("data-cover-bg-y") || "50");
      coverBgAdjustingRef.current = true;
      setCoverBgAdjustSession({
        mount: cover,
        imageSrc,
        posX: Number.isFinite(posX) ? posX : 50,
        posY: Number.isFinite(posY) ? posY : 50,
        revert: buildCoverBgRevertSnapshot(cover),
      });
      closeCoverToolbarMenus(toolbar);
      setContentHtml(ed.innerHTML);
      setTimeout(() => updateToolbarState(), 0);
      return;
    }

    const del = target.closest?.(".page-web-cover-menu-delete");
    if (del) {
      e.preventDefault();
      e.stopPropagation();
      toolbar.removeAttribute("data-menu-open");
      toolbar.querySelectorAll('.page-web-cover-menu-sub[data-submenu-open="1"]').forEach((s) => {
        (s as HTMLElement).removeAttribute("data-submenu-open");
      });
      toolbar.querySelectorAll(".page-web-cover-menu-sub-trigger").forEach((tr) => {
        (tr as HTMLElement).setAttribute("aria-expanded", "false");
      });
      const cover = toolbar.closest(".page-web-cover");
      if (cover && ed.contains(cover)) removeWebCoverBlock(cover as HTMLElement);
      return;
    }

    if (target.closest?.(".page-web-cover-menu-trigger")) {
      e.preventDefault();
      e.stopPropagation();
      const wasOpen = toolbar.getAttribute("data-menu-open") === "1";
      ed.querySelectorAll('.page-web-cover-toolbar[data-menu-open="1"]').forEach((node) => {
        const n = node as HTMLElement;
        n.removeAttribute("data-menu-open");
        n.querySelectorAll('.page-web-cover-menu-sub[data-submenu-open="1"]').forEach((s) => {
          (s as HTMLElement).removeAttribute("data-submenu-open");
        });
        n.querySelectorAll(".page-web-cover-menu-sub-trigger").forEach((tr) => {
          (tr as HTMLElement).setAttribute("aria-expanded", "false");
        });
      });
      if (!wasOpen) toolbar.setAttribute("data-menu-open", "1");
    }
  }

  function handleCarouselToolbarMouseDown(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    const ed = editorRef.current;
    const toolbar = target.closest?.(".page-web-carousel-toolbar") as HTMLElement | null;
    if (!toolbar || !ed?.contains(toolbar)) return;

    const aspectBtn = target.closest?.("[data-set-carousel-aspect]") as HTMLElement | null;
    if (aspectBtn && toolbar.contains(aspectBtn)) {
      e.preventDefault();
      e.stopPropagation();
      const v = aspectBtn.getAttribute("data-set-carousel-aspect");
      const carousel = toolbar.closest(".page-web-carousel") as HTMLElement | null;
      if (carousel && v && CAROUSEL_IMAGE_TYPE_PRESETS.some((p) => p.id === v) && ed.contains(carousel)) {
        carousel.setAttribute("data-carousel-aspect", v);
        toolbar
          .querySelectorAll(".page-web-carousel-menu-image-type[data-set-carousel-aspect]")
          .forEach((btn) => {
            const selected = (btn as HTMLElement).getAttribute("data-set-carousel-aspect") === v;
            (btn as HTMLElement).setAttribute("aria-checked", selected ? "true" : "false");
          });
        closeCarouselToolbarMenus(toolbar);
        setContentHtml(ed.innerHTML);
        setTimeout(() => updateToolbarState(), 0);
      }
      return;
    }

    const subTrigger = target.closest?.(".page-web-carousel-menu-sub-trigger") as HTMLElement | null;
    if (subTrigger && toolbar.contains(subTrigger)) {
      e.preventDefault();
      e.stopPropagation();
      const sub = subTrigger.closest(".page-web-carousel-menu-sub") as HTMLElement | null;
      if (sub) {
        const wasOpen = sub.getAttribute("data-submenu-open") === "1";
        toolbar.querySelectorAll('.page-web-carousel-menu-sub[data-submenu-open="1"]').forEach((node) => {
          if (node !== sub) (node as HTMLElement).removeAttribute("data-submenu-open");
        });
        if (wasOpen) sub.removeAttribute("data-submenu-open");
        else sub.setAttribute("data-submenu-open", "1");
        toolbar.querySelectorAll(".page-web-carousel-menu-sub-trigger").forEach((tr) => {
          const parent = tr.closest(".page-web-carousel-menu-sub");
          const open = parent?.getAttribute("data-submenu-open") === "1";
          (tr as HTMLElement).setAttribute("aria-expanded", open ? "true" : "false");
        });
      }
      return;
    }

    const fullPreviewBtn = target.closest?.(".page-web-carousel-menu-fullscreen");
    if (fullPreviewBtn) {
      e.preventDefault();
      e.stopPropagation();
      const carousel = toolbar.closest(".page-web-carousel") as HTMLElement | null;
      if (!carousel || !ed.contains(carousel)) return;
      const session = buildCarouselPreviewSession(carousel, getActiveCarouselSlide(carousel));
      if (!session) return;
      closeCarouselToolbarMenus(toolbar);
      setCarouselPreviewSession(session);
      return;
    }

    const uploadSlide = target.closest?.(".page-web-carousel-menu-upload-slide");
    if (uploadSlide) {
      e.preventDefault();
      e.stopPropagation();
      const carousel = toolbar.closest(".page-web-carousel") as HTMLElement | null;
      if (!carousel || !ed.contains(carousel)) return;
      const slide = getActiveCarouselSlide(carousel);
      if (!slide) return;
      webShellImageUploadPendingRef.current = { kind: "carousel", carousel, slide };
      webShellImageInputRef.current?.click();
      return;
    }

    const addSlide = target.closest?.(".page-web-carousel-menu-add-slide");
    if (addSlide) {
      e.preventDefault();
      e.stopPropagation();
      const carousel = toolbar.closest(".page-web-carousel") as HTMLElement | null;
      if (!carousel || !ed.contains(carousel)) return;
      const viewport = carousel.querySelector(".page-web-carousel-viewport") as HTMLElement | null;
      if (!viewport) return;
      const strip = ensureWebCarouselStripInViewport(viewport);
      const n = strip.querySelectorAll(".page-web-carousel-slide").length + 1;
      const prevActive = getActiveCarouselSlide(carousel);
      const wrap = document.createElement("div");
      wrap.innerHTML =
        '<div class="page-web-carousel-slide" contenteditable="false">' +
        '<div class="page-web-carousel-slide-inner" contenteditable="false">' +
        '<div class="page-web-carousel-placeholder" contenteditable="false">Слайд ' +
        n +
        "</div></div></div>";
      const newSlide = wrap.firstElementChild as HTMLElement;
      strip.appendChild(newSlide);
      /* Не переключаем активный слайд на новый — иначе при 4+ слайдах окно сдвигается к хвосту и «съезжает влево». */
      if (prevActive && strip.contains(prevActive)) {
        strip.querySelectorAll(".page-web-carousel-slide[data-carousel-active]").forEach((s) => {
          (s as HTMLElement).removeAttribute("data-carousel-active");
        });
        prevActive.setAttribute("data-carousel-active", "1");
      } else {
        strip.querySelectorAll(".page-web-carousel-slide[data-carousel-active]").forEach((s) => {
          (s as HTMLElement).removeAttribute("data-carousel-active");
        });
        newSlide.setAttribute("data-carousel-active", "1");
      }
      closeCarouselToolbarMenus(toolbar);
      webCarouselScrollAlignPendingRef.current = true;
      setContentHtml(ed.innerHTML);
      setTimeout(() => updateToolbarState(), 0);
      return;
    }

    const removeSlide = target.closest?.(".page-web-carousel-menu-remove-slide");
    if (removeSlide) {
      e.preventDefault();
      e.stopPropagation();
      const carousel = toolbar.closest(".page-web-carousel") as HTMLElement | null;
      if (!carousel || !ed.contains(carousel)) return;
      const viewport = carousel.querySelector(".page-web-carousel-viewport") as HTMLElement | null;
      if (!viewport) return;
      const slides = viewport.querySelectorAll(".page-web-carousel-slide");
      if (slides.length <= 1) {
        closeCarouselToolbarMenus(toolbar);
        removeWebCarouselBlock(carousel);
        return;
      }
      const active = getActiveCarouselSlide(carousel);
      const toRemove = active ?? (slides[0] as HTMLElement);
      const nextFocus = toRemove.nextElementSibling ?? toRemove.previousElementSibling;
      toRemove.remove();
      if (nextFocus?.classList.contains("page-web-carousel-slide")) {
        (nextFocus as HTMLElement).setAttribute("data-carousel-active", "1");
      } else {
        viewport.querySelector(".page-web-carousel-slide")?.setAttribute("data-carousel-active", "1");
      }
      closeCarouselToolbarMenus(toolbar);
      webCarouselScrollAlignPendingRef.current = true;
      setContentHtml(ed.innerHTML);
      setTimeout(() => updateToolbarState(), 0);
      return;
    }

    const del = target.closest?.(".page-web-carousel-menu-delete");
    if (del) {
      e.preventDefault();
      e.stopPropagation();
      const c = toolbar.closest(".page-web-carousel") as HTMLElement | null;
      closeCarouselToolbarMenus(toolbar);
      if (c && ed.contains(c)) removeWebCarouselBlock(c);
      return;
    }

    if (target.closest?.(".page-web-carousel-menu-trigger")) {
      e.preventDefault();
      e.stopPropagation();
      const wasOpen = toolbar.getAttribute("data-menu-open") === "1";
      ed.querySelectorAll('.page-web-carousel-toolbar[data-menu-open="1"]').forEach((node) => {
        closeCarouselToolbarMenus(node as HTMLElement);
      });
      if (!wasOpen) {
        toolbar.setAttribute("data-menu-open", "1");
        const carousel = toolbar.closest(".page-web-carousel") as HTMLElement | null;
        const current = carousel?.getAttribute("data-carousel-aspect") || "horizontal";
        toolbar
          .querySelectorAll(".page-web-carousel-menu-image-type[data-set-carousel-aspect]")
          .forEach((btn) => {
            const selected = (btn as HTMLElement).getAttribute("data-set-carousel-aspect") === current;
            (btn as HTMLElement).setAttribute("aria-checked", selected ? "true" : "false");
          });
        positionCarouselMenuDropdownFixed(toolbar);
      }
    }
  }

  function handleTimelineToolbarMouseDown(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    const ed = editorRef.current;
    const toolbar = target.closest?.(".page-web-timeline-toolbar") as HTMLElement | null;
    if (!toolbar || !ed?.contains(toolbar)) return;
    // Запрещаем показ каретки внутри панели ⋮ таймлайна.
    e.preventDefault();
    e.stopPropagation();
    const timeline = toolbar.closest(".page-web-timeline") as HTMLElement | null;
    if (!timeline || !ed.contains(timeline)) return;

    const addBtn = target.closest?.(".page-web-timeline-menu-add-step");
    if (addBtn) {
      const n = timeline.querySelectorAll(".page-web-timeline-item").length + 1;
      const wrap = document.createElement("div");
      wrap.innerHTML =
        '<div class="page-web-timeline-item">' +
        '<p class="page-web-timeline-term">1 неделя</p>' +
        '<div class="page-web-timeline-dot" aria-hidden="true"></div>' +
        '<div class="page-web-timeline-content">' +
        '<p class="page-web-timeline-title">Этап ' +
        n +
        '. Новый этап</p>' +
        '<p class="page-web-timeline-text">Опишите, что происходит на этом этапе.</p>' +
        "</div></div>";
      const newItem = wrap.firstElementChild as HTMLElement;
      timeline.appendChild(newItem);
      timeline.style.setProperty("--timeline-cols", String(Math.max(1, timeline.querySelectorAll(".page-web-timeline-item").length)));
      closeTimelineToolbarMenus(toolbar);
      setContentHtml(ed.innerHTML);
      setTimeout(() => updateToolbarState(), 0);
      return;
    }

    const removeBtn = target.closest?.(".page-web-timeline-menu-remove-step");
    if (removeBtn) {
      const items = timeline.querySelectorAll(".page-web-timeline-item");
      if (items.length <= 1) {
        closeTimelineToolbarMenus(toolbar);
        removeWebTimelineBlock(timeline);
        return;
      }
      const last = items[items.length - 1] as HTMLElement;
      last.remove();
      timeline.style.setProperty("--timeline-cols", String(Math.max(1, timeline.querySelectorAll(".page-web-timeline-item").length)));
      closeTimelineToolbarMenus(toolbar);
      setContentHtml(ed.innerHTML);
      setTimeout(() => updateToolbarState(), 0);
      return;
    }

    const delBtn = target.closest?.(".page-web-timeline-menu-delete");
    if (delBtn) {
      closeTimelineToolbarMenus(toolbar);
      removeWebTimelineBlock(timeline);
      return;
    }

    if (target.closest?.(".page-web-timeline-menu-trigger")) {
      const wasOpen = toolbar.getAttribute("data-menu-open") === "1";
      ed.querySelectorAll('.page-web-timeline-toolbar[data-menu-open="1"]').forEach((node) => {
        closeTimelineToolbarMenus(node as HTMLElement);
      });
      if (!wasOpen) toolbar.setAttribute("data-menu-open", "1");
    }
  }

  function handleCarouselEditorMouseDown(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    const carousel = target.closest?.(".page-web-carousel") as HTMLElement | null;
    const ed = editorRef.current;
    if (!carousel || !ed?.contains(carousel)) return;

    if (target.closest?.(".page-web-carousel-toolbar")) {
      handleCarouselToolbarMouseDown(e);
      return;
    }

    // Вся карусель вне меню — не даём contentEditable-родителю показать каретку (в т.ч. клик по полосе прокрутки).
    e.preventDefault();
    e.stopPropagation();

    if (target.closest?.(".page-web-carousel-prev") || target.closest?.(".page-web-carousel-next")) {
      const arrowBtn = target.closest(".page-web-carousel-arrow") as HTMLButtonElement | null;
      if (arrowBtn?.disabled) return;
      const viewport = carousel.querySelector(".page-web-carousel-viewport") as HTMLElement | null;
      if (!viewport) return;
      const dir = target.closest(".page-web-carousel-prev") ? -1 : 1;
      shiftCarouselStripBySlide(viewport, dir as -1 | 1);
      return;
    }

    const slide = target.closest?.(".page-web-carousel-slide") as HTMLElement | null;
    if (slide && carousel.contains(slide)) {
      carousel.querySelectorAll(".page-web-carousel-slide[data-carousel-active]").forEach((s) => {
        (s as HTMLElement).removeAttribute("data-carousel-active");
      });
      slide.setAttribute("data-carousel-active", "1");
      const viewport = carousel.querySelector(".page-web-carousel-viewport") as HTMLElement | null;
      if (viewport) {
        requestAnimationFrame(() => alignWebCarouselViewportToActive(viewport));
      }
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    const el = editorRef.current;
    if (!el) return;
    if (e.key === "Backspace" || e.key === "Delete") {
      const selectedImage = selectedImageWrapperRef.current;
      if (selectedImage && el.contains(selectedImage)) {
        e.preventDefault();
        const parent = selectedImage.parentNode;
        const nextSibling = selectedImage.nextSibling;
        const prevSibling = selectedImage.previousSibling;
        selectedImage.remove();
        selectedImageWrapperRef.current = null;
        const selection = window.getSelection();
        if (selection && parent) {
          const r = document.createRange();
          const target = nextSibling ?? prevSibling;
          if (target) {
            if (target.nodeType === Node.TEXT_NODE) {
              const textNode = target as Text;
              r.setStart(textNode, textNode.textContent?.length ?? 0);
            } else {
              r.selectNodeContents(target);
              r.collapse(false);
            }
          } else {
            r.selectNodeContents(parent);
            r.collapse(false);
          }
          selection.removeAllRanges();
          selection.addRange(r);
        }
        setContentHtml(el.innerHTML);
        syncMarkerBold();
        setTimeout(() => updateToolbarState(), 0);
        return;
      }
    }
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);

    if (e.key === "Backspace" && range.collapsed) {
      if (tryHandleWebCoverBackspace(el, range)) {
        e.preventDefault();
        return;
      }
    }

    if (e.key === "Delete" && range.collapsed) {
      if (tryHandleWebCoverForwardBlock(el, range)) {
        e.preventDefault();
        return;
      }
    }

    let node: Node | null = range.startContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    const li = (node as Element)?.closest?.("li");
    const inList = li && el.contains(li);
    const emptyLi = inList && li && isListItemEmpty(li);

    if (e.key === "Enter" && inList) {
      e.preventDefault();
      if (emptyLi) {
        exitListAtEmptyLi(li!);
      } else {
        const list = li!.closest("ol, ul");
        if (!list) return;
        if (caretDebugOn()) {
          logPageEditorCaret("keydown Enter (list):before-split", {
            listTag: list.nodeName,
            liPreview: (li as HTMLElement).outerHTML?.slice(0, 160),
          });
          snapshotSelection("keydown Enter (list):before-split", el);
        }
        const range = sel.getRangeAt(0);
        const endBoundary = document.createRange();
        endBoundary.selectNodeContents(li!);
        endBoundary.collapse(false);
        const tailRange = document.createRange();
        tailRange.setStart(range.startContainer, range.startOffset);
        tailRange.setEnd(endBoundary.endContainer, endBoundary.endOffset);
        const newLi = document.createElement("li");
        newLi.appendChild(tailRange.extractContents());
        if (newLi.childNodes.length === 0) newLi.appendChild(document.createElement("br"));
        if (li!.childNodes.length === 0) li!.appendChild(document.createElement("br"));
        li!.parentNode?.insertBefore(newLi, li!.nextSibling);
        const caretId = `ec-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        newLi.setAttribute("data-editor-caret", caretId);
        pendingEditorCaretRef.current = caretId;
        if (caretDebugOn()) {
          logPageEditorCaret("keydown Enter (list):after-DOM", {
            caretId,
            newLiPreview: newLi.outerHTML?.slice(0, 200),
            prevLiPreview: (li as HTMLElement).outerHTML?.slice(0, 200),
          });
          snapshotSelection("keydown Enter (list):after-extractContents", el);
        }
        // Synchronous caret: invalid selection after extractContents + React commit often paints
        // the caret at the top of the contenteditable (above padded text) until layout runs.
        placeCaretAtLiStart(newLi, "keydown-Enter-list");
        syncMarkerBold();
        setContentHtml(el.innerHTML);
        if (caretDebugOn()) {
          snapshotSelection("keydown Enter (list):after-setContentHtml", el);
          queueMicrotask(() => snapshotSelection("keydown Enter (list):microtask-after-setState", el));
          requestAnimationFrame(() => snapshotSelection("keydown Enter (list):rAF-after-setState", el));
        }
        setTimeout(() => updateToolbarState(), 0);
      }
      return;
    }

    if (e.key === "Backspace" && inList && emptyLi) {
      e.preventDefault();
      exitListAtEmptyLi(li!);
      return;
    }

    if (e.key === "Backspace") {
      const selectedCells = Array.from(el.querySelectorAll(".page-editor-table td[data-cell-selected]")) as HTMLElement[];
      if (selectedCells.length > 0) {
        const table = selectedCells[0].closest("table.page-editor-table");
        if (table) {
          const totalCells = table.querySelectorAll("td").length;
          if (selectedCells.length === totalCells) {
            e.preventDefault();
            const placeholder = document.createElement("div");
            placeholder.innerHTML = "<br>";
            table.parentNode?.replaceChild(placeholder, table);
            const r = document.createRange();
            r.setStart(placeholder, 0);
            r.collapse(true);
            sel.removeAllRanges();
            sel.addRange(r);
            el.querySelectorAll(".page-editor-table td[data-cell-selected]").forEach((td) =>
              td.removeAttribute("data-cell-selected")
            );
            setContentHtml(el.innerHTML);
            syncMarkerBold();
            setCellMenuOpen(false);
            clearTableSelection();
            setTimeout(() => updateToolbarState(), 0);
          }
        }
      }
    }
  }

  function insertImage(src: string) {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (!sel) return;
    const range = savedRangeRef.current;
    if (range) {
      try {
        if (el.contains(range.commonAncestorContainer)) {
          sel.removeAllRanges();
          sel.addRange(range);
        }
      } catch {
        // ignore
      }
    }
    const node =
      range?.startContainer.nodeType === Node.TEXT_NODE
        ? range.startContainer.parentElement
        : (range?.startContainer as Element | null);
    const inTableCell = !!node?.closest?.("table.page-editor-table td");
    const escaped = src.replace(/"/g, "&quot;");
    const handles = ["n","s","e","w","ne","nw","se","sw"].map((h)=>`<span class="page-editor-image-resize page-editor-image-resize-${h}" data-resize="${h}" aria-label="Изменить размер"></span>`).join("");
    const imageStyle = inTableCell
      ? "width:auto;max-width:100%;height:auto;display:block"
      : "width:300px;height:auto;display:block";
    const html = `<span class="page-editor-image-wrapper" contenteditable="false"><img class="page-editor-image" src="${escaped}" alt="" style="${imageStyle}">${handles}</span>`;
    document.execCommand("insertHTML", false, html);
    normalizeListContent();
    normalizeTableCells();
    normalizeImages();
    setContentHtml(el.innerHTML);
    syncMarkerBold();
    el.dispatchEvent(new Event("input", { bubbles: true }));
    setTimeout(updateToolbarState, 0);
  }

  function clearCoverBackground(cover: HTMLElement) {
    cover.classList.remove("page-web-cover-has-bg");
    cover.style.background = "";
    cover.removeAttribute("data-cover-bg-x");
    cover.removeAttribute("data-cover-bg-y");
  }

  function restoreCoverBgRevert(cover: HTMLElement, revert: CoverBgAdjustRevertSnapshot) {
    if (!revert.hasBgClass && !revert.background) {
      clearCoverBackground(cover);
      return;
    }
    cover.style.background = revert.background;
    if (revert.hasBgClass) cover.classList.add("page-web-cover-has-bg");
    else cover.classList.remove("page-web-cover-has-bg");
    if (revert.dataX != null) cover.setAttribute("data-cover-bg-x", revert.dataX);
    else cover.removeAttribute("data-cover-bg-x");
    if (revert.dataY != null) cover.setAttribute("data-cover-bg-y", revert.dataY);
    else cover.removeAttribute("data-cover-bg-y");
  }

  function applyCoverBackgroundImage(cover: HTMLElement, dataUrl: string, posX = 50, posY = 50) {
    cover.classList.add("page-web-cover-has-bg");
    const safe = dataUrl.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const x = clampPercent(posX);
    const y = clampPercent(posY);
    cover.style.background = `url("${safe}") ${x}% ${y}% / cover no-repeat`;
    cover.setAttribute("data-cover-bg-x", String(x));
    cover.setAttribute("data-cover-bg-y", String(y));
  }

  const updateCoverBgAdjustPos = useCallback((x: number, y: number) => {
    setCoverBgAdjustSession((s) => (s ? { ...s, posX: x, posY: y } : null));
  }, []);

  const handleCoverBgAdjustCommit = useCallback(() => {
    setCoverBgAdjustSession((s) => {
      if (!s) return null;
      coverBgAdjustingRef.current = false;
      const ed = editorRef.current;
      if (ed?.contains(s.mount)) {
        applyCoverBackgroundImage(s.mount, s.imageSrc, s.posX, s.posY);
        setTimeout(() => {
          if (editorRef.current) setContentHtml(editorRef.current.innerHTML);
          updateToolbarState();
        }, 0);
      }
      return null;
    });
  }, []);

  const handleCoverBgAdjustCancel = useCallback(() => {
    setCoverBgAdjustSession((s) => {
      if (!s) return null;
      coverBgAdjustingRef.current = false;
      const ed = editorRef.current;
      if (ed?.contains(s.mount)) {
        restoreCoverBgRevert(s.mount, s.revert);
        setTimeout(() => {
          if (editorRef.current) setContentHtml(editorRef.current.innerHTML);
          updateToolbarState();
        }, 0);
      }
      return null;
    });
  }, []);

  function closeCoverToolbarMenus(toolbar: HTMLElement) {
    toolbar.removeAttribute("data-menu-open");
    toolbar.querySelectorAll('.page-web-cover-menu-sub[data-submenu-open="1"]').forEach((s) => {
      (s as HTMLElement).removeAttribute("data-submenu-open");
    });
    toolbar.querySelectorAll(".page-web-cover-menu-sub-trigger").forEach((tr) => {
      (tr as HTMLElement).setAttribute("aria-expanded", "false");
    });
  }

  async function convertImageFileToWebpDataUrl(file: File): Promise<string | null> {
    const fileDataUrl = await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string) || null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
    if (!fileDataUrl) return null;

    const img = await new Promise<HTMLImageElement | null>((resolve) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = fileDataUrl;
    });
    if (!img) return fileDataUrl;

    const maxSide = 1600;
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const targetW = Math.max(1, Math.round(img.width * scale));
    const targetH = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return fileDataUrl;
    ctx.drawImage(img, 0, 0, targetW, targetH);
    const webpDataUrl = canvas.toDataURL("image/webp", 0.82);
    return webpDataUrl || fileDataUrl;
  }

  async function convertImageDataUrlToWebpDataUrl(dataUrl: string): Promise<string> {
    if (!/^data:image\//i.test(dataUrl) || /^data:image\/webp/i.test(dataUrl)) {
      return dataUrl;
    }
    const img = await new Promise<HTMLImageElement | null>((resolve) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = dataUrl;
    });
    if (!img) return dataUrl;
    const maxSide = 1600;
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const targetW = Math.max(1, Math.round(img.width * scale));
    const targetH = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, targetW, targetH);
    const webpDataUrl = canvas.toDataURL("image/webp", 0.82);
    return webpDataUrl || dataUrl;
  }

  async function normalizeHtmlInlineImagesToWebp(html: string): Promise<string> {
    const dataUrlRe =
      /data:image\/(?:png|jpeg|jpg|bmp|gif|tiff|webp);base64,[A-Za-z0-9+/=]+/gi;
    const allMatches = Array.from(html.matchAll(dataUrlRe)).map((m) => m[0]);
    if (allMatches.length === 0) return html;

    const uniqueMatches = Array.from(new Set(allMatches));
    let nextHtml = html;
    let changed = false;
    for (const src of uniqueMatches) {
      if (!src || /^data:image\/webp/i.test(src)) continue;
      const webp = await convertImageDataUrlToWebpDataUrl(src);
      if (webp && webp !== src) {
        nextHtml = nextHtml.split(src).join(webp);
        changed = true;
      }
    }
    return changed ? nextHtml : html;
  }

  async function processAndInsertImage(file: File) {
    const webpDataUrl = await convertImageFileToWebpDataUrl(file);
    if (webpDataUrl) insertImage(webpDataUrl);
  }

  function handleImageInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    void processAndInsertImage(file);
  }

  function handleWebShellImageInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const pending = webShellImageUploadPendingRef.current;
    webShellImageUploadPendingRef.current = null;
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/"));
    e.target.value = "";
    if (files.length === 0 || !pending) return;
    const ed = editorRef.current;
    if (!ed) return;

    if (pending.kind === "cover") {
      const cover = pending.cover;
      if (!ed.contains(cover)) return;
      void (async () => {
        const file = files[0];
        const webp = await convertImageFileToWebpDataUrl(file);
        if (!webp) return;
        const revert = buildCoverBgRevertSnapshot(cover);
        applyCoverBackgroundImage(cover, webp, 50, 50);
        coverBgAdjustingRef.current = true;
        setCoverBgAdjustSession({
          mount: cover,
          imageSrc: webp,
          posX: 50,
          posY: 50,
          revert,
        });
        const tb = cover.querySelector(".page-web-cover-toolbar") as HTMLElement | null;
        if (tb) closeCoverToolbarMenus(tb);
        setContentHtml(ed.innerHTML);
        setTimeout(() => updateToolbarState(), 0);
      })();
      return;
    }

    const { carousel, slide } = pending;
    if (!ed.contains(carousel) || !ed.contains(slide)) return;
    void (async () => {
      const viewport = carousel.querySelector(".page-web-carousel-viewport") as HTMLElement | null;
      if (!viewport) return;
      const strip = ensureWebCarouselStripInViewport(viewport);
      const makeSlide = (n: number): HTMLElement => {
        const wrap = document.createElement("div");
        wrap.innerHTML =
          '<div class="page-web-carousel-slide" contenteditable="false">' +
          '<div class="page-web-carousel-slide-inner" contenteditable="false">' +
          '<div class="page-web-carousel-placeholder" contenteditable="false">Слайд ' +
          n +
          "</div></div></div>";
        return wrap.firstElementChild as HTMLElement;
      };
      const putImage = (targetSlide: HTMLElement, dataUrl: string) => {
        const inner = targetSlide.querySelector(".page-web-carousel-slide-inner") as HTMLElement | null;
        if (!inner) return;
        inner.innerHTML = "";
        const img = document.createElement("img");
        img.className = "page-web-carousel-img";
        img.setAttribute("src", dataUrl);
        img.setAttribute("alt", "");
        img.setAttribute("contenteditable", "false");
        img.setAttribute("draggable", "false");
        inner.appendChild(img);
      };

      const slides = Array.from(strip.querySelectorAll(".page-web-carousel-slide")) as HTMLElement[];
      let cursor = Math.max(0, slides.indexOf(slide));
      for (const file of files) {
        const webp = await convertImageFileToWebpDataUrl(file);
        if (!webp) continue;
        let target = slides[cursor];
        if (!target) {
          const n = slides.length + 1;
          target = makeSlide(n);
          strip.appendChild(target);
          slides.push(target);
        }
        putImage(target, webp);
        cursor += 1;
      }

      if (cursor > slides.length) cursor = slides.length;
      webCarouselScrollAlignPendingRef.current = true;
      const tb = carousel.querySelector(".page-web-carousel-toolbar") as HTMLElement | null;
      if (tb) closeCarouselToolbarMenus(tb);
      setContentHtml(ed.innerHTML);
      setTimeout(() => updateToolbarState(), 0);
    })();
  }

  function handlePaste(e: React.ClipboardEvent) {
    const el = editorRef.current;
    if (!el) return;
    const selPaste = window.getSelection();
    if (selPaste && selPaste.rangeCount > 0 && selectionInsideNonEditableWebShell(el, selPaste.getRangeAt(0))) {
      e.preventDefault();
      return;
    }
    const items = e.clipboardData?.items;
    if (items) {
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            void processAndInsertImage(file);
          }
          return;
        }
      }
    }
    e.preventDefault();
    const plainFromClipboard = e.clipboardData.getData("text/plain") || "";
    const htmlFromClipboard = e.clipboardData.getData("text/html") || "";
    let text = plainFromClipboard;
    if (!text && htmlFromClipboard) {
      const tmp = document.createElement("div");
      tmp.innerHTML = htmlFromClipboard;
      text = tmp.innerText || tmp.textContent || "";
    }
    // Hard sanitize pasted payload: keep only printable text and line breaks.
    text = text
      .replace(/\u00A0/g, " ")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/\u2028|\u2029/g, "\n");

    el.focus();
    const selection = window.getSelection();
    if (!selection) return;
    if (savedRangeRef.current) {
      try {
        if (el.contains(savedRangeRef.current.commonAncestorContainer)) {
          selection.removeAllRanges();
          selection.addRange(savedRangeRef.current);
        }
      } catch {
        // ignore
      }
    }
    if (selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    range.deleteContents();

    const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const lines = normalized.split("\n");
    const fragment = document.createDocumentFragment();
    let lastInserted: Node | null = null;
    lines.forEach((line, idx) => {
      if (line.length > 0) {
        const textNode = document.createTextNode(line);
        fragment.appendChild(textNode);
        lastInserted = textNode;
      }
      if (idx < lines.length - 1) {
        const br = document.createElement("br");
        fragment.appendChild(br);
        lastInserted = br;
      }
    });
    if (!lastInserted) {
      lastInserted = document.createElement("br");
      fragment.appendChild(lastInserted);
    }
    range.insertNode(fragment);
    selection.removeAllRanges();
    const caretRange = document.createRange();
    caretRange.setStartAfter(lastInserted);
    caretRange.collapse(true);
    selection.addRange(caretRange);
    savedRangeRef.current = caretRange.cloneRange();

    normalizeListContent();
    normalizeOlStartNumbers();
    normalizeTableCells();
    setContentHtml(el.innerHTML);
    syncMarkerBold();
    el.dispatchEvent(new Event("input", { bubbles: true }));
    setTimeout(updateToolbarState, 0);
  }

  async function handleSave() {
    if (!title.trim() || !slug.trim()) {
      setError("Введите название и служебный адрес");
      return;
    }

    try {
      flushScheduledEditorHtmlStateSync();
      const liveHtml = editorRef.current?.innerHTML ?? contentHtml;
      const liveHtmlWebp = await normalizeHtmlInlineImagesToWebp(liveHtml);
      if (liveHtmlWebp !== liveHtml) {
        setContentHtml(liveHtmlWebp);
      }
      setSaving(true);
      setError(null);
      setSuccess(null);
      await apiPut(`/api/pages/${pageId}`, {
        title: title.trim(),
        slug: slug.trim(),
        text: stripCoverEditorChromeFromHtml(
          rewriteCoverButtonSpansToAnchorsForPublish(liveHtmlWebp),
        ),
      });
      setSuccess("Изменения сохранены");
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError("Не удалось сохранить страницу");
    } finally {
      setSaving(false);
    }
  }


  useLayoutEffect(() => {
    webCoverNativeInputRef.current.beforeInput = (e: InputEvent) => {
      const ed = editorRef.current;
      if (!ed) return;
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      if (!ed.contains(range.commonAncestorContainer)) return;
      if (tryPreventWebCoverNonDeleteInput(ed, range, e.inputType)) {
        e.preventDefault();
        return;
      }
      if (e.inputType === "deleteContentBackward" && range.collapsed) {
        if (tryHandleWebCoverBackspace(ed, range)) e.preventDefault();
        return;
      }
      if (e.inputType === "deleteContentForward" && range.collapsed) {
        if (tryHandleWebCoverForwardBlock(ed, range)) e.preventDefault();
      }
    };
    webCoverNativeInputRef.current.keyDown = (e: KeyboardEvent) => {
      if (e.key !== "Backspace" && e.key !== "Delete") return;
      const ed = editorRef.current;
      if (!ed) return;
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      if (!range.collapsed) return;
      if (!ed.contains(range.commonAncestorContainer)) return;
      if (e.key === "Backspace") {
        if (tryHandleWebCoverBackspace(ed, range)) {
          e.preventDefault();
          e.stopPropagation();
        }
        return;
      }
      if (tryHandleWebCoverForwardBlock(ed, range)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
  });

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const onBeforeInput = (e: Event) => webCoverNativeInputRef.current.beforeInput(e as InputEvent);
    const onKeyDown = (e: Event) => webCoverNativeInputRef.current.keyDown(e as KeyboardEvent);
    el.addEventListener("beforeinput", onBeforeInput, { capture: true });
    el.addEventListener("keydown", onKeyDown, { capture: true });
    return () => {
      el.removeEventListener("beforeinput", onBeforeInput, { capture: true });
      el.removeEventListener("keydown", onKeyDown, { capture: true });
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {success && (
        <div
          className="fixed right-6 top-[4.5rem] z-50 flex items-center gap-2 rounded border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 shadow-md"
          role="status"
          aria-live="polite"
        >
          <span>{success}</span>
          <button
            type="button"
            onClick={() => setSuccess(null)}
            className="-mr-1 rounded p-0.5 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-900"
            aria-label="Закрыть"
          >
            <XMarkIcon className="h-3 w-3 [stroke-width:2.2]" />
          </button>
        </div>
      )}
      {tableWidthModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-3 backdrop-blur-sm"
          onClick={() => setTableWidthModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Ширина столбцов"
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl ring-1 ring-slate-200 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <span
              className="absolute right-2 top-2 inline-flex h-5 w-5 cursor-pointer items-center justify-center text-slate-500 transition-colors hover:text-[#496db3]"
              onClick={() => setTableWidthModalOpen(false)}
              role="button"
              aria-label="Закрыть"
            >
              <XMarkIcon className="h-4 w-4 [stroke-width:2.2]" />
            </span>
            <div className="mt-4 grid grid-cols-1 gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-semibold text-slate-700">Ширина столбцов</span>
                <input
                  ref={tableWidthModalInputRef}
                  value={tableWidthModalValue}
                  onChange={(e) => setTableWidthModalValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (tableWidthModalValue.trim()) {
                        applyTableWidth(tableWidthModalValue.trim());
                        setTableWidthModalOpen(false);
                      }
                    }
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#496db3] focus:ring-1 focus:ring-[#496db3]"
                  placeholder="Например: 150"
                />
              </label>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                onClick={() => setTableWidthModalOpen(false)}
              >
                Отмена
              </button>
              <button
                type="button"
                className="inline-flex rounded-full bg-[#496db3] px-4 py-1.5 text-xs font-medium text-white hover:brightness-105 disabled:opacity-60"
                onClick={() => {
                  if (tableWidthModalValue.trim()) {
                    applyTableWidth(tableWidthModalValue.trim());
                    setTableWidthModalOpen(false);
                  }
                }}
                disabled={!tableWidthModalValue.trim()}
              >
                Применить
              </button>
            </div>
          </div>
        </div>
      )}
      {coverButtonLinkModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-3 backdrop-blur-sm"
          onClick={() => setCoverButtonLinkModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Ссылка кнопки обложки"
        >
          <div
            className="relative w-full max-w-md rounded-2xl bg-white p-4 shadow-xl ring-1 ring-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <span
              className="absolute right-2 top-2 inline-flex h-5 w-5 cursor-pointer items-center justify-center text-slate-500 transition-colors hover:text-[#496db3]"
              onClick={() => setCoverButtonLinkModalOpen(false)}
              role="button"
              aria-label="Закрыть"
            >
              <XMarkIcon className="h-4 w-4 [stroke-width:2.2]" />
            </span>
            <div className="mt-4 grid grid-cols-1 gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-semibold text-slate-700">Ссылка кнопки</span>
                <input
                  ref={coverButtonLinkModalInputRef}
                  value={coverButtonLinkModalValue}
                  onChange={(e) => setCoverButtonLinkModalValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      applyCoverButtonLinkAndClose();
                    }
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#496db3] focus:ring-1 focus:ring-[#496db3]"
                  placeholder="https://example.com или callback://open"
                />
              </label>
              <button
                type="button"
                className="inline-flex w-fit rounded-full border border-[#496db3]/30 bg-[#496db3]/5 px-3 py-1.5 text-xs font-semibold text-[#496db3] hover:bg-[#496db3]/10"
                onClick={() => setCoverButtonLinkModalValue(CALLBACK_FORM_LINK)}
              >
                Подключить форму обратной связи
              </button>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                onClick={() => setCoverButtonLinkModalOpen(false)}
              >
                Отмена
              </button>
              <button
                type="button"
                className="inline-flex rounded-full bg-[#496db3] px-4 py-1.5 text-xs font-medium text-white hover:brightness-105"
                onClick={applyCoverButtonLinkAndClose}
              >
                Применить
              </button>
            </div>
          </div>
        </div>
      )}
      {tableRowHeightModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-3 backdrop-blur-sm"
          onClick={() => setTableRowHeightModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Высота строки"
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl ring-1 ring-slate-200 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <span
              className="absolute right-2 top-2 inline-flex h-5 w-5 cursor-pointer items-center justify-center text-slate-500 transition-colors hover:text-[#496db3]"
              onClick={() => setTableRowHeightModalOpen(false)}
              role="button"
              aria-label="Закрыть"
            >
              <XMarkIcon className="h-4 w-4 [stroke-width:2.2]" />
            </span>
            <div className="mt-4 grid grid-cols-1 gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-semibold text-slate-700">Высота строки</span>
                <input
                  ref={tableRowHeightModalInputRef}
                  value={tableRowHeightModalValue}
                  onChange={(e) => setTableRowHeightModalValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (tableRowHeightModalValue.trim()) {
                        applyTableRowHeight(tableRowHeightModalValue.trim());
                        setTableRowHeightModalOpen(false);
                      }
                    }
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#496db3] focus:ring-1 focus:ring-[#496db3]"
                  placeholder="Например: 36px, 2em"
                />
              </label>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                onClick={() => setTableRowHeightModalOpen(false)}
              >
                Отмена
              </button>
              <button
                type="button"
                className="inline-flex rounded-full bg-[#496db3] px-4 py-1.5 text-xs font-medium text-white hover:brightness-105 disabled:opacity-60"
                onClick={() => {
                  if (tableRowHeightModalValue.trim()) {
                    applyTableRowHeight(tableRowHeightModalValue.trim());
                    setTableRowHeightModalOpen(false);
                  }
                }}
                disabled={!tableRowHeightModalValue.trim()}
              >
                Применить
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        .page-editor ul { --list-marker-color: #000000; }
        ${LIST_COLORS.filter((c) => c.value).map(
          (c) => `.page-editor ul[data-list-color="${c.value}"] { --list-marker-color: ${c.hex}; }`
        ).join("\n")}
        .page-editor ul:not([data-list-style]), .page-editor ul[data-list-style="disc"] { list-style: none; padding-left: 1.5em; }
        .page-editor ul:not([data-list-style]) li::before, .page-editor ul[data-list-style="disc"] li::before { content: ""; display: inline-block; width: 1em; height: 1em; margin-right: 0.35em; margin-left: -1.5em; vertical-align: -0.15em; font-size: var(--marker-font-size, 1em); background-color: var(--list-marker-color); -webkit-mask-image: url("data:image/svg+xml,${LIST_MARKER_SVG.disc}"); mask-image: url("data:image/svg+xml,${LIST_MARKER_SVG.disc}"); -webkit-mask-size: contain; mask-size: contain; -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat; -webkit-mask-position: center; mask-position: center; }
        .page-editor ul[data-list-style="circle"] { list-style: none; padding-left: 1.5em; }
        .page-editor ul[data-list-style="circle"] li::before { content: ""; display: inline-block; width: 1em; height: 1em; margin-right: 0.35em; margin-left: -1.5em; vertical-align: -0.15em; font-size: var(--marker-font-size, 1em); background-color: var(--list-marker-color); -webkit-mask-image: url("data:image/svg+xml,${LIST_MARKER_SVG.circle}"); mask-image: url("data:image/svg+xml,${LIST_MARKER_SVG.circle}"); -webkit-mask-size: contain; mask-size: contain; -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat; -webkit-mask-position: center; mask-position: center; }
        .page-editor ul[data-list-style="square"] { list-style: none; padding-left: 1.5em; }
        .page-editor ul[data-list-style="square"] li::before { content: ""; display: inline-block; width: 1em; height: 1em; margin-right: 0.35em; margin-left: -1.5em; vertical-align: -0.15em; font-size: var(--marker-font-size, 1em); background-color: var(--list-marker-color); -webkit-mask-image: url("data:image/svg+xml,${LIST_MARKER_SVG.square}"); mask-image: url("data:image/svg+xml,${LIST_MARKER_SVG.square}"); -webkit-mask-size: contain; mask-size: contain; -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat; -webkit-mask-position: center; mask-position: center; }
        .page-editor ul[data-list-style="check"] { list-style: none; padding-left: 1.5em; }
        .page-editor ul[data-list-style="check"] li::before { content: ""; display: inline-block; width: 1em; height: 1em; margin-right: 0.35em; margin-left: -1.5em; vertical-align: -0.15em; font-size: var(--marker-font-size, 1em); background-color: var(--list-marker-color); -webkit-mask-image: url("data:image/svg+xml,${LIST_MARKER_SVG.check}"); mask-image: url("data:image/svg+xml,${LIST_MARKER_SVG.check}"); -webkit-mask-size: contain; mask-size: contain; -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat; -webkit-mask-position: center; mask-position: center; }
        .page-editor ul[data-list-style="check-circle"] { list-style: none; padding-left: 1.5em; }
        .page-editor ul[data-list-style="check-circle"] li::before { content: ""; display: inline-block; width: 1em; height: 1em; margin-right: 0.35em; margin-left: -1.5em; vertical-align: -0.15em; font-size: var(--marker-font-size, 1em); background-color: var(--list-marker-color); -webkit-mask-image: url("data:image/svg+xml,${LIST_MARKER_SVG["check-circle"]}"); mask-image: url("data:image/svg+xml,${LIST_MARKER_SVG["check-circle"]}"); -webkit-mask-size: contain; mask-size: contain; -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat; -webkit-mask-position: center; mask-position: center; }
        .page-editor ul[data-list-style="dash"] { list-style: none; padding-left: 1.5em; }
        .page-editor ul[data-list-style="dash"] li::before { content: ""; display: inline-block; width: 1em; height: 1em; margin-right: 0.35em; margin-left: -1.5em; vertical-align: -0.15em; font-size: var(--marker-font-size, 1em); background-color: var(--list-marker-color); -webkit-mask-image: url("data:image/svg+xml,${LIST_MARKER_SVG.dash}"); mask-image: url("data:image/svg+xml,${LIST_MARKER_SVG.dash}"); -webkit-mask-size: contain; mask-size: contain; -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat; -webkit-mask-position: center; mask-position: center; }
        .page-editor ul[data-list-style="arrow"] { list-style: none; padding-left: 1.5em; }
        .page-editor ul[data-list-style="arrow"] li::before { content: ""; display: inline-block; width: 1em; height: 1em; margin-right: 0.35em; margin-left: -1.5em; vertical-align: -0.15em; font-size: var(--marker-font-size, 1em); background-color: var(--list-marker-color); -webkit-mask-image: url("data:image/svg+xml,${LIST_MARKER_SVG.arrow}"); mask-image: url("data:image/svg+xml,${LIST_MARKER_SVG.arrow}"); -webkit-mask-size: contain; mask-size: contain; -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat; -webkit-mask-position: center; mask-position: center; }
        .page-editor ul[data-list-style="arrow-right"] { list-style: none; padding-left: 1.5em; }
        .page-editor ul[data-list-style="arrow-right"] li::before { content: ""; display: inline-block; width: 1em; height: 1em; margin-right: 0.35em; margin-left: -1.5em; vertical-align: -0.15em; font-size: var(--marker-font-size, 1em); background-color: var(--list-marker-color); -webkit-mask-image: url("data:image/svg+xml,${LIST_MARKER_SVG["arrow-right"]}"); mask-image: url("data:image/svg+xml,${LIST_MARKER_SVG["arrow-right"]}"); -webkit-mask-size: contain; mask-size: contain; -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat; -webkit-mask-position: center; mask-position: center; }
        .page-editor ul[data-list-style="star"] { list-style: none; padding-left: 1.5em; }
        .page-editor ul[data-list-style="star"] li::before { content: ""; display: inline-block; width: 1em; height: 1em; margin-right: 0.35em; margin-left: -1.5em; vertical-align: -0.15em; font-size: var(--marker-font-size, 1em); background-color: var(--list-marker-color); -webkit-mask-image: url("data:image/svg+xml,${LIST_MARKER_SVG.star}"); mask-image: url("data:image/svg+xml,${LIST_MARKER_SVG.star}"); -webkit-mask-size: contain; mask-size: contain; -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat; -webkit-mask-position: center; mask-position: center; }
        .page-editor ul[data-list-style="heart"] { list-style: none; padding-left: 1.5em; }
        .page-editor ul[data-list-style="heart"] li::before { content: ""; display: inline-block; width: 1em; height: 1em; margin-right: 0.35em; margin-left: -1.5em; vertical-align: -0.15em; font-size: var(--marker-font-size, 1em); background-color: var(--list-marker-color); -webkit-mask-image: url("data:image/svg+xml,${LIST_MARKER_SVG.heart}"); mask-image: url("data:image/svg+xml,${LIST_MARKER_SVG.heart}"); -webkit-mask-size: contain; mask-size: contain; -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat; -webkit-mask-position: center; mask-position: center; }
        .page-editor ul[data-list-style="bolt"] { list-style: none; padding-left: 1.5em; }
        .page-editor ul[data-list-style="bolt"] li::before { content: ""; display: inline-block; width: 1em; height: 1em; margin-right: 0.35em; margin-left: -1.5em; vertical-align: -0.15em; font-size: var(--marker-font-size, 1em); background-color: var(--list-marker-color); -webkit-mask-image: url("data:image/svg+xml,${LIST_MARKER_SVG.bolt}"); mask-image: url("data:image/svg+xml,${LIST_MARKER_SVG.bolt}"); -webkit-mask-size: contain; mask-size: contain; -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat; -webkit-mask-position: center; mask-position: center; }
        .page-editor ul[data-list-style="none"] { list-style: none; padding-left: 1.5em; }
        .page-editor ul[data-list-style="none"] li::before { content: none; }
        .page-editor ol { list-style: none; padding-left: 0; margin: 0.35em 0; margin-left: 0; --list-marker-color: #000000; }
        ${LIST_COLORS.filter((c) => c.value).map(
          (c) => `.page-editor ol[data-list-color="${c.value}"] { --list-marker-color: ${c.hex}; }`
        ).join("\n")}
        .page-editor ol > li { position: relative; list-style: none; padding-left: 2.75em; margin: 0.12em 0; min-height: 1.35em; box-sizing: border-box; }
        .page-editor ol > li::before { position: absolute; left: 0; top: 0; width: 2.35em; text-align: right; padding-right: 0.45em; box-sizing: border-box; content: attr(data-list-num); color: var(--marker-color, var(--list-marker-color)); font-size: var(--marker-font-size, 1em); line-height: inherit; font-weight: inherit; pointer-events: none; }
        .page-editor ol > li[data-marker-bold]::before { font-weight: bold; }
        .page-editor .page-editor-table { border-collapse: collapse; width: 100%; margin: 0.5em 0; table-layout: auto; }
        .page-editor .page-editor-table:has(td[data-cell-width]) { table-layout: fixed; width: auto; max-width: 100%; }
        .page-editor .page-editor-table:has(td[data-cell-width]) td { min-width: 0; }
        .page-editor .page-editor-table tr { height: auto; }
        .page-editor .page-editor-table td { padding: 0.25rem 0.5rem; min-width: 4rem; user-select: none; -webkit-user-select: none; box-sizing: border-box; }
        .page-editor .page-editor-table td[contenteditable="true"] { user-select: text; -webkit-user-select: text; }
        .page-editor .page-editor-table:not([data-table-border]) td,
        .page-editor .page-editor-table[data-table-border="solid"] td { border: var(--table-border-width, 1px) solid var(--table-border-color, #e2e8f0); }
        .page-editor .page-editor-table[data-table-border="dashed"] td { border: var(--table-border-width, 1px) dashed var(--table-border-color, #e2e8f0); }
        .page-editor .page-editor-table[data-table-border="dotted"] td { border: var(--table-border-width, 1px) dotted var(--table-border-color, #e2e8f0); }
        .page-editor .page-editor-table[data-table-border="double"] td { border: var(--table-border-width, 3px) double var(--table-border-color, #e2e8f0); }
        .page-editor .page-editor-table[data-table-border="none"] td { border: none; }
        .page-editor .page-editor-table td[data-cell-selected] { background-color: #e0e7ff; }
        .page-editor .page-editor-table[data-table-align="left"] { margin-left: 0; margin-right: auto; }
        .page-editor .page-editor-table[data-table-align="center"] { margin-left: auto; margin-right: auto; }
        .page-editor .page-editor-table[data-table-align="right"] { margin-left: auto; margin-right: 0; }
        .page-editor .page-editor-image-wrapper { display: inline-block; position: relative; margin: 0.25em 0; max-width: 100%; overflow: visible; }
        .page-editor .page-editor-image-wrapper[data-image-align="left"] { display: block; width: fit-content; max-width: 100%; margin-left: 0; margin-right: auto; }
        .page-editor .page-editor-image-wrapper[data-image-align="center"] { display: block; width: fit-content; max-width: 100%; margin-left: auto; margin-right: auto; }
        .page-editor .page-editor-image-wrapper[data-image-align="right"] { display: block; width: fit-content; max-width: 100%; margin-left: auto; margin-right: 0; }
        .page-editor .page-editor-table td .page-editor-image-wrapper { display: inline-block; width: auto; max-width: 100%; margin: 0; box-sizing: border-box; vertical-align: top; }
        .page-editor .page-editor-table td .page-editor-image-wrapper .page-editor-image { max-width: 100% !important; height: auto; }
        .page-editor .page-editor-table td .page-editor-image-resize-n { top: 0; }
        .page-editor .page-editor-table td .page-editor-image-resize-s { bottom: 0; }
        .page-editor .page-editor-table td .page-editor-image-resize-e { right: 0; }
        .page-editor .page-editor-table td .page-editor-image-resize-w { left: 0; }
        .page-editor .page-editor-table td .page-editor-image-resize-ne { top: 0; right: 0; }
        .page-editor .page-editor-table td .page-editor-image-resize-nw { top: 0; left: 0; }
        .page-editor .page-editor-table td .page-editor-image-resize-se { bottom: 0; right: 0; }
        .page-editor .page-editor-table td .page-editor-image-resize-sw { bottom: 0; left: 0; }
        .page-editor .page-editor-image-wrapper::after { content: ""; position: absolute; inset: 0; border: 2px solid #2563eb; border-radius: 2px; pointer-events: none; opacity: 0; }
        .page-editor .page-editor-image-wrapper[data-image-selected]::after { opacity: 1; }
        .page-editor .page-editor-image-wrapper .page-editor-image { vertical-align: bottom; }
        .page-editor .page-editor-image-resize { position: absolute; width: 10px; height: 10px; background: #496db3; border: 1px solid white; border-radius: 50%; opacity: 0; pointer-events: none; box-shadow: 0 0 2px rgba(0,0,0,0.3); }
        .page-editor .page-editor-image-wrapper[data-image-selected] .page-editor-image-resize { opacity: 0.9; pointer-events: auto; }
        .page-editor .page-editor-image-wrapper[data-image-selected] .page-editor-image-resize:hover { opacity: 1; }
        .page-editor .page-editor-image-resize-n { top: -5px; left: 50%; margin-left: -5px; cursor: n-resize; }
        .page-editor .page-editor-image-resize-s { bottom: -5px; left: 50%; margin-left: -5px; cursor: s-resize; }
        .page-editor .page-editor-image-resize-e { right: -5px; top: 50%; margin-top: -5px; cursor: e-resize; }
        .page-editor .page-editor-image-resize-w { left: -5px; top: 50%; margin-top: -5px; cursor: w-resize; }
        .page-editor .page-editor-image-resize-ne { top: -5px; right: -5px; cursor: ne-resize; }
        .page-editor .page-editor-image-resize-nw { top: -5px; left: -5px; cursor: nw-resize; }
        .page-editor .page-editor-image-resize-se { bottom: -5px; right: -5px; cursor: se-resize; }
        .page-editor .page-editor-image-resize-sw { bottom: -5px; left: -5px; cursor: sw-resize; }
        .page-editor .page-web-cover { position: relative; display: flex; flex-direction: column; width: 100%; max-width: 100%; margin: 1rem 0; padding: 1.25rem 1.5rem; border-radius: 12px; background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 45%, #f8fafc 100%); border: 1px solid #cbd5e1; box-sizing: border-box; overflow: visible; user-select: none; -webkit-user-select: none; }
        .page-editor .page-web-cover.page-web-cover-has-bg { background-color: #e2e8f0; }
        .page-editor .page-web-cover[data-cover-aspect="16-9"],
        .page-editor .page-web-cover:not([data-cover-aspect]) { aspect-ratio: 16 / 9; }
        .page-editor .page-web-cover[data-cover-aspect="4-3"] { aspect-ratio: 4 / 3; }
        .page-editor .page-web-cover[data-cover-aspect="21-9"] { aspect-ratio: 21 / 9; }
        .page-editor .page-web-cover[data-cover-aspect="1-1"] { aspect-ratio: 1 / 1; }
        /* 1-8 / 1-4: в меню «1/8», «1/4» = доля высоты от ширины → горизонтальные баннеры (не 1/8 по оси). */
        .page-editor .page-web-cover[data-cover-aspect="1-8"] { aspect-ratio: 2 / 1; }
        .page-editor .page-web-cover[data-cover-aspect="1-4"] { aspect-ratio: 4 / 1; }
        .page-editor .page-web-cover[data-cover-aspect="3-1"] { aspect-ratio: 3 / 1; }
        .page-editor .page-web-cover[data-cover-aspect="8-1"] { aspect-ratio: 8 / 1; }
        .page-editor .page-web-cover-inner { flex: 1; min-height: 0; max-width: 100%; width: 100%; outline: none; overflow: hidden; display: flex; flex-direction: column; padding-left: 2.25rem; padding-right: 1rem; box-sizing: border-box; user-select: text; -webkit-user-select: text; }
        .page-editor .page-web-cover-inner[contenteditable="false"] { cursor: pointer; }
        .page-editor .page-web-cover[data-cover-halign="left"] .page-web-cover-inner,
        .page-editor .page-web-cover:not([data-cover-halign]) .page-web-cover-inner { align-items: flex-start; text-align: left; }
        .page-editor .page-web-cover[data-cover-halign="center"] .page-web-cover-inner { align-items: center; text-align: center; }
        .page-editor .page-web-cover[data-cover-halign="right"] .page-web-cover-inner { align-items: flex-end; text-align: right; }
        .page-editor .page-web-cover[data-cover-valign="top"] .page-web-cover-inner,
        .page-editor .page-web-cover:not([data-cover-valign]) .page-web-cover-inner { justify-content: flex-start; }
        .page-editor .page-web-cover[data-cover-valign="middle"] .page-web-cover-inner { justify-content: center; }
        .page-editor .page-web-cover[data-cover-valign="bottom"] .page-web-cover-inner { justify-content: flex-end; }
        .page-editor .page-web-cover-el-title { margin: 0 0 0.35rem; font-size: clamp(1.25rem, 3vw, 1.75rem); font-weight: 700; color: #0f172a; line-height: 1.2; }
        .page-editor .page-web-cover-el-subtitle { margin: 0 0 0.75rem; font-size: 0.95rem; color: #475569; line-height: 1.45; max-width: 36rem; }
        .page-editor .page-web-cover-el-button-wrap { margin: 0; }
        .page-editor .page-web-cover-el-button { display: inline-flex; align-items: center; justify-content: center; padding: 0.45rem 1rem; font-size: 0.875rem; font-weight: 600; color: #fff; background: #496db3; border-radius: 9999px; text-decoration: none; cursor: pointer; box-sizing: border-box; }
        .page-editor .page-web-cover-el-button:hover { filter: brightness(1.05); }
        .page-editor .page-web-timeline { --timeline-dot-size: 0.8rem; --timeline-line-size: 2px; --timeline-term-gap: 1.35rem; --timeline-gap: 0.9rem; position: relative; width: 100%; margin: 1rem 0; padding-top: var(--timeline-term-gap); display: grid; grid-template-columns: repeat(var(--timeline-cols, 3), minmax(0, 1fr)); gap: var(--timeline-gap); box-sizing: border-box; }
        .page-editor .page-web-timeline-item { position: relative; min-height: 1.5rem; padding-top: calc(var(--timeline-dot-size) + 0.35rem); }
        .page-editor .page-web-timeline-item::before { content: none; }
        .page-editor .page-web-timeline-item ~ .page-web-timeline-item::before { content: ""; position: absolute; top: calc(var(--timeline-dot-size) / 2 - var(--timeline-line-size) / 2); left: calc(-50% - var(--timeline-gap)); width: calc(100% + var(--timeline-gap)); height: var(--timeline-line-size); background: #cbd5e1; pointer-events: none; z-index: 1; }
        .page-editor .page-web-timeline-term { position: absolute; left: calc(0px - (var(--timeline-gap) / 2)); top: calc((var(--timeline-dot-size) / 2) - var(--timeline-term-gap)); transform: translateX(-50%); margin: 0; padding: 0 0.45rem; font-size: 0.75rem; font-weight: 600; color: #64748b; line-height: 1.25; white-space: nowrap; background: #fff; }
        .page-editor .page-web-timeline-dot { position: absolute; left: 50%; top: 0; transform: translateX(-50%); width: var(--timeline-dot-size); height: var(--timeline-dot-size); border-radius: 9999px; background: #496db3; box-shadow: 0 0 0 3px #e2e8f0; z-index: 2; }
        .page-editor .page-web-timeline-content { display: flex; flex-direction: column; align-items: center; gap: 0.2rem; padding-left: 0; text-align: center; }
        .page-editor .page-web-timeline-title { margin: 0; font-size: 0.95rem; font-weight: 700; color: #0f172a; line-height: 1.35; text-align: center; }
        .page-editor .page-web-timeline-text { margin: 0; font-size: 0.9rem; color: #475569; line-height: 1.5; text-align: center; }
        @media (max-width: 767px) {
          .page-editor .page-web-timeline { grid-template-columns: 1fr; --timeline-gap: 1rem; }
          .page-editor .page-web-timeline-item { min-height: 0; padding-top: 0; padding-left: 1.5rem; }
          .page-editor .page-web-timeline-item::before { content: none; }
          .page-editor .page-web-timeline-item ~ .page-web-timeline-item::before { content: none; }
          .page-editor .page-web-timeline-item:not(:last-of-type)::before { content: ""; position: absolute; left: calc(var(--timeline-dot-size) / 2 - var(--timeline-line-size) / 2); top: calc(0.2rem + (var(--timeline-dot-size) / 2) - (var(--timeline-line-size) / 2)); width: var(--timeline-line-size); height: calc(100% + var(--timeline-gap)); background: #cbd5e1; pointer-events: none; z-index: 1; }
          .page-editor .page-web-timeline-dot { left: 0; top: 0.2rem; transform: none; }
          .page-editor .page-web-timeline-term { position: static; transform: none; margin: 0 0 0.35rem; padding: 0; background: transparent; text-align: left; }
          .page-editor .page-web-timeline-content { align-items: flex-start; text-align: left; }
          .page-editor .page-web-timeline-title,
          .page-editor .page-web-timeline-text { text-align: left; }
        }
        .page-editor .page-web-timeline-toolbar { position: absolute; left: 0; right: auto; top: -2.25rem; z-index: 80; width: max-content; pointer-events: auto; user-select: none; -webkit-user-select: none; }
        .page-editor .page-web-timeline-menu-trigger { display: flex; width: 28px; height: 28px; align-items: center; justify-content: center; border-radius: 6px; border: 1px solid #cbd5e1; background: rgba(255,255,255,0.95); color: #64748b; cursor: pointer; padding: 0; }
        .page-editor .page-web-timeline-menu-trigger:hover { border-color: #94a3b8; color: #0f172a; background: #fff; }
        .page-editor .page-web-timeline-menu-dots::before { content: "\\22EE"; font-size: 1rem; line-height: 1; }
        .page-editor .page-web-timeline-menu-dropdown { display: none; position: absolute; left: 0; right: auto; top: calc(100% + 4px); min-width: 14rem; padding: 4px 0; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 10px 24px rgba(15,23,42,0.12); z-index: 90; }
        .page-editor .page-web-timeline-toolbar[data-menu-open="1"] .page-web-timeline-menu-dropdown { display: block; }
        .page-editor .page-web-timeline-menu-add-step,
        .page-editor .page-web-timeline-menu-remove-step { display: block; width: 100%; box-sizing: border-box; text-align: left; padding: 8px 12px; font-size: 13px; font-weight: 500; color: #0f172a; background: transparent; border: none; cursor: pointer; border-radius: 4px; white-space: nowrap; }
        .page-editor .page-web-timeline-menu-add-step:hover,
        .page-editor .page-web-timeline-menu-remove-step:hover { background: #f1f5f9; }
        .page-editor .page-web-timeline-menu-sep { height: 1px; margin: 6px 8px; background: #e2e8f0; pointer-events: none; }
        .page-editor .page-web-timeline-menu-delete { display: block; width: 100%; box-sizing: border-box; text-align: left; padding: 8px 12px; font-size: 13px; font-weight: 500; color: #b91c1c; background: transparent; border: none; cursor: pointer; border-radius: 4px; white-space: nowrap; }
        .page-editor .page-web-timeline-menu-delete:hover { background: #fef2f2; }
        /* Поверх градиента обложки, вне потока — не сдвигает текст редактора */
        .page-editor .page-web-cover-toolbar { position: absolute; left: 8px; top: 50%; right: auto; margin: 0; z-index: 10; transform: translateY(-50%); width: max-content; pointer-events: auto; user-select: none; -webkit-user-select: none; }
        .page-editor .page-web-cover-menu-trigger { display: flex; width: 28px; height: 28px; align-items: center; justify-content: center; border-radius: 6px; border: 1px solid #cbd5e1; background: rgba(255,255,255,0.95); color: #64748b; cursor: pointer; user-select: none; -webkit-user-select: none; padding: 0; }
        .page-editor .page-web-cover-menu-trigger:hover { border-color: #94a3b8; color: #0f172a; background: #fff; }
        .page-editor .page-web-cover-menu-dots { display: inline-block; font-size: 1rem; line-height: 1; transform: translateY(-1px); }
        .page-editor .page-web-cover-menu-dots::before { content: "\u22EE"; }
        .page-editor .page-web-cover-menu-dropdown { display: none; position: absolute; left: 0; top: calc(100% + 4px); width: max-content; min-width: 0; max-width: min(14rem, calc(100vw - 2rem)); padding: 4px 0; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 10px 24px rgba(15,23,42,0.12); z-index: 20; }
        .page-editor .page-web-cover-toolbar[data-menu-open="1"] .page-web-cover-menu-dropdown { display: block; }
        .page-editor .page-web-cover-menu-sub { position: relative; }
        .page-editor .page-web-cover-menu-sub-trigger { display: flex; width: 100%; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 12px; font-size: 13px; font-weight: 500; color: #0f172a; background: transparent; border: none; cursor: pointer; border-radius: 4px; text-align: left; }
        .page-editor .page-web-cover-menu-sub-trigger:hover { background: #f1f5f9; }
        .page-editor .page-web-cover-menu-sub-label { flex: 1; min-width: 0; }
        .page-editor .page-web-cover-menu-chevron { flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; width: 1.25rem; color: #64748b; font-size: 1rem; line-height: 1; transition: transform 0.15s ease; }
        .page-editor .page-web-cover-menu-chevron::before { content: "\\203A"; }
        .page-editor .page-web-cover-menu-sub[data-submenu-open="1"] .page-web-cover-menu-chevron { transform: rotate(90deg); }
        .page-editor .page-web-cover-menu-sub-panel { display: none; position: absolute; left: calc(100% + 4px); top: 0; padding: 10px; min-width: 0; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 10px 24px rgba(15,23,42,0.12); z-index: 30; }
        .page-editor .page-web-cover-menu-sub[data-submenu-open="1"] .page-web-cover-menu-sub-panel { display: block; }
        .page-editor .page-web-cover-elements-panel { display: none; flex-direction: column; gap: 2px; padding: 6px; min-width: 11rem; box-sizing: border-box; }
        .page-editor .page-web-cover-menu-sub[data-submenu-open="1"] .page-web-cover-elements-panel { display: flex; }
        .page-editor .page-web-cover-menu-insert-cover-el { display: block; width: 100%; box-sizing: border-box; text-align: left; padding: 8px 12px; font-size: 13px; font-weight: 500; color: #0f172a; background: transparent; border: none; cursor: pointer; border-radius: 4px; white-space: nowrap; }
        .page-editor .page-web-cover-menu-insert-cover-el:hover { background: #f1f5f9; }
        .page-editor .page-web-cover-aspect-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; width: 156px; box-sizing: border-box; }
        .page-editor .page-web-cover-menu-aspect { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; width: 100%; box-sizing: border-box; margin: 0; padding: 6px 2px; text-align: center; font-size: 10px; font-weight: 600; line-height: 1.1; color: #0f172a; background: transparent; border: none; cursor: pointer; border-radius: 6px; }
        .page-editor .page-web-cover-menu-aspect:hover { background: #f1f5f9; }
        .page-editor .page-web-cover-menu-aspect-preview { display: flex; align-items: center; justify-content: center; width: 100%; min-height: 30px; }
        .page-editor .page-web-cover-menu-aspect-svg { display: block; flex-shrink: 0; }
        .page-editor .page-web-cover-menu-aspect-label { display: block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 10px; font-weight: 600; color: #334155; }
        .page-editor .page-web-cover[data-cover-aspect="16-9"] .page-web-cover-menu-aspect[data-set-cover-aspect="16-9"],
        .page-editor .page-web-cover[data-cover-aspect="4-3"] .page-web-cover-menu-aspect[data-set-cover-aspect="4-3"],
        .page-editor .page-web-cover[data-cover-aspect="21-9"] .page-web-cover-menu-aspect[data-set-cover-aspect="21-9"],
        .page-editor .page-web-cover[data-cover-aspect="1-1"] .page-web-cover-menu-aspect[data-set-cover-aspect="1-1"],
        .page-editor .page-web-cover[data-cover-aspect="1-8"] .page-web-cover-menu-aspect[data-set-cover-aspect="1-8"],
        .page-editor .page-web-cover[data-cover-aspect="1-4"] .page-web-cover-menu-aspect[data-set-cover-aspect="1-4"],
        .page-editor .page-web-cover[data-cover-aspect="3-1"] .page-web-cover-menu-aspect[data-set-cover-aspect="3-1"],
        .page-editor .page-web-cover[data-cover-aspect="8-1"] .page-web-cover-menu-aspect[data-set-cover-aspect="8-1"] { background: #f1f5f9; box-shadow: inset 0 0 0 1px #496db3; }
        .page-editor .page-web-cover-menu-sep { height: 1px; margin: 6px 8px; background: #e2e8f0; pointer-events: none; }
        .page-editor .page-web-cover-menu-upload { display: block; width: 100%; box-sizing: border-box; text-align: left; padding: 8px 12px; font-size: 13px; font-weight: 500; color: #0f172a; background: transparent; border: none; cursor: pointer; border-radius: 4px; white-space: nowrap; }
        .page-editor .page-web-cover-menu-upload:hover { background: #f1f5f9; }
        .page-editor .page-web-cover-menu-align-bg { display: block; width: 100%; box-sizing: border-box; text-align: left; padding: 8px 12px; font-size: 13px; font-weight: 500; color: #0f172a; background: transparent; border: none; cursor: pointer; border-radius: 4px; white-space: nowrap; }
        .page-editor .page-web-cover-menu-align-bg:hover { background: #f1f5f9; }
        .page-editor .page-web-cover:not(.page-web-cover-has-bg) .page-web-cover-menu-align-bg { display: none; }
        .page-editor .page-web-cover-menu-delete { display: block; width: 100%; box-sizing: border-box; text-align: left; padding: 8px 12px; font-size: 13px; font-weight: 500; color: #b91c1c; background: transparent; border: none; cursor: pointer; border-radius: 4px; white-space: nowrap; }
        .page-editor .page-web-cover-menu-delete:hover { background: #fef2f2; }
        .page-editor .page-web-carousel { position: relative; width: 100%; max-width: 100%; min-width: 0; margin: 1rem 0; padding-top: 2.25rem; box-sizing: border-box; display: flex; flex-direction: row; flex-wrap: nowrap; align-items: center; gap: 10px; background: transparent; border: none; overflow: visible; user-select: none; -webkit-user-select: none; min-height: 0; caret-color: transparent; }
        .page-editor .page-web-carousel-viewport,
        .page-editor .page-web-carousel-strip,
        .page-editor .page-web-carousel-slide,
        .page-editor .page-web-carousel-slide-inner,
        .page-editor .page-web-carousel-placeholder,
        .page-editor .page-web-carousel-img { user-select: none; -webkit-user-select: none; caret-color: transparent; cursor: default; }
        .page-editor .page-web-carousel-toolbar { position: absolute; left: 0; top: 0; right: auto; z-index: 100; width: max-content; pointer-events: auto; }
        .page-editor .page-web-carousel-menu-trigger { display: flex; width: 28px; height: 28px; align-items: center; justify-content: center; border-radius: 6px; border: 1px solid #cbd5e1; background: rgba(255,255,255,0.95); color: #64748b; cursor: pointer; padding: 0; }
        .page-editor .page-web-carousel-menu-trigger:hover { border-color: #94a3b8; color: #0f172a; background: #fff; }
        .page-editor .page-web-carousel-menu-dots::before { content: "\\22EE"; font-size: 1rem; line-height: 1; }
        .page-editor .page-web-carousel-menu-dropdown { display: none; position: absolute; left: 0; right: auto; top: calc(100% + 4px); min-width: 12rem; padding: 4px 0; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 10px 24px rgba(15,23,42,0.12); z-index: 110; }
        .page-editor .page-web-carousel-toolbar[data-menu-open="1"] .page-web-carousel-menu-dropdown { display: block; }
        .page-editor .page-web-carousel-menu-sub { position: relative; }
        .page-editor .page-web-carousel-menu-sub-trigger { display: flex; width: 100%; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 12px; font-size: 13px; font-weight: 500; color: #0f172a; background: transparent; border: none; cursor: pointer; border-radius: 4px; text-align: left; }
        .page-editor .page-web-carousel-menu-sub-trigger:hover { background: #f1f5f9; }
        .page-editor .page-web-carousel-menu-sub-label { flex: 1; min-width: 0; }
        .page-editor .page-web-carousel-menu-chevron { flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; width: 1.25rem; color: #64748b; font-size: 1rem; line-height: 1; transition: transform 0.15s ease; }
        .page-editor .page-web-carousel-menu-chevron::before { content: "\\203A"; }
        .page-editor .page-web-carousel-menu-sub[data-submenu-open="1"] .page-web-carousel-menu-chevron { transform: rotate(90deg); }
        .page-editor .page-web-carousel-menu-sub-panel { display: none; position: absolute; left: calc(100% + 4px); top: 0; padding: 6px; min-width: 12rem; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 10px 24px rgba(15,23,42,0.12); z-index: 120; }
        .page-editor .page-web-carousel-menu-sub[data-submenu-open="1"] .page-web-carousel-menu-sub-panel { display: block; }
        .page-editor .page-web-carousel-menu-image-type { display: flex; width: 100%; box-sizing: border-box; align-items: center; gap: 8px; text-align: left; padding: 8px 10px; font-size: 13px; font-weight: 500; color: #0f172a; background: transparent; border: none; cursor: pointer; border-radius: 6px; white-space: nowrap; }
        .page-editor .page-web-carousel-menu-image-type:hover { background: #f1f5f9; }
        .page-editor .page-web-carousel-menu-image-type-radio { width: 14px; height: 14px; border-radius: 9999px; border: 1.5px solid #94a3b8; box-sizing: border-box; background: #fff; flex-shrink: 0; }
        .page-editor .page-web-carousel-menu-image-type[aria-checked="true"] .page-web-carousel-menu-image-type-radio { border-color: #496db3; box-shadow: inset 0 0 0 3px #496db3; }
        .page-editor .page-web-carousel-menu-image-type-label { flex: 1; min-width: 0; }
        .page-editor .page-web-carousel-menu-fullscreen,
        .page-editor .page-web-carousel-menu-upload-slide,
        .page-editor .page-web-carousel-menu-add-slide,
        .page-editor .page-web-carousel-menu-remove-slide { display: block; width: 100%; box-sizing: border-box; text-align: left; padding: 8px 12px; font-size: 13px; font-weight: 500; color: #0f172a; background: transparent; border: none; cursor: pointer; border-radius: 4px; white-space: nowrap; }
        .page-editor .page-web-carousel-menu-fullscreen:hover,
        .page-editor .page-web-carousel-menu-upload-slide:hover,
        .page-editor .page-web-carousel-menu-add-slide:hover,
        .page-editor .page-web-carousel-menu-remove-slide:hover { background: #f1f5f9; }
        .page-editor .page-web-carousel-menu-sep { height: 1px; margin: 6px 8px; background: #e2e8f0; pointer-events: none; }
        .page-editor .page-web-carousel-menu-delete { display: block; width: 100%; box-sizing: border-box; text-align: left; padding: 8px 12px; font-size: 13px; font-weight: 500; color: #b91c1c; background: transparent; border: none; cursor: pointer; border-radius: 4px; white-space: nowrap; }
        .page-editor .page-web-carousel-menu-delete:hover { background: #fef2f2; }
        .page-editor .page-web-carousel-arrow { position: relative; flex-shrink: 0; z-index: 1; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 9999px; border: 1px solid #cbd5e1; background: #fff; color: #334155; font-size: 1.25rem; line-height: 1; cursor: pointer; padding: 0; box-shadow: 0 1px 4px rgba(15,23,42,0.08); }
        .page-editor .page-web-carousel-arrow:hover { background: #f8fafc; color: #0f172a; border-color: #94a3b8; }
        .page-editor .page-web-carousel-arrow:disabled { opacity: 0.45; cursor: not-allowed; background: #f8fafc; color: #94a3b8; border-color: #e2e8f0; box-shadow: none; }
        .page-editor .page-web-carousel-prev { order: 1; }
        .page-editor .page-web-carousel-next { order: 3; }
        .page-editor .page-web-carousel-viewport { order: 2; position: relative; z-index: 0; flex: 1 1 0; min-width: 0; width: 100%; max-width: 100%; margin: 0; box-sizing: border-box; border-radius: 8px; background: transparent; min-height: 160px; display: grid; grid-auto-flow: column; grid-auto-columns: calc((100% - 16px) / 3); gap: 8px; overflow-x: auto; overflow-y: visible; scrollbar-width: thin; scrollbar-color: rgba(100, 116, 139, 0.45) transparent; }
        .page-editor .page-web-carousel-viewport:not(:has(.page-web-carousel-strip)) { scroll-snap-type: x mandatory; scroll-snap-stop: always; -webkit-overflow-scrolling: touch; }
        .page-editor .page-web-carousel-viewport:has(.page-web-carousel-strip) { display: block; padding: 14px 0; container-type: inline-size; container-name: web-carousel-vp; overflow-x: hidden; overflow-y: visible; -webkit-overflow-scrolling: touch; scroll-snap-type: none; }
        /* --carousel-inner-px = clientWidth − padding (ставит sync): 3×колонка + 2×gap 8px = ровно видимая ширина. 100cqi — запас, часто ≠ той же области. */
        .page-editor .page-web-carousel-strip { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, var(--carousel-slide-px, calc((max(0px, var(--carousel-inner-px, 100cqi)) - 16px) / 3))); align-items: stretch; gap: 8px; width: max-content; min-width: 100%; box-sizing: border-box; min-height: 0; }
        .page-editor .page-web-carousel[data-carousel-aspect="vertical"] .page-web-carousel-viewport,
        .page-editor .page-web-carousel[data-carousel-aspect="square"] .page-web-carousel-viewport,
        .page-editor .page-web-carousel[data-carousel-aspect="a4"] .page-web-carousel-viewport { grid-auto-columns: calc((100% - 24px) / 4); }
        .page-editor .page-web-carousel[data-carousel-aspect="vertical"] .page-web-carousel-strip,
        .page-editor .page-web-carousel[data-carousel-aspect="square"] .page-web-carousel-strip,
        .page-editor .page-web-carousel[data-carousel-aspect="a4"] .page-web-carousel-strip { grid-auto-columns: minmax(0, var(--carousel-slide-px, calc((max(0px, var(--carousel-inner-px, 100cqi)) - 24px) / 4))); }
        @media (max-width: 1023px) {
          .page-editor .page-web-carousel-viewport { grid-auto-columns: calc((100% - 8px) / 2); }
          .page-editor .page-web-carousel-strip { grid-auto-columns: minmax(0, var(--carousel-slide-px, calc((max(0px, var(--carousel-inner-px, 100cqi)) - 8px) / 2))); }
          .page-editor .page-web-carousel[data-carousel-aspect="vertical"] .page-web-carousel-viewport,
          .page-editor .page-web-carousel[data-carousel-aspect="square"] .page-web-carousel-viewport,
          .page-editor .page-web-carousel[data-carousel-aspect="a4"] .page-web-carousel-viewport { grid-auto-columns: calc((100% - 16px) / 3); }
          .page-editor .page-web-carousel[data-carousel-aspect="vertical"] .page-web-carousel-strip,
          .page-editor .page-web-carousel[data-carousel-aspect="square"] .page-web-carousel-strip,
          .page-editor .page-web-carousel[data-carousel-aspect="a4"] .page-web-carousel-strip { grid-auto-columns: minmax(0, var(--carousel-slide-px, calc((max(0px, var(--carousel-inner-px, 100cqi)) - 16px) / 3))); }
        }
        @media (max-width: 767px) {
          .page-editor .page-web-carousel-viewport { grid-auto-columns: 100%; }
          .page-editor .page-web-carousel-strip { grid-auto-columns: minmax(0, var(--carousel-slide-px, max(0px, var(--carousel-inner-px, 100cqi)))); }
          .page-editor .page-web-carousel[data-carousel-aspect="vertical"] .page-web-carousel-viewport,
          .page-editor .page-web-carousel[data-carousel-aspect="square"] .page-web-carousel-viewport,
          .page-editor .page-web-carousel[data-carousel-aspect="a4"] .page-web-carousel-viewport { grid-auto-columns: calc((100% - 8px) / 2); }
          .page-editor .page-web-carousel[data-carousel-aspect="vertical"] .page-web-carousel-strip,
          .page-editor .page-web-carousel[data-carousel-aspect="square"] .page-web-carousel-strip,
          .page-editor .page-web-carousel[data-carousel-aspect="a4"] .page-web-carousel-strip { grid-auto-columns: minmax(0, var(--carousel-slide-px, calc((max(0px, var(--carousel-inner-px, 100cqi)) - 8px) / 2))); }
        }
        .page-editor .page-web-carousel-slide { position: relative; z-index: 2; box-sizing: border-box; padding: 0; }
        .page-editor .page-web-carousel-viewport:not(:has(.page-web-carousel-strip)) .page-web-carousel-slide { min-width: 0; scroll-snap-align: start; scroll-snap-stop: always; width: auto; max-width: none; }
        .page-editor .page-web-carousel-strip .page-web-carousel-slide { min-width: 0; width: 100%; max-width: none; scroll-snap-align: start; scroll-snap-stop: always; }
        .page-editor .page-web-carousel-slide[data-carousel-active="1"] { position: relative; border-radius: 8px; box-shadow: none; }
        .page-editor .page-web-carousel-slide[data-carousel-active="1"] .page-web-carousel-slide-inner::after { content: ""; position: absolute; inset: 0; border-radius: 6px; box-shadow: inset 0 0 0 2px #496db3; pointer-events: none; z-index: 2; }
        .page-editor .page-web-carousel-slide-inner { position: relative; z-index: 3; width: 100%; aspect-ratio: 16 / 9; min-height: 0; border-radius: 6px; overflow: hidden; background: #e2e8f0; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 2px rgba(15,23,42,0.06), 0 4px 12px rgba(15,23,42,0.08), 0 0 0 1px rgba(15,23,42,0.06); }
        .page-editor .page-web-carousel[data-carousel-aspect="vertical"] .page-web-carousel-slide-inner { aspect-ratio: 9 / 16; }
        .page-editor .page-web-carousel[data-carousel-aspect="square"] .page-web-carousel-slide-inner { aspect-ratio: 1 / 1; }
        .page-editor .page-web-carousel[data-carousel-aspect="a4"] .page-web-carousel-slide-inner { aspect-ratio: 210 / 297; }
        .page-editor .page-web-carousel[data-carousel-aspect="vertical"] .page-web-carousel-menu-image-type[data-set-carousel-aspect="vertical"],
        .page-editor .page-web-carousel[data-carousel-aspect="horizontal"] .page-web-carousel-menu-image-type[data-set-carousel-aspect="horizontal"],
        .page-editor .page-web-carousel:not([data-carousel-aspect]) .page-web-carousel-menu-image-type[data-set-carousel-aspect="horizontal"],
        .page-editor .page-web-carousel[data-carousel-aspect="square"] .page-web-carousel-menu-image-type[data-set-carousel-aspect="square"],
        .page-editor .page-web-carousel[data-carousel-aspect="a4"] .page-web-carousel-menu-image-type[data-set-carousel-aspect="a4"] { background: #f1f5f9; }
        .page-editor .page-web-carousel-slide-inner:has(.page-web-carousel-img) { background: transparent; }
        .page-editor .page-web-carousel-placeholder { position: relative; z-index: 0; padding: 1rem; text-align: center; font-size: 13px; color: #64748b; }
        .page-editor .page-web-carousel-slide-inner:has(.page-web-carousel-img) .page-web-carousel-placeholder { display: none; }
        .page-editor .page-web-carousel-img { position: absolute; inset: 0; z-index: 1; display: block; width: 100%; height: 100%; object-fit: cover; object-position: center; margin: 0; border-radius: 6px; }
        .page-editor .page-web-carousel-viewport::-webkit-scrollbar { height: 5px; width: 5px; }
        .page-editor .page-web-carousel-viewport::-webkit-scrollbar-track { background: transparent; }
        .page-editor .page-web-carousel-viewport::-webkit-scrollbar-thumb { background-color: rgba(100, 116, 139, 0.35); border-radius: 999px; }
        .page-editor .page-web-carousel-viewport::-webkit-scrollbar-thumb:hover { background-color: rgba(71, 85, 105, 0.5); }
      `}</style>
      <div
        className="flex min-h-screen transition-[filter] duration-150"
        style={carouselPreviewSession ? { filter: "blur(8px)" } : undefined}
      >
        <AdminSidebar />

        <div className="flex min-h-0 flex-1 flex-col lg:ml-64 h-screen overflow-hidden">
          <AdminTopBar />

          <main className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 py-6 lg:px-10">
            <div className="flex min-h-0 flex-1 flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex shrink-0 items-center justify-between">
                <h1 className="text-sm font-semibold text-slate-900">
                  {title || "Без названия"}
                </h1>
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving || loading}
                  className="inline-flex items-center rounded-full bg-[#496db3] px-4 py-1.5 text-xs font-medium text-white hover:brightness-105 disabled:opacity-60"
                >
                  {saving ? "Сохранение…" : "Сохранить"}
                </button>
              </div>

              {error && <div className="shrink-0 text-xs text-red-600">{error}</div>}

              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div
                  ref={toolbarRef}
                  className="relative z-30 flex shrink-0 flex-wrap items-center gap-1.5 border-b border-slate-200 bg-white p-2"
                >
                  <button
                    type="button"
                    className={`inline-flex h-8 w-8 items-center justify-center rounded transition-colors hover:text-[#496db3] ${
                      isBold ? "bg-slate-200 text-[#496db3]" : "text-slate-600"
                    }`}
                    onMouseDown={(e) => { saveSelectionFromEditor(); e.preventDefault(); }}
                    onClick={() => runCommand("bold")}
                    aria-label="Жирный"
                  >
                    <BoldIcon className={ICON_SIZE} />
                  </button>
                  <button
                    type="button"
                    className={`inline-flex h-8 w-8 items-center justify-center rounded transition-colors hover:text-[#496db3] ${
                      isItalic ? "bg-slate-200 text-[#496db3]" : "text-slate-600"
                    }`}
                    onMouseDown={(e) => { saveSelectionFromEditor(); e.preventDefault(); }}
                    onClick={() => runCommand("italic")}
                    aria-label="Курсив"
                  >
                    <ItalicIcon className={ICON_SIZE} />
                  </button>
                  <button
                    type="button"
                    className={`inline-flex h-8 w-8 items-center justify-center rounded transition-colors hover:text-[#496db3] ${
                      isUnderline ? "bg-slate-200 text-[#496db3]" : "text-slate-600"
                    }`}
                    onMouseDown={(e) => { saveSelectionFromEditor(); e.preventDefault(); }}
                    onClick={() => runCommand("underline")}
                    aria-label="Подчеркнутый"
                  >
                    <UnderlineIcon className={ICON_SIZE} />
                  </button>

                  <div className="h-6 w-px shrink-0 bg-slate-200" aria-hidden="true" />

                  <div ref={fontSizeDropdownRef} className="relative">
                    <button
                      type="button"
                      className="flex h-8 min-w-[4rem] items-center justify-between gap-1 rounded border border-slate-200 bg-white px-2 text-xs text-slate-700 transition-colors hover:border-slate-300"
                      onMouseDown={(e) => {
                        saveSelectionFromEditor();
                        e.preventDefault();
                      }}
                      onClick={() => setFontSizeOpen((v) => !v)}
                      aria-label="Размер шрифта"
                      aria-expanded={fontSizeOpen}
                    >
                      <span className="truncate">
                        {FONT_SIZES.find((s) => s.value === fontSize)?.label ?? "16px"}
                      </span>
                      <ChevronDownIcon
                        className={`${ICON_SIZE} shrink-0 text-slate-500 transition-transform ${fontSizeOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {fontSizeOpen && (
                      <div
                        className="absolute left-0 top-full z-10 mt-1 min-w-full rounded border border-slate-200 bg-white py-1 shadow-lg"
                        role="listbox"
                      >
                        {FONT_SIZES.map(({ value, label }) => (
                          <button
                            key={value}
                            type="button"
                            role="option"
                            aria-selected={fontSize === value}
                            className={`w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100 ${
                              fontSize === value ? "bg-slate-100 text-[#496db3]" : ""
                            }`}
                            onMouseDown={(e) => {
                              saveSelectionFromEditor();
                              e.preventDefault();
                            }}
                            onClick={() => {
                              runCommand("fontSize", value);
                              setFontSizeOpen(false);
                            }}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div ref={fontColorDropdownRef} className="relative">
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-200 bg-white transition-colors hover:border-slate-300"
                      onMouseDown={(e) => {
                        saveSelectionFromEditor();
                        e.preventDefault();
                      }}
                      onClick={() => setFontColorOpen((v) => !v)}
                      aria-label="Цвет шрифта"
                      aria-expanded={fontColorOpen}
                    >
                      <span className="h-4 w-4 rounded border border-slate-200" style={{ backgroundColor: fontColor }} />
                    </button>
                    {fontColorOpen && (
                      <div
                        className="absolute left-0 top-full z-10 mt-1 rounded border border-slate-200 bg-white p-2 shadow-lg"
                        style={{ width: 112, minWidth: 112 }}
                        role="listbox"
                      >
                        <div className="grid grid-cols-4 gap-1.5">
                          {BANNERS_FONT_COLOR_PRESETS.map((hex) => {
                            const isSelected = fontColor.toLowerCase() === hex.toLowerCase();
                            const luminance = (() => {
                              const r = parseInt(hex.slice(1, 3), 16);
                              const g = parseInt(hex.slice(3, 5), 16);
                              const b = parseInt(hex.slice(5, 7), 16);
                              return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
                            })();
                            const iconLight = luminance < 0.6;
                            return (
                              <button
                                key={`font-color-${hex}`}
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                title={hex}
                                className={`flex aspect-square w-full items-center justify-center rounded border border-slate-200 transition-colors hover:ring-2 hover:ring-[#496db3] hover:ring-offset-1 ${
                                  isSelected ? "ring-2 ring-[#496db3] ring-offset-1" : ""
                                }`}
                                style={{ backgroundColor: hex }}
                                onMouseDown={(e) => {
                                  saveSelectionFromEditor();
                                  e.preventDefault();
                                }}
                                onClick={() => {
                                  runCommand("foreColor", hex);
                                  setFontColor(hex);
                                  setFontColorOpen(false);
                                }}
                              >
                                {isSelected && (
                                  <CheckIcon className={`h-3 w-3 ${iconLight ? "text-white drop-shadow-[0_0_1px_rgba(0,0,0,0.5)]" : "text-slate-800"}`} />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="h-6 w-px shrink-0 bg-slate-200" aria-hidden="true" />

                  <button
                    type="button"
                    className={`inline-flex h-8 w-8 items-center justify-center rounded transition-colors hover:text-[#496db3] ${
                      alignment === "left" ? "bg-slate-200 text-[#496db3]" : "text-slate-600"
                    }`}
                    onMouseDown={(e) => { saveSelectionFromEditor(); e.preventDefault(); }}
                    onClick={() => (isInTable ? applyTableHorizontalAlign("left") : runCommand("justifyLeft"))}
                    aria-label="Выравнивание слева"
                  >
                    <Bars3BottomLeftIcon className={ICON_SIZE} />
                  </button>
                  <button
                    type="button"
                    className={`inline-flex h-8 w-8 items-center justify-center rounded transition-colors hover:text-[#496db3] ${
                      alignment === "center" ? "bg-slate-200 text-[#496db3]" : "text-slate-600"
                    }`}
                    onMouseDown={(e) => { saveSelectionFromEditor(); e.preventDefault(); }}
                    onClick={() => (isInTable ? applyTableHorizontalAlign("center") : runCommand("justifyCenter"))}
                    aria-label="Выравнивание по центру"
                  >
                    <AlignCenterIcon className={ICON_SIZE} />
                  </button>
                  <button
                    type="button"
                    className={`inline-flex h-8 w-8 items-center justify-center rounded transition-colors hover:text-[#496db3] ${
                      alignment === "right" ? "bg-slate-200 text-[#496db3]" : "text-slate-600"
                    }`}
                    onMouseDown={(e) => { saveSelectionFromEditor(); e.preventDefault(); }}
                    onClick={() => (isInTable ? applyTableHorizontalAlign("right") : runCommand("justifyRight"))}
                    aria-label="Выравнивание справа"
                  >
                    <Bars3BottomRightIcon className={ICON_SIZE} />
                  </button>
                  <button
                    type="button"
                    className={`inline-flex h-8 w-8 items-center justify-center rounded transition-colors ${
                      !isInTable && !isInWebCoverContent
                        ? "cursor-not-allowed text-slate-300"
                        : (isInTable ? tableVerticalAlign : coverVerticalAlign) === "top"
                          ? "bg-slate-200 text-[#496db3]"
                          : "text-slate-600 hover:text-[#496db3]"
                    }`}
                    onMouseDown={(e) => { saveSelectionFromEditor(); e.preventDefault(); }}
                    onClick={() => {
                      if (isInTable) applyTableVerticalAlign("top");
                      else if (isInWebCoverContent) applyCoverVerticalAlign("top");
                    }}
                    aria-label="Выравнивание по верху"
                    disabled={!isInTable && !isInWebCoverContent}
                  >
                    <AlignVerticalTopIcon className={ICON_SIZE} />
                  </button>
                  <button
                    type="button"
                    className={`inline-flex h-8 w-8 items-center justify-center rounded transition-colors ${
                      !isInTable && !isInWebCoverContent
                        ? "cursor-not-allowed text-slate-300"
                        : (isInTable ? tableVerticalAlign : coverVerticalAlign) === "middle"
                          ? "bg-slate-200 text-[#496db3]"
                          : "text-slate-600 hover:text-[#496db3]"
                    }`}
                    onMouseDown={(e) => { saveSelectionFromEditor(); e.preventDefault(); }}
                    onClick={() => {
                      if (isInTable) applyTableVerticalAlign("middle");
                      else if (isInWebCoverContent) applyCoverVerticalAlign("middle");
                    }}
                    aria-label="Выравнивание по центру по высоте"
                    disabled={!isInTable && !isInWebCoverContent}
                  >
                    <AlignVerticalMiddleIcon className={ICON_SIZE} />
                  </button>
                  <button
                    type="button"
                    className={`inline-flex h-8 w-8 items-center justify-center rounded transition-colors ${
                      !isInTable && !isInWebCoverContent
                        ? "cursor-not-allowed text-slate-300"
                        : (isInTable ? tableVerticalAlign : coverVerticalAlign) === "bottom"
                          ? "bg-slate-200 text-[#496db3]"
                          : "text-slate-600 hover:text-[#496db3]"
                    }`}
                    onMouseDown={(e) => { saveSelectionFromEditor(); e.preventDefault(); }}
                    onClick={() => {
                      if (isInTable) applyTableVerticalAlign("bottom");
                      else if (isInWebCoverContent) applyCoverVerticalAlign("bottom");
                    }}
                    aria-label="Выравнивание по низу"
                    disabled={!isInTable && !isInWebCoverContent}
                  >
                    <AlignVerticalBottomIcon className={ICON_SIZE} />
                  </button>

                  <div className="h-6 w-px shrink-0 bg-slate-200" aria-hidden="true" />

                  <button
                    type="button"
                    className={`inline-flex h-8 w-8 items-center justify-center rounded transition-colors hover:text-[#496db3] ${
                      isUnorderedList ? "bg-slate-200 text-[#496db3]" : "text-slate-600"
                    }`}
                    onMouseDown={(e) => {
                      saveSelectionFromEditor();
                      e.preventDefault();
                    }}
                    onClick={() => runCommand("insertUnorderedList")}
                    aria-label="Маркированный список"
                  >
                    <ListBulletIcon className={ICON_SIZE} />
                  </button>
                  <button
                    type="button"
                    className={`inline-flex h-8 w-8 items-center justify-center rounded transition-colors hover:text-[#496db3] ${
                      isOrderedList ? "bg-slate-200 text-[#496db3]" : "text-slate-600"
                    }`}
                    onMouseDown={(e) => {
                      saveSelectionFromEditor();
                      e.preventDefault();
                    }}
                    onClick={() => runCommand("insertOrderedList")}
                    aria-label="Нумерованный список"
                  >
                    <NumberedListIcon className={ICON_SIZE} />
                  </button>

                  {(isUnorderedList || isOrderedList) && (
                    <div ref={listStyleDropdownRef} className="relative">
                      <button
                        type="button"
                        className="flex h-8 min-w-[3rem] items-center justify-between gap-1 rounded border border-slate-200 bg-white px-2 text-xs text-slate-700 transition-colors hover:border-slate-300"
                        onMouseDown={(e) => {
                          saveSelectionFromEditor();
                          e.preventDefault();
                        }}
                        onClick={() => {
                          if (!listStyleButtonMousedownRef.current) return;
                          setListStyleOpen((v) => !v);
                        }}
                        aria-label="Стиль маркера"
                        aria-expanded={listStyleOpen}
                      >
                        <span className="flex items-center gap-1 truncate" style={{ color: LIST_COLORS.find((c) => c.value === listColor)?.hex ?? "#000000" }}>
                          {isOrderedList ? (
                            LIST_STYLE_OL.find((s) => s.value === listStyleType)?.label ?? "1."
                          ) : (
                            (() => {
                              const item = LIST_STYLE_UL.find((s) => s.value === listStyleType);
                              const Icon = item?.Icon ?? ListDiscIcon;
                              return <Icon className={ICON_SIZE} />;
                            })()
                          )}
                        </span>
                        <ChevronDownIcon
                          className={`${ICON_SIZE} shrink-0 text-slate-500 transition-transform ${listStyleOpen ? "rotate-180" : ""}`}
                        />
                      </button>
                      {listStyleOpen && (
                        <div
                          className="absolute left-0 top-full z-10 mt-1 rounded border border-slate-200 bg-white p-3 shadow-lg"
                          style={{ width: 140, minWidth: 140 }}
                          role="listbox"
                        >
                          {(() => {
                            const iconColor = LIST_COLORS.find((c) => c.value === listColor)?.hex ?? "#000000";
                            return (
                              <div className="grid grid-cols-3 gap-2" style={{ width: 104 }}>
                                {isOrderedList
                                  ? LIST_STYLE_OL.map(({ value, label }) => (
                                      <button
                                        key={value}
                                        type="button"
                                        role="option"
                                        aria-selected={listStyleType === value}
                                        className={`flex aspect-square w-full items-center justify-center rounded text-xs transition-colors hover:bg-slate-100 ${
                                          listStyleType === value ? "bg-slate-100 ring-1 ring-[#496db3]" : ""
                                        }`}
                                        style={{ color: iconColor }}
                                        onMouseDown={(e) => {
                                          saveSelectionFromEditor();
                                          e.preventDefault();
                                        }}
                                        onClick={() => applyListStyle(value)}
                                      >
                                        {label}
                                      </button>
                                    ))
                                  : LIST_STYLE_UL.map(({ value, Icon }) => (
                                      <button
                                        key={value}
                                        type="button"
                                        role="option"
                                        aria-selected={listStyleType === value}
                                        className={`flex aspect-square w-full items-center justify-center rounded transition-colors hover:bg-slate-100 ${
                                          listStyleType === value ? "bg-slate-100 ring-1 ring-[#496db3]" : ""
                                        }`}
                                        style={{ color: iconColor }}
                                        onMouseDown={(e) => {
                                          saveSelectionFromEditor();
                                          e.preventDefault();
                                        }}
                                        onClick={() => applyListStyle(value)}
                                      >
                                        <Icon className="h-5 w-5" />
                                      </button>
                                    ))}
                </div>
                            );
                          })()}
                          {isOrderedList && (
                            <div className="mt-3 border-t border-slate-200 pt-3">
                              <div className="mb-2 flex flex-nowrap items-center gap-2">
                                <span className="whitespace-nowrap text-xs text-slate-600">Начать с:</span>
                                <input
                                  type="number"
                                  min={1}
                                  max={9999}
                                  value={listStart}
                                  onChange={(e) => {
                                    const v = parseInt(e.target.value, 10);
                                    if (!Number.isNaN(v) && v >= 1 && v <= 9999) {
                                      applyListStart(v);
                                    }
                                  }}
                                  className="w-16 rounded border border-slate-200 px-2 py-1 text-xs text-slate-700"
                                  onMouseDown={(e) => {
                                    saveSelectionFromEditor();
                                    e.preventDefault();
                                  }}
                                />
                              </div>
                            </div>
                          )}
                          <div className="mt-3 border-t border-slate-200 pt-3">
                            <div className="mb-2 flex flex-nowrap items-center gap-2">
                              <span className="whitespace-nowrap text-xs text-slate-600">Цвет значков:</span>
                              <button
                                type="button"
                                className="h-5 w-5 shrink-0 rounded border border-slate-200 transition-colors hover:ring-2 hover:ring-[#496db3] hover:ring-offset-1"
                                style={{ backgroundColor: LIST_COLORS.find((c) => c.value === listColor)?.hex ?? "#000000" }}
                                onMouseDown={(e) => {
                                  saveSelectionFromEditor();
                                  e.preventDefault();
                                }}
                                onClick={() => setListColorOpen((v) => !v)}
                                aria-label="Выбрать цвет"
                                aria-expanded={listColorOpen}
                              />
                            </div>
                            {listColorOpen && (
                              <div className="grid grid-cols-4 gap-1.5" style={{ width: 104 }}>
                                {LIST_COLORS.map(({ value, label, hex }) => {
                                  const isSelected = listColor === value || (listColor === "" && value === "black");
                                  const luminance = (() => {
                                    const r = parseInt(hex.slice(1, 3), 16);
                                    const g = parseInt(hex.slice(3, 5), 16);
                                    const b = parseInt(hex.slice(5, 7), 16);
                                    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
                                  })();
                                  const iconLight = luminance < 0.6;
                                  return (
                                    <button
                                      key={value}
                                      type="button"
                                      role="option"
                                      aria-selected={isSelected}
                                      title={label}
                                      className={`flex aspect-square w-full items-center justify-center rounded border border-slate-200 transition-colors hover:ring-2 hover:ring-[#496db3] hover:ring-offset-1 ${
                                        isSelected ? "ring-2 ring-[#496db3] ring-offset-1" : ""
                                      }`}
                                      style={{ backgroundColor: hex }}
                                      onMouseDown={(e) => {
                                        saveSelectionFromEditor();
                                        e.preventDefault();
                                      }}
                                      onClick={() => applyListColor(value)}
                                    >
                                      {isSelected && (
                                        <CheckIcon className={`h-3 w-3 ${iconLight ? "text-white drop-shadow-[0_0_1px_rgba(0,0,0,0.5)]" : "text-slate-800"}`} />
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="h-6 w-px shrink-0 bg-slate-200" aria-hidden="true" />

                  <div ref={tableDropdownRef} className="relative">
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded text-slate-600 transition-colors hover:text-[#496db3]"
                      onMouseDown={(e) => {
                        saveSelectionFromEditor();
                        e.preventDefault();
                      }}
                      onClick={() => {
                        setTableOpen((v) => !v);
                        setWebElementsOpen(false);
                      }}
                      aria-label="Вставить таблицу"
                      aria-expanded={tableOpen}
                    >
                      <TableCellsIcon className={ICON_SIZE} />
                    </button>
                    {isInTable && (
                      <>
                      <div ref={tableBorderDropdownRef} className="relative ml-0.5 inline-block">
                        <button
                          type="button"
                          className="flex h-8 min-w-[3rem] items-center justify-between gap-1 rounded border border-slate-200 bg-white px-2 text-slate-700 transition-colors hover:border-slate-300"
                          onMouseDown={(e) => {
                            saveSelectionFromEditor();
                            e.preventDefault();
                          }}
                          onClick={() => setTableBorderOpen((v) => !v)}
                          aria-label="Контур таблицы"
                          aria-expanded={tableBorderOpen}
                        >
                          <TableBorderPreview value={tableBorderStyle} isSelected={false} size="sm" />
                          <ChevronDownIcon
                            className={`h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform ${tableBorderOpen ? "rotate-180" : ""}`}
                          />
                        </button>
                        {tableBorderOpen && (
                          <div
                            className="absolute left-0 top-full z-10 mt-1 rounded border border-slate-200 bg-white p-3 shadow-lg"
                            style={{ width: 140, minWidth: 140 }}
                            role="listbox"
                          >
                            <div className="grid grid-cols-3 gap-2" style={{ width: 104 }}>
                              {TABLE_BORDER_STYLES.map((opt) => (
                                <button
                                  key={opt.value}
                                  type="button"
                                  role="option"
                                  aria-selected={tableBorderStyle === opt.value}
                                  className={`flex aspect-square w-full items-center justify-center rounded transition-colors hover:bg-slate-100 ${
                                    tableBorderStyle === opt.value ? "bg-slate-100 ring-1 ring-[#496db3]" : ""
                                  }`}
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => setTableBorder(opt.value)}
                                  title={opt.label}
                                >
                                  <TableBorderPreview value={opt.value} isSelected={tableBorderStyle === opt.value} />
                                </button>
                              ))}
                            </div>
                            <div className="mt-3 border-t border-slate-200 pt-3">
                              <div className="mb-2 flex flex-nowrap items-center gap-2">
                                <span className="whitespace-nowrap text-xs text-slate-600">Толщина:</span>
                                <button
                                  type="button"
                                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-slate-200 transition-colors hover:ring-2 hover:ring-[#496db3] hover:ring-offset-1"
                                  onMouseDown={(e) => {
                                    saveSelectionFromEditor();
                                    e.preventDefault();
                                  }}
                                  onClick={() => setTableBorderWidthOpen((v) => !v)}
                                  aria-label="Выбрать толщину"
                                  aria-expanded={tableBorderWidthOpen}
                                >
                                  <div
                                    className="rounded-sm bg-slate-600"
                                    style={{ height: Math.max(1, parseInt(tableBorderWidth, 10) * 2), width: 10 }}
                                  />
                                </button>
                              </div>
                              {tableBorderWidthOpen && (
                                <div className="mt-1 flex flex-col gap-1.5" style={{ width: 104 }}>
                                  {TABLE_BORDER_WIDTHS.map((w) => {
                                    const isSelected = tableBorderWidth === w.value;
                                    return (
                                      <button
                                        key={w.value}
                                        type="button"
                                        role="menuitem"
                                        aria-selected={isSelected}
                                        title={w.label}
                                        className={`flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-xs ${
                                          isSelected
                                            ? "bg-slate-100 text-[#496db3]"
                                            : "text-slate-700 hover:bg-slate-100"
                                        }`}
                                        onMouseDown={(e) => {
                                          saveSelectionFromEditor();
                                          e.preventDefault();
                                        }}
                                        onClick={() => {
                                          applyTableBorderWidth(w.value);
                                          setTableBorderWidthOpen(false);
                                        }}
                                      >
                                        <div
                                          className="rounded-sm bg-slate-600"
                                          style={{ height: Math.max(1, parseInt(w.value, 10) * 2), width: 10 }}
                                        />
                                        {w.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                            <div className="mt-3 border-t border-slate-200 pt-3">
                              <div className="mb-2 flex flex-nowrap items-center gap-2">
                                <span className="whitespace-nowrap text-xs text-slate-600">Цвет контура:</span>
                                <button
                                  type="button"
                                  className="h-5 w-5 shrink-0 rounded border border-slate-200 transition-colors hover:ring-2 hover:ring-[#496db3] hover:ring-offset-1"
                                  style={{ backgroundColor: tableBorderColor }}
                                  onMouseDown={(e) => {
                                    saveSelectionFromEditor();
                                    e.preventDefault();
                                  }}
                                  onClick={() => setTableBorderColorOpen((v) => !v)}
                                  aria-label="Выбрать цвет"
                                  aria-expanded={tableBorderColorOpen}
                                />
                              </div>
                              {tableBorderColorOpen && (
                                <div className="grid grid-cols-4 gap-1.5" style={{ width: 104 }}>
                                  {LIST_COLORS.map(({ value, label, hex }) => {
                                    const isSelected = tableBorderColor === hex || (tableBorderColor === "" && value === "black");
                                    const luminance = (() => {
                                      const r = parseInt(hex.slice(1, 3), 16);
                                      const g = parseInt(hex.slice(3, 5), 16);
                                      const b = parseInt(hex.slice(5, 7), 16);
                                      return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
                                    })();
                                    const iconLight = luminance < 0.6;
                                    return (
                                      <button
                                        key={value}
                                        type="button"
                                        role="option"
                                        aria-selected={isSelected}
                                        title={label}
                                        className={`flex aspect-square w-full items-center justify-center rounded border border-slate-200 transition-colors hover:ring-2 hover:ring-[#496db3] hover:ring-offset-1 ${
                                          isSelected ? "ring-2 ring-[#496db3] ring-offset-1" : ""
                                        }`}
                                        style={{ backgroundColor: hex }}
                                        onMouseDown={(e) => {
                                          saveSelectionFromEditor();
                                          e.preventDefault();
                                        }}
                                        onClick={() => applyTableBorderColor(hex)}
                                      >
                                        {isSelected && (
                                          <CheckIcon className={`h-3 w-3 ${iconLight ? "text-white drop-shadow-[0_0_1px_rgba(0,0,0,0.5)]" : "text-slate-800"}`} />
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      </>
                    )}
                    {tableOpen && (
                      <div
                        className="absolute left-0 top-full z-10 mt-1 min-w-[180px] rounded border border-slate-200 bg-white p-3 shadow-lg"
                        role="menu"
                        onMouseLeave={() => setTableHover(null)}
                      >
                        <div className="mb-2 text-xs font-medium text-slate-600">
                          {tableHover ? `${tableHover.rows}×${tableHover.cols}` : "Размер таблицы"}
                        </div>
                        <div className="grid grid-cols-6 gap-1.5">
                          {Array.from({ length: 6 }, (_, rowIndex) =>
                            Array.from({ length: 6 }, (_, colIndex) => {
                              const rows = rowIndex + 1;
                              const cols = colIndex + 1;
                              const isHighlighted =
                                tableHover && rowIndex < tableHover.rows && colIndex < tableHover.cols;
                              return (
                                <button
                                  key={`${rowIndex}-${colIndex}`}
                                  type="button"
                                  role="menuitem"
                                  className={`h-5 w-5 rounded-sm border transition-colors ${
                                    isHighlighted
                                      ? "border-[#496db3] bg-[#496db3]/20"
                                      : "border-slate-200 bg-slate-100 hover:border-slate-300"
                                  }`}
                                  onMouseDown={(e) => e.preventDefault()}
                                  onMouseEnter={() => setTableHover({ rows, cols })}
                                  onClick={() => insertTable(rows, cols)}
                                  title={`${rows}×${cols}`}
                                />
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="h-6 w-px shrink-0 bg-slate-200" aria-hidden="true" />

                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageInputChange}
                  />
                  <input
                    ref={webShellImageInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleWebShellImageInputChange}
                    aria-hidden="true"
                  />
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded text-slate-600 transition-colors hover:text-[#496db3]"
                    onMouseDown={(e) => {
                      saveSelectionFromEditor();
                      e.preventDefault();
                    }}
                    onClick={() => imageInputRef.current?.click()}
                    aria-label="Вставить картинку"
                  >
                    <PhotoIcon className={ICON_SIZE} />
                  </button>

                  <div className="h-6 w-px shrink-0 bg-slate-200" aria-hidden="true" />

                  <div ref={webElementsDropdownRef} className="relative">
                    <button
                      type="button"
                      className="inline-flex h-8 min-w-[2rem] items-center justify-center gap-0.5 rounded border border-slate-200 bg-white px-1.5 text-slate-600 transition-colors hover:border-slate-300 hover:text-[#496db3]"
                      onMouseDown={(e) => {
                        saveSelectionFromEditor();
                        e.preventDefault();
                      }}
                      onClick={() => {
                        setWebElementsOpen((v) => !v);
                        setTableOpen(false);
                      }}
                      aria-label="Web-элементы"
                      aria-expanded={webElementsOpen}
                      title="Web-элементы"
                    >
                      <GlobeAltIcon className={ICON_SIZE} />
                      <ChevronDownIcon
                        className={`h-3 w-3 shrink-0 text-slate-500 transition-transform ${webElementsOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {webElementsOpen && (
                      <div
                        className="absolute right-0 top-full z-50 mt-1 min-w-[220px] rounded border border-slate-200 bg-white py-1 shadow-lg"
                        role="menu"
                      >
                        <div className="border-b border-slate-100 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Web-элементы
                        </div>
                        {WEB_PAGE_ELEMENTS.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            role="menuitem"
                            className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => insertWebPageElement(item.id)}
                          >
                            <span className="font-medium text-slate-900">{item.label}</span>
                            <span className="text-[11px] text-slate-500">{item.description}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                </div>

                <div
                  ref={editorScrollRef}
                  className="relative z-0 min-h-0 flex-1 overflow-y-auto"
                >
                  <div ref={editorWrapperRef} className="relative min-h-[calc(100vh-12rem)]">
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onMouseDown={(e) => {
                    const ed = editorRef.current;
                    const t = e.target as HTMLElement;
                    if (ed && !t.closest?.(".page-web-cover-toolbar")) {
                      ed.querySelectorAll('.page-web-cover-toolbar[data-menu-open="1"]').forEach((node) => {
                        const n = node as HTMLElement;
                        n.removeAttribute("data-menu-open");
                        n.querySelectorAll('.page-web-cover-menu-sub[data-submenu-open="1"]').forEach((s) => {
                          (s as HTMLElement).removeAttribute("data-submenu-open");
                        });
                        n.querySelectorAll(".page-web-cover-menu-sub-trigger").forEach((tr) => {
                          (tr as HTMLElement).setAttribute("aria-expanded", "false");
                        });
                      });
                    }
                    if (ed && !t.closest?.(".page-web-carousel-toolbar")) {
                      ed.querySelectorAll('.page-web-carousel-toolbar[data-menu-open="1"]').forEach((node) => {
                        closeCarouselToolbarMenus(node as HTMLElement);
                      });
                    }
                    if (ed && !t.closest?.(".page-web-timeline-toolbar")) {
                      ed.querySelectorAll('.page-web-timeline-toolbar[data-menu-open="1"]').forEach((node) => {
                        closeTimelineToolbarMenus(node as HTMLElement);
                      });
                    }
                    handleCarouselEditorMouseDown(e);
                    handleTimelineToolbarMouseDown(e);
                    handleCoverSurfaceMouseDown(e);
                    handleCoverToolbarMouseDown(e);
                    handleCoverInnerMouseDown(e);
                    handleTableCellMouseDown(e);
                  }}
                  onDoubleClick={(e) => {
                    if (handleCoverButtonDoubleClick(e)) return;
                    handleTableCellDoubleClick(e);
                  }}
                  onBlur={handleEditorFocusOut}
                  onBeforeInput={handleEditorBeforeInput}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  onInput={(e) => {
                    const html = (e.target as HTMLDivElement).innerHTML;
                    scheduleEditorHtmlStateSync(html);
                    syncMarkerBold();
                  }}
                  className="page-editor min-h-[calc(100vh-12rem)] w-full p-4 text-sm text-slate-900 outline-none [&_ul]:list-disc [&_ul]:list-outside [&_ul]:pl-6 [&_ul]:my-0 [&_ol]:pl-6 [&_ol]:my-0 [&_ol_ol]:pl-6 [&_ol_ol_ol]:pl-6 [&_li]:pl-1 [&_li]:my-0"
                    />
                    {cellMenuViewport &&
                      cellMenuViewport.topBtn &&
                      typeof document !== "undefined" &&
                      createPortal(
                        <div ref={cellMenuRef} className="fixed z-[9999]">
                          {cellMenuViewport.selectionBadge && (
                            <div
                              className="pointer-events-none absolute rounded border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 shadow-sm"
                              style={{
                                top: cellMenuViewport.selectionBadge.top - 28,
                                left: cellMenuViewport.selectionBadge.right,
                                transform: "translateX(-100%)",
                                position: "fixed",
                              }}
                            >
                              {selectedCellRange.rows} × {selectedCellRange.cols}
                            </div>
                          )}
                          <div
                            className="z-[110] flex gap-1"
                            style={{
                              top: cellMenuViewport.top,
                              left: cellMenuViewport.left,
                              position: "fixed",
                            }}
                          >
                            <button
                              type="button"
                              className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 bg-white text-slate-600 shadow-md transition-colors hover:bg-slate-50 hover:text-[#496db3]"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setCellMenuAnchor("left");
                                setCellMenuOpen((v) => !v);
                                setTableWidthSubmenuOpen(false);
                                setTableRowHeightSubmenuOpen(false);
                              }}
                              aria-label="Меню ячейки (слева)"
                              aria-expanded={cellMenuOpen && cellMenuAnchor === "left"}
                            >
                              <EllipsisVerticalIcon className="h-4 w-4" />
                            </button>
                            {cellMenuOpen && cellMenuAnchor === "left" && (
                              <div
                                className={`absolute left-0 z-10 min-w-[200px] rounded border border-slate-200 bg-white py-1 shadow-lg ${
                                  cellMenuViewport.openUp ? "bottom-full mb-1" : "top-full mt-1"
                                }`}
                                role="menu"
                              >
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-100"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => tableCellAction("insertRowAbove")}
                                >
                                  <PlusIcon className="h-4 w-4" />
                                  Добавить {pluralRowsInsert(selectedCellRange.rows)} выше
                                </button>
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-100"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => tableCellAction("insertRowBelow")}
                                >
                                  <PlusIcon className="h-4 w-4" />
                                  Добавить {pluralRowsInsert(selectedCellRange.rows)} ниже
                                </button>
                                <div className="my-1 border-t border-slate-200" />
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => tableCellAction("deleteRow")}
                                >
                                  <TrashIcon className="h-4 w-4" />
                                  Удалить {pluralRowsDelete(selectedCellRange.rows)}
                                </button>
                                <div className="my-1 border-t border-slate-200" />
                                <div className="relative">
                                  <button
                                    type="button"
                                    role="menuitem"
                                    className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs ${
                                      tableRowHeightSubmenuOpen ? "bg-slate-100 text-[#496db3]" : "text-slate-700 hover:bg-slate-100"
                                    }`}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => setTableRowHeightSubmenuOpen((v) => !v)}
                                  >
                                    Задать высоту ячеек
                                    <ChevronRightIcon className="h-3.5 w-3.5 shrink-0" />
                                  </button>
                                  {tableRowHeightSubmenuOpen && (
                                    <div
                                      className={`absolute left-full z-20 ml-0.5 min-w-[100px] rounded border border-slate-200 bg-white py-1 shadow-lg ${
                                        cellMenuViewport.openUp ? "bottom-0" : "top-0"
                                      }`}
                                      role="menu"
                                    >
                                      {TABLE_ROW_HEIGHT_PRESETS.map((opt) => (
                                        <button
                                          key={opt.value}
                                          type="button"
                                          role="menuitem"
                                          className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs ${
                                            tableRowHeight === opt.value ? "bg-slate-100 text-[#496db3]" : "text-slate-700 hover:bg-slate-100"
                                          }`}
                                          onMouseDown={(e) => e.preventDefault()}
                                          onClick={() => {
                                            applyTableRowHeight(opt.value);
                                            setTableRowHeightSubmenuOpen(false);
                                          }}
                                        >
                                          {opt.label}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                          <div
                            className="z-[100] flex gap-1"
                            style={{
                              top: cellMenuViewport.topBtn.top,
                              left: cellMenuViewport.topBtn.left,
                              position: "fixed",
                            }}
                          >
                            <button
                              type="button"
                              className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 bg-white text-slate-600 shadow-md transition-colors hover:bg-slate-50 hover:text-[#496db3]"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setCellMenuAnchor("top");
                                setCellMenuOpen((v) => !v);
                                setTableWidthSubmenuOpen(false);
                                setTableRowHeightSubmenuOpen(false);
                              }}
                              aria-label="Меню ячейки (сверху)"
                              aria-expanded={cellMenuOpen && cellMenuAnchor === "top"}
                            >
                              <EllipsisHorizontalIcon className="h-4 w-4" />
                            </button>
                            {cellMenuOpen && cellMenuAnchor === "top" && (
                              <div
                                className={`absolute left-1/2 z-10 min-w-[200px] -translate-x-1/2 rounded border border-slate-200 bg-white py-1 shadow-lg ${
                                  cellMenuViewport.openUp ? "bottom-full mb-1" : "top-full mt-1"
                                }`}
                                role="menu"
                              >
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-100"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => tableCellAction("insertColLeft")}
                                >
                                  <PlusIcon className="h-4 w-4" />
                                  Добавить {pluralColsInsert(selectedCellRange.cols)} слева
                                </button>
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-100"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => tableCellAction("insertColRight")}
                                >
                                  <PlusIcon className="h-4 w-4" />
                                  Добавить {pluralColsInsert(selectedCellRange.cols)} справа
                                </button>
                                <div className="my-1 border-t border-slate-200" />
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => tableCellAction("deleteCol")}
                                >
                                  <TrashIcon className="h-4 w-4" />
                                  Удалить {pluralColsDelete(selectedCellRange.cols)}
                                </button>
                                <div className="my-1 border-t border-slate-200" />
                                <div className="relative">
                                  <button
                                    type="button"
                                    role="menuitem"
                                    className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs ${
                                      tableWidthSubmenuOpen ? "bg-slate-100 text-[#496db3]" : "text-slate-700 hover:bg-slate-100"
                                    }`}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => setTableWidthSubmenuOpen((v) => !v)}
                                  >
                                    Задать ширину ячеек
                                    <ChevronRightIcon className="h-3.5 w-3.5 shrink-0" />
                                  </button>
                                  {tableWidthSubmenuOpen && (
                                    <div
                                      className={`absolute left-full z-20 ml-0.5 min-w-[100px] rounded border border-slate-200 bg-white py-1 shadow-lg ${
                                        cellMenuViewport.openUp ? "bottom-0" : "top-0"
                                      }`}
                                      role="menu"
                                    >
                                      {TABLE_WIDTH_PRESETS.map((opt) => (
                                        <button
                                          key={opt.value}
                                          type="button"
                                          role="menuitem"
                                          className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs ${
                                            tableWidth === opt.value ? "bg-slate-100 text-[#496db3]" : "text-slate-700 hover:bg-slate-100"
                                          }`}
                                          onMouseDown={(e) => e.preventDefault()}
                                          onClick={() => {
                                            applyTableWidth(opt.value);
                                            setTableWidthSubmenuOpen(false);
                                          }}
                                        >
                                          {opt.label}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>,
                        document.body
                      )}
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
      {coverBgAdjustSession && typeof document !== "undefined" && (
        <CoverBackgroundAdjustOverlay
          coverEl={coverBgAdjustSession.mount}
          imageSrc={coverBgAdjustSession.imageSrc}
          posX={coverBgAdjustSession.posX}
          posY={coverBgAdjustSession.posY}
          onPositionChange={updateCoverBgAdjustPos}
          onCommit={handleCoverBgAdjustCommit}
          onCancel={handleCoverBgAdjustCancel}
        />
      )}
      {carouselPreviewSession && typeof document !== "undefined" &&
        createPortal(
          <CarouselFullPreviewOverlay
            session={carouselPreviewSession}
            onClose={() => setCarouselPreviewSession(null)}
            onPrev={() =>
              setCarouselPreviewSession((s) => (s ? { ...s, index: Math.max(0, s.index - 1) } : s))
            }
            onNext={() =>
              setCarouselPreviewSession((s) =>
                s ? { ...s, index: Math.min(s.slides.length - 1, s.index + 1) } : s
              )
            }
          />,
          document.body
        )}
    </div>
  );
}

