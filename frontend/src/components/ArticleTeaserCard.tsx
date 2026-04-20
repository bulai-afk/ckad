import Link from "next/link";
import type { PointerEvent } from "react";

export type ArticleTeaserCardProps = {
  href: string;
  /** Уже санитизированный URL превью или пустая строка */
  previewUrl: string;
  /** ISO YYYY-MM-DD для `<time>`; пусто — без атрибута datetime */
  dateTime: string;
  dateLabel: string;
  title: string;
  excerpt: string;
  articleKind?: "news" | "article";
  /**
   * В карусели мышью тянут слайд — для ссылок останавливаем всплытие pointerdown с мыши.
   */
  isolateLinksForCarousel?: boolean;
};

export function formatArticleDate(iso?: string | null): { dateTime: string; label: string } {
  if (!iso) {
    return { dateTime: "", label: "Без даты" };
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return { dateTime: "", label: "Без даты" };
  }
  return {
    dateTime: d.toISOString().slice(0, 10),
    label: d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }),
  };
}

export function excerptFromArticleDescription(description?: string | null): string {
  const d = typeof description === "string" ? description.trim() : "";
  if (d.length > 0) return d.length > 220 ? `${d.slice(0, 217)}…` : d;
  return "Откройте материал, чтобы прочитать полную новость по теме каталогизации.";
}

export function ArticleTeaserCard({
  href,
  previewUrl,
  dateTime,
  dateLabel,
  title,
  excerpt,
  articleKind,
  isolateLinksForCarousel = false,
}: ArticleTeaserCardProps) {
  const onLinkPointerDown = isolateLinksForCarousel
    ? (e: PointerEvent<HTMLAnchorElement>) => {
        if (e.pointerType === "mouse") e.stopPropagation();
      }
    : undefined;

  return (
    <Link
      href={href}
      className="group flex h-full min-h-0 w-full flex-col items-stretch rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 sm:p-5"
      onPointerDown={onLinkPointerDown}
    >
      <div className="relative w-full shrink-0">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt=""
            className="aspect-[16/9] w-full rounded-2xl bg-slate-100 object-cover sm:aspect-[2/1] lg:aspect-[3/2]"
            draggable={false}
          />
        ) : (
          <div className="aspect-[16/9] w-full rounded-2xl bg-slate-200/90 sm:aspect-[2/1] lg:aspect-[3/2]" />
        )}
        <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-slate-900/10" />
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col items-stretch">
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:mt-5">
          {dateTime ? (
            <time dateTime={dateTime} className="text-slate-500">
              {dateLabel}
            </time>
          ) : (
            <span className="text-slate-500">{dateLabel}</span>
          )}
          <span className="rounded-full bg-slate-50 px-3 py-1.5 font-medium text-slate-600">
            {(articleKind ?? "news") === "article" ? "Статья" : "Новость"}
          </span>
        </div>

        <div className="min-h-0 flex-1">
          <h3 className="mt-2 text-base font-semibold leading-snug text-slate-900 group-hover:text-[#496db3] sm:mt-3 sm:text-lg sm:leading-6">
            {title}
          </h3>
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600 sm:mt-4">{excerpt}</p>
        </div>

        <div className="relative mt-4 flex items-center gap-x-3 sm:mt-5">
          <img
            src="/favicon.png?v=logo"
            alt=""
            className="h-9 w-9 shrink-0 rounded-full bg-white object-cover ring-1 ring-slate-200 sm:h-10 sm:w-10"
          />
          <div className="min-w-0 text-sm leading-6">
            <p className="font-semibold text-[#496db3]">Центр каталогизации и анализа данных</p>
            <p className="text-slate-600">Редакция</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
