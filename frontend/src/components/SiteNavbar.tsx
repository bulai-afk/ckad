"use client";

import Link from "next/link";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiGet } from "@/lib/api";
import {
  normalizePageDisplayOrderMap,
  sortBySectionDisplayOrder,
  type PageDisplayOrderMap,
} from "@/lib/pageDisplayOrder";
import { CallbackRequestModal } from "@/components/CallbackRequestModal";

type PageSummary = {
  title: string;
  slug: string;
  status: string;
};

type NavLinkItem = {
  href: string;
  label: string;
};

const CATALOG_ROOT = "catalogization";
const TRAINING_ROOT = "training-center";

/** Публичные маршруты верхнего меню (совпадают с разделами в админке / отдельными страницами). */
const NAV_OTHER_SERVICES_HREF = "/other-services";
const NAV_NEWS_HREF = "/articles";
const NAV_ABOUT_HREF = "/about";

const FALLBACK_CATALOG_LINKS: NavLinkItem[] = [
  { href: "#", label: "Систематизация данных" },
  { href: "#", label: "Паспортизация объектов" },
  { href: "#", label: "Архив и реестры" },
];

const FALLBACK_TRAINING_LINKS: NavLinkItem[] = [
  { href: "#", label: "Курсы и программы" },
  { href: "#", label: "Расписание" },
  { href: "#", label: "Сертификация" },
];

const TOP_BANNER_MESSAGES = [
  "Получите консультацию по каталогизации и обучению.",
  "Сопровождаем проекты от заявки до финального согласования.",
  "Поможем подобрать формат обучения для вашей команды.",
];

function normalizeSlugPath(slug: string): string {
  return slug
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .toLowerCase();
}

function buildSectionLinks(
  pages: PageSummary[],
  rootSlug: string,
  orderBySection: PageDisplayOrderMap,
): NavLinkItem[] {
  const root = normalizeSlugPath(rootSlug);
  const seen = new Set<string>();
  const links: (NavLinkItem & { slugPath: string; sourceIndex: number })[] = [];

  for (let sourceIndex = 0; sourceIndex < pages.length; sourceIndex += 1) {
    const p = pages[sourceIndex];
    const normalizedSlug = normalizeSlugPath(String(p.slug || ""));
    if (!normalizedSlug.startsWith(`${root}/`)) continue;
    if (String(p.status).toUpperCase() !== "PUBLISHED") continue;
    const key = normalizedSlug.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    links.push({
      href: `/${normalizedSlug}`,
      label: String(p.title || "").trim() || normalizedSlug.split("/").pop() || "Страница",
      slugPath: normalizedSlug,
      sourceIndex,
    });
  }

  const sorted = sortBySectionDisplayOrder(
    links,
    root,
    (item) => item.slugPath,
    orderBySection,
    (a, b) => a.sourceIndex - b.sourceIndex,
  );
  return sorted.map(({ href, label }) => ({ href, label }));
}

type SiteNavbarProps = {
  initialFolderNavItems?: unknown[];
  siteSettings?: {
    phone?: string;
    email?: string;
    topRibbonMessages?: string[];
  } | null;
};

