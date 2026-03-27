"use client";

import type { ReactNode } from "react";
import { HomeBannersCarousel } from "@/components/HomeBannersCarousel";
import type { BannerSlide } from "@/components/HomeBannersCarousel";

/**
 * Одна клиентская граница: колонка max-w + баннеры + children из RSC.
 * Убирает рассинхрон SSR/гидрации, когда обёртка mx-auto и карусель оказывались на разных уровнях дерева.
 */
export function HomeMainStack({
  bannerSlides,
  children,
}: {
  bannerSlides: BannerSlide[];
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
      <HomeBannersCarousel slides={bannerSlides} preserveBannerTitleLineBreaks />
      {children}
    </div>
  );
}
