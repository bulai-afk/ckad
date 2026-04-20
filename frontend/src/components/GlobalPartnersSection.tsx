"use client";

import { usePathname } from "next/navigation";
import { HomePartnersCarousel } from "@/components/HomePartnersCarousel";

export function GlobalPartnersSection() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;
  return <HomePartnersCarousel slides={[]} />;
}
