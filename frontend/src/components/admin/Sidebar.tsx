"use client";

import {
  ArrowRightOnRectangleIcon,
  HomeIcon,
  Cog6ToothIcon,
  WrenchScrewdriverIcon,
  PhotoIcon,
  InboxIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminSidebar() {
  const pathname = usePathname();

  const isDashboardActive = pathname?.startsWith("/admin/dashboard") ?? false;
  const isPageEditorActive =
    pathname?.startsWith("/admin/page_editor") ?? false;
  const isBannersActive = pathname?.startsWith("/admin/banners") ?? false;
  const isRequestsActive = pathname?.startsWith("/admin/requests") ?? false;
  const isSettingsActive = pathname?.startsWith("/admin/settings") ?? false;

  return (
    <>
      <aside className="fixed left-0 top-0 z-20 hidden h-screen w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-16 w-full items-center justify-center px-6">
          <img
            src="/logo_1.svg"
            alt="Логотип Центра каталогизации и анализа данных"
            className="h-12 w-12 object-contain [filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.08))_drop-shadow(0_2px_4px_rgba(0,0,0,0.06))]"
          />
        </div>
        <nav className="flex flex-1 flex-col gap-8 px-4 py-4 text-sm text-slate-700">
          <ul className="space-y-1">
            <li>
              <Link
                href="/admin/dashboard"
                className={`flex items-center gap-3 rounded-lg px-3 py-2 font-medium ${
                  isDashboardActive
                    ? "bg-[#496db3]/10 text-[#496db3]"
                    : "text-slate-600 hover:bg-slate-50 hover:text-[#496db3]"
                }`}
              >
                <HomeIcon className="h-5 w-5" />
                <span>Панель управления</span>
              </Link>
            </li>
            <li>
              <Link
                href="/admin/page_editor"
                className={`flex items-center gap-3 rounded-lg px-3 py-2 font-medium ${
                  isPageEditorActive
                    ? "bg-[#496db3]/10 text-[#496db3]"
                    : "text-slate-600 hover:bg-slate-50 hover:text-[#496db3]"
                }`}
              >
                <WrenchScrewdriverIcon
                  className={`h-5 w-5 ${
                    isPageEditorActive ? "text-[#496db3]" : "text-slate-400"
                  }`}
                />
                <span>Редактор страниц</span>
              </Link>
            </li>
            <li>
              <Link
                href="/admin/banners"
                className={`flex items-center gap-3 rounded-lg px-3 py-2 font-medium ${
                  isBannersActive
                    ? "bg-[#496db3]/10 text-[#496db3]"
                    : "text-slate-600 hover:bg-slate-50 hover:text-[#496db3]"
                }`}
              >
                <PhotoIcon
                  className={`h-5 w-5 ${
                    isBannersActive ? "text-[#496db3]" : "text-slate-400"
                  }`}
                />
                <span>Банеры</span>
              </Link>
            </li>
            <li>
              <Link
                href="/admin/requests"
                className={`flex items-center gap-3 rounded-lg px-3 py-2 font-medium ${
                  isRequestsActive
                    ? "bg-[#496db3]/10 text-[#496db3]"
                    : "text-slate-600 hover:bg-slate-50 hover:text-[#496db3]"
                }`}
              >
                <InboxIcon
                  className={`h-5 w-5 ${
                    isRequestsActive ? "text-[#496db3]" : "text-slate-400"
                  }`}
                />
                <span>Заявки</span>
              </Link>
            </li>
          </ul>

          <div className="mt-auto flex flex-col gap-1">
            <Link
              href="/admin/settings"
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                isSettingsActive
                  ? "bg-[#496db3]/10 text-[#496db3]"
                  : "text-slate-600 hover:bg-slate-50 hover:text-[#496db3]"
              }`}
            >
              <Cog6ToothIcon
                className={`h-5 w-5 ${
                  isSettingsActive ? "text-[#496db3]" : "text-slate-400"
                }`}
              />
              <span>Настройки</span>
            </Link>

            <a
              href="/logout"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
              <span>Выход</span>
            </a>
          </div>
        </nav>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-[9999] border-t border-slate-200 bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-[0_-6px_18px_rgba(15,23,42,0.08)] backdrop-blur md:hidden">
        <ul className="grid grid-cols-7 gap-1">
          <li>
            <Link
              href="/admin/dashboard"
              aria-label="Панель управления"
              className={`flex h-11 w-full min-w-[56px] items-center justify-center rounded-xl transition ${
                isDashboardActive
                  ? "bg-[#496db3]/10 text-[#496db3]"
                  : "text-slate-500 hover:bg-slate-100 hover:text-[#496db3]"
              }`}
            >
              <HomeIcon className="h-6 w-6" />
            </Link>
          </li>
          <li>
            <Link
              href="/admin/page_editor"
              aria-label="Редактор страниц"
              className={`flex h-11 w-full min-w-[56px] items-center justify-center rounded-xl transition ${
                isPageEditorActive
                  ? "bg-[#496db3]/10 text-[#496db3]"
                  : "text-slate-500 hover:bg-slate-100 hover:text-[#496db3]"
              }`}
            >
              <WrenchScrewdriverIcon className="h-6 w-6" />
            </Link>
          </li>
          <li>
            <Link
              href="/admin/banners"
              aria-label="Банеры"
              className={`flex h-11 w-full min-w-[56px] items-center justify-center rounded-xl transition ${
                isBannersActive
                  ? "bg-[#496db3]/10 text-[#496db3]"
                  : "text-slate-500 hover:bg-slate-100 hover:text-[#496db3]"
              }`}
            >
              <PhotoIcon className="h-6 w-6" />
            </Link>
          </li>
          <li>
            <Link
              href="/admin/requests"
              aria-label="Заявки"
              className={`flex h-11 w-full min-w-[56px] items-center justify-center rounded-xl transition ${
                isRequestsActive
                  ? "bg-[#496db3]/10 text-[#496db3]"
                  : "text-slate-500 hover:bg-slate-100 hover:text-[#496db3]"
              }`}
            >
              <InboxIcon className="h-6 w-6" />
            </Link>
          </li>
          <li>
            <Link
              href="/admin/settings"
              aria-label="Настройки"
              className={`flex h-11 w-full min-w-[56px] items-center justify-center rounded-xl transition ${
                isSettingsActive
                  ? "bg-[#496db3]/10 text-[#496db3]"
                  : "text-slate-500 hover:bg-slate-100 hover:text-[#496db3]"
              }`}
            >
              <Cog6ToothIcon className="h-6 w-6" />
            </Link>
          </li>
          <li>
            <a
              href="/logout"
              aria-label="Выход"
              className="flex h-11 w-full min-w-[56px] items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100 hover:text-red-700"
            >
              <ArrowRightOnRectangleIcon className="h-6 w-6" />
            </a>
          </li>
        </ul>
      </nav>
    </>
  );
}

