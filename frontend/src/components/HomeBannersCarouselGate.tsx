"use client";

import type { BannerSlide } from "@/components/HomeBannersCarousel";
import { HomeBannersCarousel } from "@/components/HomeBannersCarousel";

type Props = {
  slides?: BannerSlide[];
};

/** Клиентская оболочка: пропсы с сервера; прямой импорт — баннеры в HTML и при ошибке загрузки чанка. */
export function HomeBannersCarouselGate({ slides = [] }: Props) {
  return <HomeBannersCarousel slides={slides} preserveBannerTitleLineBreaks fullWidth />;
}
