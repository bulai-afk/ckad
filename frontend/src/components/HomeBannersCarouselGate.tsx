"use client";

import type { BannerSlide } from "@/components/HomeBannersCarousel";
import { HomeBannersCarousel } from "@/components/HomeBannersCarousel";

type Props = {
  slides: BannerSlide[];
};

/** Клиентская оболочка: пропсы с сервера; прямой импорт — баннеры в HTML и при ошибке загрузки чанка. */
export function HomeBannersCarouselGate({ slides }: Props) {
  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden bg-slate-100">
      <HomeBannersCarousel
        slides={slides}
        preserveBannerTitleLineBreaks
        fullWidth
      />
    </div>
  );
}
