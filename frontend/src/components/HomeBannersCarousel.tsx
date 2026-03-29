"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useCarouselSwipe } from "@/hooks/useCarouselSwipe";
import type { ReactNode } from "react";
import {
  bannerHToAlignSelf,
  normalizeBannerLineHeight,
  parseBannerTextBand,
  resolveBannerTitleLineHeight,
  resolveButtonHAlign,
  resolveSubtitleHAlign,
  resolveTitleHAlign,
} from "@/lib/bannerElementPosition";
import { BannerTextOverlayBand } from "@/components/BannerTextOverlayBand";
import { normalizeFontSizeToPercent } from "@/lib/bannerFontSize";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const CALLBACK_FORM_LINK = "callback://open";

/** Нормализация переводов строк и явные <br /> — надёжнее, чем только whitespace-pre-line (в т.ч. при line-height: 1). */
function bannerTitleToNodes(text: string): ReactNode {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");
  return lines.map((line, idx) => (
    <Fragment key={idx}>
      {idx > 0 ? <br /> : null}
      {line}
    </Fragment>
  ));
}

function bannerTitleForAlt(text: string): string {
  return text.replace(/\r\n/g, " ").replace(/\r/g, " ").replace(/\n/g, " ").trim();
}

export type BannerSlide = {
  id: string;
  title: string;
  subtitle?: string;
  buttonText?: string;
  buttonHref?: string;
  showTitle?: boolean;
  showSubtitle?: boolean;
  showButton?: boolean;
  image: string | null;
  align?: "left" | "center" | "right";
  verticalAlign?: "top" | "middle" | "bottom";
  titleAlign?: "left" | "center" | "right";
  subtitleAlign?: "left" | "center" | "right";
  buttonAlign?: "left" | "center" | "right";
  fontSize?: number;
  lineHeight?: number;
  textColor?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  imagePosY?: number;
  showOverlay?: boolean;
  titleFontSize?: number;
  subtitleFontSize?: number;
  buttonFontSize?: number;
  titleColor?: string;
  subtitleColor?: string;
  buttonTextColor?: string;
  titleBold?: boolean;
  titleItalic?: boolean;
  subtitleBold?: boolean;
  subtitleItalic?: boolean;
  buttonBold?: boolean;
  buttonItalic?: boolean;
  /** Явная толщина шрифта (100..900). Если задана — приоритетнее, чем *Bold. */
  titleWeight?: number;
  subtitleWeight?: number;
  buttonWeight?: number;
  /** Колонка текста: вся ширина или левая/правая половина банера. */
  textBand?: "full" | "left" | "right";
};

type HomeBannersCarouselProps = {
  /** Если не передать — данные подгружаются с API на клиенте (рекомендуется для главной). */
  slides?: BannerSlide[];
  /** Переносы строк в заголовке (символы \\n из API / админки), как на /admin/banners */
  preserveBannerTitleLineBreaks?: boolean;
};

