"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

const ScrollToTop = dynamic(
  () => import("@/components/ScrollToTop").then((m) => m.ScrollToTop),
  { ssr: false },
);

const ViewportHeightSync = dynamic(
  () => import("@/components/ViewportHeightSync").then((m) => m.ViewportHeightSync),
  { ssr: false },
);

const CookieConsentBanner = dynamic(
  () => import("@/components/CookieConsentBanner").then((m) => m.CookieConsentBanner),
  { ssr: false },
);

const YandexMetrika = dynamic(
  () => import("@/components/YandexMetrika").then((m) => m.YandexMetrika),
  { ssr: false },
);

const CtaYandexMetrikaTracker = dynamic(
  () => import("@/components/CtaYandexMetrikaTracker").then((m) => m.CtaYandexMetrikaTracker),
  { ssr: false },
);

export function LayoutClientEnhancements() {
  return (
    <>
      <Suspense fallback={null}>
        <ScrollToTop />
      </Suspense>
      <ViewportHeightSync />
      <CookieConsentBanner />
      <YandexMetrika />
      <CtaYandexMetrikaTracker />
    </>
  );
}

