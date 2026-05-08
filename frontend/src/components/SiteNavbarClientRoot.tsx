"use client";

import dynamic from "next/dynamic";
import type { FolderNavItem } from "@/lib/navFoldersCookie";
import type { PageDisplayOrderMap } from "@/lib/pageDisplayOrder";

type PageSummary = {
  title: string;
  slug: string;
  status: string;
};

export type SiteNavbarClientRootProps = {
  initialFolderNavItems?: FolderNavItem[];
  initialPages?: PageSummary[];
  initialOrderBySection?: PageDisplayOrderMap;
  siteSettings?: {
    phone?: string;
    email?: string;
    topRibbonMessages?: string[];
  } | null;
};

/** Плейсхолдер под `--site-header-offset` из globals.css. */
function SiteNavbarSkeleton() {
  return (
    <header className="fixed top-0 right-0 left-0 z-50" aria-busy="true" aria-label="Загрузка меню">
      <div className="flex h-7 items-center justify-center bg-[#496db3] px-6 shadow-sm ring-1 ring-[#3f5f9d]/60 sm:px-3.5" />
      <div className="bg-white shadow-md shadow-black/8">
        <div className="mx-auto h-[52px] max-w-7xl px-4 sm:h-[60px] sm:px-6 min-[1206px]:px-8" />
      </div>
    </header>
  );
}

const SiteNavbarDynamic = dynamic(
  () => import("@/components/SiteNavbar").then((mod) => mod.SiteNavbar),
  { ssr: false, loading: SiteNavbarSkeleton },
);

/** SSR для навбара отключён: Tailwind Plus (`el-popover`, `el-dialog`, …) даёт React #418 при гидратации в Safari. */
export function SiteNavbarClientRoot(props: SiteNavbarClientRootProps) {
  return <SiteNavbarDynamic {...props} />;
}
