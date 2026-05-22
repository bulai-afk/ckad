"use client";

import type { BannerSlide } from "@/components/HomeBannersCarousel";
import { HomeBannersCarousel } from "@/components/HomeBannersCarousel";
import type { CoverAspectPresetId } from "@/lib/bannerCoverPresets";

type Props = {
  slides?: BannerSlide[];
  coverAspect?: CoverAspectPresetId;
};

/** Клиентская оболочка: пропсы с сервера; прямой импорт — баннеры в HTML и при ошибке загрузки чанка. */
export function HomeBannersCarouselGate({ slides = [], coverAspect = "1-8" }: Props) {
  return (
    <HomeBannersCarousel
      slides={slides}
      coverAspect={coverAspect}
      preserveBannerTitleLineBreaks
      fullWidth
    />
  );
}
