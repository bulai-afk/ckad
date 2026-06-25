"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import {
  positionCoverMenuDropdownNearTrigger,
  positionCoverSubmenuPanelsNearTriggers,
  resetCoverMenuDropdownStyles,
  resetCoverSubmenuPanelStyles,
} from "@/lib/bannerCoverMenuPosition";
import {
  COVER_TYPE_PRESETS,
  PAGE_EDITOR_FOCUS_TARGET_ATTR,
  type CoverAspectPresetId,
  type CoverInsertBlockKind,
  type CoverTypePresetId,
} from "@/lib/bannerCoverPresets";
import {
  getBannerCoverEditorChromeCss,
  getBannerCoverMenuPortalCss,
} from "@/lib/bannerCoverEditorChromeCss";
import {
  resolveButtonHAlign,
  resolveCoverLayoutHAlign,
  resolveSubtitleHAlign,
  resolveTitleHAlign,
  type BannerHAlign,
} from "@/lib/bannerElementPosition";
import { getPageShowRenderCss } from "@/lib/pageShowRender";
import { getSharedWebBlocksCss } from "@/lib/sharedWebBlocksCss";
import { BannerCoverBlobLayers } from "@/components/BannerCoverBlobLayers";
import {
  layoutWebElementsAnnouncementInput,
  layoutWebElementsTextareaSize,
  layoutWebElementsV2TextareasInRoot,
  syncAnnouncementInputFromModel,
  syncAnnouncementInputPlaceholder,
} from "@/lib/webElementsTextareaLayout";
import { applyWebElementsActionsAlign } from "@/lib/webElementsActionsAlign";
import {
  BANNER_COVER_DEFAULT_CONTENT,
  BANNER_COVER_FIELD_PLACEHOLDERS,
  BANNER_COVER_INSERT_DEFAULTS,
  normalizeBannerCoverAnnouncementLearnMore,
  normalizeBannerCoverAnnouncementText,
  normalizeBannerCoverButtonSecondary,
} from "@/lib/bannerCoverDefaults";
import {
  webElementsFieldRowSetFlexJustify,
  type WebElementsHAlign,
} from "@/lib/webElementsFieldRowJustify";

const BANNER_COVER_SCOPE = ".banners-admin-cover-editor";

function openCtaLinkEditor(
  e: React.MouseEvent,
  target: "primary" | "secondary" | "announcementSecondary",
  onOpenLinkModal: (target: "primary" | "secondary" | "announcementSecondary") => void,
) {
  e.preventDefault();
  e.stopPropagation();
  onOpenLinkModal(target);
}

export type BannerCoverFocusField =
  | "title"
  | "description"
  | "announcement"
  | "actions"
  | null;

export type BannerCoverEditorSlideModel = {
  title: string;
  announcementText: string;
  bannerType: CoverTypePresetId;
  showAnnouncement: boolean;
  showAnnouncementLearnMore: boolean;
  showBottomLearnMore: boolean;
  subtitle: string;
  buttonText: string;
  buttonHref: string;
  learnMoreText: string;
  announcementLearnMoreText: string;
  announcementLearnMoreHref: string;
  buttonYmGoal?: string;
  learnMoreYmGoal?: string;
  announcementLearnMoreYmGoal?: string;
  showTitle: boolean;
  showSubtitle: boolean;
  showButton: boolean;
  image: string | null;
  imagePosY: number;
  align: BannerHAlign;
  verticalAlign: "top" | "middle" | "bottom";
  titleAlign?: BannerHAlign;
  subtitleAlign?: BannerHAlign;
  buttonAlign?: BannerHAlign;
  textBand: "full" | "left" | "right";
  showOverlay: boolean;
  lineHeight?: number;
};

type BannerCoverEditorSlideProps = {
  slide: BannerCoverEditorSlideModel;
  onChange: (patch: Partial<BannerCoverEditorSlideModel>) => void;
  onFocusField?: (field: BannerCoverFocusField) => void;
  onOpenLinkModal: (target: "primary" | "secondary" | "announcementSecondary") => void;
  onUploadImage: () => void;
  coverAspect?: CoverAspectPresetId;
};

