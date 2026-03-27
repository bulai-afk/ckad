"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";

const FALLBACK_FOOTER_SERVICES = [
  { href: "/services", label: "Каталогизация предметов снабжения" },
  { href: "/services", label: "Центр каталогизации государственного заказчика" },
  { href: "/services", label: "Научно-исследовательская деятельность" },
  { href: "/services", label: "Систематизация и автоматизация процессов" },
] as const;

const FALLBACK_FOOTER_ARTICLES = [
  { href: "/articles#osnovy", label: "Основы каталогизации продукции" },
  { href: "/articles#reestry", label: "Реестры и согласование номенклатуры" },
  { href: "/articles#eis", label: "Работа с ЕИС и электронными площадками" },
  { href: "/articles#oshibki", label: "Типичные ошибки при заполнении карточек" },
] as const;

/** Ссылки на документы в подвале (мобильная строка с разделителями |) */
const FOOTER_DOCS = [{ href: "/privacy", label: "Политика конфиденциальности" }] as const;

type SiteSettings = {
  email: string;
  phone: string;
  address: string;
  social: {
    vk: string;
    telegram: string;
    max: string;
    whatsapp: string;
  };
  requisites: {
    companyName: string;
    inn: string;
    kpp: string;
    ogrn: string;
  };
};

type FooterPageRow = {
  id: number;
  title: string;
  slug: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};

const linkClass =
  "site-footer-link flex w-full max-w-full min-h-[44px] items-center text-left text-[13px] font-medium leading-tight text-[#496db3]/95 transition hover:text-[#e53935] hover:underline active:bg-slate-100/80 sm:min-h-0 sm:inline-flex sm:w-auto sm:max-w-none sm:bg-transparent";

const headingClass = "site-footer-col-heading";

type SocialDef = {
  key: keyof SiteSettings["social"];
  label: string;
  svg: ReactElement;
  externalSvgSrc?: string;
};
const SOCIAL_DEFS: SocialDef[] = [
  {
    key: "vk",
    label: "ВКонтакте",
    svg: (
      <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.392 0 15.684 0zm3.692 17.229h-1.743c-.66 0-.864-.525-2.05-1.727-1.033-1-1.49-1.135-1.744-1.135-.356 0-.458.102-.458.593v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C4.624 10.857 4 8.657 4 8.086c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.678.863 2.455 2.303 4.607 2.896 4.607.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.203.17-.407.44-.407h2.744c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.135.813-.542 1.253-1.406 2.151-3.574 2.151-3.574.119-.254.322-.491.763-.491h1.744c.525 0 .644.27.525.643-.203.813-1.338 2.658-2.337 3.912-.186.237-.254.373 0 .678.186.237.797.779 1.016 1.253.305.678.508 1.186.186 1.27z" />
    ),
  },
  {
    key: "telegram",
    label: "Telegram",
    svg: (
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    ),
  },
  {
    key: "max",
    label: "Max",
    externalSvgSrc: "/max-logo-indigo.svg",
    svg: (
      <path d="M6 18V6h3l3 5 3-5h3v12h-2V9l-4 7-4-7v9H6z" />
    ),
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    svg: (
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    ),
  },
];

function FooterBrandLink() {
  return (
    <Link
      href="/"
      className="site-footer-brand-inner inline-flex max-w-full shrink-0 items-center text-[13px] font-semibold tracking-tight text-[#496db3]"
    >
      <span
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center"
        style={{ marginRight: 3 }}
      >
        <img
          src="/logo_1.svg"
          alt="Логотип Центра каталогизации и анализа данных"
          className="h-9 w-9 object-contain [filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.08))_drop-shadow(0_2px_4px_rgba(0,0,0,0.06))]"
        />
      </span>
      <span
        aria-hidden="true"
        className="inline-flex h-9 w-[2px] shrink-0 items-center justify-center"
        style={{ marginLeft: 3, marginRight: 3 }}
      >
        <svg width="2" height="28" viewBox="0 0 2 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="2" height="32" rx="1" fill="#496db3" />
        </svg>
      </span>
      <span
        className="flex min-w-0 flex-col items-start justify-center text-left uppercase leading-[0.78]"
        style={{
          marginLeft: 3,
          fontWeight: 950,
          fontSize: "clamp(9px, 2.1vw, 11px)",
          textShadow:
            "0.35px 0 currentColor, -0.35px 0 currentColor, 0 0.35px currentColor, 0 -0.35px currentColor",
        }}
      >
        <span className="block w-max max-w-full leading-none">ЦЕНТР КАТАЛОГИЗАЦИИ</span>
        <span className="block w-max max-w-full leading-none">И АНАЛИЗА ДАННЫХ</span>
      </span>
    </Link>
  );
}