export function HomeBannersCarousel({
  slides = [],
  preserveBannerTitleLineBreaks = true,
}: HomeBannersCarouselProps) {
  const [runtimeSlides, setRuntimeSlides] = useState<BannerSlide[]>(() =>
    Array.isArray(slides) ? slides : [],
  );

  useEffect(() => {
    if (slides.length > 0) {
      // eslint-disable-next-line no-console
      console.log(
        "[HOME_BANNERS] props slides",
        slides.map((s) => ({ id: s.id, showOverlay: s.showOverlay })),
      );
      setRuntimeSlides(slides);
      return;
    }
    void (async () => {
      try {
        // Тот же origin, что и страница — Next проксирует на Express (см. app/api/pages/banners).
        const res = await fetch("/api/pages/banners", {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { slides?: BannerSlide[] };
        if (Array.isArray(data.slides) && data.slides.length > 0) {
          // eslint-disable-next-line no-console
          console.log(
            "[HOME_BANNERS] fetched slides",
            data.slides.map((s) => ({
              id: s.id,
              showOverlay: s.showOverlay,
              textBand: (s as { textBand?: unknown }).textBand,
            })),
          );
          setRuntimeSlides(data.slides);
        }
      } catch {
        // keep fallback banner
      }
    })();
  }, [slides]);

  const normalized = useMemo(
    () =>
      runtimeSlides
        .filter(
          (s): s is BannerSlide =>
            typeof s === "object" &&
            s !== null &&
            typeof s.id === "string" &&
            typeof s.title === "string",
        )
        .map((s) => ({
        ...s,
        title: typeof s.title === "string" ? s.title : "",
        align: s.align ?? "center",
        verticalAlign: s.verticalAlign ?? "middle",
        fontSize: normalizeFontSizeToPercent(s.fontSize),
        titleFontSize: normalizeFontSizeToPercent(
          s.titleFontSize ?? s.fontSize ?? 200,
        ),
        subtitleFontSize: normalizeFontSizeToPercent(
          s.subtitleFontSize ??
            Math.max(
              70,
              Math.round(normalizeFontSizeToPercent(s.fontSize ?? 200) * 0.5),
            ),
        ),
        buttonFontSize: normalizeFontSizeToPercent(s.buttonFontSize ?? 100),
        titleColor: typeof s.titleColor === "string" ? s.titleColor : s.textColor ?? "#ffffff",
        subtitleColor:
          typeof s.subtitleColor === "string" ? s.subtitleColor : s.textColor ?? "#ffffff",
        buttonTextColor:
          typeof s.buttonTextColor === "string" ? s.buttonTextColor : "#ffffff",
        titleBold: typeof s.titleBold === "boolean" ? s.titleBold : Boolean(s.bold),
        titleItalic:
          typeof s.titleItalic === "boolean" ? s.titleItalic : Boolean(s.italic),
        subtitleBold:
          typeof s.subtitleBold === "boolean" ? s.subtitleBold : false,
        subtitleItalic:
          typeof s.subtitleItalic === "boolean" ? s.subtitleItalic : false,
        buttonBold:
          typeof s.buttonBold === "boolean" ? s.buttonBold : true,
        buttonItalic:
          typeof s.buttonItalic === "boolean" ? s.buttonItalic : false,
        textBand: parseBannerTextBand(
          (s as { textBand?: unknown }).textBand ??
            (s as { text_band?: unknown }).text_band,
        ),
        lineHeight: normalizeBannerLineHeight(s.lineHeight),
        textColor: s.textColor ?? "#ffffff",
        imagePosY: s.imagePosY ?? 50,
        showOverlay: typeof s.showOverlay === "boolean" ? s.showOverlay : true,
        })),
    [runtimeSlides],
  );

  const [index, setIndex] = useState(0);
  const [callbackModalOpen, setCallbackModalOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorText, setErrorText] = useState("");
  const canUse = normalized.length > 0;

  async function submitCallbackForm(e: React.FormEvent) {
    e.preventDefault();
    setErrorText("");
    setStatus("sending");
    try {
      const name = `${firstName} ${lastName}`.trim();
      const message = "Заявка из кнопки баннера.";
      const res = await fetch(`${API_URL}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email, message }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean };
      if (!res.ok || !data.ok) {
        setStatus("error");
        setErrorText("Не удалось отправить заявку. Проверьте данные и попробуйте снова.");
        return;
      }
      setStatus("success");
      setFirstName("");
      setLastName("");
      setPhone("");
      setEmail("");
      window.setTimeout(() => {
        setCallbackModalOpen(false);
        setStatus("idle");
      }, 900);
    } catch {
      setStatus("error");
      setErrorText("Нет связи с сервером. Попробуйте позже.");
    }
  }

  useEffect(() => {
    if (!normalized.length) return;
    // eslint-disable-next-line no-console
    console.log(
      "[HOME_BANNERS] normalized",
      normalized.map((s) => ({
        id: s.id,
        showOverlay: s.showOverlay,
        textBand: s.textBand,
      })),
    );
  }, [normalized]);

  useEffect(() => {
    if (normalized.length <= 1) return;
    const t = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % normalized.length);
    }, 5000);
    return () => window.clearInterval(t);
  }, [normalized.length]);

  useEffect(() => {
    if (index <= normalized.length - 1) return;
    setIndex(0);
  }, [normalized.length, index]);

  const bannerSwipe = useCarouselSwipe(
    () =>
      setIndex((i) => (normalized.length ? (i - 1 + normalized.length) % normalized.length : 0)),
    () => setIndex((i) => (normalized.length ? (i + 1) % normalized.length : 0)),
    { enabled: normalized.length > 1 },
  );

  if (!canUse) {
    return (
      <div className="w-full min-w-0 shrink-0">
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#496db3] to-[#3f5f9d] px-6 py-8 text-white shadow-md md:px-10 md:py-10">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Центр каталогизации — клиентская часть
          </h1>
          <p className="mt-2 text-sm text-white/85 md:text-base">
            Публичные страницы, созданные в редакторе.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 shrink-0">
    <section className="relative overflow-hidden rounded-2xl shadow-md">
      <div
        className="relative w-full touch-pan-y overflow-hidden"
        style={{ paddingTop: "43.75%" }}
        {...bannerSwipe}
      >
        <div className="absolute inset-0">
          <div
            className="flex h-full transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
        {normalized.map((slide) => {
          const imageSrc = typeof slide.image === "string" ? slide.image.trim() : "";
          return (
          <div
            key={slide.id}
            className="relative h-full w-full shrink-0 bg-slate-900"
          >
            {imageSrc ? (
              <img
                src={imageSrc}
                alt={bannerTitleForAlt(slide.title)}
                className="absolute inset-0 z-0 h-full w-full object-cover"
                style={{ objectPosition: `50% ${slide.imagePosY}%` }}
              />
            ) : null}
            {slide.showOverlay ? (
              <div
                className="absolute inset-0 z-10"
                style={{ backgroundColor: "rgba(0, 0, 0, 0.35)" }}
              />
            ) : null}
            <BannerTextOverlayBand
              textBand={slide.textBand}
              verticalAlign={slide.verticalAlign}
            >
              {slide.showTitle !== false ? (
                <h1
                  className="m-0 max-w-[90%]"
                  style={{
                    alignSelf: bannerHToAlignSelf(
                      resolveTitleHAlign({
                        align: slide.align ?? "center",
                        titleAlign: slide.titleAlign,
                      }),
                    ),
                    marginTop: slide.verticalAlign === "top" ? "1.25rem" : undefined,
                    marginBottom: slide.verticalAlign === "bottom" ? "1.25rem" : undefined,
                    color: slide.titleColor,
                    fontSize: `${slide.titleFontSize}%`,
                    lineHeight: resolveBannerTitleLineHeight(
                      slide.title,
                      slide.lineHeight,
                      preserveBannerTitleLineBreaks,
                    ),
                    fontWeight:
                      typeof slide.titleWeight === "number"
                        ? slide.titleWeight
                        : slide.titleBold
                          ? 700
                          : 400,
                    fontStyle: slide.titleItalic ? "italic" : "normal",
                    textDecoration: slide.underline ? "underline" : "none",
                    textAlign: resolveTitleHAlign({
                      align: slide.align ?? "center",
                      titleAlign: slide.titleAlign,
                    }),
                  }}
                >
                  {preserveBannerTitleLineBreaks
                    ? bannerTitleToNodes(slide.title)
                    : slide.title}
                </h1>
              ) : null}
              {slide.showSubtitle ? (
                <p
                  className="mt-2 max-w-[90%] opacity-90"
                  style={{
                    alignSelf: bannerHToAlignSelf(
                      resolveSubtitleHAlign({
                        align: slide.align ?? "center",
                        subtitleAlign: slide.subtitleAlign,
                      }),
                    ),
                    color: slide.subtitleColor,
                    lineHeight: normalizeBannerLineHeight(slide.lineHeight),
                    textAlign: resolveSubtitleHAlign({
                      align: slide.align ?? "center",
                      subtitleAlign: slide.subtitleAlign,
                    }),
                    fontSize: `${slide.subtitleFontSize}%`,
                    fontWeight:
                      typeof slide.subtitleWeight === "number"
                        ? slide.subtitleWeight
                        : slide.subtitleBold
                          ? 700
                          : 400,
                    fontStyle: slide.subtitleItalic ? "italic" : "normal",
                  }}
                >
                  {slide.subtitle || "Подзаголовок"}
                </p>
              ) : null}
              {slide.showButton ? (
                <a
                  href={slide.buttonHref || "#"}
                  onClick={(e) => {
                    if ((slide.buttonHref || "").trim() !== CALLBACK_FORM_LINK) return;
                    e.preventDefault();
                    setCallbackModalOpen(true);
                  }}
                  className="mt-4 inline-flex items-center rounded-full bg-[#496db3] px-4 py-2 font-semibold text-white shadow-sm no-underline"
                  style={{
                    alignSelf: bannerHToAlignSelf(
                      resolveButtonHAlign({
                        align: slide.align ?? "center",
                        buttonAlign: slide.buttonAlign,
                      }),
                    ),
                    fontFamily: "inherit",
                    fontSize: `${slide.buttonFontSize}%`,
                    color: slide.buttonTextColor,
                    fontWeight:
                      typeof slide.buttonWeight === "number"
                        ? slide.buttonWeight
                        : slide.buttonBold
                          ? 700
                          : 600,
                    fontStyle: slide.buttonItalic ? "italic" : "normal",
                  }}
                >
                  {slide.buttonText || "Подробнее"}
                </a>
              ) : null}
            </BannerTextOverlayBand>
          </div>
        )})}
          </div>
        </div>
      </div>

      {normalized.length > 1 ? (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
          {normalized.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => setIndex(i)}
              className={`h-2.5 w-2.5 rounded-full ${i === index ? "bg-white" : "bg-white/45"}`}
              aria-label={`Перейти к банеру ${i + 1}`}
            />
          ))}
        </div>
      ) : null}
    </section>

    {callbackModalOpen ? (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4">
        <button
          type="button"
          className="absolute inset-0 z-0 bg-transparent"
          style={{ backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
          aria-label="Закрыть окно обратной связи"
          onClick={() => setCallbackModalOpen(false)}
        />
        <div className="relative z-10 w-[min(88vw,460px)] max-h-[92dvh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex-1 text-center">
              <h3 className="text-lg font-black uppercase tracking-tight text-[#496db3]">
                Обратный звонок
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setCallbackModalOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
              aria-label="Закрыть"
            >
              ×
            </button>
          </div>
          <p className="mb-4 text-[14px] font-semibold leading-[1.55] text-[#496db3]">
            Оставьте вашу заявку и наши специалисты свяжутся с вами.
          </p>
          <form className="flex flex-col gap-3" onSubmit={submitCallbackForm}>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Имя *"
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[14px] font-semibold text-[#496db3] outline-none transition placeholder:text-[#496db3]/55 focus:border-[#496db3] focus:ring-2 focus:ring-[#496db3]/25"
              required
            />
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Фамилия"
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[14px] font-semibold text-[#496db3] outline-none transition placeholder:text-[#496db3]/55 focus:border-[#496db3] focus:ring-2 focus:ring-[#496db3]/25"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Телефон"
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[14px] font-semibold text-[#496db3] outline-none transition placeholder:text-[#496db3]/55 focus:border-[#496db3] focus:ring-2 focus:ring-[#496db3]/25"
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-mail"
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[14px] font-semibold text-[#496db3] outline-none transition placeholder:text-[#496db3]/55 focus:border-[#496db3] focus:ring-2 focus:ring-[#496db3]/25"
            />
            {status === "success" ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-[14px] font-semibold text-emerald-800">
                Спасибо! Заявка отправлена.
              </div>
            ) : null}
            {status === "error" && errorText ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[14px] font-semibold text-red-800">
                {errorText}
              </div>
            ) : null}
            <button
              type="submit"
              disabled={status === "sending"}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#496db3] px-5 py-3 text-[14px] font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "sending" ? "Отправляем..." : "Отправить заявку"}
            </button>
          </form>
        </div>
      </div>
    ) : null}
    </div>
  );
}