function applyFieldRowAlign(row: HTMLElement | null, align: WebElementsHAlign) {
  if (!row) return;
  row.style.textAlign = align;
  webElementsFieldRowSetFlexJustify(row, align);
}

const COVER_ELEMENT_LABELS: Record<CoverInsertBlockKind, string> = {
  title: "Заголовок",
  subtitle: "Подзаголовок",
  button: "Кнопка",
  announcement: "Плашка анонса",
};

function FieldToggleBox() {
  return (
    <span
      className="page-web-text-block-v2-field-toggle-box inline-flex size-[18px] shrink-0 items-center justify-center rounded border border-slate-300 bg-white shadow-sm transition-colors"
      aria-hidden="true"
    />
  );
}

type BannerCoverToolbarProps = {
  slide: BannerCoverEditorSlideModel;
  coverRef: RefObject<HTMLDivElement | null>;
  onChange: (patch: Partial<BannerCoverEditorSlideModel>) => void;
  onUploadImage: () => void;
};

function BannerCoverToolbar({
  slide,
  coverRef,
  onChange,
  onUploadImage,
}: BannerCoverToolbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openSub, setOpenSub] = useState<"type" | "elements" | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuPortalRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const trigger = triggerRef.current;
    const dropdown = menuPortalRef.current;
    if (!trigger || !dropdown) return;
    if (!menuOpen) {
      resetCoverMenuDropdownStyles(dropdown);
      resetCoverSubmenuPanelStyles(dropdown);
      return;
    }
    positionCoverMenuDropdownNearTrigger(trigger, dropdown);
  }, [menuOpen]);

  useLayoutEffect(() => {
    const dropdown = menuPortalRef.current;
    if (!dropdown || !menuOpen) return;
    positionCoverSubmenuPanelsNearTriggers(dropdown);
  }, [menuOpen, openSub]);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (toolbarRef.current?.contains(t) || menuPortalRef.current?.contains(t)) return;
      setMenuOpen(false);
      setOpenSub(null);
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    return () => window.removeEventListener("pointerdown", onPointerDown, true);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onReposition = () => {
      const trigger = triggerRef.current;
      const dropdown = menuPortalRef.current;
      if (!trigger || !dropdown) return;
      positionCoverMenuDropdownNearTrigger(trigger, dropdown);
      positionCoverSubmenuPanelsNearTriggers(dropdown);
    };
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [menuOpen, openSub]);

  const toggleElement = (kind: CoverInsertBlockKind) => {
    if (kind === "title") {
      onChange({
        showTitle: !slide.showTitle,
        title: slide.title.trim() || BANNER_COVER_INSERT_DEFAULTS.title,
      });
      return;
    }
    if (kind === "subtitle") {
      onChange({
        showSubtitle: !slide.showSubtitle,
        subtitle: slide.subtitle.trim() || BANNER_COVER_INSERT_DEFAULTS.subtitle,
      });
      return;
    }
    if (kind === "button") {
      onChange({
        showButton: !slide.showButton,
        buttonText: slide.buttonText.trim() || BANNER_COVER_INSERT_DEFAULTS.button,
      });
      return;
    }
    if (slide.showAnnouncement) {
      onChange({ showAnnouncement: false });
      return;
    }
    onChange({
      showAnnouncement: true,
      announcementText:
        slide.announcementText.trim() || BANNER_COVER_INSERT_DEFAULTS.announcement,
    });
  };

  const elementVisible = (kind: CoverInsertBlockKind) => {
    if (kind === "title") return slide.showTitle;
    if (kind === "subtitle") return slide.showSubtitle;
    if (kind === "button") return slide.showButton;
    return slide.showAnnouncement;
  };

  const setCoverType = (type: CoverTypePresetId) => {
    if (type === "image") {
      onChange({ bannerType: "image", textBand: "full", align: "center" });
    } else if (type === "split") {
      onChange({ bannerType: "split", textBand: "left", align: "left" });
    } else {
      onChange({ bannerType: "hero", textBand: "full", align: "center" });
    }
    setOpenSub(null);
  };

  const canUpload = slide.bannerType === "image" || slide.bannerType === "split";

  return (
    <div
      ref={toolbarRef}
      className="page-web-cover-toolbar"
      data-menu-open={menuOpen ? "1" : "0"}
      contentEditable={false}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        ref={triggerRef}
        type="button"
        className="page-web-cover-menu-trigger"
        tabIndex={-1}
        aria-label="Меню баннера"
        aria-haspopup="true"
        aria-expanded={menuOpen}
        title="Действия с баннером"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setMenuOpen((v) => !v);
          setOpenSub(null);
        }}
      >
        <span className="page-web-cover-menu-dots" aria-hidden="true" />
      </button>
      {typeof document !== "undefined" && menuOpen
        ? createPortal(
            <>
              <style>{getBannerCoverMenuPortalCss()}</style>
              <div
                ref={menuPortalRef}
                role="menu"
                className="banner-cover-menu-portal-root page-web-cover-menu-dropdown"
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
        <div
          className="page-web-cover-menu-sub"
          data-submenu-open={openSub === "type" ? "1" : "0"}
        >
          <button
            type="button"
            className="page-web-cover-menu-sub-trigger"
            tabIndex={-1}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => setOpenSub((s) => (s === "type" ? null : "type"))}
          >
            <span className="page-web-cover-menu-sub-label">Тип баннера</span>
            <span className="page-web-cover-menu-chevron" aria-hidden="true" />
          </button>
          <div role="menu" className="page-web-cover-menu-sub-panel">
            <div className="page-web-cover-type-panel">
              {COVER_TYPE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  role="menuitemradio"
                  className="page-web-cover-menu-type"
                  tabIndex={-1}
                  data-set-cover-type={preset.id}
                  aria-checked={slide.bannerType === preset.id}
                  onClick={() => setCoverType(preset.id)}
                >
                  <span className="page-web-cover-menu-type-radio" aria-hidden="true" />
                  <span className="page-web-cover-menu-type-label">{preset.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div
          className="page-web-cover-menu-sub"
          data-submenu-open={openSub === "elements" ? "1" : "0"}
        >
          <button
            type="button"
            className="page-web-cover-menu-sub-trigger"
            tabIndex={-1}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => setOpenSub((s) => (s === "elements" ? null : "elements"))}
          >
            <span className="page-web-cover-menu-sub-label">Элементы</span>
            <span className="page-web-cover-menu-chevron" aria-hidden="true" />
          </button>
          <div role="menu" className="page-web-cover-menu-sub-panel">
            <div className="page-web-cover-elements-panel">
            {(["title", "subtitle", "button", "announcement"] as CoverInsertBlockKind[]).map(
              (kind) => (
                <button
                  key={kind}
                  type="button"
                  role="menuitemcheckbox"
                  className="page-web-cover-menu-insert-cover-el page-web-text-block-menu-element page-web-text-block-v2-field-toggle !flex w-full flex-row flex-nowrap items-center gap-2.5 rounded-md py-2 pl-2.5 pr-2 text-left text-[13px] font-medium text-slate-800 transition-colors hover:bg-slate-50"
                  tabIndex={-1}
                  aria-checked={elementVisible(kind)}
                  onClick={() => toggleElement(kind)}
                >
                  <FieldToggleBox />
                  <span className="min-w-0 flex-1 truncate text-slate-800">
                    {COVER_ELEMENT_LABELS[kind]}
                  </span>
                </button>
              ),
            )}
            <button
              type="button"
              role="menuitemcheckbox"
              className="page-web-cover-menu-insert-cover-el page-web-text-block-menu-element page-web-text-block-v2-field-toggle !flex w-full flex-row flex-nowrap items-center gap-2.5 rounded-md py-2 pl-2.5 pr-2 text-left text-[13px] font-medium text-slate-800 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              tabIndex={-1}
              aria-checked={slide.showBottomLearnMore}
              disabled={!slide.showButton}
              onClick={() =>
                onChange({
                  showBottomLearnMore: !slide.showBottomLearnMore,
                  learnMoreText:
                    slide.learnMoreText.trim() || BANNER_COVER_DEFAULT_CONTENT.buttonSecondary,
                })
              }
            >
              <FieldToggleBox />
              <span className="min-w-0 flex-1 truncate text-slate-800">Дополнительная кнопка</span>
            </button>
            <button
              type="button"
              role="menuitemcheckbox"
              className="page-web-cover-menu-insert-cover-el page-web-text-block-menu-element page-web-text-block-v2-field-toggle !flex w-full flex-row flex-nowrap items-center gap-2.5 rounded-md py-2 pl-2.5 pr-2 text-left text-[13px] font-medium text-slate-800 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              tabIndex={-1}
              aria-checked={slide.showAnnouncementLearnMore}
              disabled={!slide.showAnnouncement}
              onClick={() =>
                onChange({
                  showAnnouncementLearnMore: !slide.showAnnouncementLearnMore,
                  announcementLearnMoreText:
                    slide.announcementLearnMoreText.trim() ||
                    BANNER_COVER_DEFAULT_CONTENT.announcementLearnMore,
                })
              }
            >
              <FieldToggleBox />
              <span className="min-w-0 flex-1 truncate text-slate-800">Кнопка «Подробнее»</span>
            </button>
            </div>
          </div>
        </div>
        {canUpload ? (
          <button
            type="button"
            role="menuitem"
            className="page-web-cover-menu-upload"
            tabIndex={-1}
            onClick={() => {
              onUploadImage();
              setMenuOpen(false);
            }}
          >
            Загрузить изображение
          </button>
        ) : null}
        {slide.bannerType === "image" ? (
          <button
            type="button"
            role="menuitem"
            className="page-web-cover-menu-overlay"
            tabIndex={-1}
            onClick={() => onChange({ showOverlay: !slide.showOverlay })}
          >
            {slide.showOverlay ? "Убрать затемнение" : "Включить затемнение"}
          </button>
        ) : null}
              </div>
            </>,
            document.body,
          )
        : null}
    </div>
  );
}