export function SiteNavbar({ siteSettings }: SiteNavbarProps) {
  const pathname = usePathname();
  const [pages, setPages] = useState<PageSummary[] | null>(null);
  const [orderBySection, setOrderBySection] = useState<PageDisplayOrderMap>({});
  const [topBannerIndex, setTopBannerIndex] = useState(0);
  const [isTopBannerFlipping, setIsTopBannerFlipping] = useState(false);
  const [callbackModalOpen, setCallbackModalOpen] = useState(false);
  const topRibbonMessagesRaw = Array.isArray(siteSettings?.topRibbonMessages)
    ? siteSettings.topRibbonMessages
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
  const topRibbonMessages =
    topRibbonMessagesRaw.length > 0 ? topRibbonMessagesRaw : TOP_BANNER_MESSAGES;
  const navEmail = (siteSettings?.email || "").trim() || "info@центр-каталогизации.рф";

  const flipSwapTimeoutRef = useRef<number | null>(null);
  const flipResetTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const [pagesResult, orderResult] = await Promise.allSettled([
          apiGet<PageSummary[]>("/api/pages", 10_000),
          apiGet<{ orderBySection?: unknown }>("/api/pages/display-order", 10_000),
        ]);
        if (!alive) return;

        if (pagesResult.status === "fulfilled" && Array.isArray(pagesResult.value)) {
          setPages(pagesResult.value);
        } else {
          setPages([]);
        }

        if (orderResult.status === "fulfilled") {
          setOrderBySection(normalizePageDisplayOrderMap(orderResult.value?.orderBySection));
        } else {
          setOrderBySection({});
        }
      } catch {
        if (!alive) return;
        setPages([]);
        setOrderBySection({});
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => {
      setIsTopBannerFlipping(true);
      if (flipSwapTimeoutRef.current) window.clearTimeout(flipSwapTimeoutRef.current);
      if (flipResetTimeoutRef.current) window.clearTimeout(flipResetTimeoutRef.current);

      flipSwapTimeoutRef.current = window.setTimeout(() => {
        setTopBannerIndex((prev) => (prev + 1) % topRibbonMessages.length);
      }, 170);

      flipResetTimeoutRef.current = window.setTimeout(() => {
        setIsTopBannerFlipping(false);
      }, 340);
    }, 3200);

    return () => {
      window.clearInterval(t);
      if (flipSwapTimeoutRef.current) window.clearTimeout(flipSwapTimeoutRef.current);
      if (flipResetTimeoutRef.current) window.clearTimeout(flipResetTimeoutRef.current);
    };
  }, [topRibbonMessages.length]);

  const catalogLinks = useMemo(() => {
    if (!pages) return FALLBACK_CATALOG_LINKS;
    const dynamic = buildSectionLinks(pages, CATALOG_ROOT, orderBySection);
    return dynamic.length > 0 ? dynamic : FALLBACK_CATALOG_LINKS;
  }, [pages, orderBySection]);

  const trainingLinks = useMemo(() => {
    if (!pages) return FALLBACK_TRAINING_LINKS;
    const dynamic = buildSectionLinks(pages, TRAINING_ROOT, orderBySection);
    return dynamic.length > 0 ? dynamic : FALLBACK_TRAINING_LINKS;
  }, [pages, orderBySection]);

  function closeMobileMenu() {
    if (typeof document === "undefined") return;
    const el = document.getElementById("mobile-menu");
    if (el instanceof HTMLDialogElement) el.close();
  }

  function openCallbackFromNav() {
    closeMobileMenu();
    setCallbackModalOpen(true);
  }

  if (pathname?.startsWith("/admin")) return null;

  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/npm/@tailwindplus/elements@1"
        type="module"
        strategy="lazyOnload"
      />
      <header className="fixed top-0 right-0 left-0 z-50">
        <div className="flex h-7 items-center justify-center bg-[#496db3] px-6 text-white shadow-sm ring-1 ring-[#3f5f9d]/60 sm:px-3.5">
            <div className="flex items-center justify-center">
              <p className="top-info-cube whitespace-nowrap text-center text-xs font-medium text-white/95 sm:text-sm">
                <span
                  className={`top-info-cube__text ${
                    isTopBannerFlipping ? "top-info-cube__text--flipping" : ""
                  }`}
                >
                  {topRibbonMessages[topBannerIndex % topRibbonMessages.length]}
                </span>
              </p>
            </div>
                  </div>
        <div className="bg-white shadow-md shadow-black/8">
        <nav
          aria-label="Global"
          className="relative mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 min-[1206px]:justify-start min-[1206px]:gap-4 min-[1206px]:px-8 min-[1206px]:py-3.5"
        >
          <div className="flex min-w-0 shrink-0 items-center">
            <Link href="/" className="-m-1 flex w-full max-w-full cursor-pointer select-none items-center p-1">
              <span className="sr-only">На главную — Центр каталогизации и анализа данных</span>
              <img src="/logo.svg" alt="" className="h-7 w-auto max-w-[100%] select-none object-contain" draggable={false} />
            </Link>
            </div>
          <div className="flex min-[1206px]:hidden">
              <button
                type="button"
              command="show-modal"
              commandfor="mobile-menu"
              className="-m-1.5 inline-flex items-center justify-center rounded-md p-1.5 text-[#496db3]"
            >
              <span className="sr-only">Open main menu</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" className="size-6">
                <path d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              </button>
            </div>
          <div className="hidden min-w-0 flex-1 items-center justify-center px-1 min-[1206px]:flex">
            <el-popover-group className="block w-full min-w-0 max-w-4xl">
            <div className="flex w-full flex-wrap items-center justify-center gap-x-6 gap-y-2 xl:gap-x-8">
            <div className="relative">
              <button popoverTarget="desktop-menu-catalog" className="flex items-center gap-x-1 whitespace-nowrap py-1 text-sm/6 font-semibold text-[#496db3]">
                Каталогизация
                <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="size-5 flex-none text-gray-400">
                  <path d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" fillRule="evenodd" />
                </svg>
            </button>
              <el-popover id="desktop-menu-catalog" anchor="bottom" popover="" className="w-72 overflow-hidden rounded-2xl bg-white shadow-lg outline-1 outline-gray-900/5 transition transition-discrete [--anchor-gap:--spacing(3)] backdrop:bg-transparent open:block data-closed:translate-y-1 data-closed:opacity-0 data-enter:duration-200 data-enter:ease-out data-leave:duration-150 data-leave:ease-in">
                <div className="p-2">
                  {catalogLinks.map((item) => (
                    <a
                      key={`desktop-catalog-${item.href}-${item.label}`}
                      href={item.href}
                      className="block rounded-lg px-3 py-2 text-sm font-semibold text-[#496db3] hover:bg-gray-50"
                    >
                          {item.label}
                    </a>
                  ))}
            </div>
              </el-popover>
        </div>

            <div className="relative">
              <button popoverTarget="desktop-menu-study" className="flex items-center gap-x-1 whitespace-nowrap py-1 text-sm/6 font-semibold text-[#496db3]">
                Учебный центр
                <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="size-5 flex-none text-gray-400">
                  <path d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" fillRule="evenodd" />
        </svg>
      </button>
              <el-popover id="desktop-menu-study" anchor="bottom" popover="" className="w-72 overflow-hidden rounded-2xl bg-white shadow-lg outline-1 outline-gray-900/5 transition transition-discrete [--anchor-gap:--spacing(3)] backdrop:bg-transparent open:block data-closed:translate-y-1 data-closed:opacity-0 data-enter:duration-200 data-enter:ease-out data-leave:duration-150 data-leave:ease-in">
                <div className="p-2">
                  {trainingLinks.map((item) => (
                    <a
                      key={`desktop-study-${item.href}-${item.label}`}
                      href={item.href}
                      className="block rounded-lg px-3 py-2 text-sm font-semibold text-[#496db3] hover:bg-gray-50"
                    >
                  {item.label}
                    </a>
            ))}
                  </div>
              </el-popover>
            </div>

            <Link
              href={NAV_OTHER_SERVICES_HREF}
              className="whitespace-nowrap py-1 text-sm/6 font-semibold text-[#496db3] transition hover:text-[#e53935]"
            >
              Прочие услуги
            </Link>

            <Link
              href={NAV_NEWS_HREF}
              className="whitespace-nowrap py-1 text-sm/6 font-semibold text-[#496db3] transition hover:text-[#e53935]"
            >
              Новости
            </Link>
            <Link
              href={NAV_ABOUT_HREF}
              className="whitespace-nowrap py-1 text-sm/6 font-semibold text-[#496db3] transition hover:text-[#e53935]"
            >
              О компании
            </Link>
            </div>
          </el-popover-group>
          </div>
          <div className="hidden shrink-0 items-center gap-3 min-[1206px]:flex">
            <a
              href="tel:+74951234567"
              className="shrink-0 whitespace-nowrap text-base/6 font-extrabold text-[#496db3] transition-colors hover:text-red-600"
            >
              +7 (495) 123-45-67
              </a>
              <button
                type="button"
                onClick={() => setCallbackModalOpen(true)}
              className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#496db3] px-3 py-1.5 text-sm font-semibold text-white transition hover:brightness-105"
              >
                Обратный звонок
              </button>
            </div>
        </nav>
        <el-dialog>
          <dialog id="mobile-menu" className="backdrop:bg-transparent min-[1206px]:hidden">
            <div tabIndex={0} className="fixed inset-0 focus:outline-none">
              <el-dialog-panel className="fixed inset-y-0 right-0 z-50 flex h-full w-full flex-col overflow-x-hidden bg-white p-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
                <div className="flex items-center justify-between">
                  <Link
                    href="/"
                    onClick={closeMobileMenu}
                    className="-m-1.5 cursor-pointer select-none p-1.5"
                  >
                    <span className="sr-only">На главную — Центр каталогизации и анализа данных</span>
                    <img src="/logo.svg" alt="" className="h-7 w-auto select-none" draggable={false} />
                  </Link>
                  <button type="button" command="close" commandfor="mobile-menu" className="-m-2.5 rounded-md p-2.5 text-[#496db3]">
                    <span className="sr-only">Close menu</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" className="size-6">
                      <path d="M6 18 18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
      </button>
                </div>
                <div className="mt-6 min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
                  <div className="space-y-2 pb-6">
                    <div className="-mx-3">
                      <button type="button" command="--toggle" commandfor="mobile-catalog" className="flex w-full items-center justify-between rounded-lg py-2 pr-3.5 pl-3 text-base/7 font-semibold text-[#496db3] hover:bg-gray-50">
                        Каталогизация
                        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="size-5 flex-none in-aria-expanded:rotate-180">
                          <path d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" fillRule="evenodd" />
                        </svg>
                      </button>
                      <el-disclosure id="mobile-catalog" hidden className="mt-2 block space-y-2">
                        {catalogLinks.map((item) => (
                          <a
                            key={`mobile-catalog-${item.href}-${item.label}`}
                            href={item.href}
                            className="block rounded-lg py-2 pr-3 pl-6 text-sm/7 font-semibold text-[#496db3] hover:bg-gray-50"
                          >
                            {item.label}
                          </a>
                        ))}
                      </el-disclosure>
                    </div>
                    <div className="-mx-3">
                      <button type="button" command="--toggle" commandfor="mobile-study" className="flex w-full items-center justify-between rounded-lg py-2 pr-3.5 pl-3 text-base/7 font-semibold text-[#496db3] hover:bg-gray-50">
                        Учебный центр
                        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="size-5 flex-none in-aria-expanded:rotate-180">
                          <path d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" fillRule="evenodd" />
                        </svg>
                      </button>
                      <el-disclosure id="mobile-study" hidden className="mt-2 block space-y-2">
                        {trainingLinks.map((item) => (
                          <a
                            key={`mobile-study-${item.href}-${item.label}`}
                            href={item.href}
                            className="block rounded-lg py-2 pr-3 pl-6 text-sm/7 font-semibold text-[#496db3] hover:bg-gray-50"
                          >
                            {item.label}
                          </a>
                        ))}
                      </el-disclosure>
                    </div>
                    <Link
                      href={NAV_OTHER_SERVICES_HREF}
                      onClick={closeMobileMenu}
                      className="-mx-3 block rounded-lg px-3 py-2 text-base/7 font-semibold text-[#496db3] hover:bg-gray-50"
                    >
                      Прочие услуги
                    </Link>
                    <Link
                      href={NAV_NEWS_HREF}
                      onClick={closeMobileMenu}
                      className="-mx-3 block rounded-lg px-3 py-2 text-base/7 font-semibold text-[#496db3] hover:bg-gray-50"
                    >
                      Новости
                    </Link>
                    <Link
                      href={NAV_ABOUT_HREF}
                      onClick={closeMobileMenu}
                      className="-mx-3 block rounded-lg px-3 py-2 text-base/7 font-semibold text-[#496db3] hover:bg-gray-50"
                    >
                      О компании
                    </Link>
                  </div>
                </div>
                <div className="mt-4 border-t border-gray-200 pt-4">
                  <div className="flex w-full flex-col items-center gap-2.5">
                    <a
                      href={`mailto:${navEmail}`}
                      className="max-w-full break-all text-center text-sm/6 font-semibold text-[#496db3] transition-colors hover:text-red-600"
                    >
                      {navEmail}
                    </a>
                    <a
                      href="tel:+74951234567"
                      className="min-w-0 text-center text-base/7 font-extrabold text-[#496db3] transition-colors hover:text-red-600"
                    >
                      +7 (495) 123-45-67
                    </a>
                    <button
                      type="button"
                      onClick={openCallbackFromNav}
                      className="inline-flex w-full max-w-[11rem] min-w-0 items-center justify-center rounded-full bg-[#496db3] px-3 py-2.5 text-sm font-semibold text-white transition hover:brightness-105"
                    >
                      Обратный звонок
                    </button>
                  </div>
                </div>
              </el-dialog-panel>
      </div>
          </dialog>
        </el-dialog>
        </div>
    </header>
      <CallbackRequestModal
        open={callbackModalOpen}
        onClose={() => setCallbackModalOpen(false)}
        sourceMessage='Заявка из кнопки «Обратный звонок» в шапке сайта.'
      />
    </>
  );
}

