"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { HomeFeedbackForm } from "@/components/HomeFeedbackForm";

export function GlobalFeedbackForm() {
  const pathname = usePathname();
  const hidden = useMemo(() => pathname?.startsWith("/admin"), [pathname]);
  if (hidden) return null;
  return (
    <div className="w-full">
      <HomeFeedbackForm />
    </div>
  );
}