export function BannerCoverEditorSlide({
  slide,
  onChange,
  onFocusField,
  onOpenLinkModal,
  onUploadImage,
  coverAspect = "1-8",
}: BannerCoverEditorSlideProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const coverRef = useRef<HTMLDivElement | null>(null);
  const titleTaRef = useRef<HTMLTextAreaElement | null>(null);
  const descTaRef = useRef<HTMLTextAreaElement | null>(null);
  const announcementRef = useRef<HTMLDivElement | null>(null);

  const titleH = resolveTitleHAlign(slide);
  const subtitleH = resolveSubtitleHAlign(slide);
  const buttonH = resolveButtonHAlign(slide);
  const announcementH = slide.align ?? "center";
  const coverLayoutH = resolveCoverLayoutHAlign(slide);

  const relayout = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    layoutWebElementsV2TextareasInRoot(root);
    if (announcementRef.current) layoutWebElementsAnnouncementInput(announcementRef.current);
  }, []);

  useLayoutEffect(() => {
    syncAnnouncementInputFromModel(announcementRef.current, slide.announcementText);
    relayout();
  });

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const titleIsland = root.querySelector(
      ".page-web-elements.page-web-elements-title",
    ) as HTMLElement | null;
    const descIsland = root.querySelector(
      ".page-web-elements.page-web-elements-description",
    ) as HTMLElement | null;
    const annRow = root.querySelector(
      ".page-web-elements-announcement-row",
    ) as HTMLElement | null;
    const actions = root.querySelector(".page-web-elements-actions") as HTMLElement | null;
    titleIsland?.setAttribute("data-cover-title-halign", titleH);
    descIsland?.setAttribute("data-cover-description-halign", subtitleH);
    applyFieldRowAlign(
      titleIsland?.querySelector(".page-web-elements-field-row") as HTMLElement | null,
      titleH,
    );
    applyFieldRowAlign(
      descIsland?.querySelector(".page-web-elements-field-row") as HTMLElement | null,
      subtitleH,
    );
    if (annRow) {
      annRow.style.textAlign = announcementH;
    }
    if (actions) {
      actions.setAttribute("data-cover-actions-halign", buttonH);
      applyWebElementsActionsAlign(actions, buttonH);
      const cluster = actions.querySelector(
        ".page-web-elements-actions-cluster",
      ) as HTMLElement | null;
      cluster?.style.removeProperty("justify-content");
    }
  }, [titleH, subtitleH, buttonH, announcementH]);

  useEffect(() => {
    const cover = coverRef.current;
    if (!cover) return;
    const image = typeof slide.image === "string" ? slide.image.trim() : "";
    if (image) {
      const safe = image.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      cover.classList.add("page-web-cover-has-bg");
      cover.style.setProperty("--cover-bg-image", `url("${safe}")`);
      cover.style.setProperty("--cover-bg-pos", `50% ${slide.imagePosY}%`);
    } else {
      cover.classList.remove("page-web-cover-has-bg");
      cover.style.removeProperty("--cover-bg-image");
      cover.style.removeProperty("--cover-bg-pos");
    }
    cover.setAttribute("data-cover-show-overlay", slide.showOverlay ? "1" : "0");
    cover.setAttribute("data-cover-aspect", coverAspect);
  }, [slide.image, slide.imagePosY, slide.showOverlay, coverAspect]);

  const setFocusTarget = (el: HTMLElement | null) => {
    const root = rootRef.current;
    if (!root) return;
    root.querySelectorAll(`[${PAGE_EDITOR_FOCUS_TARGET_ATTR}]`).forEach((n) =>
      n.removeAttribute(PAGE_EDITOR_FOCUS_TARGET_ATTR),
    );
    if (el) el.setAttribute(PAGE_EDITOR_FOCUS_TARGET_ATTR, "1");
  };

  const onTitleFocus = () => {
    setFocusTarget(titleTaRef.current);
    onFocusField?.("title");
  };

  const onDescFocus = () => {
    setFocusTarget(descTaRef.current);
    onFocusField?.("description");
  };

  const onAnnouncementFocus = () => {
    setFocusTarget(announcementRef.current);
    onFocusField?.("announcement");
  };

  const onActionsFocus = (cluster: HTMLElement) => {
    setFocusTarget(cluster);
    onFocusField?.("actions");
  };

  const showButton2 =
    slide.showButton && slide.showBottomLearnMore;

  return (
    <div ref={rootRef} className="banners-admin-cover-editor @container h-full w-full">
      <style>{`
        ${getSharedWebBlocksCss(BANNER_COVER_SCOPE)}
        ${getPageShowRenderCss(BANNER_COVER_SCOPE)}
        ${getBannerCoverEditorChromeCss(BANNER_COVER_SCOPE)}
        ${BANNER_COVER_SCOPE} .page-content { width: 100%; height: 100%; }
        ${BANNER_COVER_SCOPE} .page-web-cover { width: 100% !important; margin: 0 !important; }
      `}</style>
      <div className="page-content h-full">
        <div
          ref={coverRef}
          className="page-web-cover h-full"
          data-web-element="cover"
          data-cover-type={slide.bannerType}
          data-cover-aspect={coverAspect}
          data-cover-halign={coverLayoutH}
          data-cover-valign={slide.verticalAlign}
          data-cover-show-overlay={slide.showOverlay ? "1" : "0"}
        >
          <BannerCoverToolbar
            slide={slide}
            coverRef={coverRef}
            onChange={onChange}
            onUploadImage={onUploadImage}
          />
          {slide.bannerType === "hero" || slide.bannerType === "split" ? (
            <BannerCoverBlobLayers />
          ) : null}
          <div
            className="page-web-cover-inner"
            data-cover-unlocked="1"
            data-cover-show-button2={showButton2 ? "1" : "0"}
            title="Нажмите, чтобы отредактировать текст баннера"
          >
            {slide.showAnnouncement ? (
              <div className="page-web-elements page-web-elements-announcement">
                <div className="page-web-elements-announcement-row">
                  <div className="page-web-elements-announcement-input-shell">
                    <div className="page-web-elements-announcement-strip">
                      <div
                        ref={announcementRef}
                        className="page-web-elements-announcement-input"
                        contentEditable
                        suppressContentEditableWarning
                        role="textbox"
                        spellCheck
                        data-placeholder={BANNER_COVER_FIELD_PLACEHOLDERS.announcement}
                        onFocus={onAnnouncementFocus}
                        onBlur={(e) => {
                          const text = (e.currentTarget.textContent ?? "")
                            .replace(/\u200b/g, "")
                            .trim();
                          onChange({ announcementText: text });
                          syncAnnouncementInputPlaceholder(e.currentTarget);
                          layoutWebElementsAnnouncementInput(e.currentTarget);
                        }}
                        onInput={(e) => {
                          syncAnnouncementInputPlaceholder(e.currentTarget);
                          layoutWebElementsAnnouncementInput(e.currentTarget);
                        }}
                      />
                      {slide.showAnnouncementLearnMore ? (
                        <span
                          className="page-web-elements-announcement-learn-more cursor-pointer"
                          role="button"
                          tabIndex={0}
                          onMouseDown={(e) =>
                            openCtaLinkEditor(e, "announcementSecondary", onOpenLinkModal)
                          }
                        >
                          {normalizeBannerCoverAnnouncementLearnMore(
                            slide.announcementLearnMoreText,
                          )}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {slide.showTitle ? (
              <div
                className="page-web-elements page-web-elements-title"
                data-cover-title-halign={titleH}
              >
                <div className="page-web-elements-field-row">
                  <textarea
                    ref={titleTaRef}
                    className="page-web-elements-title-input"
                    spellCheck
                    placeholder={BANNER_COVER_FIELD_PLACEHOLDERS.title}
                    rows={1}
                    value={slide.title}
                    onFocus={onTitleFocus}
                    onChange={(e) => onChange({ title: e.target.value })}
                    onInput={(e) => layoutWebElementsTextareaSize(e.currentTarget)}
                  />
                </div>
              </div>
            ) : null}

            {slide.showSubtitle ? (
              <div
                className="page-web-elements page-web-elements-description"
                data-cover-description-halign={subtitleH}
              >
                <div className="page-web-elements-field-row">
                  <textarea
                    ref={descTaRef}
                    className="page-web-elements-description-input"
                    spellCheck
                    placeholder={BANNER_COVER_FIELD_PLACEHOLDERS.description}
                    rows={1}
                    value={slide.subtitle}
                    onFocus={onDescFocus}
                    onChange={(e) => onChange({ subtitle: e.target.value })}
                    onInput={(e) => layoutWebElementsTextareaSize(e.currentTarget)}
                  />
                </div>
              </div>
            ) : null}

            {slide.showButton ? (
              <div
                className="page-web-elements-actions"
                data-cover-actions-halign={buttonH}
              >
                <div
                  className="page-web-elements-actions-cluster"
                  tabIndex={-1}
                  onFocus={(e) => onActionsFocus(e.currentTarget)}
                >
                  <div className="page-web-elements page-web-elements-button">
                    <p className="page-web-elements-cta-wrap">
                      <a
                        href={slide.buttonHref || "#"}
                        className="page-web-elements-cta-button cursor-pointer"
                        onMouseDown={(e) => openCtaLinkEditor(e, "primary", onOpenLinkModal)}
                        onClick={(e) => e.preventDefault()}
                        onFocus={(e) =>
                          onActionsFocus(
                            e.currentTarget.closest(
                              ".page-web-elements-actions-cluster",
                            ) as HTMLElement,
                          )
                        }
                      >
                        {slide.buttonText.trim() || BANNER_COVER_DEFAULT_CONTENT.button}
                      </a>
                    </p>
                  </div>
                  {showButton2 ? (
                    <div className="page-web-elements page-web-elements-button2">
                      <p className="page-web-elements-cta-wrap">
                        <a
                          href={slide.buttonHref || "#"}
                          className="page-web-elements-cta-button-secondary cursor-pointer"
                          onMouseDown={(e) => openCtaLinkEditor(e, "secondary", onOpenLinkModal)}
                          onClick={(e) => e.preventDefault()}
                          onFocus={(e) =>
                            onActionsFocus(
                              e.currentTarget.closest(
                                ".page-web-elements-actions-cluster",
                              ) as HTMLElement,
                            )
                          }
                        >
                          {normalizeBannerCoverButtonSecondary(slide.learnMoreText)}
                        </a>
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
