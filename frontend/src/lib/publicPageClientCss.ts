import { getSiteBlueTitleUnifiedCss } from "@/lib/siteBlueTitleCss";
import { getSharedWebBlocksCss } from "@/lib/sharedWebBlocksCss";
import {
  getPageShowRenderCss,
  getTimelineRenderCss,
  getWorkPricingRenderCss,
} from "@/lib/pageShowRender";

const PUBLIC_LIST_MARKER_SVG = {
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
} as const;

const PUBLIC_LIST_COLORS = [
  { value: "black", hex: "#000000" },
  { value: "slate", hex: "#64748b" },
  { value: "gray", hex: "#6b7280" },
  { value: "zinc", hex: "#71717a" },
  { value: "red", hex: "#ef4444" },
  { value: "orange", hex: "#f97316" },
  { value: "amber", hex: "#f59e0b" },
  { value: "yellow", hex: "#eab308" },
  { value: "lime", hex: "#84cc16" },
  { value: "green", hex: "#22c55e" },
  { value: "emerald", hex: "#10b981" },
  { value: "teal", hex: "#14b8a6" },
  { value: "cyan", hex: "#06b6d4" },
  { value: "sky", hex: "#0ea5e9" },
  { value: "blue", hex: "#3b82f6" },
  { value: "indigo", hex: "#6366f1" },
  { value: "violet", hex: "#8b5cf6" },
  { value: "purple", hex: "#a855f7" },
  { value: "fuchsia", hex: "#d946ef" },
  { value: "pink", hex: "#ec4899" },
  { value: "rose", hex: "#f43f5e" },
] as const;

/** Стили публичного HTML из CMS (блоки text → .page-content). */
export function getPublicPageClientCss(): string {
  return `
${getSharedWebBlocksCss(".page-content")}
.service-page-content-root .page-content textarea[readonly],
.service-page-content-root .page-content input[readonly] {
  cursor: default;
  user-select: text;
}
.service-page-content-root .page-web-accordion-trigger textarea {
  pointer-events: none;
}
.page-content img { max-width: 100%; height: auto; }
.page-content ul { margin: 0.5rem 0; padding-left: 1.25rem; list-style: disc outside; --list-marker-color: #000000; }
${PUBLIC_LIST_COLORS.map((c) => `.page-content ul[data-list-color="${c.value}"] { --list-marker-color: ${c.hex}; }`).join("\n")}
.page-content ul[data-list-style] { list-style: none; padding-left: 1.5em; }
.page-content ul[data-list-style] li::before { content: ""; display: inline-block; width: 1em; height: 1em; margin-right: 0.35em; margin-left: -1.5em; vertical-align: -0.15em; background-color: var(--list-marker-color); -webkit-mask-size: contain; mask-size: contain; -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat; -webkit-mask-position: center; mask-position: center; }
.page-content ul[data-list-style="disc"] li::before { -webkit-mask-image: url("data:image/svg+xml,${PUBLIC_LIST_MARKER_SVG.disc}"); mask-image: url("data:image/svg+xml,${PUBLIC_LIST_MARKER_SVG.disc}"); }
.page-content ul[data-list-style="circle"] li::before { -webkit-mask-image: url("data:image/svg+xml,${PUBLIC_LIST_MARKER_SVG.circle}"); mask-image: url("data:image/svg+xml,${PUBLIC_LIST_MARKER_SVG.circle}"); }
.page-content ul[data-list-style="square"] li::before { -webkit-mask-image: url("data:image/svg+xml,${PUBLIC_LIST_MARKER_SVG.square}"); mask-image: url("data:image/svg+xml,${PUBLIC_LIST_MARKER_SVG.square}"); }
.page-content ul[data-list-style="check"] li::before { -webkit-mask-image: url("data:image/svg+xml,${PUBLIC_LIST_MARKER_SVG.check}"); mask-image: url("data:image/svg+xml,${PUBLIC_LIST_MARKER_SVG.check}"); }
.page-content ul[data-list-style="check-circle"] li::before { -webkit-mask-image: url("data:image/svg+xml,${PUBLIC_LIST_MARKER_SVG["check-circle"]}"); mask-image: url("data:image/svg+xml,${PUBLIC_LIST_MARKER_SVG["check-circle"]}"); }
.page-content ul[data-list-style="dash"] li::before { -webkit-mask-image: url("data:image/svg+xml,${PUBLIC_LIST_MARKER_SVG.dash}"); mask-image: url("data:image/svg+xml,${PUBLIC_LIST_MARKER_SVG.dash}"); }
.page-content ul[data-list-style="arrow"] li::before { -webkit-mask-image: url("data:image/svg+xml,${PUBLIC_LIST_MARKER_SVG.arrow}"); mask-image: url("data:image/svg+xml,${PUBLIC_LIST_MARKER_SVG.arrow}"); }
.page-content ul[data-list-style="arrow-right"] li::before { -webkit-mask-image: url("data:image/svg+xml,${PUBLIC_LIST_MARKER_SVG["arrow-right"]}"); mask-image: url("data:image/svg+xml,${PUBLIC_LIST_MARKER_SVG["arrow-right"]}"); }
.page-content ul[data-list-style="star"] li::before { -webkit-mask-image: url("data:image/svg+xml,${PUBLIC_LIST_MARKER_SVG.star}"); mask-image: url("data:image/svg+xml,${PUBLIC_LIST_MARKER_SVG.star}"); }
.page-content ul[data-list-style="heart"] li::before { -webkit-mask-image: url("data:image/svg+xml,${PUBLIC_LIST_MARKER_SVG.heart}"); mask-image: url("data:image/svg+xml,${PUBLIC_LIST_MARKER_SVG.heart}"); }
.page-content ul[data-list-style="bolt"] li::before { -webkit-mask-image: url("data:image/svg+xml,${PUBLIC_LIST_MARKER_SVG.bolt}"); mask-image: url("data:image/svg+xml,${PUBLIC_LIST_MARKER_SVG.bolt}"); }
${getTimelineRenderCss(".page-content")}
${getPageShowRenderCss(".page-content")}
${getSharedWebBlocksCss(".page-editor")}
${getTimelineRenderCss(".page-editor .page-content")}
${getPageShowRenderCss(".page-editor .page-content")}
${getWorkPricingRenderCss(".page-content")}
${getWorkPricingRenderCss(".page-editor .page-content")}
.page-content textarea::placeholder,
.page-content input::placeholder,
.article-page-content textarea::placeholder,
.article-page-content input::placeholder {
  opacity: 0 !important;
  color: transparent !important;
}
.page-content .page-web-elements-announcement-input:empty::before,
.page-content .page-web-elements-announcement-input[data-placeholder-visible="1"]::before,
.article-page-content .page-web-elements-announcement-input:empty::before,
.article-page-content .page-web-elements-announcement-input[data-placeholder-visible="1"]::before {
  content: none !important;
}
${getSiteBlueTitleUnifiedCss(".service-page-content-root .page-content")}
.service-page-content-root .page-content .page-web-article-text .page-web-elements-title-input,
.page-content .page-web-article-text .page-web-elements-title-input {
  font-size: 1.16rem !important;
  line-height: 1.6 !important;
  font-weight: 700 !important;
  padding: 0.25rem 0.45rem !important;
}
.service-page-content-root .page-content .page-web-cover .page-web-cover-inner > .page-web-elements.page-web-elements-description textarea.page-web-elements-description-input {
  line-height: 1.5 !important;
  padding: 0.15rem 0.45rem !important;
}
`;
}

export const PUBLIC_PAGE_CONTENT_READY_ATTR = "data-public-content-ready";
