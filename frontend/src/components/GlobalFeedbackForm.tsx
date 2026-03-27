"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { HomeFeedbackForm } from "@/components/HomeFeedbackForm";

export function GlobalFeedbackForm() {
  const pathname = usePathname();
  const hidden = useMemo(() => pathname?.startsWith("/admin"), [pathname]);
  if (hidden) return null;
  return (
    <div className="px-4 sm:px-6 lg:px-10">
      <div className="mx-auto w-full max-w-[1200px]">
        <div className="flex w-full justify-center">
          <HomeFeedbackForm />
        </div>
      </div>
    </div>
  );
}

