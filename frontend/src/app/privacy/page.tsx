import Link from "next/link";
import { ChevronRightIcon, HomeIcon } from "@heroicons/react/20/solid";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <nav
            aria-label="Хлебные крошки"
            className="mb-5 flex flex-wrap items-center gap-1.5 text-sm text-slate-500"
          >
            <Link
              href="/"
              className="inline-flex items-center rounded p-1 hover:bg-slate-200 hover:text-slate-700"
              aria-label="Главная"
            >
              <HomeIcon className="h-4 w-4" />
            </Link>
            <ChevronRightIcon className="h-4 w-4 text-slate-400" />
            <span className="rounded px-1 py-0.5 text-slate-700">Политика конфиденциальности</span>
          </nav>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Политика конфиденциальности
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            Текст политики обработки персональных данных и конфиденциальности будет размещён здесь после
            согласования с юридической службой.
          </p>
        </section>
      </div>
    </div>
  );
}
