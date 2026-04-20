"use client";

import { usePathname } from "next/navigation";

/**
 * Отступ под фиксированную шапку — только на публичных страницах (фиксированные значения из globals.css).
 * В /admin шапки нет — padding не добавляем.
 */
export function SiteMainColumn({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin") ?? false;

  return (
    <div
      className={
        isAdmin
          ? "flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-x-hidden"
          : "site-main-with-fixed-header flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-x-hidden"
      }
    >
      {children}
    </div>
  );
}
