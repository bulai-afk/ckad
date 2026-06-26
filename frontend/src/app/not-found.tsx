import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Страница не найдена",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main
      className="flex min-h-[min(70vh,42rem)] flex-col items-center justify-center bg-slate-100 px-4 py-16 text-center text-slate-900 sm:py-24"
      lang="ru"
    >
      <p
        className="select-none font-extrabold leading-none tracking-tight text-[#496db3]"
        style={{ fontSize: "clamp(6rem, 28vw, 16rem)" }}
        aria-hidden
      >
        404
      </p>
      <h1 className="mt-4 text-balance text-2xl font-semibold text-slate-800 sm:mt-6 sm:text-3xl">
        Страница не найдена
      </h1>
      <p className="mt-3 max-w-md text-pretty text-base text-slate-600 sm:text-lg">
        Возможно, адрес указан с ошибкой или страница была удалена.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center justify-center rounded-lg bg-[#496db3] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#3d5d9a] sm:text-base"
      >
        На главную
      </Link>
    </main>
  );
}
