"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet } from "@/lib/api";

function normSeg(s: string): string {
  return s.trim().toLowerCase().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
}

export function PublicFolderBreadcrumbLabel({
  folderSlug,
  fallbackTitle,
}: {
  folderSlug: string;
  fallbackTitle: string;
}) {
  const [nameFromApi, setNameFromApi] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const want = normSeg(folderSlug);
    void (async () => {
      try {
        const data = await apiGet<{ folders?: { name: string; slug: string }[] }>(
          "/api/pages/folders",
        );
        const folders = Array.isArray(data?.folders) ? data.folders : [];
        const hit = folders.find((f) => {
          const slug = normSeg(String(f.slug || ""));
          return slug === want || slug.split("/")[0] === want;
        });
        if (!cancelled && hit?.name?.trim()) setNameFromApi(hit.name.trim());
      } catch {
        if (!cancelled) setNameFromApi(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [folderSlug]);

  const label = useMemo(
    () => (nameFromApi && nameFromApi.length > 0 ? nameFromApi : fallbackTitle),
    [nameFromApi, fallbackTitle],
  );

  return <>{label}</>;
}
