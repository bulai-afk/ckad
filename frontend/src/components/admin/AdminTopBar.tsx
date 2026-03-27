"use client";

import {
  BellIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

export function AdminTopBar() {
  // Временно скрываем верхнюю панель админки.
  return null;

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 lg:px-10">
      <div className="relative min-w-0 flex-1">
        <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          placeholder="Поиск"
          className="w-full rounded-full border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-[#496db3] focus:bg-white focus:ring-1 focus:ring-[#496db3]"
        />
      </div>

      <div className="flex items-center gap-6">
        <button
          type="button"
          className="relative rounded-full p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
        >
          <BellIcon className="h-5 w-5" />
          <span className="absolute right-1 top-1 inline-flex h-2 w-2 rounded-full bg-[#496db3]" />
        </button>

        <div className="h-6 w-px bg-slate-200" />

        <button
          type="button"
          className="flex items-center gap-2 rounded-full bg-slate-50 px-1.5 py-0.5 text-sm text-slate-700 hover:bg-slate-100"
        >
          <img
            src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=64&h=64&q=80"
            alt=""
            className="h-8 w-8 rounded-full object-cover"
          />
          <span className="hidden text-sm font-medium text-slate-900 sm:inline">
            Tom Cook
          </span>
          <ChevronDownIcon className="h-4 w-4 text-slate-400" />
        </button>
      </div>
    </header>
  );
}

