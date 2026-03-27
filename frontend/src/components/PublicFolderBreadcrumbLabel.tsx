"use client";

import { useEffect, useMemo, useState } from "react";

type CustomFolder = {
  name: string;
  slug: string;
};

const CUSTOM_FOLDERS_STORAGE_KEY = "admin_custom_folders_v1";

function parseCustomFolders(raw: string | null): CustomFolder[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((f): f is { name: string; slug: string } => {
        if (typeof f !== "object" || f === null) return false;
        const obj = f as Record<string, unknown>;
        return typeof obj.name === "string" && typeof obj.slug === "string";
      })
      .map((f) => ({ name: f.name, slug: f.slug }));
  } catch {
    return [];
  }
}

export function PublicFolderBreadcrumbLabel({
  folderSlug,
  fallbackTitle,
}: {
  folderSlug: string;
  fallbackTitle: string;
}) {
  const [customTitle, setCustomTitle] = useState<string | null>(null);

  useEffect(() => {
    const raw = window.localStorage.getItem(CUSTOM_FOLDERS_STORAGE_KEY);
    const folders = parseCustomFolders(raw);
    const found = folders.find((f) => f.slug === folderSlug);
    setCustomTitle(found?.name?.trim() || null);
  }, [folderSlug]);

  const label = useMemo(
    () => (customTitle && customTitle.length > 0 ? customTitle : fallbackTitle),
    [customTitle, fallbackTitle],
  );

  return <>{label}</>;
}
