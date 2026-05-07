"use client";

import dynamic from "next/dynamic";

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

export function LayoutClientEnhancements() {
  return (
    <>
      <ScrollToTop />
      <ViewportHeightSync />
      <CookieConsentBanner />
    </>
  );
}