function FooterSocialList({
  items,
}: {
  items: { href: string; label: string; svg: ReactElement; externalSvgSrc?: string }[];
}) {
  return (
    <ul className="site-footer-social" aria-label="Социальные сети">
      {items.map((item) => (
        <li key={item.label}>
          <a href={item.href} target="_blank" rel="noopener noreferrer" aria-label={item.label}>
            {item.externalSvgSrc ? (
              <img
                src={item.externalSvgSrc}
                alt=""
                aria-hidden
              />
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                {item.svg}
              </svg>
            )}
          </a>
        </li>
      ))}
    </ul>
  );
}

export function SiteFooter({ siteSettings }: { siteSettings?: SiteSettings | null }) {
  const pathname = usePathname();
  const [latestServiceItems, setLatestServiceItems] = useState<
    { href: string; label: string }[]
  >([...FALLBACK_FOOTER_SERVICES]);
  const [latestArticleItems, setLatestArticleItems] = useState<
    { href: string; label: string }[]
  >([...FALLBACK_FOOTER_ARTICLES]);

  const hidden = useMemo(() => pathname?.startsWith("/admin"), [pathname]);

  useEffect(() => {
    if (hidden) return;
    let cancelled = false;

    void fetch("/api/pages", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("pages_fetch_failed");
        const rows = (await res.json()) as FooterPageRow[];
        if (!Array.isArray(rows)) throw new Error("pages_invalid_payload");

        const serviceRows = rows
          .filter((row) => typeof row?.slug === "string" && row.slug.trim() !== "")
          .filter((row) => {
            const slug = row.slug.trim().replace(/^\/+|\/+$/g, "").toLowerCase();
            return slug.startsWith("services/") && slug !== "services";
          })
          .map((row) => {
            const createdTs = Date.parse(String(row.createdAt ?? ""));
            const updatedTs = Date.parse(String(row.updatedAt ?? ""));
            const sortTs = Number.isFinite(updatedTs)
              ? updatedTs
              : Number.isFinite(createdTs)
                ? createdTs
                : 0;
            const slug = row.slug.trim().replace(/^\/+|\/+$/g, "");
            return {
              href: `/${slug}`,
              label: row.title?.trim() || slug.split("/").pop() || "Услуга",
              sortTs,
            };
          })
          .sort((a, b) => b.sortTs - a.sortTs)
          .slice(0, 4)
          .map(({ href, label }) => ({ href, label }));
        const articleRows = rows
          .filter((row) => typeof row?.slug === "string" && row.slug.trim() !== "")
          .filter((row) => {
            const slug = row.slug.trim().replace(/^\/+|\/+$/g, "").toLowerCase();
            return slug.startsWith("articles/") && slug !== "articles";
          })
          .map((row) => {
            const createdTs = Date.parse(String(row.createdAt ?? ""));
            const updatedTs = Date.parse(String(row.updatedAt ?? ""));
            const sortTs = Number.isFinite(updatedTs)
              ? updatedTs
              : Number.isFinite(createdTs)
                ? createdTs
                : 0;
            const slug = row.slug.trim().replace(/^\/+|\/+$/g, "");
            return {
              href: `/${slug}`,
              label: row.title?.trim() || slug.split("/").pop() || "Статья",
              sortTs,
            };
          })
          .sort((a, b) => b.sortTs - a.sortTs)
          .slice(0, 4)
          .map(({ href, label }) => ({ href, label }));

        if (cancelled) return;
        if (serviceRows.length > 0) {
          setLatestServiceItems(serviceRows);
        }
        if (articleRows.length > 0) {
          setLatestArticleItems(articleRows);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setLatestServiceItems([...FALLBACK_FOOTER_SERVICES]);
        setLatestArticleItems([...FALLBACK_FOOTER_ARTICLES]);
      });

    return () => {
      cancelled = true;
    };
  }, [hidden]);

  if (hidden) return null;

  const year = new Date().getFullYear();
  const email = (siteSettings?.email || "").trim() || "info@центр-каталогизации.рф";
  const mailtoHref = `mailto:${email}`;
  const phoneLabel = (siteSettings?.phone || "").trim() || "+7 (495) 123-45-67";
  const phoneHref = (() => {
    const raw = (siteSettings?.phone || "").trim();
    const digits = raw.replace(/[^\d+]/g, "");
    return digits ? `tel:${digits}` : "tel:+74951234567";
  })();
  const address =
    (siteSettings?.address || "").trim() || "г. Москва, набережная примерная, д. 1";
  const reqCompany =
    (siteSettings?.requisites?.companyName || "").trim() ||
    "ООО «Центр каталогизации и анализа данных»";
  const reqInn = (siteSettings?.requisites?.inn || "").trim() || "0000000000";
  const reqKpp = (siteSettings?.requisites?.kpp || "").trim() || "000000000";
  const reqOgrn = (siteSettings?.requisites?.ogrn || "").trim() || "0000000000000";

  const socialItems = SOCIAL_DEFS.map((d) => ({
    href: String(siteSettings?.social?.[d.key] ?? "").trim(),
    label: d.label,
    svg: d.svg,
    externalSvgSrc: d.externalSvgSrc,
  })).filter((i) => i.href);

  return (
    <footer className="mt-auto w-full shrink-0">
      {/* Стили здесь: Tailwind v4 при обработке globals.css мог не включать внешние правила для сетки футера */}
      <style>{`
        .site-footer-col-heading {
          margin-bottom: 0.35rem;
          font-size: 11px;
          font-weight: 800;
          line-height: 1.12;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #496db3;
        }
        .site-footer-outer {
          box-sizing: border-box;
          padding: 1.25rem 1rem 0;
          padding-bottom: env(safe-area-inset-bottom, 0);
        }
        @media (min-width: 640px) {
          .site-footer-outer {
            padding: 1.5rem 1.25rem 0;
            padding-bottom: 0;
          }
        }
        @media (min-width: 1024px) {
          .site-footer-outer {
            padding: 1.75rem 1.5rem 0;
          }
        }
        .site-footer-bottom-wrap {
          width: 100%;
          box-sizing: border-box;
          margin: 0;
          padding: 0 1rem;
          padding-bottom: max(0.5rem, env(safe-area-inset-bottom, 0));
        }
        @media (min-width: 640px) {
          .site-footer-bottom-wrap {
            padding: 0 1.25rem;
          }
        }
        @media (min-width: 1024px) {
          .site-footer-bottom-wrap {
            padding: 0 1.5rem;
          }
        }
        .site-footer-bottom-inner {
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
          box-sizing: border-box;
          padding: 0.5rem 0.75rem 0.65rem;
          background: rgba(255, 255, 255, 0.95);
          border-top: 1px solid rgba(148, 163, 184, 0.12);
          text-align: center;
          font-size: 0.6875rem;
          line-height: 1.28;
          font-weight: 600;
          color: #496db3;
        }
        .site-footer-bottom-inner p {
          margin: 0;
        }
        @media (min-width: 640px) {
          .site-footer-bottom-inner {
            padding: 0.45rem 1rem 0.55rem;
            font-size: 0.6875rem;
          }
        }
        @media (min-width: 1024px) {
          .site-footer-bottom-inner {
            padding: 0.5rem 1.125rem 0.6rem;
          }
        }
        /* Планшет/десктоп: полная сетка колонок (всё задаём здесь — не зависит от Tailwind sm:flex) */
        .site-footer-cols-root {
          display: none;
          width: 100%;
          box-sizing: border-box;
        }
        .site-footer-cols-root > * {
          min-width: 0;
        }
        @media (min-width: 640px) {
          .site-footer-cols-root {
            display: flex;
            flex-direction: row;
            flex-wrap: nowrap;
            align-items: flex-start;
            gap: 1.25rem;
            padding: 1.25rem 1.125rem 1rem;
          }
          .site-footer-cols-root > * {
            flex: 1 1 0%;
          }
        }
        @media (min-width: 1024px) {
          .site-footer-cols-root {
            gap: 2rem;
            padding: 1.375rem 1.25rem 1.125rem;
          }
        }
        /* Мобильный компакт: только до 639px */
        .site-footer-mobile-compact {
          display: none;
        }
        @media (max-width: 639px) {
          .site-footer-mobile-compact {
            display: flex;
            flex-direction: column;
            align-items: stretch;
            gap: 0.1rem;
            width: 100%;
            box-sizing: border-box;
            padding: 0.7rem 1.125rem 0.75rem;
            text-align: center;
          }
          .site-footer-mobile-compact .site-footer-mobile-brand {
            display: flex;
            justify-content: center;
            width: 100%;
          }
          .site-footer-mobile-compact .site-footer-mobile-legal {
            width: 100%;
            max-width: none;
            padding: 0;
            line-height: 1.18;
          }
          .site-footer-mobile-compact .site-footer-mobile-docs {
            width: 100%;
            max-width: none;
            padding: 0;
            margin: 0;
          }
          .site-footer-mobile-compact .site-footer-mobile-docs a {
            padding: 0.1rem 0.3rem;
          }
          .site-footer-mobile-compact .site-footer-mobile-tel,
          .site-footer-mobile-compact .site-footer-mobile-mail {
            display: block;
            width: 100%;
            padding: 0.02rem 0;
            margin: 0;
            text-align: center;
          }
          .site-footer-mobile-compact .site-footer-social {
            margin-top: 0;
            margin-bottom: 0;
            width: 100%;
            justify-content: center;
            gap: 0.25rem;
            padding-top: 0.1rem;
          }
          .site-footer-mobile-compact .site-footer-social a {
            min-width: 44px;
            min-height: 44px;
            padding: 0.35rem;
          }
        }
        .site-footer-mobile-docs {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
          gap: 0.35rem 0;
          row-gap: 0.25rem;
          max-width: 100%;
        }
        .site-footer-mobile-docs a {
          font-size: 12px;
          font-weight: 700;
          color: #496db3;
          padding: 0.35rem 0.5rem;
          border-radius: 0.375rem;
          transition: color 0.15s ease, background-color 0.15s ease;
        }
        .site-footer-mobile-docs a:hover {
          color: #e53935;
          text-decoration: underline;
        }
        .site-footer-mobile-docs a:active {
          background-color: rgba(73, 109, 179, 0.08);
        }
        .site-footer-mobile-docs-sep {
          width: 1px;
          height: 0.875rem;
          margin: 0 0.2rem;
          flex-shrink: 0;
          background: rgba(73, 109, 179, 0.35);
        }
        .site-footer-mobile-brand {
          display: flex;
          justify-content: center;
          width: 100%;
        }
        .site-footer-mobile-legal {
          margin: 0;
          max-width: 22rem;
          font-size: 11px;
          font-weight: 500;
          line-height: 1.22;
          color: rgba(73, 109, 179, 0.75);
          text-align: center;
        }
        .site-footer-mobile-tel,
        .site-footer-mobile-mail {
          font-size: 15px;
          font-weight: 900;
          color: #496db3;
          padding: 0.08rem 0.5rem;
          line-height: 1.2;
          border-radius: 0.5rem;
          text-decoration: none;
          text-shadow: 0.25px 0 currentColor, -0.25px 0 currentColor, 0 0.25px currentColor,
            0 -0.25px currentColor;
        }
        /* Десктоп: без бокового padding — иначе телефон/почта визуально «с отступом» от заголовка колонки */
        @media (min-width: 640px) {
          .site-footer-col-contacts .site-footer-mobile-tel,
          .site-footer-col-contacts .site-footer-mobile-mail {
            padding-left: 0;
            padding-right: 0;
          }
        }
        .site-footer-mobile-tel:hover,
        .site-footer-mobile-mail:hover {
          color: #e53935;
          text-decoration: none;
        }
        .site-footer-social {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.625rem;
          margin: 0.75rem 0 0;
          padding: 0;
          list-style: none;
        }
        .site-footer-social a {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #496db3;
          transition: color 0.15s ease, transform 0.15s ease, background-color 0.15s ease;
          border-radius: 0.5rem;
        }
        .site-footer-social a:hover {
          color: #e53935;
          transform: scale(1.06);
        }
        .site-footer-social a:active {
          background-color: rgba(73, 109, 179, 0.08);
        }
        .site-footer-social svg {
          width: 22px;
          height: 22px;
          flex-shrink: 0;
        }
        .site-footer-social img {
          width: 22px;
          height: 22px;
          object-fit: contain;
          flex-shrink: 0;
        }
        @media (max-width: 639px) {
          .site-footer-social {
            justify-content: center;
            gap: 0.3rem;
            margin-top: 0.35rem;
          }
          .site-footer-social a {
            min-width: 46px;
            min-height: 46px;
            padding: 0.4rem;
            margin: 0;
          }
          .site-footer-social svg {
            width: 24px;
            height: 24px;
          }
          .site-footer-social img {
            width: 24px;
            height: 24px;
          }
        }
      `}</style>
      <div className="site-footer-outer">
        <div
          className="mx-auto max-w-[1200px] overflow-hidden bg-white/95 backdrop-blur"
          style={{ borderTopLeftRadius: 28, borderTopRightRadius: 28 }}
        >
          <div className="site-footer-mobile-compact">
            <div className="site-footer-mobile-brand">
              <FooterBrandLink />
            </div>
            <p className="site-footer-mobile-legal">
              Использование и копирование материалов с сайта запрещено
            </p>
            <a
              href={phoneHref}
              className="site-footer-mobile-tel transition active:bg-slate-100/80"
            >
              {phoneLabel}
            </a>
            <a
              href={mailtoHref}
              className="site-footer-mobile-mail transition active:bg-slate-100/80"
            >
              {email}
            </a>
            <FooterSocialList items={socialItems} />
            <nav className="site-footer-mobile-docs" aria-label="Документы">
              {FOOTER_DOCS.map((doc, index) => (
                <span key={doc.href} className="inline-flex items-center">
                  {index > 0 ? <span className="site-footer-mobile-docs-sep" aria-hidden /> : null}
                  <Link href={doc.href}>{doc.label}</Link>
                </span>
              ))}
            </nav>
          </div>

          <div className="site-footer-cols-root">
            {/* Колонка 1: лого + правовой блок */}
            <div className="site-footer-col site-footer-col-brand min-w-0">
              <FooterBrandLink />
              <p className="mt-2.5 text-[11px] font-medium leading-snug text-[#496db3]/75">
                Использование и копирование материалов с сайта запрещено
              </p>
              <nav aria-label="Документы" className="mt-3">
                <p className={headingClass}>Документы</p>
                <div className="mt-1 flex flex-col gap-0">
                  {FOOTER_DOCS.map((doc) => (
                    <Link key={doc.href} href={doc.href} className={`${linkClass} rounded-lg sm:rounded-none`}>
                      {doc.label}
                    </Link>
                  ))}
                </div>
              </nav>
            </div>

            {/* Колонка 2: услуги */}
            <div className="site-footer-col min-w-0">
              <p className={headingClass}>Услуги</p>
              <nav aria-label="Услуги в подвале" className="flex flex-col gap-0 sm:gap-1">
                {latestServiceItems.map((item) => (
                  <Link key={item.label} href={item.href} className={`${linkClass} rounded-lg py-1 sm:rounded-none sm:py-0`}>
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Колонка 3: статьи */}
            <div className="site-footer-col min-w-0">
              <p className={headingClass}>Статьи</p>
              <nav aria-label="Статьи в подвале" className="flex flex-col gap-0 sm:gap-1">
                {latestArticleItems.map((item) => (
                  <Link key={item.href} href={item.href} className={`${linkClass} rounded-lg py-1 sm:rounded-none sm:py-0`}>
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Колонка 4: контакты — содержимое по левому краю колонки (не по центру) */}
            <div className="site-footer-col site-footer-col-contacts min-w-0 text-left">
              <p className={headingClass}>Контакты</p>
              <div className="flex w-full flex-col items-start gap-0 text-left">
                <a
                  href={phoneHref}
                  className="site-footer-mobile-tel w-fit max-w-full self-start transition active:bg-slate-100/80"
                >
                  {phoneLabel}
                </a>
                <a
                  href={mailtoHref}
                  className="site-footer-mobile-mail w-fit max-w-full self-start transition active:bg-slate-100/80"
                >
                  {email}
                </a>
                <p className="text-[12px] font-medium leading-tight text-[#496db3]/80">
                  {address}
                </p>
                <Link href="/contacts" className={`${linkClass} rounded-lg sm:rounded-none`}>
                  Все контакты
                </Link>
                <FooterSocialList items={socialItems} />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="site-footer-bottom-wrap">
        <div className="site-footer-bottom-inner">
          <p>
            © {year} {reqCompany} · ИНН {reqInn} · КПП {reqKpp} · ОГРН {reqOgrn}
          </p>
        </div>
      </div>
    </footer>
  );
}
